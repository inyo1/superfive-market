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

  // Dari view publik, bukan tabel users. Nama diambil dari pengguna_publik
  // supaya pemilik yang bukan alumni perorangan — toko resmi misalnya — tetap
  // punya nama; angkatan tetap dari alumni_publik karena hanya ada di sana.
  let nama: string | null = null
  let angkatan: number | null = null
  if (toko.seller_id) {
    const [profilRes, angkatanRes] = await Promise.all([
      db.from('pengguna_publik').select('nama').eq('id', toko.seller_id).maybeSingle(),
      db.from('alumni_publik').select('angkatan').eq('id', toko.seller_id).maybeSingle(),
    ])
    nama = profilRes.data?.nama ?? null
    angkatan = angkatanRes.data?.angkatan ?? null
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
    nama ? `Dikelola ${nama}` : null,
    angkatan ? `angkatan ${angkatan}.` : null,
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
