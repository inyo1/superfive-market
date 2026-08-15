// Kategori produk dan toko — satu-satunya daftar di sisi klien.
//
// Kembarannya ada di database: CHECK pada `produk.kategori` dan
// `toko.kategori`, keduanya NOT NULL dan membatasi ke enam nilai yang sama
// persis. Keduanya harus diubah bersamaan. Kalau hanya daftar ini yang
// bertambah, penjual bisa memilih nilai yang ditolak CHECK dan yang muncul
// bunyi Postgres, bukan kalimat. Kalau hanya CHECK-nya, kategori barunya
// tidak akan pernah bisa dipilih siapa pun.
//
// Sebelum ada berkas ini daftarnya tersebar di empat berkas, dan itu bukan
// sekadar tidak rapi: form edit produk di /toko/saya sempat terlewat saat
// kategori dibuat wajib, justru karena tidak ada satu tempat untuk dilihat.

export const KATEGORI = [
  'Teknologi',
  'Fashion',
  'Kuliner',
  'Properti',
  'Jasa',
  'UMKM',
] as const

/** Nilai yang sah untuk kolom kategori. Diturunkan dari KATEGORI, jadi salah
 *  ketik ditolak tsc dan tidak perlu menunggu ditolak Postgres. */
export type Kategori = typeof KATEGORI[number]

/** Keadaan form: string kosong berarti penjual belum memilih. Tidak ada nilai
 *  awal di pemilih mana pun — lihat catatan di lib/kategori.ts pemakainya. */
export type PilihanKategori = Kategori | ''

export function kategoriSah(nilai: string | null | undefined): nilai is Kategori {
  return !!nilai && (KATEGORI as readonly string[]).includes(nilai)
}
