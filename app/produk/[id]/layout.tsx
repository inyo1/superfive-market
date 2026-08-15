import type { Metadata } from 'next'
import { supabaseServer } from '../../../lib/supabaseServer'
import { normalizeFotoUrl } from '../../../lib/foto'

// Halaman detail produk adalah client component, jadi metadata dinamisnya
// dititipkan di layout ini — generateMetadata hanya bisa dari server component.

type Props = { params: Promise<{ id: string }> }

function rupiah(n: number | null | undefined) {
  return 'Rp ' + (n ?? 0).toLocaleString('id-ID')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  const { data } = await supabaseServer()
    .from('produk')
    .select('nama, deskripsi, harga, foto_url, kategori, toko(nama_toko)')
    .eq('id', id)
    .single()

  if (!data) {
    return {
      title: 'Produk tidak ditemukan',
      description: 'Produk yang kamu cari sudah tidak tersedia di Superfive Market.',
    }
  }

  const namaToko = (data.toko as unknown as { nama_toko: string } | null)?.nama_toko
  const judul = `${data.nama} — ${rupiah(data.harga)}`

  const deskripsi = [
    rupiah(data.harga),
    namaToko ? `dijual oleh ${namaToko}` : null,
    'di Superfive Market.',
    data.deskripsi?.trim() ? data.deskripsi.trim().slice(0, 120) : null,
  ].filter(Boolean).join(' ')

  // Foto produk jadi gambar preview. Kalau produk belum punya foto, jatuh ke
  // gambar OG umum supaya preview tidak kosong.
  const foto = normalizeFotoUrl(data.foto_url as string | string[] | null)
  const gambar = foto ?? '/og-image.jpg'

  return {
    title: judul,
    description: deskripsi,
    openGraph: {
      type: 'website',
      title: judul,
      description: deskripsi,
      images: [{ url: gambar, alt: data.nama ?? 'Produk Superfive Market' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: judul,
      description: deskripsi,
      images: [gambar],
    },
  }
}

export default function LayoutProduk({ children }: { children: React.ReactNode }) {
  return children
}
