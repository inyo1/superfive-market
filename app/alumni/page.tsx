'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import Skeleton from '../components/Skeleton'
import SiteFooter from '../components/beranda/SiteFooter'
import AvatarAlumni from '../components/alumni/AvatarAlumni'
import { IkonCari, IkonEtalase, IkonOrang, IkonPanah, IkonTutup } from '../components/beranda/Ikon'
import { useTampilSkeleton } from '../hooks/useSkeleton'

// Direktori alumni — redesain Wave 2 fase 1. DUA TINGKAT, sama seperti
// sebelumnya; yang berubah tampilannya.
//
// Belum login → `angkatan_ringkas`: jumlah alumni per angkatan, TANPA nama.
// Sudah login → `alumni_publik`: nama, avatar, dan angkatan.
//
// Bukan pilihan tampilan, melainkan grant di database: `alumni_publik` hanya
// di-grant ke `authenticated`. Query anon ke sana GAGAL (permission denied),
// dan kegagalan itu harus berujung ke tampilan ringkas, bukan pesan error.
//
// Yang ditampilkan hanya data yang memang ada di view: nama, avatar, label
// angkatan ("Superfive 92", dari kolom `label_angkatan` — tidak dirangkai di
// sini), dan toko kalau penjualnya aktif. Kota, kontak, profesi, dan
// sejenisnya tidak ada di view publik mana pun, jadi memang tidak tampil.

type Alumni = {
  id: string
  nama: string | null
  angkatan: number
  label_angkatan: string
  avatar_url: string | null
  foto_url: string | null
  jumlahProduk: number | null   // null = tidak punya toko aktif
}

type Kelompok = { angkatan: number; label: string; anggota: Alumni[] }

/** Satu baris dari view angkatan_ringkas */
type Ringkas = { angkatan: number; label_angkatan: string; jumlah: number }

const TUJUAN_DAFTAR = '/auth?mode=daftar&redirect=/alumni&msg=' +
  encodeURIComponent('Daftar atau masuk untuk melihat nama teman seangkatanmu')
const TUJUAN_MASUK = '/auth?redirect=/alumni&msg=' +
  encodeURIComponent('Masuk untuk melihat nama teman seangkatanmu')

