'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Pengalih untuk halaman transaksi yang dibekukan di mode katalog.
 *
 * Dipakai sebagai early return di /keranjang, /checkout, dan /pesanan. Kode
 * halamannya tetap utuh di bawah pemanggilan ini — lihat MODE_TRANSAKSI di
 * [lib/config.ts](lib/config.ts) soal kenapa dibekukan, bukan dihapus.
 *
 * `replace`, bukan `push`: halaman yang dibekukan tidak boleh meninggalkan
 * jejak di riwayat peramban. Kalau memakai push, tombol Kembali akan
 * memantulkan orang ke sini lagi dan langsung terlempar ke beranda — tampak
 * seperti tombol Kembali yang rusak.
 */
export default function RedirectBeku({ ke = '/' }: { ke?: string }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(ke)
  }, [router, ke])

  // Layar antara yang sengaja polos. Halaman ini hanya terlihat sepersekian
  // detik, jadi tidak ada gunanya menjelaskan apa pun di sini — penjelasannya
  // ada di beranda, tempat orangnya akan mendarat.
  return (
    <main
      style={{
        minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: '13px', color: '#5a7da0' }}>Mengalihkan…</span>
    </main>
  )
}
