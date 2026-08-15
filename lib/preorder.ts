// Aturan tampilan pre-order. Server tetap penjaga terakhirnya lewat
// create_pesanan — semua di sini hanya supaya pengguna tahu lebih awal dan
// tidak menabrak error mentah.

export type DataPO = {
  is_preorder?: boolean | null
  po_mulai?: string | null
  po_selesai?: string | null
  po_janji_kirim?: string | null
  po_target?: number | null
  po_maks?: number | null
  po_catatan?: string | null
}

export type StatusPO =
  | 'bukan_po'
  | 'belum_dibuka'
  | 'buka'
  | 'ditutup'
  | 'kuota_penuh'

/**
 * Menentukan keadaan PO pada satu titik waktu. `sekarang` dikirim dari
 * pemanggil supaya fungsinya murni dan gampang diuji — Date.now() tidak
 * dipanggil di sini.
 */
export function statusPO(p: DataPO, terkumpul: number | null, sekarang: number): StatusPO {
  if (!p.is_preorder) return 'bukan_po'

  const mulai = p.po_mulai ? new Date(p.po_mulai).getTime() : null
  const selesai = p.po_selesai ? new Date(p.po_selesai).getTime() : null

  if (mulai !== null && sekarang < mulai) return 'belum_dibuka'
  if (selesai !== null && sekarang > selesai) return 'ditutup'

  // Kuota dicek setelah periode: PO yang sudah lewat tetap "ditutup",
  // bukan "kuota penuh", supaya alasannya tidak menyesatkan
  if (p.po_maks != null && terkumpul != null && terkumpul >= p.po_maks) return 'kuota_penuh'

  return 'buka'
}

export function bisaPesanPO(s: StatusPO) {
  return s === 'buka' || s === 'bukan_po'
}

export function alasanTidakBisa(s: StatusPO, poMulai?: string | null): string | null {
  switch (s) {
    case 'belum_dibuka':
      return poMulai ? `PO dibuka pada ${tanggalPanjang(poMulai)}` : 'PO belum dibuka'
    case 'ditutup':
      return 'Periode PO sudah ditutup'
    case 'kuota_penuh':
      return 'Kuota penuh'
    default:
      return null
  }
}

/** "5 hari 3 jam", "3 jam 20 menit", "12 menit" */
export function formatSisa(selisihMs: number): string {
  if (selisihMs <= 0) return 'kurang dari semenit'

  const menit = Math.floor(selisihMs / 60000)
  const jam = Math.floor(menit / 60)
  const hari = Math.floor(jam / 24)

  if (hari > 0) {
    const sisaJam = jam % 24
    return sisaJam > 0 ? `${hari} hari ${sisaJam} jam` : `${hari} hari`
  }
  if (jam > 0) {
    const sisaMenit = menit % 60
    return sisaMenit > 0 ? `${jam} jam ${sisaMenit} menit` : `${jam} jam`
  }
  if (menit > 0) return `${menit} menit`
  return 'kurang dari semenit'
}

const ZONA = 'Asia/Jakarta'

// ── Dua golongan tanggal, dan JANGAN diseragamkan ───────────────────────────
//
// (a) TITIK WAKTU — po_mulai, po_selesai. Kolomnya timestamptz, satu momen
//     yang sama untuk semua orang. Ditampilkan dengan timeZone: Asia/Jakarta
//     karena server yang menilai batasnya juga memakai kalender WIB; tanpa
//     dipatok, penjual di luar negeri bisa membaca tanggal tutup PO beda satu
//     hari dari yang diputuskan database.
//
// (b) TANGGAL KALENDER — po_janji_kirim. Kolomnya date, "2026-09-28", tidak
//     menunjuk momen apa pun. Justru TIDAK BOLEH dipatok ke WIB: nilainya
//     diurai jadi tengah malam waktu setempat, dan memaksanya ke WIB akan
//     memundurkan harinya untuk pengguna di zona timur. Diurai manual, karena
//     new Date("2026-09-28") dianggap UTC dan di WIB bisa mundur sehari.
//
// Yang golongan (a): tanggalPanjang, tanggalSingkat, waktuLengkapWIB.
// Yang golongan (b): janjiKirim, tanggalLengkap.

const formatPanjangWIB = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA, day: 'numeric', month: 'long', year: 'numeric',
})

const formatSingkatWIB = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

/** (a) "14 Agustus 2026" — dalam WIB */
export function tanggalPanjang(iso: string | null | undefined): string {
  if (!iso) return '-'
  return formatPanjangWIB.format(new Date(iso))
}

/**
 * (b) Janji kirim untuk ditampilkan: "Dikirim 28 September 2026".
 * Tanggal kalender — sengaja tanpa timeZone, lihat catatan di atas.
 */
