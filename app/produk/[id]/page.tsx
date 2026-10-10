'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../components/Navbar'
import TombolHubungi from '../../components/TombolHubungi'
import BadgeTersedia from '../../components/BadgeTersedia'
import FotoProduk from '../../components/FotoProduk'
import ReviewSection from '../../components/ReviewSection'
import Skeleton from '../../components/Skeleton'
import BadgeOfficial from '../../components/BadgeOfficial'
import BadgePreorder, { WARNA_PO, WARNA_PO_TUA } from '../../components/BadgePreorder'
import LogoInilima from '../../components/LogoInilima'
import KartuPasar, { HOST_FOTO, type ProdukKartu } from '../../components/KartuPasar'
import SiteFooter from '../../components/beranda/SiteFooter'
import { IkonProduk } from '../../components/IkonStatistik'
import { IkonPanah } from '../../components/beranda/Ikon'
import { useTampilSkeleton } from '../../hooks/useSkeleton'
import { useHitungMundur } from '../../hooks/useHitungMundur'
import { statusPO, alasanTidakBisa, tanggalPanjang, formatSisa, janjiKirim, type DataPO } from '../../../lib/preorder'
import { transaksiBeku } from '../../../lib/config'
import { ambilPenjualPublik, ambilSatuPenjualPublik, type PenjualPublik } from '../../../lib/penjualPublik'
import NamaPenjual from '../../components/NamaPenjual'

// Detail produk — redesain Oktober 2026 (fase 3).
//
// Yang berubah tampilannya. Query produk, varian, progres PO, chat, dan
// tombol Hubungi Penjual (mode katalog) sama persis dengan versi sebelumnya.
// Yang ditambahkan hanya dua rak baca-saja: produk lain dari toko yang sama,
// dan produk alumni sekategori.
//
// Sengaja TIDAK ada: rating dan jumlah terjual di kepala halaman (belum ada
// ulasan — angka "5.0" lama adalah cadangan karangan — dan `terjual` berhenti
// sejak mode katalog), galeri multi-foto (foto_url hanya satu gambar),
// spesifikasi terstruktur (tidak ada kolomnya), keranjang dan Beli Sekarang
// (dibekukan), serta lencana "verified" (label angkatan dihitung dari kolom
// angkatan, bukan dari status alumni).

type Produk = DataPO & {
  id: string
  nama: string
  harga: number
  deskripsi: string
  kategori: string
  stok: number
  is_tersedia: boolean
  foto_url?: string | null
  created_at: string
  toko: { id: string; nama_toko: string; seller_id: string; is_official?: boolean; users?: PenjualPublik | null }
}

// Satu baris dari view preorder_progress
type ProgresPO = {
  produk_id: string
  terkumpul: number
  sedang_buka: boolean
}

type Varian = {
  id: string
  tipe: string
  nama: string
  stok: number
  harga_tambahan: number
}

const KOLOM_KARTU = 'id, nama, harga, kategori, foto_url, is_tersedia, is_preorder, po_janji_kirim, toko!inner(id, nama_toko, seller_id, is_official)'

