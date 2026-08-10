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
const situs = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://superfivemarket.com'

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
    title: 'Superfive Market — Ekosistem Bisnis Alumni SMPN 5 Bandung',
    description: DESKRIPSI,
    url: situs,
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Superfive Market — Ekosistem Bisnis Alumni SMPN 5 Bandung',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Superfive Market',
    description: DESKRIPSI,
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
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
