'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../components/Navbar'
import Skeleton, { SkeletonPanel } from '../../components/Skeleton'
import { useTampilSkeleton } from '../../hooks/useSkeleton'
import { adminPenuh } from '../../../lib/peran'
import { tanggalPeristiwa } from '../../../lib/format'

// Panel pengajuan penjual — sengaja terpisah dari /admin/verifikasi.
// Dua urusan berbeda: yang satu memutuskan siapa alumni, yang ini memutuskan
// siapa boleh berjualan. Hanya status_penjual yang menentukan toko tayang.
//
// Semua keputusan lewat RPC putuskan_penjual. Jangan UPDATE users langsung:
// trigger jaga_field_sensitif akan mengembalikannya diam-diam tanpa error.

type Penjual = {
  id: string
  nama: string | null
  email: string | null
  angkatan: number | null
  avatar_url: string | null
  status_alumni: string
  status_penjual: string
  is_institusi: boolean | null
  alamat_lengkap: string | null
  bank_nama: string | null
  bank_rekening: string | null
  bank_atas_nama: string | null
  ajukan_penjual_at: string | null
  penjual_diputus_at: string | null
  alasan_penjual: string | null
  jml_telat_kirim: number
  telat_terakhir_at: string | null
}

const TABS = ['menunggu', 'aktif', 'ditolak', 'dibekukan'] as const
type Tab = (typeof TABS)[number]

const LABEL_TAB: Record<Tab, string> = {
  menunggu: 'Menunggu',
  aktif: 'Aktif',
  ditolak: 'Ditolak',
  dibekukan: 'Dibekukan',
}

const LABEL_ALUMNI: Record<string, { teks: string; warna: string; latar: string }> = {
  alumni:   { teks: 'Alumni terverifikasi', warna: '#1565c0', latar: '#e3f2fd' },
  menunggu: { teks: 'Alumni menunggu',      warna: '#f57f17', latar: '#fff8e1' },
  ditolak:  { teks: 'Alumni ditolak',       warna: '#c62828', latar: '#fce4e4' },
  umum:     { teks: 'Belum mengaku alumni', warna: '#5a7da0', latar: '#f0f5fb' },
}


function Avatar({ nama, url, size = 48 }: { nama: string | null; url: string | null; size?: number }) {
  const initial = nama
    ? nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      overflow: 'hidden', background: 'linear-gradient(135deg, #185FA5, #0C447C)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {url ? (
        <Image src={url} alt={nama ?? ''} width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: `${Math.round(size * 0.38)}px`, fontWeight: '700', color: '#fff', lineHeight: 1 }}>{initial}</span>
      )}
    </div>
  )
}

function Baris({ label, isi }: { label: string; isi: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ fontSize: '10px', color: '#5a7da0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', color: '#1a1a1a', whiteSpace: 'pre-line' }}>{isi}</div>
    </div>
  )
}

