// Halaman Selamat Datang (Wave 3) — aturan kapan tampil dan apa isinya.
//
// Sengaja fungsi murni tanpa impor apa pun: semua keputusannya bisa diuji
// tanpa sesi login dan tanpa akun sungguhan.
//
// ── Penyimpanan statusnya: metadata Supabase Auth, BUKAN kolom baru ──
//
// Pendaftar baru membawa kunci `sambutan: 'baru'` di options.data signUp —
// kanal yang sama dengan `nama`. Setelah halaman sambutan diselesaikan atau
// dilewati, klien menulis `sambutan_selesai` lewat supabase.auth.updateUser.
//
// Akibatnya:
// - akun lama tidak punya kuncinya, jadi TIDAK PERNAH dipaksa melihat
//   sambutan — tanpa backfill dan tanpa migration
// - statusnya tersimpan di server, jadi konsisten lintas perangkat
// - hanya pemilik akun yang bisa menulis metadatanya sendiri
// - trigger trg_buat_profil_baru hanya membaca `nama` dan `tampil_publik`,
//   jadi kunci tambahan ini tidak memengaruhinya
//
// Metadata ini bisa diubah pemiliknya, dan itu tidak apa-apa: yang dijaga di
// sini hanya kenyamanan tampilan, bukan kewenangan. JANGAN memakai metadata
// auth untuk apa pun yang menentukan hak akses.

export const PENANDA_BARU = 'baru'

type Metadata = Record<string, unknown> | null | undefined

/** Metadata yang dikirim saat signUp untuk menandai akun baru Wave 3 */
export const METADATA_SAMBUTAN = { sambutan: PENANDA_BARU } as const

/** Metadata yang ditulis saat sambutan selesai atau dilewati */
export function metadataSelesai(waktu: Date = new Date()) {
  return { sambutan_selesai: waktu.toISOString() }
}

/** Akun ini perlu melihat sambutan: akun baru Wave 3 yang belum menyelesaikannya */
export function perluSambutan(meta: Metadata): boolean {
  if (!meta) return false
  return meta.sambutan === PENANDA_BARU && !meta.sambutan_selesai
}

/**
 * Tujuan lanjutan yang aman. Hanya path internal; tidak boleh kembali ke
 * /selamat-datang atau /auth (akan berputar), dan tidak boleh `//host`
 * maupun `/\host` yang dibaca peramban sebagai alamat situs lain.
 */
