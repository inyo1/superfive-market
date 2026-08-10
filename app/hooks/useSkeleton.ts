'use client'
import { useEffect, useRef, useState } from 'react'

const MINIMUM_MS = 300

// Kalau data datang terlalu cepat, skeleton cuma berkedip sepersekian detik
// dan terlihat seperti glitch. Hook ini menahannya minimal 300ms supaya
// transisinya terbaca disengaja.
//
// Juga menyediakan mode uji: buka URL dengan ?skeleton=1 untuk memaksa
// skeleton tampil terus. Hanya jalan saat development.

function paksaDariUrl(): boolean {
  if (process.env.NODE_ENV !== 'development') return false
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('skeleton') === '1'
}

export function useTampilSkeleton(loading: boolean, minimumMs = MINIMUM_MS): boolean {
  // Dibaca setelah mount supaya render server dan klien tetap cocok
  const [dipaksa, setDipaksa] = useState(false)
  useEffect(() => { setDipaksa(paksaDariUrl()) }, [])

  const mulaiRef = useRef<number | null>(null)
  const [tahan, setTahan] = useState(loading)

  useEffect(() => {
    if (loading) {
      if (mulaiRef.current === null) mulaiRef.current = Date.now()
      setTahan(true)
      return
    }

    const mulai = mulaiRef.current
    mulaiRef.current = null

    if (mulai === null) { setTahan(false); return }

    const sisa = minimumMs - (Date.now() - mulai)
    if (sisa <= 0) { setTahan(false); return }

    const timer = setTimeout(() => setTahan(false), sisa)
    return () => clearTimeout(timer)
  }, [loading, minimumMs])

  return dipaksa || tahan
}
