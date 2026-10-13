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

export type HasilNomorOpsional =
  | { ok: true; nomor: string | null }
  | { ok: false; pesan: string }

/**
 * normalisasiWA untuk kolom yang BOLEH kosong (`users.no_hp`): kosong → null,
 * bukan galat dan bukan ''. Yang diisi dinormalkan ke 62…, sama persis
 * dengan nomor toko, supaya keduanya lolos CHECK `^62[0-9]{8,13}$`.
 */
export function normalisasiWAOpsional(masukan: string | null | undefined): HasilNomorOpsional {
  if (!(masukan ?? '').replace(/[\s\-().]/g, '')) return { ok: true, nomor: null }
  return normalisasiWA(masukan ?? '')
}

/**
 * Tampilan nomor yang enak dibaca: `6281322305799` → `+62 813-2230-5799`.
 *
 * Satu-satunya formatter nomor WA — dipakai kartu toko dan helper text form
 * kontak. Masukannya boleh bentuk tersimpan (62…) maupun yang sedang diketik
 * penjual (08…, +62…, 8…): awalan 0 dibuang dulu, karena "+62 081…" itu
 * nomor yang salah, bukan sekadar jelek. Masukan yang tidak dikenali
 * dikembalikan apa adanya, bukan ditebak.
 */
export function formatNomorWA(nomor: string | null | undefined): string {
  const mentah = (nomor ?? '').trim()
  if (!mentah) return ''

  let digit = mentah.replace(/[\s\-().]/g, '')
  if (digit.startsWith('+')) digit = digit.slice(1)
  if (!/^\d+$/.test(digit)) return mentah

  if (digit.startsWith('0')) digit = '62' + digit.slice(1)
  else if (digit.startsWith('8')) digit = '62' + digit
  if (!digit.startsWith('62') || digit.length < 5) return mentah

  const sisa = digit.slice(2).replace(/^0+/, '')
  return `+62 ${sisa.replace(/^(\d{3})(\d{4})(\d+)$/, '$1-$2-$3')}`
}

/**
 * Merapikan kapitalisasi nama kota: "KOTA BANDUNG" → "Kota Bandung",
 * "kab. bandung barat" → "Kab. Bandung Barat". Kosong → null, supaya
 * pemanggil cukup memeriksa satu nilai untuk menyembunyikan barisnya.
 */
