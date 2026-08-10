'use client'

// Tombol dengan state lengkap: normal, hover, ditekan, loading, disabled.
// Saat loading tombol otomatis disabled — ini yang mencegah klik ganda pada
// aksi yang menulis ke database.

type Varian = 'primer' | 'sekunder' | 'bahaya' | 'lembut'

type Props = {
  children: React.ReactNode
  onClick?: () => void
  varian?: Varian
  loading?: boolean
  /** Teks pengganti saat loading. Default "Memproses..." */
  teksLoading?: string
  disabled?: boolean
  penuh?: boolean
  type?: 'button' | 'submit'
  style?: React.CSSProperties
  ariaLabel?: string
}

const VARIAN: Record<Varian, React.CSSProperties> = {
  primer:   { background: '#0C447C', color: '#fff', border: 'none' },
  sekunder: { background: '#fff', color: '#0C447C', border: '1px solid #0C447C' },
  bahaya:   { background: '#c62828', color: '#fff', border: 'none' },
  lembut:   { background: '#E6F1FB', color: '#0C447C', border: 'none' },
}

export default function Tombol({
  children,
  onClick,
  varian = 'primer',
  loading = false,
  teksLoading = 'Memproses...',
  disabled = false,
  penuh = false,
  type = 'button',
  style,
  ariaLabel,
}: Props) {
  const mati = disabled || loading
  const dasar = VARIAN[varian]
  const spinnerTerang = varian === 'primer' || varian === 'bahaya'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={mati}
      aria-label={ariaLabel}
      aria-busy={loading}
      className="btn-primary"
      style={{
        ...dasar,
        width: penuh ? '100%' : undefined,
        minHeight: '44px',
        padding: '12px 20px',
        borderRadius: '9px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: mati ? 'not-allowed' : 'pointer',
        opacity: disabled && !loading ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {loading && (
        <span
          className="spinner-tombol"
          style={spinnerTerang ? undefined : {
            borderColor: 'rgba(12,68,124,0.25)',
            borderTopColor: '#0C447C',
          }}
        />
      )}
      {loading ? teksLoading : children}
    </button>
  )
}
