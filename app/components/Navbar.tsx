'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useCart } from '../context/CartContext'
import { useChatContext } from '../context/ChatContext'
import SearchOverlay from './SearchOverlay'
import { adminPenuh, bolehVerifikasiAlumni } from '../../lib/peran'

const links = [
  { href: '/', label: 'Beranda' },
  { href: '/produk', label: 'Produk' },
  { href: '/alumni', label: 'Alumni' },
  { href: '/about', label: 'Tentang Kami' },
]

const EMAS = '#EF9F27'

// Ikon utilitas digambar inline. Emoji tampil beda-beda antar perangkat dan
// tinggi barisnya ikut berubah, yang bikin baris navbar tidak rata.
function IkonCari() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </svg>
  )
}

function IkonKeranjang() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.5a2 2 0 002-1.6L21 8H6" />
      <circle cx="10" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </svg>
  )
}

function IkonChat() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" />
    </svg>
  )
}

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  // Admin angkatan hanya dapat pintu verifikasi alumni, bukan panel admin
  const [adminAngkatan, setAdminAngkatan] = useState(false)
  const [menungguVerifikasi, setMenungguVerifikasi] = useState(0)
  const [menungguPenjual, setMenungguPenjual] = useState(0)
  const navRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { totalItem } = useCart()
  const { unreadCount } = useChatContext()

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('nama, avatar_url, role')
      .eq('id', userId)
      .single()
    if (data) {
      setUserName(data.nama ?? '')
      setAvatarUrl(data.avatar_url ?? null)
      setIsAdmin(adminPenuh(data.role))
      setAdminAngkatan(data.role === 'admin_angkatan')
      if (bolehVerifikasiAlumni(data.role)) hitungMenunggu()
    }
  }

  // Dua antrean admin yang berbeda, masing-masing punya badge angka sendiri
  async function hitungMenunggu() {
    const [alumni, penjual] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true })
        .eq('status_alumni', 'menunggu'),
      supabase.from('users').select('id', { count: 'exact', head: true })
        .eq('status_penjual', 'menunggu'),
    ])
    setMenungguVerifikasi(alumni.count ?? 0)
    setMenungguPenjual(penjual.count ?? 0)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) fetchProfile(data.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setAvatarUrl(null); setUserName(''); setIsAdmin(false); setMenungguVerifikasi(0); setMenungguPenjual(0) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Tinggi navbar berubah-ubah: satu baris di bawah 1024px, dua baris di atasnya,
  // dan barisnya bisa berganti isi saat login. Diukur lalu diumumkan sebagai
  // --tinggi-navbar supaya elemen sticky lain menempel pas, tanpa angka tetap.
  useEffect(() => {
    const el = navRef.current
    if (!el) return

    function umumkan() {
      const t = el!.getBoundingClientRect().height
      document.documentElement.style.setProperty('--tinggi-navbar', `${Math.round(t)}px`)
    }

    umumkan()
    const ro = new ResizeObserver(umumkan)
    ro.observe(el)
    return () => ro.disconnect()
  }, [user, isAdmin])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  // Menu baris bawah. Item khusus pengguna login ikut menyusul di belakang.
  const menuNavigasi = user
    ? [
        ...links,
        { href: '/pesanan', label: 'Pesanan Saya' },
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/toko/saya', label: 'Toko Saya' },
      ]
    : links

  const initials = userName
    ? userName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.charAt(0).toUpperCase() ?? '?')

  const AvatarCircle = ({ size = 32 }: { size?: number }) => (
    <Link
      href="/profil"
      style={{
        width: `${size}px`, height: `${size}px`, borderRadius: '50%',
        overflow: 'hidden', background: 'linear-gradient(135deg, #185FA5, #0C447C)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid rgba(255,255,255,0.35)', flexShrink: 0,
        textDecoration: 'none',
      }}
      aria-label="Profil"
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt="Profil" width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: `${Math.round(size * 0.4)}px`, fontWeight: '700', color: '#fff', lineHeight: 1 }}>
          {initials}
        </span>
      )}
    </Link>
  )

  const ChatBadge = () => (
    <Link
      href="/chat"
      style={{ position: 'relative', color: '#fff', textDecoration: 'none', lineHeight: 1, minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      aria-label="Chat"
    >
      <IkonChat />
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute', top: '-2px', right: '-6px',
          background: '#e53935', color: '#fff',
          fontSize: '10px', fontWeight: '700',
          borderRadius: '50%', width: '16px', height: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )

  const CartBadge = () => (
    <Link
      href="/keranjang"
      style={{
        position: 'relative', color: '#fff', textDecoration: 'none',
        lineHeight: 1, minWidth: '40px', minHeight: '40px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      aria-label="Keranjang"
    >
      <IkonKeranjang />
      {totalItem > 0 && (
        <span style={{
          position: 'absolute', top: '-2px', right: '-6px',
          background: '#e53935', color: '#fff',
          fontSize: '10px', fontWeight: '700',
          borderRadius: '50%', width: '16px', height: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}>
          {totalItem > 99 ? '99+' : totalItem}
        </span>
      )}
    </Link>
  )

  return (
    <>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <nav ref={navRef} style={{ background: '#0C447C', fontFamily: 'sans-serif', position: 'sticky', top: 0, zIndex: 100 }}>

        {/* ── Baris atas: identitas + utilitas ── */}
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Brand tidak pernah menyusut, jadi namanya tidak mungkin terpotong */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
            <Image src="/LOGO-512.png" alt="Logo" width={56} height={56} priority style={{ objectFit: 'contain', flexShrink: 0 }} />
            <div>
              <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                Superfive Market
              </div>
              <div style={{ color: '#B5D4F4', fontSize: '10px', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                ALUMNI SMPN 5 BANDUNG
              </div>
            </div>
          </Link>

          <div style={{ flex: 1, minWidth: '8px' }} />

          {/* Utilitas desktop */}
          <div className="nav-utilitas" style={{ alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: 'rgba(255,255,255,0.12)', border: 'none',
                color: '#fff', padding: '0 14px', minHeight: '40px', borderRadius: '8px',
                fontSize: '13px', cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              aria-label="Cari"
            >
              <IkonCari /> <span>Cari</span>
            </button>

            <CartBadge />
            {user && <ChatBadge />}

            {user ? (
              <>
                <AvatarCircle size={34} />
                <button
                  onClick={handleLogout}
                  style={{ color: '#fff', fontSize: '12px', background: '#a53018', border: 'none', padding: '0 16px', minHeight: '40px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Keluar
                </button>
              </>
            ) : (
              <Link href="/auth" style={{ color: '#fff', fontSize: '12px', textDecoration: 'none', background: '#185FA5', padding: '0 18px', minHeight: '40px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center' }}>
                Masuk
              </Link>
            )}
          </div>

          {/* Kontrol ringkas di bawah 1024px — sisanya ditangani bottom nav */}
          <div className="nav-ringkas" style={{ alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={() => setSearchOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Cari"
            >
              <IkonCari />
            </button>
            {user && (
              <Link
                href="/chat"
                style={{ position: 'relative', color: '#fff', textDecoration: 'none', borderRadius: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Pesan"
              >
                <IkonChat />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '4px',
                    background: '#e53935', color: '#fff',
                    fontSize: '10px', fontWeight: '700', lineHeight: 1,
                    borderRadius: '10px', minWidth: '16px', height: '16px', padding: '0 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* ── Baris bawah: menu navigasi, hanya >= 1024px ── */}
        <div className="nav-baris-menu">
          <div className="nav-menu-geser" style={{ padding: '0 16px' }}>
            {menuNavigasi.map(m => {
              const aktif = isActive(m.href)
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  aria-current={aktif ? 'page' : undefined}
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    height: '44px', padding: '0 14px', flexShrink: 0,
                    fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap',
                    color: aktif ? '#fff' : '#B5D4F4',
                    fontWeight: aktif ? '600' : '400',
                    // Garis bawah emas, bukan kotak berisi — lebih tenang
                    // untuk deretan menu yang panjang
                    borderBottom: `3px solid ${aktif ? EMAS : 'transparent'}`,
                  }}
                >
                  {m.label}
                </Link>
              )
            })}

            {(isAdmin || adminAngkatan) && (
              <>
                <span aria-hidden style={{ alignSelf: 'center', width: '1px', height: '20px', background: 'rgba(255,255,255,0.18)', margin: '0 6px', flexShrink: 0 }} />
                {isAdmin && (
                <Link
                  href="/admin"
                  aria-current={pathname === '/admin' ? 'page' : undefined}
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    height: '44px', padding: '0 14px', flexShrink: 0,
                    fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap',
                    color: '#ffb74d', fontWeight: '600',
                    borderBottom: `3px solid ${pathname === '/admin' ? EMAS : 'transparent'}`,
                  }}
                >
                  Admin
                </Link>
                )}
                <Link
                  href="/admin/verifikasi"
                  aria-current={pathname.startsWith('/admin/verifikasi') ? 'page' : undefined}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    height: '44px', padding: '0 14px', flexShrink: 0,
                    fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap',
                    color: '#ffb74d', fontWeight: '600',
                    borderBottom: `3px solid ${pathname.startsWith('/admin/verifikasi') ? EMAS : 'transparent'}`,
                  }}
                >
                  Verifikasi Alumni
                  {menungguVerifikasi > 0 && (
                    <span style={{
                      background: '#e53935', color: '#fff', fontSize: '10px', fontWeight: '700',
                      borderRadius: '10px', minWidth: '18px', height: '18px', padding: '0 5px',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}>
                      {menungguVerifikasi > 99 ? '99+' : menungguVerifikasi}
                    </span>
                  )}
                </Link>
                {isAdmin && (
                <Link
                  href="/admin/penjual"
                  aria-current={pathname.startsWith('/admin/penjual') ? 'page' : undefined}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    height: '44px', padding: '0 14px', flexShrink: 0,
                    fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap',
                    color: '#ffb74d', fontWeight: '600',
                    borderBottom: `3px solid ${pathname.startsWith('/admin/penjual') ? EMAS : 'transparent'}`,
                  }}
                >
                  Pengajuan Penjual
                  {menungguPenjual > 0 && (
                    <span style={{
                      background: '#e53935', color: '#fff', fontSize: '10px', fontWeight: '700',
                      borderRadius: '10px', minWidth: '18px', height: '18px', padding: '0 5px',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}>
                      {menungguPenjual > 99 ? '99+' : menungguPenjual}
                    </span>
                  )}
                </Link>
                )}
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
