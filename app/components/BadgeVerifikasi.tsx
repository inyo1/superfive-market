// Centang biru penanda alumni terverifikasi. Satu komponen untuk semua tempat
// (alumni, profil, toko, kartu produk, header chat) supaya bentuknya seragam.
//
// Sengaja hanya menerima status mentah dari kolom users.status_verifikasi —
// pemanggil tidak perlu tahu nilai mana yang dianggap sah.

type Props = {
  status: string | null | undefined
  size?: number
  /** Tampilkan tulisan "Terverifikasi" di sebelah centang */
  withLabel?: boolean
}

export default function BadgeVerifikasi({ status, size = 14, withLabel = false }: Props) {
  if (status !== 'terverifikasi') return null

  const centang = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flexShrink: 0, display: 'block' }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" fill="#1d9bf0" />
      <path
        d="M7 12.4l3.2 3.2L17 8.8"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  if (!withLabel) {
    return <span title="Alumni terverifikasi" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>{centang}</span>
  }

  return (
    <span
      title="Alumni terverifikasi"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: '#e3f2fd', color: '#1565c0',
        fontSize: '11px', fontWeight: '600',
        padding: '3px 9px', borderRadius: '20px',
      }}
    >
      {centang}
      Terverifikasi
    </span>
  )
}
