'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import BadgeVerifikasi from '../components/BadgeVerifikasi'
import Skeleton, { GridSkeletonAlumni } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import BadgeAngkatan from '../components/BadgeAngkatan'
import { useTampilSkeleton } from '../hooks/useSkeleton'

// Direktori alumni — DUA TINGKAT.
//
// Belum login → `angkatan_ringkas`: jumlah alumni per angkatan, TANPA nama.
// Sudah login → `alumni_publik`: daftar nama per angkatan.
//
// Bukan pilihan tampilan, melainkan grant di database: sejak peluncuran reuni
// `alumni_publik` hanya di-grant ke `authenticated`. Query anon ke sana GAGAL
// (permission denied), dan kegagalan itu harus berujung ke tampilan preview,
// bukan ke pesan error — pengunjung yang belum login bukan keadaan salah.
// Karena itu preview juga jadi jalan pulang kalau query nama gagal karena
// alasan apa pun.
//
// Label "Superfive 92" dibaca dari kolom `label_angkatan` di kedua view,
// tidak pernah dirangkai di sini.

type Member = {
  id: string
  nama: string | null
  angkatan: number | null
  label_angkatan: string | null
  avatar_url: string | null
  jumlahProduk: number
}

type Group = {
  angkatan: number | null
  label: string | null
  members: Member[]
}

/** Satu baris dari view angkatan_ringkas */
type Ringkas = {
  angkatan: number
  label_angkatan: string
  jumlah: number
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
        <Image src={member.avatar_url} alt={member.nama ?? ''} width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: `${Math.round(size * 0.38)}px`, fontWeight: '700', color: '#fff', lineHeight: 1 }}>
          {initials}
        </span>
      )}
    </div>
  )
}

export default function AlumniPage() {
  // null = belum tahu; 'preview' = belum login (atau nama gagal dimuat)
  const [mode, setMode] = useState<'preview' | 'lengkap' | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [ringkas, setRingkas] = useState<Ringkas[]>([])
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filterAngkatan, setFilterAngkatan] = useState<number | 'semua'>('semua')

  useEffect(() => {
    async function muatPreview() {
      const { data } = await supabase
        .from('angkatan_ringkas')
        .select('angkatan, label_angkatan, jumlah')
        .order('angkatan', { ascending: false })
      const baris = (data ?? []) as Ringkas[]
      setRingkas(baris)
      setTotal(baris.reduce((n, r) => n + (r.jumlah ?? 0), 0))
      setMode('preview')
      setLoading(false)
    }

    async function load() {
      // getSession: cukup untuk memilih tingkat, tanpa panggilan jaringan.
      // Pengunjung anon langsung ke preview — tidak ada gunanya mengirim
      // query yang pasti ditolak grant-nya.
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { await muatPreview(); return }

      const [usersRes, tokoRes, produkRes] = await Promise.all([
        // JANGAN menyaring lagi di sini. View-nya sudah menyaring sendiri:
        // status_alumni = 'alumni', angkatan terisi, akun nonaktif dan akun
        // institusi dikecualikan. Total dan pengelompokan angkatan otomatis
        // ikut bersih karena keduanya dihitung dari hasil query ini.
        supabase.from('alumni_publik')
          .select('id, nama, angkatan, label_angkatan, avatar_url'),
        supabase.from('toko').select('id, seller_id'),
        supabase.from('produk').select('toko_id'),
      ])

      // Sesi kedaluwarsa, atau grant-nya berubah — jatuh ke preview, bukan error
      if (usersRes.error) { await muatPreview(); return }

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

      // Terbaru di atas; 0 (belum isi) paling bawah
      const sorted = Object.keys(map)
        .map(Number)
        .sort((a, b) => {
          if (a === 0) return 1
          if (b === 0) return -1
          return b - a
        })
        .map(k => ({
          angkatan: k === 0 ? null : k,
          label: map[String(k)][0]?.label_angkatan ?? null,
          members: map[String(k)].sort((a, b) => (a.nama ?? '').localeCompare(b.nama ?? 'z')),
        }))

      setGroups(sorted)
      setTotal(users.length)
      setMode('lengkap')
      setLoading(false)
    }
    load()
  }, [])

  const query = search.trim().toLowerCase()

  // Daftar angkatan untuk chip filter, terbaru dulu
  const daftarAngkatan = groups.filter((g): g is Group & { angkatan: number } => g.angkatan !== null)

  const terfilterAngkatan: Group[] = filterAngkatan === 'semua'
    ? groups
    : groups.filter(g => g.angkatan === filterAngkatan)

  // Cocok dengan nama, tahun ("1992"), maupun label ("superfive 92")
  const filtered: Group[] = query
    ? terfilterAngkatan.map(g => ({
        ...g,
        members: g.members.filter(m =>
          (m.nama ?? '').toLowerCase().includes(query) ||
          String(m.angkatan ?? '').includes(query) ||
          (m.label_angkatan ?? '').toLowerCase().includes(query)
        ),
      })).filter(g => g.members.length > 0)
    : terfilterAngkatan

  const preview = mode === 'preview'

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
          <div style={{ fontSize: '13px', color: '#B5D4F4', marginBottom: preview ? 0 : '18px', minHeight: '18px' }}>
            {tampilSkeleton
              ? <span className="skeleton" style={{ display: 'inline-block', width: '130px', height: '12px', borderRadius: '6px', opacity: 0.35 }} />
              : `${total} alumni terdaftar`}
          </div>

          {/* Pencarian nama hanya bermakna kalau namanya terlihat */}
          {!preview && (
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
          )}
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px 16px 40px' }}>

        {tampilSkeleton ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Skeleton tinggi={24} lebar={128} radius={20} />
              <Skeleton tinggi={11} lebar={60} />
              <div style={{ flex: 1, height: '1px', background: '#dde8f4' }} />
            </div>
            <GridSkeletonAlumni jumlah={8} />
          </>
        ) : preview ? (
          <PreviewAngkatan ringkas={ringkas} />
        ) : (
          <>
            {/* Filter angkatan */}
            {daftarAngkatan.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '4px' }}>
                {[
                  { kunci: 'semua' as const, teks: 'Semua Angkatan' },
                  ...daftarAngkatan.map(g => ({ kunci: g.angkatan, teks: g.label ?? String(g.angkatan) })),
                ].map(({ kunci, teks }) => {
                  const aktif = filterAngkatan === kunci
                  return (
                    <button
                      key={String(kunci)}
                      onClick={() => setFilterAngkatan(kunci)}
                      className="filter-chip"
                      style={{
                        flexShrink: 0, padding: '0 16px', minHeight: '44px',
                        display: 'inline-flex', alignItems: 'center',
                        borderRadius: '22px',
                        border: aktif ? 'none' : '0.5px solid #c5d9ef',
                        background: aktif ? '#0C447C' : '#fff',
                        color: aktif ? '#fff' : '#5a7da0',
                        fontSize: '12px', fontWeight: aktif ? '600' : '400',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {teks}
                    </button>
                  )
                })}
              </div>
            )}

            {filtered.length === 0 ? (
              <EmptyState
                kecil
                ikon="🎓"
                judul="Alumni tidak ditemukan"
                pesan="Tidak ada nama atau angkatan yang cocok dengan pencarianmu. Coba kata kunci lain."
                aksiLabel="Tampilkan Semua"
                onAksi={() => { setSearch(''); setFilterAngkatan('semua') }}
              />
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
                      {g.label ?? 'Angkatan belum diisi'}
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
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          marginTop: '10px', marginBottom: '3px',
                        }}>
                          <span style={{
                            fontSize: '13px', fontWeight: '600', color: '#1a1a1a',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {m.nama || 'Alumni'}
                          </span>
                          {/* Semua yang muncul di sini pasti alumni —
                              view-nya memang hanya berisi mereka */}
                          <BadgeVerifikasi alumni size={13} />
                        </div>
                        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                          <BadgeAngkatan angkatan={m.angkatan} label={m.label_angkatan} sembunyikanKosong={false} kecil />
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
          </>
        )}
      </div>
    </main>
  )
}

