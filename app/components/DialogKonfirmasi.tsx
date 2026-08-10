'use client'

// Pengganti window.confirm(). Dipakai untuk aksi yang tidak bisa dibatalkan,
// terutama penghapusan. Tampil sebagai modal, bukan dialog bawaan browser,
// supaya gayanya seragam dan enak disentuh di HP.

type Props = {
  terbuka: boolean
  judul: string
  pesan: string
  labelKonfirmasi?: string
  labelBatal?: string
  /** Merah untuk aksi merusak, biru untuk aksi biasa */
  merusak?: boolean
  memproses?: boolean
  ikon?: string
  onKonfirmasi: () => void
  onBatal: () => void
}

export default function DialogKonfirmasi({
  terbuka,
  judul,
  pesan,
  labelKonfirmasi = 'Hapus',
  labelBatal = 'Batal',
  merusak = true,
  memproses = false,
  ikon = '🗑️',
  onKonfirmasi,
  onBatal,
}: Props) {
  if (!terbuka) return null

  const warnaAksi = merusak ? '#c62828' : '#0C447C'

  return (
    <div
      onClick={memproses ? undefined : onBatal}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={judul}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '14px', padding: '24px 20px',
          width: '100%', maxWidth: '340px', textAlign: 'center',
          animation: 'dialogMasuk 0.18s ease both',
        }}
      >
        <div style={{ fontSize: '38px', marginBottom: '12px' }}>{ikon}</div>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>
          {judul}
        </div>
        <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '20px', lineHeight: 1.55 }}>
          {pesan}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onBatal}
            disabled={memproses}
            className="btn-primary"
            style={{
              flex: 1, background: '#f0f5fb', color: '#5a7da0', border: 'none',
              padding: '12px', borderRadius: '9px', fontSize: '13px',
              minHeight: '44px', cursor: memproses ? 'not-allowed' : 'pointer',
            }}
          >
            {labelBatal}
          </button>
          <button
            onClick={onKonfirmasi}
            disabled={memproses}
            className="btn-primary"
            style={{
              flex: 1, background: memproses ? '#b0b0b0' : warnaAksi, color: '#fff',
              border: 'none', padding: '12px', borderRadius: '9px',
              fontSize: '13px', fontWeight: '600', minHeight: '44px',
              cursor: memproses ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            }}
          >
            {memproses && <span className="spinner-tombol" />}
            {memproses ? 'Memproses...' : labelKonfirmasi}
          </button>
        </div>
      </div>
    </div>
  )
}
