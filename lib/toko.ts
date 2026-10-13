import { supabase } from './supabase'

// Satu toko per penjual. Sejak Oktober 2026 tokonya dibuat database saat
// admin menyetujui pengajuan penjual (putuskan_penjual), dengan nama_toko =
// nama penjual dan kategori 'UMKM'. Penjual menggantinya lewat Pengaturan
// Toko di dashboard.

/** Bawaan toko yang dibuat otomatis — sama dengan yang dipakai putuskan_penjual. */
export const KATEGORI_TOKO_BAWAAN = 'UMKM'

export type HasilToko = { ok: true; id: string } | { ok: false; pesan: string }

async function cariTokoSaya(userId: string) {
  // limit(1) + maybeSingle, bukan single(): single() melempar error untuk 0
  // baris DAN untuk >1 baris, dan dulu error itu dibaca sebagai "belum punya
  // toko" — yang lalu membuat toko kedua.
  return supabase
    .from('toko').select('id')
    .eq('seller_id', userId)
    .order('created_at', { ascending: true })
    .limit(1).maybeSingle()
}

/**
 * Toko milik penjual yang sedang login; dibuat sebagai CADANGAN kalau belum
 * ada. Setelah toko dibuat saat persetujuan, cabang cadangan seharusnya tidak
 * pernah jalan lagi — ia ada untuk penjual yang disetujui sebelum migrasinya.
 *
 * Cadangan INSERT bisa kalah balapan dengan pembuatan otomatis (atau dua tab
 * yang menyimpan bersamaan). Dengan UNIQUE index di toko.seller_id, yang
 * kalah mendapat 23505 — dan itu artinya tokonya SUDAH ADA, jadi diambil
 * ulang, bukan dilaporkan sebagai kegagalan.
 */
export async function ambilAtauBuatTokoSaya(userId: string): Promise<HasilToko> {
  const ada = await cariTokoSaya(userId)
  if (ada.error) return { ok: false, pesan: 'Gagal memuat tokomu: ' + ada.error.message }
  if (ada.data) return { ok: true, id: ada.data.id }

  // Nama bawaan sama dengan pembuatan otomatis: nama penjual sendiri
  const { data: saya } = await supabase.from('users').select('nama').eq('id', userId).maybeSingle()
  const nama = (saya?.nama as string | null)?.trim() || 'Toko Saya'

  const baru = await supabase
    .from('toko')
    .insert({ seller_id: userId, nama_toko: nama, kategori: KATEGORI_TOKO_BAWAAN })
    .select('id')
    .single()
  if (!baru.error && baru.data) return { ok: true, id: baru.data.id }

  if (baru.error?.code === '23505') {
    const ulang = await cariTokoSaya(userId)
    if (ulang.data) return { ok: true, id: ulang.data.id }
  }
  return { ok: false, pesan: 'Gagal menyiapkan tokomu: ' + (baru.error?.message ?? 'tidak diketahui') }
}

/** Satu baris daftar toko publik (/toko dan seksi Toko Alumni di beranda). */
export type TokoRingkas = {
  id: string
  nama_toko: string
  deskripsi: string | null
  kategori: string
  foto_toko: string | null
  is_official: boolean
  /** null kalau hitungannya tidak terbaca — jangan dianggap 0 */
  jumlahProduk: number | null
  created_at: string
  /** users.kota penjual (mentah — rapikan dengan rapikanKota saat tampil) */
  kota: string | null
  /** "Superfive 92" dari database; NULL untuk akun institusi */
  label_angkatan: string | null
  /** Maksimal 3 URL foto produk, untuk mosaik sampul kartu */
  foto_produk: string[]
}

/**
 * Semua toko yang terlihat pembacanya, lewat RPC `daftar_toko_publik`
 * (boleh anon; hanya toko penjual aktif). Sekali panggil sudah memuat kota
 * dan label angkatan penjual, jumlah produk, dan sampai 3 foto produk —
 * tanpa membaca `users` dari klien.
 *
 * ETALASE-KLIMAX: toko tanpa produk ikut tampil, tinjau setelah 17 Okt 2026
 *
 * Urutan: toko resmi dulu, lalu yang produknya paling banyak, lalu yang
 * paling lama — diurutkan di sini, bukan di RPC, supaya aturannya terbaca
 * di satu tempat bersama kartunya. Jumlah toko kecil, aman diambil semua.
 */
export async function ambilDaftarToko(): Promise<{ data: TokoRingkas[]; galat: string | null }> {
  const { data, error } = await supabase.rpc('daftar_toko_publik')
  if (error) return { data: [], galat: error.message }

  type Baris = Omit<TokoRingkas, 'jumlahProduk' | 'foto_produk'> & {
    jumlah_produk: number | string | null
    foto_produk: string[] | null
  }
  const daftar: TokoRingkas[] = ((data ?? []) as Baris[]).map(({ jumlah_produk, foto_produk, ...t }) => ({
    ...t,
    is_official: Boolean(t.is_official),
    // bigint bisa datang sebagai string dari PostgREST
    jumlahProduk: jumlah_produk === null || jumlah_produk === undefined ? null : Number(jumlah_produk),
    foto_produk: (foto_produk ?? []).filter(Boolean).slice(0, 3),
  }))

  daftar.sort((a, b) =>
    Number(b.is_official) - Number(a.is_official)
    || (b.jumlahProduk ?? 0) - (a.jumlahProduk ?? 0)
    || a.created_at.localeCompare(b.created_at))
  return { data: daftar, galat: null }
}

/**
 * Label jumlah produk di KartuToko: "3 produk", atau "Segera buka lapak"
 * untuk toko yang belum berproduk (ETALASE-KLIMAX). Satu-satunya sumber
 * bunyinya untuk kartu — pencarian dan /alumni punya label kosongnya sendiri
 * ("Belum menambahkan produk") karena tempatnya lebih sempit dan nadanya
 * informatif, bukan ajakan.
 */
export function labelJumlahProduk(n: number | null): string | null {
  if (n === null) return null
  return n > 0 ? `${n.toLocaleString('id-ID')} produk` : 'Segera buka lapak'
}
