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
