import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Halaman tidak ditemukan',
}

export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
    }}>
      <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <Image
          src="/LOGO-512.png"
          alt="Superfive Market"
          width={110}
          height={110}
          priority
          style={{ objectFit: 'contain', marginBottom: '20px' }}
        />

        <div style={{
          fontSize: '60px', fontWeight: '800', color: '#0C447C',
          lineHeight: 1, letterSpacing: '-2px', marginBottom: '10px',
        }}>
          404
        </div>

        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>
          Halamannya tidak ketemu
        </h1>

        <p style={{ fontSize: '13px', color: '#5a7da0', lineHeight: 1.65, margin: '0 0 24px' }}>
          Mungkin tautannya sudah berubah, atau produknya sudah tidak dijual lagi.
          Yuk balik ke beranda dan lihat lapak alumni yang lain.
        </p>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn-primary" style={{
            background: '#0C447C', color: '#fff', padding: '0 24px',
            minHeight: '44px', display: 'inline-flex', alignItems: 'center',
            borderRadius: '9px', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
          }}>
            Kembali ke Beranda
          </Link>
          <Link href="/produk" className="btn-primary" style={{
            background: '#fff', color: '#0C447C', border: '1px solid #0C447C',
            padding: '0 24px', minHeight: '44px', display: 'inline-flex', alignItems: 'center',
            borderRadius: '9px', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
          }}>
            Lihat Produk
          </Link>
        </div>
      </div>
    </main>
  )
}
