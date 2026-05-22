'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../components/Navbar'
import { useCart } from '../../context/CartContext'
import FotoProduk from '../../components/FotoProduk'
import ReviewSection from '../../components/ReviewSection'

type Produk = {
  id: string
  nama: string
  harga: number
  deskripsi: string
  kategori: string
  stok: number
  terjual: number
  rating: number
  foto_url?: string | null
  created_at: string
  toko: { nama_toko: string; seller_id: string }
  users?: { angkatan: number }
}

const emojiKategori: Record<string, string> = {
  Teknologi: '💻',
  Fashion: '👗',
  Kuliner: '🍱',
  Properti: '🏠',
  Jasa: '🛠️',
  UMKM: '🏪',
}

function fmt(n: number) {
  if (!n) return 'Rp 0'
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function DetailProduk() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { tambah } = useCart()
  const [produk, setProduk] = useState<Produk | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const [adding, setAdding] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [startingChat, setStartingChat] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    async function fetchProduk() {
      const { data, error } = await supabase
        .from('produk')
        .select('*, toko(id, nama_toko, seller_id, users(angkatan))')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setProduk(data as any)
      }
      setLoading(false)
    }
    if (id) fetchProduk()
  }, [id])

  function showToast(text: string, ok: boolean) {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleKeranjang() {
    if (!produk || adding) return
    setAdding(true)
    const result = await tambah({
      id: produk.id,
      nama: produk.nama,
      harga: produk.harga,
      kategori: produk.kategori,
      foto_url: produk.foto_url,
    })
    setAdding(false)
    if (result.ok) {
      showToast('✓ Berhasil ditambahkan ke keranjang', true)
    } else {
      showToast('✗ Gagal: ' + result.error, false)
    }
  }

  async function handleChatSeller() {
    if (!produk || startingChat) return
    if (!currentUserId) { router.push('/auth'); return }
    const sellerId = (produk.toko as any)?.seller_id
    if (!sellerId || currentUserId === sellerId) return
    setStartingChat(true)

    const { data: existing } = await supabase
      .from('conversations').select('id')
      .eq('buyer_id', currentUserId).eq('seller_id', sellerId).single()

    if (existing) { router.push(`/chat/${existing.id}`); return }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ buyer_id: currentUserId, seller_id: sellerId, produk_id: produk.id })
      .select('id').single()

    if (newConv) router.push(`/chat/${newConv.id}`)
    setStartingChat(false)
  }

  async function handleBeliSekarang() {
    if (!produk || adding) return
    setAdding(true)
    const result = await tambah({
      id: produk.id,
      nama: produk.nama,
      harga: produk.harga,
      kategori: produk.kategori,
      foto_url: produk.foto_url,
    })
    setAdding(false)
    if (result.ok) {
      router.push('/keranjang')
    } else {
      showToast('✗ Gagal: ' + result.error, false)
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5a7da0' }}>
          Memuat produk...
        </div>
      </main>
    )
  }

  if (notFound || !produk) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>Produk tidak ditemukan</div>
          <a href="/produk" style={{ color: '#0C447C', fontSize: '13px' }}>← Kembali ke Produk</a>
        </div>
      </main>
    )
  }

  const emoji = emojiKategori[produk.kategori] ?? '📦'
  const angkatan = (produk.toko as any)?.users?.angkatan

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '16px' }}>

        {/* Tombol kembali */}
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#0C447C', fontSize: '13px', cursor: 'pointer', padding: '8px 0', marginBottom: '6px', display: 'block' }}
        >
          ← Kembali
        </button>

        {/* Gambar produk */}
        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
          <FotoProduk src={produk.foto_url} kategori={produk.kategori} height={220} fontSize={72} />
        </div>

        {/* Info utama */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0, flex: 1, paddingRight: '12px' }}>
              {produk.nama}
            </h1>
            <span style={{ fontSize: '10px', background: '#E6F1FB', color: '#0C447C', padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
              {produk.kategori}
            </span>
          </div>

          <div style={{ fontSize: '22px', fontWeight: '700', color: '#0C447C', marginBottom: '12px' }}>
            {fmt(produk.harga)}
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#5a7da0' }}>
            <span>⭐ {produk.rating || '5.0'} rating</span>
            <span>🛒 {produk.terjual || 0} terjual</span>
            {produk.stok !== undefined && (
              <span>📦 Stok: {produk.stok}</span>
            )}
          </div>
        </div>

        {/* Deskripsi */}
        {produk.deskripsi && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '8px' }}>Deskripsi</div>
            <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.7', margin: 0 }}>
              {produk.deskripsi}
            </p>
          </div>
        )}

        {/* Info toko */}
        <a href={`/toko/${(produk.toko as any)?.id}`} style={{ textDecoration: 'none', display: 'block', background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '10px' }}>Info Penjual</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: '#0C447C', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontSize: '18px', flexShrink: 0
            }}>
              🏪
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                {produk.toko?.nama_toko || 'Toko Alumni'}
              </div>
              {angkatan && (
                <div style={{ fontSize: '12px', color: '#5a7da0' }}>Alumni Angkatan {angkatan}</div>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#0C447C' }}>Lihat Toko →</div>
          </div>
        </a>

        {/* Chat dengan seller */}
        {currentUserId && currentUserId !== (produk.toko as any)?.seller_id && (
          <button
            onClick={handleChatSeller}
            disabled={startingChat}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: '#fff', border: '1px solid #0C447C', color: '#0C447C',
              padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
              cursor: startingChat ? 'not-allowed' : 'pointer', marginBottom: '12px',
            }}
          >
            {startingChat ? 'Membuka chat...' : '💬 Chat dengan Penjual'}
          </button>
        )}
        {!currentUserId && (
          <button
            onClick={() => router.push('/auth')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: '#fff', border: '1px solid #c5d9ef', color: '#5a7da0',
              padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
              cursor: 'pointer', marginBottom: '12px',
            }}
          >
            💬 Login untuk chat dengan penjual
          </button>
        )}

        {/* Toast notification */}
        {toast && (
          <div style={{
            background: toast.ok ? '#e8f5e9' : '#fce4e4',
            border: `0.5px solid ${toast.ok ? '#a5d6a7' : '#f09595'}`,
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '13px', color: toast.ok ? '#2e7d32' : '#c62828',
            marginBottom: '12px', textAlign: 'center', fontWeight: '500',
          }}>
            {toast.text}
          </div>
        )}

        {/* Rating & Ulasan */}
        <ReviewSection produkId={produk.id} />

        {/* CTA — sticky at bottom so thumb always reaches it */}
        <div className="cta-bottom-bar" style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleKeranjang}
            disabled={adding}
            style={{
              flex: 1, background: '#fff', color: adding ? '#9ab4cc' : '#0C447C',
              border: `1.5px solid ${adding ? '#c5d9ef' : '#0C447C'}`, padding: '13px',
              borderRadius: '8px', fontSize: '13px', fontWeight: '500',
              cursor: adding ? 'not-allowed' : 'pointer',
            }}
          >
            {adding ? '...' : '+ Keranjang'}
          </button>
          <button
            onClick={handleBeliSekarang}
            disabled={adding}
            style={{
              flex: 2, background: adding ? '#7fa8c9' : '#0C447C', color: '#fff',
              border: 'none', padding: '13px',
              borderRadius: '8px', fontSize: '13px', fontWeight: '500',
              cursor: adding ? 'not-allowed' : 'pointer',
            }}
          >
            {adding ? 'Memproses...' : 'Beli Sekarang'}
          </button>
        </div>
      </div>
    </main>
  )
}
