'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { IkonProduk, IkonToko } from './IkonStatistik'

// State kosong untuk daftar produk umum — beranda dan /produk.
//
// KENAPA BUKAN "Belum ada produk" (judulnya sekarang "Marketplace Alumni
// Sedang Bertumbuh", sejak redesain beranda Oktober 2026). Merchandise resmi
// sekarang dikeluarkan dari semua daftar umum, dan sampai ada alumni yang
// membuka lapak, daftar itu memang kosong. "Belum ada produk" terbaca seperti
// Superfive tidak menjual apa pun — padahal merchandise resmi ada, hanya
// pindah rak. Jadi kosongnya harus terbaca sebagai keadaan yang disengaja,
// dengan dua jalan keluar: melihat merchandise, atau jadi penjual pertama.
//
// Dipakai di DUA halaman. Kalau teksnya perlu berubah, ubah di sini —
// jangan disalin ke salah satunya, karena salinan yang tertinggal akan
// membuat dua halaman menjanjikan hal berbeda.

type Props = {
  /** Penjual aktif dapat ajakan yang berbeda: menambah produknya sendiri */
  penjualAktif?: boolean
}

const KOTAK: React.CSSProperties = {
  background: '#fff', borderRadius: '20px', padding: '48px 24px',
  textAlign: 'center', border: '1px solid #DCE8F4',
}

const LINGKAR_IKON: React.CSSProperties = {
  width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px',
  background: '#EAF4FC', color: '#07589F',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const TOMBOL_UTAMA: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '#07589F', color: '#fff', padding: '0 22px', minHeight: '46px',
  borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none',
  border: '1px solid #07589F',
}

const TOMBOL_KEDUA: React.CSSProperties = {
  ...TOMBOL_UTAMA,
  background: '#fff', color: '#07589F',
}

export default function LapakSegeraDibuka({ penjualAktif = false }: Props) {
  // Id toko resmi dicari, bukan ditulis tetap: UUID yang ditanam di kode akan
  // menunjuk ke mana-mana begitu tokonya dibuat ulang di database lain.
  const [tokoResmi, setTokoResmi] = useState<string | null>(null)

  useEffect(() => {
    let hidup = true
    supabase
      .from('toko').select('id').eq('is_official', true)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => { if (hidup) setTokoResmi(data?.id ?? null) })
    return () => { hidup = false }
  }, [])

  if (penjualAktif) {
    return (
      <div style={KOTAK}>
        <div style={LINGKAR_IKON}><IkonProduk size={28} /></div>
        <div style={{ fontSize: '15px', color: '#617B95', marginBottom: '18px' }}>
          Belum ada produk di lapakmu
        </div>
        <Link href="/produk/tambah" className="btn-primary" style={TOMBOL_UTAMA}>+ Tambah Produk Pertama</Link>
      </div>
    )
  }

  return (
    <div style={KOTAK}>
      <div style={LINGKAR_IKON}><IkonToko size={28} /></div>
      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#092D52', margin: '0 0 8px', letterSpacing: '-0.2px' }}>
        Marketplace Alumni Sedang Bertumbuh
      </h3>
      <p style={{ fontSize: '15px', color: '#617B95', lineHeight: 1.7, margin: '0 auto 24px', maxWidth: '440px' }}>
        Usaha dan jasa alumni akan tampil di sini. Alumni Superfive sedang
        bersiap membuka lapaknya masing-masing menjelang Reuni Akbar 17 Oktober.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* Tombolnya hilang sendiri kalau toko resmi belum ada di database,
            bukan menautkan ke /toko/undefined */}
        {tokoResmi && (
          <Link href={`/toko/${tokoResmi}`} className="btn-primary" style={TOMBOL_UTAMA}>Lihat Merchandise IniLima</Link>
        )}
        <Link href="/jual" className="btn-primary" style={TOMBOL_KEDUA}>Jadi Penjual Pertama</Link>
      </div>
    </div>
  )
}
