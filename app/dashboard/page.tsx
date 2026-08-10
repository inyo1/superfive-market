'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { uploadFotoProduk } from '../../lib/uploadFoto'
import { statusBerikutnya, bisaDibatalkan, warnaStatus, labelStatus, warnaPembayaran, labelPembayaran, AKSI_STATUS } from '../../lib/statusPesanan'
import Navbar from '../components/Navbar'
import FotoProduk from '../components/FotoProduk'
import Skeleton, { DaftarSkeletonPesanan } from '../components/Skeleton'

type Toko = { id: string; nama_toko: string; kategori: string }
type Produk = { id: string; nama: string; harga: number; kategori: string; stok: number; terjual: number; rating: number; deskripsi: string; foto_url?: string | null }

type PesananItem = {
  id: string
  produk_id: string | null
  nama_produk: string
  harga: number
  qty: number
  subtotal: number
  foto_url: string | null
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

  // Edit produk
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Produk>>({})
  const [editFoto, setEditFoto] = useState<File | null>(null)
  const [editPreview, setEditPreview] = useState<string | null>(null)
  const editFotoRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  // Hapus konfirmasi
  const [hapusId, setHapusId] = useState<string | null>(null)

  // Form pengiriman — muncul saat penjual mau menandai pesanan "dikirim"
  const [kirimId, setKirimId] = useState<string | null>(null)
  const [kurir, setKurir] = useState('')
  const [noResi, setNoResi] = useState('')
  const [prosesId, setProsesId] = useState<string | null>(null)

  // Pesan
  const [pesan, setPesan] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data: tokoData } = await supabase.from('toko').select('id, nama_toko, kategori').eq('seller_id', user.id).single()
      if (!tokoData) { setNoToko(true); setLoading(false); return }
      setToko(tokoData)

      const { data: produkData } = await supabase.from('produk')
        .select('id, nama, harga, kategori, stok, terjual, rating, deskripsi, foto_url')
        .eq('toko_id', tokoData.id)
        .order('created_at', { ascending: false })
      setProduk((produkData ?? []) as Produk[])

      // Pesanan milik toko ini, beserta itemnya. Satu baris pesanan = satu toko,
      // jadi cukup filter toko_id — tidak perlu menyaring per produk lagi.
      const { data: pesananData, error: errPesanan } = await supabase.from('pesanan')
        .select('id, nomor_pesanan, penerima_nama, penerima_hp, alamat_kirim, metode_bayar, total, status, payment_status, no_resi, kurir, created_at, dikirim_at, paid_at, pesanan_items(id, produk_id, nama_produk, harga, qty, subtotal, foto_url)')
        .eq('toko_id', tokoData.id)
        .order('created_at', { ascending: false })

      if (errPesanan) notif('Gagal memuat pesanan: ' + errPesanan.message)
      setPesanan((pesananData ?? []) as unknown as Pesanan[])
      setLoading(false)
    }
    load()
  }, [])

  function notif(msg: string) { setPesan(msg); setTimeout(() => setPesan(''), 4000) }

  function bukaEdit(p: Produk) {
    setEditId(p.id)
    setEditData({ nama: p.nama, harga: p.harga, kategori: p.kategori, stok: p.stok, deskripsi: p.deskripsi, foto_url: p.foto_url })
    setEditFoto(null)
    setEditPreview(null)
  }

  function handleEditFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditFoto(file)
    setEditPreview(URL.createObjectURL(file))
  }

  async function simpanEdit() {
    if (!editId) return
    setSaving(true)

    let foto_url: string | null | undefined = editData.foto_url
    if (editFoto) {
      const { url, error: uploadErr } = await uploadFotoProduk(editFoto)
      if (uploadErr) { notif('Gagal upload foto: ' + uploadErr); setSaving(false); return }
      foto_url = url
    }

    const { error } = await supabase.from('produk').update({
      nama: editData.nama, harga: Number(editData.harga),
      kategori: editData.kategori, stok: Number(editData.stok),
      deskripsi: editData.deskripsi, foto_url,
    }).eq('id', editId)

    if (!error) {
      setProduk(prev => prev.map(p => p.id === editId ? { ...p, ...editData, harga: Number(editData.harga), stok: Number(editData.stok), foto_url } as Produk : p))
      notif('Produk berhasil diperbarui!')
      setEditId(null)
    } else notif('Gagal: ' + error.message)
    setSaving(false)
  }

  async function hapusProduk(id: string) {
    const { error } = await supabase.from('produk').delete().eq('id', id)
    if (!error) {
      setProduk(prev => prev.filter(p => p.id !== id))
      notif('Produk dihapus.')
    } else notif('Gagal hapus: ' + error.message)
    setHapusId(null)
  }

  // Satu pintu untuk semua perubahan status. Kolom terjual & selesai_at diisi
  // trigger database, jadi tidak pernah ditulis dari sini.
  async function ubahStatus(id: string, status: string, extra: Record<string, unknown> = {}) {
    setProsesId(id)
    try {
      const { data, error } = await supabase.from('pesanan')
        .update({ status, ...extra })
        .eq('id', id)
        .select('id, status, no_resi, kurir, dikirim_at')
        .single()

      if (error) throw new Error(error.message)
      if (!data) throw new Error('Pesanan tidak ditemukan atau kamu tidak punya akses')

      setPesanan(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
      notif(`Status pesanan diubah jadi "${status}".`)
      setKirimId(null)
      setKurir('')
      setNoResi('')
    } catch (e) {
      notif('Gagal ubah status: ' + (e instanceof Error ? e.message : 'coba lagi'))
    } finally {
      setProsesId(null)
    }
  }

  // Pembayaran masih transfer manual, jadi penjual yang mengonfirmasi sendiri
  // setelah dana masuk. Terpisah dari status pengiriman.
  async function tandaiLunas(id: string) {
    setProsesId(id)
    try {
      const { data, error } = await supabase.from('pesanan')
        .update({ payment_status: 'lunas', paid_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, payment_status, paid_at')
        .single()

      if (error) throw new Error(error.message)
      if (!data) throw new Error('Pesanan tidak ditemukan atau kamu tidak punya akses')

      setPesanan(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
      notif('Pembayaran ditandai lunas.')
    } catch (e) {
      notif('Gagal tandai lunas: ' + (e instanceof Error ? e.message : 'coba lagi'))
    } finally {
      setProsesId(null)
    }
  }

  function mulaiKirim(p: Pesanan) {
    setKirimId(p.id)
    setKurir(p.kurir ?? '')
    setNoResi(p.no_resi ?? '')
  }

  function konfirmasiKirim(id: string) {
    if (!kurir.trim()) { notif('Gagal: kurir wajib diisi'); return }
    if (!noResi.trim()) { notif('Gagal: nomor resi wajib diisi'); return }
    ubahStatus(id, 'dikirim', {
      kurir: kurir.trim(),
      no_resi: noResi.trim(),
      dikirim_at: new Date().toISOString(),
    })
  }

  // Statistik
  const totalPendapatan = pesanan.filter(p => p.status === 'selesai').reduce((s, p) => s + (p.total ?? 0), 0)
  const totalTerjual = produk.reduce((s, p) => s + (p.terjual || 0), 0)
  const pesananAktif = pesanan.filter(p => ['menunggu', 'dibayar', 'diproses'].includes(p.status)).length

  if (loading) return (
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
        <a href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '12px 24px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
          + Tambah Produk Pertama
        </a>
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

            {[
              { label: 'Nama Produk', key: 'nama', type: 'text' },
              { label: 'Harga (Rp)', key: 'harga', type: 'number' },
              { label: 'Stok', key: 'stok', type: 'number' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                <input
                  type={f.type}
                  value={(editData as any)[f.key] ?? ''}
                  onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
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
              <button onClick={() => setEditId(null)} style={{ flex: 1, background: '#f0f5fb', color: '#5a7da0', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Batal</button>
              <button onClick={simpanEdit} disabled={saving} style={{ flex: 2, background: '#0C447C', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hapus konfirmasi */}
      {hapusId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>Hapus produk ini?</div>
            <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '20px' }}>Tindakan ini tidak bisa dibatalkan.</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setHapusId(null)} style={{ flex: 1, background: '#f0f5fb', color: '#5a7da0', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Batal</button>
              <button onClick={() => hapusProduk(hapusId)} style={{ flex: 1, background: '#c62828', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>Dashboard Seller</div>
            <a href={`/toko/${toko!.id}`} style={{ fontSize: '12px', color: '#0C447C', textDecoration: 'none' }}>
              🏪 {toko!.nama_toko} →
            </a>
          </div>
          <a href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', textDecoration: 'none' }}>
            + Produk
          </a>
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
              <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', border: '0.5px solid #c5d9ef', textAlign: 'center', fontSize: '13px', color: '#5a7da0' }}>
                Belum ada pesanan masuk
              </div>
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
              <div style={{ background: '#fff', borderRadius: '10px', padding: '40px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
                <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '16px' }}>Belum ada produk</div>
                <a href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>+ Tambah Produk</a>
              </div>
            ) : produk.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: '10px', padding: '14px', border: '0.5px solid #c5d9ef', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <FotoProduk src={p.foto_url} kategori={p.kategori} height={48} fontSize={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nama}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C' }}>{fmt(p.harga)}</div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#5a7da0', marginTop: '2px' }}>
                      <span>Stok: <strong style={{ color: p.stok <= 3 ? '#e65100' : '#1a1a1a' }}>{p.stok}</strong></span>
                      <span>Terjual: {p.terjual || 0}</span>
                      <span>⭐ {p.rating || '5.0'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => bukaEdit(p)} style={{ background: '#E6F1FB', color: '#0C447C', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => setHapusId(p.id)} style={{ background: '#fce4e4', color: '#c62828', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Hapus</button>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <a href="/produk/tambah" style={{ background: '#fff', border: '1px dashed #378ADD', color: '#0C447C', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', display: 'inline-block' }}>
                + Tambah Produk Baru
              </a>
            </div>
          </div>
        )}

        {/* ── TAB: PESANAN ── */}
        {tab === 'pesanan' && (
          <div>
            {pesanan.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '10px', padding: '40px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🧾</div>
                <div style={{ fontSize: '13px', color: '#5a7da0' }}>Belum ada pesanan masuk</div>
              </div>
            ) : pesanan.map(p => {
              const berikutnya = statusBerikutnya(p.status)
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
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12px', color: '#444', marginBottom: '4px' }}>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.nama_produk} x{item.qty}
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

                    {/* Konfirmasi pembayaran manual, terpisah dari alur pengiriman */}
                    {p.payment_status === 'menunggu' && p.status !== 'dibatalkan' && (
                      <button
                        onClick={() => tandaiLunas(p.id)}
                        disabled={sedangProses}
                        style={{
                          width: '100%', background: '#e8f5e9', color: '#2e7d32',
                          border: '0.5px solid #a5d6a7', padding: '9px',
                          borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                          cursor: sedangProses ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {sedangProses ? 'Menyimpan...' : '💰 Tandai Sudah Dibayar'}
                      </button>
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
                        <input
                          value={kurir}
                          onChange={e => setKurir(e.target.value)}
                          placeholder="Kurir — misal JNE, J&T, SiCepat"
                          style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #c5d9ef', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                        />
                        <input
                          value={noResi}
                          onChange={e => setNoResi(e.target.value)}
                          placeholder="Nomor resi"
                          style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #c5d9ef', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setKirimId(null)}
                            style={{ flex: 1, background: '#fff', color: '#5a7da0', border: '0.5px solid #c5d9ef', padding: '8px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => konfirmasiKirim(p.id)}
                            disabled={sedangProses}
                            style={{ flex: 2, background: sedangProses ? '#7fa8c9' : '#0C447C', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                          >
                            {sedangProses ? 'Menyimpan...' : 'Tandai Dikirim'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {berikutnya && (
                          <button
                            onClick={() => berikutnya === 'dikirim' ? mulaiKirim(p) : ubahStatus(p.id, berikutnya)}
                            disabled={sedangProses}
                            style={{ flex: 2, background: sedangProses ? '#7fa8c9' : '#0C447C', color: '#fff', border: 'none', padding: '9px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                          >
                            {sedangProses ? 'Memproses...' : (AKSI_STATUS[berikutnya] ?? berikutnya)}
                          </button>
                        )}
                        {bisaDibatalkan(p.status) && (
                          <button
                            onClick={() => ubahStatus(p.id, 'dibatalkan', { dibatalkan_at: new Date().toISOString() })}
                            disabled={sedangProses}
                            style={{ flex: 1, background: '#fce4e4', color: '#c62828', border: 'none', padding: '9px', borderRadius: '6px', fontSize: '12px', cursor: sedangProses ? 'not-allowed' : 'pointer' }}
                          >
                            Batalkan
                          </button>
                        )}
                        {!berikutnya && !bisaDibatalkan(p.status) && (
                          <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#5a7da0', padding: '9px' }}>
                            {labelStatus(p.status)}
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
