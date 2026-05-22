'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { uploadFotoProduk } from '../../../lib/uploadFoto'
import Navbar from '../../components/Navbar'
import FotoProduk from '../../components/FotoProduk'

type Toko = { id: string; nama_toko: string; kategori: string }
type Produk = {
  id: string; nama: string; harga: number; kategori: string
  stok: number; terjual: number; rating: number; deskripsi: string
  foto_url?: string | null
}

const emojiKategori: Record<string, string> = {
  Teknologi: '💻', Fashion: '👗', Kuliner: '🍱',
  Properti: '🏠', Jasa: '🛠️', UMKM: '🏪',
}
function fmt(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }

export default function TokoSayaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [toko, setToko] = useState<Toko | null>(null)
  const [produk, setProduk] = useState<Produk[]>([])
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Produk>>({})
  const [editFoto, setEditFoto] = useState<File | null>(null)
  const [editPreview, setEditPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const editFotoRef = useRef<HTMLInputElement>(null)

  // Hapus konfirmasi
  const [hapusId, setHapusId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth?msg=login-required'); return }

      const { data: tokoData } = await supabase
        .from('toko').select('id, nama_toko, kategori')
        .eq('seller_id', user.id).single()

      if (!tokoData) { setLoading(false); return }
      setToko(tokoData)

      const { data: produkData } = await supabase
        .from('produk')
        .select('id, nama, harga, kategori, stok, terjual, rating, deskripsi, foto_url')
        .eq('toko_id', tokoData.id)
        .order('created_at', { ascending: false })
      setProduk((produkData ?? []) as Produk[])
      setLoading(false)
    }
    load()
  }, [])

  function notif(text: string, ok = true) {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3000)
  }

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
      if (uploadErr) { notif('Gagal upload foto: ' + uploadErr, false); setSaving(false); return }
      foto_url = url
    }
    const { error } = await supabase.from('produk').update({
      nama: editData.nama, harga: Number(editData.harga),
      kategori: editData.kategori, stok: Number(editData.stok),
      deskripsi: editData.deskripsi, foto_url,
    }).eq('id', editId)

    if (!error) {
      setProduk(prev => prev.map(p => p.id === editId
        ? { ...p, ...editData, harga: Number(editData.harga), stok: Number(editData.stok), foto_url } as Produk
        : p))
      notif('Produk berhasil diperbarui!')
      setEditId(null)
    } else notif('Gagal: ' + error.message, false)
    setSaving(false)
  }

  async function hapusProduk(id: string) {
    const { error } = await supabase.from('produk').delete().eq('id', id)
    if (!error) { setProduk(prev => prev.filter(p => p.id !== id)); notif('Produk dihapus.') }
    else notif('Gagal hapus: ' + error.message, false)
    setHapusId(null)
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px', color: '#5a7da0' }}>Memuat toko...</div>
      </main>
    )
  }

  // Belum punya toko
  if (!toko) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>🏪</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>Kamu belum punya toko</div>
          <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '24px' }}>
            Tambah produk pertama untuk membuat toko otomatis
          </div>
          <a href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '12px 28px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
            + Tambah Produk Pertama
          </a>
        </div>
      </main>
    )
  }

  const totalTerjual = produk.reduce((s, p) => s + (p.terjual || 0), 0)
  const totalPendapatan = produk.reduce((s, p) => s + (p.harga * (p.terjual || 0)), 0)

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      {/* Edit modal */}
      {editId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', width: '100%', maxWidth: '440px', margin: 'auto' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0C447C', marginBottom: '16px' }}>Edit Produk</div>

            {/* Foto edit */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ borderRadius: '8px', overflow: 'hidden', height: '140px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                {(editPreview || editData.foto_url)
                  ? <img src={editPreview ?? editData.foto_url ?? ''} alt="preview" style={{ width: '100%', height: '140px', objectFit: 'contain', background: '#f5f5f5' }} />
                  : <span style={{ fontSize: '36px' }}>📷</span>}
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
                  value={(editData as any)[f.key] ?? ''}
                  onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                  type={f.type}
                  style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Kategori</label>
              <select value={editData.kategori ?? ''} onChange={e => setEditData(prev => ({ ...prev, kategori: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' }}>
                {['Teknologi', 'Fashion', 'Kuliner', 'Properti', 'Jasa', 'UMKM'].map(k => <option key={k}>{k}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Deskripsi</label>
              <textarea value={editData.deskripsi ?? ''} onChange={e => setEditData(prev => ({ ...prev, deskripsi: e.target.value }))} rows={3} style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditId(null)} style={{ flex: 1, padding: '10px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#5a7da0', cursor: 'pointer' }}>Batal</button>
              <button onClick={simpanEdit} disabled={saving} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', background: saving ? '#7fa8c9' : '#0C447C', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {hapusId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '320px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>Hapus produk ini?</div>
            <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '20px' }}>Tindakan ini tidak bisa dibatalkan.</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setHapusId(null)} style={{ flex: 1, padding: '10px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', background: '#fff', color: '#5a7da0', cursor: 'pointer' }}>Batal</button>
              <button onClick={() => hapusProduk(hapusId)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', background: '#c62828', color: '#fff', cursor: 'pointer' }}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Header toko */}
      <div style={{ background: 'linear-gradient(135deg, #0C447C, #185FA5)', padding: '20px 16px 16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', color: '#7eb8f0', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Toko Saya</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
              {emojiKategori[toko.kategori] ?? '🏪'}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>{toko.nama_toko}</div>
              <div style={{ fontSize: '12px', color: '#B5D4F4' }}>{toko.kategori}</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'Produk', value: produk.length, icon: '📦' },
              { label: 'Terjual', value: totalTerjual, icon: '🛒' },
              { label: 'Pendapatan', value: fmt(totalPendapatan), icon: '💰', small: true },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', marginBottom: '2px' }}>{s.icon}</div>
                <div style={{ fontSize: s.small ? '11px' : '18px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: '#B5D4F4', marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>

        {/* Toast */}
        {toast && (
          <div style={{ background: toast.ok ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${toast.ok ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: toast.ok ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
            {toast.text}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>
            Daftar Produk {produk.length > 0 && <span style={{ color: '#5a7da0', fontWeight: '400' }}>({produk.length})</span>}
          </div>
          <a href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
            + Tambah Produk
          </a>
        </div>

        {/* Produk list */}
        {produk.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 20px', textAlign: 'center', border: '0.5px solid #e8f0f8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
            <div style={{ fontSize: '14px', color: '#5a7da0', marginBottom: '16px' }}>Belum ada produk di toko kamu</div>
            <a href="/produk/tambah" style={{ background: '#0C447C', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>
              + Tambah Produk Pertama
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {produk.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #e8f0f8', overflow: 'hidden', display: 'flex' }}>
                {/* Foto */}
                <div style={{ width: '90px', flexShrink: 0 }}>
                  <FotoProduk src={p.foto_url} kategori={p.kategori} height={90} fontSize={30} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nama}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0C447C', marginBottom: '4px' }}>
                    {fmt(p.harga)}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#5a7da0', marginBottom: '8px' }}>
                    <span>📦 Stok: {p.stok ?? 0}</span>
                    <span>🛒 {p.terjual || 0} terjual</span>
                    <span>⭐ {p.rating || '5.0'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a
                      href={`/produk/${p.id}`}
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', background: '#f0f5fb', color: '#0C447C', border: '0.5px solid #c5d9ef' }}
                    >
                      Lihat
                    </a>
                    <button
                      onClick={() => bukaEdit(p)}
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #c5d9ef' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setHapusId(p.id)}
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', background: '#fce4e4', color: '#c62828', border: '0.5px solid #f09595' }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link ke profil toko publik */}
        {produk.length > 0 && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <a href={`/toko/${toko.id}`} style={{ fontSize: '13px', color: '#0C447C', textDecoration: 'none', fontWeight: '600' }}>
              Lihat Halaman Toko Publik →
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
