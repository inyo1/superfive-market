'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Produk = {
  id: string
  nama: string
  harga: number
  deskripsi: string
  kategori: string
  terjual: number
  rating: number
  toko: { nama_toko: string }
  users: { angkatan: number }
}

export default function ProdukPage() {
  const [produk, setProduk] = useState<Produk[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kategori, setKategori] = useState('semua')

  useEffect(() => {
    fetchProduk()
  }, [])

  async function fetchProduk() {
    const { data, error } = await supabase
      .from('produk')
      .select(`*, toko(nama_toko, seller_id, users(angkatan))`)
      .order('created_at', { ascending: false })
    if (!error && data) setProduk(data as any)
    setLoading(false)
  }

  const filtered = produk.filter(p => {
    const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase())
    const matchKat = kategori === 'semua' || p.kategori === kategori
    return matchSearch && matchKat
  })

  const kategoris = ['semua', 'Teknologi', 'Fashion', 'Kuliner', 'Properti', 'Jasa', 'UMKM']

  function fmt(n: number) {
  if (!n) return 'Rp 0'
  return 'Rp ' + n.toLocaleString('id-ID')
}

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#0C447C', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/LOGO.jpeg" alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: '500' }}>Superfive Market</div>
          <div style={{ color: '#B5D4F4', fontSize: '10px', letterSpacing: '1px' }}>ALUMNI SMPN 5 BANDUNG</div>
        </div>
        <a href="/auth" style={{ color: '#fff', fontSize: '12px', textDecoration: 'none', background: '#185FA5', padding: '6px 12px', borderRadius: '6px' }}>Masuk</a>
      </nav>

      <div style={{ padding: '16px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari produk alumni..."
          style={{ width: '100%', padding: '10px 14px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '14px', outline: 'none', marginBottom: '12px', background: '#fff' }}
        />

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
          {kategoris.map(k => (
            <button key={k} onClick={() => setKategori(k)} style={{ padding: '5px 14px', borderRadius: '20px', border: '0.5px solid', borderColor: kategori === k ? '#0C447C' : '#c5d9ef', background: kategori === k ? '#0C447C' : '#fff', color: kategori === k ? '#fff' : '#5a7da0', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {k === 'semua' ? 'Semua' : k}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#5a7da0' }}>Memuat produk alumni...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
            <div style={{ fontSize: '14px', color: '#5a7da0', marginBottom: '8px' }}>Belum ada produk</div>
            <a href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>+ Tambah Produk Pertama</a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {filtered.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e8f0f8', overflow: 'hidden' }}>
                <div style={{ height: '120px', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                  {p.kategori === 'Teknologi' ? '💻' : p.kategori === 'Fashion' ? '👗' : p.kategori === 'Kuliner' ? '🍱' : p.kategori === 'Properti' ? '🏠' : '📦'}
                </div>
                <div style={{ padding: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#333', marginBottom: '4px', height: '32px', overflow: 'hidden' }}>{p.nama}</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#0C447C', marginBottom: '4px' }}>{fmt(p.harga)}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#5a7da0', marginBottom: '6px' }}>
                    <span>⭐ {p.rating || '5.0'}</span>
                    <span>{p.terjual || 0} terjual</span>
                  </div>
                  <div style={{ fontSize: '10px', background: '#E6F1FB', color: '#0C447C', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                    {p.kategori}
                  </div>
                </div>
                <button style={{ width: '100%', background: '#0C447C', color: '#fff', border: 'none', padding: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  + Keranjang
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <a href="/produk/tambah" style={{ background: '#fff', border: '1px dashed #378ADD', color: '#0C447C', padding: '12px 24px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', display: 'inline-block' }}>
            + Tambah Produk Baru
          </a>
        </div>
      </div>
    </main>
  )
}