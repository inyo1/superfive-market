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

/** 14 Agustus 2026 */
export function tanggalPanjang(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/**
 * Janji kirim untuk ditampilkan: "Dikirim 28 September 2026".
 *
 * po_janji_kirim bertipe date, jadi nilainya "2026-09-28" tanpa zona waktu.
 * Diurai manual, bukan lewat new Date(string) — string date polos dianggap
 * UTC oleh JavaScript, dan di WIB itu bisa mundur sehari.
 */
export function janjiKirim(tanggal: string | null | undefined): string | null {
  if (!tanggal) return null
  const [t, b, h] = tanggal.slice(0, 10).split('-').map(Number)
  if (!t || !b || !h) return null
  return 'Dikirim ' + new Date(t, b - 1, h).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** 14 Agu 2026, 17.00 */
export function tanggalSingkat(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
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

export type FormPO = {
  aktif: boolean
  mulai: string          // datetime-local
  selesai: string        // datetime-local
  janji: string        // date, "2026-09-28"
  target: string
  maks: string
  catatan: string
}

export const FORM_PO_KOSONG: FormPO = {
  aktif: false, mulai: '', selesai: '', janji: '', target: '', maks: '', catatan: '',
}

export function formPODari(p: DataPO | null | undefined): FormPO {
  if (!p) return FORM_PO_KOSONG
  return {
    aktif: Boolean(p.is_preorder),
    mulai: keInputLokal(p.po_mulai),
    selesai: keInputLokal(p.po_selesai),
    janji: p.po_janji_kirim ? p.po_janji_kirim.slice(0, 10) : '',
    target: p.po_target != null ? String(p.po_target) : '',
    maks: p.po_maks != null ? String(p.po_maks) : '',
    catatan: p.po_catatan ?? '',
  }
}

/**
 * Tanggal kalender po_selesai menurut database. Constraint membandingkan
 * po_janji_kirim dengan po_selesai::date, dan zona waktu server UTC — jadi
 * pembandingnya harus tanggal UTC, bukan tanggal lokal peramban.
 */
function tanggalSelesaiDiServer(selesaiLokal: string): string | null {
  const d = new Date(selesaiLokal)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/**
 * Cek isian sebelum dikirim. Cerminan dua CHECK di database:
 * chk_po_periode (po_mulai dan po_selesai wajib, selesai > mulai) dan
 * chk_po_janji_kirim (po_janji_kirim wajib dan > po_selesai::date),
 * ditambah pemeriksaan yang cuma masuk akal di sisi tampilan.
 *
 * Kembaliannya pesan siap tampil, atau null kalau tidak ada masalah.
 */
export function validasiFormPO(f: FormPO): string | null {
  if (!f.aktif) return null

  if (!f.mulai) return 'Tanggal mulai PO wajib diisi'
  if (!f.selesai) return 'Tanggal selesai PO wajib diisi'

  const mulai = new Date(f.mulai).getTime()
  const selesai = new Date(f.selesai).getTime()
  if (isNaN(mulai) || isNaN(selesai)) return 'Tanggal PO tidak terbaca, isi ulang'
  if (selesai <= mulai) return 'Tanggal selesai PO harus setelah tanggal mulai'

  if (!f.janji) return 'Tanggal janji kirim wajib diisi untuk produk pre-order'
  const batasSelesai = tanggalSelesaiDiServer(f.selesai)
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
  if (!f.aktif) {
    // Dimatikan: semua keterangan PO ikut dibersihkan supaya tidak ada sisa
    // tanggal lama yang membingungkan kalau nanti dinyalakan lagi
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
