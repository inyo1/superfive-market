'use client'
import { WARNA_PO, WARNA_PO_TUA } from './BadgePreorder'
import type { FormPO } from '../../lib/preorder'

// Bagian pre-order di form produk. Dipakai form tambah maupun form edit di
// dashboard, supaya aturannya tidak bercabang jadi dua versi.
//
// Semua isian rinci baru muncul setelah sakelar utama dinyalakan — kalau
// mati, form produk terlihat persis seperti sebelum fitur PO ada.

const gayaLabel: React.CSSProperties = {
  display: 'block', fontSize: '11px', color: '#5a7da0', marginBottom: '4px',
}

const gayaInput: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef',
  borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff',
  fontFamily: 'inherit',
}

type Props = {
  nilai: FormPO
  onChange: (f: FormPO) => void
}

export default function EditorPreorder({ nilai, onChange }: Props) {
  const ubah = (bagian: Partial<FormPO>) => onChange({ ...nilai, ...bagian })

  return (
    <div style={{
      border: `0.5px solid ${nilai.aktif ? WARNA_PO : '#c5d9ef'}`,
      borderRadius: '10px',
      padding: '14px',
      background: nilai.aktif ? 'rgba(124,77,255,0.05)' : '#fff',
      marginBottom: '12px',
    }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={nilai.aktif}
          onChange={e => ubah({ aktif: e.target.checked })}
          style={{ width: '18px', height: '18px', marginTop: '1px', accentColor: WARNA_PO, cursor: 'pointer' }}
        />
        <span>
          <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: nilai.aktif ? WARNA_PO_TUA : '#1a1a1a' }}>
            Jual sebagai Pre-Order
          </span>
          <span style={{ display: 'block', fontSize: '11px', color: '#5a7da0', marginTop: '2px', lineHeight: 1.5 }}>
            Barang belum ada stoknya. Pembeli memesan dulu dalam periode
            tertentu, barangnya dibuat setelah periode ditutup.
          </span>
        </span>
      </label>

      {nilai.aktif && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 150px' }}>
              <label style={gayaLabel}>Mulai PO *</label>
              <input
                type="datetime-local"
                value={nilai.mulai}
                onChange={e => ubah({ mulai: e.target.value })}
                style={gayaInput}
              />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={gayaLabel}>Tutup PO *</label>
              <input
                type="datetime-local"
                value={nilai.selesai}
                onChange={e => ubah({ selesai: e.target.value })}
                style={gayaInput}
              />
            </div>
          </div>

          <div>
            <label style={gayaLabel}>Estimasi pengiriman</label>
            <input
              value={nilai.estimasi}
              onChange={e => ubah({ estimasi: e.target.value })}
              placeholder="Contoh: Kirim akhir September 2026"
              maxLength={80}
              style={gayaInput}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 130px' }}>
              <label style={gayaLabel}>Target minimal</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={nilai.target}
                onChange={e => ubah({ target: e.target.value })}
                placeholder="opsional"
                style={gayaInput}
              />
              <div style={{ fontSize: '10px', color: '#9ab4cc', marginTop: '3px' }}>
                Ditampilkan sebagai bilah progres
              </div>
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <label style={gayaLabel}>Kuota maksimal</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={nilai.maks}
                onChange={e => ubah({ maks: e.target.value })}
                placeholder="opsional"
                style={gayaInput}
              />
              <div style={{ fontSize: '10px', color: '#9ab4cc', marginTop: '3px' }}>
                PO tertutup sendiri saat kuota penuh
              </div>
            </div>
          </div>

          <div>
            <label style={gayaLabel}>Catatan penting untuk pembeli</label>
            <textarea
              value={nilai.catatan}
              onChange={e => ubah({ catatan: e.target.value })}
              placeholder="Contoh: Pembayaran di muka, tidak bisa dibatalkan setelah PO ditutup."
              rows={3}
              maxLength={300}
              style={{ ...gayaInput, resize: 'vertical' }}
            />
          </div>

          <div style={{ fontSize: '11px', color: '#5a7da0', lineHeight: 1.6 }}>
            Selama PO aktif, stok tidak dipakai — jumlah pesanan yang masuk
            dihitung otomatis dan bisa dilihat di tab Ringkasan.
          </div>
        </div>
      )}
    </div>
  )
}
