'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { STATUS_PESANAN, warnaStatus, labelStatus, warnaPembayaran, labelPembayaran, bisaDiterimaPembeli, bisaDibatalkan, HARI_SELESAI_OTOMATIS } from '../../lib/statusPesanan'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'
import Skeleton, { DaftarSkeletonPesanan } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import BadgeAngkatan from '../components/BadgeAngkatan'
import { useTampilSkeleton } from '../hooks/useSkeleton'
import BadgePreorder, { WARNA_PO_TUA } from '../components/BadgePreorder'
import { janjiKirim } from '../../lib/preorder'
import { tanggalPeristiwa } from '../../lib/format'

type PesananItem = {
  id: string
  produk_id: string | null
  nama_produk: string
  harga: number
  qty: number
  subtotal: number
  foto_url: string | null
  varian_nama: string | null
  is_preorder: boolean | null
  po_janji_kirim: string | null
}

type Pesanan = {
  id: string
  nomor_pesanan: string | null
  toko_id: string | null
  total: number | null
  ongkir: number | null
  status: string
  payment_status: string | null
  metode_bayar: string | null
  no_resi: string | null
  kurir: string | null
  alamat_kirim: string | null
  created_at: string
  dikirim_at: string | null
  dibatalkan_at: string | null
  alasan_batal: string | null
  toko: { nama_toko: string | null; seller_id: string | null } | null
  pesanan_items: PesananItem[]
}

// Baris antrean pengembalian dana. Dibuat `batalkan_pesanan` kalau pesanannya
// sudah lunas. RLS mengizinkan pembeli membaca miliknya sendiri; tidak ada
// policy tulis sama sekali, jadi halaman ini murni membaca.
type Refund = {
  pesanan_id: string
  nominal: number
  status: string
  created_at: string
  selesai_at: string | null
}

const LABEL_REFUND: Record<string, string> = {
  menunggu: 'Menunggu diproses',
  diproses: 'Sedang diproses',
  selesai:  'Sudah dikembalikan',
  gagal:    'Gagal diproses',
}

const WARNA_REFUND: Record<string, string> = {
  menunggu: '#f57f17',
  diproses: '#1565c0',
  selesai:  '#2e7d32',
  gagal:    '#c62828',
}

// Alasan seragam untuk pembatalan pesanan yang belum dibayar. Pembeli yang
// salah pesan tidak perlu menjelaskan diri — tidak ada uang yang tertahan dan
// tidak ada pihak yang dirugikan, jadi menuntut alasan cuma gesekan. Tetap
// harus ada isinya karena `batalkan_pesanan` menulis alasan apa adanya ke
// `pesanan.alasan_batal`, dan penjual berhak tahu kenapa pesanannya hilang.
const ALASAN_BATAL_PEMBELI = 'Dibatalkan pembeli'

const TABS = ['semua', ...STATUS_PESANAN] as const
type Tab = (typeof TABS)[number]

