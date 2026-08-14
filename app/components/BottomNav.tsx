'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useCart } from '../context/CartContext'
import { useChatContext } from '../context/ChatContext'

const BIRU = '#0C447C'
const ABU = '#9ab4cc'

// Ikon digambar inline supaya tajam di layar HP dan warnanya bisa ikut state
// aktif. currentColor dipakai supaya cukup mengatur warna di pembungkusnya.
function IkonBeranda({ aktif }: { aktif: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={aktif ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      {aktif && <path d="M10 20v-5h4v5" />}
    </svg>
  )
}

function IkonProduk({ aktif }: { aktif: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={aktif ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  )
}

function IkonKeranjang({ aktif }: { aktif: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={aktif ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.5a2 2 0 002-1.6L21 8H6" />
      <circle cx="10" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </svg>
  )
}

function IkonChat({ aktif }: { aktif: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={aktif ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" />
    </svg>
  )
}

function IkonAkun({ aktif }: { aktif: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={aktif ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0115 0" />
    </svg>
  )
}

function Lencana({ jumlah }: { jumlah: number }) {
  if (jumlah <= 0) return null
  return (
    <span style={{
      position: 'absolute', top: '-4px', right: '-8px',
      background: '#e53935', color: '#fff',
      fontSize: '10px', fontWeight: '700', lineHeight: 1,
      borderRadius: '10px', minWidth: '17px', height: '17px',
      padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1.5px solid #fff',
    }}>
      {jumlah > 99 ? '99+' : jumlah}
    </span>
  )
}

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { totalItem } = useCart()
  const { unreadCount } = useChatContext()

  const [sheetTerbuka, setSheetTerbuka] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function ambilProfil(uid: string) {
      const { data } = await supabase.from('users').select('role').eq('id', uid).single()
      setIsAdmin(data?.role === 'admin')
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) ambilProfil(data.user.id)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) ambilProfil(session.user.id)
      else setIsAdmin(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Tutup sheet setiap kali pindah halaman
  useEffect(() => { setSheetTerbuka(false) }, [pathname])

  function aktif(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  async function keluar() {
    await supabase.auth.signOut()
    setSheetTerbuka(false)
    router.push('/')
  }

  const item = [
    { href: '/', label: 'Beranda', Ikon: IkonBeranda, lencana: 0 },
    { href: '/produk', label: 'Produk', Ikon: IkonProduk, lencana: 0 },
    { href: '/keranjang', label: 'Keranjang', Ikon: IkonKeranjang, lencana: totalItem },
    { href: '/chat', label: 'Chat', Ikon: IkonChat, lencana: unreadCount },
  ]

  // Menu yang tidak punya tab sendiri, dikumpulkan di sheet Akun supaya tetap
  // terjangkau setelah hamburger dihapus dari navbar mobile.
  const menuAkun = user
    ? [
        { href: '/profil', label: 'Profil Saya', ikon: '👤' },
        { href: '/pesanan', label: 'Pesanan Saya', ikon: '🧾' },
        { href: '/toko/saya', label: 'Toko Saya', ikon: '🏪' },
        { href: '/dashboard', label: 'Dashboard Seller', ikon: '📊' },
        { href: '/jual', label: 'Mulai Berjualan', ikon: '💼' },
        { href: '/alumni', label: 'Direktori Alumni', ikon: '🎓' },
        { href: '/about', label: 'Tentang Kami', ikon: 'ℹ️' },
      ]
    : [
        { href: '/alumni', label: 'Direktori Alumni', ikon: '🎓' },
        { href: '/about', label: 'Tentang Kami', ikon: 'ℹ️' },
      ]

  const akunAktif = sheetTerbuka || ['/profil', '/pesanan', '/toko', '/dashboard', '/alumni', '/about', '/admin']
    .some(p => pathname.startsWith(p))

  return (
    <>
      {/* Sheet Akun */}
      {sheetTerbuka && (
        <div
          className="bottomnav-only"
          onClick={() => setSheetTerbuka(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 140 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              background: '#fff', borderRadius: '16px 16px 0 0',
              padding: '8px 12px calc(16px + env(safe-area-inset-bottom))',
              maxHeight: '75vh', overflowY: 'auto',
              animation: 'sheetNaik 0.22s ease both',
            }}
          >
            <div style={{ width: '38px', height: '4px', background: '#dde8f4', borderRadius: '4px', margin: '6px auto 12px' }} />

            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f0f5fb', borderRadius: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #185FA5, #0C447C)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: '700', fontSize: '15px',
                }}>
                  {(user.email ?? '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>Akun Saya</div>
                  <div style={{ fontSize: '11px', color: '#5a7da0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                </div>
              </div>
            )}

            {menuAkun.map(m => (
              <Link
                key={m.href}
                href={m.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '13px 12px', borderRadius: '10px',
                  fontSize: '14px', color: '#1a1a1a', textDecoration: 'none',
                  minHeight: '44px', boxSizing: 'border-box',
                }}
              >
                <span style={{ fontSize: '18px' }}>{m.ikon}</span>
                {m.label}
              </Link>
            ))}

            {isAdmin && (
              <>
                <div style={{ height: '1px', background: '#e8f0f8', margin: '8px 12px' }} />
                <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 12px', borderRadius: '10px', fontSize: '14px', color: '#e65100', fontWeight: '600', textDecoration: 'none', minHeight: '44px', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '18px' }}>⭐</span> Panel Admin
                </Link>
                <Link href="/admin/verifikasi" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 12px', borderRadius: '10px', fontSize: '14px', color: '#e65100', fontWeight: '600', textDecoration: 'none', minHeight: '44px', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '18px' }}>🎓</span> Verifikasi Alumni
                </Link>
              </>
            )}

            <div style={{ height: '1px', background: '#e8f0f8', margin: '8px 12px' }} />

            {user ? (
              <button
                onClick={keluar}
                style={{ width: '100%', background: '#fce4e4', color: '#c62828', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', minHeight: '44px' }}
              >
                Keluar
              </button>
            ) : (
              <Link
                href="/auth"
                style={{ display: 'block', textAlign: 'center', background: BIRU, color: '#fff', padding: '13px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', minHeight: '44px', boxSizing: 'border-box' }}
              >
                Masuk / Daftar
              </Link>
            )}
          </div>
        </div>
      )}

      <nav
        className="bottomnav-only"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 150,
          background: '#fff', borderTop: '0.5px solid #dde8f4',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -1px 8px rgba(12,68,124,0.06)',
        }}
      >
        <div style={{ display: 'flex', height: '56px' }}>
          {item.map(({ href, label, Ikon, lencana }) => {
            const isAktif = aktif(href) && !sheetTerbuka
            return (
              <Link
                key={href}
                href={href}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '3px',
                  textDecoration: 'none', color: isAktif ? BIRU : ABU,
                  minWidth: '44px',
                }}
              >
                <span style={{ position: 'relative', display: 'flex' }}>
                  <Ikon aktif={isAktif} />
                  <Lencana jumlah={lencana} />
                </span>
                <span style={{ fontSize: '10px', fontWeight: isAktif ? '700' : '500', lineHeight: 1 }}>
                  {label}
                </span>
              </Link>
            )
          })}

          <button
            onClick={() => setSheetTerbuka(v => !v)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '3px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: akunAktif ? BIRU : ABU, minWidth: '44px', padding: 0,
            }}
            aria-label="Akun"
            aria-expanded={sheetTerbuka}
          >
            <IkonAkun aktif={akunAktif} />
            <span style={{ fontSize: '10px', fontWeight: akunAktif ? '700' : '500', lineHeight: 1 }}>
              Akun
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
