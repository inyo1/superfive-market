'use client'

// Pemilih angkatan untuk formulir pendaftaran dan /verifikasi.
//
// Ini SATU-SATUNYA tempat label "Superfive NN" dirangkai di klien. Di semua
// permukaan lain label angkatan dibaca dari kolom `label_angkatan` di view
// (`penjual_publik`, `alumni_publik`, `angkatan_ringkas`) — jangan membuat
// helper format tandingan, supaya bunyinya ditentukan di satu tempat saja:
// database. Dropdown ini pengecualian karena opsinya belum ada di database
// mana pun sebelum dipilih.
//
// Nilai yang dikirim ke RPC tetap tahun empat digit.

export const ANGKATAN_PERTAMA = 1956

/** "Superfive 88" untuk 1988, "Superfive 05" untuk 2005. */
export function labelOpsiAngkatan(th: number): string {
  return `Superfive ${String(th % 100).padStart(2, '0')}`
}

type Props = {
  id?: string
  value: string
  onChange: (nilai: string) => void
  style?: React.CSSProperties
}

export default function PilihAngkatan({ id = 'angkatan', value, onChange, style }: Props) {
  const tahunIni = new Date().getFullYear()
  // Terbaru di atas: angkatan muda paling banyak mendaftar, dan mereka tidak
  // perlu menggulir melewati enam puluh tahun untuk menemukan tahunnya.
  const daftar = Array.from({ length: tahunIni - ANGKATAN_PERTAMA + 1 }, (_, i) => tahunIni - i)

  return (
    <select
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef',
        borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff',
        boxSizing: 'border-box', minHeight: '44px',
        color: value ? '#1a1a1a' : '#9ab4cc',
        ...style,
      }}
    >
      {/* Tanpa nilai awal: angkatan yang terkunci tidak boleh terisi hanya
          karena orangnya tidak menyentuh pemilihnya */}
      <option value="" disabled>Pilih angkatan</option>
      {daftar.map(th => (
        <option key={th} value={th} style={{ color: '#1a1a1a' }}>{labelOpsiAngkatan(th)}</option>
      ))}
    </select>
  )
}
