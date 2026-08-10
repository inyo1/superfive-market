'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { STATUS_PESANAN, warnaStatus, labelStatus, warnaPembayaran, labelPembayaran } from '../../lib/statusPesanan'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'
import Skeleton, { DaftarSkeletonPesanan } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import BadgeAngkatan from '../components/BadgeAngkatan'

type PesananItem = {
  id: string
  produk_id: string | null
  nama_produk: string
  harga: number
  qty: number
  subtotal: number
  foto_url: string | null
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
  toko: { nama_toko: string | null; seller_id: string | null } | null
  pesanan_items: PesananItem[]
}

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
function fmtTgl(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PesananPage() {
  const router = useRouter()
  const [pesanan, setPesanan] = useState<Pesanan[]>([])
  const [tab, setTab] = useState<Tab>('semua')
  const [loading, setLoading] = useState(true)
  const [pesan, setPesan] = useState('')
  const [prosesId, setProsesId] = useState<string | null>(null)
  const [angkatanPenjual, setAngkatanPenjual] = useState<Record<string, number | null>>({})

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
        .select('id, nomor_pesanan, toko_id, total, ongkir, status, payment_status, metode_bayar, no_resi, kurir, alamat_kirim, created_at, dikirim_at, toko(nama_toko, seller_id), pesanan_items(id, produk_id, nama_produk, harga, qty, subtotal, foto_url)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) setPesan('Gagal memuat pesanan: ' + error.message)
      const baris = (data ?? []) as unknown as Pesanan[]
      setPesanan(baris)

      // Angkatan penjual untuk badge, diambil dari view publik
      const sellerIds = [...new Set(baris.map(p => p.toko?.seller_id).filter(Boolean))] as string[]
      if (sellerIds.length > 0) {
        const { data: penjual } = await supabase
          .from('alumni_publik').select('id, angkatan').in('id', sellerIds)
        setAngkatanPenjual(Object.fromEntries((penjual ?? []).map(u => [u.id, u.angkatan])))
      }
      setLoading(false)
    }
    load()
  }, [])

  // Pembeli menutup pesanan yang sudah sampai. Kolom terjual dan selesai_at
  // diisi trigger database, jadi cukup kirim status-nya saja.
  async function terimaPesanan(id: string) {
    setProsesId(id)
    try {
      const { data, error } = await supabase.from('pesanan')
        .update({ status: 'selesai' })
        .eq('id', id)
        .select('id, status')
        .single()

      if (error) throw new Error(error.message)
      if (!data) throw new Error('Pesanan tidak ditemukan')

      setPesanan(prev => prev.map(p => p.id === id ? { ...p, status: data.status } : p))
      setPesan('Terima kasih! Pesanan ditandai selesai.')
    } catch (e) {
      setPesan('Gagal menyelesaikan pesanan: ' + (e instanceof Error ? e.message : 'coba lagi'))
    } finally {
      setProsesId(null)
    }
  }

  const terlihat = tab === 'semua' ? pesanan : pesanan.filter(p => p.status === tab)

  function jumlahTab(t: Tab) {
    return t === 'semua' ? pesanan.length : pesanan.filter(p => p.status === t).length
  }

  if (loading) return (
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
          <div style={{ background: pesan.includes('Gagal') ? '#fce4e4' : '#e8f5e9', border: `0.5px solid ${pesan.includes('Gagal') ? '#f09595' : '#a5d6a7'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesan.includes('Gagal') ? '#c62828' : '#2e7d32', marginBottom: '12px' }}>
            {pesan}
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
                    <a href={`/toko/${p.toko_id}`} style={{ fontSize: '12px', color: '#0C447C', textDecoration: 'none', fontWeight: '500' }}>
                      🏪 {p.toko?.nama_toko ?? 'Toko'} →
                    </a>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#5a7da0' }}>🏪 Toko tidak diketahui</span>
                  )}
                  {p.toko?.seller_id && (
                    <BadgeAngkatan angkatan={angkatanPenjual[p.toko.seller_id]} kecil />
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
                        <a href={`/produk/${item.produk_id}`} style={{ fontSize: '12px', color: '#1a1a1a', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.nama_produk}
                        </a>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nama_produk}</div>
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
              {p.status === 'dikirim' && (
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
                  <div style={{ fontSize: '11px', color: '#5a7da0', textAlign: 'center', marginTop: '6px' }}>
                    Klik kalau barang sudah sampai di tanganmu.
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
