'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../components/Navbar'
import InputPassword from '../../components/InputPassword'
import Skeleton from '../../components/Skeleton'
import { useToast } from '../../context/ToastContext'

const MIN_PANJANG = 8

type Kekuatan = { label: string; skor: number; warna: string }

// Penilaian sederhana dan bisa ditebak penggunanya: panjang plus ragam
// karakter. Bukan pengukur entropi sungguhan, hanya penuntun.
function nilaiKekuatan(s: string): Kekuatan {
  if (!s) return { label: '', skor: 0, warna: '#dde8f4' }

  let skor = 0
  if (s.length >= MIN_PANJANG) skor++
  if (s.length >= 12) skor++
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) skor++
  if (/\d/.test(s)) skor++
  if (/[^A-Za-z0-9]/.test(s)) skor++

  if (s.length < MIN_PANJANG) return { label: 'Lemah', skor: 1, warna: '#c62828' }
  if (skor <= 2) return { label: 'Lemah', skor: 1, warna: '#c62828' }
  if (skor <= 3) return { label: 'Sedang', skor: 2, warna: '#EF9F27' }
  return { label: 'Kuat', skor: 3, warna: '#2e7d32' }
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const toast = useToast()

  const [memeriksa, setMemeriksa] = useState(true)
  const [sesiValid, setSesiValid] = useState(false)
  const [pesanLink, setPesanLink] = useState('')

  const [sandi, setSandi] = useState('')
  const [ulangi, setUlangi] = useState('')
  const [galatSandi, setGalatSandi] = useState('')
  const [galatUlangi, setGalatUlangi] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  // Link dari email membawa token di fragment URL. Supabase memprosesnya
  // sendiri lalu memunculkan sesi pemulihan, jadi di sini cukup menunggu
  // sesinya ada — sambil tetap membaca pesan galat kalau linknya kedaluwarsa.
  useEffect(() => {
    let sudah = false

    function tandaiValid() {
      if (sudah) return
      sudah = true
      setSesiValid(true)
      setMemeriksa(false)
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) tandaiValid()
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) tandaiValid()
    })

    // Kalau setelah jeda ini belum ada sesi, berarti linknya memang tidak sah.
    // Alasannya dibaca dari fragment URL yang diisi Supabase, misalnya
    // #error=access_denied&error_description=...
    const t = setTimeout(() => {
      if (sudah) return
      const frag = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const galatUrl = frag.get('error_description') ?? frag.get('error')
      if (galatUrl) setPesanLink(galatUrl.replace(/\+/g, ' '))
      setMemeriksa(false)
    }, 2500)

    return () => { listener.subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  const kekuatan = nilaiKekuatan(sandi)

  function periksa(): boolean {
    let ok = true
    setGalatSandi('')
    setGalatUlangi('')

    if (sandi.length < MIN_PANJANG) {
      setGalatSandi(`Kata sandi minimal ${MIN_PANJANG} karakter.`)
      ok = false
    }
    if (ulangi !== sandi) {
      setGalatUlangi('Kedua kata sandi belum sama.')
      ok = false
    }
    return ok
  }

  async function simpan() {
    if (menyimpan) return
    if (!periksa()) return

    setMenyimpan(true)
    const { error } = await supabase.auth.updateUser({ password: sandi })
    setMenyimpan(false)

    if (error) {
      setGalatSandi('Gagal menyimpan: ' + error.message)
      return
    }

    // updateUser mempertahankan sesi, jadi pengguna langsung masuk
    toast.sukses('Kata sandi berhasil diubah. Selamat datang kembali!')
    router.replace('/')
  }

  const gayaGalat: React.CSSProperties = {
    fontSize: '12px', color: '#c62828', marginTop: '5px', lineHeight: 1.5,
  }

  if (memeriksa) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ maxWidth: '380px', margin: '30px auto', padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '0.5px solid #c5d9ef' }}>
            <Skeleton tinggi={60} lebar={60} radius={12} style={{ margin: '0 auto 16px' }} />
            <Skeleton tinggi={14} lebar="60%" style={{ margin: '0 auto 18px' }} />
            <Skeleton tinggi={44} radius={8} style={{ marginBottom: '10px' }} />
            <Skeleton tinggi={44} radius={8} />
          </div>
        </div>
      </main>
    )
  }

  // Link kedaluwarsa atau sudah dipakai
  if (!sesiValid) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ maxWidth: '380px', margin: '30px auto', padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px 24px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>⏳</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', marginBottom: '10px' }}>
              Link-nya sudah tidak berlaku
            </div>
            <p style={{ fontSize: '13px', color: '#5a7da0', lineHeight: '1.7', margin: '0 0 6px' }}>
              Link reset hanya berlaku sebentar dan cuma bisa dipakai sekali.
              Minta link baru, ya — prosesnya cepat kok.
            </p>
            {pesanLink && (
              <p style={{ fontSize: '11px', color: '#9ab4cc', margin: '0 0 18px' }}>{pesanLink}</p>
            )}
            <Link
              href="/auth"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '44px', padding: '0 24px', borderRadius: '8px',
                background: '#0C447C', color: '#fff',
                fontSize: '13px', fontWeight: '600', textDecoration: 'none',
                marginTop: '10px',
              }}
            >
              Minta Link Baru
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '380px', margin: '30px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '0.5px solid #c5d9ef' }}>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Image src="/LOGO-512.png" alt="Logo" width={60} height={60} priority style={{ objectFit: 'contain', marginBottom: '8px' }} />
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a' }}>Buat Kata Sandi Baru</div>
            <div style={{ fontSize: '12px', color: '#5a7da0', marginTop: '4px' }}>
              Minimal {MIN_PANJANG} karakter, dan jangan yang gampang ditebak.
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="sandi-baru" style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>
              Kata Sandi Baru
            </label>
            <InputPassword
              id="sandi-baru"
              name="new-password"
              value={sandi}
              onChange={v => { setSandi(v); setGalatSandi('') }}
              placeholder={`Minimal ${MIN_PANJANG} karakter`}
              autoComplete="new-password"
            />

            {sandi && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                  {[1, 2, 3].map(n => (
                    <span key={n} style={{
                      flex: 1, height: '4px', borderRadius: '2px',
                      background: n <= kekuatan.skor ? kekuatan.warna : '#e8f0f8',
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: kekuatan.warna }}>
                  {kekuatan.label}
                </span>
              </div>
            )}

            {galatSandi && <div style={gayaGalat}>{galatSandi}</div>}
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="ulangi-sandi" style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>
              Ulangi Kata Sandi Baru
            </label>
            <InputPassword
              id="ulangi-sandi"
              name="confirm-password"
              value={ulangi}
              onChange={v => { setUlangi(v); setGalatUlangi('') }}
              placeholder="Ketik ulang kata sandinya"
              autoComplete="new-password"
            />
            {galatUlangi && <div style={gayaGalat}>{galatUlangi}</div>}
          </div>

          <button
            onClick={simpan}
            disabled={menyimpan}
            style={{
              width: '100%', background: menyimpan ? '#7fa8c9' : '#0C447C',
              color: '#fff', border: 'none', padding: '13px',
              borderRadius: '8px', fontSize: '13px', fontWeight: '600',
              minHeight: '44px', cursor: menyimpan ? 'not-allowed' : 'pointer',
            }}
          >
            {menyimpan ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
          </button>
        </div>
      </div>
    </main>
  )
}
