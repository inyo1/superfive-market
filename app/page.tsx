'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Navbar from './components/Navbar'
import FotoProduk from './components/FotoProduk'
import SkeletonCard from './components/SkeletonCard'

type Produk = {
  id: string
  nama: string
  harga: number
  kategori: string
  foto_url?: string | null
  terjual: number
  rating: number
  toko: { nama_toko: string } | null
}

type Stats = { produk: number; toko: number; alumni: number }

const kategoris = [
  { key: 'Teknologi', emoji: '💻' },
  { key: 'Fashion',   emoji: '👗' },
  { key: 'Kuliner',   emoji: '🍱' },
  { key: 'Properti',  emoji: '🏠' },
  { key: 'Jasa',      emoji: '🛠️' },
  { key: 'UMKM',      emoji: '🏪' },
]

function fmt(n: number | null | undefined) {
  if (!n) return 'Rp 0'
  return 'Rp ' + n.toLocaleString('id-ID')
}

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target) return
    let current = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return count
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  const count = useCountUp(value)
  return (
    <div style={{
      flex: 1, background: 'rgba(255,255,255,0.13)', borderRadius: '12px',
      padding: '14px 8px', textAlign: 'center',
      border: '0.5px solid rgba(255,255,255,0.15)',
    }}>
      <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>
        {count}
      </div>
      <div style={{ fontSize: '11px', color: '#B5D4F4', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ produk: 0, toko: 0, alumni: 0 })
  const [latest, setLatest] = useState<Produk[]>([])
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)

  function handleJualClick(e: React.MouseEvent) {
    e.preventDefault()
    if (loggedIn) {
      router.push('/produk/tambah')
    } else {
      router.push('/auth')
    }
  }

  useEffect(() => {
    async function load() {
      const [authRes, pCount, tCount, uCount, latestRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('produk').select('*', { count: 'exact', head: true }),
        supabase.from('toko').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('produk')
          .select('id, nama, harga, kategori, foto_url, terjual, rating, toko(nama_toko)')
          .order('created_at', { ascending: false })
          .limit(6),
      ])
      setLoggedIn(!!authRes.data.user)
      setStats({
        produk: pCount.count ?? 0,
        toko:   tCount.count ?? 0,
        alumni: uCount.count ?? 0,
      })
      setLatest((latestRes.data ?? []) as unknown as Produk[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(150deg, #0d4f91 0%, #0C447C 45%, #082e57 100%)',
        padding: '32px 20px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative watermark */}
        <div aria-hidden style={{
          position: 'absolute', right: '-10px', top: '-24px',
          fontSize: '200px', fontWeight: '900', color: 'rgba(255,255,255,0.045)',
          lineHeight: 1, userSelect: 'none', pointerEvents: 'none', fontFamily: 'sans-serif',
        }}>5</div>
        <div aria-hidden style={{ position: 'absolute', bottom: '-50px', left: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', top: '-30px', right: '120px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        {/* Logo + brand */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <img
            src="/logo.png" alt="Superfive Market"
            style={{ width: '120px', height: '120px', objectFit: 'contain', borderRadius: '20px', flexShrink: 0, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.28))' }}
          />
          <div>
            <div style={{ fontSize: '11px', color: '#7eb8f0', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: '5px' }}>
              Alumni SMPN 5 Bandung
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#fff', margin: 0, lineHeight: 1.2 }}>
              Superfive Market
            </h1>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: '#B5D4F4', lineHeight: '1.75', margin: '0 0 22px', maxWidth: '360px' }}>
          Platform marketplace eksklusif tempat alumni berbelanja, berjualan, dan berkembang bersama.
        </p>

        {/* CTA buttons — guest only */}
        {!loggedIn && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <a href="/auth" style={{
              background: '#fff', color: '#0C447C',
              padding: '11px 22px', borderRadius: '9px',
              fontSize: '13px', fontWeight: '700', textDecoration: 'none',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              MASUK
            </a>
            <a href="/auth" style={{
              background: 'rgba(255,255,255,0.14)', color: '#fff',
              padding: '11px 22px', borderRadius: '9px',
              fontSize: '13px', fontWeight: '600', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.28)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              DAFTAR SEKARANG
            </a>
          </div>
        )}

        {/* Statistik */}
        <div style={{ display: 'flex', gap: '8px', maxWidth: '50%' }}>
          <StatCard label="Produk" value={stats.produk} icon="📦" />
          <StatCard label="Toko"   value={stats.toko}   icon="🏪" />
          <StatCard label="Alumni" value={stats.alumni} icon="🎓" />
        </div>

        {/* Foto gedung SMPN 5 — desktop only, blends with hero gradient */}
        <div
          className="hero-building"
          aria-hidden
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: '50%', pointerEvents: 'none', overflow: 'hidden',
          }}
        >
          <img
            src="/smpn5-hero.png"
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              mixBlendMode: 'luminosity',
              opacity: 0.28,
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 30%, black 60%)',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 30%, black 60%)',
            }}
          />
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: '700px', margin: '0 auto' }}>

        {/* ── CTA navigasi ── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <a href="/produk" style={{
            flex: 1, background: '#0C447C', color: '#fff',
            padding: '12px', borderRadius: '9px', textAlign: 'center',
            fontSize: '13px', fontWeight: '700', textDecoration: 'none',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            JELAJAHI PRODUK
          </a>
          <a href="/produk/tambah" onClick={handleJualClick} style={{
            flex: 1, background: '#fff', color: '#0C447C',
            border: '1.5px solid #0C447C',
            padding: '12px', borderRadius: '9px', textAlign: 'center',
            fontSize: '13px', fontWeight: '700', textDecoration: 'none',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            MULAI BERJUALAN
          </a>
        </div>

        {/* ── Kategori Shortcuts ── */}
        <div style={{ marginBottom: '26px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a', marginBottom: '12px' }}>
            Belanja per Kategori
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {kategoris.map((k, i) => (
              <a
                key={k.key}
                href={`/produk?kategori=${encodeURIComponent(k.key)}`}
                className="prod-card"
                style={{
                  background: '#fff', border: '0.5px solid #e8f0f8', borderRadius: '12px',
                  padding: '14px 8px', textAlign: 'center', textDecoration: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  animation: 'fadeInUp 0.28s ease both',
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <span style={{ fontSize: '26px', lineHeight: 1 }}>{k.emoji}</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#444' }}>{k.key}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── Produk Terbaru ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>Produk Terbaru</div>
            <a href="/produk" style={{ fontSize: '12px', color: '#0C447C', textDecoration: 'none', fontWeight: '600' }}>
              Lihat Semua →
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : latest.length === 0
                ? (
                  <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: '12px', padding: '36px 20px', textAlign: 'center', border: '0.5px solid #e8f0f8' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
                    <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '14px' }}>Belum ada produk</div>
                    <a href="/produk/tambah" onClick={handleJualClick} style={{ background: '#0C447C', color: '#fff', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
                      + Tambah Produk Pertama
                    </a>
                  </div>
                )
                : latest.map((p, i) => (
                  <a
                    key={p.id}
                    href={`/produk/${p.id}`}
                    className="prod-card"
                    style={{
                      background: '#fff', borderRadius: '10px', border: '0.5px solid #e8f0f8',
                      overflow: 'hidden', textDecoration: 'none', display: 'block',
                      animation: 'fadeInUp 0.28s ease both',
                      animationDelay: `${Math.min(i * 50, 250)}ms`,
                    }}
                  >
                    <FotoProduk src={p.foto_url} kategori={p.kategori} height={120} fontSize={40} />
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#333', marginBottom: '4px', height: '32px', overflow: 'hidden' }}>
                        {p.nama}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0C447C', marginBottom: '4px' }}>
                        {fmt(p.harga)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#5a7da0', marginBottom: '6px' }}>
                        <span>⭐ {p.rating || '5.0'}</span>
                        <span>{p.terjual || 0} terjual</span>
                      </div>
                      <div style={{ fontSize: '10px', background: '#E6F1FB', color: '#0C447C', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                        {p.kategori}
                      </div>
                    </div>
                    <div className="prod-card-btn" style={{ background: '#0C447C', color: '#fff', padding: '8px', fontSize: '11px', textAlign: 'center' }}>
                      Lihat Detail
                    </div>
                  </a>
                ))
            }
          </div>
        </div>

        {/* ── Bottom CTA banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0C447C 0%, #185FA5 100%)',
          borderRadius: '16px', padding: '26px 20px',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
          marginBottom: '8px',
        }}>
          <div aria-hidden style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div aria-hidden style={{ position: 'absolute', bottom: '-20px', left: '20px', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>🚀</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
            Punya produk atau jasa?
          </div>
          <p style={{ fontSize: '13px', color: '#B5D4F4', margin: '0 0 18px', lineHeight: '1.6' }}>
            Bergabung dan mulai berjualan ke sesama alumni Superfive secara gratis.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/produk/tambah" onClick={handleJualClick} style={{
              background: '#fff', color: '#0C447C', fontWeight: '700',
              padding: '10px 22px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none',
            }}>
              + Tambah Produk
            </a>
            <a href="/auth" style={{
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '10px 22px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none',
            }}>
              Daftar Sekarang
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '16px 0 8px', fontSize: '11px', color: '#9ab4cc' }}>
          Superfive Market · Alumni SMPN 5 Bandung · Angkatan 1988
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hero-building { display: none !important; }
        }
      `}</style>
    </main>
  )
}
