'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../components/Navbar'
import Skeleton from '../../components/Skeleton'
import SiteFooter from '../../components/beranda/SiteFooter'
import KartuPasar, { type ProdukKartu } from '../../components/KartuPasar'
import AvatarAlumni from '../../components/alumni/AvatarAlumni'
import { IkonEtalase, IkonOrang, IkonPanah } from '../../components/beranda/Ikon'
import { useTampilSkeleton } from '../../hooks/useSkeleton'
import { ambilPenjualPublik } from '../../../lib/penjualPublik'

// Profil alumni — Wave 2 fase 1. HANYA UNTUK YANG LOGIN.
//
// Sumbernya `alumni_publik`, yang hanya di-grant ke `authenticated`. Untuk
// pengunjung anon query-nya gagal, dan halaman ini menampilkan ajakan masuk
// — bukan pesan error, dan bukan data dari jalur lain. Jangan membaca tabel
// `users` untuk profil orang lain: RLS-nya hanya membuka baris sendiri.
//
// Isinya hanya yang memang ada di view: nama, avatar, angkatan, tanggal
// bergabung. Toko tampil kalau penjualnya aktif (penjual_publik). Kontak
// penjual tidak pernah tampil di sini — satu-satunya jalan keluarnya tombol
// Hubungi Penjual di halaman produk (RPC buka_kontak_toko).

type Profil = {
  id: string
  nama: string | null
  angkatan: number
  label_angkatan: string
  avatar_url: string | null
  foto_url: string | null
  created_at: string
}

type Toko = { id: string; nama_toko: string | null; deskripsi: string | null; kategori: string | null }

type Teman = Pick<Profil, 'id' | 'nama' | 'label_angkatan' | 'avatar_url' | 'foto_url'>

const KOLOM_KARTU = 'id, nama, harga, kategori, foto_url, is_tersedia, is_preorder, po_janji_kirim, toko!inner(id, nama_toko, seller_id, is_official)'

function bulanTahun(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
}

