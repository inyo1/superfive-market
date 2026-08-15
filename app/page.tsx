'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Navbar from './components/Navbar'
import FotoProduk from './components/FotoProduk'
import SkeletonCard from './components/SkeletonCard'
import SectionOfficial from './components/SectionOfficial'
import BadgePreorder, { WARNA_PO_TUA } from './components/BadgePreorder'
import { janjiKirim } from '../lib/preorder'
import { KATEGORI, EMOJI_KATEGORI } from '../lib/kategori'

type Produk = {
  id: string
  nama: string
  harga: number
  kategori: string
  foto_url?: string | null
  terjual: number
  is_preorder: boolean
  po_janji_kirim: string | null
  rating: number
  toko: { nama_toko: string } | null
}

type Stats = { produk: number; toko: number; alumni: number }


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

// Ikon statistik digambar inline sebagai SVG garis, bukan emoji. Emoji
// dirender lain-lain di tiap sistem operasi dan warnanya tidak bisa diatur —
// "🏪" misalnya muncul sebagai minimarket lengkap dengan tulisan 24H, yang
// sama sekali bukan toko alumni. Ini juga sebabnya tidak ada pustaka ikon
// ditambahkan: tiga bentuk sederhana tidak sepadan dengan satu dependensi.

const IKON = {
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
  stroke: 'currentColor',
  // 18px, bukan 24: susunannya mendatar sekarang, jadi ikon ikut menentukan
  // tinggi baris — dan barisnya memang harus pendek
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

/** Paket sederhana — kotak dengan lipatan tutup dan sambungan tengah */
function IkonProduk() {
  return (
    <svg {...IKON}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
      <path d="m3 7.5 9 4.5 9-4.5" />
      <path d="M12 12v9" />
    </svg>
  )
}

/** Etalase toko — atap tenda dan pintu, tanpa tulisan apa pun */
function IkonToko() {
  return (
    <svg {...IKON}>
      <path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
      <path d="M3 10 4.7 5.3a1 1 0 0 1 .95-.65h12.7a1 1 0 0 1 .95.65L21 10Z" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  )
}

/** Topi wisuda */
function IkonAlumni() {
  return (
    <svg {...IKON}>
      <path d="M12 3.5 2.5 8.2 12 13l9.5-4.8L12 3.5Z" />
      <path d="M6.5 10.6V15c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.4" />
      <path d="M21.5 8.2v5" />
    </svg>
  )
}

/** Pemisah antar statistik. Titik, bukan garis vertikal — garis membagi
 *  barisnya jadi kolom yang terasa kaku, titik hanya memberi jeda. */
function Titik() {
  return (
    <span aria-hidden style={{ color: '#c5d9ef', fontSize: '13px', lineHeight: 1, flexShrink: 0 }}>
      ·
    </span>
  )
}

// Satu statistik dalam SATU BARIS mendatar: [ikon] 6 Produk.
//
// Sebelumnya menumpuk tiga tingkat, dan tinggi sectionnya jadi tidak bisa
// turun berapa pun paddingnya dikecilkan — susunannya yang menahan, bukan
// jaraknya. Mendatar, ketiganya cukup satu tinggi baris.
function Statistik({ label, value, ikon }: { label: string; value: number; ikon: React.ReactNode }) {
  const count = useCountUp(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
      <span style={{ color: '#8fb3d4', lineHeight: 0, flexShrink: 0 }}>{ikon}</span>
      <span style={{
        fontSize: '19px', fontWeight: '800', color: '#0C447C',
        lineHeight: 1, letterSpacing: '-0.3px',
        // Angka berubah selama animasi hitung naik; tabular-nums menjaga
        // lebarnya tetap supaya barisnya tidak bergeser-geser
        fontVariantNumeric: 'tabular-nums',
      }}>
        {count}
      </span>
      {/* Di layar tersempit label disembunyikan lewat CSS — ikon dan angkanya
          sudah cukup, dan itu lebih baik daripada tiga kolom yang berdesakan */}
      <span className="stat-label" style={{
        fontSize: '13px', color: '#5a7da0', lineHeight: 1,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ produk: 0, toko: 0, alumni: 0 })
  const [latest, setLatest] = useState<Produk[]>([])
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)

  // Tujuannya bergantung status login, jadi ini tombol aksi — bukan tautan.
  // Sebelumnya <a href> dengan preventDefault, yang menyesatkan pembaca layar
  // karena href-nya tidak pernah benar-benar dipakai.
  function handleJualClick() {
    router.push(loggedIn ? '/produk/tambah' : '/auth')
  }

  useEffect(() => {
    async function load() {
      const [authRes, pCount, tCount, uCount, latestRes] = await Promise.all([
        supabase.auth.getUser(),
        // Hitungan polos, TANPA penyaring apa pun. Angka di hero menjawab
        // "seberapa ramai Superfive", jadi merchandise resmi ikut — dulu
        // dikecualikan dengan `.eq('toko.is_official', false)` mengikuti
        // etalase umum, dan akibatnya hero menampilkan 1 PRODUK padahal ada 6.
        //
        // Yang menentukan apa yang boleh terlihat sudah RLS (produk dan toko
        // hanya tampil kalau penjualnya aktif), jadi count polos ke tabelnya
        // memang sudah angka yang benar. Jangan menyaring lagi di sini.
        supabase.from('produk').select('*', { count: 'exact', head: true }),
        supabase.from('toko').select('*', { count: 'exact', head: true }),
        // Hitung dari view publik — tabel users tidak lagi bisa dibaca umum,
        // kalau tetap dari sana angkanya jadi 0 untuk pengunjung. Tidak perlu
        // disaring lagi: view-nya sudah hanya berisi alumni terverifikasi yang
        // aktif dan bukan akun institusi, sama persis dengan isi direktori.
        supabase.from('alumni_publik')
          .select('*', { count: 'exact', head: true }),
        supabase.from('produk')
          .select('id, nama, harga, kategori, foto_url, terjual, rating, is_preorder, po_janji_kirim, toko!inner(nama_toko, is_official)')
          .eq('toko.is_official', false)
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

      {/* Banner verifikasi sengaja tidak ada di sini. Sejak pembeli tidak lagi
          diperiksa, banner itu akan menyala untuk hampir semua orang yang baru
          daftar — padahal tidak ada satu pun yang terhalang. Ajakannya cukup
          sekali, di halaman profil. */}

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
          {/* Persegi, tanpa borderRadius: logo Superfive punya sudut yang ikut
              terpangkas kalau kotaknya dibulatkan. objectFit 'contain' menjaga
              seluruh logo tetap masuk tanpa terpotong. */}
          <Image
            src="/LOGO-512.png" alt="Superfive Market"
            width={120} height={120} priority
            style={{ objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.28))' }}
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
            <Link href="/auth" style={{
              background: '#fff', color: '#0C447C',
              padding: '0 22px', minHeight: '44px', display: 'inline-flex', alignItems: 'center', borderRadius: '9px',
              fontSize: '13px', fontWeight: '700', textDecoration: 'none',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              MASUK
            </Link>
            <Link href="/auth" style={{
              background: 'rgba(255,255,255,0.14)', color: '#fff',
              padding: '0 22px', minHeight: '44px', display: 'inline-flex', alignItems: 'center', borderRadius: '9px',
              fontSize: '13px', fontWeight: '600', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.28)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              DAFTAR SEKARANG
            </Link>
          </div>
        )}

        {/* Foto gedung SMPN 5 — desktop only, blends with hero gradient */}
        <div
          className="hero-building"
          aria-hidden
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: '50%', pointerEvents: 'none', overflow: 'hidden',
          }}
        >
          <Image
            src="/smpn5-hero.png"
            alt=""
            fill
            sizes="50vw"
            style={{
              objectFit: 'cover', objectPosition: 'center',
              mixBlendMode: 'luminosity',
              opacity: 0.28,
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 30%, black 60%)',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 30%, black 60%)',
            }}
          />
        </div>
      </div>

      {/* ── Statistik ──
          Satu baris pendek tepat di bawah hero. Latar putih polos, dibatasi
          satu garis tipis di bawahnya — bukan kotak berlatar yang mengurung
          ketiganya.

          Pemisahnya titik tengah, bukan garis vertikal: garis membagi jadi
          kolom-kolom yang terasa kaku, titik hanya memberi jeda.

          Tetap tiga sejajar di HP — `flex` tanpa `flexWrap`. Labelnya yang
          menyingkir duluan kalau layarnya sangat sempit, bukan susunannya. */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #eef3f8' }}>
        <div style={{
          maxWidth: '700px', margin: '0 auto', padding: '0 16px',
          minHeight: '68px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '14px',
        }}>
          <Statistik label="Produk" value={stats.produk} ikon={<IkonProduk />} />
          <Titik />
          <Statistik label="Toko"   value={stats.toko}   ikon={<IkonToko />} />
          <Titik />
          <Statistik label="Alumni" value={stats.alumni} ikon={<IkonAlumni />} />
        </div>
      </div>

      {/* ── Official Merchandise INILIMA ── */}
      <SectionOfficial />

      <div style={{ padding: '20px 16px', maxWidth: '700px', margin: '0 auto' }}>

        {/* ── CTA navigasi ── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <Link href="/produk" style={{
            flex: 1, background: '#0C447C', color: '#fff',
            padding: '12px', borderRadius: '9px', textAlign: 'center',
            fontSize: '13px', fontWeight: '700', textDecoration: 'none',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            JELAJAHI PRODUK
          </Link>
          <button onClick={handleJualClick} style={{
            flex: 1, background: '#fff', color: '#0C447C',
            border: '1.5px solid #0C447C',
            padding: '12px', borderRadius: '9px', textAlign: 'center',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            minHeight: '44px',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            MULAI BERJUALAN
          </button>
        </div>

        {/* ── Kategori Shortcuts ── */}
        <div style={{ marginBottom: '26px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a', marginBottom: '12px' }}>
            Belanja per Kategori
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {KATEGORI.map((k, i) => (
              <Link
                key={k}
                href={`/produk?kategori=${encodeURIComponent(k)}`}
                className="prod-card"
                style={{
                  background: '#fff', border: '0.5px solid #e8f0f8', borderRadius: '12px',
                  padding: '14px 8px', textAlign: 'center', textDecoration: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  animation: 'fadeInUp 0.28s ease both',
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <span style={{ fontSize: '26px', lineHeight: 1 }}>{EMOJI_KATEGORI[k]}</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#444' }}>{k}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Produk Terbaru ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>Produk Terbaru</div>
            <Link href="/produk" style={{ fontSize: '12px', color: '#0C447C', textDecoration: 'none', fontWeight: '600', minHeight: '44px', display: 'inline-flex', alignItems: 'center', padding: '0 4px' }}>
              Lihat Semua →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : latest.length === 0
                ? (
                  <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: '12px', padding: '36px 20px', textAlign: 'center', border: '0.5px solid #e8f0f8' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
                    <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '14px' }}>Belum ada produk</div>
                    <button onClick={handleJualClick} style={{ background: '#0C447C', color: '#fff', border: 'none', padding: '0 20px', minHeight: '44px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      + Tambah Produk Pertama
                    </button>
                  </div>
                )
                : latest.map((p, i) => (
                  <Link
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
                    <div style={{ position: 'relative' }}>
                      <BadgePreorder aktif={p.is_preorder} bentuk="pita" />
                      <FotoProduk src={p.foto_url} kategori={p.kategori} height={120} fontSize={40} />
                    </div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#333', marginBottom: '4px', height: '32px', overflow: 'hidden' }}>
                        {p.nama}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0C447C', marginBottom: '4px' }}>
                        {fmt(p.harga)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#5a7da0', marginBottom: '6px' }}>
                        <span>⭐ {p.rating || '5.0'}</span>
                        {/* Stok produk PO selalu 0 karena trg_kurangi_stok
                            sengaja melewatinya — kalau ditampilkan akan
                            terbaca habis padahal PO-nya sedang buka */}
                        <span>{p.is_preorder ? 'Pre-Order' : `${p.terjual || 0} terjual`}</span>
                      </div>
                      {p.is_preorder && p.po_janji_kirim && (
                        <div style={{ fontSize: '10px', color: WARNA_PO_TUA, marginBottom: '6px', lineHeight: 1.5 }}>
                          🚚 {janjiKirim(p.po_janji_kirim)}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', background: '#E6F1FB', color: '#0C447C', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                        {p.kategori}
                      </div>
                    </div>
                    <div className="prod-card-btn" style={{ background: '#0C447C', color: '#fff', padding: '8px', fontSize: '11px', textAlign: 'center' }}>
                      Lihat Detail
                    </div>
                  </Link>
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
            <button onClick={handleJualClick} style={{
              background: '#fff', color: '#0C447C', fontWeight: '700', border: 'none',
              padding: '0 22px', minHeight: '44px', display: 'inline-flex', alignItems: 'center', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
            }}>
              + Tambah Produk
            </button>
            <Link href="/auth" style={{
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0 22px', minHeight: '44px', display: 'inline-flex', alignItems: 'center', borderRadius: '8px', fontSize: '13px', textDecoration: 'none',
            }}>
              Daftar Sekarang
            </Link>
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
