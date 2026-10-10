'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { alamatSambutan, perluSambutan } from '../../../lib/sambutan'

// Membawa akun baru Wave 3 ke /selamat-datang saat ia mendarat di BERANDA
// dengan sesi baru — jalur yang ditempuh tautan konfirmasi email, yang tidak
// melewati halaman /auth.
//
// Sengaja HANYA di '/': tautan langsung ke produk, toko, atau halaman lain
// tidak pernah dibelokkan. Login lewat /auth sudah menangani sambutannya
// sendiri, dengan tujuan semulanya dibawa sebagai ?lanjut=.

// Kalau penanda selesai gagal ditulis (koneksi putus), halaman sambutan
// memasang ini supaya Beranda tidak membelokkan balik ke sambutan berulang
// kali selama tab yang sama masih terbuka. Hanya di memori, tidak disimpan.
let dilewatiDiTabIni = false
export function tandaiSambutanDilewatiLokal() { dilewatiDiTabIni = true }

export default function PemanduSambutan() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname !== '/') return
    let aktif = true
    const cek = (meta: Record<string, unknown> | undefined) => {
      if (aktif && !dilewatiDiTabIni && perluSambutan(meta)) router.replace(alamatSambutan('/'))
    }
    supabase.auth.getSession().then(({ data }) => cek(data.session?.user?.user_metadata))
    const { data: dengar } = supabase.auth.onAuthStateChange((_e, sesi) => cek(sesi?.user?.user_metadata))
    return () => { aktif = false; dengar.subscription.unsubscribe() }
  }, [pathname, router])

  return null
}