export default function ProfilAlumniPage() {
  const { id } = useParams<{ id: string }>()
  // 'gerbang' = belum login; 'tidak-ada' = bukan alumni aktif / tidak ditemukan
  const [keadaan, setKeadaan] = useState<'muat' | 'gerbang' | 'tidak-ada' | 'ada'>('muat')
  const [profil, setProfil] = useState<Profil | null>(null)
  const [diriSendiri, setDiriSendiri] = useState(false)
  const [toko, setToko] = useState<Toko | null>(null)
  const [produk, setProduk] = useState<ProdukKartu[]>([])
  const [teman, setTeman] = useState<Teman[]>([])
  const tampilSkeleton = useTampilSkeleton(keadaan === 'muat')

  useEffect(() => {
    let aktif = true
    async function muat() {
      // Pindah antar-profil (rak teman seangkatan) memakai komponen yang
      // sama — sisa toko/produk profil sebelumnya harus dibuang dulu
      setKeadaan('muat'); setProfil(null); setToko(null); setProduk([]); setTeman([])
      const { data: { session } } = await supabase.auth.getSession()
      if (!aktif) return
      if (!session) { setKeadaan('gerbang'); return }

      // Id yang bukan UUID membuat Postgres menolak query (400) — itu tautan
      // keliru, bukan sesi yang kedaluwarsa
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { setKeadaan('tidak-ada'); return }

      const { data, error } = await supabase
        .from('alumni_publik')
        .select('id, nama, angkatan, label_angkatan, avatar_url, foto_url, created_at')
        .eq('id', id)
        .maybeSingle()
      if (!aktif) return
      // Sesi kedaluwarsa atau grant berubah — tetap ajakan masuk, bukan error
      if (error) { setKeadaan('gerbang'); return }
      // Tidak punya baris = bukan alumni aktif (pembeli biasa, akun institusi,
      // akun nonaktif, atau status alumninya dicabut). Keadaan wajar.
      if (!data) { setKeadaan('tidak-ada'); return }

      const p = data as Profil
      setProfil(p)
      setDiriSendiri(session.user.id === p.id)
      setKeadaan('ada')

      const [penjual, seangkatan] = await Promise.all([
        ambilPenjualPublik([p.id]),
        supabase.from('alumni_publik')
          .select('id, nama, label_angkatan, avatar_url, foto_url')
          .eq('angkatan', p.angkatan).neq('id', p.id)
          .order('nama').limit(12),
      ])
      if (!aktif) return
      setTeman((seangkatan.data ?? []) as Teman[])

      // Toko hanya ditampilkan kalau penjualnya aktif: RLS memperlihatkan
      // toko milik sendiri walau sedang dibekukan, padahal tidak tayang.
      if (!penjual[p.id]) return
      const { data: t } = await supabase
        .from('toko').select('id, nama_toko, deskripsi, kategori')
        .eq('seller_id', p.id).limit(1).maybeSingle()
      if (!aktif || !t) return
      setToko(t as Toko)

      const { data: pr } = await supabase
        .from('produk').select(KOLOM_KARTU)
        .eq('toko_id', t.id)
        .order('created_at', { ascending: false }).limit(10)
      if (!aktif) return
      setProduk(((pr ?? []) as unknown as ProdukKartu[]).map(x => ({
        ...x,
        toko: x.toko ? { ...x.toko, penjual: penjual[p.id] ?? null } : null,
      })))
    }
    muat()
    return () => { aktif = false }
  }, [id])

  const tujuanMasuk = `/auth?redirect=/alumni/${id}&msg=` + encodeURIComponent('Masuk untuk melihat profil alumni')

  return (
    <main className="beranda pasar">
      <Navbar />

      <div className="b-wadah">
        <nav className="d-remah" aria-label="Remah roti">
          <ol>
            <li><Link href="/">Beranda</Link></li>
            <li><Link href="/alumni">Alumni</Link></li>
            <li aria-current="page">{keadaan === 'ada' ? (profil?.nama || 'Alumni') : 'Profil'}</li>
          </ol>
        </nav>

        {tampilSkeleton || keadaan === 'muat' ? (
          <div className="a-profil">
            <Skeleton lebar={104} tinggi={104} radius={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skeleton lebar="45%" tinggi={24} />
              <Skeleton lebar={120} tinggi={24} radius={12} style={{ marginTop: 12 }} />
              <Skeleton lebar="35%" tinggi={13} style={{ marginTop: 12 }} />
            </div>
          </div>
        ) : keadaan === 'gerbang' ? (
          <div className="m-kosong">
            <span className="m-kosong-ikon"><IkonOrang size={26} /></span>
            <h2>Masuk untuk melihat profil alumni</h2>
            <p>Profil alumni hanya terlihat oleh sesama anggota yang sudah masuk.</p>
            <Link href={tujuanMasuk} className="b-tombol m-tombol-biru">Masuk</Link>
          </div>
        ) : keadaan === 'tidak-ada' || !profil ? (
          <div className="m-kosong">
            <span className="m-kosong-ikon"><IkonOrang size={26} /></span>
            <h2>Profil alumni tidak ditemukan.</h2>
            <p>Mungkin tautannya keliru, atau akun ini tidak lagi tercatat di direktori alumni.</p>
            <Link href="/alumni" className="b-tombol m-tombol-biru">Ke Direktori Alumni</Link>
          </div>
        ) : (
          <>
            {/* ── Kepala profil ── */}
            <section className="a-profil" aria-labelledby="nama-alumni">
              <AvatarAlumni nama={profil.nama} foto={profil.avatar_url || profil.foto_url} ukuran={104} />
              <div className="a-profil-teks">
                <h1 id="nama-alumni" className="a-profil-nama">{profil.nama || 'Alumni'}</h1>
                <span className="a-label">{profil.label_angkatan}</span>
                <p className="a-profil-meta">
                  Angkatan {profil.angkatan} · Bergabung di Superfive sejak {bulanTahun(profil.created_at)}
                </p>
              </div>
              {diriSendiri && (
                <Link href="/profil" className="b-tombol a-tombol-garis">Ubah Profil</Link>
              )}
            </section>

            {/* ── Toko ── */}
            {toko && (
              <section className="d-rak" aria-labelledby="judul-toko">
                <div className="a-toko">
                  <span className="a-toko-ikon" aria-hidden><IkonEtalase size={26} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {/* Bukan "Toko <kata pertama nama>": kata pertama sering gelar
                        (Raden, Haji, dr.), dan nama orangnya sudah ada di atas */}
                    <p className="a-toko-eyebrow">Lapak Alumni</p>
                    <h2 id="judul-toko" className="a-toko-nama">{toko.nama_toko || 'Toko alumni'}</h2>
                    {toko.deskripsi && <p className="a-toko-desk">{toko.deskripsi}</p>}
                  </div>
                  <Link href={`/toko/${toko.id}`} className="b-tombol m-tombol-biru a-toko-tombol">
                    Kunjungi Toko <IkonPanah size={16} tebal={2.2} />
                  </Link>
                </div>
                {produk.length > 0 ? (
                  <ul className="m-grid a-rak-produk" role="list">
                    {produk.map(p => <li key={p.id}><KartuPasar p={p} /></li>)}
                  </ul>
                ) : (
                  // Toko tanpa produk tidak dibiarkan sebagai kotak kosong
                  <p className="a-toko-kosong">Belum ada produk yang tayang di toko ini.</p>
                )}
              </section>
            )}

            {/* ── Teman seangkatan ── */}
            {teman.length > 0 && (
              <section className="d-rak" aria-labelledby="judul-teman">
                <div className="b-kepala">
                  <h2 id="judul-teman" className="a-rak-judul">Alumni {profil.label_angkatan} Lainnya</h2>
                  <Link href="/alumni" className="b-tautan">Direktori <IkonPanah size={16} tebal={2.2} /></Link>
                </div>
                <ul className="a-grid" role="list">
                  {teman.map(t => (
                    <li key={t.id}>
                      {/* Kartu yang sama dengan direktori, termasuk avatar 56px */}
                      <Link href={`/alumni/${t.id}`} className="a-kartu" aria-label={`Profil ${t.nama || 'alumni'}, ${t.label_angkatan}`}>
                        <AvatarAlumni nama={t.nama} foto={t.avatar_url || t.foto_url} ukuran={56} />
                        <span className="a-kartu-teks">
                          <span className="a-kartu-nama" title={t.nama ?? undefined}>{t.nama || 'Alumni'}</span>
                          <span className="a-label a-label-kecil">{t.label_angkatan}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <div className="d-ruang-bawah" />
      <SiteFooter />
    </main>
  )
}
