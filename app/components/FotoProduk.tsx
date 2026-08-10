import { normalizeFotoUrl } from '../../lib/foto'

const emojiKategori: Record<string, string> = {
  Teknologi: '💻', Fashion: '👗', Kuliner: '🍱',
  Properti: '🏠', Jasa: '🛠️', UMKM: '🏪',
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
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#f5f5f5' }}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      )}
    </div>
  )
}
