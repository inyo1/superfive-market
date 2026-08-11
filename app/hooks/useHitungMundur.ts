'use client'
import { useSyncExternalStore } from 'react'
import { formatSisa } from '../../lib/preorder'

// Hitung mundur ke satu waktu.
//
// Jamnya dibuat sebagai "sistem luar" lalu dibaca lewat useSyncExternalStore,
// bukan useState + useEffect. Dua alasannya: Date.now() tak boleh dipanggil
// saat render, dan memanggil setState langsung di dalam effect memicu render
// beruntun (aturan react-hooks/set-state-in-effect).
//
// Satu detik terlalu ramai untuk hitungan berbasis hari dan jam; 30 detik
// sudah cukup halus dan jauh lebih hemat render. Satu timer dipakai bersama
// semua pemanggil.

let sekarangCache = 0
const pendengar = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function berlangganan(cb: () => void) {
  pendengar.add(cb)
  if (timer === null) {
    sekarangCache = Date.now()
    timer = setInterval(() => {
      sekarangCache = Date.now()
      pendengar.forEach(f => f())
    }, 30_000)
  }
  return () => {
    pendengar.delete(cb)
    if (pendengar.size === 0 && timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }
}

// 0 = jam klien belum jalan. Server render selalu dapat 0 supaya hasilnya
// sama dengan render pertama di klien dan tidak bentrok hidrasi.
const bacaSekarang = () => sekarangCache
const bacaServer = () => 0

/**
 * Kembaliannya { teks, habis, sekarang, siap }. `sekarang` ikut dikembalikan
 * supaya pemanggil bisa menghitung status PO memakai titik waktu yang sama
 * dengan yang ditampilkan, jadi tidak pernah beda sepersekian detik.
 */
export function useHitungMundur(target: string | null | undefined) {
  const sekarang = useSyncExternalStore(berlangganan, bacaSekarang, bacaServer)
  const siap = sekarang > 0

  if (!siap || !target) {
    return { teks: '', habis: false, sekarang, siap }
  }

  const selisih = new Date(target).getTime() - sekarang
  return {
    teks: formatSisa(selisih),
    habis: selisih <= 0,
    sekarang,
    siap: true,
  }
}
