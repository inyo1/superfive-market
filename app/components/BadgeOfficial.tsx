// Penanda produk atau toko resmi INILIMA. Sengaja memakai aksen emas #EF9F27,
// berbeda dari BadgeVerifikasi yang biru — supaya "resmi institusi" tidak
// tertukar dengan "alumni terverifikasi".
//
// Dua bentuk dari satu komponen:
//   lencana — pil kecil, untuk disandingkan dengan nama produk atau toko
//   pita    — menempel di pojok kartu produk

const EMAS = '#EF9F27'
const EMAS_TUA = '#8a5a05'

type Props = {
  /** Tidak merender apa-apa kalau bukan toko resmi */
  aktif: boolean | null | undefined
  bentuk?: 'lencana' | 'pita'
  kecil?: boolean
  label?: string
}

export default function BadgeOfficial({
  aktif,
  bentuk = 'lencana',
  kecil = false,
  label = 'OFFICIAL',
}: Props) {
  if (!aktif) return null

  if (bentuk === 'pita') {
    return (
      <span
        title="Merchandise resmi INILIMA"
        style={{
          position: 'absolute', top: '8px', left: '8px', zIndex: 2,
          background: EMAS, color: '#3d2600',
          fontSize: '9px', fontWeight: '800', letterSpacing: '0.7px',
          padding: '3px 8px', borderRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
          lineHeight: 1.4, textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      title="Merchandise resmi INILIMA"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        background: 'rgba(239,159,39,0.16)',
        border: `0.5px solid ${EMAS}`,
        color: EMAS_TUA,
        fontSize: kecil ? '9px' : '10px',
        fontWeight: '800', letterSpacing: '0.5px',
        padding: kecil ? '1px 6px' : '2px 8px',
        borderRadius: '20px', lineHeight: 1.5,
        whiteSpace: 'nowrap', textTransform: 'uppercase',
      }}
    >
      ★ {label}
    </span>
  )
}
