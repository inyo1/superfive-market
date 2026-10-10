'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useChatContext } from '../context/ChatContext'
import SearchOverlay from './SearchOverlay'
import { adminPenuh, bolehVerifikasiAlumni } from '../../lib/peran'

const links = [
  { href: '/', label: 'Beranda' },
  { href: '/produk', label: 'Produk' },
  { href: '/alumni', label: 'Alumni' },
  { href: '/about', label: 'Tentang Kami' },
]

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

function IkonChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" />
    </svg>
  )
}

function IkonTambahOrang() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  )
}

// Tujuan tombol Gabung Alumni untuk pengunjung: pendaftaran yang sudah ada.
// Pilihan "Saya alumni" SENGAJA tidak dipilihkan (lihat /auth — tanpa nilai
// awal supaya tidak ada yang tercatat alumni karena tidak pernah memilih);
// yang dipakai hanya ?msg=, kotak info yang memang sudah ada di /auth.
const DAFTAR_ALUMNI = '/auth?mode=daftar&msg=' + encodeURIComponent('Pilih "Saya alumni SMPN 5 Bandung" saat mendaftar untuk bergabung sebagai alumni.')

function IkonPanahBawah() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  // Sesi belum diketahui sampai getUser() selesai. Selama itu area akun
  // tidak dirender sama sekali — dulu pengguna yang sudah login sempat
  // melihat tombol Masuk sekejap.
  const [sesiSiap, setSesiSiap] = useState(false)
  // Status alumni milik sendiri, untuk CTA Gabung Alumni. null = profil
  // belum termuat (CTA disembunyikan dulu, bukan ditebak).
  const [statusAlumni, setStatusAlumni] = useState<string | null>(null)
  const [institusi, setInstitusi] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  // Admin angkatan hanya dapat pintu verifikasi alumni, bukan panel admin
  const [adminAngkatan, setAdminAngkatan] = useState(false)
  const [menungguPenjual, setMenungguPenjual] = useState(0)
  const [menuAkun, setMenuAkun] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const akunRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { unreadCount } = useChatContext()

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('nama, avatar_url, role, status_alumni, is_institusi')
      .eq('id', userId)
      .single()
    if (data) {
      setStatusAlumni(data.status_alumni ?? 'umum')
      setInstitusi(Boolean(data.is_institusi))
      setUserName(data.nama ?? '')
      setAvatarUrl(data.avatar_url ?? null)
      setIsAdmin(adminPenuh(data.role))
      setAdminAngkatan(data.role === 'admin_angkatan')
      if (bolehVerifikasiAlumni(data.role)) hitungMenunggu()
    }
  }

  // Hanya antrean penjual yang masih punya badge. Alumni tidak lagi mengantre
  // — ajukan_alumni() langsung memberi status — jadi hitungan 'menunggu' di
  // sana hanya sisa data lama yang akan menyala selamanya tanpa bisa
  // diselesaikan dari panel mana pun.
  async function hitungMenunggu() {
    const { count } = await supabase.from('users').select('id', { count: 'exact', head: true })
      .eq('status_penjual', 'menunggu')
    setMenungguPenjual(count ?? 0)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setSesiSiap(true)
      if (data.user) fetchProfile(data.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      setSesiSiap(true)
      if (session?.user) fetchProfile(session.user.id)
      else { setAvatarUrl(null); setUserName(''); setIsAdmin(false); setMenungguPenjual(0); setStatusAlumni(null); setInstitusi(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Tinggi navbar diukur lalu diumumkan sebagai --tinggi-navbar supaya
  // elemen sticky lain (header chat) menempel pas, tanpa angka tetap.
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

  // Menu akun: tutup saat klik di luar atau Escape. Memilih tautannya
  // menutup lewat onClick di panelnya.
  useEffect(() => {
    if (!menuAkun) return
    function luar(e: MouseEvent) {
      if (akunRef.current && !akunRef.current.contains(e.target as Node)) setMenuAkun(false)
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuAkun(false)
        akunRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', luar)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', luar)
      document.removeEventListener('keydown', esc)
    }
  }, [menuAkun])


  async function handleLogout() {
    setMenuAkun(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  // Ke mana Gabung Alumni membawa orang — null berarti tombolnya tidak ada.
  //   pengunjung                  → pendaftaran akun (/auth?mode=daftar)
  //   login, status umum/menunggu → /verifikasi, alur alumni yang berlaku
  //   alumni, ditolak, institusi  → tidak ada (ditolak sudah diputus
  //                                 pengurus; institusi bukan perorangan)
  // Selama sesi atau profil belum termuat, juga null — lebih baik tombolnya
  // muncul belakangan daripada salah tampil lalu hilang. Di /auth dan
  // /verifikasi sendiri tombolnya juga tidak ada: orangnya sudah di tujuan.
  const diTujuan = pathname.startsWith('/auth') || pathname.startsWith('/verifikasi')
  const tujuanGabung: string | null = !sesiSiap || diTujuan
    ? null
    : !user
      ? DAFTAR_ALUMNI
      : statusAlumni !== null && !institusi && (statusAlumni === 'umum' || statusAlumni === 'menunggu')
        ? '/verifikasi'
        : null
  const tampilMasuk = sesiSiap && !user
  const adaAksi = Boolean(tujuanGabung) || tampilMasuk

  const initials = userName
    ? userName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.charAt(0).toUpperCase() ?? '?')


  // Isi menu akun. Dashboard dan Toko Saya dulu duduk di baris menu kedua;
  // sejak navbar jadi satu baris, keduanya pindah ke sini bersama tautan
  // pengurus — tujuannya sama, hanya pintunya yang berpindah.
  const menuSaya = [
    { href: '/profil', label: 'Profil Saya' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/toko/saya', label: 'Toko Saya' },
  ]

  return (
    <>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <nav ref={navRef} className="nav-utama" aria-label="Navigasi utama">
        <div className="nav-dalam">

          {/* Brand tidak pernah menyusut, jadi namanya tidak mungkin terpotong */}
          <Link href="/" className="nav-brand" aria-label="Superfive Market — Beranda">
            <Image src="/LOGO-512.png" alt="" width={54} height={54} priority style={{ objectFit: 'contain', flexShrink: 0 }} />
            <span className="nav-brand-teks">
              <span style={{ display: 'block', color: '#fff', fontSize: '17px', fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1.2, letterSpacing: '-0.2px' }}>
                Superfive Market
              </span>
              <span style={{ display: 'block', color: '#A9CBEB', fontSize: '10px', letterSpacing: '1.2px', whiteSpace: 'nowrap', marginTop: '2px' }}>
                ALUMNI SMPN 5 BANDUNG
              </span>
            </span>
          </Link>

          {/* Menu utama — hanya >= 1024px; di bawahnya ditangani bottom nav */}
          <ul className="nav-menu" role="list">
            {links.map(m => {
              const aktif = isActive(m.href)
              return (
                <li key={m.href}>
                  <Link href={m.href} aria-current={aktif ? 'page' : undefined} className={`nav-tautan${aktif ? ' aktif' : ''}`}>
                    {m.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Kolom cari panjang dihapus (Oktober 2026) supaya CTA Gabung
              Alumni punya ruang. Pencarian tetap ada: hero beranda, /produk,
              dan ikon ini — yang membuka SearchOverlay yang sama seperti
              kolom lama. Tidak ada logika cari kedua. */}
          <div style={{ flex: 1 }} className="nav-pengisi" />

          {/* Utilitas desktop */}
          <div className="nav-utilitas" style={{ alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button type="button" className="nav-ikon nav-ikon-cari" onClick={() => setSearchOpen(true)} aria-label="Cari produk, jasa, atau usaha alumni">
              <IkonCari />
            </button>
            {/* Ikon keranjang dihapus di mode katalog — lihat lib/config.ts */}
            {/* Gabung Alumni + Masuk: satu kelompok, lebar mengikuti isi */}
            {adaAksi && (
              <div className="nav-aksi">
                {tujuanGabung && (
                  <Link href={tujuanGabung} className="nav-gabung">
                    <IkonTambahOrang /> Gabung Alumni
                  </Link>
                )}
                {tampilMasuk && <Link href="/auth?mode=masuk" className="nav-masuk">Masuk</Link>}
              </div>
            )}

            {user && (
              <Link href="/chat" className="nav-ikon" aria-label={unreadCount > 0 ? `Chat, ${unreadCount} pesan belum dibaca` : 'Chat'}>
                <IkonChat />
                {unreadCount > 0 && (
                  <span className="nav-lencana">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            )}

            {user ? (
              <div ref={akunRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="nav-akun"
                  onClick={() => setMenuAkun(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuAkun}
                  aria-label="Menu akun"
                >
                  <span style={{ position: 'relative', display: 'flex' }}>
                    <Avatar size={36} url={avatarUrl} inisial={initials} />
                    {isAdmin && menungguPenjual > 0 && <span className="nav-titik" aria-hidden />}
                  </span>
                  <IkonPanahBawah />
                </button>

                {menuAkun && (
                  <div
                    className="nav-dropdown" role="menu" aria-label="Menu akun"
                    onClick={e => { if ((e.target as HTMLElement).closest('a')) setMenuAkun(false) }}
                  >
                    <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #EAF4FC' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#092D52', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {userName || 'Akun Saya'}
                      </div>
                      {user?.email && (
                        <div style={{ fontSize: '12px', color: '#617B95', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                          {user.email}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '6px' }}>
                      {menuSaya.map(m => (
                        <Link key={m.href} href={m.href} role="menuitem" className="nav-dropdown-item">{m.label}</Link>
                      ))}
                    </div>

                    {(isAdmin || adminAngkatan) && (
                      <div style={{ padding: '6px', borderTop: '1px solid #EAF4FC' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.8px', color: '#9a6b00', padding: '6px 10px 4px' }}>
                          PENGURUS
                        </div>
                        {isAdmin && <Link href="/admin" role="menuitem" className="nav-dropdown-item">Admin</Link>}
                        <Link href="/admin/verifikasi" role="menuitem" className="nav-dropdown-item">Alumni Terbaru</Link>
                        {isAdmin && (
                          <Link href="/admin/penjual" role="menuitem" className="nav-dropdown-item">
                            Pengajuan Penjual
                            {menungguPenjual > 0 && (
                              <span className="nav-lencana" style={{ position: 'static', marginLeft: 'auto' }}>
                                {menungguPenjual > 99 ? '99+' : menungguPenjual}
                              </span>
                            )}
                          </Link>
                        )}
                      </div>
                    )}

                    <div style={{ padding: '6px', borderTop: '1px solid #EAF4FC' }}>
                      <button type="button" role="menuitem" onClick={handleLogout} className="nav-dropdown-item" style={{ color: '#b3261e' }}>
                        Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Kontrol ringkas di bawah 1024px — sisanya ditangani bottom nav */}
          <div className={`nav-ringkas${!sesiSiap || adaAksi ? ' ada-aksi' : ''}`} style={{ alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              type="button"
              className="nav-ringkas-cari"
              onClick={() => setSearchOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Cari"
            >
              <IkonCari />
            </button>
            {/* HP: Gabung + Masuk versi ringkas. Di layar <= 479px ikon cari
                menyingkir selama kelompok ini tampil (pencarian tetap di hero
                dan /produk) — lihat globals.css */}
            {adaAksi && (
              <div className="nav-aksi">
                {tujuanGabung && (
                  <Link href={tujuanGabung} className="nav-gabung nav-gabung-ringkas" aria-label="Gabung Alumni">
                    <IkonTambahOrang /> <span>Gabung</span>
                  </Link>
                )}
                {tampilMasuk && <Link href="/auth?mode=masuk" className="nav-masuk nav-masuk-ringkas">Masuk</Link>}
              </div>
            )}
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
      </nav>
    </>
  )
}

function Avatar({ size, url, inisial }: { size: number; url: string | null; inisial: string }) {
  return (
    <span style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      overflow: 'hidden', background: 'linear-gradient(135deg, #087EF5, #07589F)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0,
    }}>
      {url ? (
        <Image src={url} alt="" width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: `${Math.round(size * 0.38)}px`, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
          {inisial}
        </span>
      )}
    </span>
  )
}
