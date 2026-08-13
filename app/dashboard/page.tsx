'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { uploadFotoProduk } from '../../lib/uploadFoto'
import { aksiPenjual, bisaDibatalkan, warnaStatus, labelStatus, warnaPembayaran, labelPembayaran, AKSI_STATUS } from '../../lib/statusPesanan'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'
import Skeleton, { DaftarSkeletonPesanan } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import InputHarga from '../components/InputHarga'
import DialogKonfirmasi from '../components/DialogKonfirmasi'
import Tombol from '../components/Tombol'
import { useTampilSkeleton } from '../hooks/useSkeleton'
import { keAngka } from '../../lib/format'
import EditorVarian, { muatVarian, simpanVarian, totalStok, type BarisVarian } from '../components/EditorVarian'
import BadgePreorder, { WARNA_PO_TUA } from '../components/BadgePreorder'
import EditorPreorder from '../components/EditorPreorder'
import RekapPO, { type ProgresPO } from '../components/RekapPO'
import TenggatKirim from '../components/TenggatKirim'
import { FORM_PO_KOSONG, formPODari, validasiFormPO, formPOKeKolom, formPOAktif, janjiKirim, type FormPO, type DataPO } from '../../lib/preorder'

type Toko = { id: string; nama_toko: string; kategori: string; is_official: boolean }
type Produk = DataPO & { id: string; nama: string; harga: number; kategori: string; stok: number; terjual: number; rating: number; deskripsi: string; urutan: number | null; foto_url?: string | null }

type PesananItem = {
  id: string
  produk_id: string | null
  nama_produk: string
  harga: number
  qty: number
  subtotal: number
  foto_url: string | null
  varian_nama: string | null
  is_preorder: boolean | null
  po_janji_kirim: string | null
}

type Pesanan = {
  id: string
  nomor_pesanan: string | null
  penerima_nama: string | null
  penerima_hp: string | null
  alamat_kirim: string | null
  metode_bayar: string | null
  total: number | null
  status: string
  payment_status: string | null
  no_resi: string | null
  kurir: string | null
  created_at: string
  dikirim_at: string | null
  paid_at: string | null
  batas_kirim: string | null
  pesanan_items: PesananItem[]
}

const kategoris = ['Teknologi', 'Fashion', 'Kuliner', 'Properti', 'Jasa', 'UMKM']

