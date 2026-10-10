'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { unduhKartuPengingat } from '../../../lib/kartuPengingat'
import { IkonSurat } from '../beranda/Ikon'

// Layar setelah daftar, saat email masih harus dikonfirmasi (Wave 3).
//
// Kirim ulang memakai supabase.auth.resend — alur resmi Supabase Auth, tanpa
// mengubah konfigurasi apa pun. Dua pagar:
// - jeda 60 detik di klien, ditambah batas frekuensi di server Supabase
// - pesan hasilnya SAMA untuk semua keadaan (akun belum aktif, sudah aktif,
//   atau tidak ada): membedakannya akan membocorkan email siapa saja yang
//   terdaftar. Hanya "terlalu sering" dan "koneksi gagal" yang dibedakan,
//   karena keduanya tidak mengatakan apa pun soal akunnya.

const JEDA = 60

type Props = {
  email: string
  /** Detik jeda sebelum kirim ulang pertama. 60 kalau email baru saja dikirim saat daftar */
  jedaAwal?: number
  /** Judul layar — bawaannya untuk pendaftar baru */
  judul?: string
  /** Kalimat tambahan soal angkatan untuk pendaftar alumni; null kalau tidak ada */
  catatanAlumni: string | null
  onKeMasuk: () => void
  onUbahEmail: () => void
}

export default function CekEmail({
  email, jedaAwal = JEDA, judul = 'Satu langkah lagi: cek emailmu', catatanAlumni, onKeMasuk, onUbahEmail,
}: Props) {
  const [sisa, setSisa] = useState(jedaAwal)
  const [mengirim, setMengirim] = useState(false)
  const [kabar, setKabar] = useState<{ nada: 'ok' | 'galat'; teks: string } | null>(null)
  const [kartu, setKartu] = useState('')
  const terkunci = useRef(false)

  useEffect(() => {
    if (sisa <= 0) return
    const t = setTimeout(() => setSisa(n => n - 1), 1000)
    return () => clearTimeout(t)
  }, [sisa])

  async function kirimUlang() {
    // Ref, bukan state: dua klik cepat sama-sama melihat state lama
    if (sisa > 0 || terkunci.current) return
    terkunci.current = true
    setMengirim(true)
    setKabar(null)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },   // sama dengan signUp
      })
      const s = (error as { status?: number } | null)?.status
      if (error && (s === 429 || /rate|too many|security purposes/i.test(error.message))) {
        setKabar({ nada: 'galat', teks: 'Permintaan terlalu sering. Tunggu beberapa menit, lalu coba lagi.' })
      } else {
        setKabar({ nada: 'ok', teks: 'Kalau akun ini belum aktif, tautan konfirmasi baru sudah kami kirim. Periksa juga folder Spam dan Promosi.' })
      }
    } catch {
      setKabar({ nada: 'galat', teks: 'Gagal mengirim. Periksa koneksi internetmu, lalu coba lagi.' })
    } finally {
      terkunci.current = false
      setMengirim(false)
      setSisa(JEDA)
    }
  }

  async function unduhKartu() {
    try { await unduhKartuPengingat(email); setKartu('Kartu tersimpan di folder unduhan.') }
    catch { setKartu('Kartu gagal dibuat di peramban ini.') }
  }

  return (
    <div className="cek-kotak">
      <div className="cek-ikon" aria-hidden="true"><IkonSurat size={34} tebal={1.7} /></div>
      <h1 className="cek-judul">{judul}</h1>
      <p className="cek-teks">Tautan konfirmasi dikirim ke</p>
      <div className="cek-email">{email}</div>

      <ol className="cek-langkah">
        <li>Buka aplikasi email di HP atau komputermu.</li>
        <li>Cari email dari <strong>Superfive Market</strong>. Kalau tidak ada di Kotak Masuk, periksa folder <strong>Spam</strong>, <strong>Promosi</strong>, atau <strong>Pembaruan</strong>.</li>
        <li>Tekan tautan konfirmasi di email itu. Akunmu langsung aktif.</li>
      </ol>

      {catatanAlumni && <p className="cek-teks" style={{ margin: '0 0 16px' }}>{catatanAlumni}</p>}

      <button type="button" className="cek-utama" onClick={onKeMasuk}>Sudah konfirmasi? Masuk</button>

      <button type="button" className="cek-ulang" onClick={kirimUlang} disabled={sisa > 0 || mengirim}>
        {mengirim ? 'Mengirim…' : sisa > 0 ? `Kirim ulang email dalam ${sisa} detik` : 'Kirim ulang email konfirmasi'}
      </button>
      <p role="status" aria-live="polite" className="cek-kabar" style={{ color: kabar?.nada === 'galat' ? '#c62828' : '#2e7d32' }}>
        {kabar?.teks ?? ''}
      </p>

      <div className="cek-bawah">
        <button type="button" className="cek-tautan" onClick={onUbahEmail}>Salah ketik email? Daftar ulang</button>
        <button type="button" className="cek-tautan" onClick={unduhKartu}>Unduh Kartu Pengingat Akun</button>
      </div>
      {kartu && <p role="status" className="cek-kabar" style={{ color: '#4f6b87' }}>{kartu}</p>}
    </div>
  )
}