export default function PenjualAdminPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const tampilSkeleton = useTampilSkeleton(!ready)
  const [tab, setTab] = useState<Tab>('menunggu')
  const [daftar, setDaftar] = useState<Penjual[]>([])
  const [pesan, setPesan] = useState<{ text: string; ok: boolean } | null>(null)
  const [prosesId, setProsesId] = useState<string | null>(null)

  // Form alasan — dipakai bersama untuk tolak dan bekukan, karena keduanya
  // sama-sama wajib beralasan dan hanya satu yang bisa terbuka sekaligus
  const [formId, setFormId] = useState<string | null>(null)
  const [formJenis, setFormJenis] = useState<'ditolak' | 'dibekukan'>('ditolak')
  const [alasan, setAlasan] = useState('')

  function tampilkanPesan(text: string, ok: boolean) {
    setPesan({ text, ok })
    setTimeout(() => setPesan(null), 4000)
  }

  async function muat() {
    const { data, error } = await supabase
      .from('users')
      .select('id, nama, email, angkatan, avatar_url, status_alumni, status_penjual, is_institusi, alamat_lengkap, bank_nama, bank_rekening, bank_atas_nama, ajukan_penjual_at, penjual_diputus_at, alasan_penjual, jml_telat_kirim, telat_terakhir_at')
      .neq('status_penjual', 'belum_ajukan')
      .order('ajukan_penjual_at', { ascending: false })

    if (error) { tampilkanPesan('Gagal memuat pengajuan: ' + error.message, false); return }
    setDaftar((data ?? []) as unknown as Penjual[])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth?redirect=/admin/penjual'); return }

      const { data: profile } = await supabase
        .from('users').select('role').eq('id', user.id).single()
      // Izin berjualan urusan admin penuh, bukan admin angkatan
      if (!adminPenuh(profile?.role)) { router.replace('/'); return }

      await muat()
      setReady(true)
    }
    init()
  }, [])

  async function putuskan(id: string, keputusan: 'aktif' | 'ditolak' | 'dibekukan', alasanTeks?: string) {
    setProsesId(id)
    try {
      const { data, error } = await supabase.rpc('putuskan_penjual', {
        p_user_id: id,
        p_keputusan: keputusan,
        p_alasan: alasanTeks ?? null,
      })
      if (error) throw new Error(error.message)

      const hasil = data as { nama: string | null; status: string } | null
      setDaftar(prev => prev.map(p => p.id === id
        ? {
            ...p,
            status_penjual: keputusan,
            alasan_penjual: alasanTeks ?? null,
            penjual_diputus_at: new Date().toISOString(),
          }
        : p))

      const kata = keputusan === 'aktif' ? 'disetujui' : keputusan === 'ditolak' ? 'ditolak' : 'dibekukan'
      tampilkanPesan(`${hasil?.nama ?? 'Penjual'} ${kata}.`, true)
      setFormId(null)
      setAlasan('')
    } catch (e) {
      tampilkanPesan('Gagal: ' + (e instanceof Error ? e.message : 'coba lagi'), false)
    } finally {
      setProsesId(null)
    }
  }

  function kirimAlasan(id: string) {
    if (!alasan.trim()) { tampilkanPesan('Alasan wajib diisi', false); return }
    putuskan(id, formJenis, alasan.trim())
  }

  function bukaForm(id: string, jenis: 'ditolak' | 'dibekukan') {
    setFormId(id)
    setFormJenis(jenis)
    setAlasan('')
  }

  const terlihat = daftar.filter(p => p.status_penjual === tab)
  function jumlah(t: Tab) { return daftar.filter(p => p.status_penjual === t).length }

  if (tampilSkeleton) return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>
        <Skeleton tinggi={18} lebar="45%" style={{ marginBottom: '6px' }} />
        <Skeleton tinggi={11} lebar="70%" style={{ marginBottom: '18px' }} />
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} tinggi={34} radius={8} style={{ flex: 1 }} />)}
        </div>
        <SkeletonPanel baris={3} />
        <SkeletonPanel baris={3} />
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Pengajuan Penjual</h1>
          <Link href="/admin" style={{ fontSize: '12px', color: '#0C447C', textDecoration: 'none' }}>← Panel Admin</Link>
        </div>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '16px' }}>
          Hanya status ini yang menentukan toko tayang. Verifikasi alumni urusan terpisah —
          ada di <Link href="/admin/verifikasi" style={{ color: '#0C447C' }}>panelnya sendiri</Link>.
        </div>

        {pesan && (
          <div style={{ background: pesan.ok ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesan.ok ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesan.ok ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
            {pesan.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {TABS.map(t => {
            const aktif = tab === t
            return (
              <button
                key={t}
                onClick={() => { setTab(t); setFormId(null) }}
                style={{
                  flex: '1 1 20%', padding: '9px 6px', borderRadius: '8px',
                  border: aktif ? 'none' : '0.5px solid #c5d9ef',
                  background: aktif ? '#0C447C' : '#fff',
                  color: aktif ? '#fff' : '#5a7da0',
                  fontSize: '12px', fontWeight: aktif ? '600' : '400', cursor: 'pointer',
                  minHeight: '38px',
                }}
              >
                {LABEL_TAB[t]} ({jumlah(t)})
              </button>
            )
          })}
        </div>

        {terlihat.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 20px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>{tab === 'menunggu' ? '✅' : '📭'}</div>
            <div style={{ fontSize: '13px', color: '#5a7da0' }}>
              {tab === 'menunggu' ? 'Tidak ada pengajuan yang menunggu' : `Belum ada penjual ${LABEL_TAB[tab].toLowerCase()}`}
            </div>
          </div>
        ) : terlihat.map(p => {
          const sedangProses = prosesId === p.id
          const alumni = LABEL_ALUMNI[p.status_alumni] ?? LABEL_ALUMNI.umum
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #c5d9ef', marginBottom: '10px', overflow: 'hidden' }}>

              {/* Identitas */}
              <div style={{ padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Avatar nama={p.nama} url={p.avatar_url} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nama || 'Tanpa nama'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#5a7da0' }}>
                    {p.is_institusi ? 'Akun institusi' : p.angkatan ? `Angkatan ${p.angkatan}` : 'Angkatan belum diisi'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5a7da0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.email ?? '-'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <span style={{ background: alumni.latar, color: alumni.warna, fontSize: '10px', fontWeight: '600', padding: '3px 9px', borderRadius: '20px' }}>
                      {alumni.teks}
                    </span>
                    {/* Informasi saja. Belum ada pembekuan otomatis —
                        keputusannya sepenuhnya di tangan admin. */}
                    {p.jml_telat_kirim > 0 && (
                      <span
                        title={p.telat_terakhir_at ? `Terakhir telat ${tanggalPeristiwa(p.telat_terakhir_at)}` : undefined}
                        style={{ background: '#fce4e4', color: '#c62828', fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px' }}
                      >
                        ⚠ {p.jml_telat_kirim}× telat kirim
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '6px' }}>
                    Mengajukan {tanggalPeristiwa(p.ajukan_penjual_at)}
                    {p.penjual_diputus_at && ` · diputuskan ${tanggalPeristiwa(p.penjual_diputus_at)}`}
                  </div>
                </div>
              </div>

              {/* Alamat & rekening */}
              <div style={{ margin: '0 14px 12px', background: '#f0f5fb', borderRadius: '8px', padding: '12px' }}>
                <Baris label="Alamat asal pengiriman" isi={p.alamat_lengkap || '— belum diisi —'} />
                <Baris
                  label="Rekening"
                  isi={p.bank_nama
                    ? `${p.bank_nama} · ${p.bank_rekening ?? '-'}\na.n. ${p.bank_atas_nama ?? '-'}`
                    : '— belum diisi —'}
                />
                {/* Nama rekening harus sama dengan nama akun — kalau beda,
                    itu yang perlu ditanyakan sebelum disetujui */}
                {p.bank_atas_nama && p.nama &&
                  p.bank_atas_nama.trim().toLowerCase() !== p.nama.trim().toLowerCase() && (
                  <div style={{ fontSize: '11px', color: '#c62828', marginTop: '2px' }}>
                    Nama rekening berbeda dengan nama akun.
                  </div>
                )}
              </div>

              {/* Alasan keputusan sebelumnya */}
              {p.alasan_penjual && (p.status_penjual === 'ditolak' || p.status_penjual === 'dibekukan') && (
                <div style={{ margin: '0 14px 12px', background: '#fce4e4', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: '#c62828', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Alasan {p.status_penjual === 'ditolak' ? 'ditolak' : 'dibekukan'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#c62828', whiteSpace: 'pre-line' }}>{p.alasan_penjual}</div>
                </div>
              )}

              {/* Aksi */}
              <div style={{ padding: '0 14px 14px' }}>
                {formId === p.id ? (
                  <div style={{ background: '#f0f5fb', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#c62828' }}>
                      Alasan {formJenis === 'ditolak' ? 'penolakan' : 'pembekuan'}
                    </div>
                    <textarea
                      value={alasan}
                      onChange={e => setAlasan(e.target.value)}
                      rows={3}
                      placeholder={formJenis === 'ditolak'
                        ? 'Misal: nama rekening tidak cocok dengan nama akun'
                        : 'Misal: tiga pesanan berturut-turut telat dikirim'}
                      style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #c5d9ef', borderRadius: '6px', fontSize: '12px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif', background: '#fff' }}
                    />
                    <div style={{ fontSize: '11px', color: '#5a7da0' }}>
                      Alasan ini ditampilkan ke penjualnya sendiri.
                      {formJenis === 'dibekukan' && ' Pesanan yang sedang berjalan tetap wajib diselesaikan.'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setFormId(null); setAlasan('') }}
                        style={{ flex: 1, background: '#fff', color: '#5a7da0', border: '0.5px solid #c5d9ef', padding: '9px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => kirimAlasan(p.id)}
                        disabled={sedangProses}
                        style={{ flex: 2, background: sedangProses ? '#e39c9c' : '#c62828', color: '#fff', border: 'none', padding: '9px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                      >
                        {sedangProses ? 'Menyimpan...' : formJenis === 'ditolak' ? 'Kirim Penolakan' : 'Bekukan Penjual'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {p.status_penjual !== 'aktif' && (
                      <button
                        onClick={() => putuskan(p.id, 'aktif')}
                        disabled={sedangProses}
                        style={{ flex: 2, minWidth: '140px', background: sedangProses ? '#a5d6a7' : '#2e7d32', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                      >
                        {sedangProses ? 'Menyimpan...' : '✓ Setujui'}
                      </button>
                    )}
                    {p.status_penjual !== 'ditolak' && (
                      <button
                        onClick={() => bukaForm(p.id, 'ditolak')}
                        disabled={sedangProses}
                        style={{ flex: 1, minWidth: '90px', background: '#fce4e4', color: '#c62828', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                      >
                        Tolak
                      </button>
                    )}
                    {/* Bekukan hanya untuk yang tokonya sedang tayang —
                        membekukan yang belum pernah aktif tidak ada artinya */}
                    {p.status_penjual === 'aktif' && (
                      <button
                        onClick={() => bukaForm(p.id, 'dibekukan')}
                        disabled={sedangProses}
                        style={{ flex: 1, minWidth: '110px', background: '#fff3e0', color: '#e65100', border: '0.5px solid #ffcc80', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                      >
                        Bekukan
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
