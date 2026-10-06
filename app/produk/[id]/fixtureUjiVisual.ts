// ⚠ FIXTURE UJI VISUAL — BUKAN DATA APLIKASI. HAPUS SETELAH QA FASE 3.
//
// Dua produk rekaan untuk melihat halaman detail dalam keadaan yang belum ada
// di database live: penjual alumni perorangan ("Nama · Superfive NN"),
// produk Pre-Order lengkap dengan target dan kuota, dan rak Produk Serupa.
// Tidak ada yang ditulis ke Supabase — data ini hanya hidup di memori.
//
// Hanya dimuat lewat import() dinamis dari ./page.tsx, dan hanya kalau:
//   1. lingkungannya development atau preview Vercel, DAN
//   2. URL memuat ?uji=detail, DAN
//   3. id produknya salah satu id di bawah (uji-ready / uji-po).
// Di production syarat 1 jadi konstanta false.
//
// Kolomnya hanya yang dipakai halaman. Tanpa rating, ulasan, jumlah terjual,
// lokasi, atau status verifikasi.

type PenjualUji = {
  id: string; nama: string; angkatan: number; label_angkatan: string
  avatar_url: null; foto_url: null; is_institusi: false
}

function penjual(id: string, nama: string, angkatan: number): PenjualUji {
  return {
    id, nama, angkatan,
    label_angkatan: 'Superfive ' + String(angkatan % 100).padStart(2, '0'),
    avatar_url: null, foto_url: null, is_institusi: false,
  }
}

