// UJI VISUAL SEMENTARA — Wave 2 fase 1 (direktori & profil alumni).
//
// Data REKAAN di memori peramban untuk QA tampilan: sekitar 30 alumni dari
// banyak angkatan, dengan dan tanpa foto, nama panjang, dan berbagai kondisi
// toko. Tidak ada yang dibaca dari atau ditulis ke database, dan tidak ada
// yang dicampur dengan data asli — selama mode uji, halaman HANYA menampilkan
// data di file ini.
//
// Hanya dimuat lewat import() dinamis di balik FIXTURE_DIIZINKAN (development
// atau preview Vercel) dan ?uji=alumni. Di build production konstantanya
// false, jadi file ini tidak ikut terbawa ke bundel.
//
// MENCABUT: hapus file ini dan semua bagian bertanda "UJI VISUAL" di
// app/alumni/page.tsx, app/alumni/[id]/page.tsx, dan app/globals.css.

import type { ProdukKartu } from '../components/KartuPasar'
import type { PenjualPublik } from '../../lib/penjualPublik'

// Foto contoh dari bucket produk-foto (satu-satunya host gambar yang
// terdaftar di next.config). Dipakai sebagai avatar dan foto produk rekaan.
const F = 'https://cbepplpvlizwyaalndas.supabase.co/storage/v1/object/public/produk-foto/'
const FOTO = [
  F + '1786363564677-ivncsk07k9.jpeg',
  F + '1786363599964-tvdiefy5jh.jpeg',
  F + '1786363621378-13h38d2y0w2q.jpeg',
  F + '1786363642666-nxy9ruid8hh.jpeg',
  F + '1786363661859-0o2qx8jun3if.jpeg',
]

type TokoUji = { nama_toko: string; deskripsi: string | null; kategori: string; produk: number }

type BarisUji = {
  nama: string
  angkatan: number
  foto?: number          // indeks FOTO; kosong = inisial
  toko?: TokoUji
  bergabung: string      // ISO
}

