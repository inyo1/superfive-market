'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useTampilSkeleton } from '../hooks/useSkeleton'
import FotoProduk from './FotoProduk'
import BadgeOfficial from './BadgeOfficial'
import { SkeletonKartuProduk } from './Skeleton'

const EMAS = '#EF9F27'

type ProdukResmi = {
  id: string
  nama: string
  harga: number | null
  kategori: string | null
  foto_url: string | string[] | null
  toko: { id: string; nama_toko: string | null; is_official: boolean } | null
}

function fmt(n: number | null | undefined) {
  return 'Rp ' + (n ?? 0).toLocaleString('id-ID')
}

export default function SectionOfficial() {
  const [produk, setProduk] = useState<ProdukResmi[]>([])
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)

  useEffect(() => {
    async function muat() {
      // toko!inner supaya produk dari toko non-resmi tersaring di database,
      // bukan disaring lagi di sini
      const { data } = await supabase
        .from('produk')
        .select('id, nama, harga, kategori, foto_url, toko!inner(id, nama_toko, is_official)')
        .eq('toko.is_official', true)
        .order('urutan', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(8)

      setProduk((data ?? []) as unknown as ProdukResmi[])
      setLoading(false)
    }
    muat()
  }, [])

  // Section disembunyikan sepenuhnya kalau belum ada merchandise resmi —
  // lebih baik tidak ada daripada kotak kosong di bawah hero
  if (!tampilSkeleton && produk.length === 0) return null

  const tokoResmiId = produk[0]?.toko?.id

  return (
    <section style={{
      background: 'linear-gradient(180deg, #0a3a6b 0%, #0C447C 100%)',
      padding: '22px 0 26px',
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 16px' }}>

        {/* Judul */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h2 style={{
                fontSize: '18px', fontWeight: '800', margin: 0,
                color: EMAS, letterSpacing: '0.3px',
              }}>
                Official Merchandise INILIMA
              </h2>
              <span style={{
                background: EMAS, color: '#3d2600',
                fontSize: '9px', fontWeight: '800', letterSpacing: '0.8px',
                padding: '3px 8px', borderRadius: '4px', lineHeight: 1.4,
              }}>
                RESMI
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#B5D4F4', margin: 0, lineHeight: 1.6 }}>
              Merchandise resmi komunitas alumni SMPN 5 Bandung.
            </p>
          </div>
        </div>

        {/* Garis aksen */}
        <div style={{ width: '54px', height: '3px', background: EMAS, borderRadius: '2px', margin: '12px 0 14px' }} />

        {/* Desktop: grid 4 kolom. Mobile: carousel geser dengan snap. */}
        <div className="merch-track">
          {tampilSkeleton
            ? Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="merch-item">
                  <SkeletonKartuProduk />
                </div>
              ))
            : produk.map(p => (
                <Link
                  key={p.id}
                  href={`/produk/${p.id}`}
                  className="merch-item prod-card"
                  style={{
                    background: '#fff', borderRadius: '10px',
                    border: '0.5px solid rgba(255,255,255,0.18)',
                    overflow: 'hidden', textDecoration: 'none', display: 'block',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <BadgeOfficial aktif bentuk="pita" />
                    <FotoProduk src={p.foto_url} kategori={p.kategori ?? ''} height={130} fontSize={40} />
                  </div>
                  <div style={{ padding: '10px' }}>
                    <div style={{
                      fontSize: '12px', fontWeight: '500', color: '#1a1a1a',
                      marginBottom: '5px', height: '32px', overflow: 'hidden', lineHeight: 1.35,
                    }}>
                      {p.nama}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0C447C' }}>
                      {fmt(p.harga)}
                    </div>
                  </div>
                </Link>
              ))}
        </div>

        {/* Lihat semua */}
        {tokoResmiId && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Link
              href={`/toko/${tokoResmiId}`}
              className="btn-primary"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '44px', padding: '0 26px', borderRadius: '9px',
                background: EMAS, color: '#3d2600',
                fontSize: '13px', fontWeight: '700', textDecoration: 'none',
              }}
            >
              Lihat Semua Merchandise →
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
