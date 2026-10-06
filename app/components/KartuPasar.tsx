import Link from 'next/link'
import Image from 'next/image'
import FotoProduk from './FotoProduk'
import NamaPenjual from './NamaPenjual'
import BadgePreorder, { WARNA_PO_TUA } from './BadgePreorder'
import BadgeTersedia from './BadgeTersedia'
import { IkonPanah } from './beranda/Ikon'
import LogoInilima from './LogoInilima'
import { janjiKirim } from '../../lib/preorder'
import type { PenjualPublik } from '../../lib/penjualPublik'

// Kartu produk etalase — dipakai /produk dan rak "Produk Lain dari Toko Ini" /
// "Produk Serupa" di detail produk. Gayanya kelas m- di globals.css.

/** Bentuk minimum yang dibutuhkan kartu. */
export type ProdukKartu = {
  id: string
  nama: string
  harga: number
  kategori: string
  is_tersedia: boolean
  is_preorder: boolean
  po_janji_kirim: string | null
  foto_url?: string | null
  toko: { nama_toko: string; is_official: boolean; seller_id: string | null; penjual: PenjualPublik | null } | null
}

// Avatar penjual hanya dirender lewat next/image kalau host-nya memang
// terdaftar di next.config (Supabase Storage). Host lain akan membuat
// next/image melempar error, jadi jatuh ke inisial.
export const HOST_FOTO = 'https://cbepplpvlizwyaalndas.supabase.co/storage/v1/object/public/'

function fmt(n: number | null | undefined) {
  if (!n) return 'Rp 0'
  return 'Rp ' + n.toLocaleString('id-ID')
}

// Kartu etalase. Tidak ada rating, jumlah terjual, wishlist, keranjang, atau
// lencana "verified": rating belum punya ulasan (angka lama "5.0" adalah
// cadangan karangan), jumlah terjual berhenti bergerak sejak mode katalog,
// dan label angkatan dari penjual_publik dihitung dari kolom angkatan saja —
// bukan dari status alumni — jadi tidak sah dijadikan lencana verifikasi.
// Yang tampil "Nama · Superfive 92", mekanisme koreksi sosial yang sama
// dengan halaman lain.
export default function KartuPasar({ p }: { p: ProdukKartu }) {
  const penjual = p.toko?.penjual ?? null
  const jasa = p.kategori === 'Jasa'
  const resmi = Boolean(p.toko?.is_official)
  const foto = penjual?.avatar_url || penjual?.foto_url || null
  const inisial = (penjual?.nama ?? p.toko?.nama_toko ?? '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <Link href={`/produk/${p.id}`} className="prod-card m-kartu">
      <div style={{ position: 'relative' }}>
        <BadgePreorder aktif={p.is_preorder} bentuk="pita" />
        {/* Tinggi foto diatur CSS per lebar layar (.m-foto) — lebih pendek di
            grid desktop yang padat */}
        <div className="m-foto"><FotoProduk src={p.foto_url} kategori={p.kategori} height={180} fontSize={44} /></div>
      </div>
      <div className="m-kartu-isi">
        <span className="m-kartu-kategori">{p.kategori}</span>
        <span className="m-kartu-nama">{p.nama}</span>
        <span className="m-kartu-harga">{fmt(p.harga)}</span>
        {/* Stok produk PO selalu 0 karena trg_kurangi_stok sengaja
            melewatinya — produk PO memakai janji kirim, bukan lencana stok */}
        {p.is_preorder ? (
          p.po_janji_kirim && <span style={{ fontSize: '12px', color: WARNA_PO_TUA }}>{janjiKirim(p.po_janji_kirim)}</span>
        ) : (
          <div><BadgeTersedia tersedia={p.is_tersedia} kecil /></div>
        )}

        <div className="m-kartu-penjual">
          {/* Toko resmi diwakili logo IniLima (aturan dua logo di CLAUDE.md),
              dan nama akun institusinya tidak diulang di bawah nama toko.
              Di /produk kasus ini tidak muncul — merchandise disaring — tapi
              rak "Produk Lain dari Toko Ini" di detail merchandise memakainya. */}
          <span className={`m-avatar${resmi ? ' resmi' : ''}`} aria-hidden>
            {resmi
              ? <LogoInilima lebar="100%" />
              : foto && foto.startsWith(HOST_FOTO)
                ? <Image src={foto} alt="" width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : inisial}
          </span>
          <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {p.toko?.nama_toko && <span className="m-kartu-toko">{p.toko.nama_toko}</span>}
            {penjual && !resmi && (
              // Boleh membungkus, tidak dipotong: angkatan adalah mekanisme
              // koreksi sosial dan tidak boleh hilang demi menghemat ruang
              <NamaPenjual nama={penjual.nama} label={penjual.label_angkatan} angkatan={penjual.angkatan} institusi={penjual.is_institusi} kecil style={{ fontSize: '12px', whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', lineHeight: 1.4 }} />
            )}
          </span>
        </div>

        {/* Jasa dan produk sama-sama menuju halaman detail — di sanalah tombol
            Hubungi Penjual berada. Bedanya hanya kata ajakannya. */}
        <span className="m-kartu-aksi">
          {jasa ? 'Lihat Jasa' : 'Lihat Detail'} <IkonPanah size={14} tebal={2.2} />
        </span>
      </div>
    </Link>
  )
}