export default function AlumniPage() {
  // null = belum tahu; 'ringkas' = belum login (atau nama gagal dimuat)
  const [mode, setMode] = useState<'ringkas' | 'lengkap' | null>(null)
  const [alumni, setAlumni] = useState<Alumni[]>([])
  const [ringkas, setRingkas] = useState<Ringkas[]>([])
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  const [search, setSearch] = useState('')
  const [filterAngkatan, setFilterAngkatan] = useState<number | 'semua'>('semua')

  useEffect(() => {
    async function muatRingkas() {
      const { data } = await supabase
        .from('angkatan_ringkas')
        .select('angkatan, label_angkatan, jumlah')
        .order('angkatan', { ascending: false })
      setRingkas((data ?? []) as Ringkas[])
      setMode('ringkas')
    }

    async function muat() {
      try {
        // getSession: cukup untuk memilih tingkat, tanpa panggilan jaringan.
        // Pengunjung anon langsung ke ringkasan — query nama pasti ditolak.
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { await muatRingkas(); return }

        // JANGAN menyaring lagi di sini. View-nya sudah menyaring sendiri:
        // status_alumni = 'alumni', angkatan terisi, akun nonaktif dan akun
        // institusi dikecualikan.
        const { data, error } = await supabase
          .from('alumni_publik')
          .select('id, nama, angkatan, label_angkatan, avatar_url, foto_url')
        // Sesi kedaluwarsa atau grant berubah — jatuh ke ringkasan, bukan error
        if (error) { await muatRingkas(); return }

        const baris = (data ?? []) as Omit<Alumni, 'jumlahProduk'>[]
        const ids = baris.map(a => a.id)

        // Toko hanya dihitung kalau penjualnya aktif (penjual_publik) — RLS
        // memperlihatkan toko milik sendiri walau sedang dibekukan, dan toko
        // itu tidak tayang untuk orang lain.
        const jumlah: Record<string, number> = {}
        if (ids.length > 0) {
          const { data: aktif } = await supabase.from('penjual_publik').select('id').in('id', ids)
          const aktifIds = (aktif ?? []).map(p => p.id as string)
          if (aktifIds.length > 0) {
            const { data: toko } = await supabase.from('toko').select('id, seller_id').in('seller_id', aktifIds)
            const tokoKe: Record<string, string> = {}
            for (const t of toko ?? []) { tokoKe[t.id] = t.seller_id; jumlah[t.seller_id] = 0 }
            const tokoIds = Object.keys(tokoKe)
            if (tokoIds.length > 0) {
              const { data: produk } = await supabase.from('produk').select('toko_id').in('toko_id', tokoIds)
              for (const p of produk ?? []) {
                const sid = tokoKe[p.toko_id]
                if (sid) jumlah[sid] = (jumlah[sid] ?? 0) + 1
              }
            }
          }
        }

        setAlumni(baris.map(a => ({ ...a, jumlahProduk: a.id in jumlah ? jumlah[a.id] : null })))
        setMode('lengkap')
      } finally {
        setLoading(false)
      }
    }
    muat()
  }, [])

  const kata = search.trim().toLowerCase()

  // Semua angkatan yang ada, terbaru dulu — untuk tombol saring
  const daftarAngkatan = useMemo(() => {
    const peta = new Map<number, string>()
    for (const a of alumni) peta.set(a.angkatan, a.label_angkatan)
    return [...peta.entries()].sort((x, y) => y[0] - x[0])
  }, [alumni])

  const kelompok: Kelompok[] = useMemo(() => {
    const cocok = alumni.filter(a => {
      if (filterAngkatan !== 'semua' && a.angkatan !== filterAngkatan) return false
      if (!kata) return true
      // Cocok dengan nama, tahun ("1992"), maupun label ("superfive 92")
      return (a.nama ?? '').toLowerCase().includes(kata) ||
        String(a.angkatan).includes(kata) ||
        a.label_angkatan.toLowerCase().includes(kata)
    })
    const peta = new Map<number, Kelompok>()
    for (const a of cocok) {
      if (!peta.has(a.angkatan)) peta.set(a.angkatan, { angkatan: a.angkatan, label: a.label_angkatan, anggota: [] })
      peta.get(a.angkatan)!.anggota.push(a)
    }
    return [...peta.values()]
      .sort((x, y) => y.angkatan - x.angkatan)
      .map(k => ({ ...k, anggota: k.anggota.sort((x, y) => (x.nama ?? '').localeCompare(y.nama ?? '', 'id')) }))
  }, [alumni, kata, filterAngkatan])

  const jumlahTampil = kelompok.reduce((n, k) => n + k.anggota.length, 0)
  const lengkap = mode === 'lengkap'
  const totalAlumni = lengkap ? alumni.length : ringkas.reduce((n, r) => n + (r.jumlah ?? 0), 0)
  const totalAngkatan = lengkap ? daftarAngkatan.length : ringkas.length

  function handleCari(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    ;(e.currentTarget.querySelector('input') as HTMLInputElement | null)?.blur()
  }

  function resetSemua() { setSearch(''); setFilterAngkatan('semua') }

  return (
    <main className="beranda pasar">
      <Navbar />

      {/* ── Hero ringkas ── */}
      <section className="m-hero a-hero" aria-labelledby="judul-alumni">
        <div className="m-hero-foto" aria-hidden>
          <Image src="/smpn5-hero.png" alt="" fill priority sizes="(max-width: 1023px) 100vw, 900px" style={{ objectFit: 'cover', objectPosition: 'center 30%' }} />
        </div>
        <div className="m-hero-lapis" aria-hidden />
        <div className="b-wadah m-hero-isi">
          <p className="b-eyebrow">Komunitas Alumni SMPN 5 Bandung</p>
          <h1 id="judul-alumni" className="m-hero-judul">Direktori Alumni</h1>
          <p className="m-hero-sub">
            Temukan teman seangkatan dan alumni lintas angkatan Superfive — dan lapak yang mereka buka.
          </p>

          <p className="a-statistik" aria-live="polite">
            {tampilSkeleton ? 'Memuat…' : (
              <>
                <span><strong>{totalAlumni.toLocaleString('id-ID')}</strong> alumni</span>
                <span aria-hidden>·</span>
                <span><strong>{totalAngkatan.toLocaleString('id-ID')}</strong> angkatan</span>
              </>
            )}
          </p>

          {/* Pencarian nama hanya bermakna kalau namanya terlihat */}
          {lengkap && (
            <form role="search" onSubmit={handleCari} className="b-hero-cari m-cari">
              <label htmlFor="cari-alumni" className="sr-only">Cari nama atau angkatan</label>
              <span className="b-hero-cari-ikon"><IkonCari size={20} /></span>
              <input
                id="cari-alumni"
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama, angkatan, atau Superfive 92…"
                enterKeyHint="search"
              />
              {search && (
                <button type="button" className="m-cari-hapus" onClick={() => setSearch('')} aria-label="Hapus pencarian">
                  <IkonTutup size={16} tebal={2} />
                </button>
              )}
              <button type="submit">Cari</button>
            </form>
          )}
          {mode === 'ringkas' && (
            <div className="a-hero-aksi">
              <Link href={TUJUAN_DAFTAR} className="b-tombol b-tombol-emas">Daftar Gratis</Link>
              <Link href={TUJUAN_MASUK} className="b-tombol b-tombol-garis">Masuk</Link>
            </div>
          )}
        </div>
      </section>

      {tampilSkeleton ? (
        <div className="b-wadah a-isi">
          <div className="a-grid">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="a-kartu a-kartu-kerangka">
                <Skeleton lebar={56} tinggi={56} radius={28} />
                <Skeleton lebar="70%" tinggi={13} style={{ marginTop: 12 }} />
                <Skeleton lebar="50%" tinggi={18} radius={10} style={{ marginTop: 8 }} />
              </div>
            ))}
          </div>
        </div>
      ) : mode === 'ringkas' ? (
        <TampilanRingkas ringkas={ringkas} />
      ) : (
        <>
          {/* ── Saring angkatan ── */}
          {daftarAngkatan.length > 0 && (
            <div className="b-wadah">
              <nav className="m-kategori a-angkatan" aria-label="Saring angkatan">
                {[['semua', 'Semua Angkatan'] as const, ...daftarAngkatan].map(([kunci, teks]) => {
                  const aktif = filterAngkatan === kunci
                  return (
                    <button
                      key={String(kunci)}
                      type="button"
                      onClick={() => setFilterAngkatan(kunci)}
                      aria-pressed={aktif}
                      className={`m-kategori-item${aktif ? ' aktif' : ''}`}
                    >
                      {teks}
                    </button>
                  )
                })}
              </nav>
            </div>
          )}

          <section className="b-wadah a-isi" aria-label="Daftar alumni">
            <p className="m-jumlah a-jumlah" aria-live="polite">
              <strong>{jumlahTampil.toLocaleString('id-ID')}</strong> alumni ditemukan
            </p>

            {kelompok.length === 0 ? (
              <div className="m-kosong">
                <span className="m-kosong-ikon"><IkonOrang size={26} /></span>
                <h2>{alumni.length === 0 ? 'Belum ada alumni terdaftar.' : 'Alumni tidak ditemukan.'}</h2>
                <p>
                  {alumni.length === 0
                    ? 'Jadilah yang pertama dari angkatanmu.'
                    : kata
                      ? `Belum ada alumni yang cocok dengan "${search.trim()}". Coba nama lain atau tahun angkatannya.`
                      : 'Coba pilih angkatan lain.'}
                </p>
                {alumni.length > 0 && (
                  <button type="button" className="b-tombol m-tombol-biru" onClick={resetSemua}>Tampilkan Semua</button>
                )}
              </div>
            ) : (
              kelompok.map(k => (
                <section key={k.angkatan} className="a-kelompok" aria-labelledby={`angkatan-${k.angkatan}`}>
                  <div className="a-kelompok-kepala">
                    <h2 id={`angkatan-${k.angkatan}`} className="a-label">{k.label}</h2>
                    <span className="a-kelompok-info">{k.angkatan} · {k.anggota.length} alumni</span>
                    <span className="a-garis" aria-hidden />
                  </div>
                  <ul className="a-grid" role="list">
                    {k.anggota.map(a => <li key={a.id}><KartuAlumni a={a} /></li>)}
                  </ul>
                </section>
              ))
            )}
          </section>
        </>
      )}

      <div className="d-ruang-bawah" />
      <SiteFooter />
    </main>
  )
}