export function janjiKirim(tanggal: string | null | undefined): string | null {
  if (!tanggal) return null
  const [t, b, h] = tanggal.slice(0, 10).split('-').map(Number)
  if (!t || !b || !h) return null
  return 'Dikirim ' + new Date(t, b - 1, h).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/**
 * (a) "14 Agu 2026, 17.00 WIB" — dalam WIB.
 *
 * "WIB" wajib ikut karena yang ditampilkan di sini jam tutup PO. Tanpa
 * keterangan zona, "tutup 14 Agu, 17.00" tidak memberi tahu jam siapa.
 */
export function tanggalSingkat(iso: string | null | undefined): string {
  if (!iso) return '-'
  return formatSingkatWIB.format(new Date(iso)) + ' WIB'
}

/** Untuk input datetime-local: "2026-08-14T17:00" */
export function keInputLokal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Kebalikannya — input lokal jadi ISO untuk disimpan */
export function dariInputLokal(nilai: string): string | null {
  if (!nilai) return null
  const d = new Date(nilai)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export const KOLOM_PO =
  'is_preorder, po_mulai, po_selesai, po_janji_kirim, po_target, po_maks, po_catatan'

// ── Sisi form ───────────────────────────────────────────────────────────────
// Isian form disimpan sebagai string apa adanya dari input, baru diubah jadi
// nilai kolom saat disimpan. Angka kosong jadi null, bukan 0.

/**
 * Status ketersediaan barang. String kosong berarti penjual belum memilih —
 * itu keadaan awal yang disengaja untuk produk baru, supaya tidak ada produk
 * berstatus ready hanya karena penjual melewatkan pilihannya.
 */
export type StatusBarang = '' | 'ready' | 'preorder'

export type FormPO = {
  status: StatusBarang
  mulai: string          // datetime-local
  selesai: string        // datetime-local
  janji: string          // date, "2026-09-28"
  target: string
  maks: string
  catatan: string
}

export const FORM_PO_KOSONG: FormPO = {
  status: '', mulai: '', selesai: '', janji: '', target: '', maks: '', catatan: '',
}

/**
 * Isian form dari produk yang sudah ada. Produk lama selalu punya status yang
 * jelas karena `is_preorder` NOT NULL — yang kosong hanya produk baru.
 */
export function formPODari(p: DataPO | null | undefined): FormPO {
  if (!p) return FORM_PO_KOSONG
  return {
    status: p.is_preorder ? 'preorder' : 'ready',
    mulai: keInputLokal(p.po_mulai),
    selesai: keInputLokal(p.po_selesai),
    janji: p.po_janji_kirim ? p.po_janji_kirim.slice(0, 10) : '',
    target: p.po_target != null ? String(p.po_target) : '',
    maks: p.po_maks != null ? String(p.po_maks) : '',
    catatan: p.po_catatan ?? '',
  }
}

/** Ringkas untuk pemanggil yang cuma perlu tahu ini PO atau bukan. */
export function formPOAktif(f: FormPO) {
  return f.status === 'preorder'
}

// en-CA memberi format YYYY-MM-DD, sama persis dengan bentuk kolom date
const formatYMD = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
})

/**
 * Tanggal kalender WIB dari sebuah waktu. Constraint chk_po_janji_kirim
 * membandingkan dengan `(po_selesai AT TIME ZONE 'Asia/Jakarta')::date`,
 * jadi pembandingnya harus kalender WIB — bukan UTC, dan bukan pula zona
 * waktu peramban, supaya penjual yang sedang di luar negeri tetap dinilai
 * dengan aturan yang sama seperti di database.
 *
 * Untuk penjual di WIB hasilnya sama dengan tanggal yang terlihat di form.
 */
export function tanggalWIB(waktu: string | Date | null | undefined): string | null {
  if (!waktu) return null
  const d = waktu instanceof Date ? waktu : new Date(waktu)
  return isNaN(d.getTime()) ? null : formatYMD.format(d)
}

// Pratinjau tanggal untuk form PO. Alasannya ada di bentuk <input> itu
// sendiri: type="date" dan type="datetime-local" dirender browser mengikuti
// bahasa sistem, jadi laptop berbahasa Inggris menampilkan MM/DD/YYYY dan
// tidak ada atribut maupun CSS yang bisa mengubahnya. Yang bisa dikendalikan
// hanya teks di sebelahnya — dan nama bulan yang dieja menghilangkan seluruh
// keraguan urutan hari/bulan.

const formatWaktuWIB = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA,
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

// Tanpa timeZone: nilainya tanggal kalender, bukan titik waktu. Memaksanya
// ke WIB justru bisa memundurkan harinya untuk penjual di zona timur.
const formatHari = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

function bagian(f: Intl.DateTimeFormat, d: Date): Record<string, string> {
  return Object.fromEntries(f.formatToParts(d).map(p => [p.type, p.value]))
}

