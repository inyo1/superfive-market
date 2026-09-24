'use client'
import { useEffect, useEffectEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useToast } from '../context/ToastContext'
import { umumkanProfilBerubah } from '../../lib/profilBerubah'
import { ANGKATAN_PERTAMA } from './PilihAngkatan'

// Menyelesaikan pendaftaran alumni yang tertunda karena konfirmasi email.
//
// Saat daftar di /auth, sesi belum ada kalau email masih harus dikonfirmasi,
// jadi ajukan_alumni() belum bisa dipanggil — angkatannya hanya tersimpan di
// user_metadata. Dulu satu-satunya jalan menyelesaikannya adalah /verifikasi,
// dan yang langsung membuka link email ke beranda berhenti sebagai 'umum'
// selamanya. Komponen ini menyelesaikannya di sesi pertama, DI PERANGKAT MANA
// PUN: metadata melekat di akun, bukan di peramban tempat mendaftar.
//
// Kenapa di client, bukan route callback server: sesi dipegang supabase-js di
// localStorage dengan flow implicit — tokennya ada di hash URL dan tidak
// pernah sampai ke server.
//
// Konfirmasi tahun lulus sudah diminta dialog di /auth, jadi di sini tidak
// ditanya lagi. Yang disentuh hanya status 'umum'; 'menunggu', 'alumni', dan
// 'ditolak' dibiarkan.

const AWALAN = 'superfive:auto-alumni:'

// Cadangan kalau sessionStorage tidak bisa dipakai (mode privat tertentu)
const sudahDicoba = new Set<string>()

function tandai(uid: string) {
  sudahDicoba.add(uid)
  try { sessionStorage.setItem(AWALAN + uid, '1') } catch {}
}

function lepas(uid: string) {
  sudahDicoba.delete(uid)
  try { sessionStorage.removeItem(AWALAN + uid) } catch {}
}

function pernah(uid: string) {
  if (sudahDicoba.has(uid)) return true
  try { return sessionStorage.getItem(AWALAN + uid) !== null } catch { return false }
}

function bersihkanSemua() {
  sudahDicoba.clear()
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(AWALAN)) sessionStorage.removeItem(k)
    }
  } catch {}
}

export default function AutoAlumni() {
  const pathname = usePathname()
  const router = useRouter()
  const { sukses } = useToast()

  const cek = useEffectEvent(async (session: Session | null) => {
    // /auth menangani pendaftarannya sendiri (termasuk yang sesinya langsung
    // ada), dan /auth/reset memakai sesi pemulihan. Begitu orangnya pindah
    // halaman, efek pathname di bawah memeriksa lagi.
    if (pathname.startsWith('/auth')) return
    const user = session?.user
    if (!user) return

    const meta = user.user_metadata ?? {}
    const angkatan = Number(meta.angkatan)
    if (!Number.isInteger(angkatan) || angkatan < ANGKATAN_PERTAMA) return
    if (pernah(user.id)) return
    // Ditandai sebelum await pertama: dua pemicu di tab yang sama (efek
    // pathname dan SIGNED_IN) tidak akan sama-sama lolos
    tandai(user.id)

    const { data: baris, error: errBaca } = await supabase
      .from('users').select('status_alumni, nonaktif_at').eq('id', user.id).maybeSingle()
    // Gagal membaca bukan jawaban — boleh dicoba lagi di navigasi berikutnya
    if (errBaca || !baris) { lepas(user.id); return }
    if (baris.status_alumni !== 'umum' || baris.nonaktif_at !== null) return

    const nama = typeof meta.nama === 'string' && meta.nama.trim() ? meta.nama.trim() : null
    const { data, error } = await supabase.rpc('ajukan_alumni', {
      p_angkatan: angkatan,
      p_catatan: null,
      p_nama: nama,
    })

    if (!error) {
      const label = (data as { label?: string } | null)?.label
      sukses(label
        ? `Selamat datang, kamu tercatat sebagai ${label}.`
        : 'Selamat datang, kamu tercatat sebagai alumni.')
      umumkanProfilBerubah()
      return
    }

    // Tab lain (atau /auth) menyelesaikannya lebih dulu — hasilnya sama
    if (error.message.startsWith('Kamu sudah terdaftar sebagai Superfive')) {
      umumkanProfilBerubah()
      return
    }
    const { data: ulang } = await supabase
      .from('users').select('status_alumni').eq('id', user.id).maybeSingle()
    if (ulang?.status_alumni === 'alumni') {
      umumkanProfilBerubah()
      return
    }
    // Login tidak diblok: bawa ke /verifikasi dengan pesan dari RPC apa
    // adanya; formulirnya sudah terisi tahun lulus dari metadata
    router.push(`/verifikasi?msg=${encodeURIComponent(error.message)}`)
  })

  // Tiap pindah halaman — termasuk keluar dari /auth setelah masuk. Tautan
  // konfirmasi email mendarat dengan token di hash URL; getSession menunggu
  // supabase-js selesai memprosesnya.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => cek(data.session))
  }, [pathname])

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { bersihkanSemua(); return }
      // Ditunda keluar dari callback: memanggil supabase di dalam
      // onAuthStateChange bisa membuat klien auth menunggu dirinya sendiri
      if (event === 'SIGNED_IN') setTimeout(() => cek(session), 0)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return null
}