function KartuAlumni({ a }: { a: Alumni }) {
  return (
    <Link href={`/alumni/${a.id}`} className="a-kartu">
      <AvatarAlumni nama={a.nama} foto={a.avatar_url || a.foto_url} ukuran={56} />
      {/* Nama panjang dipotong dua baris; nama lengkapnya tetap terbaca lewat title */}
      <span className="a-kartu-nama" title={a.nama ?? undefined}>{a.nama || 'Alumni'}</span>
      <span className="a-label a-label-kecil">{a.label_angkatan}</span>
      {a.jumlahProduk !== null && (
        <span className="a-kartu-toko">
          <IkonEtalase size={14} tebal={2} /> Punya toko · {a.jumlahProduk} produk
        </span>
      )}
      <span className="a-kartu-aksi">Lihat Profil <IkonPanah size={14} tebal={2.2} /></span>
    </Link>
  )
}

// Tingkat pertama: berapa alumni di tiap angkatan, tanpa satu nama pun.
function TampilanRingkas({ ringkas }: { ringkas: Ringkas[] }) {
  return (
    <section className="b-wadah a-isi" aria-label="Alumni per angkatan">
      <div className="a-ajakan">
        <span className="m-kosong-ikon a-ajakan-ikon"><IkonOrang size={24} /></span>
        <div style={{ minWidth: 0 }}>
          <h2>Cari teman seangkatanmu</h2>
          <p>
            Nama alumni hanya terlihat oleh yang sudah masuk. Daftar gratis,
            lalu lihat siapa saja yang sudah bergabung dari angkatanmu.
          </p>
        </div>
        <Link href={TUJUAN_DAFTAR} className="b-tombol m-tombol-biru">Daftar Sekarang</Link>
      </div>

      {ringkas.length === 0 ? (
        <div className="m-kosong">
          <span className="m-kosong-ikon"><IkonOrang size={26} /></span>
          <h2>Belum ada alumni terdaftar.</h2>
          <p>Jadilah yang pertama dari angkatanmu.</p>
        </div>
      ) : (
        <ul className="a-grid a-grid-ringkas" role="list">
          {ringkas.map(r => (
            <li key={r.angkatan}>
              <div className="a-kartu a-kartu-ringkas">
                <span className="a-label">{r.label_angkatan}</span>
                <span className="a-ringkas-tahun">Angkatan {r.angkatan}</span>
                <span className="a-ringkas-jumlah"><strong>{r.jumlah.toLocaleString('id-ID')}</strong> alumni</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
