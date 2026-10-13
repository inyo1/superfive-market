import Link from 'next/link'
import Image from 'next/image'
import LogoInilima from './LogoInilima'
import { HOST_FOTO } from './KartuPasar'
import { IKON_KATEGORI, IkonEtalase, IkonPanah, IkonPin } from './beranda/Ikon'
import { kategoriSah } from '../../lib/kategori'
import { rapikanKota } from '../../lib/kontak'
import { labelJumlahProduk, type TokoRingkas } from '../../lib/toko'

/**
 * Kartu satu toko — dipakai /toko dan seksi Toko Alumni di beranda.
 *
 *   ┌──────────────────────┐
 *   │ sampul 16:9   ★OFFIC │  mosaik foto produk, atau gradien kategori
 *   │ (◯)                  │  avatar menimpa tepi bawah sampul
 *   │ Nama toko (2 baris)  │
 *   │ [Superfive 92] ⌖Kota │
 *   │ deskripsi 2 baris    │  disembunyikan di HP
 *   ├──────────────────────┤
 *   │ ◇ Kategori   3 produk→│  atau badge "Segera buka lapak"
 *   └──────────────────────┘
 *
 * Warna gradien per kategori ada di globals.css (.tk-sampul[data-kategori]),
 * bukan di sini — satu tempat untuk palet, sama seperti token --sf-*.
 *
 * Kartu toko di pencarian dan /alumni sengaja tidak memakai komponen ini:
 * di sana bentuknya baris daftar ringkas dan kartu orang.
 */
export default function KartuToko({ t }: { t: TokoRingkas }) {
  const fotoToko = t.foto_toko && t.foto_toko.startsWith(HOST_FOTO) ? t.foto_toko : null
  // next/image hanya menerima host Supabase (next.config.ts)
  const mosaik = t.foto_produk.filter(f => f.startsWith(HOST_FOTO)).slice(0, 3)
  const inisial = (t.nama_toko.trim()[0] ?? '?').toUpperCase()
  const kota = rapikanKota(t.kota)
  const IkonKat = kategoriSah(t.kategori) ? IKON_KATEGORI[t.kategori] : IkonEtalase
  // ETALASE-KLIMAX: toko tanpa produk ikut tampil, tinjau setelah 17 Okt 2026
  const jumlah = labelJumlahProduk(t.jumlahProduk)
  const kosong = t.jumlahProduk === 0

  return (
    <Link href={`/toko/${t.id}`} className={`tk-kartu${t.is_official ? ' resmi' : ''}`} aria-label={`Toko ${t.nama_toko}`}>
      <div className="tk-sampul" data-kategori={t.kategori} data-foto={mosaik.length} aria-hidden>
        {mosaik.length > 0 ? (
          mosaik.map((src, i) => (
            <span key={src} className={`tk-sampul-foto tk-f${i}`}>
              <Image
                src={src} alt="" fill
                // Foto pertama mosaik 3 hanya separuh lebar kartu
                sizes={mosaik.length === 1 ? '(max-width: 639px) 50vw, 320px' : '(max-width: 639px) 25vw, 160px'}
                style={{ objectFit: 'cover' }}
              />
            </span>
          ))
        ) : (
          // Tanpa foto: gradien + pola titik dari CSS, ikon kategori raksasa
          // sebagai watermark — kartu kosong tetap punya wajah
          <span className="tk-sampul-watermark"><IkonKat size={120} tebal={1.2} /></span>
        )}
        {/* Bukan BadgeOfficial: lencana emas transparannya hilang di atas
            foto produk yang terang. Di sampul butuh pil pekat */}
        {t.is_official && <span className="tk-sampul-lencana">★ OFFICIAL</span>}
      </div>

      <span className={`tk-avatar${!fotoToko && t.is_official ? ' logo' : ''}`} aria-hidden>
        {fotoToko
          ? <Image src={fotoToko} alt="" width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          // Logo IniLima punya cincinnya sendiri — tanpa ring dan bayangan
          // tambahan (lihat "Dua logo" di CLAUDE.md)
          : t.is_official ? <LogoInilima lebar="100%" /> : inisial}
      </span>

      <div className="tk-badan">
        <h3 className="tk-nama" title={t.nama_toko}>{t.nama_toko}</h3>
        {(t.label_angkatan || kota) && (
          <div className="tk-identitas">
            {t.label_angkatan && <span className="tk-angkatan">{t.label_angkatan}</span>}
            {kota && <span className="tk-kota"><IkonPin size={13} tebal={2} />{kota}</span>}
          </div>
        )}
        {t.deskripsi?.trim() && <p className="tk-desk">{t.deskripsi.trim()}</p>}
      </div>

      <div className="tk-kaki">
        <span className="tk-kategori"><IkonKat size={14} tebal={2} />{t.kategori}</span>
        {jumlah && (kosong ? (
          <span className="tk-segera"><span className="tk-denyut" aria-hidden />{jumlah}</span>
        ) : (
          <span className="tk-jumlah">{jumlah}<span className="tk-panah" aria-hidden><IkonPanah size={14} tebal={2.2} /></span></span>
        ))}
      </div>
    </Link>
  )
}

/** Kerangka berbentuk kartu yang sama, selama daftar toko dimuat. */
export function KartuTokoKerangka() {
  return (
    <div className="tk-kartu tk-kerangka" aria-hidden>
      <div className="tk-sampul" />
      <span className="tk-avatar" />
      <div className="tk-badan">
        <span className="tk-garis" style={{ width: '75%', height: 14 }} />
        <span className="tk-garis" style={{ width: '45%', height: 12 }} />
      </div>
      <div className="tk-kaki">
        <span className="tk-garis" style={{ width: 64, height: 18 }} />
        <span className="tk-garis" style={{ width: 52, height: 12 }} />
      </div>
    </div>
  )
}
