'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'
import SkeletonCard from '../components/SkeletonCard'
import LapakSegeraDibuka from '../components/LapakSegeraDibuka'
import NamaPenjual from '../components/NamaPenjual'
import BadgePreorder, { WARNA_PO_TUA } from '../components/BadgePreorder'
import BadgeTersedia from '../components/BadgeTersedia'
import SiteFooter from '../components/beranda/SiteFooter'
import AjakanJual, { tujuanJual, labelJual } from '../components/beranda/AjakanJual'
import { IKON_KATEGORI, IkonCari, IkonPetak, IkonSaring, IkonTutup, IkonPanah } from '../components/beranda/Ikon'
import { janjiKirim } from '../../lib/preorder'
import { useTampilSkeleton } from '../hooks/useSkeleton'
import { KATEGORI } from '../../lib/kategori'
import { ambilPenjualPublik, type PenjualPublik } from '../../lib/penjualPublik'

// Etalase "Produk & Jasa Alumni" — redesain Oktober 2026 (fase 2).
//
// Yang berubah tampilannya. Datanya tetap satu query yang sama: semua produk
// lapak alumni dimuat sekali, lalu dicari, disaring, dan diurutkan DI KLIEN.
// Tidak ada paginasi server, dan memang tidak ditambahkan di sini.
//
// Setiap penyaring yang tampil bekerja atas kolom yang benar-benar ada:
//   kategori       → produk.kategori
//   status barang  → produk.is_preorder
//   hanya tersedia → produk.is_tersedia (produk PO tidak memakainya)
//   rentang harga  → produk.harga
// Yang di mockup tapi TIDAK ada datanya — lokasi, kondisi, ongkir/COD,
// wishlist, rating, jumlah terjual, mode Produk/Jasa — sengaja tidak dibuat.
// Jasa saat ini hanya ada sebagai kategori, jadi ia dijelajahi lewat petak
// kategori, bukan lewat sakelar tipe yang akan menyaring hal yang sama dua kali.

type Produk = {
  id: string
  nama: string
  harga: number
  kategori: string
  is_tersedia: boolean
  is_preorder: boolean
  po_janji_kirim: string | null
  foto_url?: string | null
  toko: { nama_toko: string; is_official: boolean; seller_id: string | null; penjual: PenjualPublik | null } | null
}

type StatusBarang = 'semua' | 'ready' | 'po'
type Urutan = 'terbaru' | 'termurah' | 'termahal'

// 'semua' bukan kategori, hanya keadaan penyaring — karena itu ditambahkan
// di sini, bukan ikut masuk ke KATEGORI yang harus cocok dengan CHECK
const kategoris = ['semua', ...KATEGORI] as const

// Avatar penjual hanya dirender lewat next/image kalau host-nya memang
// terdaftar di next.config (Supabase Storage). Host lain akan membuat
// next/image melempar error, jadi jatuh ke inisial.
const HOST_FOTO = 'https://cbepplpvlizwyaalndas.supabase.co/storage/v1/object/public/'

function fmt(n: number | null | undefined) {
  if (!n) return 'Rp 0'
  return 'Rp ' + n.toLocaleString('id-ID')
}