const BARIS: BarisUji[] = [
  { nama: 'Hendra Kusumawijaya', angkatan: 1975, bergabung: '2026-09-20T03:00:00Z' },
  { nama: 'Siti Rahmawati', angkatan: 1975, foto: 0, bergabung: '2026-09-21T03:00:00Z' },
  { nama: 'Bambang Sutrisno', angkatan: 1982, toko: { nama_toko: 'Batik Pak Bambang', deskripsi: 'Batik tulis dan cap khas Bandung, dibuat di rumah sejak 1998.', kategori: 'Fashion', produk: 6 }, bergabung: '2026-09-22T03:00:00Z' },
  { nama: 'Dewi Kartika Sari', angkatan: 1982, foto: 1, bergabung: '2026-09-22T05:00:00Z' },
  { nama: 'Agus', angkatan: 1982, bergabung: '2026-09-23T03:00:00Z' },
  { nama: 'Raden Ajeng Kusumaningrum Purbaningsih Wiradikarta', angkatan: 1988, foto: 2, toko: { nama_toko: 'Rumah Kue Ningrum', deskripsi: 'Kue kering, bolu, dan pesanan hantaran untuk acara keluarga.', kategori: 'Kuliner', produk: 8 }, bergabung: '2026-09-20T07:00:00Z' },
  { nama: 'Yudi Prasetyo', angkatan: 1988, bergabung: '2026-09-24T03:00:00Z' },
  { nama: 'Lina Marlina', angkatan: 1988, foto: 3, bergabung: '2026-09-24T04:00:00Z' },
  { nama: 'Teguh Santoso', angkatan: 1988, toko: { nama_toko: 'Teguh Servis Laptop', deskripsi: null, kategori: 'Jasa', produk: 0 }, bergabung: '2026-09-25T03:00:00Z' },
  { nama: 'Nurhayati', angkatan: 1992, bergabung: '2026-09-25T05:00:00Z' },
  { nama: 'Andri Firmansyah', angkatan: 1992, foto: 4, toko: { nama_toko: 'Andri Properti', deskripsi: 'Jual-beli dan sewa rumah di Bandung timur.', kategori: 'Properti', produk: 2 }, bergabung: '2026-09-26T03:00:00Z' },
  { nama: 'Ratna Juwita', angkatan: 1992, bergabung: '2026-09-26T04:00:00Z' },
  { nama: 'Muhammad Rizky Ramadhan Saputra', angkatan: 1992, bergabung: '2026-09-27T03:00:00Z' },
  { nama: 'Fitri Handayani', angkatan: 1995, foto: 0, bergabung: '2026-09-27T05:00:00Z' },
  { nama: 'Dedi Mulyadi', angkatan: 1995, toko: { nama_toko: 'Kopi Dedi', deskripsi: 'Kopi arabika Gunung Puntang, sangrai sendiri tiap minggu.', kategori: 'UMKM', produk: 1 }, bergabung: '2026-09-28T03:00:00Z' },
  { nama: 'Wulan', angkatan: 1995, bergabung: '2026-09-28T04:00:00Z' },
  { nama: 'Ahmad Fauzi', angkatan: 2001, foto: 1, bergabung: '2026-09-29T03:00:00Z' },
  { nama: 'Putri Anggraeni', angkatan: 2001, bergabung: '2026-09-29T05:00:00Z' },
  { nama: 'Bayu Aji Nugroho', angkatan: 2001, toko: { nama_toko: 'Bayu Digital Studio', deskripsi: 'Desain logo, kemasan, dan konten media sosial untuk UMKM.', kategori: 'Teknologi', produk: 4 }, bergabung: '2026-09-30T03:00:00Z' },
  { nama: 'Citra Lestari', angkatan: 2005, foto: 2, bergabung: '2026-10-01T03:00:00Z' },
  { nama: 'Galih Pratama', angkatan: 2005, bergabung: '2026-10-01T05:00:00Z' },
  { nama: 'Indah Permatasari', angkatan: 2005, bergabung: '2026-10-02T03:00:00Z' },
  { nama: 'Rangga Aditya Wicaksono Kartanegara', angkatan: 2010, foto: 3, bergabung: '2026-10-02T05:00:00Z' },
  { nama: 'Sarah Amalia', angkatan: 2010, toko: { nama_toko: 'Sarah Hijab Collection', deskripsi: 'Hijab segi empat dan pashmina, warna-warna kalem.', kategori: 'Fashion', produk: 3 }, bergabung: '2026-10-03T03:00:00Z' },
  { nama: 'Fajar', angkatan: 2010, bergabung: '2026-10-03T05:00:00Z' },
  { nama: 'Nadia Safitri', angkatan: 2016, foto: 4, bergabung: '2026-10-04T03:00:00Z' },
  { nama: 'Ilham Maulana', angkatan: 2016, bergabung: '2026-10-04T05:00:00Z' },
  { nama: 'Kevin Wijaya', angkatan: 2020, bergabung: '2026-10-05T03:00:00Z' },
  { nama: 'Aulia Rahma', angkatan: 2020, foto: 0, bergabung: '2026-10-05T05:00:00Z' },
  { nama: 'Zaki', angkatan: 2020, bergabung: '2026-10-06T03:00:00Z' },
]

const NAMA_PRODUK: Record<string, string[]> = {
  Fashion: ['Kemeja Batik Mega Mendung', 'Selendang Sutra', 'Kain Batik Cap 2 Meter', 'Outer Batik Kombinasi', 'Masker Kain Batik', 'Tas Jinjing Batik'],
  Kuliner: ['Nastar Premium 500 g', 'Kastengel Keju Edam', 'Bolu Pandan Gulung', 'Putri Salju', 'Hampers Lebaran Isi 4', 'Brownies Panggang', 'Lapis Legit Mini', 'Kue Sus Vla'],
  Jasa: [],
  Properti: ['Rumah 2 Lantai Antapani', 'Kontrakan 3 Pintu Cicaheum'],
  UMKM: ['Kopi Arabika Puntang 250 g'],
  Teknologi: ['Desain Logo Paket Dasar', 'Desain Kemasan Produk', 'Konten Instagram 12 Post', 'Foto Produk 10 Gambar'],
}

