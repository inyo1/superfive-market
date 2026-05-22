'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'

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
  const [saving, setSaving] = useState(false)
  const [pesan, setPesan] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)
      setUserEmail(user.email ?? '')

      const { data } = await supabase
        .from('users')
        .select('nama, email, angkatan, avatar_url, no_hp, jalan, kelurahan, kecamatan, kota, provinsi, kode_pos')
        .eq('id', user.id)
        .single()

      if (data) {
        setNama(data.nama ?? '')
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

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5a7da0' }}>Memuat profil...</div>
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
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '2px' }}>{nama || 'Nama belum diisi'}</div>
          <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '6px' }}>{userEmail}</div>
          {angkatan && (
            <div style={{ fontSize: '11px', background: '#E6F1FB', color: '#0C447C', padding: '3px 10px', borderRadius: '20px', fontWeight: '500' }}>
              Angkatan {angkatan}
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '10px' }}>Klik foto untuk mengganti</div>
        </div>

        {/* Informasi Akun */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '16px' }}>Informasi Akun</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Nama Lengkap</label>
            <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap kamu"
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

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
            <input value={noHp} onChange={e => setNoHp(e.target.value)} type="tel" placeholder="08xxxxxxxxxx"
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
              <input value={kodePos} onChange={e => setKodePos(e.target.value)} type="tel" placeholder="40xxx"
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

        <button onClick={handleSave} disabled={saving}
          style={{
            width: '100%', background: saving ? '#7fa8c9' : '#0C447C',
            color: '#fff', border: 'none', padding: '13px',
            borderRadius: '10px', fontSize: '14px', fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer', marginBottom: '12px',
          }}>
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a href="/dashboard" style={{ fontSize: '13px', color: '#0C447C', textDecoration: 'none' }}>📊 Dashboard</a>
          <span style={{ color: '#c5d9ef' }}>·</span>
          <a href="/produk" style={{ fontSize: '13px', color: '#0C447C', textDecoration: 'none' }}>📦 Produk</a>
        </div>
      </div>
    </main>
  )
}
