// Kosakata status dijaga CHECK constraint di database — nilai di luar daftar ini
// akan ditolak Postgres. Jangan tambah nilai baru di sini tanpa mengubah
// constraint-nya dulu (lihat aturan skema di CLAUDE.md).
import { tanggalWIB } from './preorder'

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

// ── Tenggat kirim efektif ───────────────────────────────────────────────────
//
// `batas_kirim` bukan detik matinya pesanan. Yang membatalkan pesanan telat
// adalah tugas harian, dan tugas itu jalan sekali sehari pukul 05:05 WIB. Jadi
// penjual yang tenggatnya jatuh tengah malam sebenarnya masih punya waktu
// sampai pagi.
//
// Kelonggaran itu disengaja: penjual rumahan yang baru selesai mengemas lewat
// tengah malam tidak kehilangan seluruh pesanannya padahal barangnya sudah
// jadi. Karena itu UI menampilkan waktu efektif ini, bukan `batas_kirim`
// mentah — kalau yang mentah yang ditampilkan, penjual panik padahal masih
// punya beberapa jam.
//
// Tenggangnya tidak tak terbatas: `ubah_status_pesanan` menolak 'dikirim'
// begitu lewat `batas_kirim + 30 jam`. Itu jaring pengaman kalau cron pernah
// gagal atau dimatikan — tanpa itu, pesanan yang telat berhari-hari ikut lolos
// begitu cron hidup lagi.

const JAM_CRON_WIB = 5
const MENIT_CRON_WIB = 5
const JAM_TENGGANG_MAKS = 30

// WIB tetap UTC+7 sepanjang tahun, tidak ada DST — jadi aman menghitung
// instannya lewat Date.UTC dengan jam digeser mundur 7.
const OFFSET_WIB = 7

/**
 * Kapan pesanan ini benar-benar hangus: jalannya cron pertama setelah
 * `batas_kirim`, dibatasi `batas_kirim + 30 jam`.
 *
 * Perhatikan ini bukan selalu "hari berikutnya". Kalau `batas_kirim` jatuh
 * sebelum pukul 05:05 WIB, cron hari itu juga yang menyapunya. Pesanan PO
 * memang selalu jatuh 23:59:59 WIB sehingga selalu ke besok, tapi pesanan
 * barang ready memakai `now() + 3 hari` dan jamnya bisa berapa saja.
 */
export function tenggatEfektif(batasKirim: string | null | undefined): Date | null {
  if (!batasKirim) return null
  const batas = new Date(batasKirim)
  if (isNaN(batas.getTime())) return null

  const ymd = tanggalWIB(batas)
  if (!ymd) return null
  const [tahun, bulan, hari] = ymd.split('-').map(Number)

  // 05:05 WIB pada tanggal WIB-nya batas_kirim
  let cron = new Date(Date.UTC(tahun, bulan - 1, hari, JAM_CRON_WIB - OFFSET_WIB, MENIT_CRON_WIB))
  // Sudah lewat? Berarti yang menyapunya cron besok. WIB tanpa DST, jadi
  // menambah 24 jam persis benar.
  if (cron.getTime() <= batas.getTime()) {
    cron = new Date(cron.getTime() + 24 * 3600_000)
  }

  const maks = new Date(batas.getTime() + JAM_TENGGANG_MAKS * 3600_000)
  return cron.getTime() < maks.getTime() ? cron : maks
}

const formatWaktuWIB = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric', month: 'short',
  hour: '2-digit', minute: '2-digit',
})

/** "15 Agu 05.05 WIB" — selalu dalam WIB, bukan zona peramban. */
export function waktuWIB(d: Date): string {
  return formatWaktuWIB.format(d) + ' WIB'
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
