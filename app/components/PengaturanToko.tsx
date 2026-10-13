'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadFotoProduk } from '../../lib/uploadFoto'
import { KATEGORI, kategoriSah, type PilihanKategori } from '../../lib/kategori'
import { useToast } from '../context/ToastContext'

type Isian = { nama_toko: string; deskripsi: string; kategori: PilihanKategori; foto_toko: string | null }

const gayaInput: React.CSSProperties = {
  width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef',
  borderRadius: '8px', fontSize: '13px', outline: 'none',
  boxSizing: 'border-box', minHeight: '44px', background: '#fff', fontFamily: 'inherit',
}
const gayaLabel: React.CSSProperties = { fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }
const gayaBantuan: React.CSSProperties = { fontSize: '11px', color: '#9ab4cc', marginTop: '4px', lineHeight: 1.5 }

/**
 * Pengaturan Toko — nama, deskripsi, kategori, dan foto toko.
 *
 * Toko dibuat database saat pengajuan penjual disetujui, dengan nama_toko =
 * nama penjual dan kategori 'UMKM'. Di sinilah penjual menggantinya. UPDATE
 * langsung ke `toko` (RLS toko_update_own: pemilik atau admin) — satu tabel,
 * satu permintaan, jadi tidak perlu RPC. `is_official` tidak pernah dikirim;
 * trg_jaga_toko_official menahannya untuk yang bukan admin.
 *
 * /toko/[id] masih punya sunting cepat nama + deskripsi untuk pemilik. Kalau
 * aturan nama toko berubah, periksa keduanya.
 */
