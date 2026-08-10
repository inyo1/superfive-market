'use client'
import { formatRibuan, angkaMurni } from '../../lib/format'

// Input harga yang memformat ribuan saat diketik. Nilai yang dikirim lewat
// onChange selalu angka murni tanpa titik, jadi pemanggil bisa langsung
// menyimpannya ke database.

type Props = {
  nilai: string | number
  onChange: (angkaMurni: string) => void
  placeholder?: string
  style?: React.CSSProperties
  disabled?: boolean
}

export default function InputHarga({ nilai, onChange, placeholder = '0', style, disabled }: Props) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
        fontSize: '13px', color: '#5a7da0', pointerEvents: 'none',
      }}>
        Rp
      </span>
      <input
        value={formatRibuan(nilai)}
        onChange={e => onChange(angkaMurni(e.target.value))}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="numeric"
        // Keyboard HP langsung ke angka; pola ini juga menahan karakter lain
        pattern="[0-9.]*"
        style={{
          width: '100%', padding: '11px 12px 11px 36px',
          border: '0.5px solid #c5d9ef', borderRadius: '8px',
          fontSize: '13px', outline: 'none', boxSizing: 'border-box',
          minHeight: '44px',
          ...style,
        }}
      />
    </div>
  )
}
