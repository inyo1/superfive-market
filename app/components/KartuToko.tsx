import Link from 'next/link'
import Image from 'next/image'
import BadgeOfficial from './BadgeOfficial'
import LogoInilima from './LogoInilima'
import { HOST_FOTO } from './KartuPasar'
import { labelJumlahProduk, type TokoRingkas } from '../../lib/toko'

/**
 * Kartu satu toko — dipakai /toko dan seksi Toko Alumni di beranda.
 *
 * Kartu toko yang sudah ada sengaja tidak dipakai ulang: di pencarian ia baris
 * daftar ringkas di dalam dropdown, di /alumni ia kartu orang (avatar + label
 * angkatan). Bentuknya mengikuti kartu /alumni (.a-kartu) supaya sekeluarga.
 *
 * Avatar: foto_toko kalau ada (hanya dari storage Supabase — next/image
 * menolak host lain), logo IniLima untuk toko resmi tanpa foto, selain itu
 * inisial nama toko di lingkaran.
 */
export default function KartuToko({ t }: { t: TokoRingkas }) {
  const foto = t.foto_toko && t.foto_toko.startsWith(HOST_FOTO) ? t.foto_toko : null
  const inisial = (t.nama_toko.trim()[0] ?? '?').toUpperCase()
  // ETALASE-KLIMAX: toko tanpa produk ikut tampil, tinjau setelah 17 Okt 2026
  const jumlah = labelJumlahProduk(t.jumlahProduk)

  return (
    <Link href={`/toko/${t.id}`} className="t-kartu" aria-label={`Toko ${t.nama_toko}`}>
      <span className={`t-avatar${!foto && t.is_official ? ' resmi' : ''}`} aria-hidden>
        {foto
          ? <Image src={foto} alt="" width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : t.is_official ? <LogoInilima lebar="100%" /> : inisial}
      </span>
      <span className="t-nama" title={t.nama_toko}>{t.nama_toko}</span>
      {t.is_official && <BadgeOfficial aktif kecil />}
      <span className="t-kategori">{t.kategori}</span>
      {jumlah && (
        <span className={`t-jumlah${t.jumlahProduk === 0 ? ' kosong' : ''}`}>{jumlah}</span>
      )}
    </Link>
  )
}
