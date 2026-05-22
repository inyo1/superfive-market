'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../components/Navbar'
import { useCart } from '../../context/CartContext'
import FotoProduk from '../../components/FotoProduk'

type Toko = {
  id: string
  seller_id: string
  nama_toko: string
  kategori: string
  deskripsi?: string
  users: { nama: string; angkatan: number }
}

type Produk = {
  id: string
  nama: string
  harga: number
  kategori: string
  terjual: number
  rating: number
  stok: number
  foto_url?: string | null
}

const emojiKategori: Record<string, string> = {
  Teknologi: '💻', Fashion: '👗', Kuliner: '🍱',
  Properti: '🏠', Jasa: '🛠️', UMKM: '🏪',
}

function fmt(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function TokoPage() {
  const { id } = useParams<{ id: string }>()
  const { tambah } = useCart()

  const [toko, setToko] = useState<Toko | null>(null)
  const [produk, setProduk] = useState<Produk[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Edit state
  const [editMode, setEditMode] = useState(false)
  const [namaBaru, setNamaBaru] = useState('')
  const [deskripsiBaru, setDeskripsiBaru] = useState('')
  const [saving, setSaving] = useState(false)
  const [pesanEdit, setPesanEdit] = useState('')

  // Keranjang notif
  const [notifId, setNotifId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (!id) return
    async function fetch() {
      const { data: tokoData, error } = await supabase
        .from('toko')
        .select('*, users(nama, angkatan)')
        .eq('id', id)
        .single()

      if (error || !tokoData) { setNotFound(true); setLoading(false); return }
      setToko(tokoData as any)
      setNamaBaru(tokoData.nama_toko)
      setDeskripsiBaru(tokoData.deskripsi ?? '')

      const { data: produkData } = await supabase
        .from('produk')
        .select('id, nama, harga, kategori, terjual, rating, stok, foto_url')
        .eq('toko_id', id)
        .order('created_at', { ascending: false })

      setProduk((produkData ?? []) as unknown as Produk[])
      setLoading(false)
    }
    fetch()
  }, [id])

  async function handleSimpanEdit() {
    if (!namaBaru.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('toko')
      .update({ nama_toko: namaBaru, deskripsi: deskripsiBaru })
      .eq('id', id)

    if (!error) {
      setToko(prev => prev ? { ...prev, nama_toko: namaBaru, deskripsi: deskripsiBaru } : prev)
      setPesanEdit('Profil toko berhasil diperbarui!')
      setEditMode(false)
    } else {
      setPesanEdit('Gagal menyimpan: ' + error.message)
    }
    setSaving(false)
    setTimeout(() => setPesanEdit(''), 3000)
  }

  function handleTambahKeranjang(p: Produk) {
    tambah({ id: p.id, nama: p.nama, harga: p.harga, kategori: p.kategori })
    setNotifId(p.id)
    setTimeout(() => setNotifId(null), 2000)
  }

  const isOwner = toko && currentUserId === toko.seller_id

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5a7da0' }}>Memuat profil toko...</div>
      </main>
    )
  }

  if (notFound || !toko) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏪</div>
          <div style={{ fontSize: '15px', color: '#333', marginBottom: '8px' }}>Toko tidak ditemukan</div>
          <a href="/produk" style={{ color: '#0C447C', fontSize: '13px' }}>← Kembali ke Produk</a>
        </div>
      </main>
    )
  }

  const totalTerjual = produk.reduce((s, p) => s + (p.terjual || 0), 0)
  const ratingRata = produk.length
    ? (produk.reduce((s, p) => s + (p.rating || 5), 0) / produk.length).toFixed(1)
    : '5.0'

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>

        {/* Header toko */}
        <div style={{ background: '#0C447C', borderRadius: '12px', padding: '20px', color: '#fff', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0,
            }}>
              {emojiKategori[toko.kategori] ?? '🏪'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editMode ? (
                <input
                  value={namaBaru}
                  onChange={e => setNamaBaru(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                />
              ) : (
                <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{toko.nama_toko}</div>
              )}
              <div style={{ fontSize: '12px', color: '#B5D4F4' }}>
                {toko.users?.nama || 'Alumni'} · Angkatan {toko.users?.angkatan}
              </div>
            </div>
            {isOwner && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
              >
                Edit
              </button>
            )}
          </div>

          {/* Edit deskripsi */}
          {editMode ? (
            <div>
              <textarea
                value={deskripsiBaru}
                onChange={e => setDeskripsiBaru(e.target.value)}
                rows={2}
                placeholder="Deskripsi toko kamu..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSimpanEdit}
                  disabled={saving}
                  style={{ background: '#fff', color: '#0C447C', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={() => { setEditMode(false); setNamaBaru(toko.nama_toko); setDeskripsiBaru(toko.deskripsi ?? '') }}
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            toko.deskripsi && (
              <p style={{ fontSize: '13px', color: '#B5D4F4', margin: 0, lineHeight: '1.5' }}>{toko.deskripsi}</p>
            )
          )}

          {/* Statistik */}
          <div style={{ display: 'flex', gap: '0', marginTop: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            {[
              { label: 'Produk', value: produk.length },
              { label: 'Terjual', value: totalTerjual },
              { label: 'Rating', value: `⭐ ${ratingRata}` },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                <div style={{ fontSize: '16px', fontWeight: '700' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#B5D4F4' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pesan edit */}
        {pesanEdit && (
          <div style={{ background: pesanEdit.includes('berhasil') ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesanEdit.includes('berhasil') ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesanEdit.includes('berhasil') ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
            {pesanEdit}
          </div>
        )}

        {/* Tombol owner */}
        {isOwner && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <a
              href="/produk/tambah"
              style={{ flex: 1, background: '#0C447C', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', textDecoration: 'none', textAlign: 'center' }}
            >
              + Tambah Produk
            </a>
          </div>
        )}

        {/* Daftar produk */}
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '12px' }}>
          Produk ({produk.length})
        </div>

        {produk.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: '10px', border: '0.5px solid #c5d9ef' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
            <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: isOwner ? '14px' : '0' }}>Belum ada produk di toko ini</div>
            {isOwner && (
              <a href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
                Tambah Produk Pertama
              </a>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {produk.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e8f0f8', overflow: 'hidden' }}>
                <a href={`/produk/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <FotoProduk src={p.foto_url} kategori={p.kategori} height={110} fontSize={38} />
                  <div style={{ padding: '10px 10px 6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#333', marginBottom: '4px', height: '32px', overflow: 'hidden' }}>{p.nama}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>{fmt(p.harga)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#5a7da0' }}>
                      <span>⭐ {p.rating || '5.0'}</span>
                      <span>{p.terjual || 0} terjual</span>
                    </div>
                  </div>
                </a>
                <button
                  onClick={() => handleTambahKeranjang(p)}
                  style={{
                    width: '100%', border: 'none', padding: '8px', fontSize: '12px', cursor: 'pointer',
                    background: notifId === p.id ? '#2e7d32' : '#0C447C',
                    color: '#fff', transition: 'background 0.2s',
                  }}
                >
                  {notifId === p.id ? '✓ Ditambahkan' : '+ Keranjang'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
