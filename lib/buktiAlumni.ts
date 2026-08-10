import { supabase } from './supabase'

// Bukti alumni itu dokumen identitas (ijazah, rapor), jadi disimpan di bucket
// PRIVAT — bukan seperti produk-foto yang publik. Yang disimpan di kolom
// users.bukti_alumni_url adalah path di dalam bucket, bukan URL publik.
// Aksesnya lewat signed URL berumur pendek.
export const BUCKET_BUKTI = 'bukti-alumni'

const UMUR_SIGNED_URL = 60 * 10 // 10 menit

export async function uploadBuktiAlumni(
  file: File,
  userId: string,
): Promise<{ path: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  // Prefix folder pakai user id supaya policy storage bisa membatasi per pemilik
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_BUKTI)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) return { path: null, error: error.message }
  return { path, error: null }
}

// Menerima path privat maupun URL penuh — data lama atau bucket publik tetap
// tertangani tanpa perlu mengubah pemanggilnya.
export async function urlBukti(nilai: string | null): Promise<string | null> {
  if (!nilai) return null
  if (nilai.startsWith('http://') || nilai.startsWith('https://')) return nilai

  const { data, error } = await supabase.storage
    .from(BUCKET_BUKTI)
    .createSignedUrl(nilai, UMUR_SIGNED_URL)

  if (error) return null
  return data?.signedUrl ?? null
}
