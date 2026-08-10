import Link from 'next/link'

// Tampilan untuk daftar yang kosong: ikon besar, judul, satu kalimat
// penjelasan, dan satu tombol aksi. Nada bicaranya khas Superfive —
// mengajak dan menyebut komunitas, bukan kalimat generik "no data found".

type Props = {
  ikon: string
  judul: string
  pesan: string
  aksiLabel?: string
  aksiHref?: string
  onAksi?: () => void
  /** Tombol kedua, opsional dan selalu tampil sebagai garis luar */
  aksiKeduaLabel?: string
  aksiKeduaHref?: string
  kecil?: boolean
}

export default function EmptyState({
  ikon,
  judul,
  pesan,
  aksiLabel,
  aksiHref,
  onAksi,
  aksiKeduaLabel,
  aksiKeduaHref,
  kecil = false,
}: Props) {
  const gayaTombol: React.CSSProperties = {
    background: '#0C447C', color: '#fff', border: 'none',
    padding: '12px 24px', borderRadius: '9px',
    fontSize: '13px', fontWeight: '600', textDecoration: 'none',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', minHeight: '44px', boxSizing: 'border-box',
  }

  const gayaTombolKedua: React.CSSProperties = {
    ...gayaTombol,
    background: '#fff', color: '#0C447C', border: '1px solid #0C447C',
  }

  return (
    <div style={{
      background: '#fff', borderRadius: '12px',
      border: '0.5px solid #e8f0f8',
      padding: kecil ? '32px 20px' : '48px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: kecil ? '40px' : '52px',
        lineHeight: 1, marginBottom: '14px',
      }}>
        {ikon}
      </div>
      <div style={{
        fontSize: kecil ? '14px' : '15px', fontWeight: '700',
        color: '#1a1a1a', marginBottom: '6px',
      }}>
        {judul}
      </div>
      <div style={{
        fontSize: '13px', color: '#5a7da0', lineHeight: 1.6,
        maxWidth: '320px', margin: '0 auto',
      }}>
        {pesan}
      </div>

      {(aksiLabel || aksiKeduaLabel) && (
        <div style={{
          display: 'flex', gap: '8px', justifyContent: 'center',
          marginTop: '20px', flexWrap: 'wrap',
        }}>
          {aksiLabel && (
            aksiHref
              ? <Link href={aksiHref} style={gayaTombol} className="btn-primary">{aksiLabel}</Link>
              : <button onClick={onAksi} style={gayaTombol} className="btn-primary">{aksiLabel}</button>
          )}
          {aksiKeduaLabel && aksiKeduaHref && (
            <Link href={aksiKeduaHref} style={gayaTombolKedua} className="btn-primary">{aksiKeduaLabel}</Link>
          )}
        </div>
      )}
    </div>
  )
}