function label(angkatan: number) {
  // Fixture saja: di halaman asli label selalu dibaca dari view, tidak dirangkai
  return 'Superfive ' + String(angkatan % 100).padStart(2, '0')
}

function id(i: number) { return `uji-alumni-${String(i + 1).padStart(2, '0')}` }

export type AlumniUji = {
  id: string
  nama: string
  angkatan: number
  label_angkatan: string
  avatar_url: string | null
  foto_url: string | null
  created_at: string
  jumlahProduk: number | null
}

const ALUMNI: AlumniUji[] = BARIS.map((b, i) => ({
  id: id(i),
  nama: b.nama,
  angkatan: b.angkatan,
  label_angkatan: label(b.angkatan),
  avatar_url: b.foto === undefined ? null : FOTO[b.foto],
  foto_url: null,
  created_at: b.bergabung,
  jumlahProduk: b.toko ? b.toko.produk : null,
}))

/** Direktori untuk yang login. */
export function ambilFixtureAlumni(): AlumniUji[] {
  return ALUMNI
}

/** Ringkasan per angkatan untuk pengunjung — dihitung dari fixture yang sama. */
export function ambilFixtureRingkas() {
  const peta = new Map<number, number>()
  for (const a of ALUMNI) peta.set(a.angkatan, (peta.get(a.angkatan) ?? 0) + 1)
  return [...peta.entries()]
    .sort((x, y) => y[0] - x[0])
    .map(([angkatan, jumlah]) => ({ angkatan, label_angkatan: label(angkatan), jumlah }))
}

/** Profil satu alumni rekaan, atau null kalau id-nya bukan fixture. */
export function ambilFixtureProfil(idProfil: string) {
  const i = ALUMNI.findIndex(a => a.id === idProfil)
  if (i < 0) return null
  const a = ALUMNI[i]
  const b = BARIS[i]

  const penjual: PenjualPublik = {
    id: a.id, nama: a.nama, angkatan: a.angkatan, label_angkatan: a.label_angkatan,
    avatar_url: a.avatar_url, foto_url: null, is_institusi: false,
  }

  const toko = b.toko
    ? { id: `uji-toko-${String(i + 1).padStart(2, '0')}`, nama_toko: b.toko.nama_toko, deskripsi: b.toko.deskripsi, kategori: b.toko.kategori }
    : null

  const produk: ProdukKartu[] = b.toko
    ? NAMA_PRODUK[b.toko.kategori].slice(0, b.toko.produk).map((nama, j) => ({
        id: `uji-produk-${i + 1}-${j + 1}`,
        nama,
        harga: [35000, 125000, 89000, 250000, 1450000, 60000, 42000, 175000][j % 8],
        kategori: b.toko!.kategori,
        is_tersedia: j % 4 !== 3,
        is_preorder: j === 2,
        po_janji_kirim: j === 2 ? '2026-11-20' : null,
        foto_url: j % 3 === 1 ? null : FOTO[(i + j) % FOTO.length],
        toko: { nama_toko: b.toko!.nama_toko, is_official: false, seller_id: a.id, penjual },
      }))
    : []

  const teman = ALUMNI
    .filter(t => t.angkatan === a.angkatan && t.id !== a.id)
    .map(t => ({ id: t.id, nama: t.nama, label_angkatan: t.label_angkatan, avatar_url: t.avatar_url, foto_url: t.foto_url }))

  return { profil: a, toko, produk, teman }
}
