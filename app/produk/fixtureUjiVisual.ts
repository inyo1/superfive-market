// ⚠ FIXTURE UJI VISUAL — BUKAN DATA APLIKASI. HAPUS SETELAH QA FASE 2.
//
// Sepuluh listing rekaan untuk melihat etalase /produk dalam keadaan terisi,
// selama database live belum punya satu pun produk alumni. Tidak ada yang
// ditulis ke Supabase: data ini hanya hidup di memori peramban.
//
// Hanya dimuat lewat import() dinamis dari app/produk/page.tsx, dan hanya
// kalau DUA syarat terpenuhi: lingkungannya development atau preview Vercel,
// DAN URL-nya memuat ?uji=etalase. Di build production syarat pertama jadi
// konstanta false, jadi modul ini tidak ikut ke bundel.
//
// Kolomnya hanya yang dipakai kartu hari ini. Sengaja TANPA rating, ulasan,
// jumlah terjual, lokasi, ongkir, atau status verifikasi.
//
// Cara mencabut seluruhnya: lihat catatan di atas PRODUK_UJI di page.tsx.

type PenjualUji = {
  id: string
  nama: string
  angkatan: number
  label_angkatan: string
  avatar_url: null
  foto_url: null
  is_institusi: false
}

type ProdukUji = {
  id: string
  nama: string
  harga: number
  kategori: 'Teknologi' | 'Fashion' | 'Kuliner' | 'Properti' | 'Jasa' | 'UMKM'
  is_tersedia: boolean
  is_preorder: boolean
  po_janji_kirim: string | null
  foto_url: string
  toko: { nama_toko: string; is_official: false; seller_id: string; penjual: PenjualUji }
}

// Gambar pengganti: SVG polos bergradien dengan nama barang, sebagai data
// URI — tidak ada aset atau host luar yang ikut terlibat.
function gambar(a: string, b: string, teks: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`
    + `<rect width="480" height="480" fill="url(#g)"/>`
    + `<text x="240" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff" fill-opacity="0.92">${teks}</text>`
    + `<text x="240" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#ffffff" fill-opacity="0.7">CONTOH UJI VISUAL</text>`
    + `</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

function penjual(id: string, nama: string, angkatan: number): PenjualUji {
  return {
    id, nama, angkatan,
    label_angkatan: 'Superfive ' + String(angkatan % 100).padStart(2, '0'),
    avatar_url: null, foto_url: null, is_institusi: false,
  }
}

const RINA = penjual('uji-penjual-1', 'Rina Kartika', 1992)
const DIMAS = penjual('uji-penjual-2', 'Dimas Prasetyo', 2005)
const SARI = penjual('uji-penjual-3', 'Sari Wulandari', 1988)
const ARIF = penjual('uji-penjual-4', 'Arif Hidayat', 1998)
const MAYA = penjual('uji-penjual-5', 'Maya Puspitasari', 2012)

function toko(nama_toko: string, p: PenjualUji) {
  return { nama_toko, is_official: false as const, seller_id: p.id, penjual: p }
}

// Urutan larik = urutan "Terbaru"
export const PRODUK_UJI: ProdukUji[] = [
  {
    id: 'uji-1', nama: 'Jasa Desain Logo & Identitas Usaha', harga: 750000, kategori: 'Jasa',
    is_tersedia: true, is_preorder: false, po_janji_kirim: null,
    foto_url: gambar('#07589F', '#062F59', 'Desain Logo'), toko: toko('Studio Rina Kreatif', RINA),
  },
  {
    id: 'uji-2', nama: 'Kopi Arabika Java Preanger 250 gr', harga: 85000, kategori: 'Kuliner',
    is_tersedia: true, is_preorder: false, po_janji_kirim: null,
    foto_url: gambar('#8a5a3b', '#4a2f1f', 'Kopi Arabika'), toko: toko('Kopi Lima Lima', DIMAS),
  },
  {
    id: 'uji-3', nama: 'Batik Tulis Mega Mendung Kemeja Pria', harga: 420000, kategori: 'Fashion',
    is_tersedia: true, is_preorder: false, po_janji_kirim: null,
    foto_url: gambar('#2f6fa8', '#183b5c', 'Batik Tulis'), toko: toko('Wastra Sari', SARI),
  },
  {
    id: 'uji-4', nama: 'Servis & Upgrade Laptop Panggilan', harga: 150000, kategori: 'Jasa',
    is_tersedia: true, is_preorder: false, po_janji_kirim: null,
    foto_url: gambar('#3c4a5c', '#1d2530', 'Servis Laptop'), toko: toko('Arif Tekno', ARIF),
  },
  {
    id: 'uji-5', nama: 'Kaos Reuni Angkatan Bordir Nama (Pre-Order)', harga: 135000, kategori: 'Fashion',
    is_tersedia: true, is_preorder: true, po_janji_kirim: '2026-11-20',
    foto_url: gambar('#5b3fa8', '#2e1f5c', 'Kaos Reuni'), toko: toko('Maya Konveksi', MAYA),
  },
  {
    id: 'uji-6', nama: 'Mechanical Keyboard 75% Hot-Swap', harga: 1250000, kategori: 'Teknologi',
    is_tersedia: true, is_preorder: false, po_janji_kirim: null,
    foto_url: gambar('#1f2937', '#0b1220', 'Keyboard 75%'), toko: toko('Arif Tekno', ARIF),
  },
  {
    id: 'uji-7', nama: 'Rumah 2 Lantai Antapani, Bandung', harga: 1450000000, kategori: 'Properti',
    is_tersedia: true, is_preorder: false, po_janji_kirim: null,
    foto_url: gambar('#3f7a5a', '#1f3d2d', 'Rumah Antapani'), toko: toko('Properti Sari', SARI),
  },
  {
    id: 'uji-8', nama: 'Keripik Tempe Pedas Daun Jeruk 200 gr', harga: 28000, kategori: 'UMKM',
    is_tersedia: false, is_preorder: false, po_janji_kirim: null,
    foto_url: gambar('#c47a1c', '#7a4610', 'Keripik Tempe'), toko: toko('Dapur Maya', MAYA),
  },
  {
    id: 'uji-9', nama: 'Konsultasi Pajak UMKM per Sesi', harga: 300000, kategori: 'Jasa',
    is_tersedia: true, is_preorder: false, po_janji_kirim: null,
    foto_url: gambar('#0a4a8a', '#04254a', 'Konsultasi Pajak'), toko: toko('Rina Konsultan', RINA),
  },
  {
    id: 'uji-10', nama: 'Tas Rajut Tangan Motif Parahyangan', harga: 210000, kategori: 'UMKM',
    is_tersedia: true, is_preorder: false, po_janji_kirim: null,
    foto_url: gambar('#a8455b', '#5c1f2e', 'Tas Rajut'), toko: toko('Wastra Sari', SARI),
  },
  {
    id: 'uji-11', nama: 'Nasi Liwet Komplit Paket 10 Porsi', harga: 450000, kategori: 'Kuliner',
    is_tersedia: true, is_preorder: false, po_janji_kirim: null,
    foto_url: gambar('#b5651d', '#5e3410', 'Nasi Liwet'), toko: toko('Kopi Lima Lima', DIMAS),
  },
]
