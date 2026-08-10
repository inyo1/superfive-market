'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { uploadBuktiAlumni } from '../../lib/buktiAlumni'
import Navbar from '../components/Navbar'

const MAX_UKURAN = 5 * 1024 * 1024 // 5 MB

export default function VerifikasiPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [alasanTolak, setAlasanTolak] = useState<string | null>(null)
  const [sudahAdaBukti, setSudahAdaBukti] = useState(false)
  const [catatan, setCatatan] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mengirim, setMengirim] = useState(false)
  const [pesan, setPesan] = useState<{ text: string; ok: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
        .select('status_verifikasi, catatan_pendaftar, alasan_tolak, bukti_alumni_url')
        .eq('id', user.id)
        .single()

      if (data) {
        setStatus(data.status_verifikasi ?? 'menunggu')
        setCatatan(data.catatan_pendaftar ?? '')
        setAlasanTolak(data.alasan_tolak ?? null)
        setSudahAdaBukti(!!data.bukti_alumni_url)
      }
      setLoading(false)
    }
    muat()
  }, [])

  function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_UKURAN) {
      setPesan({ text: 'Ukuran file maksimal 5 MB. Coba foto dengan resolusi lebih kecil.', ok: false })
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setPesan(null)
  }

  async function kirim() {
    if (!userId) return
    if (!file && !sudahAdaBukti) {
      setPesan({ text: 'Unggah dulu foto bukti alumni kamu.', ok: false })
      return
    }

    setMengirim(true)
    try {
      let buktiPath: string | null = null

      if (file) {
        const { path, error } = await uploadBuktiAlumni(file, userId)
        if (error) throw new Error('Gagal mengunggah bukti: ' + error)
        buktiPath = path
      }

      // Kolom status_verifikasi sengaja tidak disentuh — trigger
      // jaga_field_sensitif memang melarang user mengubahnya sendiri.
      const perubahan: Record<string, unknown> = {
        catatan_pendaftar: catatan.trim() || null,
      }
      if (buktiPath) perubahan.bukti_alumni_url = buktiPath

      const { error } = await supabase.from('users').update(perubahan).eq('id', userId)
      if (error) throw new Error(error.message)

      setSudahAdaBukti(true)
      setFile(null)
      setPreview(null)
      setPesan({
        text: 'Bukti terkirim. Admin akan memeriksa pengajuanmu, biasanya dalam 1–2 hari.',
        ok: true,
      })
    } catch (e) {
      setPesan({ text: e instanceof Error ? e.message : 'Gagal mengirim. Coba lagi.', ok: false })
    } finally {
      setMengirim(false)
    }
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: '60px', color: '#5a7da0' }}>Memuat...</div>
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
            <a href="/produk" style={{ flex: 1, background: '#fff', color: '#0C447C', border: '1px solid #0C447C', padding: '11px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
              Belanja
            </a>
            <a href="/produk/tambah" style={{ flex: 1, background: '#0C447C', color: '#fff', padding: '11px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
              Mulai Jualan
            </a>
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
            <strong style={{ color: '#1a1a1a' }}>Selama menunggu, kamu tetap bisa belanja seperti biasa</strong> —
            yang dibatasi hanya membuka toko dan berjualan.
          </div>
        </div>

        {/* Form */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>
            Bukti Alumni
          </div>
          <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '10px' }}>
            Foto ijazah, rapor, kartu pelajar, atau foto angkatan. Maksimal 5 MB.
            Hanya admin yang bisa melihatnya.
          </div>

          <div style={{
            position: 'relative', borderRadius: '8px', overflow: 'hidden',
            marginBottom: '8px', height: '170px', background: '#E6F1FB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {preview ? (
              <img src={preview} alt="Pratinjau bukti" style={{ width: '100%', height: '170px', objectFit: 'contain', background: '#f5f5f5' }} />
            ) : sudahAdaBukti ? (
              <div style={{ textAlign: 'center', color: '#5a7da0' }}>
                <div style={{ fontSize: '34px', marginBottom: '6px' }}>📄</div>
                <div style={{ fontSize: '12px' }}>Bukti sudah terkirim</div>
                <div style={{ fontSize: '11px', color: '#9ab4cc' }}>Pilih file baru kalau mau menggantinya</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#9ab4cc' }}>
                <div style={{ fontSize: '34px', marginBottom: '6px' }}>📷</div>
                <div style={{ fontSize: '12px' }}>Belum ada bukti</div>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pilihFile} style={{ display: 'none' }} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{ width: '100%', padding: '9px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '12px', color: '#0C447C', background: '#f0f5fb', cursor: 'pointer', marginBottom: '14px' }}
          >
            {preview || sudahAdaBukti ? 'Ganti Foto Bukti' : 'Pilih Foto Bukti'}
          </button>

          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>
            Catatan untuk Admin
          </div>
          <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '8px' }}>
            Opsional. Misal nama wali kelas, nomor absen, atau hal lain yang membantu admin mengenalimu.
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

        <button
          onClick={kirim}
          disabled={mengirim}
          style={{
            width: '100%', background: mengirim ? '#7fa8c9' : '#0C447C',
            color: '#fff', border: 'none', padding: '14px',
            borderRadius: '10px', fontSize: '14px', fontWeight: '600',
            cursor: mengirim ? 'not-allowed' : 'pointer', marginBottom: '10px',
          }}
        >
          {mengirim ? 'Mengirim...' : ditolak ? 'Kirim Ulang Pengajuan' : 'Kirim Pengajuan'}
        </button>

        {status === 'menunggu' && sudahAdaBukti && (
          <div style={{ background: '#fff8e1', border: '0.5px solid #ffe082', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#f57f17', textAlign: 'center', marginBottom: '10px' }}>
            ⏳ Pengajuanmu sedang ditinjau admin
          </div>
        )}

        <a href="/" style={{ display: 'block', textAlign: 'center', color: '#5a7da0', fontSize: '13px', textDecoration: 'none', paddingBottom: '24px' }}>
          ← Kembali ke Beranda
        </a>
      </div>
    </main>
  )
}
