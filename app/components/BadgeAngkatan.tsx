'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Angkatan adalah pembeda Superfive dari marketplace lain, jadi ditampilkan
// konsisten di mana pun nama alumni muncul. Kalau angkatannya sama dengan
// pengguna yang sedang login, lencananya berubah jadi penanda "seangkatan".

const EMAS = '#EF9F27'

/** Angkatan milik pengguna yang sedang login. null kalau belum login, belum
 *  mengisi angkatan, atau akunnya institusi. Di-cache satu kali per sesi. */
let cacheAngkatan: number | null | undefined
let janjiAngkatan: Promise<number | null> | null = null

async function ambilAngkatanSaya(): Promise<number | null> {
  if (cacheAngkatan !== undefined) return cacheAngkatan
  if (janjiAngkatan) return janjiAngkatan

  janjiAngkatan = (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { cacheAngkatan = null; return null }
    const { data } = await supabase
      .from('users').select('angkatan, is_institusi').eq('id', user.id).single()
    // Akun institusi tidak punya angkatan yang bermakna, jadi dianggap null —
    // dengan begitu penanda "seangkatan" tidak akan pernah cocok untuknya
    const nilai: number | null = data?.is_institusi ? null : (data?.angkatan ?? null)
    cacheAngkatan = nilai
    return nilai
  })()

  return janjiAngkatan
}

export function useAngkatanSaya() {
  const [angkatan, setAngkatan] = useState<number | null>(cacheAngkatan ?? null)

  useEffect(() => {
    let hidup = true
    ambilAngkatanSaya().then(a => { if (hidup) setAngkatan(a) })
    return () => { hidup = false }
  }, [])

  return angkatan
}

type Props = {
  angkatan: number | null | undefined
  /** Akun institusi — toko resmi, panitia, dan sejenisnya. Bukan alumni
   *  perorangan, jadi angkatan tidak pernah ditampilkan untuknya. */
  institusi?: boolean | null
  /** Sembunyikan kalau angkatan belum diisi, bukan menampilkan strip */
  sembunyikanKosong?: boolean
  kecil?: boolean
}

export default function BadgeAngkatan({ angkatan, institusi = false, sembunyikanKosong = true, kecil = false }: Props) {
  const angkatanSaya = useAngkatanSaya()

  // Dijaga di sini, bukan di tiap pemanggil: sekali akun ditandai institusi,
  // badge angkatan dan penanda seangkatan mati di seluruh aplikasi — termasuk
  // kalau kolom angkatannya suatu saat kebetulan terisi.
  if (institusi) return null

  if (!angkatan) {
    if (sembunyikanKosong) return null
    return (
      <span style={gaya(kecil, { background: '#f4f7fb', color: '#9ab4cc' })}>
        Angkatan —
      </span>
    )
  }

  const seangkatan = angkatanSaya !== null && angkatanSaya === angkatan

  if (seangkatan) {
    return (
      <span
        title={`Kalian sama-sama angkatan ${angkatan}`}
        style={gaya(kecil, {
          background: 'rgba(239,159,39,0.15)',
          color: '#a86a05',
          border: `0.5px solid ${EMAS}`,
        })}
      >
        <span aria-hidden style={{ fontSize: kecil ? '10px' : '11px' }}>🤝</span>
        Seangkatan denganmu
      </span>
    )
  }

  return (
    <span style={gaya(kecil, { background: '#E6F1FB', color: '#0C447C' })}>
      Angkatan {angkatan}
    </span>
  )
}

function gaya(kecil: boolean, warna: React.CSSProperties): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: kecil ? '2px 7px' : '3px 9px',
    borderRadius: '20px',
    fontSize: kecil ? '10px' : '11px',
    fontWeight: '600',
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
    ...warna,
  }
}