const LABEL_TAB: Record<Tab, string> = {
  semua: 'Semua',
  menunggu: 'Menunggu',
  dibayar: 'Dibayar',
  diproses: 'Diproses',
  dikirim: 'Dikirim',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

function fmt(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }
const fmtTgl = tanggalPeristiwa

// Tanggal pesanan ditutup sendiri oleh tugas harian kalau pembeli tidak
// pernah mengonfirmasi. Perkiraan, karena tugasnya berjalan sekali sehari.
function batasOtomatis(dikirimAt: string | null): string | null {
  if (!dikirimAt) return null
  const d = new Date(dikirimAt)
  if (isNaN(d.getTime())) return null
  d.setDate(d.getDate() + HARI_SELESAI_OTOMATIS)
  return fmtTgl(d.toISOString())
}

export default function PesananPage() {
  const router = useRouter()
  const [pesanan, setPesanan] = useState<Pesanan[]>([])
  const [tab, setTab] = useState<Tab>('semua')
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  // Pesan pakai penanda ok sendiri, bukan ditebak dari isi teksnya: pesan
  // error dari database ditampilkan apa adanya dan tidak selalu memuat kata
  // "Gagal" — "Pesanan sudah dikirim. Ajukan komplain, bukan pembatalan."
  // akan terbaca sebagai keberhasilan kalau warnanya ditebak dari teks.
  const [pesan, setPesan] = useState<{ text: string; ok: boolean } | null>(null)
  const [prosesId, setProsesId] = useState<string | null>(null)
  const [batalId, setBatalId] = useState<string | null>(null)
  const [alasanBatal, setAlasanBatal] = useState('')
  const [profilPenjual, setProfilPenjual] = useState<Record<string, { angkatan: number | null }>>({})
  const [refund, setRefund] = useState<Record<string, Refund>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth?redirect=/pesanan&msg=Login+dulu+untuk+melihat+pesananmu')
        return
      }

      // RLS sudah membatasi ke pesanan milik sendiri, eq buyer_id dipasang
      // supaya niatnya eksplisit dan query tetap benar kalau policy berubah.
      const { data, error } = await supabase.from('pesanan')
        .select('id, nomor_pesanan, toko_id, total, ongkir, status, payment_status, metode_bayar, no_resi, kurir, alamat_kirim, created_at, dikirim_at, dibatalkan_at, alasan_batal, toko(nama_toko, seller_id), pesanan_items(id, produk_id, nama_produk, harga, qty, subtotal, foto_url, varian_nama, is_preorder, po_janji_kirim)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) setPesan({ text: 'Gagal memuat pesanan: ' + error.message, ok: false })
      const baris = (data ?? []) as unknown as Pesanan[]
      setPesanan(baris)

      // Antrean pengembalian dana untuk pesanan yang dibatalkan. Diambil
      // sekali untuk semua, bukan satu query per kartu.
      const idBatal = baris.filter(p => p.status === 'dibatalkan').map(p => p.id)
      if (idBatal.length > 0) {
        const { data: refundData } = await supabase
          .from('refund')
          .select('pesanan_id, nominal, status, created_at, selesai_at')
          .in('pesanan_id', idBatal)
        setRefund(Object.fromEntries(((refundData ?? []) as Refund[]).map(r => [r.pesanan_id, r])))
      }

      // Angkatan penjual untuk badge, diambil dari view publik
      const sellerIds = [...new Set(baris.map(p => p.toko?.seller_id).filter(Boolean))] as string[]
      if (sellerIds.length > 0) {
        const { data: penjual } = await supabase
          .from('alumni_publik').select('id, angkatan').in('id', sellerIds)
        setProfilPenjual(Object.fromEntries((penjual ?? []).map(u => [u.id, { angkatan: u.angkatan }])))
      }
      setLoading(false)
    }
    load()
  }, [])

  // Pembeli menutup pesanan yang sudah sampai. Lewat RPC, bukan UPDATE
  // langsung: yang menentukan siapa boleh dan dari status mana adalah
  // `ubah_status_pesanan`, dan 'selesai' memang hanya untuk pembeli.
  async function terimaPesanan(id: string) {
    setProsesId(id)
    try {
      const { error } = await supabase.rpc('ubah_status_pesanan', {
        p_pesanan_id: id,
        p_status_baru: 'selesai',
      })
      if (error) throw new Error(error.message)

      const { data } = await supabase.from('pesanan')
        .select('id, status, selesai_at')
        .eq('id', id)
        .maybeSingle()

      setPesanan(prev => prev.map(p => p.id === id ? { ...p, status: data?.status ?? 'selesai' } : p))
      setPesan({ text: 'Terima kasih! Pesanan ditandai selesai.', ok: true })
    } catch (e) {
      setPesan({ text: 'Gagal menyelesaikan pesanan: ' + (e instanceof Error ? e.message : 'coba lagi'), ok: false })
    } finally {
      setProsesId(null)
    }
  }

  // Pembatalan oleh pembeli. Lewat `batalkan_pesanan`, bukan UPDATE langsung:
  // selain dijaga trigger, RPC itu juga yang mengubah payment_status jadi
  // 'refund' dan membuat baris antrean pengembalian dana.
  //
  // Siapa boleh membatalkan dari status apa sudah divalidasi di dalam RPC —
  // di sini tidak ada validasi yang mengulanginya. `bisaDibatalkan()` cuma
  // dipakai untuk menyembunyikan tombol yang sudah pasti ditolak.
  async function batalkanPesanan(p: Pesanan) {
    const lunas = p.payment_status === 'lunas'
    const alasan = lunas ? alasanBatal.trim() : ALASAN_BATAL_PEMBELI

    // Satu-satunya pemeriksaan di klien, dan bukan mengulang aturan server:
    // untuk pesanan lunas alasannya ikut tersimpan di baris refund yang
    // NOT NULL, jadi kolom kosong akan menggagalkan seluruh pembatalan.
    if (lunas && !alasan) {
      setPesan({ text: 'Alasan pembatalan wajib diisi.', ok: false })
      return
    }

    setProsesId(p.id)
    try {
      const { error } = await supabase.rpc('batalkan_pesanan', {
        p_pesanan_id: p.id,
        p_alasan: alasan,
      })
      if (error) throw new Error(error.message)

      // Baca ulang barisnya. RPC hanya mengembalikan {ok, refund}, sementara
      // dibatalkan_at dan payment_status diisi di dalam sana.
      const { data } = await supabase.from('pesanan')
        .select('id, status, payment_status, dibatalkan_at, alasan_batal')
        .eq('id', p.id)
        .maybeSingle()

      setPesanan(prev => prev.map(x => x.id === p.id
        ? { ...x, ...(data ?? { status: 'dibatalkan', alasan_batal: alasan }) }
        : x))

      // Baris refund dibuat oleh RPC yang sama, jadi ambil sekarang juga —
      // pembeli harus melihat haknya tercatat di kartunya, bukan cuma membaca
      // pesan yang hilang begitu halaman disegarkan.
      const { data: barisRefund } = await supabase.from('refund')
        .select('pesanan_id, nominal, status, created_at, selesai_at')
        .eq('pesanan_id', p.id)
        .maybeSingle()
      if (barisRefund) {
        setRefund(prev => ({ ...prev, [p.id]: barisRefund as Refund }))
      }

      setPesan({
        text: lunas
          ? 'Pesanan dibatalkan. Pengembalian dana masuk antrean — statusnya bisa kamu pantau di kartu pesanan ini.'
          : 'Pesanan dibatalkan.',
        ok: true,
      })
      setBatalId(null)
      setAlasanBatal('')
    } catch (e) {
      // Pesan dari database ditampilkan apa adanya, termasuk "Pesanan sudah
      // dikirim. Ajukan komplain, bukan pembatalan." yang muncul kalau penjual
      // menandai kirim tepat saat pembeli menekan tombol ini.
      setPesan({ text: e instanceof Error ? e.message : 'Gagal membatalkan pesanan.', ok: false })
    } finally {
      setProsesId(null)
    }
  }

  const terlihat = tab === 'semua' ? pesanan : pesanan.filter(p => p.status === tab)

  function jumlahTab(t: Tab) {
    return t === 'semua' ? pesanan.length : pesanan.filter(p => p.status === t).length
  }

  if (tampilSkeleton) return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>
        <Skeleton tinggi={18} lebar="40%" style={{ marginBottom: '6px' }} />
        <Skeleton tinggi={11} lebar="65%" style={{ marginBottom: '18px' }} />
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
          {[62, 78, 70, 74].map((w, i) => <Skeleton key={i} tinggi={30} lebar={w} radius={20} />)}
        </div>
        <DaftarSkeletonPesanan jumlah={3} />
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>Pesanan Saya</h1>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '16px' }}>
          Riwayat semua pesananmu di Superfive Market
        </div>

        {pesan && (
          <div style={{ background: pesan.ok ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesan.ok ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesan.ok ? '#2e7d32' : '#c62828', marginBottom: '12px', lineHeight: 1.6 }}>
            {pesan.text}
          </div>
        )}

        {/* Tab filter status — bisa digeser di layar sempit */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '6px' }}>
          {TABS.map(t => {
            const aktif = tab === t
            const jumlah = jumlahTab(t)
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flexShrink: 0, padding: '0 16px', minHeight: '44px',
                  display: 'inline-flex', alignItems: 'center',
                  borderRadius: '22px',
                  border: aktif ? 'none' : '0.5px solid #c5d9ef',
                  background: aktif ? '#0C447C' : '#fff',
                  color: aktif ? '#fff' : '#5a7da0',
                  fontSize: '12px', fontWeight: aktif ? '600' : '400',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {LABEL_TAB[t]}{jumlah > 0 && ` (${jumlah})`}
              </button>
            )
          })}
        </div>

        {terlihat.length === 0 ? (
          tab === 'semua' ? (
            <EmptyState
              ikon="🧾"
              judul="Belum ada pesanan"
              pesan="Belanja pertamamu di Superfive Market akan muncul di sini — lengkap dengan status pengiriman dan nomor resinya."
              aksiLabel="Mulai Belanja"
              aksiHref="/produk"
            />
          ) : (
            <EmptyState
              kecil
              ikon="🔍"
              judul={`Tidak ada pesanan "${LABEL_TAB[tab]}"`}
              pesan="Coba pilih tab lain untuk melihat pesananmu yang lain."
              aksiLabel="Lihat Semua"
              onAksi={() => setTab('semua')}
            />
          )
        ) : terlihat.map(p => {
          const warna = warnaStatus(p.status)
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #c5d9ef', marginBottom: '10px', overflow: 'hidden' }}>

              {/* Header: nomor pesanan + badge status */}
              <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #e8f0f8', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#0C447C', fontFamily: 'monospace' }}>
                    {p.nomor_pesanan ?? '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5a7da0', marginTop: '2px' }}>{fmtTgl(p.created_at)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', padding: '4px 11px', borderRadius: '20px', background: warna.bg, color: warna.color }}>
                    {labelStatus(p.status)}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', ...warnaPembayaran(p.payment_status) }}>
                    {labelPembayaran(p.payment_status)}
                  </span>
                </div>
              </div>

              {/* Toko */}
              <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #e8f0f8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                  {p.toko_id ? (
                    <Link href={`/toko/${p.toko_id}`} style={{ fontSize: '12px', color: '#0C447C', textDecoration: 'none', fontWeight: '500' }}>
                      🏪 {p.toko?.nama_toko ?? 'Toko'} →
                    </Link>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#5a7da0' }}>🏪 Toko tidak diketahui</span>
                  )}
                  {p.toko?.seller_id && (
                    <BadgeAngkatan angkatan={profilPenjual[p.toko.seller_id]?.angkatan} kecil />
                  )}
                </div>
              </div>

              {/* Daftar item */}
              <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #e8f0f8' }}>
                {p.pesanan_items.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#c62828' }}>⚠️ Pesanan ini tidak punya item</div>
                ) : p.pesanan_items.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                      <FotoProduk src={item.foto_url} height={44} fontSize={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {item.produk_id ? (
                        <Link href={`/produk/${item.produk_id}`} style={{ fontSize: '12px', color: '#1a1a1a', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.nama_produk}
                        </Link>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nama_produk}</div>
                      )}
                      {item.varian_nama && (
                        <div style={{ fontSize: '11px', color: '#0C447C', fontWeight: '600' }}>
                          {/* Snapshot dari create_pesanan sudah berisi tipe
                              varian, misalnya "Ukuran XXL" — jangan diberi
                              awalan lagi */}
                          {item.varian_nama}
                        </div>
                      )}
                      {/* Diambil dari snapshot di pesanan_items, bukan dari
                          produk — riwayat tidak boleh berubah kalau penjual
                          mematikan PO belakangan */}
                      {item.is_preorder && (
                        <div style={{ margin: '2px 0' }}>
                          <BadgePreorder aktif kecil />
                          {item.po_janji_kirim && (
                            <span style={{ fontSize: '10px', color: WARNA_PO_TUA, marginLeft: '5px' }}>
                              🚚 {janjiKirim(item.po_janji_kirim)}
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#5a7da0' }}>{fmt(item.harga)} × {item.qty}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#0C447C', flexShrink: 0 }}>{fmt(item.subtotal)}</div>
                  </div>
                ))}
              </div>

              {/* Resi, hanya kalau sudah dikirim */}
              {p.no_resi && (
                <div style={{ margin: '10px 14px 0', background: '#fff3e0', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#e65100', marginBottom: '2px' }}>
                    🚚 Dikirim lewat {p.kurir ?? 'kurir'}
                    {p.dikirim_at && ` · ${fmtTgl(p.dikirim_at)}`}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#e65100', fontFamily: 'monospace' }}>
                    {p.no_resi}
                  </div>
                </div>
              )}

              {/* Pesanan dibatalkan: alasannya, dan kalau uangnya sudah masuk,
                  status pengembaliannya. Pembeli harus bisa melihat haknya
                  tercatat, bukan cuma tahu pesanannya hilang. */}
              {p.status === 'dibatalkan' && (
                <div style={{ margin: '10px 14px 0', background: '#fce4e4', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#c62828', marginBottom: '2px' }}>
                    Pesanan dibatalkan
                    {p.dibatalkan_at && ` · ${fmtTgl(p.dibatalkan_at)}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1a1a1a', lineHeight: 1.6 }}>
                    {p.alasan_batal || 'Tanpa keterangan.'}
                  </div>

                  {refund[p.id] ? (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f09595' }}>
                      <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '2px' }}>
                        Pengembalian dana {fmt(refund[p.id].nominal)}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: WARNA_REFUND[refund[p.id].status] ?? '#5a7da0' }}>
                        {LABEL_REFUND[refund[p.id].status] ?? refund[p.id].status}
                        {refund[p.id].selesai_at && ` · ${fmtTgl(refund[p.id].selesai_at!)}`}
                      </div>
                    </div>
                  ) : p.payment_status === 'refund' && (
                    // payment_status sudah refund tapi barisnya belum terbaca —
                    // jangan diam, pembeli perlu tahu haknya tetap tercatat
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#5a7da0' }}>
                      Pengembalian dana sedang disiapkan.
                    </div>
                  )}
                </div>
              )}

              {/* Total & pembayaran */}
              <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: '#5a7da0', minWidth: 0 }}>
                  💳 {(p.metode_bayar ?? '-').replace(/_/g, ' ')}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '10px', color: '#5a7da0' }}>Total</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#0C447C' }}>{fmt(p.total ?? 0)}</div>
                </div>
              </div>

              {/* Konfirmasi barang sampai — hanya saat pesanan dalam pengiriman */}
              {bisaDiterimaPembeli(p.status) && (
                <div style={{ padding: '0 14px 14px' }}>
                  <button
                    onClick={() => terimaPesanan(p.id)}
                    disabled={prosesId === p.id}
                    style={{
                      width: '100%', background: prosesId === p.id ? '#a5d6a7' : '#2e7d32',
                      color: '#fff', border: 'none', padding: '11px',
                      borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                      cursor: prosesId === p.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {prosesId === p.id ? 'Menyimpan...' : '✓ Pesanan Diterima'}
                  </button>
                  <div style={{ fontSize: '11px', color: '#5a7da0', textAlign: 'center', marginTop: '6px', lineHeight: 1.6 }}>
                    Klik kalau barang sudah sampai di tanganmu.
                    {/* Bukan ancaman, tapi hak pembeli untuk tahu: kalau lupa
                        mengonfirmasi, pesanan ditutup sendiri oleh sistem */}
                    <br />
                    Kalau tidak dikonfirmasi, pesanan selesai otomatis{' '}
                    {HARI_SELESAI_OTOMATIS} hari setelah dikirim
                    {batasOtomatis(p.dikirim_at) && (
                      <> — sekitar <strong>{batasOtomatis(p.dikirim_at)}</strong></>
                    )}
                    .
                  </div>
                </div>
              )}

              {/* Pembatalan oleh pembeli. Sengaja TIDAK sama dengan versi
                  penjual di dashboard: yang menentukan bentuknya adalah sudah
                  ada uang masuk atau belum. */}
              {bisaDibatalkan(p.status) && (() => {
                const lunas = p.payment_status === 'lunas'
                const adaPO = p.pesanan_items.some(i => i.is_preorder)
                const sedangProses = prosesId === p.id

                if (batalId !== p.id) return (
                  <div style={{ padding: '0 14px 14px' }}>
                    <button
                      onClick={() => { setBatalId(p.id); setAlasanBatal(''); setPesan(null) }}
                      style={{
                        width: '100%', background: '#fff', color: '#c62828',
                        border: '0.5px solid #f09595', padding: '10px',
                        borderRadius: '8px', fontSize: '12px', fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      Batalkan Pesanan
                    </button>
                  </div>
                )

                return (
                  <div style={{ padding: '0 14px 14px' }}>
                    <div style={{ background: '#fce4e4', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#c62828', marginBottom: '6px' }}>
                        Batalkan pesanan ini?
                      </div>

                      {lunas ? (
                        <>
                          {/* Uangnya sudah masuk. Pembeli harus tahu dananya
                              tidak kembali seketika sebelum menekan, bukan
                              sesudahnya. */}
                          <div style={{ fontSize: '12px', color: '#1a1a1a', lineHeight: 1.7, marginBottom: '8px' }}>
                            Pembayaranmu sebesar <strong>{fmt(p.total ?? 0)}</strong> sudah masuk.
                            Kalau dibatalkan, dana itu masuk <strong>antrean pengembalian</strong> dan
                            diproses admin secara manual — <strong>tidak kembali seketika</strong>.
                            Statusnya akan tercatat di kartu pesanan ini dan bisa kamu pantau.
                          </div>

                          {adaPO && (
                            <div style={{ background: 'rgba(124,77,255,0.10)', border: `0.5px solid ${WARNA_PO_TUA}`, borderRadius: '6px', padding: '9px 11px', marginBottom: '8px' }}>
                              <div style={{ fontSize: '12px', color: WARNA_PO_TUA, lineHeight: 1.7 }}>
                                <strong>Ini pesanan pre-order.</strong> Membatalkan berarti melepas
                                kuota yang sudah kamu pesan, dan kalau periode pre-ordernya sudah
                                ditutup kamu <strong>tidak bisa memesan lagi</strong>. Pilihan ini
                                tidak bisa dibatalkan balik.
                              </div>
                            </div>
                          )}

                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#c62828', marginBottom: '4px' }}>
                            Alasan pembatalan
                          </div>
                          <textarea
                            value={alasanBatal}
                            onChange={e => setAlasanBatal(e.target.value)}
                            rows={3}
                            placeholder="Misal: salah pilih ukuran, atau berubah pikiran"
                            style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #c5d9ef', borderRadius: '6px', fontSize: '12px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif', background: '#fff', marginBottom: '4px' }}
                          />
                          <div style={{ fontSize: '11px', color: '#8d4040', marginBottom: '8px' }}>
                            Alasan ini dibaca penjual dan ikut tercatat di antrean pengembalian dana.
                          </div>
                        </>
                      ) : (
                        // Belum ada pembayaran: tidak ada yang dirugikan, jadi
                        // cukup konfirmasi. Menuntut alasan di sini hanya
                        // gesekan — alasannya diisi seragam oleh sistem.
                        <div style={{ fontSize: '12px', color: '#1a1a1a', lineHeight: 1.7, marginBottom: '10px' }}>
                          Belum ada pembayaran yang masuk untuk pesanan ini, jadi tidak ada dana
                          yang perlu dikembalikan. Pesanan akan langsung ditutup dan stoknya
                          kembali tersedia.
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => { setBatalId(null); setAlasanBatal('') }}
                          disabled={sedangProses}
                          style={{ flex: 1, background: '#fff', color: '#5a7da0', border: '0.5px solid #c5d9ef', padding: '10px', borderRadius: '6px', fontSize: '12px', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                        >
                          Tidak jadi
                        </button>
                        <button
                          onClick={() => batalkanPesanan(p)}
                          disabled={sedangProses}
                          style={{ flex: 2, background: sedangProses ? '#e39c9c' : '#c62828', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                        >
                          {sedangProses ? 'Membatalkan...' : 'Ya, Batalkan Pesanan'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>
    </main>
  )
}