export function tujuanAman(lanjut: string | null | undefined): string {
  if (!lanjut) return '/'
  if (!lanjut.startsWith('/')) return '/'
  if (lanjut.startsWith('//') || lanjut.startsWith('/\\')) return '/'
  if (/^\/(selamat-datang|auth)(\/|\?|#|$)/.test(lanjut)) return '/'
  return lanjut
}

/** Alamat halaman sambutan yang membawa tujuan semula */
export function alamatSambutan(lanjut: string | null | undefined): string {
  const t = tujuanAman(lanjut)
  return t === '/' ? '/selamat-datang' : `/selamat-datang?lanjut=${encodeURIComponent(t)}`
}

// ── Isi menurut status akun ──

export type ProfilSambutan = {
  nama: string | null
  status_alumni: string | null      // umum | menunggu | alumni | ditolak
  status_penjual: string | null     // belum_ajukan | menunggu | aktif | ditolak | dibekukan
  is_institusi: boolean
  label_angkatan: string | null
  punya_toko: boolean
}

export type KunciIkon = 'etalase' | 'orang' | 'profil' | 'toko' | 'tambah' | 'lencana' | 'grafik'

export type Pilihan = {
  kunci: string
  judul: string
  keterangan: string
  href: string
  ikon: KunciIkon
}

export type Catatan = { nada: 'info' | 'tunggu' | 'perhatian'; teks: string }

export type IsiSambutan = {
  sapaan: string
  /** Satu kalimat di bawah sapaan; null kalau tidak ada yang perlu dikatakan */
  subjudul: string
  /** Kabar status yang perlu diketahui — bukan ajakan */
  catatan: Catatan | null
  pilihan: Pilihan[]
}

const MARKETPLACE: Pilihan = {
  kunci: 'marketplace',
  judul: 'Jelajahi Marketplace',
  keterangan: 'Lihat produk dan jasa dari keluarga besar Superfive.',
  href: '/produk',
  ikon: 'etalase',
}

const PROFIL: Pilihan = {
  kunci: 'profil',
  judul: 'Lengkapi Profil',
  keterangan: 'Tambahkan foto dan nomor HP supaya mudah dikenali. Tidak wajib.',
  href: '/profil',
  ikon: 'profil',
}

function namaDepan(nama: string | null): string {
  const n = (nama ?? '').trim()
  if (!n) return ''
  return n.split(/\s+/)[0]
}

export function isiSambutan(p: ProfilSambutan): IsiSambutan {
  const depan = namaDepan(p.nama)
  const sapaan = depan ? `Selamat datang, ${depan}!` : 'Selamat datang!'
  const penjual = p.status_penjual ?? 'belum_ajukan'
  const pilihan: Pilihan[] = [MARKETPLACE]
  let catatan: Catatan | null = null
  let subjudul = 'Akunmu sudah aktif. Mau mulai dari mana?'

  // Lapak — sama untuk alumni dan institusi: yang menentukan hanya status_penjual
  const tokoPilihan = (): Pilihan[] => {
    if (penjual === 'aktif') {
      return [
        p.punya_toko
          ? { kunci: 'toko', judul: 'Buka Toko Saya', keterangan: 'Atur toko dan lihat produkmu.', href: '/toko/saya', ikon: 'toko' }
          : { kunci: 'tambah', judul: 'Pasang Produk Pertama', keterangan: 'Tokomu dibuat otomatis saat produk pertama disimpan.', href: '/produk/tambah', ikon: 'tambah' },
        { kunci: 'dashboard', judul: 'Dashboard Penjual', keterangan: 'Kelola produk dan lihat calon pembeli.', href: '/dashboard', ikon: 'grafik' },
      ]
    }
    return []
  }

  if (p.is_institusi) {
    subjudul = 'Akun institusimu sudah aktif.'
    pilihan.push(...tokoPilihan(), PROFIL)
    if (penjual === 'menunggu') catatan = { nada: 'tunggu', teks: 'Pengajuan penjualmu sedang ditinjau pengurus.' }
    return { sapaan, subjudul, catatan, pilihan }
  }

  switch (p.status_alumni) {
    case 'alumni': {
      if (p.label_angkatan) subjudul = `Kamu terdaftar sebagai ${p.label_angkatan}. Mau mulai dari mana?`
      pilihan.push({ kunci: 'alumni', judul: 'Temukan Alumni', keterangan: 'Cari teman seangkatan dan lintas angkatan.', href: '/alumni', ikon: 'orang' })
      pilihan.push(...tokoPilihan())
      if (penjual === 'belum_ajukan' || penjual === 'ditolak') {
        pilihan.push({ kunci: 'jual', judul: 'Mulai Berjualan', keterangan: 'Buka lapak untuk produk atau jasamu. Gratis.', href: '/jual', ikon: 'toko' })
      }
      if (penjual === 'menunggu') catatan = { nada: 'tunggu', teks: 'Pengajuan penjualmu sedang ditinjau pengurus.' }
      if (penjual === 'dibekukan') catatan = { nada: 'perhatian', teks: 'Lapakmu sedang dibekukan. Detailnya ada di Dashboard.' }
      pilihan.push(PROFIL)
      break
    }
    case 'menunggu': {
      // Sisa data masa antrean: sejak 20 Sep 2026 /verifikasi langsung
      // memberi status alumni, jadi melengkapinya sendiri memang diizinkan
      catatan = { nada: 'tunggu', teks: 'Pendaftaran alumnimu belum selesai.' }
      pilihan.push({ kunci: 'verifikasi', judul: 'Selesaikan Pendaftaran Alumni', keterangan: 'Konfirmasi angkatanmu untuk mendapat lencana alumni.', href: '/verifikasi', ikon: 'lencana' })
      pilihan.push(PROFIL)
      break
    }
    case 'ditolak': {
      // TIDAK ada ajakan mendaftar ulang: pencabutan oleh pengurus hanya
      // bisa diluruskan lewat pengurus (lihat celah ajukan_alumni di CLAUDE.md)
      catatan = { nada: 'perhatian', teks: 'Status alumnimu dicabut pengurus. Kamu tetap bisa belanja seperti biasa; hubungi pengurus kalau menurutmu ini keliru.' }
      pilihan.push(PROFIL)
      break
    }
    default: {
      // umum — pembeli biasa. Tidak dianggap alumni, dan tidak didesak.
      pilihan.push({ kunci: 'verifikasi', judul: 'Alumni SMPN 5 Bandung?', keterangan: 'Daftarkan angkatanmu untuk mendapat lencana alumni. Tidak wajib untuk belanja.', href: '/verifikasi', ikon: 'lencana' })
      pilihan.push(PROFIL)
    }
  }

  return { sapaan, subjudul, catatan, pilihan }
}