export function rapikanKota(kota: string | null | undefined): string | null {
  const teks = (kota ?? '').trim().replace(/\s+/g, ' ')
  if (!teks) return null
  return teks
    .toLocaleLowerCase('id-ID')
    .replace(/(^|[\s\-(./])(\p{L})/gu, (_, pemisah: string, huruf: string) =>
      pemisah + huruf.toLocaleUpperCase('id-ID'))
}

export const PESAN_IG_TIDAK_VALID =
  'Username Instagram cuma boleh huruf, angka, titik, dan underscore, tanpa spasi. Contoh: inilima.shop'

export const PESAN_WA_TIDAK_VALID = 'Nomor WhatsApp tidak valid.'

export type HasilIG =
  | { ok: true; username: string | null }
  | { ok: false; pesan: string }

/**
 * Menormalkan username Instagram ke bentuk yang diterima CHECK
 * `toko_kontak_ig_format`: null, atau `^[A-Za-z0-9._]{1,30}$`.
 *
 * Link profil yang ditempel (instagram.com/x, instagr.am/x — dengan atau
 * tanpa https://, www., garis miring akhir, query string) diambil segmen
 * username-nya, lalu '@' di depan dibuang.
 *
 * Kosong jadi NULL, bukan '' — string kosong gagal `{1,30}` di database.
 * Spasi di TENGAH sengaja tidak dibuang diam-diam: "INILIMA SHOP" bisa jadi
 * "INILIMASHOP" atau "INILIMA_SHOP", dan menebak yang mana berarti menyimpan
 * akun orang lain. Penjual diminta membetulkannya sendiri.
 */
export function normalisasiUsernameIG(masukan: string | null | undefined): HasilIG {
  let teks = (masukan ?? '').trim()

  const dariUrl = teks.match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/([^/?#]*)/i,
  )
  if (dariUrl) teks = dariUrl[1]

  teks = teks.replace(/^@/, '')
  if (!teks) return { ok: true, username: null }

  if (!/^[A-Za-z0-9._]{1,30}$/.test(teks)) {
    return { ok: false, pesan: PESAN_IG_TIDAK_VALID }
  }
  return { ok: true, username: teks }
}

/**
 * Pesan ramah untuk pelanggaran CHECK `toko_kontak` (kode 23514), supaya
 * yang terbaca penjual kalimat, bukan bunyi constraint Postgres. Mengembalikan
 * kolom yang salah supaya pesannya bisa ditaruh di bawah kolomnya.
 */
export function pesanPelanggaranKontak(
  error: { code?: string; message?: string; details?: string } | null | undefined,
): { kolom: 'ig' | 'wa' | 'link' | null; pesan: string } | null {
  if (!error || error.code !== '23514') return null
  const teks = `${error.message ?? ''} ${error.details ?? ''}`
  if (teks.includes('toko_kontak_ig_format')) return { kolom: 'ig', pesan: PESAN_IG_TIDAK_VALID }
  if (teks.includes('toko_kontak_wa_format')) return { kolom: 'wa', pesan: PESAN_WA_TIDAK_VALID }
  if (teks.includes('toko_kontak_link_format')) return { kolom: 'link', pesan: 'Link tidak valid.' }
  return { kolom: null, pesan: 'Ada isian kontak yang tidak valid. Periksa lagi, lalu simpan ulang.' }
}

/**
 * Membuang '@' dan URL lengkap dari username Instagram yang ditempel orang.
 * Hanya untuk MEMBACA nilai lama (urlInstagram). Form penyimpanan memakai
 * normalisasiUsernameIG, yang juga memvalidasi.
 */
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

/**
 * Pesan admin ke penjual setelah pengajuannya diputuskan, untuk tombol
 * "Kabari via WA" di /admin/penjual. null untuk status yang belum punya
 * keputusan (menunggu) — tidak ada yang perlu dikabarkan.
 */
export function pesanKabarPenjual(
  nama: string | null | undefined,
  status: string,
  alasan: string | null | undefined,
): string | null {
  const sapaan = nama?.trim() || 'Kak'
  if (status === 'aktif') {
    return `Halo ${sapaan}, pengajuanmu sebagai penjual di Superfive Market sudah DISETUJUI 🎉 Tokomu sudah dibuat otomatis. Langkah selanjutnya: masuk ke superfivemarket.com, buka Dashboard > tab Toko untuk ganti nama toko, kategori, foto, dan kontak WhatsApp, lalu tambahkan produk pertamamu. Tokomu akan tampil selama KLIMAX FEST 17 Oktober 2026. — Admin Superfive Market`
  }
  if (status === 'ditolak' || status === 'dibekukan') {
    // Alasan wajib di putuskan_penjual untuk kedua status ini; cadangan
    // supaya kalimatnya tidak berbunyi "pengajuan penjualmu: ."
    const isi = alasan?.trim() || (status === 'ditolak' ? 'pengajuanmu belum bisa kami setujui' : 'akun penjualmu sedang dibekukan')
    return `Halo ${sapaan}, terkait pengajuan penjualmu di Superfive Market: ${isi}. Kalau ada pertanyaan, balas pesan ini. — Admin Superfive Market`
  }
  return null
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
 * kalau pop-up diblokir, tujuannya dibuka dengan `window.location.href` di
 * HALAMAN SUPERFIVE SENDIRI. Menyetel `location.href` ke `javascript:` di
 * sana menjalankan skripnya sebagai halaman Superfive — cukup bagi penjual
 * untuk mengambil token sesi pembeli dari localStorage. Jadi hanya http dan
 * https yang diloloskan; selain itu null, dan pemanggil menolak membukanya.
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
