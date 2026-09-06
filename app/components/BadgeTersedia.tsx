'use client'

/**
 * Lencana ketersediaan barang untuk mode katalog.
 *
 * Menggantikan angka stok di seluruh permukaan pembeli. Sejak Superfive jadi
 * katalog, jumlah stok tidak lagi dijaga siapa pun — tidak ada pesanan yang
 * memotongnya dan tidak ada pembatalan yang mengembalikannya, jadi angkanya
 * pasti melenceng dari kenyataan. Yang bisa dijawab penjual dengan jujur
 * hanya "masih ada" atau "habis", dan itu yang ditanyakan `is_tersedia`.
 *
 * Produk pre-order TIDAK memakai lencana ini — statusnya dijawab periode PO,
 * lihat BadgePreorder dan panel PO di halaman detail.
 */
export default function BadgeTersedia({
  tersedia,
  kecil = false,
}: {
  tersedia: boolean | null | undefined
  kecil?: boolean
}) {
  // Kolomnya NOT NULL default true; null hanya muncul dari data lama yang
  // belum tersentuh migrasi. Diperlakukan sebagai tersedia, bukan habis —
  // menyembunyikan barang yang sebenarnya ada lebih merugikan penjual
  // daripada menampilkan barang yang ternyata sudah habis.
  const ada = tersedia !== false

  const warna = ada
    ? { bg: '#e8f5e9', teks: '#2e7d32', garis: '#a5d6a7' }
    : { bg: '#f4f7fb', teks: '#7a97b3', garis: '#cfe0ef' }

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: warna.bg, color: warna.teks,
        border: `0.5px solid ${warna.garis}`,
        borderRadius: '20px', whiteSpace: 'nowrap', lineHeight: 1,
        fontWeight: '600',
        fontSize: kecil ? '10px' : '11px',
        padding: kecil ? '3px 7px' : '4px 9px',
      }}
    >
      <span
        aria-hidden
        style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: warna.teks, flexShrink: 0,
        }}
      />
      {ada ? 'Tersedia' : 'Stok Habis'}
    </span>
  )
}
