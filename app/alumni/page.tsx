'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'

type Member = {
  id: string
  nama: string | null
  angkatan: number | null
  avatar_url: string | null
  jumlahProduk: number
}

type Group = {
  angkatan: number | null
  members: Member[]
}

function Avatar({ member, size = 56 }: { member: Member; size?: number }) {
  const initials = member.nama
    ? member.nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      overflow: 'hidden', background: 'linear-gradient(135deg, #185FA5, #0C447C)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid #e8f0f8', flexShrink: 0, margin: '0 auto',
    }}>
      {member.avatar_url ? (
        <img src={member.avatar_url} alt={member.nama ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: `${Math.round(size * 0.38)}px`, fontWeight: '700', color: '#fff', lineHeight: 1 }}>
          {initials}
        </span>
      )}
    </div>
  )
}

export default function AlumniPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const [usersRes, tokoRes, produkRes] = await Promise.all([
        supabase.from('users').select('id, nama, angkatan, avatar_url'),
        supabase.from('toko').select('id, seller_id'),
        supabase.from('produk').select('toko_id'),
      ])

      const users = usersRes.data ?? []
      const tokoList = tokoRes.data ?? []
      const produkList = produkRes.data ?? []

      // Build toko_id → seller_id map, then count produk per seller
      const tokoToSeller: Record<string, string> = {}
      for (const t of tokoList) tokoToSeller[t.id] = t.seller_id

      const produkBySeller: Record<string, number> = {}
      for (const p of produkList) {
        const sid = tokoToSeller[p.toko_id]
        if (sid) produkBySeller[sid] = (produkBySeller[sid] ?? 0) + 1
      }

      // Group by angkatan
      const map: Record<string, Member[]> = {}
      for (const u of users) {
        const key = String(u.angkatan ?? 0)
        if (!map[key]) map[key] = []
        map[key].push({ ...u, jumlahProduk: produkBySeller[u.id] ?? 0 })
      }

      // Sort angkatan descending; 0 (belum isi) goes last
      const sorted = Object.keys(map)
        .map(Number)
        .sort((a, b) => {
          if (a === 0) return 1
          if (b === 0) return -1
          return b - a
        })
        .map(k => ({
          angkatan: k === 0 ? null : k,
          members: map[String(k)].sort((a, b) => (a.nama ?? '').localeCompare(b.nama ?? 'z')),
        }))

      setGroups(sorted)
      setTotal(users.length)
      setLoading(false)
    }
    load()
  }, [])

  const query = search.trim().toLowerCase()
  const filtered: Group[] = query
    ? groups.map(g => ({
        ...g,
        members: g.members.filter(m =>
          (m.nama ?? '').toLowerCase().includes(query) ||
          String(m.angkatan ?? '').includes(query)
        ),
      })).filter(g => g.members.length > 0)
    : groups

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      {/* Header */}
      <div style={{
        background: 'linear-gradient(150deg, #0d4f91 0%, #0C447C 45%, #082e57 100%)',
        padding: '28px 20px 24px',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', color: '#7eb8f0', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: '4px' }}>
            Komunitas
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: '0 0 6px' }}>
            Alumni Superfive
          </h1>
          <div style={{ fontSize: '13px', color: '#B5D4F4', marginBottom: '18px' }}>
            {loading ? 'Memuat...' : `${total} alumni terdaftar`}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau angkatan..."
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                borderRadius: '9px', border: 'none', fontSize: '13px',
                outline: 'none', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.15)', color: '#fff',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px 16px 40px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5a7da0' }}>
            Memuat data alumni...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎓</div>
            <div style={{ fontSize: '14px', color: '#5a7da0' }}>Tidak ada alumni ditemukan</div>
          </div>
        ) : (
          filtered.map(g => (
            <div key={g.angkatan ?? 'unknown'} style={{ marginBottom: '24px' }}>
              {/* Angkatan header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px',
              }}>
                <div style={{
                  background: '#0C447C', color: '#fff', fontSize: '12px', fontWeight: '700',
                  padding: '4px 12px', borderRadius: '20px',
                }}>
                  {g.angkatan ? `Angkatan ${g.angkatan}` : 'Angkatan belum diisi'}
                </div>
                <div style={{ fontSize: '11px', color: '#5a7da0' }}>
                  {g.members.length} alumni
                </div>
                <div style={{ flex: 1, height: '1px', background: '#dde8f4' }} />
              </div>

              {/* Member grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '10px',
              }}>
                {g.members.map(m => (
                  <div key={m.id} style={{
                    background: '#fff', borderRadius: '12px',
                    border: '0.5px solid #e8f0f8', padding: '16px 12px',
                    textAlign: 'center',
                  }}>
                    <Avatar member={m} size={52} />
                    <div style={{
                      fontSize: '13px', fontWeight: '600', color: '#1a1a1a',
                      marginTop: '10px', marginBottom: '3px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {m.nama || 'Alumni'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '8px' }}>
                      {m.angkatan ? `Angkatan ${m.angkatan}` : '—'}
                    </div>
                    {m.jumlahProduk > 0 ? (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        background: '#E6F1FB', color: '#0C447C',
                        fontSize: '11px', fontWeight: '600',
                        padding: '3px 10px', borderRadius: '20px',
                      }}>
                        📦 {m.jumlahProduk} produk
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-block',
                        background: '#f4f7fb', color: '#9ab4cc',
                        fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                      }}>
                        Belum berjualan
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
