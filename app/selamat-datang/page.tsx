'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { isiSambutan, metadataSelesai, perluSambutan, tujuanAman, type IsiSambutan } from '../../lib/sambutan'
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

  useEffect(() => {
    let aktif = true
    async function muat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!aktif) return
      if (!user) {
        router.replace('/auth?msg=' + encodeURIComponent('Masuk untuk melanjutkan.') + '&redirect=' + encodeURIComponent('/selamat-datang' + (lanjut !== '/' ? `?lanjut=${encodeURIComponent(lanjut)}` : '')))
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

  // Tandai selesai di metadata auth (lintas perangkat). Kalau gagal, pengguna
  // TIDAK ditahan: ia tetap diteruskan, dan sambutan mungkin muncul sekali
  // lagi di login berikutnya — lebih baik daripada terkunci di halaman ini.
  async function selesaiLalu(href: string) {
    setSibuk(true)
    tandaiSambutanDilewatiLokal()
    try {
      await Promise.race([
        supabase.auth.updateUser({ data: metadataSelesai() }),
        new Promise(r => setTimeout(r, 6000)),
      ])
    } catch { /* lihat komentar di atas */ }
    router.replace(href)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--sf-latar)' }}>
      <Navbar />
      {isi ? (
        <SambutanIsi isi={isi} lanjut={lanjut} sibuk={sibuk} onPilih={selesaiLalu} onLewati={() => selesaiLalu(lanjut)} />
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
