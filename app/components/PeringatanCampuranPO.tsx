import { WARNA_PO, WARNA_PO_TUA } from './BadgePreorder'

// Muncul kalau keranjang berisi barang siap kirim sekaligus barang pre-order.
// create_pesanan memecah pesanan per toko, bukan per jenis pengiriman, jadi
// pembeli perlu tahu lebih awal bahwa paketnya tidak datang bersamaan.

export default function PeringatanCampuranPO({ tampil }: { tampil: boolean }) {
  if (!tampil) return null

  return (
    <div style={{
      background: 'rgba(124,77,255,0.08)',
      border: `0.5px solid ${WARNA_PO}`,
      borderRadius: '10px',
      padding: '12px 14px',
      marginBottom: '14px',
      fontSize: '12px',
      color: '#1a1a1a',
      lineHeight: 1.6,
    }}>
      <strong style={{ color: WARNA_PO_TUA }}>Pengiriman terpisah. </strong>
      Keranjangmu berisi barang siap kirim dan barang pre-order. Barang siap
      kirim dikirim lebih dulu, yang pre-order menyusul sesuai estimasinya.
    </div>
  )
}
