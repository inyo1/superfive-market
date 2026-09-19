'use client'
import { urlWhatsApp } from '../../lib/kontak'

// "Laporkan angkatan" — sisi lain dari koreksi sosial di NamaPenjual.
// Kalau angkatan yang tampil di samping nama penjual terlihat janggal, teman
// seangkatan bisa melapor ke pengurus lewat WhatsApp dengan pesan yang sudah
// terisi.
//
// ⚠ SENGAJA MATI SAMPAI NOMOR PENGURUS ADA.
//
// Nomor tujuan dibaca dari NEXT_PUBLIC_WA_LAPOR. Kalau kosong, komponen ini
// mengembalikan null — tombolnya tidak dirender sama sekali, bukan tombol
// yang tidak berfungsi. Jangan diganti dengan nomor cadangan di kode.
//
// - Lokal: .env.local berisi 9990000000. Kode negara +999 dicadangkan ITU dan
//   dijamin bukan nomor siapa pun, jadi uji coba tidak mengirim apa pun ke
//   orang sungguhan.
// - Vercel production: JANGAN diisi dulu. Begitu nomor asli pengurus ada,
//   isi env-nya lalu redeploy — NEXT_PUBLIC_* ditanam saat build, jadi
//   mengubah env tanpa redeploy tidak berpengaruh apa pun.
//
// Tidak lewat RPC dan tidak mencatat apa pun: yang dilaporkan adalah
// kejanggalan yang dinilai manusia, bukan prospek yang perlu dihitung.

const NOMOR_LAPOR = (process.env.NEXT_PUBLIC_WA_LAPOR ?? '').replace(/\D/g, '')

type Props = {
  /** toko.id — tautan di pesan menunjuk halaman toko, tempat tombol ini
   *  dipasang. Tidak ada rute profil pengguna tersendiri. */
  tokoId: string
  nama: string
  /** `label_angkatan` dari view — bukan dirangkai sendiri */
  labelAngkatan: string
}

export default function TombolLapor({ tokoId, nama, labelAngkatan }: Props) {
  if (!NOMOR_LAPOR) return null

  const pesan =
    `Lapor keabsahan angkatan: ${nama} (${labelAngkatan}) ` +
    `— superfivemarket.com/toko/${tokoId}`

  return (
    <a
      href={urlWhatsApp(NOMOR_LAPOR, pesan)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        background: 'transparent', color: 'inherit',
        border: '0.5px solid currentColor', borderRadius: '20px',
        padding: '4px 10px', minHeight: '28px', boxSizing: 'border-box',
        fontSize: '11px', textDecoration: 'none', opacity: 0.85,
      }}
    >
      <span aria-hidden>⚑</span> Angkatan ini janggal? Laporkan
    </a>
  )
}
