'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'
import SkeletonCard from '../components/SkeletonCard'

type Produk = {
  id: string
  nama: string
  harga: number
  deskripsi: string
  kategori: string
  terjual: number
  rating: number
  foto_url?: string | null
  toko: { nama_toko: string }
  users: { angkatan: number }
}

const kategoris = ['semua', 'Teknologi', 'Fashion', 'Kuliner', 'Properti', 'Jasa', 'UMKM']

export default function ProdukPage() {
  const [produk, setProduk] = useState<Produk[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kategori, setKategori] = useState('semua')

  useEffect(() => {
    // Pre-fill search/kategori from URL params (set by search overlay or category shortcuts)
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    const kat = params.get('kategori')
    if (q) setSearch(q)
    if (kat && kategoris.includes(kat)) setKategori(kat)
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

  function fmt(n: number) {
  if (!n) return 'Rp 0'
  return 'Rp ' + n.toLocaleString('id-ID')
}

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ padding: '16px' }}>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari produk alumni..."
            style={{ width: '100%', padding: '10px 14px 10px 40px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: '#e8f0f8', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '11px', color: '#5a7da0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
          {kategoris.map(k => (
            <button key={k} onClick={() => setKategori(k)} className="filter-chip" style={{ padding: '5px 14px', borderRadius: '20px', border: '0.5px solid', borderColor: kategori === k ? '#0C447C' : '#c5d9ef', background: kategori === k ? '#0C447C' : '#fff', color: kategori === k ? '#fff' : '#5a7da0', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {k === 'semua' ? 'Semua' : k}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
            <div style={{ fontSize: '14px', color: '#5a7da0', marginBottom: '8px' }}>Belum ada produk</div>
            <a href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>+ Tambah Produk Pertama</a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {filtered.map((p, i) => (
              <a key={p.id} href={`/produk/${p.id}`} className="prod-card" style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e8f0f8', overflow: 'hidden', textDecoration: 'none', display: 'block', animation: `fadeInUp 0.28s ease both`, animationDelay: `${Math.min(i * 40, 300)}ms` }}>
                <FotoProduk src={p.foto_url} kategori={p.kategori} height={120} fontSize={40} />
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
                <div className="prod-card-btn" style={{ width: '100%', background: '#0C447C', color: '#fff', padding: '8px', fontSize: '12px', textAlign: 'center' }}>
                  Lihat Detail
                </div>
              </a>
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