// Format angka untuk input harga. Yang tampil ke pengguna pakai pemisah
// ribuan, yang dikirim ke database tetap angka murni.

/** 3500000 -> "3.500.000" */
export function formatRibuan(nilai: string | number | null | undefined): string {
  const angka = angkaMurni(nilai)
  if (angka === '') return ''
  return Number(angka).toLocaleString('id-ID')
}

/** "3.500.000" atau "Rp 3.500.000" -> "3500000" */
export function angkaMurni(nilai: string | number | null | undefined): string {
  if (nilai === null || nilai === undefined) return ''
  return String(nilai).replace(/\D/g, '')
}

/** Nilai numerik siap kirim ke database, 0 kalau kosong */
export function keAngka(nilai: string | number | null | undefined): number {
  const bersih = angkaMurni(nilai)
  return bersih === '' ? 0 : Number(bersih)
}

// ── Tanggal peristiwa ───────────────────────────────────────────────────────
//
// Cap waktu kejadian: created_at, paid_at, dikirim_at, dibatalkan_at. Berbeda
// dari batas waktu PO di lib/preorder.ts, tapi sama-sama dipatok WIB — dengan
// alasan yang berbeda: riwayat satu pesanan dibaca penjual DAN pembeli, dan
// keduanya harus melihat jam yang sama. Kalau mengikuti zona peramban,
// pesanan yang dikirim tengah malam bisa tercatat "14 Agustus" di layar yang
// satu dan "15 Agustus" di layar yang lain — dan dua orang bisa berdebat soal
// kapan barangnya benar-benar jalan.
//
// Untuk tanggal kalender (kolom date, mis. po_janji_kirim) JANGAN pakai ini;
// pakai janjiKirim atau tanggalLengkap di lib/preorder.ts, dan alasannya ada
// di catatan berkas itu.

const ZONA = 'Asia/Jakarta'

const formatTglPendek = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric',
})

const formatTglPanjang = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA, day: 'numeric', month: 'long', year: 'numeric',
})

/**
 * "14 Agu 2026", atau "14 Agustus 2026" kalau `panjang`.
 * Selalu WIB, apa pun zona perambannya.
 */
export function tanggalPeristiwa(
  waktu: string | Date | null | undefined,
  panjang = false,
): string {
  if (!waktu) return '-'
  const d = waktu instanceof Date ? waktu : new Date(waktu)
  if (isNaN(d.getTime())) return '-'
  return (panjang ? formatTglPanjang : formatTglPendek).format(d)
}
