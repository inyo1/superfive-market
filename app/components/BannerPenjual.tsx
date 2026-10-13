'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { IkonEtalase, IkonWhatsApp } from './beranda/Ikon'
import { normalisasiWA } from '../../lib/kontak'

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
 * Sejak Oktober 2026 toko dibuat database saat pengajuan disetujui, jadi
 * 'belum_toko' praktis hanya untuk penjual yang disetujui sebelum itu —
 * logikanya dibiarkan sebagai cadangan, dan /produk/tambah tetap membuat
 * tokonya kalau belum ada. 'toko_kosong' juga mengajak ke Pengaturan Toko,
 * karena nama dan kategori bawaannya (nama penjual, UMKM) perlu diganti.
 *
 * `sembunyikan` dipakai dashboard untuk keadaan yang sudah punya layar
 * penuhnya sendiri, supaya ajakannya tidak muncul dua kali.
 *
 * Banner kedua, terpisah: penjual AKTIF atau MENUNGGU yang users.no_hp-nya
 * kosong diminta melengkapi nomor WA langsung di banner (BannerNomor) —
 * admin mengabari hasil pengajuan lewat nomor itu. Keduanya bisa tampil
 * bersamaan.
 */
const gayaKedua: React.CSSProperties = {
  background: '#fff', color: '#0C447C', border: '1px solid #0C447C', padding: '0 18px', minHeight: '44px',
  borderRadius: '9px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
}