function angka(s: string): number | null {
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

export default function ProdukPage() {
  const router = useRouter()
  const [produk, setProduk] = useState<Produk[]>([])
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  const [search, setSearch] = useState('')
  const [kategori, setKategori] = useState<string>('semua')
  const [status, setStatus] = useState<StatusBarang>('semua')
  const [hanyaTersedia, setHanyaTersedia] = useState(false)
  const [hargaMin, setHargaMin] = useState('')
  const [hargaMax, setHargaMax] = useState('')
  const [urut, setUrut] = useState<Urutan>('terbaru')
  const [panelTerbuka, setPanelTerbuka] = useState(false)
  // Ajakan menambah produk hanya masuk akal untuk penjual aktif; yang lain
  // akan ditolak /produk/tambah setelah terlanjur menekannya
  const [penjualAktif, setPenjualAktif] = useState(false)
  const [masuk, setMasuk] = useState(false)
  const siapUrl = useRef(false)
  const lembarRef = useRef<HTMLDivElement>(null)

  // Dideklarasikan sebelum useEffect yang memanggilnya — kalau ditaruh di
  // bawah, lint mengeluh "cannot access variable before it is declared"
  async function cekPenjual() {
    // getSession dulu: untuk pengunjung anon tidak ada panggilan jaringan
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    setMasuk(true)
    // Baris sendiri — satu-satunya baris `users` yang boleh dibaca klien
    const { data } = await supabase
      .from('users').select('status_penjual').eq('id', session.user.id).maybeSingle()
    setPenjualAktif(data?.status_penjual === 'aktif')
  }

  async function fetchProduk() {
    // Etalase ini KHUSUS LAPAK ALUMNI — merchandise resmi dikecualikan.
    // Halaman ini juga yang melayani penjelajahan per kategori (?kategori=),
    // jadi satu penyaring di sini menutup keduanya sekaligus.
    //
    // Merchandise resmi punya tiga tempatnya sendiri: panel IniLima di
    // beranda, halaman toko IniLima, dan halaman detail produknya kalau
    // tautannya dibuka langsung. Sengaja dipisah supaya terasa eksklusif,
    // bukan bercampur dengan lapak alumni.
    //
    // toko!inner tetap dipakai supaya penyaringnya bisa menyentuh kolom toko,
    // dan produk tanpa toko tidak lolos.
    const { data, error } = await supabase
      .from('produk')
      .select(`*, toko!inner(nama_toko, seller_id, is_official)`)
      .eq('toko.is_official', false)
      .order('created_at', { ascending: false })

    if (error || !data) { setLoading(false); return }

    // Info penjual diambil terpisah dari penjual_publik lalu digabung di sini,
    // karena embed foreign key ke users tidak bisa dibaca publik — dan
    // alumni_publik sudah tertutup untuk pengunjung anon.
    const baris = data as unknown as Produk[]
    const penjualById = await ambilPenjualPublik(baris.map(p => p.toko?.seller_id))

    setProduk(baris.map(p => ({
      ...p,
      toko: p.toko ? { ...p.toko, penjual: p.toko.seller_id ? penjualById[p.toko.seller_id] ?? null : null } : null,
    })))
    setLoading(false)
  }

  useEffect(() => {
    // Isi awal dari URL (dari pencarian navbar, kolom cari beranda, atau
    // petak kategori beranda)
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    const kat = params.get('kategori')
    if (q) setSearch(q)
    if (kat && (kategoris as readonly string[]).includes(kat)) setKategori(kat)
    siapUrl.current = true
    fetchProduk()
    cekPenjual()
  }, [])

  // Pencarian dan kategori ikut tercermin di URL supaya bisa dibagikan dan
  // tetap ada saat dimuat ulang. replaceState, bukan push: mengetik tidak
  // menimbun riwayat, jadi tombol Kembali tetap kembali ke halaman sebelumnya.
  useEffect(() => {
    if (!siapUrl.current) return
    const params = new URLSearchParams(window.location.search)
    const q = search.trim()
    if (q) params.set('q', q); else params.delete('q')
    if (kategori !== 'semua') params.set('kategori', kategori); else params.delete('kategori')
    const qs = params.toString()
    window.history.replaceState(window.history.state, '', qs ? `/produk?${qs}` : '/produk')
  }, [search, kategori])

  // Panel saring di HP/tablet: Escape menutup, latar tidak ikut tergulir
  useEffect(() => {
    if (!panelTerbuka) return
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setPanelTerbuka(false) }
    document.addEventListener('keydown', esc)
    const lama = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Fokus pindah ke panel sekali saat dibuka, bukan tiap render
    lembarRef.current?.querySelector<HTMLElement>('button')?.focus()
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = lama
    }
  }, [panelTerbuka])

  const min = angka(hargaMin)
  const max = angka(hargaMax)

  const hasil = useMemo(() => {
    const kata = search.trim().toLowerCase()
    const saring = produk.filter(p => {
      if (kata && !p.nama.toLowerCase().includes(kata)) return false
      if (kategori !== 'semua' && p.kategori !== kategori) return false
      if (status === 'ready' && p.is_preorder) return false
      if (status === 'po' && !p.is_preorder) return false
      // Produk PO tidak memakai is_tersedia — periode PO yang menjawab
      // buka-tidaknya — jadi penyaring ini hanya menyentuh barang ready
      if (hanyaTersedia && !p.is_preorder && !p.is_tersedia) return false
      if (min != null && (p.harga ?? 0) < min) return false
      if (max != null && (p.harga ?? 0) > max) return false
      return true
    })
    // 'terbaru' = urutan dari server (created_at menurun)
    if (urut === 'termurah') return [...saring].sort((a, b) => (a.harga ?? 0) - (b.harga ?? 0))
    if (urut === 'termahal') return [...saring].sort((a, b) => (b.harga ?? 0) - (a.harga ?? 0))
    return saring
  }, [produk, search, kategori, status, hanyaTersedia, min, max, urut])

  const jumlahSaringan = (status !== 'semua' ? 1 : 0) + (hanyaTersedia ? 1 : 0) + (min != null || max != null ? 1 : 0)
  const adaPenyaring = Boolean(search.trim()) || kategori !== 'semua' || jumlahSaringan > 0
  // Etalase yang memang kosong tidak diberi saringan: tidak ada yang bisa
  // disaring, dan kontrol yang tidak mengubah apa pun hanya jadi hiasan
  const etalaseKosong = !loading && produk.length === 0

  function resetSemua() {
    setSearch(''); setKategori('semua'); setStatus('semua')
    setHanyaTersedia(false); setHargaMin(''); setHargaMax('')
  }

  function resetSaringan() {
    setStatus('semua'); setHanyaTersedia(false); setHargaMin(''); setHargaMax('')
  }

  function handleJual() {
    router.push(tujuanJual(penjualAktif, masuk))
  }

  // Pencarian sudah menyaring saat mengetik; submit cukup menutup keyboard HP
  function handleCari(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    ;(e.currentTarget.querySelector('input') as HTMLInputElement | null)?.blur()
  }

  const panelSaring = (
    <PanelSaring
      status={status} setStatus={setStatus}
      hanyaTersedia={hanyaTersedia} setHanyaTersedia={setHanyaTersedia}
      hargaMin={hargaMin} setHargaMin={setHargaMin}
      hargaMax={hargaMax} setHargaMax={setHargaMax}
      bisaReset={jumlahSaringan > 0}
      onReset={resetSaringan}
    />
  )

  return (
    <main className="beranda pasar">
      <Navbar />

      {/* ── Hero ringkas ── */}
      <section className="m-hero" aria-labelledby="judul-pasar">
        <div className="m-hero-foto" aria-hidden>
          <Image src="/smpn5-hero.png" alt="" fill priority sizes="(max-width: 1023px) 100vw, 900px" style={{ objectFit: 'cover', objectPosition: 'center 30%' }} />
        </div>
        <div className="m-hero-lapis" aria-hidden />
        <div className="b-wadah m-hero-isi">
          <p className="b-eyebrow">Marketplace Alumni SMPN 5 Bandung</p>
          <h1 id="judul-pasar" className="m-hero-judul">Produk &amp; Jasa Alumni</h1>
          <p className="m-hero-sub">
            Temukan berbagai produk, jasa, dan bisnis dari keluarga besar SMPN 5 Bandung.
            Belanja, bertransaksi, dan dukung sesama alumni.
          </p>
          <form role="search" onSubmit={handleCari} className="b-hero-cari m-cari">
            <label htmlFor="cari-pasar" className="sr-only">Cari produk, jasa, atau usaha alumni</label>
            <span className="b-hero-cari-ikon"><IkonCari size={20} /></span>
            <input
              id="cari-pasar"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk, jasa, atau usaha alumni..."
              enterKeyHint="search"
            />
            {search && (
              <button type="button" className="m-cari-hapus" onClick={() => setSearch('')} aria-label="Hapus pencarian">
                <IkonTutup size={16} tebal={2} />
              </button>
            )}
            <button type="submit">Cari</button>
          </form>
        </div>
      </section>

      {/* ── Kategori ── */}
      <div className="b-wadah">
        <nav className="m-kategori" aria-label="Kategori">
          {kategoris.map(k => {
            const aktif = kategori === k
            const Ikon = k === 'semua' ? IkonPetak : IKON_KATEGORI[k]
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKategori(k)}
                aria-pressed={aktif}
                className={`m-kategori-item${aktif ? ' aktif' : ''}`}
              >
                <span className="m-kategori-ikon"><Ikon size={22} /></span>
                {k === 'semua' ? 'Semua' : k}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── Saringan + hasil ── */}
      <section className={`b-wadah m-tata${etalaseKosong ? ' tanpa-samping' : ''}`} aria-label="Hasil pencarian">
        {!etalaseKosong && <aside className="m-samping" aria-label="Saring hasil">
          {panelSaring}
        </aside>}

        <div style={{ minWidth: 0 }}>
          <div className="m-toolbar">
            <p className="m-jumlah" aria-live="polite">
              {tampilSkeleton
                ? 'Memuat…'
                : <><strong>{hasil.length}</strong> Produk &amp; Jasa Ditemukan</>}
            </p>
            {!etalaseKosong && <div className="m-toolbar-aksi">
              <button type="button" className="m-tombol-saring" onClick={() => setPanelTerbuka(true)} aria-haspopup="dialog">
                <IkonSaring size={18} /> Saring
                {jumlahSaringan > 0 && <span className="m-lencana-angka">{jumlahSaringan}</span>}
              </button>
              <label className="m-urut">
                <span className="sr-only">Urutkan</span>
                <select value={urut} onChange={e => setUrut(e.target.value as Urutan)}>
                  <option value="terbaru">Terbaru</option>
                  <option value="termurah">Harga Terendah</option>
                  <option value="termahal">Harga Tertinggi</option>
                </select>
              </label>
              {/* Hanya penjual aktif: yang lain akan ditolak /produk/tambah */}
              {penjualAktif && (
                <Link href="/produk/tambah" className="m-tambah">+ Tambah Produk</Link>
              )}
            </div>}
          </div>

          {tampilSkeleton ? (
            <div className="m-grid">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : hasil.length === 0 ? (
            produk.length > 0 || adaPenyaring ? (
              <div className="m-kosong">
                <span className="m-kosong-ikon"><IkonCari size={26} /></span>
                <h2>Produk atau jasa belum ditemukan.</h2>
                <p>
                  {search.trim()
                    ? `Belum ada produk alumni yang cocok dengan "${search.trim()}". Coba kata lain atau longgarkan saringan.`
                    : kategori !== 'semua' && jumlahSaringan === 0
                      ? `Belum ada alumni yang jualan di kategori ${kategori}. Mungkin kamu yang pertama?`
                      : 'Coba longgarkan saringan atau pilih kategori lain.'}
                </p>
                <button type="button" className="b-tombol m-tombol-biru" onClick={resetSemua}>Tampilkan Semua</button>
              </div>
            ) : (
              // Etalase benar-benar kosong — bukan hasil penyaring pencarian.
              // Teksnya dibagi dengan rak Produk Terbaru di beranda.
              <LapakSegeraDibuka penjualAktif={penjualAktif} />
            )
          ) : (
            <ul className="m-grid" role="list">
              {hasil.map(p => <li key={p.id}><KartuPasar p={p} /></li>)}
            </ul>
          )}
        </div>
      </section>

      {/* ── Panel saring HP & tablet ──
          Lewat portal ke body: <main> punya animasi transform, dan elemen
          position:fixed di dalam elemen ber-transform menempel ke elemen itu,
          bukan ke layar. */}
      {panelTerbuka && createPortal((
        <div className="m-lembar-latar" onClick={() => setPanelTerbuka(false)}>
          <div
            className="m-lembar"
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-lembar"
            onClick={e => e.stopPropagation()}
            ref={lembarRef}
          >
            <div className="m-lembar-kepala">
              <h2 id="judul-lembar">Saring</h2>
              <button type="button" onClick={() => setPanelTerbuka(false)} aria-label="Tutup saringan" className="m-lembar-tutup">
                <IkonTutup size={20} />
              </button>
            </div>
            {panelSaring}
            <button type="button" className="b-tombol m-tombol-biru" style={{ width: '100%', marginTop: '16px' }} onClick={() => setPanelTerbuka(false)}>
              Lihat {hasil.length} Hasil
            </button>
          </div>
        </div>
      ), document.body)}

      <AjakanJual label={labelJual(penjualAktif)} onClick={handleJual} />

      <SiteFooter />
    </main>
  )
}

function PanelSaring(props: {
  status: StatusBarang; setStatus: (s: StatusBarang) => void
  hanyaTersedia: boolean; setHanyaTersedia: (v: boolean) => void
  hargaMin: string; setHargaMin: (v: string) => void
  hargaMax: string; setHargaMax: (v: string) => void
  bisaReset: boolean; onReset: () => void
}) {
  const pilihanStatus: { nilai: StatusBarang; label: string }[] = [
    { nilai: 'semua', label: 'Semua' },
    { nilai: 'ready', label: 'Ready Stock' },
    { nilai: 'po', label: 'Pre-Order' },
  ]
  return (
    <div className="m-saring">
      <div className="m-saring-kepala">
        <span>Saring</span>
        {props.bisaReset && (
          <button type="button" onClick={props.onReset} className="m-reset">Reset Filter</button>
        )}
      </div>

      <fieldset className="m-grup">
        <legend>Status Barang</legend>
        {pilihanStatus.map(o => (
          <label key={o.nilai} className="m-pilihan">
            <input type="radio" name="status-barang" value={o.nilai} checked={props.status === o.nilai} onChange={() => props.setStatus(o.nilai)} />
            {o.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="m-grup">
        <legend>Ketersediaan</legend>
        <label className="m-pilihan">
          <input type="checkbox" checked={props.hanyaTersedia} onChange={e => props.setHanyaTersedia(e.target.checked)} />
          Hanya yang tersedia
        </label>
      </fieldset>

      <fieldset className="m-grup">
        <legend>Rentang Harga</legend>
        <div className="m-harga">
          <label>
            <span>Minimum</span>
            <input inputMode="numeric" placeholder="Rp" value={props.hargaMin} onChange={e => props.setHargaMin(e.target.value.replace(/[^\d]/g, ''))} />
          </label>
          <label>
            <span>Maksimum</span>
            <input inputMode="numeric" placeholder="Rp" value={props.hargaMax} onChange={e => props.setHargaMax(e.target.value.replace(/[^\d]/g, ''))} />
          </label>
        </div>
      </fieldset>
    </div>
  )
}

// Kartu etalase. Tidak ada rating, jumlah terjual, wishlist, keranjang, atau
// lencana "verified": rating belum punya ulasan (angka lama "5.0" adalah
// cadangan karangan), jumlah terjual berhenti bergerak sejak mode katalog,
// dan label angkatan dari penjual_publik dihitung dari kolom angkatan saja —
// bukan dari status alumni — jadi tidak sah dijadikan lencana verifikasi.
// Yang tampil "Nama · Superfive 92", mekanisme koreksi sosial yang sama
// dengan halaman lain.
function KartuPasar({ p }: { p: Produk }) {
  const penjual = p.toko?.penjual ?? null
  const jasa = p.kategori === 'Jasa'
  const foto = penjual?.avatar_url || penjual?.foto_url || null
  const inisial = (penjual?.nama ?? p.toko?.nama_toko ?? '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <Link href={`/produk/${p.id}`} className="prod-card m-kartu">
      <div style={{ position: 'relative' }}>
        <BadgePreorder aktif={p.is_preorder} bentuk="pita" />
        {/* Tinggi foto diatur CSS per lebar layar (.m-foto) — lebih pendek di
            grid desktop yang padat */}
        <div className="m-foto"><FotoProduk src={p.foto_url} kategori={p.kategori} height={180} fontSize={44} /></div>
      </div>
      <div className="m-kartu-isi">
        <span className="m-kartu-kategori">{p.kategori}</span>
        <span className="m-kartu-nama">{p.nama}</span>
        <span className="m-kartu-harga">{fmt(p.harga)}</span>
        {/* Stok produk PO selalu 0 karena trg_kurangi_stok sengaja
            melewatinya — produk PO memakai janji kirim, bukan lencana stok */}
        {p.is_preorder ? (
          p.po_janji_kirim && <span style={{ fontSize: '12px', color: WARNA_PO_TUA }}>{janjiKirim(p.po_janji_kirim)}</span>
        ) : (
          <div><BadgeTersedia tersedia={p.is_tersedia} kecil /></div>
        )}

        <div className="m-kartu-penjual">
          <span className="m-avatar" aria-hidden>
            {foto && foto.startsWith(HOST_FOTO)
              ? <Image src={foto} alt="" width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : inisial}
          </span>
          <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {p.toko?.nama_toko && <span className="m-kartu-toko">{p.toko.nama_toko}</span>}
            {penjual && (
              // Boleh membungkus, tidak dipotong: angkatan adalah mekanisme
              // koreksi sosial dan tidak boleh hilang demi menghemat ruang
              <NamaPenjual nama={penjual.nama} label={penjual.label_angkatan} angkatan={penjual.angkatan} institusi={penjual.is_institusi} kecil style={{ fontSize: '12px', whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', lineHeight: 1.4 }} />
            )}
          </span>
        </div>

        {/* Jasa dan produk sama-sama menuju halaman detail — di sanalah tombol
            Hubungi Penjual berada. Bedanya hanya kata ajakannya. */}
        <span className="m-kartu-aksi">
          {jasa ? 'Lihat Jasa' : 'Lihat Detail'} <IkonPanah size={14} tebal={2.2} />
        </span>
      </div>
    </Link>
  )
}
