'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Navbar from './components/Navbar'
import FotoProduk from './components/FotoProduk'
import SkeletonCard from './components/SkeletonCard'
import SectionOfficial from './components/SectionOfficial'
import BadgePreorder, { WARNA_PO_TUA } from './components/BadgePreorder'
import BadgeTersedia from './components/BadgeTersedia'
import LapakSegeraDibuka from './components/LapakSegeraDibuka'
import { IkonProduk, IkonToko, IkonAlumni } from './components/IkonStatistik'
import {
  IKON_KATEGORI, IkonPanah, IkonCari, IkonOrang, IkonPerisai, IkonPetak, IkonGrafik,
} from './components/beranda/Ikon'
import SiteFooter from './components/beranda/SiteFooter'
import AjakanJual, { tujuanJual, labelJual } from './components/beranda/AjakanJual'
import { janjiKirim } from '../lib/preorder'
import { KATEGORI } from '../lib/kategori'
import { ambilPenjualPublik, type PenjualPublik } from '../lib/penjualPublik'
import NamaPenjual from './components/NamaPenjual'

// Beranda — redesain Oktober 2026.
//
// Yang berubah hanya tampilannya. Semua query, penyaring, dan aturan siapa
// diajak ke mana sama persis dengan versi sebelumnya:
//   - hitungan hero polos tanpa penyaring (merchandise ikut dihitung)
//   - Produk Terbaru MENYARING toko resmi; merchandise hanya di rak IniLima
//   - tombol jualan mengikuti status_penjual, bukan sekadar login
// Urutan section: hero → statistik → kategori → IniLima → Produk Terbaru →
// Kenapa Superfive → ajakan berjualan → footer.

type Produk = {
  id: string
  nama: string
  harga: number
  kategori: string
  foto_url?: string | null
  terjual: number
  is_tersedia: boolean
  is_preorder: boolean
  po_janji_kirim: string | null
  rating: number
  toko: { nama_toko: string; is_official?: boolean; seller_id?: string | null } | null
  penjual?: PenjualPublik | null
}

type Stats = { produk: number; toko: number; alumni: number }


function fmt(n: number | null | undefined) {
  if (!n) return 'Rp 0'
  return 'Rp ' + n.toLocaleString('id-ID')
}

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target) return
    let current = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return count
}