function fmt(n: number) {
  if (!n) return 'Rp 0'
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function DetailProduk() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [produk, setProduk] = useState<Produk | null>(null)
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [startingChat, setStartingChat] = useState(false)
  const [varian, setVarian] = useState<Varian[]>([])
  const [varianId, setVarianId] = useState<string | null>(null)
  const [progresPo, setProgresPo] = useState<ProgresPO | null>(null)
  const [produkToko, setProdukToko] = useState<ProdukKartu[]>([])
  const [produkSerupa, setProdukSerupa] = useState<ProdukKartu[]>([])

  // Satu hitung mundur saja, dipasang ke penutupan PO. Yang dipakai dari sini
  // bukan cuma teksnya tapi juga `sekarang` — supaya status PO dan angka yang
  // ditampilkan selalu dihitung dari titik waktu yang sama.
  const mundur = useHitungMundur(produk?.is_preorder ? produk.po_selesai : null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    async function fetchProduk() {
      const { data, error } = await supabase
        .from('produk')
        .select('*, toko(id, nama_toko, seller_id, is_official)')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        // Identitas penjual dari penjual_publik — bisa dibaca anon, tidak
        // seperti alumni_publik, dan label_angkatan-nya sudah jadi
        const penjual = await ambilSatuPenjualPublik((data as any).toko?.seller_id)
        const toko = (data as any).toko
        setProduk({ ...data, toko: toko ? { ...toko, users: penjual } : null } as any)

        // Varian aktif saja — yang dinonaktifkan penjual tidak boleh dipilih
        const { data: v } = await supabase
          .from('produk_varian')
          .select('id, tipe, nama, stok, harga_tambahan')
          .eq('produk_id', id)
          .eq('aktif', true)
          .order('urutan', { ascending: true })
          .order('nama', { ascending: true })

        setVarian((v ?? []) as Varian[])

        // Progres PO dibaca dari view khusus. View-nya security_invoker=false,
        // jadi `terkumpul` menghitung pesanan semua orang, bukan cuma milik
        // pembaca — memang itu yang mau ditampilkan.
        if ((data as any).is_preorder) {
          const { data: pr } = await supabase
            .from('preorder_progress')
            .select('produk_id, terkumpul, sedang_buka')
            .eq('produk_id', id)
            .maybeSingle()
          setProgresPo((pr ?? null) as ProgresPO | null)
        }

        if (toko?.id) muatRak(toko.id, (data as any).kategori)
      }
      setLoading(false)
    }

    // Dua rak baca-saja di bawah detail. Visibilitasnya tetap diatur RLS
    // (produk hanya tampil kalau penjualnya aktif), jadi tidak ada penyaring
    // akses tambahan di sini.
    //
    // - Produk lain dari toko yang sama. Untuk toko IniLima isinya
    //   merchandise lain — itu konteks toko resminya sendiri, sama seperti
    //   halaman tokonya.
    // - Produk serupa: KHUSUS lapak alumni, sekategori. Merchandise resmi
    //   dikecualikan seperti di semua daftar umum lain, dan toko yang sama
    //   tidak diulang karena sudah punya raknya sendiri.
    async function muatRak(tokoId: string, kategori: string) {
      const [lain, serupa] = await Promise.all([
        supabase.from('produk').select(KOLOM_KARTU)
          .eq('toko_id', tokoId).neq('id', id)
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('produk').select(KOLOM_KARTU)
          .eq('toko.is_official', false).eq('kategori', kategori)
          .neq('id', id).neq('toko_id', tokoId)
          .order('created_at', { ascending: false }).limit(5),
      ])
      const barisLain = (lain.data ?? []) as unknown as ProdukKartu[]
      const barisSerupa = (serupa.data ?? []) as unknown as ProdukKartu[]
      const penjualById = await ambilPenjualPublik(
        [...barisLain, ...barisSerupa].map(p => p.toko?.seller_id),
      )
      const gabung = (p: ProdukKartu): ProdukKartu => ({
        ...p,
        toko: p.toko ? { ...p.toko, penjual: p.toko.seller_id ? penjualById[p.toko.seller_id] ?? null : null } : null,
      })
      setProdukToko(barisLain.map(gabung))
      setProdukSerupa(barisSerupa.map(gabung))
    }

    if (id) fetchProduk()
  }, [id])

  function showToast(text: string, ok: boolean) {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleChatSeller() {
    if (!produk || startingChat) return
    if (!currentUserId) { router.push('/auth?mode=masuk'); return }
    const sellerId = (produk.toko as any)?.seller_id
    if (!sellerId || currentUserId === sellerId) return
    setStartingChat(true)

    try {
      // maybeSingle() returns null (not error) when no row found
      const { data: existing, error: selectErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', currentUserId)
        .eq('seller_id', sellerId)
        .maybeSingle()

      if (selectErr) throw new Error(selectErr.message)

      if (existing) {
        router.push(`/chat/${existing.id}`)
        return
      }

      const { data: newConv, error: insertErr } = await supabase
        .from('conversations')
        .insert({ buyer_id: currentUserId, seller_id: sellerId, produk_id: produk.id })
        .select('id')
        .single()

      if (insertErr) throw new Error(insertErr.message)
      if (newConv) router.push(`/chat/${newConv.id}`)
    } catch (err: any) {
      showToast('Gagal membuka chat: ' + (err?.message ?? 'Coba lagi'), false)
    } finally {
      setStartingChat(false)
    }
  }

  if (tampilSkeleton) {
    return (
      <main className="beranda">
        <Navbar />
        <div className="b-wadah">
          <div className="d-remah"><Skeleton tinggi={14} lebar={260} /></div>
          <div className="d-utama">
            <Skeleton tinggi={420} radius={20} />
            <div className="d-panel">
              <Skeleton tinggi={14} lebar="30%" style={{ marginBottom: '14px' }} />
              <Skeleton tinggi={28} lebar="85%" style={{ marginBottom: '14px' }} />
              <Skeleton tinggi={30} lebar="45%" style={{ marginBottom: '24px' }} />
              <Skeleton tinggi={12} style={{ marginBottom: '8px' }} />
              <Skeleton tinggi={12} lebar="70%" style={{ marginBottom: '24px' }} />
              <Skeleton tinggi={48} radius={10} />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (notFound || !produk) {
    return (
      <main className="beranda">
        <Navbar />
        <div className="b-wadah">
          <div className="d-tidak-ada">
            <span className="d-tidak-ada-ikon"><IkonProduk size={28} /></span>
            <h1>Produk tidak ditemukan</h1>
            <p>Produk ini mungkin sudah dihapus atau tokonya sedang tidak aktif.</p>
            <Link href="/produk" className="b-tombol m-tombol-biru">Kembali ke Produk</Link>
          </div>
        </div>
      </main>
    )
  }

  const penjual = ((produk.toko as any)?.users ?? null) as PenjualPublik | null
  const resmi = Boolean((produk.toko as any)?.is_official)
  const tokoId = (produk.toko as any)?.id as string | undefined
  const bisaChat = Boolean(currentUserId && currentUserId !== (produk.toko as any)?.seller_id)

  const punyaVarian = varian.length > 0
  const varianTerpilih = varian.find(v => v.id === varianId) ?? null
  const hargaTampil = produk.harga + (varianTerpilih?.harga_tambahan ?? 0)

  // Produk PO belum diproduksi, jadi ketersediaan tidak dipakai sama sekali
  // sebagai penghalang — yang membatasi adalah periode dan kuota.
  const po = Boolean(produk.is_preorder)
  const terkumpul = progresPo?.terkumpul ?? 0
  const sisaKuota = produk.po_maks != null ? Math.max(0, produk.po_maks - terkumpul) : 0
  // Sebelum jam klien siap (mundur.sekarang masih 0) semua periode terlihat
  // "belum dibuka". Diperlakukan sebagai belum siap supaya tombolnya tidak
  // sempat salah label sepersekian detik.
  const statusPo = mundur.siap
    ? statusPO(produk, progresPo?.terkumpul ?? null, mundur.sekarang)
    : 'buka'
  const labelStatusPo = statusPo === 'buka' ? 'Sedang dibuka'
    : statusPo === 'belum_dibuka' ? 'Belum dibuka'
    : statusPo === 'kuota_penuh' ? 'Kuota penuh'
    : 'Sudah ditutup'
  // Di mode katalog ketersediaan dijawab penjual lewat `is_tersedia`, bukan
  // dihitung dari angka stok. Stok tidak lagi dipotong pesanan maupun
  // dikembalikan pembatalan, jadi angkanya sudah tidak bisa dipercaya.
  const tersedia = po ? true : produk.is_tersedia !== false

  const fotoPenjual = penjual?.avatar_url || penjual?.foto_url || null
  const inisial = (penjual?.nama ?? produk.toko?.nama_toko ?? '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const tombolHubungi = (
    <TombolHubungi
      produkId={produk.id}
      tokoId={tokoId ?? ''}
      namaProduk={produk.nama}
      tersedia={tersedia}
      // Periode PO yang belum dibuka atau sudah ditutup tetap menutup
      // tombolnya — alasannya sudah berbahasa Indonesia dari lib/preorder
      matiKarena={alasanTidakBisa(statusPo, produk.po_mulai) ?? null}
    />
  )

  return (
    <main className="beranda detail">
      <Navbar />

      <div className="b-wadah">
        {/* ── Remah roti ── semua tautannya rute yang ada */}
        <nav className="d-remah" aria-label="Remah roti">
          <ol>
            <li><Link href="/">Beranda</Link></li>
            <li><Link href="/produk">Produk</Link></li>
            <li><Link href={`/produk?kategori=${encodeURIComponent(produk.kategori)}`}>{produk.kategori}</Link></li>
            <li aria-current="page">{produk.nama}</li>
          </ol>
        </nav>

        {/* ── Area utama: foto · informasi · penjual ── */}
        <div className="d-utama">
          {/* Satu foto — foto_url memang hanya satu gambar, jadi tidak ada
              thumbnail. Tanpa foto, FotoProduk jatuh ke ikon kategori. */}
          <div className="d-galeri">
            <FotoProduk src={produk.foto_url} kategori={produk.kategori} height={420} fontSize={88} />
          </div>

          <section className="d-panel d-info" aria-labelledby="judul-produk">
            <div className="d-label-baris">
              <span className="d-kategori">{produk.kategori}</span>
              <BadgePreorder aktif={po} />
              <BadgeOfficial aktif={resmi} />
            </div>
            <h1 id="judul-produk" className="d-judul">{produk.nama}</h1>
            <div className="d-harga">{fmt(hargaTampil)}</div>

            <div className="d-status">
              {po ? (
                <>
                  <span className="d-status-po">Pre-Order · {labelStatusPo}</span>
                </>
              ) : (
                // Angka stok tidak ditampilkan di mode katalog — lihat
                // BadgeTersedia soal kenapa angkanya tidak bisa dipercaya
                <BadgeTersedia tersedia={produk.is_tersedia} />
              )}
            </div>

            {/* Pemilih varian — hanya untuk produk yang punya varian aktif */}
            {punyaVarian && (
              <div className="d-varian">
                <div className="d-subjudul">Pilih {varian[0]?.tipe ?? 'Ukuran'}</div>
                <div className="d-varian-daftar">
                  {varian.map(v => {
                    // Di mode katalog stok varian sudah beku: tidak ada pesanan
                    // yang memotongnya, dan editor varian disembunyikan dari
                    // penjual — jadi varian yang kebetulan bernilai 0 sebelum
                    // peralihan akan dicoret selamanya tanpa ada yang bisa
                    // membetulkannya. Ketersediaan dijawab produk.is_tersedia.
                    const habis = transaksiBeku ? false : v.stok <= 0
                    const dipilih = v.id === varianId
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVarianId(v.id)}
                        disabled={habis}
                        aria-pressed={dipilih}
                        aria-label={habis ? `${v.nama} — stok habis` : `Pilih ${v.tipe} ${v.nama}`}
                        className={`d-varian-item${dipilih ? ' dipilih' : ''}${habis ? ' habis' : ''}`}
                      >
                        {v.nama}
                      </button>
                    )
                  })}
                </div>
                {/* Peringatan stok menipis DIBEKUKAN di mode katalog: angka stok
                    sudah pasti melenceng sejak tidak ada pesanan yang memotongnya */}
                {!transaksiBeku && varianTerpilih && varianTerpilih.stok > 0 && varianTerpilih.stok < 5 && (
                  <div style={{ fontSize: '13px', color: '#e65100', fontWeight: 600, marginTop: '8px' }}>
                    Sisa {varianTerpilih.stok} lagi
                  </div>
                )}
                {varianTerpilih && varianTerpilih.harga_tambahan > 0 && (
                  <div className="d-catatan">
                    {varianTerpilih.tipe} {varianTerpilih.nama} +{fmt(varianTerpilih.harga_tambahan)} dari harga dasar.
                  </div>
                )}
              </div>
            )}

            {/* Panel pre-order. Semua angka di sini cuma pemberitahuan awal;
                penjaga sebenarnya tetap constraint dan RPC di server. */}
            {po && (
              <div className="d-po" style={{ borderColor: WARNA_PO }}>
                {mundur.siap && statusPo === 'buka' && produk.po_selesai && (
                  <div className="d-po-baris">
                    Ditutup dalam <strong style={{ color: WARNA_PO_TUA }}>{mundur.teks}</strong>
                    <span>sampai {tanggalPanjang(produk.po_selesai)}</span>
                  </div>
                )}
                {mundur.siap && statusPo === 'belum_dibuka' && produk.po_mulai && (
                  <div className="d-po-baris">
                    Dibuka dalam{' '}
                    <strong style={{ color: WARNA_PO_TUA }}>
                      {formatSisa(new Date(produk.po_mulai).getTime() - mundur.sekarang)}
                    </strong>
                    <span>{tanggalPanjang(produk.po_mulai)}</span>
                  </div>
                )}
                {produk.po_janji_kirim && (
                  <div className="d-po-baris">
                    <strong>{janjiKirim(produk.po_janji_kirim)}</strong>
                    <span>
                      Kalau lewat tanggal ini barangmu belum dikirim, pesanan
                      dibatalkan dan dananya dikembalikan.
                    </span>
                  </div>
                )}

                {/* Progres ke target. Hanya kalau penjual memasang target —
                    tanpa itu bilangan pembaginya tidak ada */}
                {produk.po_target != null && produk.po_target > 0 && (
                  <div className="d-po-baris">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#617B95', marginBottom: '6px' }}>
                      <span><strong style={{ color: WARNA_PO_TUA }}>{terkumpul}</strong> dari {produk.po_target} terkumpul</span>
                      <span>{Math.min(100, Math.round((terkumpul / produk.po_target) * 100))}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#eceaf7', borderRadius: '20px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (terkumpul / produk.po_target) * 100)}%`, height: '100%', background: WARNA_PO, borderRadius: '20px' }} />
                    </div>
                    {terkumpul >= produk.po_target && (
                      <span style={{ color: '#2e7d32' }}>Target sudah tercapai</span>
                    )}
                  </div>
                )}

                {produk.po_maks != null && produk.po_maks > 0 && (
                  <div className="d-po-baris" style={{ color: sisaKuota > 0 ? '#617B95' : '#c62828' }}>
                    {sisaKuota > 0 ? `Sisa kuota ${sisaKuota} dari ${produk.po_maks}` : 'Kuota penuh — pemesanan ditutup'}
                  </div>
                )}

                {produk.po_catatan && (
                  <div className="d-po-catatan">
                    <strong style={{ color: WARNA_PO_TUA }}>Penting: </strong>{produk.po_catatan}
                  </div>
                )}

                <p className="d-catatan" style={{ margin: 0 }}>
                  Barang pre-order dibuat setelah periode pemesanan ditutup, jadi
                  pengirimannya menyusul sesuai tanggal janji kirim di atas.
                </p>
              </div>
            )}

            {/* Aksi utama mode katalog: Hubungi Penjual (WhatsApp/kontak toko).
                Di HP tombol ini pindah ke bilah bawah yang menempel. */}
            <div className="d-aksi-lebar">{tombolHubungi}</div>
          </section>

          {/* ── Kartu penjual ── */}
          <aside className="d-panel d-penjual" aria-label="Penjual">
            <div className="d-eyebrow">{resmi ? 'Toko Resmi' : 'Penjual'}</div>
            <div className="d-penjual-kepala">
              <span className={`d-avatar${resmi ? ' resmi' : ''}`} aria-hidden>
                {resmi
                  ? <LogoInilima lebar="100%" />
                  : fotoPenjual && fotoPenjual.startsWith(HOST_FOTO)
                    ? <Image src={fotoPenjual} alt="" width={72} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : inisial}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="d-nama-toko">
                  {produk.toko?.nama_toko || 'Toko Alumni'}
                  <BadgeOfficial aktif={resmi} />
                </div>
                {/* Nama · Superfive 92 — koreksi sosial: angkatan terbaca di
                    mana pun nama penjual muncul, dan boleh membungkus alih-alih
                    terpotong. Toko resmi itu akun institusi, jadi tanpa angkatan. */}
                {!resmi && penjual && (
                  // Tiga tingkat: toko (di atas) · nama · Superfive NN. Label
                  // angkatannya baris sendiri, berbentuk pil (lihat .d-penjual-nama)
                  <span className="d-penjual-nama">
                    <NamaPenjual
                      nama={penjual.nama} label={penjual.label_angkatan} angkatan={penjual.angkatan} institusi={penjual.is_institusi}
                      bertumpuk
                      style={{ fontSize: '15px', whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', lineHeight: 1.45, marginTop: '2px', color: '#33465a' }}
                    />
                  </span>
                )}
              </div>
            </div>

            {resmi && (
              <p className="d-catatan" style={{ margin: '12px 0 0' }}>
                Merchandise resmi komunitas alumni SMPN 5 Bandung.
              </p>
            )}

            <div className="d-penjual-aksi">
              {tokoId && (
                <Link href={`/toko/${tokoId}`} className="d-tombol-garis">
                  Lihat Toko <IkonPanah size={16} tebal={2} />
                </Link>
              )}
              {bisaChat && (
                <button type="button" onClick={handleChatSeller} disabled={startingChat} className="d-tombol-garis">
                  {startingChat ? 'Membuka chat...' : 'Chat Penjual'}
                </button>
              )}
              {!currentUserId && (
                <Link href="/auth?mode=masuk" className="d-tombol-teks">Masuk untuk chat dengan penjual</Link>
              )}
            </div>

            {toast && (
              <div role="status" className={`d-toast${toast.ok ? ' ok' : ''}`}>{toast.text}</div>
            )}
          </aside>
        </div>

        {/* ── Detail produk ── */}
        <section className="d-detail" aria-labelledby="judul-detail">
          <div className="d-panel d-area-desk">
            <h2 id="judul-detail" className="d-h2">Deskripsi</h2>
            {produk.deskripsi?.trim()
              ? <p className="d-deskripsi">{produk.deskripsi}</p>
              : <p className="d-catatan" style={{ margin: 0 }}>Penjual belum menulis deskripsi untuk produk ini.</p>}
          </div>

          {/* Hanya kolom yang memang ada di data — bukan spesifikasi yang
              diurai dari teks deskripsi */}
          <div className="d-panel d-area-info">
            <h2 className="d-h2">Informasi Produk</h2>
            <dl className="d-info-daftar">
              <div><dt>Kategori</dt><dd>{produk.kategori}</dd></div>
              <div><dt>Status barang</dt><dd>{po ? 'Pre-Order' : 'Ready Stock'}</dd></div>
              {po
                ? produk.po_selesai && <div><dt>Pre-order ditutup</dt><dd>{tanggalPanjang(produk.po_selesai)}</dd></div>
                : <div><dt>Ketersediaan</dt><dd>{produk.is_tersedia !== false ? 'Tersedia' : 'Stok habis'}</dd></div>}
              {punyaVarian && (
                <div><dt>Pilihan {varian[0]?.tipe ?? 'varian'}</dt><dd>{varian.map(v => v.nama).join(', ')}</dd></div>
              )}
              {tokoId && (
                <div><dt>Toko</dt><dd><Link href={`/toko/${tokoId}`}>{produk.toko?.nama_toko}</Link></dd></div>
              )}
            </dl>
          </div>

          {/* ── Ulasan — fungsi yang sudah ada, tidak diubah. Anak ketiga grid
              detail: di desktop mengisi ruang di bawah Deskripsi (samping
              Informasi Produk), di tablet/HP tetap selebar penuh di bawahnya ── */}
          <div className="d-ulasan" role="region" aria-label="Ulasan">
            <ReviewSection produkId={produk.id} />
          </div>
        </section>

        {/* ── Rak penjelajahan — hilang sendiri kalau kosong ── */}
        {produkToko.length > 0 && (
          <section className="d-rak" aria-labelledby="judul-toko-lain">
            <div className="b-kepala">
              <h2 id="judul-toko-lain" className="d-h2" style={{ margin: 0 }}>Produk Lain dari Toko Ini</h2>
              {tokoId && <Link href={`/toko/${tokoId}`} className="b-tautan">Lihat Toko <IkonPanah size={16} tebal={2} /></Link>}
            </div>
            <ul className="m-grid" role="list">
              {produkToko.map(p => <li key={p.id}><KartuPasar p={p} /></li>)}
            </ul>
          </section>
        )}

        {produkSerupa.length > 0 && (
          <section className="d-rak" aria-labelledby="judul-serupa">
            <div className="b-kepala">
              <h2 id="judul-serupa" className="d-h2" style={{ margin: 0 }}>Produk Serupa yang Mungkin Anda Suka</h2>
              <Link href={`/produk?kategori=${encodeURIComponent(produk.kategori)}`} className="b-tautan">
                Lihat {produk.kategori} <IkonPanah size={16} tebal={2} />
              </Link>
            </div>
            <ul className="m-grid" role="list">
              {produkSerupa.map(p => <li key={p.id}><KartuPasar p={p} /></li>)}
            </ul>
          </section>
        )}
      </div>

      {/* Bilah aksi di HP — position: fixed lewat portal ke body. Bukan sticky:
          `body` di project ini punya overflow-y: auto (efek samping
          overflow-x: hidden global) sehingga jadi wadah gulir sticky padahal
          yang menggulir html, dan sticky di bagian bawah tidak pernah aktif.
          Portal juga perlu karena <main> beranimasi transform. Dirender hanya
          setelah produk dimuat, yang selalu terjadi di klien. */}
      {createPortal(<div className="d-cta-hp">{tombolHubungi}</div>, document.body)}

      {/* Ruang supaya footer tidak tertutup bilah aksi HP */}
      <div className="d-ruang-bawah" />
      <SiteFooter />
    </main>
  )
}
