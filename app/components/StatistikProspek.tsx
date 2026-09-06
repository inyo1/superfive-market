'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type BarisToko = { toko_id: string; nama: string; jumlah: number }

// Batas aman untuk agregasi di klien. PostgREST tidak bisa GROUP BY, jadi
// barisnya dijumlahkan di JavaScript — cara yang benar begitu jumlahnya
// membesar adalah RPC yang meng-GROUP BY di database, bukan menaikkan angka
// ini. Kalau tercapai, angkanya sudah tidak lengkap dan itu diberitahukan.
const BATAS = 5000

/**
 * Dua kartu statistik prospek untuk panel admin: total 30 hari terakhir dan
 * lima toko paling sering dihubungi.
 *
 * Hanya admin yang bisa membaca seluruh tabel `prospek` — penjual biasa
 * dibatasi RLS ke tokonya sendiri, jadi komponen ini tidak akan menampilkan
 * apa pun kalau dipasang di halaman non-admin.
 */
export default function StatistikProspek() {
  const [total, setTotal] = useState<number | null>(null)
  const [topToko, setTopToko] = useState<BarisToko[]>([])
  const [terpotong, setTerpotong] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    let hidup = true

    async function muat() {
      const sejak = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [hitungRes, barisRes] = await Promise.all([
        supabase.from('prospek')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sejak),
        supabase.from('prospek')
          .select('toko_id')
          .gte('created_at', sejak)
          .limit(BATAS),
      ])

      if (!hidup) return

      if (barisRes.error) { setGalat(barisRes.error.message); return }

      setTotal(hitungRes.count ?? 0)

      const baris = (barisRes.data ?? []) as { toko_id: string | null }[]
      setTerpotong(baris.length >= BATAS)

      const per: Record<string, number> = {}
      for (const b of baris) {
        if (b.toko_id) per[b.toko_id] = (per[b.toko_id] ?? 0) + 1
      }

      const urut = Object.entries(per)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

      if (urut.length === 0) { setTopToko([]); return }

      const { data: tokoData } = await supabase
        .from('toko')
        .select('id, nama_toko')
        .in('id', urut.map(([id]) => id))

      if (!hidup) return

      const namaById = Object.fromEntries((tokoData ?? []).map(t => [t.id, t.nama_toko]))
      setTopToko(urut.map(([id, jumlah]) => ({
        toko_id: id,
        nama: namaById[id] ?? 'Toko dihapus',
        jumlah,
      })))
    }

    muat()
    return () => { hidup = false }
  }, [])

  if (galat) {
    return (
      <div style={{
        background: '#fce4e4', border: '0.5px solid #f09595', borderRadius: '10px',
        padding: '12px 14px', fontSize: '12px', color: '#c62828', marginBottom: '14px',
      }}>
        Gagal memuat statistik prospek: {galat}
      </div>
    )
  }

  const maks = topToko[0]?.jumlah ?? 0

  return (
    <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: '14px' }}>

      <div style={{ background: '#fff', border: '0.5px solid #c5d9ef', borderRadius: '12px', padding: '16px 18px' }}>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '2px' }}>
          Total prospek 30 hari terakhir
        </div>
        <div style={{ fontSize: '30px', fontWeight: '800', color: '#0C447C', lineHeight: 1.15 }}>
          {total ?? '—'}
        </div>
        <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '4px', lineHeight: 1.5 }}>
          Berapa kali tombol Hubungi Penjual ditekan di seluruh Superfive.
        </div>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #c5d9ef', borderRadius: '12px', padding: '16px 18px' }}>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '10px' }}>
          Toko paling banyak dihubungi
        </div>

        {topToko.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#9ab4cc' }}>
            Belum ada yang menghubungi penjual dalam 30 hari terakhir.
          </div>
        ) : (
          topToko.map((t, i) => (
            <div key={t.toko_id} style={{ marginBottom: i === topToko.length - 1 ? 0 : '9px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
                <Link
                  href={`/toko/${t.toko_id}`}
                  style={{
                    fontSize: '12px', color: '#1a1a1a', textDecoration: 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {i + 1}. {t.nama}
                </Link>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0C447C', flexShrink: 0 }}>
                  {t.jumlah}
                </span>
              </div>
              {/* Batang pembanding relatif terhadap toko teratas — angkanya
                  kecil, jadi skala mutlak tidak memberi tahu apa pun */}
              <div style={{ height: '4px', background: '#e8f0f8', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: maks > 0 ? `${Math.round((t.jumlah / maks) * 100)}%` : '0%',
                  height: '100%', background: '#378ADD',
                }} />
              </div>
            </div>
          ))
        )}

        {terpotong && (
          <div style={{ fontSize: '10px', color: '#e08600', marginTop: '8px', lineHeight: 1.5 }}>
            Peringkat dihitung dari {BATAS.toLocaleString('id-ID')} prospek terbaru saja.
            Sudah waktunya dipindah ke RPC yang menghitung di database.
          </div>
        )}
      </div>
    </div>
  )
}
