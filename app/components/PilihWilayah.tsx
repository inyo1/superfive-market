'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Pemilih alamat bertingkat: Provinsi → Kota/Kabupaten → Kecamatan →
// Kelurahan/Desa, dibaca dari tabel `wilayah` (Kepmendagri No 300.2.2-2138
// Tahun 2025, 91.599 baris).
//
// TIAP TINGKAT DIQUERY SAAT DROPDOWN-NYA DIBUKA, bukan di awal. Memuat
// seluruh tabel ke klien berarti mengirim 91 ribu baris hanya supaya orang
// bisa memilih empat di antaranya. Yang diambil selalu satu tingkat untuk
// satu induk: 38 provinsi, lalu paling banyak puluhan baris per langkah.
//
// Yang disimpan pemanggil ada dua macam dan keduanya perlu:
//   - `kode` kelurahan → satu-satunya yang punya arti pasti, dan yang
//     dipakai FK users.wilayah_kode
//   - `nama` tiap tingkat → supaya menampilkan alamat tidak perlu join, dan
//     alamat teks lama tetap sebentuk dengan yang baru
//
// Alamat TETAP OPSIONAL. Tidak ada tingkat yang wajib dipilih, dan berhenti
// di tengah bukan keadaan salah — pemanggilnya menyimpan apa yang ada.

type Baris = { kode: string; nama: string }

export type NilaiWilayah = {
  /** Kode kelurahan (tingkat 4). null selama pilihannya belum sampai ke sana. */
  kode: string | null
  provinsi: string | null
  kota: string | null
  kecamatan: string | null
  kelurahan: string | null
}

type Props = {
  /** `users.wilayah_kode` yang tersimpan — dipakai mengisi ulang keempat pemilih */
  kodeAwal?: string | null
  /** Nama yang sudah tersimpan sebagai teks bebas, untuk pengguna lama */
  tersimpan?: { provinsi?: string | null; kota?: string | null; kecamatan?: string | null; kelurahan?: string | null }
  /** Dipanggil hanya kalau pengguna benar-benar mengubah pilihannya */
  onChange: (nilai: NilaiWilayah) => void
}

const LABEL = ['Provinsi', 'Kota / Kabupaten', 'Kecamatan', 'Kelurahan / Desa'] as const
const PLACEHOLDER = ['Pilih provinsi', 'Pilih kota/kabupaten', 'Pilih kecamatan', 'Pilih kelurahan/desa'] as const

const gayaSelect = (mati: boolean, kosong: boolean): React.CSSProperties => ({
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '0.5px solid #c5d9ef', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box', minHeight: '44px',
  background: mati ? '#f8fbff' : '#fff',
  color: mati || kosong ? '#9ab4cc' : '#1a1a1a',
  cursor: mati ? 'not-allowed' : 'pointer',
})

/** Rantai kode induk dari sebuah kode: '32.73.06.1001' → 4 kode leluhurnya */
function rantaiKode(kode: string): string[] {
  const bagian = kode.split('.')
  return bagian.map((_, i) => bagian.slice(0, i + 1).join('.'))
}

