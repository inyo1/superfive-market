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

/**
 * Emoji per kategori, dipakai sebagai gambar pengganti saat produk tidak
 * punya foto dan sebagai ikon di petak kategori beranda.
 *
 * Tipenya `Record<Kategori, string>` DAN ITU YANG PENTING: menambah nilai ke
 * KATEGORI tanpa menambah emoji-nya di sini langsung ditolak tsc. Sebelumnya
 * peta ini disalin di sembilan berkas, jadi kategori baru akan muncul tanpa
 * emoji di mana-mana tanpa satu pun error — dijaga ingatan, bukan compiler.
 */
export const EMOJI_KATEGORI: Record<Kategori, string> = {
  Teknologi: '💻',
  Fashion:   '👗',
  Kuliner:   '🍱',
  Properti:  '🏠',
  Jasa:      '🛠️',
  UMKM:      '🏪',
}

/**
 * Untuk nilai yang belum tentu sah — mis. kategori dari database yang bertipe
 * `any`, atau data lama dari sebelum kolomnya dikunci CHECK.
 *
 * `cadangan` sengaja bisa diganti: konteks produk memakai 📦 dan konteks toko
 * memakai 🏪, dan itu perbedaan yang memang dikehendaki.
 */
export function emojiKategori(
  nilai: string | null | undefined,
  cadangan = '📦',
): string {
  return kategoriSah(nilai) ? EMOJI_KATEGORI[nilai] : cadangan
}
