'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { urlBukti } from '../../../lib/buktiAlumni'
import Navbar from '../../components/Navbar'
import Skeleton, { SkeletonPanel } from '../../components/Skeleton'
import { useTampilSkeleton } from '../../hooks/useSkeleton'
import { bolehVerifikasiAlumni, adminPenuh, type Peran } from '../../../lib/peran'

type Pendaftar = {
  id: string
  nama: string | null
  email: string | null
  angkatan: number | null
  avatar_url: string | null
  status_alumni: string
  is_institusi: boolean | null
  catatan_admin: string | null
  diminta_data_at: string | null
  bukti_alumni_url: string | null
  catatan_pendaftar: string | null
  alasan_tolak: string | null
  created_at: string
  diverifikasi_at: string | null
}

// Nilai status_alumni, bukan status_verifikasi lama. 'umum' sengaja tidak
// punya tab: mereka pembeli biasa yang tidak pernah mengaku alumni, jadi tidak
// ada yang perlu diputuskan admin.
const TABS = ['menunggu', 'alumni', 'ditolak'] as const
type Tab = (typeof TABS)[number]

const LABEL_TAB: Record<Tab, string> = {
  menunggu: 'Menunggu',
  alumni: 'Terverifikasi',
  ditolak: 'Ditolak',
}

function fmtTgl(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Avatar({ nama, url, size = 48 }: { nama: string | null; url: string | null; size?: number }) {
  const initials = nama
    ? nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      overflow: 'hidden', background: 'linear-gradient(135deg, #185FA5, #0C447C)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {url ? (
        <Image src={url} alt={nama ?? ''} width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: `${Math.round(size * 0.38)}px`, fontWeight: '700', color: '#fff', lineHeight: 1 }}>
          {initials}
        </span>
      )}
    </div>
  )
}

