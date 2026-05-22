'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'

type UserRow = {
  id: string
  nama: string | null
  email: string
  angkatan: number | null
  role: string
  avatar_url: string | null
}
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
  const [tab, setTab] = useState<'users' | 'produk' | 'toko'>('users')

  const [users, setUsers] = useState<UserRow[]>([])
  const [produk, setProduk] = useState<ProdukRow[]>([])
  const [toko, setToko] = useState<TokoRow[]>([])

  const [pesan, setPesan] = useState<{ text: string; ok: boolean } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data: profile } = await supabase
        .from('users').select('role').eq('id', user.id).single()

      if (!profile || profile.role !== 'admin') { router.push('/'); return }

      await Promise.all([loadUsers(), loadProduk(), loadToko()])
      setReady(true)
    }
    init()
  }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('users')
      .select('id, nama, email, angkatan, role, avatar_url')
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

  async function toggleRole(u: UserRow) {
    if (busyId) return
    const newRole = u.role === 'admin' ? 'member' : 'admin'
    setBusyId(u.id)
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', u.id)
    if (error) {
      showPesan('Gagal ubah role: ' + error.message, false)
    } else {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
      showPesan(`${u.email} → ${newRole}`, true)
    }
    setBusyId(null)
  }

  async function hapusProduk(id: string, nama: string) {
    if (!confirm(`Hapus produk "${nama}"?`)) return
    setBusyId(id)
    const { error } = await supabase.from('produk').delete().eq('id', id)
    if (error) {
      showPesan('Gagal hapus: ' + error.message, false)
    } else {
      setProduk(prev => prev.filter(p => p.id !== id))
      showPesan('Produk dihapus', true)
    }
    setBusyId(null)
  }

  async function hapusToko(id: string, nama: string) {
    if (!confirm(`Hapus toko "${nama}"? Semua produk toko ini ikut terhapus.`)) return
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

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0C447C, #185FA5)',
        padding: '20px 16px 16px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', color: '#7eb8f0', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
            Panel Admin
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '0 0 16px' }}>
            Superfive Market
          </h1>

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
                      <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <a
                      href={`/produk/${p.id}`}
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #c5d9ef' }}
                    >
                      Lihat
                    </a>
                    <button
                      onClick={() => hapusProduk(p.id, p.nama)}
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
                      <a
                        href={`/toko/${t.id}`}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #c5d9ef' }}
                      >
                        Lihat
                      </a>
                      <button
                        onClick={() => hapusToko(t.id, t.nama_toko)}
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