/**
 * "Senin, 1 September 2026, 00:00 WIB" — untuk nilai datetime-local.
 *
 * Waktunya ditampilkan dalam WIB, bukan zona peramban, dan itu disengaja:
 * `dariInputLokal` menyimpan apa yang diketik menurut zona peramban, lalu
 * database menilainya dalam WIB. Jadi untuk penjual yang sedang di luar
 * negeri, angka di pratinjau ini memang akan berbeda dari yang ia ketik —
 * dan justru itu yang perlu ia lihat, karena itulah yang dibaca pembeli.
 * Untuk penjual di WIB hasilnya sama persis dengan isian formnya.
 */
export function waktuLengkapWIB(nilai: string | null | undefined): string | null {
  if (!nilai) return null
  const d = new Date(nilai)
  if (isNaN(d.getTime())) return null
  const p = bagian(formatWaktuWIB, d)
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} WIB`
}

/**
 * "Senin, 14 September 2026" — untuk nilai kolom date ("2026-09-14").
 *
 * Diurai manual, sama alasannya dengan `janjiKirim`: string date polos
 * dianggap UTC oleh `new Date(string)`, dan di WIB itu bisa mundur sehari.
 */
export function tanggalLengkap(ymd: string | null | undefined): string | null {
  if (!ymd) return null
  const [t, b, h] = ymd.slice(0, 10).split('-').map(Number)
  if (!t || !b || !h) return null
  const d = new Date(t, b - 1, h)
  if (isNaN(d.getTime())) return null
  const p = bagian(formatHari, d)
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`
}

/** "2026-09-30" → "2026-10-01". Aman melewati akhir bulan dan tahun kabisat. */
export function tanggalBesok(ymd: string): string {
  const [t, b, h] = ymd.split('-').map(Number)
  const d = new Date(Date.UTC(t, b - 1, h + 1))
  return d.toISOString().slice(0, 10)
}

/**
 * Cek isian sebelum dikirim. Cerminan dua CHECK di database:
 * chk_po_periode (po_mulai dan po_selesai wajib, selesai > mulai) dan
 * chk_po_janji_kirim (po_janji_kirim wajib dan lebih besar dari
 * (po_selesai AT TIME ZONE 'Asia/Jakarta')::date),
 * ditambah pemeriksaan yang cuma masuk akal di sisi tampilan.
 *
 * Kembaliannya pesan siap tampil, atau null kalau tidak ada masalah.
 */
export function validasiFormPO(f: FormPO): string | null {
  // Status wajib dipilih. Tidak ada nilai bawaan supaya penjual menyatakan
  // ketersediaan barangnya secara sadar.
  if (f.status === '') return 'Pilih dulu status barang: Ready Stock atau Pre-Order'
  if (f.status !== 'preorder') return null

  if (!f.mulai) return 'Tanggal mulai PO wajib diisi'
  if (!f.selesai) return 'Tanggal selesai PO wajib diisi'

  const mulai = new Date(f.mulai).getTime()
  const selesai = new Date(f.selesai).getTime()
  if (isNaN(mulai) || isNaN(selesai)) return 'Tanggal PO tidak terbaca, isi ulang'
  if (selesai <= mulai) return 'Tanggal selesai PO harus setelah tanggal mulai'

  if (!f.janji) return 'Tanggal janji kirim wajib diisi untuk produk pre-order'
  const batasSelesai = tanggalWIB(f.selesai)
  if (batasSelesai && f.janji <= batasSelesai) {
    return 'Tanggal janji kirim harus setelah PO ditutup — barang baru dibuat sesudah periode pemesanan berakhir'
  }

  const target = f.target.trim() === '' ? null : Number(f.target)
  const maks = f.maks.trim() === '' ? null : Number(f.maks)

  if (target !== null && (!Number.isInteger(target) || target < 1)) {
    return 'Target minimal harus angka bulat 1 atau lebih'
  }
  if (maks !== null && (!Number.isInteger(maks) || maks < 1)) {
    return 'Kuota maksimal harus angka bulat 1 atau lebih'
  }
  if (target !== null && maks !== null && maks < target) {
    return 'Kuota maksimal tidak boleh lebih kecil dari target'
  }

  return null
}

/** Isian form jadi kolom produk. Panggil setelah validasiFormPO lolos. */
export function formPOKeKolom(f: FormPO) {
  if (f.status !== 'preorder') {
    // Ready stock: semua keterangan PO ikut dibersihkan supaya tidak ada sisa
    // tanggal lama yang membingungkan kalau nanti diubah jadi PO lagi
    return {
      is_preorder: false,
      po_mulai: null, po_selesai: null, po_janji_kirim: null,
      po_target: null, po_maks: null, po_catatan: null,
    }
  }
  return {
    is_preorder: true,
    po_mulai: dariInputLokal(f.mulai),
    po_selesai: dariInputLokal(f.selesai),
    po_janji_kirim: f.janji || null,
    po_target: f.target.trim() === '' ? null : Number(f.target),
    po_maks: f.maks.trim() === '' ? null : Number(f.maks),
    po_catatan: f.catatan.trim() || null,
  }
}
