import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./context/CartContext";
import { ChatProvider } from "./context/ChatContext";
import { ToastProvider } from "./context/ToastContext";
import BottomNav from "./components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dipakai untuk mengubah path relatif jadi URL absolut di tag Open Graph.
// Tanpa ini, WhatsApp dan Facebook tidak bisa mengambil gambar previewnya.
//
// PAKAI www: superfivemarket.com menjawab 308 ke www, dan sebagian pengambil
// pratinjau tidak mengikuti redirect saat menjemput gambarnya.
const situs = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.superfivemarket.com'

// JPG, bukan PNG: WhatsApp menolak memuat gambar besar dan diam-diam jatuh ke
// pratinjau kotak kecil. Yang ini 40KB; PNG lamanya 215KB.
// Dibuat ulang dengan `node scripts/buat-og-image.mjs`.
const OG_GAMBAR = `${situs}/og-image.jpg`

const DESKRIPSI =
  'Ekosistem bisnis alumni SMPN 5 Bandung. Belanja produk alumni, buka toko sendiri, ' +
  'dan terhubung kembali dengan teman seangkatan.'

export const metadata: Metadata = {
  metadataBase: new URL(situs),
  title: {
    default: 'Superfive Market — Ekosistem Bisnis Alumni SMPN 5 Bandung',
    // Halaman lain cukup mengisi judulnya sendiri, sisanya otomatis
    template: '%s · Superfive Market',
  },
  description: DESKRIPSI,
  applicationName: 'Superfive Market',
  keywords: ['alumni', 'SMPN 5 Bandung', 'marketplace', 'UMKM', 'Superfive'],
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'Superfive Market',
    // Judul pratinjau sengaja pendek. Judul tab boleh panjang (lihat `title`
    // di atas), tapi di kartu WhatsApp judul panjang terpotong di tengah
    // kalimat — dan keterangannya sudah menjelaskan sisanya.
    title: 'Superfive Market',
    description: DESKRIPSI,
    url: situs,
    images: [{
      // URL absolut, bukan relatif: sebagian pengambil pratinjau tidak
      // menyelesaikan path relatif terhadap metadataBase
      url: OG_GAMBAR,
      // width dan height WAJIB ditulis eksplisit — tanpa keduanya WhatsApp
      // sering memilih pratinjau kotak kecil meski gambarnya sudah 1200x630
      width: 1200,
      height: 630,
      type: 'image/jpeg',
      alt: 'Superfive Market — Ekosistem Bisnis Alumni SMPN 5 Bandung',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Superfive Market',
    description: DESKRIPSI,
    images: [OG_GAMBAR],
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0C447C',
  width: 'device-width',
  initialScale: 1,
  // Biar bar alamat ikut warna tema dan konten masuk ke area aman iPhone
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <CartProvider>
            <ChatProvider>
              {children}
              <BottomNav />
            </ChatProvider>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
