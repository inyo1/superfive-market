'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'
import EmptyState from '../components/EmptyState'
import SkeletonCard from '../components/SkeletonCard'
import BadgePreorder, { WARNA_PO, WARNA_PO_TUA } from '../components/BadgePreorder'
import { useHitungMundur } from '../hooks/useHitungMundur'
import { useTampilSkeleton } from '../hooks/useSkeleton'
import { janjiKirim, tanggalPanjang, formatSisa } from '../../lib/preorder'

// Semua pre-order di satu halaman, dikelompokkan menurut periodenya.
//
// Yang menentukan kelompok adalah database, bukan jam peramban: `sedang_buka`
// sudah dihitung di view preorder_progress, dan batas "akan dibuka" maupun
// "sudah ditutup" disaring lewat now() di sisi server.

type BarisPO = {
  produk_id: string
  nama: string
  po_mulai: string | null
  po_selesai: string | null
  po_target: number | null
  po_maks: number | null
  terkumpul: number
}

type Produk = {
  id: string
  harga: number
  kategori: string
  foto_url: string | null
  po_janji_kirim: string | null
  toko: { nama_toko: string; is_official: boolean } | null
}

type Kelompok = {
  kunci: 'buka' | 'akan' | 'tutup'
  judul: string
  keterangan: string
  baris: BarisPO[]
}

const KOLOM_VIEW = 'produk_id, nama, po_mulai, po_selesai, po_target, po_maks, terkumpul'

function fmt(n: number) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID')
}

