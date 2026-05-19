'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function TambahProduk() {
  const [nama, setNama] = useState('')
  const [harga, setHarga] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [kategori, setKategori] = useState('Teknologi')
  const [stok, setStok] = useState('')
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan] = useState('')

  async function handleTambah() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setPesan('Silakan login dulu!'); setLoading(false); return }

    let tokoId = null
    const { data: toko } = await supabase.from('toko').select('id').eq('seller_id', user.id).single()
    if (toko) {
      tokoId = toko.id
    } else {
      const { data: tokoData } = await supabase.from('toko').insert({ seller_id: user.id, nama_toko: 'Toko Saya', kategori }).select().single()
      if (tokoData) tokoId = tokoData.id
    }

    const { error } = await supabase.from('produk').insert({
      toko_id: tokoId,
      nama, harga: parseInt(harga),
      deskripsi, kategori,
      stok: parseInt(stok)
    })

    if (error) setPesan('Gagal: ' + error.message)
    else { setPesan('Produk berhasil ditambahkan!'); setNama(''); setHarga(''); setDeskripsi(''); setStok('') }
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#0C447C', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/LOGO.jpeg" alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: '500' }}>Tambah Produk</div>
          <div style={{ color: '#B5D4F4', fontSize: '10px' }}>Superfive Market</div>
        </div>
        <a href="/produk" style={{ color: '#B5D4F4', fontSize: '12px', textDecoration: 'none' }}>← Kembali</a>
      </nav>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '0.5px solid #c5d9ef' }}>

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
                style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
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
            <textarea value={deskripsi} onChange={e => setDeskripsi(e.target.value)} rows={3} placeholder="Deskripsi produk kamu..." style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none' }} />
          </div>

          {pesan && (
            <div style={{ background: pesan.includes('berhasil') ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesan.includes('berhasil') ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px', fontSize: '12px', color: pesan.includes('berhasil') ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
              {pesan}
            </div>
          )}

          <button onClick={handleTambah} disabled={loading} style={{ width: '100%', background: '#0C447C', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
            {loading ? 'Menyimpan...' : 'Tambah Produk'}
          </button>
        </div>
      </div>
    </main>
  )
}