function fmt(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }
function fmtTgl(s: string) { return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default function DashboardPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'ringkasan' | 'produk' | 'pesanan'>('ringkasan')
  const [toko, setToko] = useState<Toko | null>(null)
  const [produk, setProduk] = useState<Produk[]>([])
  const [pesanan, setPesanan] = useState<Pesanan[]>([])
  const [loading, setLoading] = useState(true)
  const [noToko, setNoToko] = useState(false)
  const tampilSkeleton = useTampilSkeleton(loading)

  // Edit produk
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Produk>>({})
  const [editFoto, setEditFoto] = useState<File | null>(null)
  const [editPreview, setEditPreview] = useState<string | null>(null)
  const editFotoRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  // Varian produk yang sedang diedit
  const [varian, setVarian] = useState<BarisVarian[]>([])
  const [varianIdAwal, setVarianIdAwal] = useState<string[]>([])

  // Isian pre-order produk yang sedang diedit
  const [formPo, setFormPo] = useState<FormPO>(FORM_PO_KOSONG)

  // Progres PO per produk, dibaca dari view preorder_progress
  const [progresPo, setProgresPo] = useState<Record<string, ProgresPO>>({})

  // Hapus konfirmasi
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [menghapus, setMenghapus] = useState(false)

  // Form pengiriman — muncul saat penjual mau menandai pesanan "dikirim"
  const [kirimId, setKirimId] = useState<string | null>(null)
  const [kurir, setKurir] = useState('')
  const [noResi, setNoResi] = useState('')
  const [prosesId, setProsesId] = useState<string | null>(null)

  // Pembatalan wajib menyebut alasan: kalau pesanannya lunas, alasan itu ikut
  // tersimpan di baris refund dan dibaca pembeli
  const [batalId, setBatalId] = useState<string | null>(null)
  const [alasanBatal, setAlasanBatal] = useState('')

  // Pesan
  const [pesan, setPesan] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data: tokoData } = await supabase.from('toko').select('id, nama_toko, kategori, is_official').eq('seller_id', user.id).single()
      if (!tokoData) { setNoToko(true); setLoading(false); return }
      setToko(tokoData)

      // Toko resmi diurutkan sama seperti di beranda, supaya pengelola melihat
      // susunan yang sama dengan yang dilihat pengunjung
      let kueriProduk = supabase.from('produk')
        .select('id, nama, harga, kategori, stok, terjual, rating, deskripsi, urutan, foto_url, is_preorder, po_mulai, po_selesai, po_janji_kirim, po_target, po_maks, po_catatan')
        .eq('toko_id', tokoData.id)

      if (tokoData.is_official) kueriProduk = kueriProduk.order('urutan', { ascending: true })

      const { data: produkData } = await kueriProduk.order('created_at', { ascending: false })
      setProduk((produkData ?? []) as Produk[])

      // Rekap PO seluruh produk toko ini, sekali query
      const { data: progres } = await supabase
        .from('preorder_progress')
        .select('produk_id, po_selesai, po_target, po_maks, sedang_buka, terkumpul')
        .eq('toko_id', tokoData.id)
      setProgresPo(Object.fromEntries((progres ?? []).map((r: ProgresPO) => [r.produk_id, r])))

      // Pesanan milik toko ini, beserta itemnya. Satu baris pesanan = satu toko,
      // jadi cukup filter toko_id — tidak perlu menyaring per produk lagi.
      const { data: pesananData, error: errPesanan } = await supabase.from('pesanan')
        .select('id, nomor_pesanan, penerima_nama, penerima_hp, alamat_kirim, metode_bayar, total, status, payment_status, no_resi, kurir, created_at, dikirim_at, paid_at, batas_kirim, pesanan_items(id, produk_id, nama_produk, harga, qty, subtotal, foto_url, varian_nama, is_preorder, po_janji_kirim)')
        .eq('toko_id', tokoData.id)
        .order('created_at', { ascending: false })

      if (errPesanan) notif('Gagal memuat pesanan: ' + errPesanan.message)
      setPesanan((pesananData ?? []) as unknown as Pesanan[])
      setLoading(false)
    }
    load()
  }, [])

  function notif(msg: string) { setPesan(msg); setTimeout(() => setPesan(''), 4000) }

  // Stok induk jadi read-only begitu produk punya ukuran, karena angkanya
  // diturunkan dari jumlah stok varian
  const produkPunyaVarian = varian.some(v => v.nama.trim() !== '')

  async function bukaEdit(p: Produk) {
    setEditId(p.id)
    setEditData({ nama: p.nama, harga: p.harga, kategori: p.kategori, stok: p.stok, deskripsi: p.deskripsi, urutan: p.urutan, foto_url: p.foto_url })
    setEditFoto(null)
    setEditPreview(null)
    setFormPo(formPODari(p))

    const v = await muatVarian(p.id)
    setVarian(v)
    setVarianIdAwal(v.map(x => x.id).filter(Boolean) as string[])
  }

  function handleEditFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditFoto(file)
    setEditPreview(URL.createObjectURL(file))
  }

  async function simpanEdit() {
    if (!editId) return

    // Diperiksa sebelum apa pun disimpan, supaya penjual dapat pesan yang
    // jelas dan tidak ada foto terlanjur terunggah untuk data yang ditolak
    const salahPo = validasiFormPO(formPo)
    if (salahPo) { notif(salahPo); return }

    setSaving(true)

    let foto_url: string | null | undefined = editData.foto_url
    if (editFoto) {
      const { url, error: uploadErr } = await uploadFotoProduk(editFoto)
      if (uploadErr) { notif('Gagal upload foto: ' + uploadErr); setSaving(false); return }
      foto_url = url
    }

    const urutanBaru = keAngka(editData.urutan)

    // Varian disimpan lebih dulu supaya stok induk bisa dihitung dari hasilnya
    const adaVarian = varian.some(v => v.nama.trim() !== '')
    if (varian.length > 0 || varianIdAwal.length > 0) {
      const errVarian = await simpanVarian(editId, varian, varianIdAwal)
      if (errVarian) { notif('Gagal simpan varian: ' + errVarian); setSaving(false); return }
    }

    // Produk bervarian: stok induk selalu ikut jumlah stok varian aktif.
    // Produk PO tidak memakai stok sama sekali, jadi dikunci 0.
    const kolomPo = formPOKeKolom(formPo)
    const stokBaru = formPOAktif(formPo) ? 0 : (adaVarian ? totalStok(varian) : keAngka(editData.stok))

    const { error } = await supabase.from('produk').update({
      nama: editData.nama, harga: keAngka(editData.harga),
      kategori: editData.kategori, stok: stokBaru,
      deskripsi: editData.deskripsi, urutan: urutanBaru, foto_url,
      ...kolomPo,
    }).eq('id', editId)

    if (!error) {
      setProduk(prev => prev.map(p => p.id === editId ? { ...p, ...editData, ...kolomPo, harga: keAngka(editData.harga), stok: stokBaru, urutan: urutanBaru, foto_url } as Produk : p))
      notif('Produk berhasil diperbarui!')
      setEditId(null)
    } else notif('Gagal: ' + error.message)
    setSaving(false)
  }

  async function hapusProduk(id: string) {
    setMenghapus(true)
    const { error } = await supabase.from('produk').delete().eq('id', id)
    if (!error) {
      setProduk(prev => prev.filter(p => p.id !== id))
      notif('Produk dihapus.')
    } else notif('Gagal hapus: ' + error.message)
    setMenghapus(false)
    setHapusId(null)
  }

  // Baca ulang satu baris pesanan setelah RPC. RPC hanya mengembalikan
  // {ok, status}, sementara cap waktu dan batas_kirim diisi di dalam sana —
  // menebak nilainya di klien akan meleset.
  async function segarkanPesanan(id: string) {
    const { data } = await supabase.from('pesanan')
      .select('id, status, payment_status, paid_at, no_resi, kurir, dikirim_at, batas_kirim, alasan_batal')
      .eq('id', id)
      .maybeSingle()
    if (data) setPesanan(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }

  // Satu-satunya pintu perpindahan status. Siapa boleh apa dan perpindahan
  // mana yang sah sudah diputuskan `ubah_status_pesanan`; di sini tidak ada
  // validasi yang mengulanginya, dan pesan errornya ditampilkan apa adanya.
  async function ubahStatus(id: string, status: string, resi?: string, kurirNama?: string) {
    setProsesId(id)
    try {
      const { error } = await supabase.rpc('ubah_status_pesanan', {
        p_pesanan_id: id,
        p_status_baru: status,
        p_no_resi: resi ?? null,
        p_kurir: kurirNama ?? null,
      })
      if (error) throw new Error(error.message)

      await segarkanPesanan(id)
      notif(`Status pesanan diubah jadi "${status}".`)
      tutupKirim()
    } catch (e) {
      notif('Gagal ubah status: ' + (e instanceof Error ? e.message : 'coba lagi'))
    } finally {
      setProsesId(null)
    }
  }

  // Pembatalan punya RPC sendiri karena ikut membuat antrean refund kalau
  // pesanannya sudah lunas. p_oleh_sistem sengaja tidak pernah dikirim —
  // itu jalur untuk tugas terjadwal, bukan untuk pengguna.
  async function batalkanPesanan(id: string) {
    const alasan = alasanBatal.trim()
    if (!alasan) { notif('Gagal: alasan pembatalan wajib diisi'); return }

    setProsesId(id)
    try {
      const { error } = await supabase.rpc('batalkan_pesanan', {
        p_pesanan_id: id,
        p_alasan: alasan,
      })
      if (error) throw new Error(error.message)

      await segarkanPesanan(id)
      notif('Pesanan dibatalkan.')
      setBatalId(null)
      setAlasanBatal('')
    } catch (e) {
      notif('Gagal membatalkan: ' + (e instanceof Error ? e.message : 'coba lagi'))
    } finally {
      setProsesId(null)
    }
  }

  function mulaiKirim(p: Pesanan) {
    setBatalId(null)
    setKirimId(p.id)
    setKurir(p.kurir ?? '')
    setNoResi(p.no_resi ?? '')
  }

  function tutupKirim() {
    setKirimId(null)
    setKurir('')
    setNoResi('')
  }

  // Resi wajib karena database menolak tanpa itu; kurir boleh kosong.
  function konfirmasiKirim(id: string) {
    if (!noResi.trim()) { notif('Gagal: nomor resi wajib diisi'); return }
    ubahStatus(id, 'dikirim', noResi.trim(), kurir.trim() || undefined)
  }

  // Statistik
  const totalPendapatan = pesanan.filter(p => p.status === 'selesai').reduce((s, p) => s + (p.total ?? 0), 0)
  const totalTerjual = produk.reduce((s, p) => s + (p.terjual || 0), 0)
  const pesananAktif = pesanan.filter(p => ['menunggu', 'dibayar', 'diproses'].includes(p.status)).length

  if (tampilSkeleton) return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>
        <Skeleton tinggi={18} lebar="45%" style={{ marginBottom: '16px' }} />
        <Skeleton tinggi={44} radius={10} style={{ marginBottom: '16px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} tinggi={92} radius={10} />)}
        </div>
        <DaftarSkeletonPesanan jumlah={2} />
      </div>
    </main>
  )

  if (noToko) return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏪</div>
        <div style={{ fontSize: '16px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>Kamu belum punya toko</div>
        <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '24px' }}>Tambah produk pertama untuk membuat toko otomatis</div>
        <Link href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '12px 24px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
          + Tambah Produk Pertama
        </Link>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      {/* Edit modal */}
      {editId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '440px', margin: 'auto' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#0C447C', marginBottom: '16px' }}>Edit Produk</div>

            {/* Foto di edit modal */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Foto Produk</label>
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', height: '140px', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(editPreview || editData.foto_url) ? (
                  <img src={editPreview ?? editData.foto_url ?? ''} alt="preview" style={{ width: '100%', height: '140px', objectFit: 'contain', background: '#f5f5f5', display: 'block' }} />
                ) : (
                  <span style={{ fontSize: '36px' }}>📷</span>
                )}
              </div>
              <input ref={editFotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEditFoto} style={{ display: 'none' }} />
              <button onClick={() => editFotoRef.current?.click()} style={{ width: '100%', padding: '7px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '12px', color: '#0C447C', background: '#f0f5fb', cursor: 'pointer' }}>
                {editData.foto_url || editPreview ? 'Ganti Foto' : 'Pilih Foto'}
              </button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Nama Produk</label>
              <input
                value={editData.nama ?? ''}
                onChange={e => setEditData(prev => ({ ...prev, nama: e.target.value }))}
                style={{ width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', minHeight: '44px' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Harga</label>
              <InputHarga
                nilai={editData.harga ?? ''}
                onChange={v => setEditData(prev => ({ ...prev, harga: v === '' ? undefined : Number(v) }))}
              />
            </div>
            {/* Status barang ditaruh sebelum stok, karena pilihannya yang
                menentukan apakah kolom stok muncul */}
            <EditorPreorder nilai={formPo} onChange={setFormPo} />

            {/* Kolom stok hanya untuk ready stock — barang pre-order belum ada
                wujudnya, yang membatasi pemesanan adalah periode dan kuota */}
            <div style={{ marginBottom: '10px', display: formPo.status === 'ready' ? 'block' : 'none' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Stok</label>
              <input
                value={produkPunyaVarian ? totalStok(varian) : (editData.stok ?? '')}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '')
                  setEditData(prev => ({ ...prev, stok: v === '' ? undefined : Number(v) }))
                }}
                readOnly={produkPunyaVarian}
                inputMode="numeric"
                pattern="[0-9]*"
                style={{
                  width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef',
                  borderRadius: '8px', fontSize: '13px', outline: 'none',
                  boxSizing: 'border-box', minHeight: '44px',
                  background: produkPunyaVarian ? '#f0f5fb' : '#fff',
                  color: produkPunyaVarian ? '#5a7da0' : '#1a1a1a',
                  cursor: produkPunyaVarian ? 'not-allowed' : 'text',
                }}
              />
              {produkPunyaVarian && (
                <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '4px' }}>
                  Dihitung otomatis dari stok ukuran. Ubah di tabel ukuran di bawah.
                </div>
              )}
            </div>

            <EditorVarian baris={varian} onChange={setVarian} />

            {/* Urutan hanya relevan untuk toko resmi, karena produknya yang
                tampil di section merchandise beranda */}
            {toko?.is_official && (
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>
                  Urutan Tampil
                </label>
                <input
                  value={editData.urutan ?? ''}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '')
                    setEditData(prev => ({ ...prev, urutan: v === '' ? null : Number(v) }))
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  style={{ width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', minHeight: '44px' }}
                />
                <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '4px', lineHeight: 1.5 }}>
                  Angka kecil tampil lebih dulu di beranda. Kalau sama, yang terbaru di depan.
                </div>
              </div>
            )}

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Kategori</label>
              <select value={editData.kategori ?? ''} onChange={e => setEditData(prev => ({ ...prev, kategori: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' }}>
                {kategoris.map(k => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Deskripsi</label>
              <textarea rows={3} value={editData.deskripsi ?? ''} onChange={e => setEditData(prev => ({ ...prev, deskripsi: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Tombol varian="lembut" onClick={() => setEditId(null)} disabled={saving} style={{ flex: 1, background: '#f0f5fb', color: '#5a7da0' }}>Batal</Tombol>
              <Tombol onClick={simpanEdit} loading={saving} teksLoading="Menyimpan..." style={{ flex: 2 }}>Simpan Perubahan</Tombol>
            </div>
          </div>
        </div>
      )}

      <DialogKonfirmasi
        terbuka={!!hapusId}
        judul="Hapus produk ini?"
        pesan="Produk akan hilang dari etalase dan tidak bisa dikembalikan."
        memproses={menghapus}
        onBatal={() => setHapusId(null)}
        onKonfirmasi={() => hapusId && hapusProduk(hapusId)}
      />

      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>Dashboard Seller</div>
            <Link href={`/toko/${toko!.id}`} style={{ fontSize: '12px', color: '#0C447C', textDecoration: 'none' }}>
              🏪 {toko!.nama_toko} →
            </Link>
          </div>
          <Link href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', textDecoration: 'none' }}>
            + Produk
          </Link>
        </div>

        {/* Notif */}
        {pesan && (
          <div style={{ background: pesan.includes('Gagal') ? '#fce4e4' : '#e8f5e9', border: `0.5px solid ${pesan.includes('Gagal') ? '#f09595' : '#a5d6a7'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesan.includes('Gagal') ? '#c62828' : '#2e7d32', marginBottom: '12px' }}>
            {pesan}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: '10px', padding: '4px', border: '0.5px solid #c5d9ef', marginBottom: '16px' }}>
          {([['ringkasan', '📊', 'Ringkasan'], ['produk', '📦', 'Produk'], ['pesanan', '🧾', 'Pesanan']] as const).map(([key, emoji, text]) => (
            <button key={key} onClick={() => setTab(key)}
              className="tab-label"
              style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: tab === key ? '600' : '400', cursor: 'pointer', background: tab === key ? '#0C447C' : 'transparent', color: tab === key ? '#fff' : '#5a7da0' }}>
              <span className="tab-emoji">{emoji} </span>{text}
            </button>
          ))}
        </div>

        {/* ── TAB: RINGKASAN ── */}
        {tab === 'ringkasan' && (
          <div>
            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Total Produk', value: produk.length, icon: '📦', sub: `${produk.filter(p => p.stok > 0).length} aktif` },
                { label: 'Total Terjual', value: totalTerjual, icon: '🛒', sub: 'unit' },
                { label: 'Pesanan Aktif', value: pesananAktif, icon: '🔔', sub: 'perlu diproses' },
                { label: 'Pendapatan', value: fmt(totalPendapatan), icon: '💰', sub: 'dari pesanan selesai' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: '10px', padding: '14px', border: '0.5px solid #c5d9ef' }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0C447C' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: '#1a1a1a' }}>{s.label}</div>
                  <div style={{ fontSize: '10px', color: '#5a7da0' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Produk stok rendah */}
            {produk.filter(p => p.stok <= 3).length > 0 && (
              <div style={{ background: '#fff8e1', border: '0.5px solid #ffe082', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#f57f17', marginBottom: '8px' }}>⚠️ Stok Hampir Habis</div>
                {produk.filter(p => p.stok <= 3).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#795548', marginBottom: '4px' }}>
                    <span>{p.nama}</span>
                    <span style={{ fontWeight: '600' }}>Sisa {p.stok}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pesanan terbaru */}
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '10px' }}>Pesanan Terbaru</div>
            {pesanan.length === 0 ? (
              <EmptyState
                kecil
                ikon="🔔"
                judul="Belum ada pesanan masuk"
                pesan="Begitu ada alumni yang membeli, pesanannya muncul di sini dan kamu tinggal proses."
                aksiLabel="Lihat Produkku"
                onAksi={() => setTab('produk')}
              />
            ) : pesanan.slice(0, 5).map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: '10px', padding: '12px 14px', border: '0.5px solid #c5d9ef', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.penerima_nama ?? 'Tanpa nama'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5a7da0' }}>{fmtTgl(p.created_at)} · {fmt(p.total ?? 0)}</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', flexShrink: 0, ...warnaStatus(p.status) }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: PRODUK ── */}
        {tab === 'produk' && (
          <div>
            {produk.length === 0 ? (
              <EmptyState
                ikon="📦"
                judul="Etalasemu masih kosong"
                pesan="Unggah produk pertamamu — seluruh alumni Superfive bisa langsung melihatnya."
                aksiLabel="+ Tambah Produk"
                aksiHref="/produk/tambah"
              />
            ) : produk.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: '10px', padding: '14px', border: '0.5px solid #c5d9ef', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <FotoProduk src={p.foto_url} kategori={p.kategori} height={48} fontSize={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nama}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C' }}>{fmt(p.harga)}</div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#5a7da0', marginTop: '2px', flexWrap: 'wrap' }}>
                      {/* Stok tidak bermakna untuk produk PO — diganti lencana */}
                      {p.is_preorder
                        ? <BadgePreorder aktif kecil />
                        : <span>Stok: <strong style={{ color: p.stok <= 3 ? '#e65100' : '#1a1a1a' }}>{p.stok}</strong></span>}
                      <span>Terjual: {p.terjual || 0}</span>
                      {toko?.is_official && (
                        <span style={{ color: '#8a5a05', fontWeight: '600' }}>Urutan: {p.urutan ?? 0}</span>
                      )}
                      <span>⭐ {p.rating || '5.0'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => bukaEdit(p)} style={{ background: '#E6F1FB', color: '#0C447C', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => setHapusId(p.id)} style={{ background: '#fce4e4', color: '#c62828', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Hapus</button>
                  </div>
                </div>

                {p.is_preorder && <RekapPO progres={progresPo[p.id]} />}
              </div>
            ))}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <Link href="/produk/tambah" style={{ background: '#fff', border: '1px dashed #378ADD', color: '#0C447C', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', display: 'inline-block' }}>
                + Tambah Produk Baru
              </Link>
            </div>
          </div>
        )}

        {/* ── TAB: PESANAN ── */}
        {tab === 'pesanan' && (
          <div>
            {pesanan.length === 0 ? (
              <EmptyState
                ikon="🧾"
                judul="Belum ada pesanan masuk"
                pesan="Sabar ya — pesanan pertama biasanya datang setelah produkmu dilihat beberapa alumni."
                aksiLabel="Kelola Produk"
                onAksi={() => setTab('produk')}
              />
            ) : pesanan.map(p => {
              const aksi = aksiPenjual(p.status)
              const sedangProses = prosesId === p.id
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #c5d9ef', marginBottom: '10px', overflow: 'hidden' }}>

                  {/* Header pesanan */}
                  <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #e8f0f8', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#0C447C', fontFamily: 'monospace' }}>
                        {p.nomor_pesanan ?? '—'}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginTop: '2px' }}>
                        {p.penerima_nama ?? 'Tanpa nama'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#5a7da0' }}>
                        {p.penerima_hp ?? '-'} · {fmtTgl(p.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', ...warnaStatus(p.status) }}>
                        {p.status}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 9px', borderRadius: '20px', ...warnaPembayaran(p.payment_status) }}>
                        {labelPembayaran(p.payment_status)}
                      </span>
                    </div>
                  </div>

                  {/* Item pesanan */}
                  <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #e8f0f8' }}>
                    {p.pesanan_items.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#c62828' }}>⚠️ Pesanan ini tidak punya item</div>
                    ) : p.pesanan_items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12px', color: '#444', marginBottom: '6px' }}>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.nama_produk} x{item.qty}
                          </span>
                          {/* Ukuran wajib terlihat penjual — ini yang menentukan
                              barang mana yang harus dikemas */}
                          {item.varian_nama && (
                            <span style={{
                              display: 'inline-block', marginTop: '2px',
                              background: '#E6F1FB', color: '#0C447C',
                              fontSize: '10px', fontWeight: '700',
                              padding: '2px 7px', borderRadius: '4px',
                            }}>
                              {/* Snapshot dari create_pesanan sudah berisi
                                  tipe varian, misalnya "Ukuran XXL" */}
                              {item.varian_nama}
                            </span>
                          )}
                          {/* Snapshot PO saat pesanan dibuat, bukan status
                              produk sekarang — supaya riwayat tetap utuh */}
                          {item.is_preorder && (
                            <span style={{ display: 'block', marginTop: '3px' }}>
                              <BadgePreorder aktif kecil />
                              {item.po_janji_kirim && (
                                <span style={{ fontSize: '10px', color: WARNA_PO_TUA, marginLeft: '5px' }}>
                                  🚚 {janjiKirim(item.po_janji_kirim)}
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                        <span style={{ color: '#0C447C', fontWeight: '500', flexShrink: 0 }}>{fmt(item.subtotal)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#1a1a1a', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e8f0f8' }}>
                      <span>Total</span>
                      <span style={{ color: '#0C447C' }}>{fmt(p.total ?? 0)}</span>
                    </div>
                  </div>

                  {/* Info pengiriman */}
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#5a7da0', whiteSpace: 'pre-line' }}>
                      📍 {p.alamat_kirim ?? '-'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5a7da0' }}>
                      💳 {(p.metode_bayar ?? '-').replace(/_/g, ' ')}
                      {p.paid_at && ` · dibayar ${fmtTgl(p.paid_at)}`}
                    </div>

                    {/* Tenggat kirim hanya relevan selama barangnya belum
                        jalan. Lewat tenggat, sistem membatalkan pesanan dan
                        mengembalikan dana — penjual kehilangan penjualannya. */}
                    {['dibayar', 'diproses'].includes(p.status) && (
                      <TenggatKirim batasKirim={p.batas_kirim} />
                    )}

                    {p.no_resi && (
                      <div style={{ fontSize: '11px', color: '#e65100', background: '#fff3e0', padding: '6px 10px', borderRadius: '6px' }}>
                        🚚 {p.kurir ?? 'Kurir'} · Resi <strong>{p.no_resi}</strong>
                      </div>
                    )}

                    {/* Form kurir & resi, hanya saat mau menandai dikirim */}
                    {kirimId === p.id ? (
                      <div style={{ background: '#f0f5fb', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#0C447C' }}>Detail Pengiriman</div>

                        <div>
                          <label htmlFor={`resi-${p.id}`} style={{ display: 'block', fontSize: '11px', color: '#5a7da0', marginBottom: '4px' }}>
                            Nomor resi *
                          </label>
                          <input
                            id={`resi-${p.id}`}
                            value={noResi}
                            onChange={e => setNoResi(e.target.value)}
                            placeholder="Contoh: JP1234567890"
                            autoComplete="off"
                            style={{ width: '100%', padding: '10px', border: '0.5px solid #c5d9ef', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', background: '#fff', minHeight: '40px' }}
                          />
                        </div>

                        <div>
                          <label htmlFor={`kurir-${p.id}`} style={{ display: 'block', fontSize: '11px', color: '#5a7da0', marginBottom: '4px' }}>
                            Kurir <span style={{ color: '#9ab4cc' }}>(opsional)</span>
                          </label>
                          <input
                            id={`kurir-${p.id}`}
                            value={kurir}
                            onChange={e => setKurir(e.target.value)}
                            placeholder="Misal JNE, J&T, SiCepat"
                            autoComplete="off"
                            style={{ width: '100%', padding: '10px', border: '0.5px solid #c5d9ef', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', background: '#fff', minHeight: '40px' }}
                          />
                        </div>

                        {/* Bukan sekadar aturan form: tanpa resi, RPC-nya
                            menolak dan pesanan tidak berpindah status */}
                        <div style={{ fontSize: '11px', color: '#5a7da0', lineHeight: 1.5 }}>
                          Nomor resi wajib diisi — pesanan tidak bisa ditandai
                          dikirim tanpa itu, karena pembeli memakainya untuk
                          melacak paket.
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={tutupKirim}
                            style={{ flex: 1, background: '#fff', color: '#5a7da0', border: '0.5px solid #c5d9ef', padding: '8px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => konfirmasiKirim(p.id)}
                            disabled={sedangProses || !noResi.trim()}
                            style={{
                              flex: 2,
                              background: sedangProses || !noResi.trim() ? '#7fa8c9' : '#0C447C',
                              color: '#fff', border: 'none', padding: '8px',
                              borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                              cursor: sedangProses || !noResi.trim() ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {sedangProses ? 'Menyimpan...' : 'Tandai Dikirim'}
                          </button>
                        </div>
                      </div>
                    ) : batalId === p.id ? (
                      <div style={{ background: '#fff5f5', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '0.5px solid #f09595' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#c62828' }}>Batalkan pesanan ini?</div>
                        <div style={{ fontSize: '11px', color: '#5a7da0', lineHeight: 1.5 }}>
                          {p.payment_status === 'lunas'
                            ? 'Pesanan sudah lunas — pembatalan otomatis membuat antrean pengembalian dana, dan alasan di bawah akan terbaca pembeli.'
                            : 'Alasan di bawah akan terbaca pembeli.'}
                        </div>
                        <input
                          value={alasanBatal}
                          onChange={e => setAlasanBatal(e.target.value)}
                          placeholder="Alasan — misal stok habis"
                          maxLength={200}
                          style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #c5d9ef', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => { setBatalId(null); setAlasanBatal('') }}
                            style={{ flex: 1, background: '#fff', color: '#5a7da0', border: '0.5px solid #c5d9ef', padding: '8px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Jangan
                          </button>
                          <button
                            onClick={() => batalkanPesanan(p.id)}
                            disabled={sedangProses}
                            style={{ flex: 2, background: sedangProses ? '#e0a5a5' : '#c62828', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                          >
                            {sedangProses ? 'Membatalkan...' : 'Ya, batalkan'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Daftar aksi datang dari mesin status di database.
                            Dari 'dibayar' ada dua jalan: proses dulu, atau
                            langsung kirim. */}
                        {aksi.map((tujuan, i) => (
                          <button
                            key={tujuan}
                            onClick={() => tujuan === 'dikirim' ? mulaiKirim(p) : ubahStatus(p.id, tujuan)}
                            disabled={sedangProses}
                            style={{
                              flex: i === 0 ? 2 : 1, minWidth: '120px',
                              background: sedangProses ? '#7fa8c9' : (i === 0 ? '#0C447C' : '#fff'),
                              color: sedangProses ? '#fff' : (i === 0 ? '#fff' : '#0C447C'),
                              border: i === 0 ? 'none' : '1px solid #0C447C',
                              padding: '9px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                              cursor: sedangProses ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {sedangProses ? 'Memproses...' : (AKSI_STATUS[tujuan] ?? tujuan)}
                          </button>
                        ))}
                        {bisaDibatalkan(p.status) && (
                          <button
                            onClick={() => { setKirimId(null); setBatalId(p.id); setAlasanBatal('') }}
                            disabled={sedangProses}
                            style={{ flex: 1, minWidth: '90px', background: '#fce4e4', color: '#c62828', border: 'none', padding: '9px', borderRadius: '6px', fontSize: '12px', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                          >
                            Batalkan
                          </button>
                        )}
                        {aksi.length === 0 && !bisaDibatalkan(p.status) && (
                          <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#5a7da0', padding: '9px' }}>
                            {p.status === 'dikirim'
                              ? 'Menunggu pembeli mengonfirmasi penerimaan'
                              : labelStatus(p.status)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
