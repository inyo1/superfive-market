'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { urlBukti } from '../../../lib/buktiAlumni'
import Navbar from '../../components/Navbar'
import Skeleton, { SkeletonPanel } from '../../components/Skeleton'
import { useTampilSkeleton } from '../../hooks/useSkeleton'
import { bolehVerifikasiAlumni, adminPenuh, type Peran } from '../../../lib/peran'
import { tanggalPeristiwa } from '../../../lib/format'

// ALUMNI TERBARU — pemeriksaan SESUDAH daftar.
//
// Sejak peluncuran reuni tidak ada lagi antrean persetujuan: ajukan_alumni()
// langsung memberi status 'alumni'. Satu-satunya penegakan yang tersisa
// adalah pengurus membaca siapa yang baru bergabung dan mencabut yang
// janggal. Halaman ini alat utamanya — rutenya tetap /admin/verifikasi
// supaya tautan lama tidak patah.
//
// Sumber datanya tetap antrean_alumni('alumni'), untuk SEMUA peran. Tabel
// `users` tidak disentuh dari sini: penyaringan angkatan untuk admin
// angkatan, pengecualian akun nonaktif, dan kolom bukti yang disembunyikan
// dari admin angkatan semuanya di dalam fungsi itu.
//
// Pengecualian satu: URUTANNYA diurutkan ulang di sini. antrean_alumni
// mengurutkan "paling lama menunggu di atas" untuk antrean yang sudah tidak
// ada; yang dibutuhkan halaman ini justru yang paling baru jadi alumni.
//
// Label "Superfive 92" dibaca dari alumni_publik (terbaca oleh yang login),
// bukan dirangkai dari tahun.

type Alumni = {
  id: string
  nama: string | null
  email: string | null
  angkatan: number | null
  avatar_url: string | null
  is_institusi: boolean | null
  // NULL untuk admin angkatan — disaring di dalam antrean_alumni, bukan di
  // sini. Jangan menambah pemeriksaan peran di klien untuk kolom ini.
  bukti_alumni_url: string | null
  created_at: string
  diverifikasi_at: string | null
}

function Avatar({ nama, url, size = 48 }: { nama: string | null; url: string | null; size?: number }) {
  const initials = nama
    ? nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      overflow: 'hidden', background: 'linear-gradient(135deg, #185FA5, #0C447C)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {url ? (
        <Image src={url} alt={nama ?? ''} width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: `${Math.round(size * 0.38)}px`, fontWeight: '700', color: '#fff', lineHeight: 1 }}>
          {initials}
        </span>
      )}
    </div>
  )
}

function waktu(t: string | null) {
  return t ? new Date(t).getTime() : 0
}

