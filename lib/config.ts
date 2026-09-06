// Mode transaksi Superfive Market.
//
// 'kontak'  — MODE KATALOG. Tidak ada payment gateway. Pembeli menghubungi
//             penjual langsung lewat WhatsApp/Instagram, dan seluruh alur
//             keranjang–checkout–pesanan DIBEKUKAN.
// 'pesanan' — mode marketplace penuh yang lama: keranjang, checkout, dan
//             mesin status pesanan aktif.
//
// KENAPA KONSTANTA, BUKAN PENGHAPUSAN
//
// Kode transaksi TIDAK dihapus, hanya dipagari. Mesin status pesanan,
// create_pesanan, refund, dan tugas harian di database masih utuh dan sudah
// teruji — membongkarnya berarti membuangnya, dan menyalakannya lagi nanti
// berarti menulis ulang semuanya dari nol.
//
// Jadi halaman transaksi tetap ada di repo dengan early return berdasarkan
// konstanta ini. Untuk menyalakan kembali: ganti nilainya ke 'pesanan'.
//
// PAGAR SEBENARNYA ADA DI DATABASE. Konstanta ini cuma menyembunyikan pintu
// di UI — yang benar-benar menutup transaksi adalah EXECUTE create_pesanan
// yang sudah dicabut. Jangan pernah memperlakukan konstanta klien sebagai
// penjaga keamanan; siapa pun bisa mengubahnya lewat DevTools.
export const MODE_TRANSAKSI: 'kontak' | 'pesanan' = 'kontak'

/** Alur keranjang, checkout, dan riwayat pesanan sedang dibekukan. */
export const transaksiBeku = MODE_TRANSAKSI === 'kontak'

/** Rute yang dibekukan saat mode katalog. Dipakai halaman-halaman itu
 *  sendiri lewat early return, bukan oleh middleware — supaya kode yang
 *  dibekukan tetap terlihat di tempatnya. */
export const RUTE_TRANSAKSI = ['/keranjang', '/checkout', '/pesanan'] as const
