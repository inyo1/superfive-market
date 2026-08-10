// Kosakata status dijaga CHECK constraint di database — nilai di luar daftar ini
// akan ditolak Postgres. Jangan tambah nilai baru di sini tanpa mengubah
// constraint-nya dulu (lihat aturan skema di CLAUDE.md).

export const STATUS_PESANAN = [
  'menunggu', 'dibayar', 'diproses', 'dikirim', 'selesai', 'dibatalkan',
] as const

export type StatusPesanan = (typeof STATUS_PESANAN)[number]

// Urutan maju yang bisa dijalankan penjual. 'dibatalkan' di luar alur ini
// karena bisa terjadi dari status mana pun sebelum selesai.
export const ALUR_STATUS: StatusPesanan[] = [
  'menunggu', 'dibayar', 'diproses', 'dikirim', 'selesai',
]

export function statusBerikutnya(status: string): StatusPesanan | null {
  const i = ALUR_STATUS.indexOf(status as StatusPesanan)
  if (i === -1 || i === ALUR_STATUS.length - 1) return null
  return ALUR_STATUS[i + 1]
}

export function bisaDibatalkan(status: string) {
  return status === 'menunggu' || status === 'dibayar' || status === 'diproses'
}

const WARNA: Record<string, { bg: string; color: string }> = {
  menunggu:   { bg: '#fff8e1', color: '#f57f17' },
  dibayar:    { bg: '#e3f2fd', color: '#1565c0' },
  diproses:   { bg: '#ede7f6', color: '#5e35b1' },
  dikirim:    { bg: '#fff3e0', color: '#e65100' },
  selesai:    { bg: '#e8f5e9', color: '#2e7d32' },
  dibatalkan: { bg: '#fce4e4', color: '#c62828' },
}

export function warnaStatus(status: string) {
  return WARNA[status] ?? { bg: '#f0f5fb', color: '#5a7da0' }
}

// Label panjang untuk badge di halaman pembeli
export const LABEL_STATUS: Record<string, string> = {
  menunggu:   'Menunggu Pembayaran',
  dibayar:    'Sudah Dibayar',
  diproses:   'Sedang Diproses',
  dikirim:    'Dalam Pengiriman',
  selesai:    'Selesai',
  dibatalkan: 'Dibatalkan',
}

// Label tombol aksi penjual, per status tujuan
export const AKSI_STATUS: Record<string, string> = {
  dibayar:  'Tandai Sudah Dibayar',
  diproses: 'Proses Pesanan',
  dikirim:  'Kirim Pesanan',
  selesai:  'Tandai Selesai',
}

export function labelStatus(status: string) {
  return LABEL_STATUS[status] ?? status
}
