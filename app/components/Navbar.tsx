'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useCart } from '../context/CartContext'
import { useChatContext } from '../context/ChatContext'
import SearchOverlay from './SearchOverlay'

const links = [
  { href: '/', label: 'Beranda' },
  { href: '/produk', label: 'Produk' },
  { href: '/alumni', label: 'Alumni' },
  { href: '/about', label: 'Tentang Kami' },
]

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [menungguVerifikasi, setMenungguVerifikasi] = useState(0)
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
      setIsAdmin(data.role === 'admin')
      if (data.role === 'admin') hitungMenunggu()
    }
  }

  // Jumlah pendaftar yang menunggu verifikasi, dipakai jadi badge angka
  async function hitungMenunggu() {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('status_verifikasi', 'menunggu')
    setMenungguVerifikasi(count ?? 0)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) fetchProfile(data.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setAvatarUrl(null); setUserName(''); setIsAdmin(false); setMenungguVerifikasi(0) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  const initials = userName
    ? userName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.charAt(0).toUpperCase() ?? '?')

  const AvatarCircle = ({ size = 32 }: { size?: number }) => (
    <a
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
        <img src={avatarUrl} alt="Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: `${Math.round(size * 0.4)}px`, fontWeight: '700', color: '#fff', lineHeight: 1 }}>
          {initials}
        </span>
      )}
    </a>
  )

  const ChatBadge = ({ size = 20 }: { size?: number }) => (
    <a
      href="/chat"
      style={{ position: 'relative', color: '#fff', textDecoration: 'none', fontSize: `${size}px`, lineHeight: 1, padding: '4px 2px', display: 'flex', alignItems: 'center' }}
      aria-label="Chat"
    >
      💬
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
    </a>
  )

  const CartBadge = ({ size = 20 }: { size?: number }) => (
    <a
      href="/keranjang"
      style={{
        position: 'relative', color: '#fff', textDecoration: 'none',
        fontSize: `${size}px`, lineHeight: 1, padding: '4px 2px',
        display: 'flex', alignItems: 'center',
      }}
      aria-label="Keranjang"
    >
      🛒
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
    </a>
  )

  return (
    <>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <nav style={{ background: '#0C447C', fontFamily: 'sans-serif', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Top bar */}
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flex: 1, minWidth: 0 }}>
            <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Superfive Market</div>
              <div style={{ color: '#B5D4F4', fontSize: '10px', letterSpacing: '1px' }}>ALUMNI SMPN 5 BANDUNG</div>
            </div>
          </a>

          {/* ── Desktop links ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="nav-desktop">
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                style={{
                  color: isActive(l.href) ? '#fff' : '#B5D4F4',
                  fontSize: '13px', textDecoration: 'none',
                  padding: '6px 12px', borderRadius: '6px',
                  background: isActive(l.href) ? 'rgba(255,255,255,0.15)' : 'transparent',
                  fontWeight: isActive(l.href) ? '500' : '400',
                }}
              >
                {l.label}
              </a>
            ))}
            {user && (
              <a href="/pesanan" style={{
                color: isActive('/pesanan') ? '#fff' : '#B5D4F4',
                fontSize: '12px', marginLeft: '4px', textDecoration: 'none',
                padding: '6px 10px', borderRadius: '6px',
                background: isActive('/pesanan') ? 'rgba(255,255,255,0.15)' : 'transparent',
              }}>
                🧾 Pesanan Saya
              </a>
            )}
            {user && (
              <a href="/dashboard" style={{ color: '#B5D4F4', fontSize: '12px', textDecoration: 'none', padding: '6px 10px', borderRadius: '6px' }}>
                Dashboard
              </a>
            )}
            {user && (
              <a href="/toko/saya" style={{ color: '#B5D4F4', fontSize: '12px', textDecoration: 'none', padding: '6px 10px', borderRadius: '6px' }}>
                🏪 Toko Saya
              </a>
            )}
            {isAdmin && (
              <a href="/admin" style={{
                color: '#fff', fontSize: '12px', marginLeft: '2px', textDecoration: 'none',
                padding: '5px 10px', borderRadius: '6px',
                background: '#e65100', fontWeight: '600',
              }}>
                ⭐ Admin
              </a>
            )}
            {isAdmin && (
              <a href="/admin/verifikasi" style={{
                position: 'relative', color: '#fff', fontSize: '12px', textDecoration: 'none',
                padding: '5px 10px', borderRadius: '6px',
                background: 'rgba(230,81,0,0.35)', fontWeight: '600',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                🎓 Verifikasi
                {menungguVerifikasi > 0 && (
                  <span style={{
                    background: '#e53935', color: '#fff', fontSize: '10px', fontWeight: '700',
                    borderRadius: '10px', minWidth: '18px', height: '18px', padding: '0 5px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                  }}>
                    {menungguVerifikasi > 99 ? '99+' : menungguVerifikasi}
                  </span>
                )}
              </a>
            )}

            {/* Search button — desktop */}
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.12)', border: 'none',
                color: '#fff', padding: '6px 12px', borderRadius: '6px',
                fontSize: '13px', cursor: 'pointer', marginLeft: '6px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              aria-label="Cari"
            >
              🔍 <span>Cari</span>
            </button>

            <CartBadge size={20} />
            {user && <ChatBadge size={20} />}
            {/* Auth */}
            {user ? (
              <>
                <AvatarCircle size={32} />
                <button
                  onClick={handleLogout}
                  style={{ color: '#fff', fontSize: '12px', background: '#a53018', border: 'none', padding: '6px 14px', borderRadius: '6px', marginLeft: '2px', cursor: 'pointer' }}
                >
                  Keluar
                </button>
              </>
            ) : (
              <a href="/auth" style={{ color: '#fff', fontSize: '12px', textDecoration: 'none', background: '#185FA5', padding: '6px 14px', borderRadius: '6px', marginLeft: '6px' }}>
                Masuk
              </a>
            )}
          </div>

          {/* ── Kontrol mobile: cari + notifikasi ──
              Navigasi utama sudah pindah ke bottom nav, jadi hamburger dihapus
              supaya menunya tidak dobel. Sisa menu ada di sheet Akun. */}
          <div className="nav-hamburger" style={{ display: 'none', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setSearchOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '20px', lineHeight: 1, borderRadius: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Cari"
            >
              🔍
            </button>
            {user && (
              <a
                href="/chat"
                style={{ position: 'relative', color: '#fff', textDecoration: 'none', fontSize: '20px', lineHeight: 1, borderRadius: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Notifikasi pesan"
              >
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '6px',
                    background: '#e53935', color: '#fff',
                    fontSize: '10px', fontWeight: '700', lineHeight: 1,
                    borderRadius: '10px', minWidth: '16px', height: '16px', padding: '0 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </a>
            )}
          </div>
        </div>

        {/* Ambang 767px disamakan dengan bottom nav, supaya tidak ada lebar
            layar yang menampilkan navbar desktop dan bottom nav sekaligus */}
        <style>{`
          @media (max-width: 767px) {
            .nav-desktop { display: none !important; }
            .nav-hamburger { display: flex !important; }
          }
        `}</style>
      </nav>
    </>
  )
}