export default function PilihWilayah({ kodeAwal = null, tersimpan, onChange }: Props) {
  // Indeks 0..3 = tingkat 1..4
  const [pilihan, setPilihan] = useState<(Baris | null)[]>([null, null, null, null])
  const [opsi, setOpsi] = useState<(Baris[] | null)[]>([null, null, null, null])
  const [memuat, setMemuat] = useState<boolean[]>([false, false, false, false])
  const [galat, setGalat] = useState<string | null>(null)

  // Mengisi ulang dari kode tersimpan: satu query untuk keempat leluhurnya,
  // bukan empat query berantai
  useEffect(() => {
    if (!kodeAwal) return
    let hidup = true

    supabase
      .from('wilayah')
      .select('kode, nama')
      .in('kode', rantaiKode(kodeAwal))
      .then(({ data }) => {
        if (!hidup || !data) return
        const perKode = Object.fromEntries((data as Baris[]).map(b => [b.kode, b]))
        setPilihan(rantaiKode(kodeAwal).map(k => perKode[k] ?? null))
      })

    return () => { hidup = false }
  }, [kodeAwal])

  async function muat(i: number) {
    if (opsi[i] || memuat[i]) return
    // Tingkat 2 ke bawah tidak berarti apa-apa tanpa induk yang terpilih
    if (i > 0 && !pilihan[i - 1]) return

    setMemuat(m => m.map((v, j) => (j === i ? true : v)))

    const q = supabase.from('wilayah').select('kode, nama').order('nama')
    const { data, error } = i === 0
      ? await q.eq('tingkat', 1)
      : await q.eq('induk', pilihan[i - 1]!.kode)

    setMemuat(m => m.map((v, j) => (j === i ? false : v)))
    if (error) { setGalat('Gagal memuat daftar wilayah: ' + error.message); return }
    setGalat(null)
    setOpsi(o => o.map((v, j) => (j === i ? ((data ?? []) as Baris[]) : v)))
  }

  function pilih(i: number, kode: string) {
    const baris = (opsi[i] ?? []).find(b => b.kode === kode) ?? null

    // Mengganti induk mengosongkan semua tingkat di bawahnya — beserta
    // daftarnya, karena isinya milik induk yang lama
    const baru = pilihan.map((v, j) => (j === i ? baris : j > i ? null : v))
    setPilihan(baru)
    setOpsi(o => o.map((v, j) => (j > i ? null : v)))

    onChange({
      kode: baru[3]?.kode ?? null,
      provinsi: baru[0]?.nama ?? null,
      kota: baru[1]?.nama ?? null,
      kecamatan: baru[2]?.nama ?? null,
      kelurahan: baru[3]?.nama ?? null,
    })
  }

  // Alamat teks dari sebelum pemilih ini ada. Ditampilkan apa adanya, dan
  // TIDAK dipaksa diisi ulang — yang lama tetap tersimpan sampai pemiliknya
  // sendiri memilih dari daftar.
  const tekstLama = [tersimpan?.kelurahan, tersimpan?.kecamatan, tersimpan?.kota, tersimpan?.provinsi]
    .filter(Boolean).join(', ')
  const belumAdaPilihan = pilihan.every(p => p === null)

  return (
    <div>
      {tekstLama && belumAdaPilihan && (
        <div style={{
          background: '#f8fbff', border: '0.5px solid #e8f0f8', borderRadius: '8px',
          padding: '9px 12px', marginBottom: '12px', fontSize: '11px', color: '#5a7da0', lineHeight: 1.7,
        }}>
          Alamat tersimpan: <strong style={{ color: '#1a1a1a' }}>{tekstLama}</strong>
          <br />
          Biarkan saja kalau sudah benar. Pilih dari daftar di bawah kalau mau memperbaruinya.
        </div>
      )}

      {galat && (
        <div style={{ background: '#fce4e4', border: '0.5px solid #f09595', borderRadius: '8px', padding: '9px 12px', marginBottom: '12px', fontSize: '11px', color: '#c62828' }}>
          {galat}
        </div>
      )}

      {LABEL.map((label, i) => {
        // Tingkat pertama selalu hidup; sisanya menunggu induknya dipilih
        const mati = i > 0 && !pilihan[i - 1]
        const daftar = opsi[i]
        const terpilih = pilihan[i]

        return (
          <div key={label} style={{ marginBottom: i === LABEL.length - 1 ? 0 : '12px' }}>
            <label htmlFor={`wilayah-${i}`} style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>
              {label}
            </label>
            <select
              id={`wilayah-${i}`}
              value={terpilih?.kode ?? ''}
              disabled={mati}
              // Dimuat saat dropdown-nya disentuh, bukan saat halaman dibuka.
              // Dua-duanya perlu: pointerdown untuk tetikus dan sentuhan,
              // focus untuk papan ketik.
              onPointerDown={() => muat(i)}
              onFocus={() => muat(i)}
              onChange={e => pilih(i, e.target.value)}
              style={gayaSelect(mati, !terpilih)}
            >
              {/* Pilihan yang sedang tersimpan ikut dirender walau daftarnya
                  belum dimuat — tanpa ini <select> menampilkan kosong untuk
                  nilai yang sebenarnya ada */}
              {terpilih && !daftar && <option value={terpilih.kode}>{terpilih.nama}</option>}
              <option value="" disabled>
                {mati ? `Pilih ${LABEL[i - 1].toLowerCase()} dulu`
                  : memuat[i] ? 'Memuat…'
                  : PLACEHOLDER[i]}
              </option>
              {(daftar ?? []).map(b => (
                <option key={b.kode} value={b.kode}>{b.nama}</option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
