import { supabase } from './supabase'

// Foto profil di bucket publik `avatar`.
//
// KENAPA NAMA FILE ACAK: dulu jalurnya tetap `${uid}/avatar.<ext>`, dan uid
// terbaca anon lewat toko.seller_id dan reviews.user_id — jadi foto siapa pun
// yang uid-nya diketahui bisa dibuka dengan menebak URL, opt-in Direktori
// Alumni atau tidak. Nama acak menutup tebakan itu; URL-nya hanya diketahui
// dari baris yang memang boleh dibaca.
//
// Folder teratas TETAP uid pemilik: policy storage avatar_*_milik_sendiri
// hanya mengizinkan menulis dan menghapus di folder sendiri.
//
// Avatar lama (`${uid}/avatar.jpg?t=…`) tetap tampil seperti biasa — pembaca
// hanya memakai URL di users.avatar_url — dan baru dihapus setelah foto baru
// tersimpan.

const BUCKET = 'avatar'
const AWALAN_PUBLIK = `/storage/v1/object/public/${BUCKET}/`

const EKSTENSI: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Jenis berkas yang diterima, pasangan dari atribut `accept` di /profil */
export const JENIS_AVATAR = Object.keys(EKSTENSI).join(',')

/** Jalur baru `${uid}/<acak>.<ext>`; null kalau jenis berkasnya tidak diterima */
export function jalurAvatarBaru(uid: string, file: File): string | null {
  const ext = EKSTENSI[file.type]
  if (!ext) return null
  return `${uid}/${crypto.randomUUID()}.${ext}`
}

/**
 * Jalur di bucket dari URL publik avatar MILIK uid ini, atau null.
 * Null untuk URL di luar bucket ini, di folder orang lain, atau yang
 * bentuknya tidak dikenal — semuanya tidak boleh dihapus.
 */
export function jalurAvatarDariUrl(url: string | null | undefined, uid: string): string | null {
  if (!url) return null
  let u: URL
  try { u = new URL(url) } catch { return null }
  const dasar = new URL(supabase.storage.from(BUCKET).getPublicUrl('x').data.publicUrl)
  if (u.origin !== dasar.origin || !u.pathname.startsWith(AWALAN_PUBLIK)) return null
  const jalur = decodeURIComponent(u.pathname.slice(AWALAN_PUBLIK.length))
  const bagian = jalur.split('/')
  // Tepat dua tingkat: folder uid + nama file, tanpa '..' atau segmen kosong
  if (bagian.length !== 2 || bagian[0] !== uid || !bagian[1] || bagian[1] === '..' || bagian[1] === '.') return null
  return jalur
}

/** Unggah foto baru. Tidak menimpa apa pun (upsert false). */
export async function unggahAvatar(uid: string, file: File): Promise<{ jalur: string; url: string } | { error: string }> {
  const jalur = jalurAvatarBaru(uid, file)
  if (!jalur) return { error: 'Format foto harus JPG, PNG, atau WebP' }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(jalur, file, { upsert: false, cacheControl: '3600', contentType: file.type })
  if (error) return { error: error.message }
  return { jalur, url: supabase.storage.from(BUCKET).getPublicUrl(jalur).data.publicUrl }
}

/**
 * Hapus berkas avatar. Kegagalan sengaja tidak dilempar: yang tertinggal
 * hanya berkas yatim di folder pemilik, tidak ada yang rusak di layar.
 */
export async function hapusAvatar(jalur: string | null): Promise<boolean> {
  if (!jalur) return true
  const { error } = await supabase.storage.from(BUCKET).remove([jalur])
  if (error) console.warn('Gagal menghapus foto lama:', error.message)
  return !error
}
