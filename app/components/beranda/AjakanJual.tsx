'use client'
import Image from 'next/image'
import { IkonPanah, IkonCentang } from './Ikon'

// Banner "Punya usaha atau jasa?" — dipakai beranda dan /produk.
//
// Tujuan tombolnya mengikuti peran, bukan cuma "sudah login atau belum":
// /produk/tambah menolak siapa pun yang status_penjual-nya bukan 'aktif', jadi
// mengirim pengguna biasa ke sana berarti menawarkan tombol yang pasti berujung
// penolakan. Aturannya ada di tujuanJual() supaya kedua halaman sepakat.

/** Ke mana tombol jualan membawa orang. */
export function tujuanJual(penjualAktif: boolean, masuk: boolean): string {
  if (penjualAktif) return '/produk/tambah'
  if (masuk) return '/jual'
  // msg diisi eksplisit: tanpa itu /auth memakai kalimat bawaannya,
  // "Login dulu untuk melanjutkan pembelian" — alur ini soal berjualan
  return '/auth?mode=daftar&redirect=/jual&msg=' + encodeURIComponent('Daftar dulu untuk mulai berjualan')
}

/** Label tombol jualan, mengikuti peran yang sama dengan tujuannya. */
export function labelJual(penjualAktif: boolean): string {
  return penjualAktif ? 'Tambah Produk' : 'Buka Toko Gratis'
}

// Foto tangan bertumpuk — simbol kebersamaan, aset resmi CTA (Oktober 2026).
// Di desktop foto di KIRI dan teks di kanan; di HP foto jadi pita di atas
// teks. Posisinya dipatok ke tumpukan tangan (sedikit kanan-bawah dari
// tengah bingkai asli) supaya tangan tidak terpotong di rasio mana pun.
const FOTO_CTA = { src: '/superfive-community-hands.webp', posisi: '55% 58%' }

export default function AjakanJual({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <section className="b-seksi" aria-labelledby="judul-jual" style={{ paddingBottom: '64px' }}>
      <div className="b-wadah">
        <div className="b-cta">
          {/* Dekoratif: maknanya sudah dibawa judul, jadi alt kosong */}
          <div className="b-cta-foto" aria-hidden>
            <Image
              src={FOTO_CTA.src}
              alt=""
              fill
              sizes="(max-width: 899px) 100vw, 640px"
              style={{ objectFit: 'cover', objectPosition: FOTO_CTA.posisi }}
            />
          </div>
          <div className="b-cta-teks">
            <h2 id="judul-jual" className="b-cta-judul">
              <span className="b-cta-tanya">Punya usaha atau jasa?</span>
              Bawa ke keluarga besar <span className="b-cta-merek">SUPERFIVE</span>.
            </h2>
            <p className="b-cta-desk">
              Jual produk, tawarkan jasa, perluas jaringan, dan tumbuh bersama alumni SMPN 5 Bandung.
            </p>
            <div className="b-cta-aksi">
              <button type="button" onClick={onClick} className="b-tombol b-tombol-emas">
                {label} <IkonPanah size={18} tebal={2} />
              </button>
              <ul className="b-cta-label" role="list">
                <li><IkonCentang size={14} tebal={2.4} /> Mudah</li>
                <li><IkonCentang size={14} tebal={2.4} /> Gratis</li>
                <li><IkonCentang size={14} tebal={2.4} /> Untuk Alumni</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
