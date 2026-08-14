'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import Skeleton, { SkeletonPanel } from '../components/Skeleton'
import Tombol from '../components/Tombol'
import { useTampilSkeleton } from '../hooks/useSkeleton'

// UNGGAH BUKTI ALUMNI DIMATIKAN SEMENTARA — keputusan produk, bukan kode mati.
//
// Kolom users.bukti_alumni_url, bucket privat `bukti-alumni`, dan helper
// lib/buktiAlumni.ts sengaja DIPERTAHANKAN utuh supaya fitur ini bisa
// dinyalakan lagi tanpa migrasi. `uploadBuktiAlumni` untuk sementara tidak
// dipanggil dari mana pun — JANGAN dihapus karena terlihat tak terpakai.
// `urlBukti` masih dipakai panel admin untuk membuka bukti dari data lama.
//
// Selama dimatikan, verifikasi bersandar pada penilaian admin atas nama dan
// angkatan pendaftar, dibantu catatan yang ditulis pendaftar di bawah ini.

export default function VerifikasiPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [alasanTolak, setAlasanTolak] = useState<string | null>(null)
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  const [mengirim, setMengirim] = useState(false)
  const [pesan, setPesan] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    async function muat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth?redirect=/verifikasi&msg=Login+dulu+untuk+mengajukan+verifikasi')
        return
      }
      setUserId(user.id)

      const { data } = await supabase
        .from('users')
        .select('status_verifikasi, catatan_pendaftar, alasan_tolak')
        .eq('id', user.id)
        .single()

      if (data) {
        setStatus(data.status_verifikasi ?? 'menunggu')
        setCatatan(data.catatan_pendaftar ?? '')
        setAlasanTolak(data.alasan_tolak ?? null)
      }
      setLoading(false)
    }
    muat()
  }, [])

  async function kirim() {
    if (!userId) return

    setMengirim(true)
    try {
      // Kolom status_verifikasi sengaja tidak disentuh — trigger
      // jaga_field_sensitif memang melarang user mengubahnya sendiri.
      const { error } = await supabase
        .from('users')
        .update({ catatan_pendaftar: catatan.trim() || null })
        .eq('id', userId)
      if (error) throw new Error(error.message)

      setPesan({
        text: 'Pengajuan terkirim. Admin akan memeriksa datamu, biasanya dalam 1–2 hari.',
        ok: true,
      })
    } catch (e) {
      setPesan({ text: e instanceof Error ? e.message : 'Gagal mengirim. Coba lagi.', ok: false })
    } finally {
      setMengirim(false)
    }
  }

  if (tampilSkeleton) return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>
        <Skeleton tinggi={18} lebar="45%" style={{ marginBottom: '6px' }} />
        <Skeleton tinggi={11} lebar="60%" style={{ marginBottom: '18px' }} />
        <SkeletonPanel baris={1} />
        <SkeletonPanel baris={2} />
      </div>
    </main>
  )

  // Sudah terverifikasi — tidak ada yang perlu dikerjakan di sini
  if (status === 'terverifikasi') return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '520px', margin: '32px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '32px 20px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>🎓</div>
          <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>
            Kamu sudah terverifikasi
          </h2>
          <p style={{ fontSize: '13px', color: '#5a7da0', margin: '0 0 20px' }}>
            Akunmu sudah diakui sebagai alumni SMPN 5 Bandung. Kamu bisa membuka toko dan mulai berjualan.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/produk" style={{ flex: 1, background: '#fff', color: '#0C447C', border: '1px solid #0C447C', padding: '11px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
              Belanja
            </Link>
            <Link href="/produk/tambah" style={{ flex: 1, background: '#0C447C', color: '#fff', padding: '11px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
              Mulai Jualan
            </Link>
          </div>
        </div>
      </div>
    </main>
  )

  const ditolak = status === 'ditolak'

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>
          Verifikasi Alumni
        </h1>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '16px' }}>
          Satu langkah supaya kamu bisa membuka toko
        </div>

        {/* Alasan penolakan */}
        {ditolak && alasanTolak && (
          <div style={{ background: '#fce4e4', border: '0.5px solid #f09595', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#c62828', marginBottom: '4px' }}>
              ❌ Pengajuan sebelumnya ditolak
            </div>
            <div style={{ fontSize: '12px', color: '#c62828', marginBottom: '6px' }}>{alasanTolak}</div>
            <div style={{ fontSize: '12px', color: '#8d4040' }}>
              Perbaiki sesuai catatan di atas, lalu kirim ulang.
            </div>
          </div>
        )}

        {/* Penjelasan */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '8px' }}>
            Kenapa perlu verifikasi?
          </div>
          <div style={{ fontSize: '12px', color: '#5a7da0', lineHeight: '1.7' }}>
            Superfive Market khusus untuk alumni SMPN 5 Bandung. Verifikasi memastikan
            setiap penjual benar-benar alumni, supaya pembeli merasa aman bertransaksi.
            <br /><br />
            Admin memeriksa <strong style={{ color: '#1a1a1a' }}>nama dan angkatan</strong> di
            profilmu. Pastikan keduanya sudah terisi dan sesuai dengan nama saat sekolah dulu.
            <br /><br />
            <strong style={{ color: '#1a1a1a' }}>Selama menunggu, kamu tetap bisa belanja seperti biasa</strong> —
            yang dibatasi hanya membuka toko dan berjualan.
          </div>
          <Link href="/profil" style={{ display: 'inline-block', marginTop: '10px', fontSize: '12px', color: '#0C447C', textDecoration: 'none' }}>
            Periksa nama & angkatan di profil →
          </Link>
        </div>

        {/* Form */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>
            Catatan untuk Admin
          </div>
          <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '8px' }}>
            Tulis hal yang membantu admin mengenalimu — nama wali kelas, kelas terakhir,
            nomor absen, atau teman seangkatan yang bisa dikonfirmasi.
          </div>
          <textarea
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            rows={4}
            placeholder="Misal: angkatan 2015, kelas 9C, wali kelas Bu Rina"
            style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' }}
          />
        </div>

        {pesan && (
          <div style={{ background: pesan.ok ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesan.ok ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesan.ok ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
            {pesan.text}
          </div>
        )}

        <Tombol
          onClick={kirim}
          loading={mengirim}
          teksLoading="Mengirim..."
          penuh
          style={{ padding: '15px', fontSize: '14px', borderRadius: '10px', marginBottom: '10px' }}
        >
          {ditolak ? 'Kirim Ulang Pengajuan' : 'Kirim Pengajuan'}
        </Tombol>

        {status === 'menunggu' && (
          <div style={{ background: '#fff8e1', border: '0.5px solid #ffe082', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#f57f17', textAlign: 'center', marginBottom: '10px' }}>
            ⏳ Pengajuanmu sedang ditinjau admin
          </div>
        )}

        <Link href="/" style={{ display: 'block', textAlign: 'center', color: '#5a7da0', fontSize: '13px', textDecoration: 'none', paddingBottom: '24px' }}>
          ← Kembali ke Beranda
        </Link>
      </div>
    </main>
  )
}
