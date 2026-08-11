// Penanda produk pre-order. Ungu, sengaja jauh dari emas OFFICIAL dan biru
// terverifikasi — ketiganya bisa muncul berdampingan di satu kartu.

const UNGU = '#7c4dff'
const UNGU_TUA = '#4527a0'
const UNGU_MUDA = 'rgba(124,77,255,0.13)'

type Props = {
  aktif: boolean | null | undefined
  bentuk?: 'lencana' | 'pita'
  kecil?: boolean
  label?: string
}

export default function BadgePreorder({
  aktif,
  bentuk = 'lencana',
  kecil = false,
  label = 'PRE-ORDER',
}: Props) {
  if (!aktif) return null

  if (bentuk === 'pita') {
    return (
      <span
        title="Produk pre-order"
        style={{
          position: 'absolute', top: '8px', right: '8px', zIndex: 2,
          background: UNGU, color: '#fff',
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
      title="Produk pre-order"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: UNGU_MUDA,
        border: `0.5px solid ${UNGU}`,
        color: UNGU_TUA,
        fontSize: kecil ? '9px' : '10px',
        fontWeight: '800', letterSpacing: '0.5px',
        padding: kecil ? '1px 6px' : '2px 8px',
        borderRadius: '20px', lineHeight: 1.5,
        whiteSpace: 'nowrap', textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  )
}

export { UNGU as WARNA_PO, UNGU_TUA as WARNA_PO_TUA }
