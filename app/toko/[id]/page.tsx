'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../components/Navbar'
import { useCart } from '../../context/CartContext'
import FotoProduk from '../../components/FotoProduk'
import BadgeVerifikasi from '../../components/BadgeVerifikasi'
import { useToast } from '../../context/ToastContext'
import Skeleton, { GridSkeletonProduk } from '../../components/Skeleton'
import BadgeAngkatan from '../../components/BadgeAngkatan'
import BadgeOfficial from '../../components/BadgeOfficial'
import LogoInilima from '../../components/LogoInilima'
import { useTampilSkeleton } from '../../hooks/useSkeleton'
import BadgePreorder, { WARNA_PO_TUA } from '../../components/BadgePreorder'
import { janjiKirim } from '../../../lib/preorder'
import { emojiKategori } from '../../../lib/kategori'

type Toko = {
  id: string
  seller_id: string
  nama_toko: string
  kategori: string
  deskripsi?: string
  foto_toko?: string | null
  is_official?: boolean
  users: {
    nama: string | null
    angkatan: number | null
    is_institusi: boolean | null
    alumni_terverifikasi: boolean | null
  } | null
}

type Produk = {
  id: string
  nama: string
  harga: number
  kategori: string
  terjual: number
  rating: number
  stok: number
  is_preorder: boolean
  po_janji_kirim: string | null
  foto_url?: string | null
}


const EMAS = '#EF9F27'

