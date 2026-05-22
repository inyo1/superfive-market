'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useCart } from '../context/CartContext'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'

const emojiKategori: Record<string, string> = {
  Teknologi: '💻', Fashion: '👗', Kuliner: '🍱',
  Properti: '🏠', Jasa: '🛠️', UMKM: '🏪',
}

function fmt(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function KeranjangPage() {
  const router = useRouter()
  const { items, totalItem, totalHarga, loading, tambah, kurang, hapus, kosongkan } = useCart()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/auth?redirect=/keranjang&msg=Login+dulu+untuk+melihat+keranjang+belanja')
      } else {
        setAuthChecked(true)
      }
    })
  }, [])

  if (!authChecked || loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '88px', borderRadius: '10px', marginBottom: '10px' }} />
          ))}
        </div>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🛒</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            Keranjang kamu kosong
          </div>
          <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '24px' }}>
            Yuk cari produk alumni Superfive!
          </div>
          <a href="/produk" style={{
            background: '#0C447C', color: '#fff', padding: '12px 28px',
            borderRadius: '8px', fontSize: '13px', textDecoration: 'none',
          }}>
            Lihat Produk
          </a>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '16px 16px 100px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
            Keranjang <span style={{ color: '#5a7da0', fontWeight: '400' }}>({totalItem} item)</span>
          </h1>
          <button
            onClick={() => { if (confirm('Kosongkan semua item?')) kosongkan() }}
            style={{ background: 'none', border: 'none', color: '#c62828', fontSize: '12px', cursor: 'pointer' }}
          >
            Kosongkan
          </button>
        </div>

        {/* Daftar item */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {items.map(item => (
            <div key={item.id} style={{
              background: '#fff', borderRadius: '12px', padding: '12px',
              border: '0.5px solid #e8f0f8', display: 'flex', gap: '12px', alignItems: 'center',
            }}>
              {/* Foto / emoji */}
              <div style={{ flexShrink: 0, borderRadius: '10px', overflow: 'hidden', width: '56px', height: '56px', background: item.foto_url ? '#f5f5f5' : '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.foto_url ? (
                  <img
                    src={item.foto_url}
                    alt={item.nama}
                    style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <span style={{ fontSize: '26px' }}>{emojiKategori[item.kategori] ?? '📦'}</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.nama}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0C447C' }}>
                  {fmt(item.harga * item.qty)}
                </div>
                {item.qty > 1 && (
                  <div style={{ fontSize: '11px', color: '#9ab4cc' }}>
                    {fmt(item.harga)} / item
                  </div>
                )}
              </div>

              {/* Qty controls */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => kurang(item.id)}
                    style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      border: '1px solid #c5d9ef', background: '#fff',
                      color: '#0C447C', fontSize: '18px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a', minWidth: '22px', textAlign: 'center' }}>
                    {item.qty}
                  </span>
                  <button
                    onClick={() => tambah({ id: item.id, nama: item.nama, harga: item.harga, kategori: item.kategori, foto_url: item.foto_url })}
                    style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      border: 'none', background: '#0C447C',
                      color: '#fff', fontSize: '18px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => hapus(item.id)}
                  style={{ background: 'none', border: 'none', color: '#9ab4cc', fontSize: '11px', cursor: 'pointer' }}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Ringkasan */}
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '16px',
          border: '0.5px solid #e8f0f8', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '12px' }}>
            Ringkasan Belanja
          </div>
          {items.map(item => (
            <div key={item.id} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '12px', color: '#5a7da0', marginBottom: '6px',
            }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                {item.nama} ×{item.qty}
              </span>
              <span style={{ flexShrink: 0 }}>{fmt(item.harga * item.qty)}</span>
            </div>
          ))}
          <div style={{
            borderTop: '1px solid #e8f0f8', marginTop: '10px', paddingTop: '10px',
            display: 'flex', justifyContent: 'space-between',
            fontSize: '15px', fontWeight: '700', color: '#1a1a1a',
          }}>
            <span>Total</span>
            <span style={{ color: '#0C447C' }}>{fmt(totalHarga)}</span>
          </div>
        </div>

        <a href="/produk" style={{
          display: 'block', textAlign: 'center', color: '#0C447C',
          fontSize: '13px', textDecoration: 'none', marginBottom: '12px',
        }}>
          + Tambah Produk Lagi
        </a>
      </div>

      {/* Sticky checkout bar */}
      <div className="cta-bottom-bar" style={{ padding: '12px 16px', maxWidth: '560px', margin: '0 auto' }}>
        <a
          href="/checkout"
          style={{
            display: 'block', width: '100%', background: '#0C447C', color: '#fff',
            padding: '14px', borderRadius: '10px',
            fontSize: '14px', fontWeight: '700', textAlign: 'center', textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          Checkout — {fmt(totalHarga)}
        </a>
      </div>
    </main>
  )
}