// Tingkat pertama: berapa alumni di tiap angkatan, tanpa satu nama pun.
// Di luar komponen induk supaya tidak dibuat ulang tiap render.
function PreviewAngkatan({ ringkas }: { ringkas: Ringkas[] }) {
  const tujuan = '/auth?mode=daftar&redirect=/alumni&msg=' +
    encodeURIComponent('Daftar atau masuk untuk melihat nama teman seangkatanmu')

  return (
    <>
      {/* CTA di atas grid, bukan di bawahnya: orang yang datang dari tautan
          grup WA angkatan ingin melihat nama temannya, dan jalannya harus
          terlihat sebelum mereka menggulir */}
      <div style={{
        background: '#fff', borderRadius: '14px', border: '0.5px solid #c5d9ef',
        padding: '18px 18px 16px', marginBottom: '16px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>
          🎓 Cari teman seangkatanmu
        </div>
        <div style={{ fontSize: '12px', color: '#5a7da0', lineHeight: 1.7, marginBottom: '12px' }}>
          Nama alumni hanya terlihat oleh yang sudah masuk. Daftar gratis,
          lalu lihat siapa saja yang sudah bergabung dari angkatanmu.
        </div>
        <Link href={tujuan} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: '#0C447C', color: '#fff', padding: '0 20px', minHeight: '44px',
          borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
        }}>
          Daftar Sekarang
        </Link>
      </div>

      {ringkas.length === 0 ? (
        <EmptyState
          kecil
          ikon="🎓"
          judul="Belum ada alumni terdaftar"
          pesan="Jadilah yang pertama dari angkatanmu."
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '10px',
        }}>
          {ringkas.map(r => (
            <div key={r.angkatan} style={{
              background: '#fff', borderRadius: '12px',
              border: '0.5px solid #e8f0f8', padding: '14px 12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0C447C', marginBottom: '2px' }}>
                {r.label_angkatan}
              </div>
              <div style={{ fontSize: '12px', color: '#5a7da0' }}>
                {r.jumlah.toLocaleString('id-ID')} alumni
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