export default function PreorderPage() {
  const [kelompok, setKelompok] = useState<Kelompok[]>([])
  const [detail, setDetail] = useState<Record<string, Produk>>({})
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)

  useEffect(() => {
    async function muat() {
      try {
        // 'now' dikirim apa adanya sebagai nilai filter; Postgres menafsirkannya
        // sebagai waktu transaksi, sama persis dengan now(). Jadi pembandingnya
        // jam server, bukan jam peramban pengunjung — sama seperti sedang_buka
        // yang sudah dihitung di dalam view.
        const [bukaRes, akanRes, tutupRes] = await Promise.all([
          supabase.from('preorder_progress').select(KOLOM_VIEW)
            .eq('sedang_buka', true)
            .order('po_selesai', { ascending: true }),
          supabase.from('preorder_progress').select(KOLOM_VIEW)
            .gt('po_mulai', 'now')
            .order('po_mulai', { ascending: true }),
          supabase.from('preorder_progress').select(KOLOM_VIEW)
            .lt('po_selesai', 'now')
            .order('po_selesai', { ascending: false })
            .limit(6),
        ])

        const semua = [
          ...(bukaRes.data ?? []),
          ...(akanRes.data ?? []),
          ...(tutupRes.data ?? []),
        ] as BarisPO[]

        if (semua.length === 0) { setLoading(false); return }

        // View tidak memuat harga, foto, maupun janji kirim — diambil sekali
        // dari produk lalu digabung di sini. toko!inner sekaligus menyingkirkan
        // merchandise resmi, yang punya raknya sendiri di beranda.
        const { data: prod } = await supabase
          .from('produk')
          .select('id, harga, kategori, foto_url, po_janji_kirim, toko!inner(nama_toko, is_official)')
          .in('id', [...new Set(semua.map(r => r.produk_id))])
          .eq('toko.is_official', false)

        const peta = Object.fromEntries(
          ((prod ?? []) as unknown as Produk[]).map(p => [p.id, p])
        )
        setDetail(peta)

        const ada = (rows: BarisPO[] | null) =>
          (rows ?? []).filter(r => peta[r.produk_id])

        setKelompok([
          {
            kunci: 'buka',
            judul: 'Sedang Dibuka',
            keterangan: 'Masih bisa dipesan sekarang.',
            baris: ada(bukaRes.data as BarisPO[] | null),
          },
          {
            kunci: 'akan',
            judul: 'Akan Dibuka',
            keterangan: 'Belum bisa dipesan — catat tanggalnya.',
            baris: ada(akanRes.data as BarisPO[] | null),
          },
          {
            kunci: 'tutup',
            judul: 'Sudah Ditutup',
            keterangan: 'Periode pemesanannya sudah lewat.',
            baris: ada(tutupRes.data as BarisPO[] | null),
          },
        ].filter(k => k.baris.length > 0) as Kelompok[])
      } finally {
        setLoading(false)
      }
    }
    muat()
  }, [])

  const kosong = kelompok.length === 0

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>
          Pre-Order
        </h1>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '18px', lineHeight: 1.6 }}>
          Barang yang dibuat setelah periode pemesanan ditutup. Tiap produk
          punya tanggal janji kirim — kalau lewat dan barang belum dikirim,
          pesanan dibatalkan dan dana dikembalikan.
        </div>

        {tampilSkeleton ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : kosong ? (
          <EmptyState
            ikon="📅"
            judul="Belum ada pre-order"
            pesan="Belum ada alumni yang membuka pre-order. Kalau kamu punya produk yang dibuat sesuai pesanan, PO bisa dinyalakan dari form produk."
            aksiLabel="Lihat Etalase"
            aksiHref="/produk"
          />
        ) : (
          kelompok.map(k => (
            <section key={k.kunci} style={{ marginBottom: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                <h2 style={{
                  fontSize: '15px', fontWeight: '700', margin: 0,
                  color: k.kunci === 'tutup' ? '#5a7da0' : WARNA_PO_TUA,
                }}>
                  {k.judul}
                </h2>
                <span style={{ fontSize: '12px', color: '#9ab4cc' }}>({k.baris.length})</span>
              </div>
              <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '10px' }}>
                {k.keterangan}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                {k.baris.map(r => (
                  <KartuPO
                    key={r.produk_id}
                    baris={r}
                    produk={detail[r.produk_id]}
                    kelompok={k.kunci}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  )
}

function KartuPO({ baris, produk, kelompok }: {
  baris: BarisPO
  produk: Produk
  kelompok: Kelompok['kunci']
}) {
  // Yang dihitung mundur bergantung kelompoknya: penutupan untuk yang sedang
  // buka, pembukaan untuk yang belum mulai. Yang sudah ditutup tidak perlu.
  const target = kelompok === 'buka' ? baris.po_selesai
    : kelompok === 'akan' ? baris.po_mulai
    : null
  const mundur = useHitungMundur(target)

  const persen = baris.po_target && baris.po_target > 0
    ? Math.min(100, (baris.terkumpul / baris.po_target) * 100)
    : null
  const tutup = kelompok === 'tutup'

  return (
    <Link
      href={`/produk/${baris.produk_id}`}
      className="prod-card"
      style={{
        background: '#fff', borderRadius: '10px',
        border: `0.5px solid ${tutup ? '#e8f0f8' : WARNA_PO}`,
        overflow: 'hidden', textDecoration: 'none', display: 'block',
        opacity: tutup ? 0.75 : 1,
      }}
    >
      <div style={{ position: 'relative' }}>
        <BadgePreorder aktif bentuk="pita" label={tutup ? 'DITUTUP' : 'PRE-ORDER'} />
        <FotoProduk src={produk.foto_url} kategori={produk.kategori} height={120} fontSize={40} />
      </div>

      <div style={{ padding: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: '500', color: '#333', marginBottom: '4px', height: '32px', overflow: 'hidden' }}>
          {baris.nama}
        </div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>
          {fmt(produk.harga)}
        </div>
        {produk.toko?.nama_toko && (
          <div style={{ fontSize: '10px', color: '#5a7da0', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            🏪 {produk.toko.nama_toko}
          </div>
        )}

        {/* mundur.siap false = jam klien belum jalan; lebih baik kosong
            sesaat daripada berkedip dari angka salah */}
        {mundur.siap && kelompok === 'buka' && (
          <div style={{ fontSize: '10px', color: WARNA_PO_TUA, fontWeight: '600', marginBottom: '6px' }}>
            ⏳ Ditutup dalam {mundur.teks}
          </div>
        )}
        {mundur.siap && kelompok === 'akan' && baris.po_mulai && (
          <div style={{ fontSize: '10px', color: WARNA_PO_TUA, fontWeight: '600', marginBottom: '6px' }}>
            🗓️ Dibuka dalam {formatSisa(new Date(baris.po_mulai).getTime() - mundur.sekarang)}
          </div>
        )}
        {tutup && baris.po_selesai && (
          <div style={{ fontSize: '10px', color: '#9ab4cc', marginBottom: '6px' }}>
            Ditutup {tanggalPanjang(baris.po_selesai)}
          </div>
        )}

        {persen !== null ? (
          <>
            <div style={{ height: '5px', background: '#eceaf7', borderRadius: '20px', overflow: 'hidden', marginBottom: '4px' }}>
              <div style={{
                width: `${persen}%`, height: '100%',
                background: baris.terkumpul >= (baris.po_target ?? 0) ? '#2e7d32' : WARNA_PO,
                borderRadius: '20px',
              }} />
            </div>
            <div style={{ fontSize: '10px', color: '#5a7da0' }}>
              {baris.terkumpul} dari {baris.po_target} terkumpul
            </div>
          </>
        ) : (
          <div style={{ fontSize: '10px', color: '#5a7da0' }}>
            {baris.terkumpul} sudah memesan
          </div>
        )}

        {produk.po_janji_kirim && (
          <div style={{ fontSize: '10px', color: '#9ab4cc', marginTop: '4px' }}>
            🚚 {janjiKirim(produk.po_janji_kirim)}
          </div>
        )}
      </div>
    </Link>
  )
}
