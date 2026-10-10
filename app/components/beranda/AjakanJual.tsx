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

// Foto di sisi kanan banner. Konsepnya foto tangan bertumpuk sebagai simbol
// kebersamaan — tapi foto itu BELUM ADA di repository, dan foto stok merek
// lain sengaja tidak dipakai. Sampai fotonya tersedia, yang tampil foto
// gedung SMPN 5 yang sama dengan hero: aset asli, bukan ilustrasi generik.
// Mengganti foto cukup di sini (taruh berkasnya di /public, mis.
// /cta-kebersamaan.jpg, lalu ubah src dan posisinya).
const FOTO_CTA = { src: '/smpn5-hero.png', posisi: 'center 35%' }

export default function AjakanJual({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <section className="b-seksi" aria-labelledby="judul-jual" style={{ paddingBottom: '64px' }}>
      <div className="b-wadah">
        <div className="b-cta">
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
          <div className="b-cta-foto" aria-hidden>
            <Image
              src={FOTO_CTA.src}
              alt=""
              fill
              sizes="(max-width: 899px) 100vw, 480px"
              style={{ objectFit: 'cover', objectPosition: FOTO_CTA.posisi }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
