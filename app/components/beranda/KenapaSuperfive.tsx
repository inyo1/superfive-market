'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { IkonGrafik, IkonHati, IkonPerisai, IkonWhatsApp } from './Ikon'

type Alasan = {
  ikon: ReactNode
  judul: string
  isi: string
  /** Angka nyata dari statistik hero; 0 = disembunyikan */
  angka?: number
  label?: string
}

/**
 * Seksi "Kenapa Superfive Market?" — empat kartu, serumpun dengan KartuToko
 * (navy, aksen emas, token --sf-*). Kartu pertama navy dan lebih lebar;
 * tiga lainnya putih.
 *
 * Angkanya DARI statistik hero yang sudah dimuat beranda (tanpa query baru)
 * dan disembunyikan selama nilainya 0 — termasuk sebelum data datang, supaya
 * tidak ada "0 toko alumni" yang berkedip.
 *
 * Animasi masuk dikerjakan lewat class di elemen DOM, bukan state React:
 * tanpa JS (atau dengan prefers-reduced-motion) kartunya tampil apa adanya,
 * dan seksi ini di bawah lipatan, jadi tidak ada yang melihat kartunya
 * sempat disembunyikan sebelum animasi.
 */
export default function KenapaSuperfive({ alumni, toko }: { alumni: number; toko: number }) {
  const grid = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const el = grid.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.classList.add('kn-siap')
    const pengamat = new IntersectionObserver(entri => {
      if (entri.some(e => e.isIntersecting)) {
        el.classList.add('kn-masuk')
        pengamat.disconnect() // sekali saja
      }
    }, { threshold: 0.2 })
    pengamat.observe(el)
    return () => pengamat.disconnect()
  }, [])

  const daftar: Alasan[] = [
    {
      ikon: <IkonPerisai size={28} />,
      judul: 'Komunitas Terpercaya',
      // Bukan "diverifikasi sebagai alumni": status alumni didaftarkan sendiri
      // (koreksi sosial), yang diperiksa pengurus adalah pengajuan penjualnya
      isi: 'Setiap penjual disetujui pengurus dan berasal dari komunitas alumni SMPN 5 Bandung.',
      angka: alumni,
      label: 'alumni terverifikasi',
    },
    {
      ikon: <IkonHati size={28} />,
      judul: 'Dukung Sesama Alumni',
      isi: 'Setiap pembelian memperkuat usaha teman seangkatan dan jaringan Superfive.',
      angka: toko,
      label: 'toko alumni',
    },
    {
      ikon: <IkonWhatsApp size={28} />,
      judul: 'Kontak Langsung',
      isi: 'Tanpa perantara. Hubungi penjual langsung lewat WhatsApp dan tanyakan apa saja.',
    },
    {
      ikon: <IkonGrafik size={28} />,
      judul: 'Peluang Lebih Luas',
      isi: 'Bisnis alumni ditemukan lebih banyak orang, dari satu angkatan ke seluruh keluarga besar Superfive.',
    },
  ]

  return (
    <ul ref={grid} className="kn-grid" role="list">
      {daftar.map((a, i) => (
        <li
          key={a.judul}
          className={`kn-kartu${i === 0 ? ' utama' : ''}`}
          style={{ '--kn-i': i } as React.CSSProperties}
        >
          <span className="kn-nomor" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
          <span className="kn-ikon" aria-hidden>{a.ikon}</span>
          <h3 className="kn-judul">{a.judul}</h3>
          <p className="kn-isi">{a.isi}</p>
          {a.angka ? (
            <p className="kn-angka">
              <strong>{a.angka.toLocaleString('id-ID')}</strong>
              <span>{a.label}</span>
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
