const emojiKategori: Record<string, string> = {
  Teknologi: '💻', Fashion: '👗', Kuliner: '🍱',
  Properti: '🏠', Jasa: '🛠️', UMKM: '🏪',
}

// Handles all formats foto_url might come from Supabase:
// - string[]  → text[] column  → ["https://..."]
// - string    → text column    → "https://..."
// - string    → text[] stored wrongly → "{https://...}" (PostgreSQL array literal)
function normalizeFotoUrl(src: string | string[] | null | undefined): string | null {
  if (!src) return null
  if (Array.isArray(src)) return src[0] ?? null
  if (src.startsWith('{') && src.endsWith('}')) {
    // PostgreSQL array literal, e.g. {https://example.com/file.jpg}
    const inner = src.slice(1, -1).replace(/^"(.*)"$/, '$1').trim()
    return inner || null
  }
  return src
}

type Props = {
  src?: string | string[] | null
  kategori?: string
  height?: number
  fontSize?: number
}

export default function FotoProduk({ src, kategori = '', height = 120, fontSize = 40 }: Props) {
  const url = normalizeFotoUrl(src)

  return (
    <div style={{ position: 'relative', height: `${height}px`, background: '#E6F1FB', overflow: 'hidden' }}>
      {/* Emoji selalu ada di belakang sebagai fallback */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: `${fontSize}px`,
      }}>
        {emojiKategori[kategori] ?? '📦'}
      </div>

      {/* Gambar di depan, hilang saat error sehingga emoji terlihat */}
      {url && (
        <img
          src={url}
          alt="foto produk"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      )}
    </div>
  )
}
