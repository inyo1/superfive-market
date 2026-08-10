// Menangani semua bentuk foto_url yang mungkin datang dari Supabase:
// - string[]  → kolom text[]                 → ["https://..."]
// - string    → kolom text                   → "https://..."
// - string    → text[] tersimpan salah       → "{https://...}" (literal array Postgres)
//
// Dipakai bersama komponen FotoProduk dan generateMetadata, supaya gambar
// preview Open Graph tidak ikut rusak oleh data lama yang formatnya aneh.
export function normalizeFotoUrl(src: string | string[] | null | undefined): string | null {
  if (!src) return null
  if (Array.isArray(src)) return src[0] ?? null
  if (src.startsWith('{') && src.endsWith('}')) {
    const inner = src.slice(1, -1).replace(/^"(.*)"$/, '$1').trim()
    return inner || null
  }
  return src
}
