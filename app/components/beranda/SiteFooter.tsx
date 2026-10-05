import Link from 'next/link'
import Image from 'next/image'

// Footer beranda. Hanya memuat rute yang memang ada — tidak ada FAQ,
// kebijakan privasi, syarat & ketentuan, maupun akun media sosial resmi di
// project ini, jadi tautannya juga tidak ada. Menambah halaman itu nanti
// berarti menambah barisnya di sini, bukan sebaliknya.

const MENU = [
  { href: '/', label: 'Beranda' },
  { href: '/produk', label: 'Produk' },
  { href: '/alumni', label: 'Alumni' },
  { href: '/about', label: 'Tentang Kami' },
]

const BANTUAN = [
  { href: '/jual', label: 'Mulai Berjualan' },
  { href: '/alumni', label: 'Direktori Alumni' },
  { href: '/about', label: 'Tentang Superfive' },
]

export default function SiteFooter() {
  return (
    <footer className="b-footer">
      <div className="b-wadah">
        <div className="b-footer-grid">
          <div>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
              <Image src="/LOGO-512.png" alt="" width={52} height={52} style={{ objectFit: 'contain' }} />
              <span>
                <span style={{ display: 'block', fontSize: '18px', fontWeight: 700, color: '#fff' }}>Superfive Market</span>
                <span style={{ display: 'block', fontSize: '11px', letterSpacing: '1.2px', color: '#A9CBEB', marginTop: '2px' }}>ALUMNI SMPN 5 BANDUNG</span>
              </span>
            </Link>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#A9CBEB', margin: '16px 0 0', maxWidth: '320px' }}>
              Belanja, berjualan, dan berkembang bersama keluarga besar Superfive.
            </p>
          </div>

          <nav aria-label="Menu footer">
            <h2 className="b-footer-judul">Menu</h2>
            <ul role="list">
              {MENU.map(m => <li key={m.href}><Link href={m.href}>{m.label}</Link></li>)}
            </ul>
          </nav>

          <nav aria-label="Bantuan">
            <h2 className="b-footer-judul">Bantuan</h2>
            <ul role="list">
              {BANTUAN.map(m => <li key={m.label}><Link href={m.href}>{m.label}</Link></li>)}
            </ul>
          </nav>

          <div className="b-footer-pesan">
            {/* Label dengan gaya judul kolom, supaya baris pertama keempat
                kolom sejajar */}
            <p className="b-footer-judul" style={{ color: '#A9CBEB' }}>Superfive</p>
            <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
              Satu Keluarga<br />Selamanya
            </p>
            <i aria-hidden style={{ display: 'block', width: '48px', height: '3px', borderRadius: '2px', background: 'var(--sf-emas)', marginTop: '12px' }} />
          </div>
        </div>

        <div className="b-footer-bawah">
          © {new Date().getFullYear()} Superfive Market · Alumni SMPN 5 Bandung · Angkatan 1988
        </div>
      </div>
    </footer>
  )
}
