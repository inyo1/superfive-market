// Ikon garis untuk tiga besaran Superfive: produk, toko, alumni.
//
// Digambar inline sebagai SVG, bukan emoji. Emoji dirender lain-lain di tiap
// sistem operasi dan warnanya tidak bisa diatur — "🏪" misalnya muncul sebagai
// minimarket lengkap dengan tulisan 24H, yang sama sekali bukan toko alumni.
// Ini juga sebabnya tidak ada pustaka ikon ditambahkan: tiga bentuk sederhana
// tidak sepadan dengan satu dependensi.
//
// Warnanya `currentColor`, jadi diatur lewat `color` di pembungkusnya.
//
// CATATAN: section statistik di beranda sekarang memakai garis aksen berwarna
// sebagai penanda, tanpa ikon — jadi ketiganya sedang tidak terpakai. Sengaja
// dipertahankan di sini, bukan dihapus, karena besaran yang sama muncul di
// beberapa tempat lain dan bentuknya sudah terlanjur pas.

const DASAR = {
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

type Props = { size?: number }

/** Paket sederhana — kotak dengan lipatan tutup dan sambungan tengah */
export function IkonProduk({ size = 18 }: Props) {
  return (
    <svg {...DASAR} width={size} height={size}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
      <path d="m3 7.5 9 4.5 9-4.5" />
      <path d="M12 12v9" />
    </svg>
  )
}

/** Etalase toko — atap tenda dan pintu, tanpa tulisan apa pun */
export function IkonToko({ size = 18 }: Props) {
  return (
    <svg {...DASAR} width={size} height={size}>
      <path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
      <path d="M3 10 4.7 5.3a1 1 0 0 1 .95-.65h12.7a1 1 0 0 1 .95.65L21 10Z" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  )
}

/** Topi wisuda */
export function IkonAlumni({ size = 18 }: Props) {
  return (
    <svg {...DASAR} width={size} height={size}>
      <path d="M12 3.5 2.5 8.2 12 13l9.5-4.8L12 3.5Z" />
      <path d="M6.5 10.6V15c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.4" />
      <path d="M21.5 8.2v5" />
    </svg>
  )
}
