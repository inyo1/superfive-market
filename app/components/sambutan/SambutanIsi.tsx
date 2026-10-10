'use client'
import Image from 'next/image'
import { useEffect, useRef, type ReactNode } from 'react'
import type { IsiSambutan, KunciIkon } from '../../../lib/sambutan'
import { IkonCari, IkonOrang, IkonCentang, IkonEtalase, IkonPetak, IkonLencana, IkonGrafik, IkonPanah } from '../beranda/Ikon'

// Tampilan halaman Selamat Datang. Murni presentasi: datanya (isi menurut
// status, tujuan lanjutan) disiapkan app/selamat-datang/page.tsx lewat
// lib/sambutan.ts, jadi komponen ini bisa diperiksa dengan data contoh tanpa
// sesi login.

const IKON: Record<KunciIkon, (p: { size?: number }) => ReactNode> = {
  etalase: IkonCari,
  orang: IkonOrang,
  profil: IkonCentang,
  toko: IkonEtalase,
  tambah: IkonPetak,
  lencana: IkonLencana,
  grafik: IkonGrafik,
}

type Props = {
  isi: IsiSambutan
  /** Tujuan semula pengguna; '/' kalau tidak ada */
  lanjut: string
  sibuk: boolean
  onPilih: (href: string) => void
  onLewati: () => void
  /** Penanda selesai gagal disimpan — tawarkan coba lagi atau lanjut saja */
  galat?: { onCobaLagi: () => void; onLanjutSaja: () => void } | null
}

export default function SambutanIsi({ isi, lanjut, sibuk, onPilih, onLewati, galat }: Props) {
  const adaTujuan = lanjut !== '/'
  const galatRef = useRef<HTMLDivElement>(null)

  // Pesan gagal bisa muncul jauh dari tombol yang ditekan (kartu di bawah
  // layar HP): fokus dipindah ke sana supaya terlihat dan terbaca pembaca layar
  useEffect(() => {
    if (galat) galatRef.current?.focus()
  }, [galat])

  return (
    <div className="sd">
      <section className="sd-hero" aria-labelledby="sd-judul">
        <div className="sd-hero-isi">
          <Image src="/LOGO-512.png" alt="" width={72} height={72} priority className="sd-logo" />
          <div className="sd-label">Selamat bergabung di Superfive Market</div>
          <h1 id="sd-judul" className="sd-judul">{isi.sapaan}</h1>
          <p className="sd-sub">{isi.subjudul}</p>
          {isi.catatan && (
            <p className={`sd-catatan sd-catatan-${isi.catatan.nada}`} role="status">{isi.catatan.teks}</p>
          )}
          {adaTujuan && (
            <button type="button" className="sd-lanjut" onClick={() => onPilih(lanjut)} disabled={sibuk}>
              Lanjutkan ke halaman tadi <IkonPanah size={18} />
            </button>
          )}
        </div>
      </section>

      <section className="sd-badan" aria-label="Pilihan untuk memulai">
        <h2 className="sd-kepala">{adaTujuan ? 'Atau mulai dari sini' : 'Mulai dari sini'}</h2>
        {/* Di bawah judul: judul putihnya harus tetap di atas latar navy */}
        {galat && (
          <div ref={galatRef} className="sd-galat" role="alert" tabIndex={-1}>
            <p style={{ margin: '0 0 10px' }}>
              <strong>Pilihanmu belum tersimpan.</strong> Periksa koneksi internet, lalu coba lagi.
              Kalau dilanjutkan tanpa menyimpan, halaman ini mungkin muncul sekali lagi saat kamu masuk berikutnya.
            </p>
            <div className="sd-galat-aksi">
              <button type="button" className="sd-galat-coba" onClick={galat.onCobaLagi} disabled={sibuk}>
                {sibuk ? 'Menyimpan…' : 'Coba lagi'}
              </button>
              <button type="button" className="sd-galat-lanjut" onClick={galat.onLanjutSaja} disabled={sibuk}>
                Lanjut tanpa menyimpan
              </button>
            </div>
          </div>
        )}
        <ul className="sd-grid" role="list">
          {isi.pilihan.map(p => {
            const Ikon = IKON[p.ikon]
            return (
              <li key={p.kunci}>
                <a
                  href={p.href}
                  className="sd-kartu"
                  aria-disabled={sibuk}
                  onClick={e => { e.preventDefault(); if (!sibuk) onPilih(p.href) }}
                >
                  <span className="sd-ikon" aria-hidden="true"><Ikon size={24} /></span>
                  <span className="sd-kartu-teks">
                    <span className="sd-kartu-judul">{p.judul}</span>
                    <span className="sd-kartu-ket">{p.keterangan}</span>
                  </span>
                  <span className="sd-panah" aria-hidden="true"><IkonPanah size={18} /></span>
                </a>
              </li>
            )
          })}
        </ul>

        <div className="sd-kaki">
          <button type="button" className="sd-lewati" onClick={onLewati} disabled={sibuk}>
            {sibuk ? 'Sebentar…' : adaTujuan ? 'Lewati' : 'Lewati, ke Beranda'}
          </button>
          <p className="sd-catatan-kaki">
            Halaman ini hanya muncul sekali. Semua pilihan di atas tetap bisa dibuka kapan saja dari menu.
          </p>
        </div>
      </section>
    </div>
  )
}
