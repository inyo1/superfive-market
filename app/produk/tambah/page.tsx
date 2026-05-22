'use client'
import { useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { uploadFotoProduk } from '../../../lib/uploadFoto'
import Navbar from '../../components/Navbar'

export default function TambahProduk() {
  const [nama, setNama] = useState('')
  const [harga, setHarga] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [kategori, setKategori] = useState('Teknologi')
  const [stok, setStok] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan] = useState('')
  const [debugLog, setDebugLog] = useState<string[]>([])
  const inputFotoRef = useRef<HTMLInputElement>(null)

  function log(msg: string) {
    console.log('[TambahProduk]', msg)
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`])
  }

  function handlePilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFoto(file)
    setPreview(URL.createObjectURL(file))
  }

  function hapusFoto() {
    setFoto(null)
    setPreview(null)
    if (inputFotoRef.current) inputFotoRef.current.value = ''
  }

  async function handleTambah() {
    setLoading(true)
    setDebugLog([])

    const { data: { user } } = await supabase.auth.getUser()
    log(`User: ${user?.id ?? 'tidak login'}`)
    if (!user) { setPesan('Silakan login dulu!'); setLoading(false); return }

    let tokoId = null
    const { data: toko } = await supabase.from('toko').select('id').eq('seller_id', user.id).single()
    tokoId = toko?.id ?? null
    log(`Toko ID: ${tokoId}`)

    if (!tokoId) {
      const { data: tokoData } = await supabase.from('toko').insert({ seller_id: user.id, nama_toko: 'Toko Saya', kategori }).select().single()
      tokoId = tokoData?.id ?? null
      log(`Toko baru dibuat: ${tokoId}`)
    }

    let foto_url: string | null = null
    if (foto) {
      log(`Upload foto: ${foto.name} (${(foto.size / 1024).toFixed(1)} KB)`)
      const { url, error: uploadErr } = await uploadFotoProduk(foto)
      log(`Hasil upload: url=${url}, error=${uploadErr}`)
      if (uploadErr) { setPesan('Gagal upload foto: ' + uploadErr); setLoading(false); return }
      foto_url = url
    } else {
      log('Tidak ada foto dipilih')
    }

    const payload = {
      toko_id: tokoId,
      nama, harga: parseInt(harga),
      deskripsi, kategori,
      stok: parseInt(stok),
      foto_url,
    }
    log(`Payload insert: ${JSON.stringify(payload)}`)

    const { data: insertData, error } = await supabase.from('produk').insert(payload).select()
    log(`Response insert: data=${JSON.stringify(insertData)}, error=${error ? error.message + ' | code=' + error.code : 'null'}`)

    if (error) setPesan('Gagal: ' + error.message)
    else {
      setPesan('Produk berhasil ditambahkan!')
      setNama(''); setHarga(''); setDeskripsi(''); setStok('')
      hapusFoto()
    }
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '0.5px solid #c5d9ef' }}>

          {/* Upload foto */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Foto Produk</label>
            {preview ? (
              <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                <img src={preview} alt="preview" style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
                <button
                  onClick={hapusFoto}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => inputFotoRef.current?.click()}
                style={{ border: '1.5px dashed #c5d9ef', borderRadius: '10px', height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fbff', gap: '8px' }}
              >
                <span style={{ fontSize: '32px' }}>📷</span>
                <span style={{ fontSize: '12px', color: '#5a7da0' }}>Klik untuk pilih foto</span>
                <span style={{ fontSize: '11px', color: '#9ab4cc' }}>JPG, PNG, WEBP maks 5MB</span>
              </div>
            )}
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePilihFoto}
              style={{ display: 'none' }}
            />
            {!preview && (
              <button
                onClick={() => inputFotoRef.current?.click()}
                style={{ width: '100%', padding: '8px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '12px', color: '#0C447C', background: '#f0f5fb', cursor: 'pointer', marginTop: '6px' }}
              >
                Pilih Foto
              </button>
            )}
          </div>

          {['nama', 'harga', 'stok'].map(field => (
            <div key={field} style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>
                {field === 'nama' ? 'Nama Produk' : field === 'harga' ? 'Harga (Rp)' : 'Stok'}
              </label>
              <input
                value={field === 'nama' ? nama : field === 'harga' ? harga : stok}
                onChange={e => field === 'nama' ? setNama(e.target.value) : field === 'harga' ? setHarga(e.target.value) : setStok(e.target.value)}
                type={field === 'nama' ? 'text' : 'number'}
                placeholder={field === 'nama' ? 'Nama produk kamu' : field === 'harga' ? '100000' : '10'}
                style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Kategori</label>
            <select value={kategori} onChange={e => setKategori(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' }}>
              {['Teknologi', 'Fashion', 'Kuliner', 'Properti', 'Jasa', 'UMKM'].map(k => <option key={k}>{k}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Deskripsi</label>
            <textarea value={deskripsi} onChange={e => setDeskripsi(e.target.value)} rows={3} placeholder="Deskripsi produk kamu..." style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>

          {pesan && (
            <div style={{ background: pesan.includes('berhasil') ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesan.includes('berhasil') ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px', fontSize: '12px', color: pesan.includes('berhasil') ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
              {pesan}
            </div>
          )}

          <button onClick={handleTambah} disabled={loading} style={{ width: '100%', background: loading ? '#7fa8c9' : '#0C447C', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? (foto ? 'Mengupload foto...' : 'Menyimpan...') : 'Tambah Produk'}
          </button>
        </div>

        {/* Debug panel */}
        {debugLog.length > 0 && (
          <div style={{ marginTop: '16px', background: '#1a1a2e', borderRadius: '10px', padding: '14px', fontFamily: 'monospace' }}>
            <div style={{ fontSize: '11px', color: '#7ec8e3', marginBottom: '8px', fontWeight: '600' }}>🔍 DEBUG LOG</div>
            {debugLog.map((line, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#e0e0e0', marginBottom: '4px', wordBreak: 'break-all' }}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
