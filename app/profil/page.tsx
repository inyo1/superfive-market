'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import BadgeVerifikasi from '../components/BadgeVerifikasi'
import Skeleton, { SkeletonPanel } from '../components/Skeleton'
import Tombol from '../components/Tombol'
import { useTampilSkeleton } from '../hooks/useSkeleton'

export default function ProfilPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [nama, setNama] = useState('')
  const [angkatan, setAngkatan] = useState('')
  const [noHp, setNoHp] = useState('')
  const [jalan, setJalan] = useState('')
  const [kelurahan, setKelurahan] = useState('')
  const [kecamatan, setKecamatan] = useState('')
  const [kota, setKota] = useState('')
  const [provinsi, setProvinsi] = useState('')
  const [kodePos, setKodePos] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  const [saving, setSaving] = useState(false)
  const [pesan, setPesan] = useState('')
  const [statusAlumni, setStatusAlumni] = useState<string | null>(null)
  const [isInstitusi, setIsInstitusi] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)
      setUserEmail(user.email ?? '')

      const { data } = await supabase
        .from('users')
        .select('nama, email, angkatan, avatar_url, no_hp, jalan, kelurahan, kecamatan, kota, provinsi, kode_pos, status_alumni, is_institusi')
        .eq('id', user.id)
        .single()

      if (data) {
        setNama(data.nama ?? '')
        setStatusAlumni(data.status_alumni ?? 'umum')
        setIsInstitusi(Boolean(data.is_institusi))
        setAngkatan(data.angkatan ? String(data.angkatan) : '')
        setAvatarUrl(data.avatar_url ?? null)
        setNoHp(data.no_hp ?? '')
        setJalan(data.jalan ?? '')
        setKelurahan(data.kelurahan ?? '')
        setKecamatan(data.kecamatan ?? '')
        setKota(data.kota ?? '')
        setProvinsi(data.provinsi ?? '')
        setKodePos(data.kode_pos ?? '')
        if (data.email) setUserEmail(data.email)
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    setPesan('')

    let finalAvatarUrl = avatarUrl

    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatar')
        .upload(path, file, { upsert: true, cacheControl: '3600' })

      if (upErr) {
        setPesan('Gagal upload foto: ' + upErr.message)
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('avatar').getPublicUrl(path)
      finalAvatarUrl = urlData.publicUrl + '?t=' + Date.now()
    }

    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: userEmail,
        nama,
        angkatan: angkatan ? parseInt(angkatan) : null,
        avatar_url: finalAvatarUrl,
        no_hp: noHp || null,
        jalan: jalan || null,
        kelurahan: kelurahan || null,
        kecamatan: kecamatan || null,
        kota: kota || null,
        provinsi: provinsi || null,
        kode_pos: kodePos || null,
      })

    if (error) {
      setPesan('Gagal menyimpan: ' + error.message)
    } else {
      setAvatarUrl(finalAvatarUrl)
      setFile(null)
      setPreview(null)
      setPesan('Profil berhasil diperbarui!')
      if (fileRef.current) fileRef.current.value = ''
    }
    setSaving(false)
  }

  if (tampilSkeleton) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>
          <Skeleton tinggi={17} lebar="35%" style={{ marginBottom: '20px' }} />
          <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #e8f0f8', padding: '18px', marginBottom: '12px', textAlign: 'center' }}>
            <Skeleton tinggi={96} lebar={96} radius="50%" style={{ margin: '0 auto 12px' }} />
            <Skeleton tinggi={13} lebar="45%" style={{ margin: '0 auto 6px' }} />
            <Skeleton tinggi={11} lebar="60%" style={{ margin: '0 auto' }} />
          </div>
          <SkeletonPanel baris={4} />
        </div>
      </main>
    )
  }

  const displaySrc = preview ?? avatarUrl
  const initials = nama
    ? nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (userEmail?.charAt(0).toUpperCase() ?? '?')

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px 40px' }}>
        <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 20px' }}>
          Profil Saya
        </h1>

        {/* Avatar card */}
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '28px 20px 22px',
          border: '0.5px solid #c5d9ef', marginBottom: '12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div onClick={() => fileRef.current?.click()} style={{ position: 'relative', cursor: 'pointer', marginBottom: '14px' }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              overflow: 'hidden', background: 'linear-gradient(135deg, #0C447C, #185FA5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid #e8f0f8', boxShadow: '0 6px 20px rgba(12,68,124,0.18)',
            }}>
              {displaySrc
                ? <img src={displaySrc} alt="Foto profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '38px', fontWeight: '700', color: '#fff', letterSpacing: '-1px' }}>{initials}</span>
              }
            </div>
            <div style={{
              position: 'absolute', bottom: '2px', right: '2px',
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#0C447C', border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
            }}>📷</div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{nama || 'Nama belum diisi'}</span>
            <BadgeVerifikasi alumni={statusAlumni === 'alumni'} size={14} />
          </div>
          <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '6px' }}>{userEmail}</div>
          {angkatan && (
            <div style={{ fontSize: '11px', background: '#E6F1FB', color: '#0C447C', padding: '3px 10px', borderRadius: '20px', fontWeight: '500' }}>
              Angkatan {angkatan}
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '10px' }}>Klik foto untuk mengganti</div>
        </div>

        {/* Ajakan verifikasi alumni — SATU-SATUNYA tempat ajakan ini muncul.
            Yang berstatus 'umum' adalah pembeli biasa dan tidak terhalang apa
            pun, jadi ini undangan, bukan peringatan: tidak ada warna merah,
            tidak ada tanda seru, dan tidak muncul di halaman lain. */}
        {!isInstitusi && statusAlumni === 'umum' && (
          <div style={{ background: '#E6F1FB', borderRadius: '16px', padding: '18px 20px', border: '0.5px solid #b3d1ee', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>
              🎓 Alumni SMPN 5 Bandung?
            </div>
            <div style={{ fontSize: '12px', color: '#3d6c9c', lineHeight: '1.7', marginBottom: '12px' }}>
              Verifikasi untuk masuk direktori alumni dan bisa berjualan.
            </div>
            <Link href="/verifikasi" style={{
              display: 'inline-flex', alignItems: 'center', background: '#0C447C', color: '#fff',
              padding: '0 18px', minHeight: '40px', borderRadius: '8px',
              fontSize: '12px', fontWeight: '600', textDecoration: 'none',
            }}>
              Verifikasi Alumni
            </Link>
          </div>
        )}

        {statusAlumni === 'menunggu' && (
          <div style={{ background: '#fff8e1', borderRadius: '16px', padding: '16px 20px', border: '0.5px solid #ffe082', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#f57f17', marginBottom: '4px' }}>
              ⏳ Pengajuan alumni sedang diperiksa
            </div>
            <div style={{ fontSize: '12px', color: '#8d6e26', lineHeight: '1.7' }}>
              Belanjamu tidak dibatasi sama sekali sambil menunggu.
            </div>
          </div>
        )}

        {statusAlumni === 'ditolak' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '16px 20px', border: '0.5px solid #f09595', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#c62828', marginBottom: '4px' }}>
              Pengajuan alumni belum diterima
            </div>
            <div style={{ fontSize: '12px', color: '#8d4040', lineHeight: '1.7', marginBottom: '12px' }}>
              Kamu tetap bisa belanja seperti biasa. Kalau datanya sudah diperbaiki, kirim ulang.
            </div>
            <Link href="/verifikasi" style={{
              display: 'inline-flex', alignItems: 'center', background: '#fff', color: '#0C447C',
              border: '1px solid #0C447C', padding: '0 18px', minHeight: '40px', borderRadius: '8px',
              fontSize: '12px', fontWeight: '600', textDecoration: 'none',
            }}>
              Lihat Alasannya
            </Link>
          </div>
        )}

        {/* Informasi Akun */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '16px' }}>Informasi Akun</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Nama Lengkap</label>
            <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap kamu"
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Akun institusi bukan alumni perorangan — kolom angkatan tidak
              relevan dan kalau ditampilkan hanya akan diisi asal. Yang
              berstatus 'umum' juga tidak diminta angkatan: jalannya lewat
              pengajuan alumni di atas, bukan kolom yang diisi diam-diam. */}
          {!isInstitusi && statusAlumni !== 'umum' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Angkatan (Tahun Lulus)</label>
              <select value={angkatan} onChange={e => setAngkatan(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                <option value="">-- Pilih Angkatan --</option>
                {Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>Angkatan {y}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Email</label>
            <input value={userEmail} readOnly
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e8f0f8', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8fbff', color: '#9ab4cc', cursor: 'default' }} />
          </div>
        </div>

        {/* Kontak & Alamat */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>Kontak & Alamat</div>
          <div style={{ fontSize: '11px', color: '#9ab4cc', marginBottom: '16px' }}>Digunakan untuk auto-fill saat checkout</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Nomor HP / WhatsApp</label>
            <input value={noHp} onChange={e => setNoHp(e.target.value)} type="tel" inputMode="tel" placeholder="08xxxxxxxxxx"
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Jalan / Nama Jalan & Nomor</label>
            <textarea value={jalan} onChange={e => setJalan(e.target.value)} rows={2} placeholder="Jl. Contoh No. 10, RT 01/RW 02"
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Kelurahan</label>
              <input value={kelurahan} onChange={e => setKelurahan(e.target.value)} placeholder="Kelurahan"
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Kecamatan</label>
              <input value={kecamatan} onChange={e => setKecamatan(e.target.value)} placeholder="Kecamatan"
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Kota / Kabupaten</label>
              <input value={kota} onChange={e => setKota(e.target.value)} placeholder="Bandung"
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Kode Pos</label>
              <input value={kodePos} onChange={e => setKodePos(e.target.value.replace(/\D/g, ''))} type="tel" inputMode="numeric" maxLength={5} placeholder="40xxx"
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Provinsi</label>
            <input value={provinsi} onChange={e => setProvinsi(e.target.value)} placeholder="Jawa Barat"
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Pesan */}
        {pesan && (
          <div style={{
            background: pesan.includes('Gagal') ? '#fce4e4' : '#e8f5e9',
            border: `0.5px solid ${pesan.includes('Gagal') ? '#f09595' : '#a5d6a7'}`,
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '13px', color: pesan.includes('Gagal') ? '#c62828' : '#2e7d32',
            marginBottom: '12px',
          }}>
            {pesan}
          </div>
        )}

        <Tombol
          onClick={handleSave}
          loading={saving}
          teksLoading="Menyimpan..."
          penuh
          style={{ padding: '14px', fontSize: '14px', borderRadius: '10px', marginBottom: '12px' }}
        >
          Simpan Perubahan
        </Tombol>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/dashboard" style={{ fontSize: '13px', color: '#0C447C', textDecoration: 'none' }}>📊 Dashboard</Link>
          <span style={{ color: '#c5d9ef' }}>·</span>
          <Link href="/produk" style={{ fontSize: '13px', color: '#0C447C', textDecoration: 'none' }}>📦 Produk</Link>
        </div>
      </div>
    </main>
  )
}
