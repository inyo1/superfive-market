'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { alamatSambutan, isiSambutan, metadataSelesai, perluSambutan, tujuanAman, type IsiSambutan } from '../../lib/sambutan'
import Navbar from '../components/Navbar'
import SambutanIsi from '../components/sambutan/SambutanIsi'
import { tandaiSambutanDilewatiLokal } from '../components/sambutan/PemanduSambutan'

// Halaman Selamat Datang (Wave 3) — sekali per akun baru, setelah login
// pertama. Aturannya di lib/sambutan.ts; tampilannya di SambutanIsi.
//
// Yang perlu dipegang:
// - hanya akun bertanda `sambutan: 'baru'` di metadata auth. Akun lama dan
//   akun yang sudah menyelesaikannya langsung diteruskan ke tujuannya
// - tidak ada isian wajib: setiap pilihan, termasuk Lewati, menandai selesai
// - isinya dari status akun yang SEBENARNYA (users milik sendiri), bukan dari
//   pilihan saat daftar — pendaftar alumni yang belum mengunci angkatan masih
//   berstatus 'umum'

function SambutanKonten() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lanjut = tujuanAman(searchParams.get('lanjut'))

  const [isi, setIsi] = useState<IsiSambutan | null>(null)
  const [sibuk, setSibuk] = useState(false)
  // Tujuan yang tertunda karena penanda selesai gagal disimpan
  const [tertunda, setTertunda] = useState<string | null>(null)

  useEffect(() => {
    let aktif = true
    async function muat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!aktif) return
      if (!user) {
        router.replace('/auth?msg=' + encodeURIComponent('Masuk untuk melanjutkan.') + '&redirect=' + encodeURIComponent(alamatSambutan(lanjut)))
        return
      }
      // Sekali saja: akun lama atau yang sudah selesai tidak melihatnya lagi
      if (!perluSambutan(user.user_metadata)) { router.replace(lanjut); return }

      const [{ data: u }, { data: publik }, { data: toko }] = await Promise.all([
        supabase.from('users').select('nama, status_alumni, status_penjual, is_institusi').eq('id', user.id).maybeSingle(),
        supabase.from('alumni_publik').select('label_angkatan').eq('id', user.id).maybeSingle(),
        supabase.from('toko').select('id').eq('seller_id', user.id).limit(1),
      ])
      if (!aktif) return
      setIsi(isiSambutan({
        nama: u?.nama ?? (user.user_metadata?.nama as string | undefined) ?? null,
        status_alumni: u?.status_alumni ?? 'umum',
        status_penjual: u?.status_penjual ?? 'belum_ajukan',
        is_institusi: Boolean(u?.is_institusi),
        label_angkatan: publik?.label_angkatan ?? null,
        punya_toko: Boolean(toko && toko.length),
      }))
    }
    muat()
    return () => { aktif = false }
  }, [router, lanjut])

  // Tandai selesai di metadata auth (lintas perangkat) dan PASTIKAN berhasil:
  // yang dianggap selesai hanya jawaban server yang memuat sambutan_selesai.
  // Kalau gagal atau lewat 8 detik, pengguna diberi tahu dan bisa mencoba
  // lagi — atau lanjut saja tanpa menyimpan, supaya tidak pernah terkunci di
  // halaman ini (sambutannya mungkin muncul sekali lagi di login berikutnya).
  async function simpanSelesai(): Promise<boolean> {
    try {
      const hasil = await Promise.race([
        supabase.auth.updateUser({ data: metadataSelesai() }),
        new Promise<'habis'>(r => setTimeout(() => r('habis'), 8000)),
      ])
      if (hasil === 'habis') return false
      return !hasil.error && Boolean(hasil.data.user?.user_metadata?.sambutan_selesai)
    } catch {
      return false
    }
  }

  async function selesaiLalu(href: string) {
    setSibuk(true)
    setTertunda(null)
    if (await simpanSelesai()) {
      router.replace(href)
      return
    }
    setSibuk(false)
    setTertunda(href)
  }

  function lanjutTanpaSimpan() {
    if (!tertunda) return
    // Hanya di memori tab ini: Beranda tidak membelokkan balik ke sambutan
    tandaiSambutanDilewatiLokal()
    router.replace(tertunda)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--sf-latar)' }}>
      <Navbar />
      {isi ? (
        <SambutanIsi
          isi={isi} lanjut={lanjut} sibuk={sibuk}
          onPilih={selesaiLalu} onLewati={() => selesaiLalu(lanjut)}
          galat={tertunda ? { onCobaLagi: () => selesaiLalu(tertunda), onLanjutSaja: lanjutTanpaSimpan } : null}
        />
      ) : (
        <div className="sd-memuat" role="status" aria-live="polite">Menyiapkan sambutanmu…</div>
      )}
    </main>
  )
}

export default function SelamatDatangPage() {
  return (
    <Suspense>
      <SambutanKonten />
    </Suspense>
  )
}
