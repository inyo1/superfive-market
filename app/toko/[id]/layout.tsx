import type { Metadata } from 'next'
import { supabaseServer } from '../../../lib/supabaseServer'

// Sama seperti detail produk: halamannya client component, jadi metadata
// dinamisnya ditaruh di layout server ini.

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  // /toko/saya bukan UUID — biarkan memakai metadata bawaan root
  if (id === 'saya') {
    return { title: 'Toko Saya' }
  }

  const db = supabaseServer()

  const { data: toko } = await db
    .from('toko')
    .select('nama_toko, deskripsi, kategori, foto_toko, seller_id')
    .eq('id', id)
    .single()

  if (!toko) {
    return {
      title: 'Toko tidak ditemukan',
      description: 'Toko yang kamu cari sudah tidak ada di Superfive Market.',
    }
  }

  // Nama & angkatan penjual diambil dari view publik, bukan tabel users
  let penjual: { nama: string | null; angkatan: number | null } | null = null
  if (toko.seller_id) {
    const { data } = await db
      .from('alumni_publik')
      .select('nama, angkatan')
      .eq('id', toko.seller_id)
      .maybeSingle()
    penjual = data ?? null
  }

  const { count } = await db
    .from('produk')
    .select('id', { count: 'exact', head: true })
    .eq('toko_id', id)

  const judul = toko.nama_toko ?? 'Toko Alumni'

  // Jangan tambah awalan "Toko" kalau namanya memang sudah diawali itu,
  // supaya tidak jadi "Toko Toko Saya"
  const sebutan = /^toko\b/i.test(judul) ? judul : `Toko ${judul}`

  const deskripsi = [
    toko.deskripsi?.trim() || `${sebutan} di Superfive Market.`,
    penjual?.nama ? `Dikelola ${penjual.nama}` : null,
    penjual?.angkatan ? `angkatan ${penjual.angkatan}.` : null,
    count ? `${count} produk tersedia.` : null,
  ].filter(Boolean).join(' ')

  const gambar = toko.foto_toko || '/og-image.png'

  return {
    title: judul,
    description: deskripsi,
    openGraph: {
      type: 'website',
      title: `${judul} — Superfive Market`,
      description: deskripsi,
      images: [{ url: gambar, alt: judul }],
    },
    twitter: {
      card: 'summary_large_image',
      title: judul,
      description: deskripsi,
      images: [gambar],
    },
  }
}

export default function LayoutToko({ children }: { children: React.ReactNode }) {
  return children
}