export default function VerifikasiAdminPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const tampilSkeleton = useTampilSkeleton(!ready)
  const [tab, setTab] = useState<Tab>('menunggu')
  const [pendaftar, setPendaftar] = useState<Pendaftar[]>([])
  const [pesan, setPesan] = useState<{ text: string; ok: boolean } | null>(null)
  const [prosesId, setProsesId] = useState<string | null>(null)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [peranSaya, setPeranSaya] = useState<Peran | null>(null)
  const [angkatanSaya, setAngkatanSaya] = useState<number | null>(null)

  // Satu form untuk dua aksi yang sama-sama wajib beralasan: menolak, dan
  // meminta data dilengkapi. Hanya satu yang boleh terbuka sekaligus.
  const [formId, setFormId] = useState<string | null>(null)
  const [formJenis, setFormJenis] = useState<'tolak' | 'minta'>('tolak')
  const [alasan, setAlasan] = useState('')

  // Lightbox bukti
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null)
  const [memuatBukti, setMemuatBukti] = useState<string | null>(null)

  function tampilkanPesan(text: string, ok: boolean) {
    setPesan({ text, ok })
    setTimeout(() => setPesan(null), 4000)
  }

  async function muat() {
    const { data, error } = await supabase
      .from('users')
      .select('id, nama, email, angkatan, avatar_url, status_alumni, is_institusi, bukti_alumni_url, catatan_pendaftar, alasan_tolak, catatan_admin, diminta_data_at, created_at, diverifikasi_at')
      .neq('status_alumni', 'umum')
      .order('created_at', { ascending: false })

    if (error) { tampilkanPesan('Gagal memuat pendaftar: ' + error.message, false); return }
    setPendaftar((data ?? []) as unknown as Pendaftar[])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth?redirect=/admin/verifikasi'); return }

      const { data: profile } = await supabase
        .from('users').select('role, angkatan').eq('id', user.id).single()

      // Admin angkatan ikut boleh masuk — batas angkatannya ditegakkan
      // verifikasi_alumni, dan daftarnya disaring di bawah
      if (!bolehVerifikasiAlumni(profile?.role)) { router.replace('/'); return }
      setAdminId(user.id)
      setPeranSaya((profile?.role ?? null) as Peran | null)
      setAngkatanSaya(profile?.angkatan ?? null)

      await muat()
      setReady(true)
    }
    init()
  }, [])

  async function putuskan(id: string, setujui: boolean, alasanTolak?: string) {
    setProsesId(id)
    try {
      const { data, error } = await supabase.rpc('verifikasi_alumni', {
        p_user_id: id,
        p_setujui: setujui,
        p_alasan: alasanTolak ?? null,
      })

      if (error) throw new Error(error.message)

      // verifikasi_alumni mengembalikan nilai status_alumni: 'alumni' | 'ditolak'
      const hasil = data as { nama: string | null; status: string } | null
      const statusBaru = hasil?.status ?? (setujui ? 'alumni' : 'ditolak')

      setPendaftar(prev => prev.map(p => p.id === id
        ? {
            ...p,
            status_alumni: statusBaru,
            alasan_tolak: setujui ? null : (alasanTolak ?? p.alasan_tolak),
            // verifikasi_alumni mengosongkan catatan_admin, jadi permintaan
            // data yang lama tidak boleh tertinggal di layar
            catatan_admin: null,
            diverifikasi_at: new Date().toISOString(),
          }
        : p))

      tampilkanPesan(
        `${hasil?.nama ?? 'Pendaftar'} ${setujui ? 'diverifikasi' : 'ditolak'}.`,
        true,
      )
      setFormId(null)
      setAlasan('')
    } catch (e) {
      tampilkanPesan('Gagal: ' + (e instanceof Error ? e.message : 'coba lagi'), false)
    } finally {
      setProsesId(null)
    }
  }

  // Menarik keputusan yang sudah dibuat dan mengembalikan pendaftar ke antrean
  // 'menunggu' dengan catatan apa yang perlu dilengkapi. Jalan tengah supaya
  // keraguan administratif kecil tidak lagi memaksa admin menolak orang.
  async function mintaDataUlang(id: string, catatan: string) {
    setProsesId(id)
    try {
      const { data, error } = await supabase.rpc('minta_data_ulang', {
        p_user_id: id,
        p_catatan: catatan,
      })
      if (error) throw new Error(error.message)

      const hasil = data as { nama: string | null } | null
      setPendaftar(prev => prev.map(p => p.id === id
        ? {
            ...p,
            status_alumni: 'menunggu',
            catatan_admin: catatan,
            alasan_tolak: null,
            diverifikasi_at: null,
            diminta_data_at: new Date().toISOString(),
          }
        : p))

      tampilkanPesan(`Permintaan data terkirim ke ${hasil?.nama ?? 'pendaftar'}.`, true)
      setFormId(null)
      setAlasan('')
      setTab('menunggu')
    } catch (e) {
      tampilkanPesan('Gagal: ' + (e instanceof Error ? e.message : 'coba lagi'), false)
    } finally {
      setProsesId(null)
    }
  }

  function kirimForm(id: string) {
    const teks = alasan.trim()
    if (!teks) {
      tampilkanPesan(
        formJenis === 'tolak' ? 'Alasan penolakan wajib diisi' : 'Tulis dulu data apa yang perlu dilengkapi',
        false,
      )
      return
    }
    if (formJenis === 'tolak') putuskan(id, false, teks)
    else mintaDataUlang(id, teks)
  }

  function bukaForm(id: string, jenis: 'tolak' | 'minta') {
    setFormId(id)
    setFormJenis(jenis)
    setAlasan('')
  }

  async function bukaBukti(p: Pendaftar) {
    setMemuatBukti(p.id)
    const url = await urlBukti(p.bukti_alumni_url)
    setMemuatBukti(null)
    if (!url) { tampilkanPesan('Bukti tidak bisa dibuka. File mungkin sudah dihapus.', false); return }
    setBuktiUrl(url)
  }

  // Admin angkatan hanya mengurus angkatannya sendiri. Penyaringan di sini
  // BUKAN pengaman — verifikasi_alumni yang menegakkannya, dan RLS `users`
  // yang seharusnya membatasi barisnya. Ini hanya supaya daftarnya masuk akal.
  const seangkatan = adminPenuh(peranSaya)
    ? pendaftar
    : pendaftar.filter(p => p.angkatan === angkatanSaya)

  const terlihat = seangkatan.filter(p => p.status_alumni === tab)
  function jumlah(t: Tab) { return seangkatan.filter(p => p.status_alumni === t).length }

  if (tampilSkeleton) return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>
        <Skeleton tinggi={18} lebar="45%" style={{ marginBottom: '6px' }} />
        <Skeleton tinggi={11} lebar="70%" style={{ marginBottom: '18px' }} />
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
          {[0, 1, 2].map(i => <Skeleton key={i} tinggi={34} radius={8} style={{ flex: 1 }} />)}
        </div>
        <SkeletonPanel baris={2} />
        <SkeletonPanel baris={2} />
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      {/* Lightbox bukti */}
      {buktiUrl && (
        <div
          onClick={() => setBuktiUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', cursor: 'zoom-out' }}
        >
          <img src={buktiUrl} alt="Bukti alumni" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          <button
            onClick={() => setBuktiUrl(null)}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer' }}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Verifikasi Alumni</h1>
          <Link href="/admin" style={{ fontSize: '12px', color: '#0C447C', textDecoration: 'none' }}>← Panel Admin</Link>
        </div>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '16px' }}>
          Unggah bukti sedang dimatikan — periksa nama, angkatan, dan catatan pendaftar
          sebelum menyetujui. Yang tampil di sini hanya yang mengaku alumni; pembeli
          biasa tidak diperiksa. Untuk izin berjualan, lihat <Link href="/admin/penjual" style={{ color: '#0C447C' }}>Pengajuan Penjual</Link>.
        </div>

        {/* Batas kuasanya disebut terang-terangan, supaya admin angkatan tidak
            mengira daftarnya sedang bermasalah saat isinya sedikit */}
        {!adminPenuh(peranSaya) && (
          <div style={{ background: '#E6F1FB', border: '0.5px solid #b3d1ee', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#0C447C', marginBottom: '12px', lineHeight: '1.7' }}>
            Kamu <strong>admin angkatan {angkatanSaya ?? '—'}</strong>. Yang bisa kamu
            verifikasi hanya pendaftar angkatan yang sama.
          </div>
        )}

        {pesan && (
          <div style={{ background: pesan.ok ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesan.ok ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesan.ok ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
            {pesan.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
          {TABS.map(t => {
            const aktif = tab === t
            return (
              <button
                key={t}
                onClick={() => { setTab(t); setFormId(null); setAlasan('') }}
                style={{
                  flex: 1, padding: '9px 6px', borderRadius: '8px',
                  border: aktif ? 'none' : '0.5px solid #c5d9ef',
                  background: aktif ? '#0C447C' : '#fff',
                  color: aktif ? '#fff' : '#5a7da0',
                  fontSize: '12px', fontWeight: aktif ? '600' : '400', cursor: 'pointer',
                }}
              >
                {LABEL_TAB[t]} ({jumlah(t)})
              </button>
            )
          })}
        </div>

        {terlihat.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 20px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>
              {tab === 'menunggu' ? '✅' : '📭'}
            </div>
            <div style={{ fontSize: '13px', color: '#5a7da0' }}>
              {tab === 'menunggu' ? 'Tidak ada yang menunggu verifikasi' : `Belum ada pendaftar ${LABEL_TAB[tab].toLowerCase()}`}
            </div>
          </div>
        ) : terlihat.map(p => {
          const sedangProses = prosesId === p.id
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #c5d9ef', marginBottom: '10px', overflow: 'hidden' }}>

              {/* Identitas */}
              <div style={{ padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Avatar nama={p.nama} url={p.avatar_url} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nama || 'Tanpa nama'}
                  </div>
                  {/* Akun institusi mewakili lembaga atau toko resmi, bukan
                      perorangan — kriteria alumni tidak berlaku untuknya, dan
                      angkatannya memang tidak ada artinya. Karena itu lencana
                      menggantikan baris angkatan, bukan menemaninya. */}
                  {p.is_institusi ? (
                    <div style={{ marginTop: '2px' }}>
                      <span style={{
                        display: 'inline-block',
                        background: 'rgba(239,159,39,0.16)',
                        border: '0.5px solid #EF9F27',
                        color: '#8a5a05',
                        fontSize: '10px', fontWeight: '700', letterSpacing: '0.3px',
                        padding: '2px 8px', borderRadius: '20px', lineHeight: 1.5,
                      }}>
                        🏛️ Akun Institusi
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#5a7da0' }}>
                      {p.angkatan ? `Angkatan ${p.angkatan}` : 'Angkatan belum diisi'}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#5a7da0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.email ?? '-'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '2px' }}>
                    Daftar {fmtTgl(p.created_at)}
                    {p.diverifikasi_at && ` · diputuskan ${fmtTgl(p.diverifikasi_at)}`}
                  </div>
                </div>
              </div>

              {/* Catatan pendaftar */}
              {p.catatan_pendaftar && (
                <div style={{ margin: '0 14px 12px', background: '#f0f5fb', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: '#5a7da0', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Catatan pendaftar
                  </div>
                  <div style={{ fontSize: '12px', color: '#1a1a1a', whiteSpace: 'pre-line' }}>
                    {p.catatan_pendaftar}
                  </div>
                </div>
              )}

              {/* Bukti alumni — hanya untuk data lama.
                  Unggah bukti sudah dimatikan, jadi TIDAK ADA peringatan
                  "belum mengunggah": peringatan itu akan menyala untuk hampir
                  semua orang dan cepat diabaikan, termasuk nanti saat ada
                  peringatan yang benar-benar penting. Tautannya tetap
                  ditampilkan kalau berkasnya memang ada. */}
              {p.bukti_alumni_url && (
                <div style={{ margin: '0 14px 12px' }}>
                  <button
                    onClick={() => bukaBukti(p)}
                    disabled={memuatBukti === p.id}
                    style={{ width: '100%', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #c5d9ef', padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                  >
                    {memuatBukti === p.id ? 'Membuka...' : '🖼️ Lihat Bukti Alumni'}
                  </button>
                </div>
              )}

              {/* Data yang sedang diminta admin — pendaftar melihat catatan
                  yang sama di halaman /verifikasi miliknya */}
              {p.catatan_admin && (
                <div style={{ margin: '0 14px 12px', background: '#E6F1FB', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: '#0C447C', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Diminta melengkapi{p.diminta_data_at ? ` · ${fmtTgl(p.diminta_data_at)}` : ''}
                  </div>
                  <div style={{ fontSize: '12px', color: '#0C447C', whiteSpace: 'pre-line' }}>{p.catatan_admin}</div>
                </div>
              )}

              {/* Alasan penolakan sebelumnya */}
              {p.status_alumni === 'ditolak' && p.alasan_tolak && (
                <div style={{ margin: '0 14px 12px', background: '#fce4e4', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: '#c62828', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Alasan ditolak
                  </div>
                  <div style={{ fontSize: '12px', color: '#c62828' }}>{p.alasan_tolak}</div>
                </div>
              )}

              {/* Aksi */}
              <div style={{ padding: '0 14px 14px' }}>
                {formId === p.id ? (
                  <div style={{ background: '#f0f5fb', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: formJenis === 'tolak' ? '#c62828' : '#0C447C' }}>
                      {formJenis === 'tolak' ? 'Alasan penolakan' : 'Data apa yang perlu dilengkapi?'}
                    </div>
                    <textarea
                      value={alasan}
                      onChange={e => setAlasan(e.target.value)}
                      rows={3}
                      placeholder={formJenis === 'tolak'
                        ? 'Misal: nama tidak cocok dengan data alumni'
                        : 'Misal: tulis nama wali kelas dan kelas terakhirmu supaya bisa kami cocokkan'}
                      style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #c5d9ef', borderRadius: '6px', fontSize: '12px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif', background: '#fff' }}
                    />
                    <div style={{ fontSize: '11px', color: '#5a7da0' }}>
                      {formJenis === 'tolak'
                        ? 'Alasan ini ditampilkan ke pendaftar supaya bisa mengirim ulang.'
                        : 'Catatan ini ditampilkan ke pendaftar, dan statusnya kembali ke Menunggu.'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setFormId(null); setAlasan('') }}
                        style={{ flex: 1, background: '#fff', color: '#5a7da0', border: '0.5px solid #c5d9ef', padding: '9px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => kirimForm(p.id)}
                        disabled={sedangProses}
                        style={{
                          flex: 2, color: '#fff', border: 'none', padding: '9px', borderRadius: '6px',
                          fontSize: '12px', fontWeight: '600',
                          background: sedangProses
                            ? (formJenis === 'tolak' ? '#e39c9c' : '#7fa8c9')
                            : (formJenis === 'tolak' ? '#c62828' : '#0C447C'),
                          cursor: sedangProses ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {sedangProses
                          ? 'Menyimpan...'
                          : formJenis === 'tolak' ? 'Kirim Penolakan' : 'Kirim Permintaan'}
                      </button>
                    </div>
                  </div>
                ) : p.id === adminId ? (
                  /* RPC-nya menolak semua aksi ke akun sendiri, jadi tombolnya
                     tidak usah ditawarkan sama sekali */
                  <div style={{ fontSize: '12px', color: '#9ab4cc', textAlign: 'center', padding: '6px' }}>
                    Ini akunmu sendiri.
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {p.status_alumni !== 'alumni' && (
                      <button
                        onClick={() => putuskan(p.id, true)}
                        disabled={sedangProses}
                        style={{ flex: 2, minWidth: '130px', background: sedangProses ? '#a5d6a7' : '#2e7d32', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                      >
                        {sedangProses ? 'Menyimpan...' : '✓ Verifikasi'}
                      </button>
                    )}
                    {p.status_alumni !== 'ditolak' && (
                      <button
                        onClick={() => bukaForm(p.id, 'tolak')}
                        disabled={sedangProses}
                        style={{ flex: 1, minWidth: '80px', background: '#fce4e4', color: '#c62828', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                      >
                        Tolak
                      </button>
                    )}
                    {/* Hanya untuk yang keputusannya sudah dibuat. Yang masih
                        'menunggu' ditolak RPC-nya ("memang sedang menunggu
                        diperiksa"), dan yang 'umum' tidak pernah sampai ke
                        halaman ini — keduanya tidak perlu ditawari tombol
                        yang sudah pasti gagal. */}
                    {/* minta_data_ulang menuntut is_admin(), yang tidak memuat
                        admin angkatan — tombolnya pasti gagal untuk mereka */}
                    {adminPenuh(peranSaya) && (p.status_alumni === 'alumni' || p.status_alumni === 'ditolak') && (
                      <button
                        onClick={() => bukaForm(p.id, 'minta')}
                        disabled={sedangProses}
                        style={{ flex: 1, minWidth: '150px', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #c5d9ef', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                      >
                        Minta Data Ulang
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
