'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { IkonEtalase } from './beranda/Ikon'

type Keadaan = 'belum_toko' | 'toko_kosong'

const ISI: Record<Keadaan, { judul: string; pesan: string; tombol: string }> = {
  belum_toko: {
    judul: 'Pengajuanmu sudah disetujui!',
    pesan: 'Buat tokomu sekarang.',
    tombol: 'Buat Toko',
  },
  toko_kosong: {
    judul: 'Tokomu sudah jadi.',
    pesan: 'Tambahkan produk pertamamu biar tokomu tampil di Superfive Market.',
    tombol: 'Tambah Produk',
  },
}

/**
 * Banner untuk penjual aktif yang lapaknya belum tayang. Muncul di beranda
 * (tujuan bawaan setelah login) dan dashboard.
 *
 *   belum punya toko        → ajakan membuat toko
 *   punya toko, 0 produk    → ajakan menambah produk pertama
 *   punya toko + produk     → tidak ada apa-apa
 *
 * Sengaja TANPA tombol tutup: banner ini hilang sendiri begitu kondisinya
 * terpenuhi, dan selama belum, memang itu langkah berikutnya penjualnya.
 *
 * Tidak ada halaman "buat toko". Toko dibuat otomatis saat produk pertama
 * disimpan di /produk/tambah — jadi kedua keadaan menuju halaman yang sama,
 * dan tokonya lahir bersama produk pertamanya.
 *
 * `sembunyikan` dipakai dashboard untuk keadaan yang sudah punya layar
 * penuhnya sendiri, supaya ajakannya tidak muncul dua kali.
 */
export default function BannerPenjual({
  sembunyikan = [], lebarMaks = '660px',
}: { sembunyikan?: Keadaan[]; lebarMaks?: string }) {
  const [keadaan, setKeadaan] = useState<Keadaan | null>(null)

  useEffect(() => {
    let hidup = true
    async function muat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Baris sendiri — satu-satunya baris users yang boleh dibaca klien
      const { data: saya } = await supabase
        .from('users').select('status_penjual').eq('id', user.id).maybeSingle()
      if (!hidup || saya?.status_penjual !== 'aktif') return

      const { data: toko } = await supabase
        .from('toko').select('id').eq('seller_id', user.id).limit(1).maybeSingle()
      if (!hidup) return
      if (!toko) { setKeadaan('belum_toko'); return }

      // Pemilik melihat semua produknya sendiri lewat RLS, jadi hitungan ini
      // sama dengan yang ia kelola di dashboard
      const { count } = await supabase
        .from('produk').select('id', { count: 'exact', head: true }).eq('toko_id', toko.id)
      if (!hidup) return
      // count null = query gagal; lebih baik diam daripada menyuruh penjual
      // yang sudah punya produk untuk menambah produk pertama
      if (count === 0) setKeadaan('toko_kosong')
    }
    muat()
    return () => { hidup = false }
  }, [])

  if (!keadaan || sembunyikan.includes(keadaan)) return null
  const isi = ISI[keadaan]

  return (
    <div style={{ padding: '12px 16px 0' }}>
      <div
        role="status"
        style={{
          maxWidth: lebarMaks, margin: '0 auto', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
          background: '#E6F1FB', border: '1px solid #c5d9ef', borderLeft: '4px solid #FFB51B',
          borderRadius: '12px', padding: '14px 16px',
        }}
      >
        <span aria-hidden style={{
          width: '40px', height: '40px', borderRadius: '50%', background: '#fff', color: '#0C447C',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IkonEtalase size={22} />
        </span>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#062F59' }}>{isi.judul}</div>
          <div style={{ fontSize: '13px', color: '#33465a', lineHeight: 1.5, marginTop: '2px' }}>{isi.pesan}</div>
        </div>
        <Link href="/produk/tambah" style={{
          background: '#0C447C', color: '#fff', padding: '0 18px', minHeight: '44px', borderRadius: '9px',
          fontSize: '13px', fontWeight: 600, textDecoration: 'none', flexShrink: 0,
          display: 'inline-flex', alignItems: 'center',
        }}>
          {isi.tombol}
        </Link>
      </div>
    </div>
  )
}
