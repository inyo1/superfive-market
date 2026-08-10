'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'
import SkeletonCard from '../components/SkeletonCard'
import BadgeVerifikasi from '../components/BadgeVerifikasi'
import EmptyState from '../components/EmptyState'
import BadgeAngkatan from '../components/BadgeAngkatan'
import BadgeOfficial from '../components/BadgeOfficial'
import { useTampilSkeleton } from '../hooks/useSkeleton'

type Produk = {
  id: string
  nama: string
  harga: number
  deskripsi: string
  kategori: string
  terjual: number
  rating: number
  foto_url?: string | null
  toko: { nama_toko: string; is_official: boolean; users: { angkatan: number; status_verifikasi: string | null } | null } | null
  users: { angkatan: number }
}

const kategoris = ['semua', 'Teknologi', 'Fashion', 'Kuliner', 'Properti', 'Jasa', 'UMKM']

export default function ProdukPage() {
  const [produk, setProduk] = useState<Produk[]>([])
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
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
      .select(`*, toko(nama_toko, seller_id, is_official)`)
      .order('created_at', { ascending: false })

    if (error || !data) { setLoading(false); return }

    // Info penjual diambil terpisah dari alumni_publik lalu digabung di sini,
    // karena embed foreign key ke users sudah tidak bisa dibaca publik.
    const sellerIds = [...new Set(
      data.map((p: any) => p.toko?.seller_id).filter(Boolean)
    )] as string[]

    let penjualById: Record<string, { angkatan: number | null; status_verifikasi: string | null }> = {}
    if (sellerIds.length > 0) {
      const { data: penjual } = await supabase
        .from('alumni_publik')
        .select('id, angkatan, status_verifikasi')
        .in('id', sellerIds)
      penjualById = Object.fromEntries((penjual ?? []).map(u => [u.id, u]))
    }

    setProduk(data.map((p: any) => ({
      ...p,
      toko: p.toko ? { ...p.toko, users: penjualById[p.toko.seller_id] ?? null } : null,
    })) as any)
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
            <button key={k} onClick={() => setKategori(k)} className="filter-chip" style={{ padding: '0 16px', minHeight: '44px', display: 'inline-flex', alignItems: 'center', borderRadius: '22px', border: '0.5px solid', borderColor: kategori === k ? '#0C447C' : '#c5d9ef', background: kategori === k ? '#0C447C' : '#fff', color: kategori === k ? '#fff' : '#5a7da0', fontSize: '12px', fontWeight: kategori === k ? '600' : '400', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {k === 'semua' ? 'Semua' : k}
            </button>
          ))}
        </div>

        {tampilSkeleton ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          search.trim() || kategori !== 'semua' ? (
            <EmptyState
              kecil
              ikon="🔍"
              judul="Tidak ada yang cocok"
              pesan={search.trim()
                ? `Belum ada produk alumni yang cocok dengan "${search.trim()}". Coba kata lain atau ganti kategori.`
                : `Belum ada alumni yang jualan di kategori ${kategori}. Mungkin kamu yang pertama?`}
              aksiLabel="Tampilkan Semua"
              onAksi={() => { setSearch(''); setKategori('semua') }}
            />
          ) : (
            <EmptyState
              ikon="📦"
              judul="Etalase masih kosong"
              pesan="Belum ada alumni yang membuka lapak. Jadi yang pertama — produkmu akan dilihat seluruh angkatan Superfive."
              aksiLabel="+ Jualan Pertama"
              aksiHref="/produk/tambah"
            />
          )
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {filtered.map((p, i) => (
              <Link key={p.id} href={`/produk/${p.id}`} className="prod-card" style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e8f0f8', overflow: 'hidden', textDecoration: 'none', display: 'block', animation: `fadeInUp 0.28s ease both`, animationDelay: `${Math.min(i * 40, 300)}ms` }}>
                <div style={{ position: 'relative' }}>
                  <BadgeOfficial aktif={p.toko?.is_official} bentuk="pita" />
                  <FotoProduk src={p.foto_url} kategori={p.kategori} height={120} fontSize={40} />
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
                  {p.toko?.nama_toko && (
                    <div style={{ marginTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ fontSize: '10px', color: '#5a7da0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🏪 {p.toko.nama_toko}
                        </span>
                        {!p.toko.is_official && (
                          <BadgeVerifikasi status={p.toko.users?.status_verifikasi} size={11} />
                        )}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        {/* Toko resmi itu akun institusi, bukan alumni perorangan,
                            jadi angkatan diganti lencana OFFICIAL */}
                        {p.toko.is_official
                          ? <BadgeOfficial aktif kecil />
                          : <BadgeAngkatan angkatan={p.toko.users?.angkatan} kecil />}
                      </div>
                    </div>
                  )}
                </div>
                <div className="prod-card-btn" style={{ width: '100%', background: '#0C447C', color: '#fff', padding: '8px', fontSize: '12px', textAlign: 'center' }}>
                  Lihat Detail
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link href="/produk/tambah" style={{ background: '#fff', border: '1px dashed #378ADD', color: '#0C447C', padding: '12px 24px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', display: 'inline-block' }}>
            + Tambah Produk Baru
          </Link>
        </div>
      </div>
    </main>
  )
}