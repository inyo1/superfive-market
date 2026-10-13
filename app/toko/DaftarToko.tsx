'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import KartuToko from '../components/KartuToko'
import Skeleton from '../components/Skeleton'
import SiteFooter from '../components/beranda/SiteFooter'
import { IkonCari, IkonEtalase, IkonTutup } from '../components/beranda/Ikon'
import { useTampilSkeleton } from '../hooks/useSkeleton'
import { KATEGORI, type Kategori } from '../../lib/kategori'
import { ambilDaftarToko, type TokoRingkas } from '../../lib/toko'

// Indeks /toko — semua toko yang terlihat (RLS: penjual aktif).
//
// ETALASE-KLIMAX: toko tanpa produk ikut tampil, tinjau setelah 17 Okt 2026
//
// Cari dan saring di klien atas satu query: jumlah toko kecil, dan kategori
// yang ditawarkan hanya yang benar-benar berisi.
export default function DaftarToko() {
  const [toko, setToko] = useState<TokoRingkas[]>([])
  const [galat, setGalat] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  const [cari, setCari] = useState('')
  const [kategori, setKategori] = useState<Kategori | 'semua'>('semua')

  useEffect(() => {
    let hidup = true
    ambilDaftarToko().then(({ data, galat }) => {
      if (!hidup) return
      setToko(data)
      setGalat(galat)
      setLoading(false)
    })
    return () => { hidup = false }
  }, [])

  // Urutan chip mengikuti KATEGORI, bukan urutan kemunculan
  const kategoriAda = useMemo(
    () => KATEGORI.filter(k => toko.some(t => t.kategori === k)),
    [toko],
  )

  const terlihat = useMemo(() => {
    const kata = cari.trim().toLocaleLowerCase('id-ID')
    return toko.filter(t =>
      (kategori === 'semua' || t.kategori === kategori)
      && (!kata || t.nama_toko.toLocaleLowerCase('id-ID').includes(kata)))
  }, [toko, cari, kategori])

  return (
    <main className="beranda pasar">
      <Navbar />

      <section className="m-hero a-hero" aria-labelledby="judul-toko">
        <div className="m-hero-foto" aria-hidden>
          <Image src="/smpn5-hero.png" alt="" fill priority sizes="(max-width: 1023px) 100vw, 900px" style={{ objectFit: 'cover', objectPosition: 'center 30%' }} />
        </div>
        <div className="m-hero-lapis" aria-hidden />
        <div className="b-wadah m-hero-isi">
          <p className="b-eyebrow">Marketplace Alumni SMPN 5 Bandung</p>
          <h1 id="judul-toko" className="m-hero-judul">Toko Alumni</h1>
          <p className="m-hero-sub">Lapak para alumni SUPERFIVE — SMPN 5 Bandung.</p>

          <p className="a-statistik" aria-live="polite">
            {tampilSkeleton ? 'Memuat…' : <span><strong>{toko.length.toLocaleString('id-ID')}</strong> toko</span>}
          </p>

          {toko.length > 0 && (
            <form role="search" onSubmit={e => e.preventDefault()} className="b-hero-cari m-cari">
              <label htmlFor="cari-toko" className="sr-only">Cari nama toko</label>
              <span className="b-hero-cari-ikon"><IkonCari size={20} /></span>
              <input
                id="cari-toko"
                type="search"
                value={cari}
                onChange={e => setCari(e.target.value)}
                placeholder="Cari nama toko…"
                enterKeyHint="search"
              />
              {cari && (
                <button type="button" className="m-cari-hapus" onClick={() => setCari('')} aria-label="Hapus pencarian">
                  <IkonTutup size={16} tebal={2} />
                </button>
              )}
              <button type="submit">Cari</button>
            </form>
          )}
        </div>
      </section>

      {/* Chip hanya kalau ada lebih dari satu kategori berisi — satu chip
          "Semua" plus satu kategori tidak menyaring apa pun */}
      {kategoriAda.length > 1 && (
        <div className="b-wadah">
          <nav className="m-kategori a-angkatan" aria-label="Saring kategori toko">
            {(['semua', ...kategoriAda] as const).map(k => {
              const aktif = kategori === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKategori(k)}
                  aria-pressed={aktif}
                  className={`m-kategori-item${aktif ? ' aktif' : ''}`}
                >
                  {k === 'semua' ? 'Semua' : k}
                </button>
              )
            })}
          </nav>
        </div>
      )}

      <section className="b-wadah t-isi" aria-label="Daftar toko">
        {tampilSkeleton ? (
          <ul className="t-grid t-grid-penuh" role="list">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i}>
                <div className="t-kartu">
                  <Skeleton lebar={64} tinggi={64} radius={32} />
                  <Skeleton lebar="70%" tinggi={13} style={{ marginTop: 10 }} />
                  <Skeleton lebar="40%" tinggi={16} radius={8} style={{ marginTop: 6 }} />
                </div>
              </li>
            ))}
          </ul>
        ) : toko.length === 0 ? (
          <div className="m-kosong">
            <span className="m-kosong-ikon"><IkonEtalase size={26} /></span>
            <h2>{galat ? 'Daftar toko belum bisa dimuat.' : 'Belum ada toko alumni.'}</h2>
            <p>
              {galat
                ? 'Coba muat ulang halaman ini sebentar lagi.'
                : 'Toko alumni yang sudah disetujui akan muncul di sini. Punya usaha? Buka lapakmu di Superfive.'}
            </p>
            {!galat && <Link href="/jual" className="b-tombol m-tombol-biru">Mulai Berjualan</Link>}
          </div>
        ) : terlihat.length === 0 ? (
          <div className="m-kosong">
            <span className="m-kosong-ikon"><IkonCari size={26} /></span>
            <h2>Tidak ada toko yang cocok.</h2>
            <p>Coba kata lain, atau lihat semua kategori.</p>
            <button type="button" className="b-tombol m-tombol-biru" onClick={() => { setCari(''); setKategori('semua') }}>
              Tampilkan Semua Toko
            </button>
          </div>
        ) : (
          <>
            {(cari || kategori !== 'semua') && (
              <p className="m-jumlah t-cari-kosong" aria-live="polite">
                <strong>{terlihat.length.toLocaleString('id-ID')}</strong> toko ditemukan
              </p>
            )}
            <ul className="t-grid t-grid-penuh" role="list">
              {terlihat.map(t => <li key={t.id}><KartuToko t={t} /></li>)}
            </ul>
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  )
}
