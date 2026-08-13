// Kosakata status dijaga CHECK constraint di database — nilai di luar daftar ini
// akan ditolak Postgres. Jangan tambah nilai baru di sini tanpa mengubah
// constraint-nya dulu (lihat aturan skema di CLAUDE.md).

export const STATUS_PESANAN = [
  'menunggu', 'dibayar', 'diproses', 'dikirim', 'selesai', 'dibatalkan',
] as const

export type StatusPesanan = (typeof STATUS_PESANAN)[number]

// Urutan maju. 'dibatalkan' di luar alur ini karena bisa terjadi dari status
// mana pun sebelum barang jalan.
export const ALUR_STATUS: StatusPesanan[] = [
  'menunggu', 'dibayar', 'diproses', 'dikirim', 'selesai',
]

/**
 * Perpindahan yang boleh dijalankan PENJUAL dari sebuah status.
 *
 * Cerminan `ubah_status_pesanan` di database — bukan aturan tersendiri.
 * Gunanya hanya supaya tombol yang pasti ditolak tidak ditampilkan; yang
 * memutuskan tetap server, dan pesan errornya ditampilkan apa adanya.
 *
 * Perhatikan dua hal yang berbeda dari alur lurus:
 * - 'diproses' boleh dilewati, penjual bisa langsung mengirim setelah lunas
 * - 'selesai' TIDAK ada di sini sama sekali; hanya pembeli yang boleh
 */
export function aksiPenjual(status: string): StatusPesanan[] {
  switch (status) {
    case 'menunggu': return ['dibayar']
    case 'dibayar':  return ['diproses', 'dikirim']
    case 'diproses': return ['dikirim']
    default:         return []
  }
}

/** Pembeli menutup pesanannya sendiri, hanya setelah barang dikirim. */
export function bisaDiterimaPembeli(status: string) {
  return status === 'dikirim'
}

/**
 * `batalkan_pesanan` menolak yang sudah selesai, sudah dibatalkan, dan yang
 * sudah dikirim — barang yang terlanjur jalan itu urusan komplain, bukan
 * pembatalan.
 */
export function bisaDibatalkan(status: string) {
  return status === 'menunggu' || status === 'dibayar' || status === 'diproses'
}

/** Berapa lama pesanan yang sudah dikirim ditutup sendiri oleh sistem. */
export const HARI_SELESAI_OTOMATIS = 6

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

// ── Status pembayaran ────────────────────────────────────────────────────
// Juga dijaga CHECK constraint (chk_payment_status) di database.

export const PAYMENT_STATUS = [
  'menunggu', 'lunas', 'gagal', 'kadaluarsa', 'refund',
] as const

export type PaymentStatus = (typeof PAYMENT_STATUS)[number]

const WARNA_BAYAR: Record<string, { bg: string; color: string }> = {
  menunggu:   { bg: '#eceff1', color: '#607d8b' },
  lunas:      { bg: '#e8f5e9', color: '#2e7d32' },
  gagal:      { bg: '#fce4e4', color: '#c62828' },
  kadaluarsa: { bg: '#eceff1', color: '#455a64' },
  refund:     { bg: '#ede7f6', color: '#5e35b1' },
}

const LABEL_BAYAR: Record<string, string> = {
  menunggu:   'Belum Dibayar',
  lunas:      'Lunas',
  gagal:      'Pembayaran Gagal',
  kadaluarsa: 'Kadaluarsa',
  refund:     'Dana Dikembalikan',
}

export function warnaPembayaran(status: string | null) {
  return WARNA_BAYAR[status ?? ''] ?? { bg: '#eceff1', color: '#607d8b' }
}

export function labelPembayaran(status: string | null) {
  return LABEL_BAYAR[status ?? ''] ?? 'Belum Dibayar'
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

// Label tombol aksi penjual, per status tujuan.
// 'dibayar' sekalian menandai pembayaran lunas — di database keduanya satu
// langkah, jadi tidak ada lagi tombol pembayaran yang terpisah.
export const AKSI_STATUS: Record<string, string> = {
  dibayar:  '💰 Tandai Sudah Dibayar',
  diproses: 'Proses Pesanan',
  dikirim:  'Kirim Pesanan',
}

export function labelStatus(status: string) {
  return LABEL_STATUS[status] ?? status
}
