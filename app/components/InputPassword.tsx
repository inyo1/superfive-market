'use client'
import { useState } from 'react'

// Input kata sandi dengan tombol mata untuk melihat isinya.
//
// Keadaan "terlihat" sengaja disimpan lokal di komponen dan tidak pernah
// diingat antar halaman: tiap kali field ini dipasang, sandinya selalu
// mulai tertutup.

const ABU = '#9ab4cc'
const BIRU = '#0C447C'

function IkonMata() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.8 12S5.4 5.4 12 5.4 22.2 12 22.2 12 18.6 18.6 12 18.6 1.8 12 1.8 12z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  )
}

function IkonMataDicoret() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.9 5.6A9.6 9.6 0 0112 5.4c6.6 0 10.2 6.6 10.2 6.6a17 17 0 01-3 4" />
      <path d="M6.4 6.5A17 17 0 001.8 12S5.4 18.6 12 18.6a9.4 9.4 0 004.3-1" />
      <path d="M9.8 9.9a3.2 3.2 0 004.4 4.4" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

type Props = {
  value: string
  onChange: (nilai: string) => void
  placeholder?: string
  /** "current-password" saat masuk, "new-password" saat daftar */
  autoComplete?: 'current-password' | 'new-password'
  id?: string
  name?: string
  disabled?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  style?: React.CSSProperties
}

export default function InputPassword({
  value,
  onChange,
  placeholder = 'Kata sandi',
  autoComplete = 'current-password',
  id,
  name = 'password',
  disabled,
  onKeyDown,
  style,
}: Props) {
  const [terlihat, setTerlihat] = useState(false)
  const [hover, setHover] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        type={terlihat ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        style={{
          width: '100%',
          // ruang di kanan disisakan untuk tombol mata supaya teksnya
          // tidak pernah tertutup
          padding: '11px 52px 11px 12px',
          border: '0.5px solid #c5d9ef',
          borderRadius: '8px',
          fontSize: '13px',
          outline: 'none',
          boxSizing: 'border-box',
          minHeight: '44px',
          ...style,
        }}
      />

      <button
        type="button"
        onClick={() => setTerlihat(v => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={terlihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        aria-pressed={terlihat}
        style={{
          position: 'absolute', top: '50%', right: '2px',
          transform: 'translateY(-50%)',
          width: '44px', height: '44px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', padding: 0,
          color: hover ? BIRU : ABU,
          cursor: 'pointer',
          transition: 'color 0.15s ease',
        }}
      >
        {terlihat ? <IkonMataDicoret /> : <IkonMata />}
      </button>
    </div>
  )
}
