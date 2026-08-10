'use client'
import { supabase } from '../../lib/supabase'
import { keAngka, formatRibuan } from '../../lib/format'

// Pengelola varian ukuran untuk satu produk. Perubahan disimpan lewat
// simpanVarian() yang dipanggil induknya bersamaan dengan penyimpanan produk,
// supaya tidak ada tombol simpan terpisah yang membingungkan.

export type BarisVarian = {
  id?: string          // kosong berarti baris baru yang belum ada di database
  nama: string
  stok: number
  harga_tambahan: number
  aktif: boolean
  urutan: number
}

const PRESET = ['S', 'M', 'L', 'XL', 'XXL']

export function barisKosong(urutan: number): BarisVarian {
  return { nama: '', stok: 0, harga_tambahan: 0, aktif: true, urutan }
}

/** Total stok dari varian yang aktif — dipakai mengisi stok induk produk */
export function totalStok(baris: BarisVarian[]) {
  return baris.filter(b => b.aktif).reduce((s, b) => s + (b.stok || 0), 0)
}

/**
 * Menyimpan perubahan varian: baris baru di-insert, yang lama di-update,
 * yang dihapus dari daftar ikut dihapus di database.
 */
export async function simpanVarian(
  produkId: string,
  baris: BarisVarian[],
  idAwal: string[],
): Promise<string | null> {
  const bersih = baris.filter(b => b.nama.trim() !== '')

  const idSekarang = bersih.map(b => b.id).filter(Boolean) as string[]
  const dihapus = idAwal.filter(id => !idSekarang.includes(id))

  if (dihapus.length > 0) {
    const { error } = await supabase.from('produk_varian').delete().in('id', dihapus)
    if (error) return error.message
  }

  for (const [i, b] of bersih.entries()) {
    const isi = {
      produk_id: produkId,
      tipe: 'Ukuran',
      nama: b.nama.trim().toUpperCase(),
      stok: b.stok || 0,
      harga_tambahan: b.harga_tambahan || 0,
      aktif: b.aktif,
      urutan: i,
    }

    const { error } = b.id
      ? await supabase.from('produk_varian').update(isi).eq('id', b.id)
      : await supabase.from('produk_varian').insert(isi)

    if (error) return error.message
  }

  return null
}

/** Mengambil varian sebuah produk untuk diedit */
export async function muatVarian(produkId: string): Promise<BarisVarian[]> {
  const { data } = await supabase
    .from('produk_varian')
    .select('id, nama, stok, harga_tambahan, aktif, urutan')
    .eq('produk_id', produkId)
    .order('urutan', { ascending: true })
    .order('nama', { ascending: true })

  return (data ?? []) as BarisVarian[]
}

type Props = {
  baris: BarisVarian[]
  onChange: (baris: BarisVarian[]) => void
}

