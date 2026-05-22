'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type ProdukResult = {
  id: string
  nama: string
  harga: number
  kategori: string
  foto_url?: string | null
  toko: { nama_toko: string } | null
}

type TokoResult = {
  id: string
  nama_toko: string
  kategori: string
  users: { angkatan: number } | null
}

const emojiKategori: Record<string, string> = {
  Teknologi: '💻', Fashion: '👗', Kuliner: '🍱',
  Properti: '🏠', Jasa: '🛠️', UMKM: '🏪',
}

function fmt(n: number | null | undefined) {
  if (!n) return 'Rp 0'
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [produk, setProduk] = useState<ProdukResult[]>([])
  const [toko, setToko] = useState<TokoResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setProduk([])
      setToko([])
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  function handleChange(q: string) {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim()) { setProduk([]); setToko([]); setLoading(false); return }
    setLoading(true)
    timerRef.current = setTimeout(() => runSearch(q.trim()), 280)
  }

  async function runSearch(q: string) {
    const [produkRes, tokoRes] = await Promise.all([
      supabase.from('produk')
        .select('id, nama, harga, kategori, foto_url, toko(nama_toko)')
        .or(`nama.ilike.%${q}%,deskripsi.ilike.%${q}%`)
        .limit(5),
      supabase.from('toko')
        .select('id, nama_toko, kategori, users(angkatan)')
        .ilike('nama_toko', `%${q}%`)
        .limit(4),
    ])
    setProduk((produkRes.data ?? []) as unknown as ProdukResult[])
    setToko((tokoRes.data ?? []) as unknown as TokoResult[])
    setLoading(false)
  }

  function navigate(path: string) {
    onClose()
    router.push(path)
  }

  if (!open) return null

  const hasResults = produk.length > 0 || toko.length > 0
  const hasQuery = query.trim().length > 0

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(8, 30, 56, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '16px 16px 40px',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="search-panel"
        style={{
          background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '580px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
          overflow: 'hidden', flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px',
          borderBottom: hasResults || (hasQuery && !loading) ? '0.5px solid #e8f0f8' : 'none',
        }}>
          <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Cari produk atau toko alumni..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '15px', color: '#1a1a1a', background: 'transparent',
              minWidth: 0,
            }}
          />
          {query && (
            <button
              onClick={() => handleChange('')}
              style={{
                background: '#e8f0f8', border: 'none', borderRadius: '50%',
                width: '24px', height: '24px', cursor: 'pointer', fontSize: '11px',
                color: '#5a7da0', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Hapus"
            >
              ✕
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#5a7da0',
              fontSize: '13px', cursor: 'pointer', flexShrink: 0,
              padding: '4px 8px', borderRadius: '6px',
            }}
          >
            Tutup
          </button>
        </div>

        {/* Results body */}
        <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>

          {/* Empty/initial state */}
          {!hasQuery && (
            <div style={{ padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
              <div style={{ fontSize: '13px', color: '#5a7da0' }}>
                Ketik nama produk atau toko yang kamu cari
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#5a7da0' }}>
              Mencari<span className="search-dots">...</span>
            </div>
          )}

          {/* No results */}
          {!loading && hasQuery && !hasResults && (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>😕</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '6px' }}>
                Tidak ditemukan
              </div>
              <div style={{ fontSize: '13px', color: '#5a7da0' }}>
                Tidak ada produk atau toko dengan kata "{query}"
              </div>
            </div>
          )}

          {/* ── Produk ── */}
          {produk.length > 0 && (
            <div>
              <div style={{
                padding: '10px 16px 4px',
                fontSize: '11px', fontWeight: '700', color: '#9ab4cc',
                letterSpacing: '0.6px', textTransform: 'uppercase',
              }}>
                Produk
              </div>
              {produk.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/produk/${p.id}`)}
                  className="search-result-item"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 16px', border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    background: '#E6F1FB', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                  }}>
                    {emojiKategori[p.kategori] ?? '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: '500', color: '#1a1a1a',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: '2px',
                    }}>
                      {p.nama}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C' }}>
                      {fmt(p.harga)}
                    </div>
                    {p.toko && (
                      <div style={{ fontSize: '11px', color: '#5a7da0', marginTop: '1px' }}>
                        {(p.toko as any).nama_toko}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '10px', background: '#E6F1FB', color: '#0C447C',
                    padding: '3px 8px', borderRadius: '20px', flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {p.kategori}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Toko ── */}
          {toko.length > 0 && (
            <div style={{ borderTop: produk.length > 0 ? '0.5px solid #e8f0f8' : 'none' }}>
              <div style={{
                padding: '10px 16px 4px',
                fontSize: '11px', fontWeight: '700', color: '#9ab4cc',
                letterSpacing: '0.6px', textTransform: 'uppercase',
              }}>
                Toko
              </div>
              {toko.map(t => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/toko/${t.id}`)}
                  className="search-result-item"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 16px', border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: '#0C447C', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '20px', flexShrink: 0,
                  }}>
                    {emojiKategori[t.kategori] ?? '🏪'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: '500', color: '#1a1a1a',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: '2px',
                    }}>
                      {t.nama_toko}
                    </div>
                    {t.users && (
                      <div style={{ fontSize: '11px', color: '#5a7da0' }}>
                        Alumni Angkatan {(t.users as any).angkatan}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '10px', background: '#f0f5fb', color: '#5a7da0',
                    padding: '3px 8px', borderRadius: '20px', flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {t.kategori}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Footer: see all */}
          {hasResults && (
            <div style={{
              borderTop: '0.5px solid #e8f0f8',
              padding: '10px 16px',
              display: 'flex', justifyContent: 'center',
            }}>
              <button
                onClick={() => navigate(`/produk?q=${encodeURIComponent(query)}`)}
                style={{
                  background: 'none', border: 'none', color: '#0C447C',
                  fontSize: '12px', cursor: 'pointer', fontWeight: '600',
                  padding: '4px 0',
                }}
              >
                Lihat semua produk "{query}" →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
