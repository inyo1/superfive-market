'use client'
import { useAngkatanSaya } from './BadgeAngkatan'

// "Nama · Superfive 92" — dipasang di mana pun nama penjual muncul.
//
// Ini MEKANISME KOREKSI SOSIAL, bukan hiasan. Sejak ajukan_alumni() langsung
// memberi status alumni tanpa antrean admin, yang menjaga kejujuran angkatan
// adalah teman seangkatan yang melihatnya. Jadi angkatan harus ikut terbaca
// setiap kali namanya terbaca — di kartu, detail, toko, pencarian, profil.
//
// Label diterima utuh dari view (`label_angkatan`); komponen ini tidak
// pernah merangkainya dari tahun.

type Props = {
  nama: string | null | undefined
  /** `label_angkatan` dari `penjual_publik` */
  label: string | null | undefined
  /** Tahun numerik, hanya untuk penanda seangkatan */
  angkatan?: number | null
  /** Akun institusi tidak punya angkatan — hanya namanya yang tampil */
  institusi?: boolean | null
  kecil?: boolean
  style?: React.CSSProperties
}

export default function NamaPenjual({ nama, label, angkatan, institusi = false, kecil = false, style }: Props) {
  const angkatanSaya = useAngkatanSaya()
  if (!nama) return null

  const tampilLabel = !institusi && Boolean(label)
  const seangkatan = tampilLabel && angkatan != null && angkatanSaya === angkatan

  return (
    <span
      style={{
        display: 'inline-block', maxWidth: '100%',
        fontSize: kecil ? '10px' : '12px', color: '#5a7da0',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        verticalAlign: 'bottom',
        ...style,
      }}
    >
      {nama}
      {tampilLabel && (
        <>
          {' · '}
          <span
            title={seangkatan ? 'Seangkatan denganmu' : undefined}
            style={{ fontWeight: 600, color: seangkatan ? '#a86a05' : '#0C447C' }}
          >
            {seangkatan && <span aria-hidden style={{ marginRight: '2px' }}>🤝</span>}
            {label}
          </span>
          {seangkatan && <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}> (seangkatan denganmu)</span>}
        </>
      )}
    </span>
  )
}
