// Kontak penjual untuk mode katalog — normalisasi nomor WA dan template
// pesan pembuka. Dipakai TombolHubungi (pembeli) dan form Kontak Toko
// (penjual), supaya aturan nomornya ditulis satu kali.

/** Bentuk yang disimpan di `toko_kontak.no_wa`: 62 + nomor, tanpa tanda baca. */
export type HasilNomor =
  | { ok: true; nomor: string }
  | { ok: false; pesan: string }

/**
 * Menormalkan nomor WhatsApp Indonesia ke bentuk `62xxxxxxxxx`.
 *
 * Penjual menuliskan nomornya dengan tiga cara yang sama benarnya di mata
 * mereka — `08123...`, `+62812...`, `62812...` — dan ketiganya harus
 * berakhir sebagai satu bentuk, karena wa.me hanya menerima yang terakhir.
 * Menolak dua bentuk pertama sebagai "salah format" cuma memindahkan
 * pekerjaan mengetik ulang ke penjual untuk sesuatu yang bisa dibereskan
 * mesin.
 *
 * Spasi, tanda hubung, titik, dan kurung dibuang lebih dulu — orang menyalin
 * nomor dari kartu nama dan bio Instagram, dan bentuknya bermacam-macam.
 */
export function normalisasiWA(masukan: string): HasilNomor {
  const bersih = (masukan ?? '').replace(/[\s\-().]/g, '')

  if (!bersih) return { ok: false, pesan: 'Nomor WhatsApp belum diisi.' }

  if (/[^\d+]/.test(bersih)) {
    return { ok: false, pesan: 'Nomor WhatsApp hanya boleh berisi angka.' }
  }

  let n = bersih
  if (n.startsWith('+62')) n = '62' + n.slice(3)
  else if (n.startsWith('62')) n = n
  else if (n.startsWith('0')) n = '62' + n.slice(1)
  // Sebagian orang menulis nomornya tanpa awalan sama sekali ("8123...")
  else if (n.startsWith('8')) n = '62' + n

  if (n.includes('+')) {
    return { ok: false, pesan: 'Nomor WhatsApp hanya boleh berisi angka.' }
  }

  // Semua nomor seluler Indonesia berawalan 8 setelah kode negara. Panjang
  // totalnya berkisar 10–14 digit setelah "62".
  if (!/^628\d{7,12}$/.test(n)) {
    return {
      ok: false,
      pesan: 'Nomor WhatsApp tidak valid. Contoh: 081234567890 atau 6281234567890.',
    }
  }

  return { ok: true, nomor: n }
}

/** Tampilan nomor yang enak dibaca di dashboard: `+62 812-3456-7890`. */
export function tampilkanWA(nomor: string | null | undefined): string {
  if (!nomor) return ''
  const sisa = nomor.startsWith('62') ? nomor.slice(2) : nomor
  const bagian = sisa.replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3')
  return `+62 ${bagian}`
}

