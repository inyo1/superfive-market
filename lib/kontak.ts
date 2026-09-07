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
  namaPembeli: string
  angkatan?: number | null
  namaProduk: string
}

/**
 * Template pesan pembuka kalau penjual belum menulis `pesan_awal` sendiri.
 *
 * Angkatan sengaja DILEWATI kalau kosong. Sejak pembeli boleh siapa saja,
 * yang berstatus `umum` memang tidak punya angkatan — dan "(Angkatan null)"
 * di pesan pertama ke penjual terbaca seperti aplikasi yang rusak.
 */
export function pesanDefault({ namaPembeli, angkatan, namaProduk }: IsiPesan): string {
  const nama = namaPembeli.trim() || 'alumni Superfive'
  const identitas = angkatan ? `${nama} (Angkatan ${angkatan})` : nama
  return (
    `Halo, saya ${identitas} dari Superfive Market. ` +
    `Saya tertarik dengan produk ${namaProduk}. Apakah masih tersedia?`
  )
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
 * Kolom `toko_kontak.link_lain` TIDAK punya CHECK constraint, dan form
 * penjual tidak memvalidasinya — beda dengan `no_wa` dan `ig_username`
 * yang dikunci regex di database. Isinya teks bebas apa pun.
 *
 * Itu baru berbahaya justru karena cara TombolHubungi membuka tautannya:
 * tab dibuat lebih dulu dengan `window.open('', '_blank')` supaya tidak
 * diblokir pop-up blocker, dan tab about:blank MEWARISI ORIGIN pembukanya.
 * Menyetel `location.href` ke `javascript:` di tab seperti itu menjalankan
 * skripnya sebagai halaman Superfive — cukup bagi penjual untuk mengambil
 * token sesi pembeli dari localStorage. Jadi hanya http dan https yang
 * diloloskan; selain itu null, dan pemanggil menolak membukanya.
 *
 * Penjual yang menulis "linktr.ee/tokokamu" tanpa skema tetap dilayani.
 * Itu salah ketik yang lumrah, bukan tautan berbahaya.
 */
export function urlLinkLain(mentah: string | null | undefined): string | null {
  const teks = (mentah ?? '').trim()
  if (!teks) return null

  const berskema = /^[a-z][a-z0-9+.-]*:/i.test(teks) ? teks : 'https://' + teks

  try {
    const url = new URL(berskema)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
