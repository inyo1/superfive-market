'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// State kosong untuk daftar produk umum — beranda dan /produk.
//
// KENAPA BUKAN "Belum ada produk". Merchandise resmi sekarang dikeluarkan
// dari semua daftar umum, dan sampai ada alumni yang membuka lapak, daftar
// itu memang kosong. "Belum ada produk" terbaca seperti Superfive tidak
// menjual apa pun — padahal merchandise resmi ada, hanya pindah rak. Jadi
// kosongnya harus terbaca sebagai keadaan yang disengaja, dengan dua jalan
// keluar: melihat merchandise, atau jadi penjual pertama.
//
// Dipakai di DUA halaman. Kalau teksnya perlu berubah, ubah di sini —
// jangan disalin ke salah satunya, karena salinan yang tertinggal akan
// membuat dua halaman menjanjikan hal berbeda.

type Props = {
  /** Penjual aktif dapat ajakan yang berbeda: menambah produknya sendiri */
  penjualAktif?: boolean
}

const KOTAK: React.CSSProperties = {
  background: '#fff', borderRadius: '12px', padding: '36px 20px',
  textAlign: 'center', border: '0.5px solid #e8f0f8',
}

const TOMBOL_UTAMA: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '#0C447C', color: '#fff', padding: '0 20px', minHeight: '44px',
  borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
}

const TOMBOL_KEDUA: React.CSSProperties = {
  ...TOMBOL_UTAMA,
  background: '#fff', color: '#0C447C', border: '1px solid #0C447C',
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
        <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
        <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '14px' }}>
          Belum ada produk di lapakmu
        </div>
        <Link href="/produk/tambah" style={TOMBOL_UTAMA}>+ Tambah Produk Pertama</Link>
      </div>
    )
  }

  return (
    <div style={KOTAK}>
      <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏪</div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a', marginBottom: '6px' }}>
        Lapak alumni segera dibuka
      </div>
      <p style={{ fontSize: '13px', color: '#5a7da0', lineHeight: 1.7, margin: '0 auto 18px', maxWidth: '360px' }}>
        Alumni Superfive sedang bersiap membuka lapaknya masing-masing menjelang
        Reuni Akbar 17 Oktober.
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* Tombolnya hilang sendiri kalau toko resmi belum ada di database,
            bukan menautkan ke /toko/undefined */}
        {tokoResmi && (
          <Link href={`/toko/${tokoResmi}`} style={TOMBOL_UTAMA}>Lihat Merchandise Resmi</Link>
        )}
        <Link href="/jual" style={TOMBOL_KEDUA}>Jadi Penjual Pertama</Link>
      </div>
    </div>
  )
}