// Satu blok statistik di kartu putih yang menumpang di kaki hero.
//
// Hanya tiga besaran yang memang dihitung dari database. Mockup memuat blok
// keempat ("1 Komunitas") — sengaja tidak ada, karena angkanya tidak datang
// dari mana pun dan akan jadi satu-satunya angka karangan di halaman.
//
// Keterangannya ditulis tetap, bukan dihitung: kalimatnya menjelaskan arti
// angkanya, bukan melaporkan angka kedua yang harus ikut benar.
function Statistik({ label, value, keterangan, ikon }: {
  label: string
  value: number
  keterangan: string
  ikon: React.ReactNode
}) {
  const count = useCountUp(value)
  return (
    <div className="b-stat">
      <span className="b-stat-ikon">{ikon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
          {/* tabular-nums menjaga lebar angka tetap selama animasi hitung */}
          <span className="b-stat-angka">{count}</span>
          <span className="b-stat-label">{label}</span>
        </div>
        <div className="b-stat-ket">{keterangan}</div>
      </div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ produk: 0, toko: 0, alumni: 0 })
  const [latest, setLatest] = useState<Produk[]>([])
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  // Hanya penjual aktif yang ditawari menambah produk saat raknya kosong
  const [penjualAktif, setPenjualAktif] = useState(false)
  const [cari, setCari] = useState('')

  // Tujuannya mengikuti peran, bukan cuma "sudah login atau belum".
  // /produk/tambah menolak siapa pun yang status_penjual-nya bukan 'aktif',
  // jadi mengirim pengguna biasa ke sana berarti menawarkan tombol yang
  // pasti berujung penolakan. Yang belum jadi penjual dibawa ke pintunya
  // dulu (/jual), yang belum punya akun ke pendaftaran.
  function handleJualClick() {
    router.push(tujuanJual(penjualAktif, loggedIn))
  }

  // Kolom cari hero memakai pencarian yang sudah dilayani /produk lewat ?q=
  // (halaman itu yang membaca parameternya). Kosong = buka etalase saja.
  function handleCari(e: FormEvent) {
    e.preventDefault()
    const q = cari.trim()
    router.push(q ? `/produk?q=${encodeURIComponent(q)}` : '/produk')
  }

  useEffect(() => {
    async function load() {
      const [authRes, pCount, tCount, uCount, latestRes] = await Promise.all([
        supabase.auth.getUser(),
        // Hitungan polos, TANPA penyaring apa pun. Angka di hero menjawab
        // "seberapa ramai Superfive", jadi merchandise resmi ikut — dulu
        // dikecualikan dengan `.eq('toko.is_official', false)` mengikuti
        // etalase umum, dan akibatnya hero menampilkan 1 PRODUK padahal ada 6.
        //
        // Yang menentukan apa yang boleh terlihat sudah RLS (produk dan toko
        // hanya tampil kalau penjualnya aktif), jadi count polos ke tabelnya
        // memang sudah angka yang benar. Jangan menyaring lagi di sini.
        supabase.from('produk').select('*', { count: 'exact', head: true }),
        supabase.from('toko').select('*', { count: 'exact', head: true }),
        // Dijumlah dari angkatan_ringkas, BUKAN count ke alumni_publik: sejak
        // peluncuran reuni alumni_publik hanya bisa dibaca yang sudah login,
        // jadi untuk pengunjung angkanya jadi 0. angkatan_ringkas terbuka
        // untuk anon dan penyaringnya sama persis dengan direktori — alumni
        // aktif, bukan akun institusi. Jangan menyaring lagi di sini.
        supabase.from('angkatan_ringkas').select('jumlah'),
        // Merchandise resmi DIKELUARKAN dari rak ini, sama seperti dari
        // seluruh daftar umum lainnya — tempatnya rak IniLima tepat di
        // atas. Rak ini khusus lapak alumni.
        //
        // Penyaring yang sama pernah dibuang karena membuat rak ini kosong
        // dan berbunyi "Belum ada produk" padahal merchandise tayang di
        // atasnya. Yang dibetulkan sekarang bukan penyaringnya, melainkan
        // kalimatnya — lihat LapakSegeraDibuka.
        supabase.from('produk')
          .select('id, nama, harga, kategori, foto_url, terjual, rating, is_tersedia, is_preorder, po_janji_kirim, toko!inner(nama_toko, is_official, seller_id)')
          .eq('toko.is_official', false)
          .order('created_at', { ascending: false })
          .limit(6),
      ])
      const user = authRes.data.user
      setLoggedIn(!!user)

      // Baris sendiri — satu-satunya baris `users` yang boleh dibaca klien
      if (user) {
        const { data: saya } = await supabase
          .from('users').select('status_penjual').eq('id', user.id).maybeSingle()
        setPenjualAktif(saya?.status_penjual === 'aktif')
      }

      setStats({
        produk: pCount.count ?? 0,
        toko:   tCount.count ?? 0,
        alumni: ((uCount.data ?? []) as { jumlah: number }[]).reduce((n, a) => n + (a.jumlah ?? 0), 0),
      })

      const baris = (latestRes.data ?? []) as unknown as Produk[]
      const penjualById = await ambilPenjualPublik(baris.map(p => p.toko?.seller_id))
      setLatest(baris.map(p => ({
        ...p,
        penjual: p.toko?.seller_id ? penjualById[p.toko.seller_id] ?? null : null,
      })))
      setLoading(false)
    }
    load()
  }, [])

  // Label tombol jualan mengikuti peran yang sama dengan tujuannya
  const labelTombolJual = labelJual(penjualAktif)

  return (
    <main className="beranda">
      <Navbar />

      {/* Banner verifikasi sengaja tidak ada di sini. Sejak pembeli tidak lagi
          diperiksa, banner itu akan menyala untuk hampir semua orang yang baru
          daftar — padahal tidak ada satu pun yang terhalang. Ajakannya cukup
          sekali, di halaman profil. */}

      {/* ── Hero ── */}
      <section className="b-hero" aria-labelledby="judul-hero">
        {/* Gedung SMPN 5 sebagai latar. Lapisan gradien di atasnya yang
            menjaga teks tetap terbaca — di HP lapisannya lebih pekat karena
            teks menumpuk tepat di atas foto. */}
        <div className="b-hero-foto" aria-hidden>
          <Image src="/smpn5-hero.png" alt="" fill priority sizes="(max-width: 1023px) 100vw, 60vw" style={{ objectFit: 'cover', objectPosition: 'center 30%' }} />
        </div>
        <div className="b-hero-lapis" aria-hidden />

        <div className="b-wadah b-hero-isi">
          <div className="b-hero-teks">
            <p className="b-eyebrow">Marketplace Alumni SMPN 5 Bandung</p>
            <h1 id="judul-hero" className="b-hero-judul">
              Dari Alumni,<br /><span>Untuk Alumni.</span>
            </h1>
            <p className="b-hero-sub">
              Temukan produk, jasa, dan bisnis dari keluarga besar SMPN 5 Bandung.
              Belanja, berjualan, dan berkembang bersama.
            </p>

            <form role="search" onSubmit={handleCari} className="b-hero-cari">
              <label htmlFor="cari-hero" className="sr-only">Cari produk, jasa, atau usaha alumni</label>
              <span className="b-hero-cari-ikon"><IkonCari size={20} /></span>
              <input
                id="cari-hero"
                type="search"
                value={cari}
                onChange={e => setCari(e.target.value)}
                placeholder="Cari produk, jasa, atau usaha alumni..."
                enterKeyHint="search"
              />
              <button type="submit">Cari</button>
            </form>

            <div className="b-hero-cta">
              <Link href="/produk" className="b-tombol b-tombol-emas">
                Jelajahi Marketplace <IkonPanah size={18} tebal={2} />
              </Link>
              <button type="button" onClick={handleJualClick} className="b-tombol b-tombol-garis">
                {labelTombolJual}
              </button>
            </div>
          </div>

          <div className="b-hero-semboyan" aria-hidden>
            <span>Satu Keluarga</span>
            <span>Selamanya</span>
            <i />
          </div>
        </div>
      </section>

      {/* ── Statistik ── menumpang di kaki hero */}
      <div className="b-wadah" style={{ position: 'relative', zIndex: 2 }}>
        <div className="b-stat-kartu">
          <Statistik label="Produk" value={stats.produk} keterangan="Siap dibeli hari ini" ikon={<IkonProduk size={24} />} />
          <Statistik label="Toko" value={stats.toko} keterangan="Dikelola alumni" ikon={<IkonToko size={24} />} />
          <Statistik label="Alumni" value={stats.alumni} keterangan="Terverifikasi" ikon={<IkonAlumni size={24} />} />
        </div>
      </div>

      {/* ── Kategori ── */}
      <section className="b-seksi" aria-labelledby="judul-kategori">
        <div className="b-wadah">
          <div className="b-kepala">
            <div>
              <h2 id="judul-kategori" className="b-judul">Jelajahi Kategori</h2>
              <p className="b-sub">Temukan berbagai produk dan jasa dari alumni sesuai kebutuhan Anda.</p>
            </div>
            <Link href="/produk" className="b-tautan">Lihat Semua Produk <IkonPanah size={16} tebal={2} /></Link>
          </div>

          <ul className="b-kategori" role="list">
            {KATEGORI.map(k => {
              const Ikon = IKON_KATEGORI[k]
              return (
                <li key={k}>
                  <Link href={`/produk?kategori=${encodeURIComponent(k)}`} className="b-kategori-kartu">
                    <span className="b-kategori-ikon"><Ikon size={28} /></span>
                    <span className="b-kategori-nama">{k}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ── Official Merchandise IniLima ── */}
      <SectionOfficial />

      {/* ── Produk Terbaru ── khusus lapak alumni */}
      <section className="b-seksi" aria-labelledby="judul-terbaru">
        <div className="b-wadah">
          <div className="b-kepala">
            <div>
              <h2 id="judul-terbaru" className="b-judul">Produk Terbaru</h2>
              <p className="b-sub">Produk dan layanan terbaru dari alumni Superfive.</p>
            </div>
            <Link href="/produk" className="b-tautan">Lihat Semua Produk <IkonPanah size={16} tebal={2} /></Link>
          </div>

          {loading ? (
            <div className="b-produk-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : latest.length === 0 ? (
            // Ajakannya mengikuti siapa yang melihat — penjual aktif ditawari
            // menambah produk, sisanya diberi dua jalan keluar. Teksnya
            // dibagi dengan /produk, jadi ada di komponennya.
            <LapakSegeraDibuka penjualAktif={penjualAktif} />
          ) : (
            <div className="b-produk-grid">
              {latest.map(p => <KartuProduk key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Kenapa Superfive ── */}
      <section className="b-seksi" aria-labelledby="judul-kenapa">
        <div className="b-wadah">
          <div className="b-kepala">
            <div>
              <h2 id="judul-kenapa" className="b-judul">Kenapa Superfive Market?</h2>
              <p className="b-sub">Lebih dari transaksi, ini tentang kebersamaan.</p>
            </div>
          </div>
          <ul className="b-kenapa-daftar" role="list">
            <AlasanItem ikon={<IkonOrang size={24} />} judul="Komunitas Terpercaya" isi="Penjual berasal dari komunitas alumni." />
            <AlasanItem ikon={<IkonPerisai size={24} />} judul="Dukung Sesama Alumni" isi="Setiap transaksi memperkuat jaringan dan peluang." />
            <AlasanItem ikon={<IkonPetak size={24} />} judul="Kategori Lengkap" isi="Produk, jasa, dan bisnis dalam satu platform." />
            <AlasanItem ikon={<IkonGrafik size={24} />} judul="Peluang Lebih Luas" isi="Bisnis alumni dapat ditemukan lebih banyak orang." />
          </ul>
        </div>
      </section>

      {/* ── Ajakan berjualan ── */}
      <AjakanJual label={labelTombolJual} onClick={handleJualClick} />

      <SiteFooter />
    </main>
  )
}

function AlasanItem({ ikon, judul, isi }: { ikon: React.ReactNode; judul: string; isi: string }) {
  return (
    <li className="b-alasan">
      <span className="b-alasan-ikon">{ikon}</span>
      <span>
        <strong>{judul}</strong>
        <span>{isi}</span>
      </span>
    </li>
  )
}

// Kartu produk lapak alumni. Tidak ada tombol keranjang maupun wishlist:
// keranjang dibekukan mode katalog, dan wishlist tidak pernah ada. Satu-satunya
// aksi adalah membuka detailnya, tempat tombol Hubungi Penjual berada.
function KartuProduk({ p }: { p: Produk }) {
  return (
    <Link href={`/produk/${p.id}`} className="prod-card b-produk-kartu">
      <div style={{ position: 'relative' }}>
        <BadgePreorder aktif={p.is_preorder} bentuk="pita" />
        <FotoProduk src={p.foto_url} kategori={p.kategori} height={160} fontSize={44} />
      </div>
      <div style={{ padding: '12px 12px 14px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <span style={{ fontSize: '12px', color: '#617B95', fontWeight: 500 }}>{p.kategori}</span>
        <span className="b-produk-nama">{p.nama}</span>
        <span style={{ fontSize: '16px', fontWeight: 800, color: '#07589F' }}>{fmt(p.harga)}</span>
        {/* Stok produk PO selalu 0 karena trg_kurangi_stok sengaja
            melewatinya — produk PO memakai janji kirim, bukan lencana stok */}
        {p.is_preorder ? (
          p.po_janji_kirim && (
            <span style={{ fontSize: '12px', color: WARNA_PO_TUA, lineHeight: 1.5 }}>{janjiKirim(p.po_janji_kirim)}</span>
          )
        ) : (
          <div><BadgeTersedia tersedia={p.is_tersedia} kecil /></div>
        )}
        {/* Nama · Superfive 92. Tidak ada cabang OFFICIAL di sini: rak ini
            menyaring toko resmi, jadi semua penjualnya alumni perorangan */}
        {p.penjual && (
          <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #EAF4FC' }}>
            <NamaPenjual nama={p.penjual.nama} label={p.penjual.label_angkatan} angkatan={p.penjual.angkatan} institusi={p.penjual.is_institusi} kecil />
          </div>
        )}
      </div>
    </Link>
  )
}
