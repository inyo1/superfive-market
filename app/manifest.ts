import type { MetadataRoute } from 'next'

// Disajikan Next di /manifest.webmanifest. Dibuat lewat file TypeScript,
// bukan JSON statis, supaya tetap ikut type-check kalau strukturnya berubah.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Superfive Market — Ekosistem Bisnis Alumni SMPN 5 Bandung',
    short_name: 'Superfive',
    description:
      'Ekosistem bisnis alumni SMPN 5 Bandung. Belanja produk alumni, buka toko sendiri, ' +
      'dan terhubung kembali dengan teman seangkatan.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f0f5fb',
    theme_color: '#0C447C',
    lang: 'id',
    dir: 'ltr',
    categories: ['shopping', 'business', 'social'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // Versi berlatar penuh supaya Android boleh memotongnya jadi
        // lingkaran atau kotak tanpa memakan bagian logo
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Produk', url: '/produk' },
      { name: 'Keranjang', url: '/keranjang' },
      { name: 'Pesanan Saya', url: '/pesanan' },
    ],
  }
}
