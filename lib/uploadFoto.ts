import { supabase } from './supabase'

export async function uploadFotoProduk(file: File): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('produk-foto')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) return { url: null, error: error.message }

  const { data: urlData } = supabase.storage.from('produk-foto').getPublicUrl(path)

  return { url: urlData.publicUrl, error: null }
}