export default function BannerPenjual({
  sembunyikan = [], lebarMaks = '660px', onPengaturan,
}: {
  sembunyikan?: Keadaan[]
  lebarMaks?: string
  /** Kalau diisi, tombol Pengaturan Toko memanggil ini alih-alih menaut ke /dashboard?tab=toko */
  onPengaturan?: () => void
}) {
  const [keadaan, setKeadaan] = useState<Keadaan | null>(null)
  // Penjual aktif/menunggu tanpa users.no_hp: admin tidak bisa mengabarinya.
  // Diisi id-nya supaya banner nomor bisa menyimpan langsung
  const [perluNomor, setPerluNomor] = useState<string | null>(null)

  useEffect(() => {
    let hidup = true
    async function muat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Baris sendiri — satu-satunya baris users yang boleh dibaca klien
      const { data: saya } = await supabase
        .from('users').select('status_penjual, no_hp').eq('id', user.id).maybeSingle()
      if (!hidup) return
      const status = saya?.status_penjual
      if ((status === 'aktif' || status === 'menunggu') && !saya?.no_hp?.trim()) setPerluNomor(user.id)
      if (status !== 'aktif') return

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

  const tampilToko = keadaan !== null && !sembunyikan.includes(keadaan)
  if (!tampilToko && !perluNomor) return null

  return (
    <>
      {perluNomor && (
        <BannerNomor userId={perluNomor} lebarMaks={lebarMaks} onTersimpan={() => setPerluNomor(null)} />
      )}
      {tampilToko && <BannerToko keadaan={keadaan} lebarMaks={lebarMaks} onPengaturan={onPengaturan} />}
    </>
  )
}

function BannerToko({ keadaan, lebarMaks, onPengaturan }: { keadaan: Keadaan; lebarMaks: string; onPengaturan?: () => void }) {
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          <Link href="/produk/tambah" style={{
            background: '#0C447C', color: '#fff', padding: '0 18px', minHeight: '44px', borderRadius: '9px',
            fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
          }}>
            {isi.tombol}
          </Link>
          {/* Toko otomatis bernama penjual dan berkategori UMKM — ajak
              penggantinya sekalian, sebelum produk pertama membuatnya tayang */}
          {keadaan === 'toko_kosong' && (onPengaturan
            // Di dashboard sendiri: tautan ke halaman yang sama tidak memuat
            // ulang apa pun, jadi pemanggil yang memindah tabnya
            ? <button type="button" onClick={onPengaturan} style={gayaKedua}>Pengaturan Toko</button>
            : <Link href="/dashboard?tab=toko" style={gayaKedua}>Pengaturan Toko</Link>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Lengkapi nomor WhatsApp (users.no_hp) langsung di banner, untuk penjual
 * yang mendaftar sebelum /jual mewajibkannya. Normalisasinya sama dengan
 * /jual dan /profil (62…). Hilang begitu tersimpan; sengaja tanpa tombol
 * tutup, sama seperti banner toko.
 */
function BannerNomor({ userId, lebarMaks, onTersimpan }: { userId: string; lebarMaks: string; onTersimpan: () => void }) {
  const [nomor, setNomor] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)
  // Penjaga kirim ganda pakai ref, bukan state (lihat Wave 3 di CLAUDE.md)
  const sedangKirim = useRef(false)

  async function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (sedangKirim.current) return
    const hasil = normalisasiWA(nomor)
    if (!hasil.ok) { setGalat(hasil.pesan); return }

    sedangKirim.current = true
    setMenyimpan(true)
    setGalat(null)
    try {
      const { data, error } = await supabase
        .from('users').update({ no_hp: hasil.nomor }).eq('id', userId).select('no_hp').maybeSingle()
      if (error) throw new Error(error.message)
      // RLS yang menolak UPDATE tidak melempar error — barisnya saja yang
      // tidak kembali
      if (data?.no_hp !== hasil.nomor) throw new Error('perubahan tidak tersimpan')
      onTersimpan()
    } catch (err) {
      setGalat('Gagal menyimpan: ' + (err as Error).message)
    } finally {
      sedangKirim.current = false
      setMenyimpan(false)
    }
  }

  return (
    <div style={{ padding: '12px 16px 0' }}>
      <form
        onSubmit={simpan}
        style={{
          maxWidth: lebarMaks, margin: '0 auto', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: '12px 14px', flexWrap: 'wrap',
          background: '#fff8e1', border: '1px solid #ffe082', borderLeft: '4px solid #FFB51B',
          borderRadius: '12px', padding: '14px 16px',
        }}
      >
        <span aria-hidden style={{
          width: '40px', height: '40px', borderRadius: '50%', background: '#fff', color: '#128C7E',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IkonWhatsApp size={22} />
        </span>
        <label htmlFor="banner-no-hp" style={{ flex: '1 1 220px', minWidth: 0, fontSize: '14px', fontWeight: 700, color: '#062F59', lineHeight: 1.4 }}>
          Lengkapi nomor WhatsApp-mu supaya admin bisa menghubungimu
          <span style={{ display: 'block', fontSize: '12px', fontWeight: 400, color: '#5a7da0', marginTop: '2px' }}>
            Tidak ditampilkan ke publik.
          </span>
        </label>
        <div style={{ display: 'flex', gap: '8px', flex: '1 1 260px' }}>
          <input
            id="banner-no-hp"
            value={nomor}
            onChange={ev => { setNomor(ev.target.value); setGalat(null) }}
            type="tel" inputMode="tel" autoComplete="tel"
            placeholder="081234567890"
            aria-invalid={Boolean(galat)}
            aria-describedby={galat ? 'banner-no-hp-galat' : undefined}
            style={{
              flex: 1, minWidth: 0, padding: '0 12px', minHeight: '44px', borderRadius: '9px', fontSize: '13px',
              border: `1px solid ${galat ? '#f09595' : '#c5d9ef'}`, outline: 'none', boxSizing: 'border-box', background: '#fff',
            }}
          />
          <button type="submit" disabled={menyimpan || !nomor.trim()} style={{
            background: menyimpan || !nomor.trim() ? '#7fa8c9' : '#0C447C', color: '#fff', border: 'none',
            padding: '0 18px', minHeight: '44px', borderRadius: '9px', fontSize: '13px', fontWeight: 600,
            cursor: menyimpan || !nomor.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
          }}>
            {menyimpan ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
        {galat && (
          <div id="banner-no-hp-galat" role="alert" style={{ flexBasis: '100%', fontSize: '12px', color: '#c62828' }}>{galat}</div>
        )}
      </form>
    </div>
  )
}
