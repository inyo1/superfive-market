import { supabase } from './supabase'

// Identitas penjual untuk permukaan publik — kartu produk, detail produk,
// halaman toko, pencarian.
//
// KENAPA `penjual_publik`, BUKAN `alumni_publik` ATAU `pengguna_publik`
//
// - `alumni_publik` sejak peluncuran reuni hanya di-grant ke `authenticated`.
//   Dipakai di halaman yang dibuka pengunjung anon, query-nya gagal dan
//   angkatan penjual diam-diam hilang dari layar.
// - `pengguna_publik` tidak punya kolom angkatan sama sekali.
// - `penjual_publik` bisa dibaca anon, dan barisnya hanya ada untuk penjual
//   dengan `status_penjual = 'aktif'` yang tidak nonaktif. Toko yang
//   penjualnya tidak aktif memang tidak tayang, jadi itu bukan kekurangan.
//
// `label_angkatan` ("Superfive 92") SUDAH JADI dari view. Jangan merangkainya
// sendiri dari `angkatan` — bunyinya ditentukan database di satu tempat.
// `angkatan` numerik tetap diambil hanya untuk penanda "seangkatan".

export type PenjualPublik = {
  id: string
  nama: string | null
  angkatan: number | null
  label_angkatan: string | null
  avatar_url: string | null
  foto_url: string | null
  is_institusi: boolean
}

const KOLOM = 'id, nama, angkatan, label_angkatan, avatar_url, foto_url, is_institusi'

/** Sekali query untuk banyak penjual, hasilnya dipetakan per id.
 *  Gagal = peta kosong: halaman tetap tampil, hanya tanpa identitas penjual. */
export async function ambilPenjualPublik(ids: (string | null | undefined)[]): Promise<Record<string, PenjualPublik>> {
  const unik = [...new Set(ids.filter(Boolean))] as string[]
  if (unik.length === 0) return {}
  const { data } = await supabase.from('penjual_publik').select(KOLOM).in('id', unik)
  return Object.fromEntries(((data ?? []) as PenjualPublik[]).map(p => [p.id, p]))
}

/** Satu penjual. `maybeSingle`: penjual yang tidak aktif wajar tidak punya baris. */
export async function ambilSatuPenjualPublik(id: string | null | undefined): Promise<PenjualPublik | null> {
  if (!id) return null
  const { data } = await supabase.from('penjual_publik').select(KOLOM).eq('id', id).maybeSingle()
  return (data as PenjualPublik | null) ?? null
}

/** Penjual perorangan yang punya angkatan = alumni. Syarat berjualan memang
 *  alumni atau institusi, jadi ini cukup untuk lencana centang. */
export function penjualAlumni(p: PenjualPublik | null | undefined): boolean {
  return Boolean(p && !p.is_institusi && p.label_angkatan)
}