// Gambar pengganti: SVG bergradien sebagai data URI — tanpa aset atau host luar
function gambar(a: string, b: string, teks: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`
    + `<rect width="640" height="640" fill="url(#g)"/>`
    + `<text x="320" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff" fill-opacity="0.92">${teks}</text>`
    + `<text x="320" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#ffffff" fill-opacity="0.7">CONTOH UJI VISUAL</text>`
    + `</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

const DIMAS = penjual('uji-penjual-2', 'Dimas Prasetyo', 2005)
const MAYA = penjual('uji-penjual-5', 'Maya Puspitasari', 2012)
const SARI = penjual('uji-penjual-3', 'Sari Wulandari', 1988)
const ARIF = penjual('uji-penjual-4', 'Arif Hidayat', 1998)

const TOKO_DIMAS = { id: 'uji-toko-2', nama_toko: 'Kopi Lima Lima', seller_id: DIMAS.id, is_official: false }
const TOKO_MAYA = { id: 'uji-toko-5', nama_toko: 'Maya Konveksi', seller_id: MAYA.id, is_official: false }

function kartu(id: string, nama: string, harga: number, kategori: string, foto: string,
  toko: { nama_toko: string }, p: PenjualUji, po = false, tersedia = true) {
  return {
    id, nama, harga, kategori, foto_url: foto,
    is_tersedia: tersedia, is_preorder: po, po_janji_kirim: po ? '2026-11-20' : null,
    toko: { nama_toko: toko.nama_toko, is_official: false, seller_id: p.id, penjual: p },
  }
}

const KOSONG_PO = {
  po_mulai: null, po_selesai: null, po_janji_kirim: null,
  po_target: null, po_maks: null, po_catatan: null,
}

const DETAIL = {
  'uji-ready': {
    produk: {
      id: 'uji-ready', nama: 'Kopi Arabika Java Preanger 250 gr', harga: 85000,
      deskripsi: 'Biji kopi arabika dari kebun di lereng Gunung Malabar, disangrai medium setiap minggu.\n\nTersedia dalam bentuk biji utuh atau giling (sebutkan saat menghubungi penjual). Cocok untuk V60, tubruk, maupun French press.',
      kategori: 'Kuliner', stok: 0, is_tersedia: true, is_preorder: false, ...KOSONG_PO,
      foto_url: gambar('#8a5a3b', '#4a2f1f', 'Kopi Arabika'), created_at: '2026-10-01T00:00:00Z',
      toko: { ...TOKO_DIMAS, users: DIMAS },
    },
    varian: [],
    progres: null,
    produkToko: [
      kartu('uji-11', 'Nasi Liwet Komplit Paket 10 Porsi', 450000, 'Kuliner', gambar('#b5651d', '#5e3410', 'Nasi Liwet'), TOKO_DIMAS, DIMAS),
      kartu('uji-12', 'Cold Brew Literan 1 L', 95000, 'Kuliner', gambar('#3b2a20', '#1b120c', 'Cold Brew'), TOKO_DIMAS, DIMAS),
    ],
    produkSerupa: [
      kartu('uji-8', 'Keripik Tempe Pedas Daun Jeruk 200 gr', 28000, 'Kuliner', gambar('#c47a1c', '#7a4610', 'Keripik Tempe'), { nama_toko: 'Dapur Maya' }, MAYA, false, false),
      kartu('uji-13', 'Brownies Panggang Loyang 20 cm', 120000, 'Kuliner', gambar('#5a3a2a', '#2a1a10', 'Brownies'), { nama_toko: 'Dapur Sari' }, SARI),
      kartu('uji-14', 'Sambal Roa Botol 150 gr', 45000, 'Kuliner', gambar('#a8321f', '#5c180e', 'Sambal Roa'), { nama_toko: 'Arif Kitchen' }, ARIF),
    ],
  },
  'uji-po': {
    produk: {
      id: 'uji-po', nama: 'Kaos Reuni Angkatan Bordir Nama', harga: 135000,
      deskripsi: 'Kaos katun combed 24s dengan bordir nama dan tahun lulus di dada kiri.\n\nDibuat khusus untuk Reuni Akbar — produksi dimulai setelah periode pre-order ditutup.',
      kategori: 'Fashion', stok: 0, is_tersedia: true, is_preorder: true,
      po_mulai: '2026-10-01T00:00:00+07:00', po_selesai: '2026-11-05T23:59:59+07:00',
      po_janji_kirim: '2026-11-20', po_target: 50, po_maks: 100,
      po_catatan: 'Sebutkan nama dan tahun lulus untuk bordir saat menghubungi penjual.',
      foto_url: gambar('#5b3fa8', '#2e1f5c', 'Kaos Reuni'), created_at: '2026-10-01T00:00:00Z',
      toko: { ...TOKO_MAYA, users: MAYA },
    },
    varian: [
      { id: 'uji-v1', tipe: 'Ukuran', nama: 'S', stok: 0, harga_tambahan: 0 },
      { id: 'uji-v2', tipe: 'Ukuran', nama: 'M', stok: 0, harga_tambahan: 0 },
      { id: 'uji-v3', tipe: 'Ukuran', nama: 'L', stok: 0, harga_tambahan: 0 },
      { id: 'uji-v4', tipe: 'Ukuran', nama: 'XL', stok: 0, harga_tambahan: 10000 },
      { id: 'uji-v5', tipe: 'Ukuran', nama: 'XXL', stok: 0, harga_tambahan: 15000 },
    ],
    progres: { produk_id: 'uji-po', terkumpul: 18, sedang_buka: true },
    produkToko: [
      kartu('uji-10', 'Tas Rajut Tangan Motif Parahyangan', 210000, 'UMKM', gambar('#a8455b', '#5c1f2e', 'Tas Rajut'), TOKO_MAYA, MAYA),
    ],
    produkSerupa: [
      kartu('uji-3', 'Batik Tulis Mega Mendung Kemeja Pria', 420000, 'Fashion', gambar('#2f6fa8', '#183b5c', 'Batik Tulis'), { nama_toko: 'Wastra Sari' }, SARI),
    ],
  },
} as const

export function ambilFixtureDetail(id: string) {
  return (DETAIL as Record<string, (typeof DETAIL)[keyof typeof DETAIL]>)[id] ?? null
}