export default function PengaturanToko({ tokoId, onTersimpan }: {
  tokoId: string
  /** Dipanggil dengan nilai yang tersimpan, supaya header dashboard ikut berubah */
  onTersimpan?: (toko: { nama_toko: string; kategori: string }) => void
}) {
  const toast = useToast()
  const [isian, setIsian] = useState<Isian | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [pratinjau, setPratinjau] = useState<string | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const inputFoto = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let hidup = true
    supabase.from('toko').select('nama_toko, deskripsi, kategori, foto_toko').eq('id', tokoId).maybeSingle()
      .then(({ data, error }) => {
        if (!hidup) return
        if (error || !data) { setGalat('Gagal memuat pengaturan toko' + (error ? ': ' + error.message : '.')); return }
        setIsian({
          nama_toko: data.nama_toko ?? '',
          deskripsi: data.deskripsi ?? '',
          // Data lama di luar enam kategori tidak dipaksakan jadi pilihan
          // yang salah — penjual diminta memilih ulang
          kategori: kategoriSah(data.kategori) ? data.kategori : '',
          foto_toko: data.foto_toko ?? null,
        })
      })
    return () => { hidup = false }
  }, [tokoId])

  useEffect(() => () => { if (pratinjau) URL.revokeObjectURL(pratinjau) }, [pratinjau])

  function ubah<K extends keyof Isian>(k: K, v: Isian[K]) {
    setIsian(prev => (prev ? { ...prev, [k]: v } : prev))
    setGalat(null)
  }

  function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { setGalat('File harus berupa gambar.'); return }
    setFoto(f)
    setPratinjau(URL.createObjectURL(f))
    setGalat(null)
  }

  async function simpan() {
    if (!isian || menyimpan) return
    const nama = isian.nama_toko.trim()
    if (!nama) { setGalat('Nama toko wajib diisi.'); return }
    if (!isian.kategori) { setGalat('Pilih dulu kategori toko.'); return }

    setMenyimpan(true)
    setGalat(null)
    try {
      let fotoUrl = isian.foto_toko
      if (foto) {
        const { url, error } = await uploadFotoProduk(foto)
        if (error || !url) throw new Error('Gagal mengunggah foto: ' + (error ?? 'tidak diketahui'))
        fotoUrl = url
      }

      const { data, error } = await supabase
        .from('toko')
        .update({ nama_toko: nama, deskripsi: isian.deskripsi.trim() || null, kategori: isian.kategori, foto_toko: fotoUrl })
        .eq('id', tokoId)
        .select('nama_toko, deskripsi, kategori, foto_toko')
        .maybeSingle()
      if (error) throw new Error(error.message)
      // RLS yang menolak UPDATE tidak melempar error — barisnya saja yang
      // tidak kembali
      if (!data) throw new Error('perubahan tidak tersimpan')

      setIsian({ nama_toko: data.nama_toko, deskripsi: data.deskripsi ?? '', kategori: data.kategori, foto_toko: data.foto_toko })
      setFoto(null)
      setPratinjau(null)
      if (inputFoto.current) inputFoto.current.value = ''
      onTersimpan?.({ nama_toko: data.nama_toko, kategori: data.kategori })
      toast.sukses('Pengaturan toko tersimpan.')
    } catch (e) {
      setGalat('Gagal menyimpan: ' + (e as Error).message)
    } finally {
      setMenyimpan(false)
    }
  }

  const kotak: React.CSSProperties = { background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }

  if (!isian) {
    return (
      <div style={kotak}>
        <div style={{ fontSize: '13px', color: galat ? '#c62828' : '#5a7da0' }}>{galat ?? 'Memuat pengaturan toko…'}</div>
      </div>
    )
  }

  const gambar = pratinjau ?? isian.foto_toko

  return (
    <div style={kotak}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>Pengaturan Toko</div>
      <p style={{ fontSize: '12px', color: '#5a7da0', lineHeight: 1.6, margin: '0 0 16px' }}>
        Nama dan kategori tokomu diisi otomatis saat pengajuan disetujui. Ganti sesuai usahamu.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          background: '#E6F1FB', color: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', fontWeight: 800,
        }}>
          {gambar
            // eslint-disable-next-line @next/next/no-img-element -- pratinjau blob: tidak bisa lewat next/image
            ? <img src={gambar} alt="Foto toko" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (isian.nama_toko.trim()[0] ?? '?').toUpperCase()}
        </div>
        <div>
          <input ref={inputFoto} id="foto-toko" type="file" accept="image/*" onChange={pilihFoto} style={{ display: 'none' }} />
          <label htmlFor="foto-toko" style={{
            display: 'inline-flex', alignItems: 'center', minHeight: '36px', padding: '0 14px', borderRadius: '8px',
            border: '1px solid #0C447C', color: '#0C447C', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>
            {gambar ? 'Ganti Foto' : 'Pilih Foto'}
          </label>
          <div style={gayaBantuan}>Opsional. Logo atau foto usahamu.</div>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="nama-toko" style={gayaLabel}>Nama Toko</label>
        <input id="nama-toko" value={isian.nama_toko} onChange={e => ubah('nama_toko', e.target.value)} maxLength={80} style={gayaInput} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="kategori-toko" style={gayaLabel}>Kategori</label>
        <select id="kategori-toko" value={isian.kategori} onChange={e => ubah('kategori', e.target.value as PilihanKategori)} style={{ ...gayaInput, cursor: 'pointer' }}>
          <option value="" disabled>-- Pilih Kategori --</option>
          {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="deskripsi-toko" style={gayaLabel}>Deskripsi <span style={{ color: '#9ab4cc' }}>(opsional)</span></label>
        <textarea id="deskripsi-toko" value={isian.deskripsi} onChange={e => ubah('deskripsi', e.target.value)} rows={3}
          placeholder="Ceritakan singkat apa yang kamu jual."
          style={{ ...gayaInput, minHeight: '76px', resize: 'vertical' }} />
      </div>

      {galat && <div style={{ fontSize: '12px', color: '#c62828', marginBottom: '10px' }}>{galat}</div>}

      <button onClick={simpan} disabled={menyimpan} style={{
        width: '100%', background: menyimpan ? '#7fa8c9' : '#0C447C', color: '#fff', border: 'none', padding: '12px',
        borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: menyimpan ? 'not-allowed' : 'pointer', minHeight: '44px',
      }}>
        {menyimpan ? 'Menyimpan…' : 'Simpan Pengaturan Toko'}
      </button>
    </div>
  )
}
