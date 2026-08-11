'use client'
import { WARNA_PO, WARNA_PO_TUA } from './BadgePreorder'
import { useHitungMundur } from '../hooks/useHitungMundur'
import { tanggalSingkat } from '../../lib/preorder'

// Rekap pre-order satu produk untuk penjual: berapa yang sudah terkumpul,
// sisa waktu, dan apakah targetnya sudah tercapai.
//
// Angkanya datang dari view preorder_progress, bukan dihitung ulang di sini.

export type ProgresPO = {
  produk_id: string
  po_selesai: string | null
  po_target: number | null
  po_maks: number | null
  sedang_buka: boolean
  terkumpul: number
}

export default function RekapPO({ progres }: { progres?: ProgresPO }) {
  const mundur = useHitungMundur(progres?.sedang_buka ? progres.po_selesai : null)

  // Produk baru ditandai PO tapi belum masuk view, atau viewnya belum termuat
  if (!progres) return null

  const { terkumpul, po_target: target, po_maks: maks, sedang_buka: buka } = progres
  const tercapai = target != null && terkumpul >= target
  const persen = target && target > 0 ? Math.min(100, (terkumpul / target) * 100) : null

  return (
    <div style={{
      marginTop: '10px', paddingTop: '10px',
      borderTop: '1px solid #eceaf7',
      fontSize: '11px', color: '#5a7da0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: persen !== null ? '6px' : 0 }}>
        <span>
          Terkumpul <strong style={{ color: WARNA_PO_TUA, fontSize: '13px' }}>{terkumpul}</strong>
          {target != null && ` dari target ${target}`}
          {maks != null && ` · kuota ${maks}`}
        </span>
        <span style={{ flexShrink: 0, color: buka ? WARNA_PO_TUA : '#9ab4cc', fontWeight: '600' }}>
          {buka
            ? (mundur.siap && mundur.teks ? `sisa ${mundur.teks}` : 'dibuka')
            : 'ditutup'}
        </span>
      </div>

      {persen !== null && (
        <div style={{ height: '6px', background: '#eceaf7', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{
            width: `${persen}%`, height: '100%',
            background: tercapai ? '#2e7d32' : WARNA_PO,
            borderRadius: '20px', transition: 'width 0.4s ease',
          }} />
        </div>
      )}

      <div style={{ marginTop: '5px', color: tercapai ? '#2e7d32' : '#9ab4cc' }}>
        {tercapai
          ? '✓ Target tercapai'
          : target != null
            ? `Kurang ${target - terkumpul} lagi untuk mencapai target`
            : 'Tanpa target minimal'}
        {progres.po_selesai && ` · tutup ${tanggalSingkat(progres.po_selesai)}`}
      </div>
    </div>
  )
}
