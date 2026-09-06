'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../context/ToastContext'
import EmptyState from './EmptyState'
import BadgeAngkatan from './BadgeAngkatan'
import BadgeVerifikasi from './BadgeVerifikasi'
import { tanggalPeristiwa } from '../../lib/format'

type BarisProspek = {
  id: string
  user_id: string | null
  kanal: string | null
  created_at: string
  produk: { nama: string } | null
}

type Peminat = {
  nama: string | null
  angkatan: number | null
  alumni: boolean
}

const KANAL: Record<string, { label: string; bg: string; teks: string }> = {
  wa: { label: 'WhatsApp', bg: '#e8f5e9', teks: '#2e7d32' },
  ig: { label: 'Instagram', bg: '#fce4ec', teks: '#ad1457' },
}

/**
 * Daftar orang yang menekan "Hubungi Penjual" di produk toko ini.
 *
 * Barisnya ditulis RPC `buka_kontak_toko`, bukan oleh klien, dan RLS-nya cuma
 * mengizinkan pemilik toko dan admin membacanya.
 *
 * PENTING soal nama peminat: `users` TIDAK bisa dibaca untuk profil orang
 * lain — policy `users_select_own` hanya meloloskan baris sendiri. Jadi
 * embed `users(nama)` di query prospek akan mengembalikan null untuk semua
 * baris, dan yang terlihat penjual adalah daftar peminat tanpa nama. Nama
 * diambil dari view `pengguna_publik`, angkatan dari `alumni_publik`, lalu
 * digabung di JavaScript — pola yang sama dengan /produk dan /toko/[id].
 */
export default function DaftarProspek({ tokoId }: { tokoId: string }) {
  const toast = useToast()
  const [baris, setBaris] = useState<BarisProspek[]>([])
  const [peminat, setPeminat] = useState<Record<string, Peminat>>({})
  const [total30, setTotal30] = useState(0)
  const [memuat, setMemuat] = useState(true)

  useEffect(() => {
    let hidup = true

    async function muat() {
      const sejak = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [daftarRes, hitungRes] = await Promise.all([
        supabase
          .from('prospek')
          .select('id, user_id, kanal, created_at, produk(nama)')
          .eq('toko_id', tokoId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('prospek')
          .select('id', { count: 'exact', head: true })
          .eq('toko_id', tokoId)
          .gte('created_at', sejak),
      ])

      if (!hidup) return

      if (daftarRes.error) {
        toast.error('Gagal memuat prospek: ' + daftarRes.error.message)
        setMemuat(false)
        return
      }

      const data = (daftarRes.data ?? []) as unknown as BarisProspek[]
      setBaris(data)
      setTotal30(hitungRes.count ?? 0)

      const ids = [...new Set(data.map(b => b.user_id).filter(Boolean))] as string[]
      if (ids.length > 0) {
        const [profilRes, angkatanRes] = await Promise.all([
          supabase.from('pengguna_publik').select('id, nama, alumni_terverifikasi').in('id', ids),
          supabase.from('alumni_publik').select('id, angkatan').in('id', ids),
        ])
        if (!hidup) return

        const angkatanById = Object.fromEntries(
          (angkatanRes.data ?? []).map(u => [u.id, u.angkatan])
        )
        setPeminat(Object.fromEntries(
          (profilRes.data ?? []).map(u => [u.id, {
            nama: u.nama,
            angkatan: angkatanById[u.id] ?? null,
            alumni: Boolean(u.alumni_terverifikasi),
          }])
        ))
      }

      setMemuat(false)
    }

    muat()
    return () => { hidup = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokoId])

  if (memuat) {
    return <div style={{ fontSize: '13px', color: '#5a7da0', padding: '20px 0' }}>Memuat prospek…</div>
  }

  return (
    <div>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '16px 18px',
        border: '0.5px solid #c5d9ef', marginBottom: '12px',
      }}>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '2px' }}>
          Dihubungi 30 hari terakhir
        </div>
        <div style={{ fontSize: '26px', fontWeight: '700', color: '#0C447C', lineHeight: 1.2 }}>
          {total30}
        </div>
        <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '4px', lineHeight: 1.5 }}>
          Jumlah klik tombol Hubungi Penjual — belum tentu berujung transaksi.
        </div>
      </div>

      {baris.length === 0 ? (
        <EmptyState
          kecil
          ikon="📇"
          judul="Belum ada yang menghubungi"
          pesan="Begitu ada alumni yang menekan tombol Hubungi Penjual di produkmu, namanya muncul di sini."
        />
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #c5d9ef', overflow: 'hidden' }}>
          {baris.map((b, i) => {
            const p = b.user_id ? peminat[b.user_id] : null
            const k = KANAL[b.kanal ?? ''] ?? { label: b.kanal ?? '—', bg: '#f0f5fb', teks: '#5a7da0' }
            return (
              <div
                key={b.id}
                style={{
                  padding: '12px 14px',
                  borderTop: i === 0 ? 'none' : '0.5px solid #e8f0f8',
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>
                      {/* Akun yang sudah dihapus meninggalkan prospeknya dengan
                          user_id NULL — barisnya tetap dihitung, namanya tidak
                          bisa dipulihkan */}
                      {p?.nama || (b.user_id ? 'Pengguna' : 'Akun Dihapus')}
                    </span>
                    <BadgeVerifikasi alumni={Boolean(p?.alumni)} size={11} />
                    <BadgeAngkatan angkatan={p?.angkatan} kecil />
                  </div>
                  <div style={{ fontSize: '12px', color: '#5a7da0', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    📦 {b.produk?.nama ?? 'Produk sudah dihapus'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '3px' }}>
                    {tanggalPeristiwa(b.created_at)}
                  </div>
                </div>
                <span style={{
                  flexShrink: 0, background: k.bg, color: k.teks,
                  fontSize: '10px', fontWeight: '600', padding: '3px 8px',
                  borderRadius: '20px', whiteSpace: 'nowrap',
                }}>
                  {k.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