export default function EditorVarian({ baris, onChange }: Props) {
  function ubah(i: number, patch: Partial<BarisVarian>) {
    onChange(baris.map((b, k) => k === i ? { ...b, ...patch } : b))
  }

  function hapusBaris(i: number) {
    onChange(baris.filter((_, k) => k !== i))
  }

  function tambahBaris() {
    onChange([...baris, barisKosong(baris.length)])
  }

  function isiPreset() {
    const sudahAda = new Set(baris.map(b => b.nama.trim().toUpperCase()))
    const tambahan = PRESET
      .filter(n => !sudahAda.has(n))
      .map((n, i) => ({ ...barisKosong(baris.length + i), nama: n }))
    onChange([...baris, ...tambahan])
  }

  const label: React.CSSProperties = {
    fontSize: '10px', color: '#9ab4cc', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: '0.4px',
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '9px 10px', border: '0.5px solid #c5d9ef',
    borderRadius: '7px', fontSize: '13px', outline: 'none',
    boxSizing: 'border-box', minHeight: '40px', background: '#fff',
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <label style={{ fontSize: '12px', color: '#5a7da0' }}>Ukuran / Varian</label>
        {baris.length === 0 && (
          <button
            type="button"
            onClick={isiPreset}
            style={{
              background: '#E6F1FB', color: '#0C447C', border: 'none',
              padding: '0 12px', minHeight: '36px', borderRadius: '7px',
              fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Isi S–XXL
          </button>
        )}
      </div>

      {baris.length === 0 ? (
        <div style={{
          background: '#f8fbff', border: '1px dashed #c5d9ef', borderRadius: '8px',
          padding: '14px', fontSize: '12px', color: '#5a7da0', lineHeight: 1.6,
        }}>
          Produk ini belum punya ukuran. Tanpa varian, pembeli langsung membeli
          memakai stok produk seperti biasa.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Judul kolom, hanya muat di layar lebar */}
          <div className="varian-kepala" style={{ display: 'grid', gridTemplateColumns: '68px 1fr 1fr 54px 32px', gap: '8px', alignItems: 'center' }}>
            <span style={label}>Nama</span>
            <span style={label}>Stok</span>
            <span style={label}>Tambahan</span>
            <span style={label}>Aktif</span>
            <span />
          </div>

          {baris.map((b, i) => (
            <div
              key={b.id ?? `baru-${i}`}
              className="varian-baris"
              style={{ display: 'grid', gridTemplateColumns: '68px 1fr 1fr 54px 32px', gap: '8px', alignItems: 'center' }}
            >
              <input
                value={b.nama}
                onChange={e => ubah(i, { nama: e.target.value.toUpperCase() })}
                placeholder="L"
                aria-label={`Nama ukuran baris ${i + 1}`}
                style={{ ...input, textAlign: 'center', fontWeight: '700' }}
              />
              <input
                value={b.stok === 0 ? '' : String(b.stok)}
                onChange={e => ubah(i, { stok: keAngka(e.target.value) })}
                inputMode="numeric"
                placeholder="0"
                aria-label={`Stok ukuran ${b.nama || i + 1}`}
                style={input}
              />
              <input
                value={b.harga_tambahan === 0 ? '' : formatRibuan(b.harga_tambahan)}
                onChange={e => ubah(i, { harga_tambahan: keAngka(e.target.value) })}
                inputMode="numeric"
                placeholder="0"
                aria-label={`Harga tambahan ukuran ${b.nama || i + 1}`}
                style={input}
              />
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={b.aktif}
                  onChange={e => ubah(i, { aktif: e.target.checked })}
                  aria-label={`Aktifkan ukuran ${b.nama || i + 1}`}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </label>
              <button
                type="button"
                onClick={() => hapusBaris(i)}
                aria-label={`Hapus ukuran ${b.nama || i + 1}`}
                style={{
                  background: 'none', border: 'none', color: '#c62828',
                  fontSize: '16px', cursor: 'pointer', minHeight: '40px', padding: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={tambahBaris}
          style={{
            background: '#fff', color: '#0C447C', border: '1px dashed #378ADD',
            padding: '0 14px', minHeight: '40px', borderRadius: '7px',
            fontSize: '12px', cursor: 'pointer',
          }}
        >
          + Tambah Ukuran
        </button>
        {baris.length > 0 && (
          <button
            type="button"
            onClick={isiPreset}
            style={{
              background: '#f0f5fb', color: '#5a7da0', border: 'none',
              padding: '0 14px', minHeight: '40px', borderRadius: '7px',
              fontSize: '12px', cursor: 'pointer',
            }}
          >
            Lengkapi S–XXL
          </button>
        )}
      </div>

      {baris.length > 0 && (
        <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '8px', lineHeight: 1.5 }}>
          Stok produk dihitung otomatis dari jumlah stok ukuran yang aktif:
          <strong style={{ color: '#0C447C' }}> {totalStok(baris)}</strong>.
          Ukuran yang tidak aktif tidak tampil ke pembeli.
        </div>
      )}
    </div>
  )
}