/** Membuang '@' dan URL lengkap dari username Instagram yang ditempel orang. */
export function normalisasiIG(masukan: string): string {
  return (masukan ?? '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '')
    .trim()
}

type IsiPesan = {
  /** Kosong untuk pengunjung yang belum login */
  namaPembeli: string
  /** `label_angkatan` dari view ("Superfive 92") — bukan tahun mentah */
  labelAngkatan?: string | null
  namaProduk: string
}

/**
 * Template pesan pembuka kalau penjual belum menulis `pesan_awal` sendiri.
 *
 * Angkatan sengaja DILEWATI kalau kosong. Sejak pembeli boleh siapa saja,
 * yang berstatus `umum` memang tidak punya angkatan — dan "(null)" di pesan
 * pertama ke penjual terbaca seperti aplikasi yang rusak.
 *
 * Pengunjung anonim tidak memperkenalkan diri sama sekali, dan itu
 * disengaja: menuliskan "saya alumni Superfive" atas nama orang yang
 * belum tentu alumni adalah klaim yang tidak pernah dia buat.
 */
export function pesanDefault({ namaPembeli, labelAngkatan, namaProduk }: IsiPesan): string {
  const nama = namaPembeli.trim()
  const pembuka = nama
    ? `Halo, saya ${labelAngkatan ? `${nama} (${labelAngkatan})` : nama} dari Superfive Market. `
    : 'Halo, saya lihat produk Anda di Superfive Market. '
  return pembuka + `Saya tertarik dengan produk ${namaProduk}. Apakah masih tersedia?`
}

/**
 * Awalan skema URL (`https:`, `mailto:`, `javascript:`, ...). Dipakai
 * normalisasiLink dan urlLinkLain supaya keduanya sepakat soal mana yang
 * "sudah punya skema" dan mana yang perlu diberi https://.
 *
 * Sengaja hanya melihat awal teks, bukan "mengandung titik dua di mana pun":
 * "wa.me/62812?text=halo:)" tidak punya skema, dan tetap harus diberi
 * https:// alih-alih ditolak.
 */
const SKEMA = /^[a-z][a-z0-9+.-]*:/i

export const PESAN_LINK_TIDAK_VALID =
  'Link harus diawali http:// atau https:// dan tidak boleh mengandung spasi.'

export type HasilLink =
  | { ok: true; link: string | null }
  | { ok: false; pesan: string }

/**
 * Menormalkan `link_lain` ke bentuk yang diterima CHECK
 * `toko_kontak_link_format`: null, atau `^https?://\S+$` (tanpa peka huruf
 * besar-kecil) dengan panjang paling banyak 500 karakter.
 *
 * "instagram.com/toko" jadi "https://instagram.com/toko". Itu bentuk yang
 * paling mungkin diketik penjual, dan menolaknya cuma memindahkan pekerjaan
 * mesin ke penjual, sama seperti alasan di normalisasiWA.
 *
 * Panjangnya dihitung per code point, bukan per unit UTF-16, supaya cocok
 * dengan `length()` di Postgres.
 */
export function normalisasiLink(masukan: string | null | undefined): HasilLink {
  const teks = (masukan ?? '').trim()
  if (!teks) return { ok: true, link: null }

  const link = SKEMA.test(teks) ? teks : 'https://' + teks

  if (!/^https?:\/\/\S+$/i.test(link) || Array.from(link).length > 500) {
    return { ok: false, pesan: PESAN_LINK_TIDAK_VALID }
  }
  return { ok: true, link }
}

/** URL wa.me lengkap. Teksnya dienkode utuh, termasuk spasi dan tanda baca. */
export function urlWhatsApp(nomor: string, pesan: string): string {
  return `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`
}

export function urlInstagram(username: string): string {
  return `https://instagram.com/${normalisasiIG(username)}`
}

/**
 * URL "link lain" penjual, disaring sebelum boleh dibuka.
 *
 * Sejak 11 September 2026 `toko_kontak.link_lain` dijaga CHECK
 * `toko_kontak_link_format` (http/https, tanpa spasi, maks 500), dan form
 * penjual menormalkannya lewat normalisasiLink. JANGAN buang saringan di
 * bawah karena itu. Constraint bisa diubah atau dicabut di sesi migrasi
 * lain tanpa ada yang menyentuh berkas ini, `^https?://\S+` masih
 * meloloskan teks yang tidak bisa diurai `new URL()`, dan yang dijaga di
 * sini terlalu mahal untuk digantungkan pada satu lapis saja.
 *
 * Kenapa taruhannya mahal, karena cara TombolHubungi membuka tautannya:
 * tab dibuat lebih dulu dengan `window.open('', '_blank')` supaya tidak
 * diblokir pop-up blocker, dan tab about:blank MEWARISI ORIGIN pembukanya.
 * Menyetel `location.href` ke `javascript:` di tab seperti itu menjalankan
 * skripnya sebagai halaman Superfive — cukup bagi penjual untuk mengambil
 * token sesi pembeli dari localStorage. Jadi hanya http dan https yang
 * diloloskan; selain itu null, dan pemanggil menolak membukanya.
 *
 * Tautan tanpa skema ("linktr.ee/tokokamu") tetap dilayani, untuk baris
 * yang tersimpan sebelum form menormalkannya.
 */
export function urlLinkLain(mentah: string | null | undefined): string | null {
  const teks = (mentah ?? '').trim()
  if (!teks) return null

  const berskema = SKEMA.test(teks) ? teks : 'https://' + teks

  try {
    const url = new URL(berskema)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
