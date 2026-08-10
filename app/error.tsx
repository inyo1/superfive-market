'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Batas galat untuk seluruh aplikasi. Wajib client component, dan menerima
// reset() dari Next untuk mencoba merender ulang segmen yang gagal tanpa
// memuat ulang seluruh halaman.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Tetap dicatat ke konsol supaya terlihat di Vercel runtime logs
    console.error('Galat tak tertangani:', error)
  }, [error])

  return (
    <main style={{
      minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
    }}>
      <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <Image
          src="/logo.png"
          alt="Superfive Market"
          width={110}
          height={110}
          priority
          style={{ objectFit: 'contain', marginBottom: '20px' }}
        />

        <div style={{ fontSize: '44px', lineHeight: 1, marginBottom: '12px' }}>😵‍💫</div>

        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>
          Aduh, ada yang error
        </h1>

        <p style={{ fontSize: '13px', color: '#5a7da0', lineHeight: 1.65, margin: '0 0 20px' }}>
          Bukan salahmu — ada yang tersendat di sisi kami. Coba muat ulang dulu,
          biasanya langsung beres.
        </p>

        {error.digest && (
          <div style={{
            background: '#fff', border: '0.5px solid #e8f0f8', borderRadius: '8px',
            padding: '8px 12px', marginBottom: '20px',
            fontSize: '11px', color: '#9ab4cc', fontFamily: 'monospace',
          }}>
            Kode galat: {error.digest}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} className="btn-primary" style={{
            background: '#0C447C', color: '#fff', border: 'none', padding: '0 24px',
            minHeight: '44px', display: 'inline-flex', alignItems: 'center',
            borderRadius: '9px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          }}>
            Coba Lagi
          </button>
          <Link href="/" className="btn-primary" style={{
            background: '#fff', color: '#0C447C', border: '1px solid #0C447C',
            padding: '0 24px', minHeight: '44px', display: 'inline-flex', alignItems: 'center',
            borderRadius: '9px', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
          }}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  )
}
