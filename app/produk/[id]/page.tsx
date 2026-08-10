'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../components/Navbar'
import { useCart } from '../../context/CartContext'
import FotoProduk from '../../components/FotoProduk'
import ReviewSection from '../../components/ReviewSection'
import Skeleton from '../../components/Skeleton'
import BadgeOfficial from '../../components/BadgeOfficial'
import { useTampilSkeleton } from '../../hooks/useSkeleton'

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
  toko: { nama_toko: string; seller_id: string; is_official?: boolean }
  users?: { angkatan: number }
}

type Varian = {
  id: string
  tipe: string
  nama: string
  stok: number
  harga_tambahan: number
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
  const tampilSkeleton = useTampilSkeleton(loading)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const [adding, setAdding] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [startingChat, setStartingChat] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [varian, setVarian] = useState<Varian[]>([])
  const [varianId, setVarianId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    async function fetchProduk() {
      const { data, error } = await supabase
        .from('produk')
        .select('*, toko(id, nama_toko, seller_id, is_official)')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        // Angkatan penjual diambil dari alumni_publik, bukan embed ke users
        const sellerId = (data as any).toko?.seller_id
        let penjual: { angkatan: number | null; status_verifikasi: string | null } | null = null
        if (sellerId) {
          const { data: u } = await supabase
            .from('alumni_publik')
            .select('angkatan, status_verifikasi')
            .eq('id', sellerId)
            .single()
          penjual = u ?? null
        }
        const toko = (data as any).toko
        setProduk({ ...data, toko: toko ? { ...toko, users: penjual } : null } as any)

        // Varian aktif saja — yang dinonaktifkan penjual tidak boleh dipilih
        const { data: v } = await supabase
          .from('produk_varian')
          .select('id, tipe, nama, stok, harga_tambahan')
          .eq('produk_id', id)
          .eq('aktif', true)
          .order('urutan', { ascending: true })
          .order('nama', { ascending: true })

        setVarian((v ?? []) as Varian[])
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
    if (!currentUserId) { setShowAuthModal(true); return }
    if (belumPilihVarian) { showToast('Pilih ukuran dulu ya.', false); return }
    setAdding(true)
    const result = await tambah(itemKeranjang())
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

    try {
      // maybeSingle() returns null (not error) when no row found
      const { data: existing, error: selectErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', currentUserId)
        .eq('seller_id', sellerId)
        .maybeSingle()

      if (selectErr) throw new Error(selectErr.message)

      if (existing) {
        router.push(`/chat/${existing.id}`)
        return
      }

      const { data: newConv, error: insertErr } = await supabase
        .from('conversations')
        .insert({ buyer_id: currentUserId, seller_id: sellerId, produk_id: produk.id })
        .select('id')
        .single()

      if (insertErr) throw new Error(insertErr.message)
      if (newConv) router.push(`/chat/${newConv.id}`)
    } catch (err: any) {
      showToast('Gagal membuka chat: ' + (err?.message ?? 'Coba lagi'), false)
    } finally {
      setStartingChat(false)
    }
  }

  // Harga yang disimpan ke keranjang sudah termasuk tambahan varian, supaya
  // ringkasan di keranjang cocok. Harga final tetap dihitung ulang server
  // saat create_pesanan.
  function itemKeranjang() {
    const v = varian.find(x => x.id === varianId) ?? null
    return {
      id: produk!.id,
      nama: produk!.nama,
      harga: produk!.harga + (v?.harga_tambahan ?? 0),
      kategori: produk!.kategori,
      foto_url: produk!.foto_url,
      varian_id: v?.id ?? null,
      varian_nama: v?.nama ?? null,
    }
  }

  async function handleBeliSekarang() {
    if (!produk || adding) return
    if (!currentUserId) { setShowAuthModal(true); return }
    if (belumPilihVarian) { showToast('Pilih ukuran dulu ya.', false); return }
    setAdding(true)
    const result = await tambah(itemKeranjang())
    setAdding(false)
    if (result.ok) {
      router.push('/keranjang')
    } else {
      showToast('✗ Gagal: ' + result.error, false)
    }
  }

  if (tampilSkeleton) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '16px' }}>
          <Skeleton tinggi={240} radius={12} style={{ marginBottom: '14px' }} />
          <Skeleton tinggi={18} lebar="75%" style={{ marginBottom: '10px' }} />
          <Skeleton tinggi={22} lebar="45%" style={{ marginBottom: '16px' }} />
          <Skeleton tinggi={12} style={{ marginBottom: '8px' }} />
          <Skeleton tinggi={12} style={{ marginBottom: '8px' }} />
          <Skeleton tinggi={12} lebar="60%" style={{ marginBottom: '20px' }} />
          <Skeleton tinggi={46} radius={10} />
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
          <Link href="/produk" style={{ color: '#0C447C', fontSize: '13px' }}>← Kembali ke Produk</Link>
        </div>
      </main>
    )
  }

  const emoji = emojiKategori[produk.kategori] ?? '📦'
  const angkatan = (produk.toko as any)?.users?.angkatan
  const resmi = Boolean((produk.toko as any)?.is_official)

  const punyaVarian = varian.length > 0
  const varianTerpilih = varian.find(v => v.id === varianId) ?? null
  const totalStokVarian = varian.reduce((s, v) => s + v.stok, 0)
  const hargaTampil = produk.harga + (varianTerpilih?.harga_tambahan ?? 0)

  // Produk bervarian wajib dipilih dulu; produk biasa tidak berubah perilakunya
  const belumPilihVarian = punyaVarian && !varianTerpilih
  const stokHabis = punyaVarian ? totalStokVarian <= 0 : (produk.stok ?? 0) <= 0
  const mati = adding || belumPilihVarian || stokHabis

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
            {fmt(hargaTampil)}
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#5a7da0' }}>
            <span>⭐ {produk.rating || '5.0'} rating</span>
            <span>🛒 {produk.terjual || 0} terjual</span>
            {produk.stok !== undefined && (
              <span>📦 Stok: {punyaVarian ? totalStokVarian : produk.stok}</span>
            )}
          </div>
        </div>

        {/* Pemilih ukuran — hanya untuk produk yang punya varian aktif */}
        {punyaVarian && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '10px' }}>
              Pilih {varian[0]?.tipe ?? 'Ukuran'}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {varian.map(v => {
                const habis = v.stok <= 0
                const dipilih = v.id === varianId
                return (
                  <button
                    key={v.id}
                    onClick={() => setVarianId(v.id)}
                    disabled={habis}
                    aria-pressed={dipilih}
                    aria-label={habis ? `${v.nama} — stok habis` : `Pilih ukuran ${v.nama}`}
                    style={{
                      minWidth: '52px', minHeight: '44px', padding: '0 12px',
                      borderRadius: '8px', fontSize: '14px', fontWeight: dipilih ? '700' : '500',
                      border: dipilih ? '2px solid #0C447C' : '1px solid #c5d9ef',
                      background: habis ? '#f4f7fb' : dipilih ? '#E6F1FB' : '#fff',
                      color: habis ? '#b6c6d6' : dipilih ? '#0C447C' : '#1a1a1a',
                      cursor: habis ? 'not-allowed' : 'pointer',
                      textDecoration: habis ? 'line-through' : 'none',
                    }}
                  >
                    {v.nama}
                  </button>
                )
              })}
            </div>

            {/* Peringatan stak menipis hanya saat benar-benar mepet */}
            {varianTerpilih && varianTerpilih.stok > 0 && varianTerpilih.stok < 5 && (
              <div style={{ fontSize: '12px', color: '#e65100', fontWeight: '600', marginTop: '10px' }}>
                Sisa {varianTerpilih.stok} lagi
              </div>
            )}

            {varianTerpilih && varianTerpilih.harga_tambahan > 0 && (
              <div style={{ fontSize: '11px', color: '#5a7da0', marginTop: '8px' }}>
                Ukuran {varianTerpilih.nama} +{fmt(varianTerpilih.harga_tambahan)} dari harga dasar.
              </div>
            )}
          </div>
        )}

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
        <Link href={`/toko/${(produk.toko as any)?.id}`} style={{ textDecoration: 'none', display: 'block', background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '10px' }}>Info Penjual</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: '#0C447C', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontSize: '18px', flexShrink: 0
            }}>
              🏪
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                  {produk.toko?.nama_toko || 'Toko Alumni'}
                </span>
                <BadgeOfficial aktif={resmi} />
              </div>
              {/* Toko resmi akun institusi — angkatan tidak relevan di sini */}
              {!resmi && angkatan && (
                <div style={{ fontSize: '12px', color: '#5a7da0' }}>Alumni Angkatan {angkatan}</div>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#0C447C' }}>Lihat Toko →</div>
          </div>
        </Link>

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
            disabled={mati}
            style={{
              flex: 1, background: '#fff', color: mati ? '#9ab4cc' : '#0C447C',
              border: `1.5px solid ${mati ? '#c5d9ef' : '#0C447C'}`, padding: '13px',
              borderRadius: '8px', fontSize: '13px', fontWeight: '500',
              minHeight: '44px',
              cursor: mati ? 'not-allowed' : 'pointer',
            }}
          >
            {adding ? '...' : '+ Keranjang'}
          </button>
          <button
            onClick={handleBeliSekarang}
            disabled={mati}
            style={{
              flex: 2, background: mati ? '#7fa8c9' : '#0C447C', color: '#fff',
              border: 'none', padding: '13px',
              borderRadius: '8px', fontSize: '13px', fontWeight: '500',
              minHeight: '44px',
              cursor: mati ? 'not-allowed' : 'pointer',
            }}
          >
            {adding
              ? 'Memproses...'
              : stokHabis ? 'Stok Habis'
              : belumPilihVarian ? 'Pilih ukuran dulu'
              : 'Beli Sekarang'}
          </button>
        </div>
      </div>

      {/* Auth guard modal */}
      {showAuthModal && (
        <div
          onClick={() => setShowAuthModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '28px 24px',
              maxWidth: '320px', width: '100%', textAlign: 'center',
              boxShadow: '0 8px 32px rgba(12,68,124,0.18)',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔐</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
              Login Dulu
            </div>
            <p style={{ fontSize: '13px', color: '#5a7da0', lineHeight: '1.6', margin: '0 0 20px' }}>
              Login dulu untuk melanjutkan pembelian.
            </p>
            <button
              onClick={() => router.push(`/auth?redirect=/produk/${id}`)}
              style={{
                width: '100%', background: '#0C447C', color: '#fff',
                border: 'none', padding: '11px', borderRadius: '8px',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px',
              }}
            >
              Masuk Sekarang
            </button>
            <button
              onClick={() => setShowAuthModal(false)}
              style={{
                width: '100%', background: 'none', color: '#5a7da0',
                border: '0.5px solid #c5d9ef', padding: '10px', borderRadius: '8px',
                fontSize: '13px', cursor: 'pointer',
              }}
            >
              Nanti Saja
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