export default function AlumniTerbaruPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const tampilSkeleton = useTampilSkeleton(!ready)
  const [daftar, setDaftar] = useState<Alumni[]>([])
  const [labelById, setLabelById] = useState<Record<string, string>>({})
  const [cari, setCari] = useState('')
  const [pesan, setPesan] = useState<{ text: string; ok: boolean } | null>(null)
  const [prosesId, setProsesId] = useState<string | null>(null)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [peranSaya, setPeranSaya] = useState<Peran | null>(null)
  const [angkatanSaya, setAngkatanSaya] = useState<number | null>(null)

  const [formId, setFormId] = useState<string | null>(null)
  const [alasan, setAlasan] = useState('')

  // Lightbox bukti — hanya untuk data lama, unggahnya sedang dimatikan
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null)
  const [memuatBukti, setMemuatBukti] = useState<string | null>(null)

  function tampilkanPesan(text: string, ok: boolean) {
    setPesan({ text, ok })
    setTimeout(() => setPesan(null), 4000)
  }

  async function muat() {
    const { data, error } = await supabase.rpc('antrean_alumni', { p_status: 'alumni' })
    if (error) {
      tampilkanPesan('Gagal memuat daftar alumni: ' + error.message, false)
      return
    }

    // Terbaru jadi alumni di atas. diverifikasi_at diisi ajukan_alumni saat
    // orangnya mendaftar sendiri, dan oleh verifikasi_alumni untuk data lama.
    const baris = ((data ?? []) as Alumni[]).sort((a, b) =>
      waktu(b.diverifikasi_at ?? b.created_at) - waktu(a.diverifikasi_at ?? a.created_at))
    setDaftar(baris)

    const ids = baris.map(a => a.id)
    if (ids.length > 0) {
      const { data: publik } = await supabase
        .from('alumni_publik').select('id, label_angkatan').in('id', ids)
      setLabelById(Object.fromEntries((publik ?? []).map(p => [p.id, p.label_angkatan])))
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth?redirect=/admin/verifikasi'); return }

      const { data: profile } = await supabase
        .from('users').select('role, angkatan').eq('id', user.id).single()

      // Admin angkatan ikut boleh masuk — batas angkatannya ditegakkan
      // antrean_alumni dan verifikasi_alumni di server
      if (!bolehVerifikasiAlumni(profile?.role)) { router.replace('/'); return }
      setAdminId(user.id)
      setPeranSaya((profile?.role ?? null) as Peran | null)
      setAngkatanSaya(profile?.angkatan ?? null)

      await muat()
      setReady(true)
    }
    init()
  }, [])

  // Mencabut = verifikasi_alumni(id, false, alasan). Statusnya jadi
  // 'ditolak' dan alasannya tampil ke yang bersangkutan di /verifikasi.
  // Semua batasnya di RPC: bukan akun sendiri, bukan sesama pengurus, admin
  // angkatan hanya untuk angkatannya. error.message ditampilkan apa adanya.
  async function cabut(id: string) {
    const teks = alasan.trim()
    if (!teks) { tampilkanPesan('Alasan pencabutan wajib diisi', false); return }

    setProsesId(id)
    try {
      const { data, error } = await supabase.rpc('verifikasi_alumni', {
        p_user_id: id,
        p_setujui: false,
        p_alasan: teks,
      })
      if (error) throw new Error(error.message)

      const hasil = data as { nama: string | null } | null
      await muat()
      tampilkanPesan(`Status alumni ${hasil?.nama ?? 'pengguna ini'} dicabut.`, true)
      setFormId(null)
      setAlasan('')
    } catch (e) {
      tampilkanPesan('Gagal: ' + (e instanceof Error ? e.message : 'coba lagi'), false)
    } finally {
      setProsesId(null)
    }
  }

  async function bukaBukti(a: Alumni) {
    setMemuatBukti(a.id)
    const url = await urlBukti(a.bukti_alumni_url)
    setMemuatBukti(null)
    if (!url) { tampilkanPesan('Bukti tidak bisa dibuka. File mungkin sudah dihapus.', false); return }
    setBuktiUrl(url)
  }

  const q = cari.trim().toLowerCase()
  const terlihat = q
    ? daftar.filter(a =>
        (a.nama ?? '').toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q) ||
        (labelById[a.id] ?? '').toLowerCase().includes(q) ||
        String(a.angkatan ?? '').includes(q))
    : daftar

  if (tampilSkeleton) return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>
        <Skeleton tinggi={18} lebar="45%" style={{ marginBottom: '6px' }} />
        <Skeleton tinggi={11} lebar="70%" style={{ marginBottom: '18px' }} />
        <Skeleton tinggi={40} radius={8} style={{ marginBottom: '14px' }} />
        <SkeletonPanel baris={2} />
        <SkeletonPanel baris={2} />
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      {buktiUrl && (
        <div
          onClick={() => setBuktiUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', cursor: 'zoom-out' }}
        >
          <img src={buktiUrl} alt="Bukti alumni" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          <button
            onClick={() => setBuktiUrl(null)}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer' }}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Alumni Terbaru</h1>
          {adminPenuh(peranSaya) && (
            <Link href="/admin" style={{ fontSize: '12px', color: '#0C447C', textDecoration: 'none' }}>← Panel Admin</Link>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '16px', lineHeight: 1.7 }}>
          Pendaftaran alumni langsung aktif tanpa persetujuan. Periksa yang baru
          bergabung — kalau nama atau angkatannya janggal, cabut status alumninya.
          Untuk izin berjualan, lihat <Link href="/admin/penjual" style={{ color: '#0C447C' }}>Pengajuan Penjual</Link>.
        </div>

        {/* Batas kuasanya disebut terang-terangan, supaya admin angkatan tidak
            mengira daftarnya sedang bermasalah saat isinya sedikit */}
        {!adminPenuh(peranSaya) && (
          <div style={{ background: '#E6F1FB', border: '0.5px solid #b3d1ee', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#0C447C', marginBottom: '12px', lineHeight: '1.7' }}>
            Kamu <strong>admin angkatan {angkatanSaya ?? '—'}</strong>. Yang tampil dan
            bisa kamu cabut hanya alumni angkatan yang sama.
          </div>
        )}

        {pesan && (
          <div style={{ background: pesan.ok ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesan.ok ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesan.ok ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
            {pesan.text}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <input
            value={cari}
            onChange={e => setCari(e.target.value)}
            placeholder="Cari nama, email, atau angkatan…"
            aria-label="Cari alumni"
            style={{ flex: 1, padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff', minHeight: '44px', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: '12px', color: '#5a7da0', whiteSpace: 'nowrap' }}>
            {daftar.length} alumni
          </div>
        </div>

        {terlihat.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 20px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
            <div style={{ fontSize: '13px', color: '#5a7da0' }}>
              {q ? 'Tidak ada alumni yang cocok dengan pencarianmu' : 'Belum ada alumni terdaftar'}
            </div>
          </div>
        ) : terlihat.map(a => {
          const sedangProses = prosesId === a.id
          const label = labelById[a.id] ?? null
          return (
            <div key={a.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #c5d9ef', marginBottom: '10px', overflow: 'hidden' }}>

              <div style={{ padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Avatar nama={a.nama} url={a.avatar_url} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.nama || 'Tanpa nama'}
                    {/* Label NULL (akun institusi, atau angkatan kosong di
                        data lama) = nama saja, tanpa pemisah */}
                    {label && (
                      <span style={{ fontWeight: '600', color: '#0C447C' }}> · {label}</span>
                    )}
                  </div>
                  {a.is_institusi && (
                    <div style={{ marginTop: '2px' }}>
                      <span style={{
                        display: 'inline-block',
                        background: 'rgba(239,159,39,0.16)',
                        border: '0.5px solid #EF9F27',
                        color: '#8a5a05',
                        fontSize: '10px', fontWeight: '700', letterSpacing: '0.3px',
                        padding: '2px 8px', borderRadius: '20px', lineHeight: 1.5,
                      }}>
                        🏛️ Akun Institusi
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#5a7da0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                    {a.email ?? '-'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '2px' }}>
                    Daftar {tanggalPeristiwa(a.created_at)}
                    {a.diverifikasi_at && ` · jadi alumni ${tanggalPeristiwa(a.diverifikasi_at)}`}
                  </div>
                </div>
              </div>

              {/* Tombolnya muncul semata-mata karena kolomnya terisi. Untuk
                  admin angkatan antrean_alumni mengembalikan NULL — JANGAN
                  menambahkan pemeriksaan peran di sini. */}
              {a.bukti_alumni_url && (
                <div style={{ margin: '0 14px 12px' }}>
                  <button
                    onClick={() => bukaBukti(a)}
                    disabled={memuatBukti === a.id}
                    style={{ width: '100%', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #c5d9ef', padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                  >
                    {memuatBukti === a.id ? 'Membuka...' : '🖼️ Lihat Bukti Alumni'}
                  </button>
                </div>
              )}

              <div style={{ padding: '0 14px 14px' }}>
                {formId === a.id ? (
                  <div style={{ background: '#fdf3f3', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor={`alasan-${a.id}`} style={{ fontSize: '12px', fontWeight: '600', color: '#c62828' }}>
                      Alasan pencabutan
                    </label>
                    <textarea
                      id={`alasan-${a.id}`}
                      value={alasan}
                      onChange={e => setAlasan(e.target.value)}
                      rows={3}
                      placeholder="Misal: tidak dikenali teman seangkatan Superfive 92"
                      style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #f09595', borderRadius: '6px', fontSize: '12px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif', background: '#fff' }}
                    />
                    <div style={{ fontSize: '11px', color: '#8d4040', lineHeight: 1.6 }}>
                      Alasan ini ditampilkan ke yang bersangkutan. Ia keluar dari
                      direktori alumni dan tidak bisa berjualan.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setFormId(null); setAlasan('') }}
                        style={{ flex: 1, background: '#fff', color: '#5a7da0', border: '0.5px solid #c5d9ef', padding: '9px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', minHeight: '40px' }}
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => cabut(a.id)}
                        disabled={sedangProses}
                        style={{
                          flex: 2, color: '#fff', border: 'none', padding: '9px', borderRadius: '6px',
                          fontSize: '12px', fontWeight: '600', minHeight: '40px',
                          background: sedangProses ? '#e39c9c' : '#c62828',
                          cursor: sedangProses ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {sedangProses ? 'Mencabut...' : 'Cabut Status Alumni'}
                      </button>
                    </div>
                  </div>
                ) : a.id === adminId ? (
                  /* RPC-nya menolak aksi ke akun sendiri */
                  <div style={{ fontSize: '12px', color: '#9ab4cc', textAlign: 'center', padding: '6px' }}>
                    Ini akunmu sendiri.
                  </div>
                ) : (
                  <button
                    onClick={() => { setFormId(a.id); setAlasan('') }}
                    disabled={sedangProses}
                    style={{ width: '100%', background: '#fce4e4', color: '#c62828', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', minHeight: '44px' }}
                  >
                    Cabut status alumni
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