function fmt(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function TokoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { tambah } = useCart()
  const toast = useToast()

  const [toko, setToko] = useState<Toko | null>(null)
  const [produk, setProduk] = useState<Produk[]>([])
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  const [notFound, setNotFound] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Edit state
  const [editMode, setEditMode] = useState(false)
  const [namaBaru, setNamaBaru] = useState('')
  const [deskripsiBaru, setDeskripsiBaru] = useState('')
  const [saving, setSaving] = useState(false)
  const [pesanEdit, setPesanEdit] = useState('')

  // Keranjang notif
  const [notifId, setNotifId] = useState<string | null>(null)
  const [startingChat, setStartingChat] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (!id) return
    async function fetch() {
      const { data: tokoData, error } = await supabase
        .from('toko')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !tokoData) { setNotFound(true); setLoading(false); return }

      // Data penjual diambil terpisah dari view alumni_publik — embed lewat
      // foreign key ke users tidak lagi bisa dipakai sejak users ditutup.
      // Nama dan status alumni dari pengguna_publik (semua akun aktif),
      // angkatan dari alumni_publik. Pemilik toko resmi itu akun institusi:
      // dia punya baris di view pertama, tidak di yang kedua.
      const [profilRes, angkatanRes] = await Promise.all([
        supabase.from('pengguna_publik')
          .select('nama, is_institusi, alumni_terverifikasi')
          .eq('id', tokoData.seller_id).maybeSingle(),
        supabase.from('alumni_publik').select('angkatan')
          .eq('id', tokoData.seller_id).maybeSingle(),
      ])

      const penjual = profilRes.data
        ? { ...profilRes.data, angkatan: angkatanRes.data?.angkatan ?? null }
        : null

      setToko({ ...tokoData, users: penjual } as any)
      setNamaBaru(tokoData.nama_toko)
      setDeskripsiBaru(tokoData.deskripsi ?? '')

      const { data: produkData } = await supabase
        .from('produk')
        .select('id, nama, harga, kategori, terjual, rating, stok, foto_url, is_preorder, po_janji_kirim')
        .eq('toko_id', id)
        .order('created_at', { ascending: false })

      setProduk((produkData ?? []) as unknown as Produk[])
      setLoading(false)
    }
    fetch()
  }, [id])

  async function handleSimpanEdit() {
    if (!namaBaru.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('toko')
      .update({ nama_toko: namaBaru, deskripsi: deskripsiBaru })
      .eq('id', id)

    if (!error) {
      setToko(prev => prev ? { ...prev, nama_toko: namaBaru, deskripsi: deskripsiBaru } : prev)
      setPesanEdit('Profil toko berhasil diperbarui!')
      setEditMode(false)
    } else {
      setPesanEdit('Gagal menyimpan: ' + error.message)
    }
    setSaving(false)
    setTimeout(() => setPesanEdit(''), 3000)
  }

  function handleTambahKeranjang(p: Produk) {
    tambah({ id: p.id, nama: p.nama, harga: p.harga, kategori: p.kategori })
    setNotifId(p.id)
    setTimeout(() => setNotifId(null), 2000)
  }

  async function handleChatSeller() {
    if (!toko || startingChat) return
    if (!currentUserId) { router.push('/auth'); return }
    if (currentUserId === toko.seller_id) return
    setStartingChat(true)

    try {
      const { data: existing, error: selectErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', currentUserId)
        .eq('seller_id', toko.seller_id)
        .maybeSingle()

      if (selectErr) throw new Error(selectErr.message)

      if (existing) {
        router.push(`/chat/${existing.id}`)
        return
      }

      const { data: newConv, error: insertErr } = await supabase
        .from('conversations')
        .insert({ buyer_id: currentUserId, seller_id: toko.seller_id })
        .select('id')
        .single()

      if (insertErr) throw new Error(insertErr.message)
      if (newConv) router.push(`/chat/${newConv.id}`)
    } catch (err: any) {
      toast.error('Gagal membuka chat: ' + (err?.message ?? 'Coba lagi'))
    } finally {
      setStartingChat(false)
    }
  }

  const isOwner = toko && currentUserId === toko.seller_id
  const resmi = Boolean(toko?.is_official)

  if (tampilSkeleton) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>
          <Skeleton tinggi={110} radius={12} style={{ marginBottom: '16px' }} />
          <GridSkeletonProduk jumlah={4} />
        </div>
      </main>
    )
  }

  if (notFound || !toko) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏪</div>
          <div style={{ fontSize: '15px', color: '#333', marginBottom: '8px' }}>Toko tidak ditemukan</div>
          <Link href="/produk" style={{ color: '#0C447C', fontSize: '13px' }}>← Kembali ke Produk</Link>
        </div>
      </main>
    )
  }

  const totalTerjual = produk.reduce((s, p) => s + (p.terjual || 0), 0)
  const ratingRata = produk.length
    ? (produk.reduce((s, p) => s + (p.rating || 5), 0) / produk.length).toFixed(1)
    : '5.0'

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>

        {/* Banner khusus toko resmi — logo INILIMA lebar dengan aksen emas */}
        {resmi && (
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #0a3a6b 0%, #0C447C 55%, #082e57 100%)',
            border: `1px solid ${EMAS}`,
            borderRadius: '14px', padding: '22px 20px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap',
          }}>
            {/* Logo IniLima, BUKAN logo Superfive: yang diwakili spanduk ini
                komunitas pemilik tokonya, bukan platform tempat tokonya
                berdiri. Tanpa bingkai — lencananya sudah bercincin sendiri. */}
            <LogoInilima lebar={92} prioritas />
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{
                  background: EMAS, color: '#3d2600',
                  fontSize: '9px', fontWeight: '800', letterSpacing: '0.8px',
                  padding: '3px 9px', borderRadius: '4px', lineHeight: 1.4,
                }}>
                  RESMI
                </span>
                <span style={{ fontSize: '10px', color: '#7eb8f0', letterSpacing: '1.4px', textTransform: 'uppercase' }}>
                  Toko Resmi Komunitas
                </span>
              </div>
              <div style={{ fontSize: '19px', fontWeight: '800', color: EMAS, lineHeight: 1.25, marginBottom: '6px' }}>
                Official Merchandise INILIMA
              </div>
              <div style={{ fontSize: '12px', color: '#B5D4F4', lineHeight: 1.6 }}>
                Merchandise resmi komunitas alumni SMPN 5 Bandung.
              </div>
            </div>
          </div>
        )}

        {/* Header toko */}
        <div style={{
          background: '#0C447C', borderRadius: '12px', padding: '20px',
          color: '#fff', marginBottom: '12px',
          border: resmi ? `0.5px solid rgba(239,159,39,0.45)` : undefined,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            {/* Urutannya: foto toko sendiri kalau ada, lalu logo IniLima
                untuk toko resmi, lalu emoji kategori. Bintang sebelumnya
                cuma penampung kosong — toko resmi punya lencananya sendiri,
                jadi itu yang dipakai. */}
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden',
              background: resmi ? 'rgba(239,159,39,0.18)' : 'rgba(255,255,255,0.15)',
              border: resmi ? `1px solid ${EMAS}` : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0,
            }}>
              {toko.foto_toko ? (
                <img
                  src={toko.foto_toko}
                  alt={`Foto ${toko.nama_toko}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : resmi ? (
                <LogoInilima lebar={60} />
              ) : (
                emojiKategori(toko.kategori, '🏪')
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editMode ? (
                <input
                  value={namaBaru}
                  onChange={e => setNamaBaru(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '16px', fontWeight: '600', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                />
              ) : (
                <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{toko.nama_toko}</div>
              )}
              {/* Akun resmi itu institusi — nama pengelola, centang alumni, dan
                  badge angkatan tidak ditampilkan, diganti lencana OFFICIAL */}
              {resmi ? (
                <BadgeOfficial aktif bentuk="lencana" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '12px', color: '#B5D4F4' }}>
                  <span>{toko.users?.nama || 'Penjual'}</span>
                  <BadgeVerifikasi alumni={toko.users?.alumni_terverifikasi} size={13} />
                  <BadgeAngkatan angkatan={toko.users?.angkatan} institusi={toko.users?.is_institusi} />
                </div>
              )}
            </div>
            {isOwner && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
              >
                Edit
              </button>
            )}
          </div>

          {/* Edit deskripsi */}
          {editMode ? (
            <div>
              <textarea
                value={deskripsiBaru}
                onChange={e => setDeskripsiBaru(e.target.value)}
                rows={2}
                placeholder="Deskripsi toko kamu..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: 'none', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSimpanEdit}
                  disabled={saving}
                  style={{ background: '#fff', color: '#0C447C', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={() => { setEditMode(false); setNamaBaru(toko.nama_toko); setDeskripsiBaru(toko.deskripsi ?? '') }}
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            toko.deskripsi && (
              <p style={{ fontSize: '13px', color: '#B5D4F4', margin: 0, lineHeight: '1.5' }}>{toko.deskripsi}</p>
            )
          )}

          {/* Statistik */}
          <div style={{ display: 'flex', gap: '0', marginTop: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            {[
              { label: 'Produk', value: produk.length },
              { label: 'Terjual', value: totalTerjual },
              { label: 'Rating', value: `⭐ ${ratingRata}` },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                <div style={{ fontSize: '16px', fontWeight: '700' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#B5D4F4' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pesan edit */}
        {pesanEdit && (
          <div style={{ background: pesanEdit.includes('berhasil') ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesanEdit.includes('berhasil') ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesanEdit.includes('berhasil') ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
            {pesanEdit}
          </div>
        )}

        {/* Tombol owner */}
        {isOwner && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <Link
              href="/produk/tambah"
              style={{ flex: 1, background: '#0C447C', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', textDecoration: 'none', textAlign: 'center' }}
            >
              + Tambah Produk
            </Link>
          </div>
        )}

        {/* Tombol chat untuk buyer */}
        {!isOwner && toko && (
          <button
            onClick={handleChatSeller}
            disabled={startingChat}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: '#fff', border: '1px solid #0C447C', color: '#0C447C',
              padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
              cursor: startingChat ? 'not-allowed' : 'pointer', marginBottom: '16px',
            }}
          >
            {startingChat ? 'Membuka chat...' : '💬 Chat dengan Penjual'}
          </button>
        )}

        {/* Daftar produk */}
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '12px' }}>
          Produk ({produk.length})
        </div>

        {produk.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: '10px', border: '0.5px solid #c5d9ef' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
            <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: isOwner ? '14px' : '0' }}>Belum ada produk di toko ini</div>
            {isOwner && (
              <Link href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
                Tambah Produk Pertama
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {produk.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e8f0f8', overflow: 'hidden' }}>
                <Link href={`/produk/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ position: 'relative' }}>
                    <BadgePreorder aktif={p.is_preorder} bentuk="pita" />
                    <FotoProduk src={p.foto_url} kategori={p.kategori} height={110} fontSize={38} />
                  </div>
                  <div style={{ padding: '10px 10px 6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#333', marginBottom: '4px', height: '32px', overflow: 'hidden' }}>{p.nama}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>{fmt(p.harga)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#5a7da0' }}>
                      <span>⭐ {p.rating || '5.0'}</span>
                      {/* Stok produk PO selalu 0 karena trg_kurangi_stok
                          sengaja melewatinya — kalau ditampilkan akan terbaca
                          habis padahal PO-nya sedang buka */}
                      <span>{p.is_preorder ? 'Pre-Order' : `${p.terjual || 0} terjual`}</span>
                    </div>
                    {p.is_preorder && p.po_janji_kirim && (
                      <div style={{ fontSize: '10px', color: WARNA_PO_TUA, marginTop: '4px', lineHeight: 1.5 }}>
                        🚚 {janjiKirim(p.po_janji_kirim)}
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => handleTambahKeranjang(p)}
                  style={{
                    width: '100%', border: 'none', padding: '8px', fontSize: '12px', cursor: 'pointer',
                    background: notifId === p.id ? '#2e7d32' : '#0C447C',
                    color: '#fff', transition: 'background 0.2s',
                  }}
                >
                  {notifId === p.id ? '✓ Ditambahkan' : '+ Keranjang'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
