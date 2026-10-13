import type { Metadata } from 'next'
import DaftarToko from './DaftarToko'

// Server component tipis supaya halamannya punya metadata sendiri; seluruh
// isinya client component, sama seperti halaman lain. Bukan lewat layout.tsx
// di /toko: layout itu akan ikut membungkus /toko/saya dan memberinya judul
// "Toko Alumni".
export const metadata: Metadata = {
  title: 'Toko Alumni',
  description: 'Lapak para alumni SUPERFIVE — SMPN 5 Bandung. Temukan toko alumni dan hubungi penjualnya langsung.',
}

export default function Page() {
  return <DaftarToko />
}
