'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import FotoProduk from './FotoProduk'
import BadgePreorder, { WARNA_PO, WARNA_PO_TUA } from './BadgePreorder'
import { useHitungMundur } from '../hooks/useHitungMundur'
import { tanggalPanjang } from '../../lib/preorder'

// "Pre-Order Sedang Dibuka" di beranda. Hilang sama sekali kalau tidak ada
// PO yang sedang berjalan — tidak ada kerangka kosong dan tidak ada skeleton,
// karena bagian ini memang boleh tidak ada.
//
// Sumbernya view preorder_progress: `sedang_buka` dihitung di database, jadi
// jam browser pengunjung tidak ikut menentukan apa yang tampil.

type BarisPO = {
  produk_id: string
  nama: string
  po_selesai: string | null
  po_target: number | null
  po_maks: number | null
  po_estimasi_kirim: string | null
  terkumpul: number
}

type Produk = {
  id: string
  harga: number
  kategori: string
  foto_url: string | null
  toko: { nama_toko: string; is_official: boolean } | null
}

function fmt(n: number) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID')
}

export default function SectionPreorder() {
  const [baris, setBaris] = useState<BarisPO[]>([])
  const [detail, setDetail] = useState<Record<string, Produk>>({})

  useEffect(() => {
    async function muat() {
      const { data } = await supabase
        .from('preorder_progress')
        .select('produk_id, nama, po_selesai, po_target, po_maks, po_estimasi_kirim, terkumpul')
        .eq('sedang_buka', true)
        .order('po_selesai', { ascending: true })
        .limit(6)

      const rows = (data ?? []) as BarisPO[]
      if (rows.length === 0) return

      // View PO tidak memuat harga dan foto, jadi diambil sekali dari produk.
      // toko!inner supaya merchandise resmi tetap punya rak sendiri dan tidak
      // ikut muncul di sini.
      const { data: prod } = await supabase
        .from('produk')
        .select('id, harga, kategori, foto_url, toko!inner(nama_toko, is_official)')
        .in('id', rows.map(r => r.produk_id))
        .eq('toko.is_official', false)

      const peta = Object.fromEntries(((prod ?? []) as unknown as Produk[]).map(p => [p.id, p]))
      setDetail(peta)
      setBaris(rows.filter(r => peta[r.produk_id]))
    }
    muat()
  }, [])

  if (baris.length === 0) return null

  return (
    <div style={{ padding: '4px 16px 20px', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: WARNA_PO_TUA, margin: 0 }}>
          Pre-Order Sedang Dibuka
        </h2>
        <BadgePreorder aktif kecil label={`${baris.length} produk`} />
      </div>
      <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '12px' }}>
        Pesan sekarang selagi periodenya masih buka — barang dibuat setelah PO ditutup.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
        {baris.map(r => (
          <KartuPO key={r.produk_id} baris={r} produk={detail[r.produk_id]} />
        ))}
      </div>
    </div>
  )
}

function KartuPO({ baris, produk }: { baris: BarisPO; produk: Produk }) {
  const mundur = useHitungMundur(baris.po_selesai)
  const persen = baris.po_target && baris.po_target > 0
    ? Math.min(100, (baris.terkumpul / baris.po_target) * 100)
    : null

  return (
    <Link
      href={`/produk/${baris.produk_id}`}
      className="prod-card"
      style={{
        background: '#fff', borderRadius: '10px',
        border: `0.5px solid ${WARNA_PO}`, overflow: 'hidden',
        textDecoration: 'none', display: 'block',
      }}
    >
      <div style={{ position: 'relative' }}>
        <BadgePreorder aktif bentuk="pita" />
        <FotoProduk src={produk.foto_url} kategori={produk.kategori} height={120} fontSize={40} />
      </div>

      <div style={{ padding: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: '500', color: '#333', marginBottom: '4px', height: '32px', overflow: 'hidden' }}>
          {baris.nama}
        </div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0C447C', marginBottom: '6px' }}>
          {fmt(produk.harga)}
        </div>

        {mundur.siap && baris.po_selesai && (
          <div style={{ fontSize: '10px', color: WARNA_PO_TUA, fontWeight: '600', marginBottom: '6px' }}>
            ⏳ Sisa {mundur.teks}
          </div>
        )}

        {persen !== null ? (
          <>
            <div style={{ height: '5px', background: '#eceaf7', borderRadius: '20px', overflow: 'hidden', marginBottom: '4px' }}>
              <div style={{ width: `${persen}%`, height: '100%', background: WARNA_PO, borderRadius: '20px' }} />
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

        {baris.po_estimasi_kirim && (
          <div style={{ fontSize: '10px', color: '#9ab4cc', marginTop: '4px' }}>
            🚚 {baris.po_estimasi_kirim}
          </div>
        )}
        {!baris.po_estimasi_kirim && baris.po_selesai && (
          <div style={{ fontSize: '10px', color: '#9ab4cc', marginTop: '4px' }}>
            Tutup {tanggalPanjang(baris.po_selesai)}
          </div>
        )}
      </div>
    </Link>
  )
}
