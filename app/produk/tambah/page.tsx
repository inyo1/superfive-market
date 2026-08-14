'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { uploadFotoProduk } from '../../../lib/uploadFoto'
import Navbar from '../../components/Navbar'
import InputHarga from '../../components/InputHarga'
import Tombol from '../../components/Tombol'
import { keAngka } from '../../../lib/format'
import EditorPreorder from '../../components/EditorPreorder'
import { FORM_PO_KOSONG, validasiFormPO, formPOKeKolom, formPOAktif, type FormPO } from '../../../lib/preorder'

export default function TambahProduk() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [countdown, setCountdown] = useState(2)
  // Pintu berjualan. Yang belum disetujui admin tidak boleh sampai ke formulir,
  // karena baris toko-nya sudah terlanjur dibuat sebelum produknya disimpan.
  const [bolehJualan, setBolehJualan] = useState(false)
  const [nama, setNama] = useState('')
  const [harga, setHarga] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [kategori, setKategori] = useState('Teknologi')
  const [stok, setStok] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan] = useState('')
  const [formPo, setFormPo] = useState<FormPO>(FORM_PO_KOSONG)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setRedirecting(true)
        let sisa = 2
        timer = setInterval(() => {
          sisa -= 1
          setCountdown(sisa)
          if (sisa <= 0) {
            clearInterval(timer)
            router.replace('/auth')
          }
        }, 1000)
        return
      }

      const { data } = await supabase
        .from('users').select('status_penjual').eq('id', user.id).single()
      setBolehJualan(data?.status_penjual === 'aktif')
      setAuthChecked(true)
    })

    return () => clearInterval(timer)
  }, [])

  function handlePilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFoto(file)
    setPreview(URL.createObjectURL(file))
  }

  function hapusFoto() {
    setFoto(null)
    setPreview(null)
    if (inputFotoRef.current) inputFotoRef.current.value = ''
  }

  async function handleTambah() {
    if (!nama.trim() || !harga) { setPesan('Nama dan harga wajib diisi.'); return }

    // Diperiksa di sini supaya penjual dapat pesan yang jelas, bukan bunyi
    // constraint chk_po_periode dari Postgres
    const salahPo = validasiFormPO(formPo)
    if (salahPo) { setPesan(salahPo); return }

    setLoading(true)
    setPesan('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth?msg=login-required'); return }

    let tokoId: string | null = null
    const { data: toko } = await supabase.from('toko').select('id').eq('seller_id', user.id).single()
    tokoId = toko?.id ?? null

    if (!tokoId) {
      const { data: tokoData } = await supabase
        .from('toko')
        .insert({ seller_id: user.id, nama_toko: 'Toko Saya', kategori })
        .select()
        .single()
      tokoId = tokoData?.id ?? null
    }

    let foto_url: string | null = null
    if (foto) {
      const { url, error: uploadErr } = await uploadFotoProduk(foto)
      if (uploadErr) { setPesan('Gagal upload foto: ' + uploadErr); setLoading(false); return }
      foto_url = url
    }

    const { error } = await supabase.from('produk').insert({
      toko_id: tokoId,
      nama, harga: keAngka(harga),
      deskripsi, kategori,
      // Produk PO belum punya barang; stok dikunci 0 supaya tidak ada angka
      // menyesatkan kalau nanti PO-nya dimatikan
      stok: formPOAktif(formPo) ? 0 : keAngka(stok),
      foto_url,
      ...formPOKeKolom(formPo),
    })

    if (error) {
      setPesan('Gagal: ' + error.message)
    } else {
      setPesan('Produk berhasil ditambahkan!')
      setNama(''); setHarga(''); setDeskripsi(''); setStok('')
      setFormPo(FORM_PO_KOSONG)
      hapusFoto()
    }
    setLoading(false)
  }

  if (redirecting) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
            Silakan login dulu untuk menambah produk
          </div>
          <div style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '20px' }}>
            Mengarahkan ke halaman login dalam {countdown} detik...
          </div>
          <Link href="/auth" style={{
            display: 'inline-block', background: '#0C447C', color: '#fff',
            padding: '10px 24px', borderRadius: '8px', fontSize: '13px',
            fontWeight: '600', textDecoration: 'none',
          }}>
            Login Sekarang
          </Link>
        </div>
      </main>
    )
  }

  if (!authChecked) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5a7da0' }}>
          Memeriksa sesi...
        </div>
      </main>
    )
  }

  if (!bolehJualan) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ maxWidth: '440px', margin: '40px auto', padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '32px 20px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>💼</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
              Kamu belum terdaftar sebagai penjual
            </div>
            <p style={{ fontSize: '13px', color: '#5a7da0', lineHeight: '1.7', margin: '0 0 20px' }}>
              Ajukan diri jadi penjual dulu — alamat pengiriman, data rekening, dan
              persetujuan aturan. Setelah disetujui admin, kamu bisa memasang produk.
            </p>
            <Link href="/jual" style={{
              display: 'inline-flex', alignItems: 'center', background: '#0C447C', color: '#fff',
              padding: '0 22px', minHeight: '44px', borderRadius: '8px',
              fontSize: '13px', fontWeight: '600', textDecoration: 'none',
            }}>
              Mulai Berjualan
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 16px 40px' }}>

        <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 16px' }}>
          Tambah Produk
        </h1>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '0.5px solid #c5d9ef' }}>

          {/* Upload foto */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '6px' }}>Foto Produk</label>
            {preview ? (
              <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                <img src={preview} alt="preview" style={{ width: '100%', height: '200px', objectFit: 'contain', background: '#f5f5f5', display: 'block' }} />
                <button
                  onClick={hapusFoto}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >✕</button>
              </div>
            ) : (
              <div
                onClick={() => inputFotoRef.current?.click()}
                style={{ border: '1.5px dashed #c5d9ef', borderRadius: '10px', height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fbff', gap: '8px' }}
              >
                <span style={{ fontSize: '32px' }}>📷</span>
                <span style={{ fontSize: '12px', color: '#5a7da0' }}>Klik untuk pilih foto</span>
                <span style={{ fontSize: '11px', color: '#9ab4cc' }}>JPG, PNG, WEBP maks 5MB</span>
              </div>
            )}
            <input ref={inputFotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePilihFoto} style={{ display: 'none' }} />
          </div>

          {/* Nama */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Nama Produk *</label>
            <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama produk kamu" style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Status barang ditaruh sebelum harga, karena pilihannya yang
              menentukan apakah kolom stok muncul */}
          <EditorPreorder nilai={formPo} onChange={setFormPo} />

          {/* Kolom stok hanya untuk ready stock — barang pre-order belum ada
              wujudnya, yang membatasi pemesanan adalah periode dan kuota */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Harga *</label>
              <InputHarga nilai={harga} onChange={setHarga} placeholder="100.000" />
            </div>
            {formPo.status === 'ready' && (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Stok</label>
                <input value={stok} onChange={e => setStok(e.target.value.replace(/\D/g, ''))} inputMode="numeric" pattern="[0-9]*" placeholder="10" style={{ width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', minHeight: '44px' }} />
              </div>
            )}
          </div>

          {/* Kategori */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Kategori</label>
            <select value={kategori} onChange={e => setKategori(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' }}>
              {['Teknologi', 'Fashion', 'Kuliner', 'Properti', 'Jasa', 'UMKM'].map(k => <option key={k}>{k}</option>)}
            </select>
          </div>

          {/* Deskripsi */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Deskripsi</label>
            <textarea value={deskripsi} onChange={e => setDeskripsi(e.target.value)} rows={3} placeholder="Deskripsi produk kamu..." style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>

          {pesan && (
            <div style={{ background: pesan.includes('berhasil') ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesan.includes('berhasil') ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px', fontSize: '12px', color: pesan.includes('berhasil') ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
              {pesan}
              {pesan.includes('berhasil') && (
                <Link href="/toko/saya" style={{ display: 'block', marginTop: '6px', color: '#0C447C', fontWeight: '600', textDecoration: 'none' }}>
                  → Lihat Toko Saya
                </Link>
              )}
            </div>
          )}

          <Tombol
            onClick={handleTambah}
            loading={loading}
            teksLoading={foto ? 'Mengupload foto...' : 'Menyimpan...'}
            penuh
            style={{ padding: '14px', fontSize: '14px', borderRadius: '10px' }}
          >
            Tambah Produk
          </Tombol>
        </div>
      </div>
    </main>
  )
}
