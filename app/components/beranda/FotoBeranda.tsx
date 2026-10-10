'use client'
import { useState } from 'react'
import Image from 'next/image'
import { normalizeFotoUrl } from '../../../lib/foto'
import { HOST_FOTO } from '../KartuPasar'
import { IKON_KATEGORI } from './Ikon'
import { KATEGORI, type Kategori } from '../../../lib/kategori'

// Foto produk untuk kartu beranda (showcase IniLima dan Produk Terbaru).
//
// Bedanya dengan FotoProduk: rasio dipegang wadahnya (aspect-ratio di CSS),
// bukan tinggi piksel, jadi tidak ada layout shift saat foto dimuat. Foto dari
// Supabase Storage lewat next/image supaya ukurannya dioptimalkan untuk HP;
// host lain (data lama) tetap <img> biasa, karena next/image melempar error
// untuk host yang tidak terdaftar di next.config.
//
// Produk tanpa foto TIDAK diganti emoji: yang tampil ikon garis kategorinya
// dengan keterangan "Foto belum tersedia", supaya terbaca sebagai foto yang
// belum ada, bukan gambar produknya.

type Props = {
  src?: string | string[] | null
  kategori?: string | null
  alt: string
  sizes: string
  priority?: boolean
  /** cover untuk grid, contain untuk showcase yang harus menampilkan barang utuh */
  fit?: 'cover' | 'contain'
}

export default function FotoBeranda({ src, kategori, alt, sizes, priority = false, fit = 'cover' }: Props) {
  const url = normalizeFotoUrl(src)
  const [gagal, setGagal] = useState(false)

  if (!url || gagal) {
    const Ikon = (KATEGORI as readonly string[]).includes(kategori ?? '')
      ? IKON_KATEGORI[kategori as Kategori]
      : IKON_KATEGORI.UMKM
    return (
      <div className="bf-kosong" role="img" aria-label={`${alt} — foto belum tersedia`}>
        <Ikon size={32} />
        <span>Foto belum tersedia</span>
      </div>
    )
  }

  const gaya: React.CSSProperties = { objectFit: fit }
  if (url.startsWith(HOST_FOTO)) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={gaya}
        onError={() => setGagal(true)}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- host di luar next.config
    <img
      src={url}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...gaya }}
      onError={() => setGagal(true)}
    />
  )
}
