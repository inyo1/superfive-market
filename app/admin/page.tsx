'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'
import DialogKonfirmasi from '../components/DialogKonfirmasi'

type Konfirmasi = { jenis: 'produk' | 'toko'; id: string; nama: string }

type UserRow = {
  id: string
  nama: string | null
  email: string
  angkatan: number | null
  role: string
  avatar_url: string | null
  nonaktif_at: string | null
  alasan_nonaktif: string | null
}

/** Dua aksi yang sengaja TIDAK digabung. Nonaktifkan menyembunyikan toko dan
 *  produknya tapi riwayatnya utuh dan bisa dibatalkan; Hapus membuang profilnya
 *  selamanya dan hanya boleh untuk akun yang belum meninggalkan jejak. */
type AksiUser = { jenis: 'nonaktif' | 'hapus'; u: UserRow }
type ProdukRow = {
  id: string
  nama: string
  harga: number
  kategori: string
  terjual: number
  created_at: string
  toko: { nama_toko: string } | null
}
type TokoRow = {
  id: string
  nama_toko: string
  kategori: string
  users: { nama: string | null; email: string } | null
}

function fmt(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }
function fmtTgl(s: string) { return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default function AdminPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [tab, setTab] = useState<'users' | 'produk' | 'toko'>('users')

  const [users, setUsers] = useState<UserRow[]>([])
  const [produk, setProduk] = useState<ProdukRow[]>([])
  const [toko, setToko] = useState<TokoRow[]>([])

  const [pesan, setPesan] = useState<{ text: string; ok: boolean } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [konfirmasi, setKonfirmasi] = useState<Konfirmasi | null>(null)

  // Modal aksi pengguna. `errAksi` sengaja tinggal di dalam modal, bukan jadi
  // toast: kalau Hapus ditolak karena akunnya punya jejak, adminnya harus bisa
  // langsung berpindah ke Nonaktifkan tanpa mengulang dari awal.
  const [aksi, setAksi] = useState<AksiUser | null>(null)
  const [alasan, setAlasan] = useState('')
  const [errAksi, setErrAksi] = useState<string | null>(null)

  function bukaAksi(jenis: AksiUser['jenis'], u: UserRow) {
    setAksi({ jenis, u })
    setAlasan('')
    setErrAksi(null)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data: profile } = await supabase
        .from('users').select('role').eq('id', user.id).single()

      if (!profile || profile.role !== 'admin') { router.push('/'); return }
      setAdminId(user.id)

      await Promise.all([loadUsers(), loadProduk(), loadToko()])
      setReady(true)
    }
    init()
  }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('users')
      .select('id, nama, email, angkatan, role, avatar_url, nonaktif_at, alasan_nonaktif')
      .order('email')
    if (data) setUsers(data as unknown as UserRow[])
  }

  async function loadProduk() {
    const { data } = await supabase
      .from('produk')
      .select('id, nama, harga, kategori, terjual, created_at, toko(nama_toko)')
      .order('created_at', { ascending: false })
    if (data) setProduk(data as any)
  }

  async function loadToko() {
    const { data } = await supabase
      .from('toko')
      .select('id, nama_toko, kategori, users(nama, email)')
      .order('nama_toko')
    if (data) setToko(data as any)
  }

  function showPesan(text: string, ok: boolean) {
    setPesan({ text, ok })
    setTimeout(() => setPesan(null), 3000)
  }

  // Peran HANYA lewat ubah_peran. UPDATE langsung ke users.role sempat jalan
  // karena jaga_field_sensitif melewatkan siapa pun yang is_admin() — artinya
  // tidak ada satu pun aturan yang menahannya. Akibatnya sudah terjadi: satu
  // admin turun jadi member dan Superfive nyaris kehabisan admin.
  async function toggleRole(u: UserRow) {
    if (busyId) return
    const peranBaru = u.role === 'admin' ? 'member' : 'admin'
    setBusyId(u.id)
    try {
      const { error } = await supabase.rpc('ubah_peran', {
        p_user_id: u.id,
        p_peran: peranBaru,
      })
      // Menurunkan diri sendiri dan menurunkan admin aktif terakhir ditolak
      // di dalam RPC. Pesannya sudah berbahasa Indonesia — tampilkan apa adanya.
      if (error) throw new Error(error.message)

      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: peranBaru } : x))
      showPesan(`${u.email} → ${peranBaru}`, true)
    } catch (e) {
      showPesan(e instanceof Error ? e.message : 'Gagal mengubah peran', false)
    } finally {
      setBusyId(null)
    }
  }

  async function nonaktifkanUser(u: UserRow) {
    if (!alasan.trim()) { setErrAksi('Alasan wajib diisi.'); return }
    setBusyId(u.id)
    setErrAksi(null)
    try {
      const { error } = await supabase.rpc('nonaktifkan_user', {
        p_user_id: u.id,
        p_alasan: alasan.trim(),
      })
      if (error) throw new Error(error.message)

      setUsers(prev => prev.map(x => x.id === u.id
        ? { ...x, nonaktif_at: new Date().toISOString(), alasan_nonaktif: alasan.trim() }
        : x))
      showPesan(`${u.email} dinonaktifkan. Toko dan produknya turun dari Superfive.`, true)
      setAksi(null)
    } catch (e) {
      setErrAksi(e instanceof Error ? e.message : 'Gagal menonaktifkan')
    } finally {
      setBusyId(null)
    }
  }

  async function aktifkanUser(u: UserRow) {
    setBusyId(u.id)
    try {
      const { error } = await supabase.rpc('aktifkan_user', { p_user_id: u.id })
      if (error) throw new Error(error.message)

      setUsers(prev => prev.map(x => x.id === u.id
        ? { ...x, nonaktif_at: null, alasan_nonaktif: null }
        : x))
      showPesan(`${u.email} diaktifkan kembali.`, true)
    } catch (e) {
      showPesan(e instanceof Error ? e.message : 'Gagal mengaktifkan', false)
    } finally {
      setBusyId(null)
    }
  }

  async function hapusUser(u: UserRow) {
    setBusyId(u.id)
    setErrAksi(null)
    try {
      const { error } = await supabase.rpc('hapus_user', { p_user_id: u.id })
      if (error) throw new Error(error.message)

      setUsers(prev => prev.filter(x => x.id !== u.id))
      showPesan(`Profil ${u.email} dihapus permanen. Akun loginnya belum — hapus terpisah di Supabase Dashboard.`, true)
      setAksi(null)
    } catch (e) {
      // Ditolak karena akunnya punya jejak. Dialognya sengaja TIDAK ditutup:
      // pesannya tampil di tempat, beserta jalan keluar Nonaktifkan.
      setErrAksi(e instanceof Error ? e.message : 'Gagal menghapus')
    } finally {
      setBusyId(null)
    }
  }

  async function hapusProduk(id: string) {
    setBusyId(id)
    const { error } = await supabase.from('produk').delete().eq('id', id)
    if (error) {
      showPesan('Gagal hapus: ' + error.message, false)
    } else {
      setProduk(prev => prev.filter(p => p.id !== id))
      showPesan('Produk dihapus', true)
    }
    setBusyId(null)
    setKonfirmasi(null)
  }

  async function hapusToko(id: string) {
    setBusyId(id)
    // delete products first
    await supabase.from('produk').delete().eq('toko_id', id)
    const { error } = await supabase.from('toko').delete().eq('id', id)
    if (error) {
      showPesan('Gagal hapus: ' + error.message, false)
    } else {
      setToko(prev => prev.filter(t => t.id !== id))
      await loadProduk()
      showPesan('Toko dihapus', true)
    }
    setBusyId(null)
    setKonfirmasi(null)
  }

  if (!ready) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5a7da0' }}>
          Memverifikasi akses...
        </div>
      </main>
    )
  }

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: 'users', label: '👤 Users', count: users.length },
    { key: 'produk', label: '📦 Produk', count: produk.length },
    { key: 'toko', label: '🏪 Toko', count: toko.length },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <DialogKonfirmasi
        terbuka={!!konfirmasi}
        judul={konfirmasi?.jenis === 'toko' ? 'Hapus toko ini?' : 'Hapus produk ini?'}
        pesan={konfirmasi?.jenis === 'toko'
          ? `"${konfirmasi?.nama}" akan dihapus beserta SEMUA produk di dalamnya. Tindakan ini tidak bisa dibatalkan.`
          : `"${konfirmasi?.nama}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`}
        ikon={konfirmasi?.jenis === 'toko' ? '🏪' : '🗑️'}
        memproses={!!konfirmasi && busyId === konfirmasi.id}
        onBatal={() => setKonfirmasi(null)}
        onKonfirmasi={() => {
          if (!konfirmasi) return
          if (konfirmasi.jenis === 'toko') hapusToko(konfirmasi.id)
          else hapusProduk(konfirmasi.id)
        }}
      />

      {/* Modal aksi pengguna — Nonaktifkan butuh isian alasan, jadi tidak bisa
          memakai DialogKonfirmasi yang hanya menerima teks */}
      {aksi && (
        <div
          onClick={busyId ? undefined : () => setAksi(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          role="dialog" aria-modal="true"
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '14px', padding: '22px 20px', width: '100%', maxWidth: '400px' }}
          >
            <div style={{ fontSize: '34px', textAlign: 'center', marginBottom: '10px' }}>
              {aksi.jenis === 'hapus' ? '🗑️' : '🚫'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '6px' }}>
              {aksi.jenis === 'hapus' ? 'Hapus profil ini selamanya?' : 'Nonaktifkan akun ini?'}
            </div>

            {/* Konfirmasi hapus wajib menyebut siapa yang dihapus — nama saja
                tidak cukup, dua orang bisa punya nama yang sama */}
            <div style={{ background: '#f0f5fb', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>
                {aksi.u.nama || '(belum isi nama)'}
              </div>
              <div style={{ fontSize: '11px', color: '#5a7da0', wordBreak: 'break-all' }}>{aksi.u.email}</div>
            </div>

            {aksi.jenis === 'hapus' ? (
              <>
                <div style={{ fontSize: '12px', color: '#5a7da0', lineHeight: '1.7', marginBottom: '10px' }}>
                  Profilnya <strong style={{ color: '#c62828' }}>dihapus selamanya</strong> dan
                  tidak bisa dikembalikan. Hanya bisa untuk akun yang belum punya toko,
                  pesanan, ulasan, atau chat.
                </div>
                <div style={{ background: '#fff8e1', border: '0.5px solid #ffe082', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: '#8d6e26', lineHeight: '1.7', marginBottom: '12px' }}>
                  <strong>Akun loginnya TIDAK ikut terhapus.</strong> Orangnya masih bisa
                  masuk dan akan membuat profil baru. Hapus terpisah lewat Supabase
                  Dashboard → Authentication → Users.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '12px', color: '#5a7da0', lineHeight: '1.7', marginBottom: '10px' }}>
                  Toko dan produknya hilang dari Superfive, tapi riwayatnya tetap utuh
                  dan akun ini bisa diaktifkan lagi kapan saja.
                </div>
                <label htmlFor="alasan-nonaktif" style={{ fontSize: '12px', fontWeight: '600', color: '#0C447C', display: 'block', marginBottom: '4px' }}>
                  Alasan *
                </label>
                <textarea
                  id="alasan-nonaktif"
                  value={alasan}
                  onChange={e => setAlasan(e.target.value)}
                  rows={3}
                  placeholder="Misal: berulang kali tidak mengirim pesanan"
                  style={{ width: '100%', padding: '9px 11px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '12px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif', marginBottom: '12px' }}
                />
              </>
            )}

            {errAksi && (
              <div style={{ background: '#fce4e4', border: '0.5px solid #f09595', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#c62828', lineHeight: '1.6' }}>{errAksi}</div>
                {/* Jangan biarkan admin buntu: kalau hapus ditolak, jalan
                    keluarnya ditawarkan langsung di dialog yang sama */}
                {aksi.jenis === 'hapus' && (
                  <button
                    onClick={() => bukaAksi('nonaktif', aksi.u)}
                    style={{ marginTop: '8px', background: '#fff', color: '#0C447C', border: '1px solid #0C447C', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', minHeight: '38px' }}
                  >
                    Nonaktifkan saja →
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setAksi(null)}
                disabled={!!busyId}
                style={{ flex: 1, background: '#f0f5fb', color: '#5a7da0', border: 'none', padding: '12px', borderRadius: '9px', fontSize: '13px', minHeight: '44px', cursor: busyId ? 'not-allowed' : 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={() => aksi.jenis === 'hapus' ? hapusUser(aksi.u) : nonaktifkanUser(aksi.u)}
                disabled={!!busyId}
                style={{
                  flex: 1, background: busyId ? '#b0b0b0' : aksi.jenis === 'hapus' ? '#c62828' : '#e65100',
                  color: '#fff', border: 'none', padding: '12px', borderRadius: '9px',
                  fontSize: '13px', fontWeight: '600', minHeight: '44px',
                  cursor: busyId ? 'not-allowed' : 'pointer',
                }}
              >
                {busyId ? 'Memproses...' : aksi.jenis === 'hapus' ? 'Hapus Permanen' : 'Nonaktifkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0C447C, #185FA5)',
        padding: '20px 16px 16px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', color: '#7eb8f0', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
            Panel Admin
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '0 0 12px' }}>
            Superfive Market
          </h1>

          {/* Dua antrean keputusan, dua halaman terpisah — siapa alumni dan
              siapa boleh berjualan bukan pertanyaan yang sama */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {[
              { href: '/admin/verifikasi', label: '🎓 Verifikasi Alumni' },
              { href: '/admin/penjual', label: '💼 Pengajuan Penjual' },
            ].map(m => (
              <Link
                key={m.href}
                href={m.href}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                  padding: '0 14px', minHeight: '38px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: '600', textDecoration: 'none',
                }}
              >
                {m.label}
              </Link>
            ))}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'Total User', value: users.length },
              { label: 'Total Produk', value: produk.length },
              { label: 'Total Toko', value: toko.length },
              { label: 'Admin', value: users.filter(u => u.role === 'admin').length },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: '10px',
                padding: '10px 6px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: '#B5D4F4', marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>

        {/* Toast */}
        {pesan && (
          <div style={{
            background: pesan.ok ? '#e8f5e9' : '#fce4e4',
            border: `0.5px solid ${pesan.ok ? '#a5d6a7' : '#f09595'}`,
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '13px', color: pesan.ok ? '#2e7d32' : '#c62828',
            marginBottom: '12px',
          }}>
            {pesan.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: '600',
                background: tab === t.key ? '#0C447C' : '#fff',
                color: tab === t.key ? '#fff' : '#5a7da0',
                border: tab === t.key ? 'none' : '0.5px solid #c5d9ef',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {t.label}
              <span style={{
                background: tab === t.key ? 'rgba(255,255,255,0.25)' : '#E6F1FB',
                color: tab === t.key ? '#fff' : '#0C447C',
                borderRadius: '10px', padding: '1px 7px', fontSize: '11px',
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {users.map(u => {
              const initials = u.nama
                ? u.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                : u.email.charAt(0).toUpperCase()
              return (
                <div key={u.id} style={{
                  background: '#fff', borderRadius: '12px',
                  border: '0.5px solid #e8f0f8', padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    overflow: 'hidden', background: 'linear-gradient(135deg, #185FA5, #0C447C)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} alt="" width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{initials}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.nama || '(belum isi nama)'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5a7da0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </div>
                    {u.angkatan && (
                      <div style={{ fontSize: '10px', color: '#9ab4cc', marginTop: '1px' }}>
                        Angkatan {u.angkatan}
                      </div>
                    )}
                    {u.nonaktif_at && (
                      <div style={{ fontSize: '10px', color: '#c62828', marginTop: '3px' }}>
                        🚫 Nonaktif{u.alasan_nonaktif ? ` — ${u.alasan_nonaktif}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Role badge + toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px',
                      background: u.role === 'admin' ? '#fff3e0' : '#f0f5fb',
                      color: u.role === 'admin' ? '#e65100' : '#5a7da0',
                      border: `0.5px solid ${u.role === 'admin' ? '#ffcc80' : '#c5d9ef'}`,
                    }}>
                      {u.role === 'admin' ? '⭐ Admin' : 'Member'}
                    </span>
                    {/* Menurunkan diri sendiri ditolak database, jadi tombolnya
                        tidak perlu ada — yang pasti gagal cuma jadi jebakan */}
                    {u.id === adminId && u.role === 'admin' ? (
                      <span style={{ fontSize: '10px', color: '#9ab4cc' }}>akun kamu</span>
                    ) : (
                      <button
                        onClick={() => toggleRole(u)}
                        disabled={busyId === u.id}
                        style={{
                          fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                          border: '0.5px solid',
                          borderColor: u.role === 'admin' ? '#f09595' : '#a5d6a7',
                          background: u.role === 'admin' ? '#fce4e4' : '#e8f5e9',
                          color: u.role === 'admin' ? '#c62828' : '#2e7d32',
                          opacity: busyId === u.id ? 0.5 : 1,
                        }}
                      >
                        {u.role === 'admin' ? '↓ Jadikan Member' : '↑ Jadikan Admin'}
                      </button>
                    )}

                    {/* Dua aksi berbeda, sengaja tidak digabung: yang satu bisa
                        dibatalkan, yang satu selamanya. Keduanya tidak
                        ditawarkan untuk akun sendiri — RPC-nya menolak. */}
                    {u.id !== adminId && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {u.nonaktif_at ? (
                          <button
                            onClick={() => aktifkanUser(u)}
                            disabled={busyId === u.id}
                            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', border: '0.5px solid #a5d6a7', background: '#e8f5e9', color: '#2e7d32', opacity: busyId === u.id ? 0.5 : 1 }}
                          >
                            Aktifkan
                          </button>
                        ) : (
                          <button
                            onClick={() => bukaAksi('nonaktif', u)}
                            disabled={busyId === u.id}
                            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', border: '0.5px solid #ffcc80', background: '#fff3e0', color: '#e65100', opacity: busyId === u.id ? 0.5 : 1 }}
                          >
                            Nonaktifkan
                          </button>
                        )}
                        <button
                          onClick={() => bukaAksi('hapus', u)}
                          disabled={busyId === u.id}
                          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', border: '0.5px solid #f09595', background: '#fce4e4', color: '#c62828', opacity: busyId === u.id ? 0.5 : 1 }}
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── PRODUK TAB ── */}
        {tab === 'produk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {produk.map(p => (
              <div key={p.id} style={{
                background: '#fff', borderRadius: '12px',
                border: '0.5px solid #e8f0f8', padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{ flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
                  <FotoProduk src={null} kategori={p.kategori} height={48} fontSize={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                    {p.nama}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0C447C', marginBottom: '2px' }}>
                    {fmt(p.harga)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5a7da0' }}>
                    {(p.toko as any)?.nama_toko ?? '—'} · {fmtTgl(p.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '10px', background: '#E6F1FB', color: '#0C447C',
                    padding: '2px 8px', borderRadius: '20px',
                  }}>
                    {p.kategori}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link
                      href={`/produk/${p.id}`}
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #c5d9ef' }}
                    >
                      Lihat
                    </Link>
                    <button
                      onClick={() => setKonfirmasi({ jenis: 'produk', id: p.id, nama: p.nama })}
                      disabled={busyId === p.id}
                      style={{
                        fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                        background: '#fce4e4', color: '#c62828', border: '0.5px solid #f09595',
                        opacity: busyId === p.id ? 0.5 : 1,
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {produk.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#5a7da0', fontSize: '14px' }}>
                Belum ada produk
              </div>
            )}
          </div>
        )}

        {/* ── TOKO TAB ── */}
        {tab === 'toko' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {toko.map(t => {
              const owner = t.users as any
              return (
                <div key={t.id} style={{
                  background: '#fff', borderRadius: '12px',
                  border: '0.5px solid #e8f0f8', padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #0C447C, #185FA5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                  }}>
                    {{ Teknologi: '💻', Fashion: '👗', Kuliner: '🍱', Properti: '🏠', Jasa: '🛠️', UMKM: '🏪' }[t.kategori] ?? '🏪'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                      {t.nama_toko}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5a7da0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {owner?.nama || owner?.email || '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ab4cc' }}>{owner?.email}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', background: '#E6F1FB', color: '#0C447C', padding: '2px 8px', borderRadius: '20px' }}>
                      {t.kategori}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Link
                        href={`/toko/${t.id}`}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #c5d9ef' }}
                      >
                        Lihat
                      </Link>
                      <button
                        onClick={() => setKonfirmasi({ jenis: 'toko', id: t.id, nama: t.nama_toko })}
                        disabled={busyId === t.id}
                        style={{
                          fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                          background: '#fce4e4', color: '#c62828', border: '0.5px solid #f09595',
                          opacity: busyId === t.id ? 0.5 : 1,
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {toko.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#5a7da0', fontSize: '14px' }}>
                Belum ada toko
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
