'use client'
import Image from 'next/image'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import InputPassword from '../components/InputPassword'

function AuthContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawRedirect = searchParams.get('redirect') ?? ''
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/'
  const msg = searchParams.get('msg')

  const [mode, setMode] = useState<'login' | 'register' | 'lupa'>('login')
  const [emailReset, setEmailReset] = useState('')
  const [resetTerkirim, setResetTerkirim] = useState(false)
  const [hitungMundur, setHitungMundur] = useState(0)
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Sengaja tanpa nilai awal: string kosong berarti pendaftar belum memilih.
  // Tanpa ini akan ada orang yang tercatat alumni hanya karena tidak pernah
  // memikirkannya — sama seperti pemilih status barang di EditorPreorder.
  const [jenis, setJenis] = useState<'' | 'alumni' | 'umum'>('')
  const [angkatan, setAngkatan] = useState('')
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan] = useState('')
  const [registered, setRegistered] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setPesan('Login gagal: ' + error.message)
      setLoading(false)
    } else {
      router.replace(redirectTo)
    }
  }

  // Jeda 60 detik antar pengiriman supaya endpoint reset tidak bisa dispam
  useEffect(() => {
    if (hitungMundur <= 0) return
    const t = setTimeout(() => setHitungMundur(n => n - 1), 1000)
    return () => clearTimeout(t)
  }, [hitungMundur])

  async function handleKirimReset() {
    if (!emailReset.trim() || hitungMundur > 0) return
    setLoading(true)

    // Hasilnya sengaja tidak diperiksa: pesan ke pengguna harus sama persis
    // baik emailnya terdaftar maupun tidak. Membedakannya akan membocorkan
    // daftar email alumni ke siapa pun yang mau menebak.
    await supabase.auth.resetPasswordForEmail(emailReset.trim(), {
      redirectTo: `${window.location.origin}/auth/reset`,
    })

    setLoading(false)
    setResetTerkirim(true)
    setHitungMundur(60)
  }

  function bukaLupa() {
    setEmailReset(email)   // bawa email yang sudah diketik di form Masuk
    setResetTerkirim(false)
    setPesan('')
    setMode('lupa')
  }

  function kembaliKeMasuk() {
    setMode('login')
    setResetTerkirim(false)
    setPesan('')
  }

  async function handleRegister() {
    if (!nama.trim()) { setPesan('Nama lengkap wajib diisi.'); return }
    if (!jenis) { setPesan('Pilih dulu salah satu: alumni, atau teman/keluarga alumni.'); return }
    if (jenis === 'alumni' && !angkatan) { setPesan('Angkatan wajib diisi kalau kamu alumni.'); return }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setPesan('Gagal daftar: ' + error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        nama, email,
        angkatan: jenis === 'alumni' && angkatan ? parseInt(angkatan) : null,
      })

      // Pendaftar biasa berhenti di sini: status_alumni tetap 'umum', tidak ada
      // layar menunggu, dan belanjanya tidak dihalangi apa pun.
      if (jenis === 'alumni') {
        // Kalau RPC-nya gagal (mis. sesi belum terbentuk karena email masih
        // harus dikonfirmasi), pendaftarannya tetap dianggap berhasil —
        // pengajuan alumni bisa dikirim ulang dari /verifikasi setelah masuk.
        await supabase.rpc('ajukan_alumni', {
          p_angkatan: parseInt(angkatan),
          p_catatan: null,
          p_nama: nama.trim(),
        })
      }
      setRegistered(true)
    }
    setLoading(false)
  }

  if (registered) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ maxWidth: '380px', margin: '40px auto', padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '36px 24px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>📧</div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', marginBottom: '10px' }}>
              Cek email kamu!
            </div>
            <p style={{ fontSize: '14px', color: '#5a7da0', lineHeight: '1.7', margin: '0 0 6px' }}>
              Kami sudah mengirim link konfirmasi ke
            </p>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0C447C', marginBottom: '20px', wordBreak: 'break-all' }}>
              {email}
            </div>
            <p style={{ fontSize: '13px', color: '#9ab4cc', lineHeight: '1.6', margin: '0 0 24px' }}>
              Klik link di email untuk mengaktifkan akun, lalu kembali ke sini untuk masuk.
              {jenis === 'alumni' && ' Pengajuan alumni-mu akan diperiksa admin — sambil menunggu, kamu sudah bisa belanja.'}
            </p>
            <button
              onClick={() => { setRegistered(false); setMode('login'); setPesan('') }}
              style={{ background: '#0C447C', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              Ke halaman Masuk
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{minHeight:'100vh',background:'#f0f5fb',fontFamily:'sans-serif'}}>
      <Navbar />

      <div style={{maxWidth:'380px',margin:'30px auto',padding:'0 16px'}}>
        <div style={{background:'#fff',borderRadius:'12px',padding:'24px',border:'0.5px solid #c5d9ef'}}>
          <div style={{textAlign:'center',marginBottom:'20px'}}>
            <Image src="/LOGO-512.png" alt="Logo" width={60} height={60} priority style={{objectFit:"contain",marginBottom:"8px"}} />
            <div style={{fontSize:'16px',fontWeight:'500',color:'#0C447C'}}>Superfive Market</div>
            <div style={{fontSize:'12px',color:'#5a7da0'}}>Marketplace alumni SMPN 5 Bandung</div>
          </div>

          {(msg || redirectTo !== '/') && (
            <div style={{background:'#E6F1FB',border:'0.5px solid #b3d1ee',borderRadius:'8px',padding:'10px 12px',fontSize:'12px',color:'#0C447C',marginBottom:'14px',textAlign:'center'}}>
              {msg ?? 'Login dulu untuk melanjutkan pembelian'}
            </div>
          )}

          {mode==='lupa' ? (
            resetTerkirim ? (
              /* ── Konfirmasi terkirim ── */
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'48px',marginBottom:'14px'}}>📨</div>
                <div style={{fontSize:'16px',fontWeight:'700',color:'#1a1a1a',marginBottom:'10px'}}>
                  Cek email kamu
                </div>
                <p style={{fontSize:'13px',color:'#5a7da0',lineHeight:'1.7',margin:'0 0 20px'}}>
                  Kalau email tersebut terdaftar, link reset sudah kami kirim.
                  Cek kotak masuk dan folder spam.
                </p>

                <button
                  onClick={handleKirimReset}
                  disabled={loading || hitungMundur > 0}
                  style={{
                    width:'100%',background: hitungMundur>0 ? '#f0f5fb' : '#fff',
                    color: hitungMundur>0 ? '#9ab4cc' : '#0C447C',
                    border:`1px solid ${hitungMundur>0 ? '#dde8f4' : '#0C447C'}`,
                    padding:'12px',borderRadius:'8px',fontSize:'13px',fontWeight:'600',
                    minHeight:'44px',cursor: hitungMundur>0 ? 'not-allowed' : 'pointer',
                    marginBottom:'10px',
                  }}
                >
                  {hitungMundur > 0 ? `Kirim ulang dalam ${hitungMundur} detik` : 'Kirim Ulang Link'}
                </button>

                <button
                  onClick={kembaliKeMasuk}
                  style={{width:'100%',background:'#0C447C',color:'#fff',border:'none',padding:'12px',borderRadius:'8px',fontSize:'13px',fontWeight:'600',minHeight:'44px',cursor:'pointer'}}
                >
                  Kembali ke Masuk
                </button>
              </div>
            ) : (
              /* ── Form minta link reset ── */
              <div>
                <div style={{fontSize:'16px',fontWeight:'700',color:'#1a1a1a',marginBottom:'6px'}}>
                  Lupa Kata Sandi
                </div>
                <p style={{fontSize:'12px',color:'#5a7da0',lineHeight:'1.7',margin:'0 0 16px'}}>
                  Masukkan email terdaftar kamu, link untuk mengatur ulang kata sandi akan kami kirim ke sana.
                </p>

                <div style={{marginBottom:'14px'}}>
                  <label htmlFor="email-reset" style={{fontSize:'12px',color:'#5a7da0',display:'block',marginBottom:'4px'}}>Email</label>
                  <input
                    id="email-reset"
                    name="email"
                    value={emailReset}
                    onChange={e=>setEmailReset(e.target.value)}
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    placeholder="email@kamu.com"
                    style={{width:'100%',padding:'11px 12px',border:'0.5px solid #c5d9ef',borderRadius:'8px',fontSize:'13px',outline:'none',boxSizing:'border-box',minHeight:'44px'}}
                  />
                </div>

                <button
                  onClick={handleKirimReset}
                  disabled={loading || !emailReset.trim()}
                  style={{
                    width:'100%',
                    background: (loading || !emailReset.trim()) ? '#7fa8c9' : '#0C447C',
                    color:'#fff',border:'none',padding:'12px',borderRadius:'8px',
                    fontSize:'13px',fontWeight:'600',minHeight:'44px',
                    cursor:(loading || !emailReset.trim()) ? 'not-allowed' : 'pointer',
                    marginBottom:'12px',
                  }}
                >
                  {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                </button>

                <button
                  onClick={kembaliKeMasuk}
                  style={{width:'100%',background:'none',border:'none',color:'#5a7da0',fontSize:'13px',cursor:'pointer',minHeight:'44px'}}
                >
                  ← Kembali ke Masuk
                </button>
              </div>
            )
          ) : (
          <>
          <div style={{display:'flex',background:'#f0f5fb',borderRadius:'8px',padding:'3px',marginBottom:'16px'}}>
            <button onClick={()=>setMode('login')} style={{flex:1,padding:'8px',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',background:mode==='login'?'#0C447C':'transparent',color:mode==='login'?'#fff':'#5a7da0',fontWeight:mode==='login'?'500':'400'}}>Masuk</button>
            <button onClick={()=>setMode('register')} style={{flex:1,padding:'8px',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',background:mode==='register'?'#0C447C':'transparent',color:mode==='register'?'#fff':'#5a7da0',fontWeight:mode==='register'?'500':'400'}}>Daftar</button>
          </div>

          {mode==='register' && (
            <div style={{marginBottom:'12px'}}>
              <label htmlFor="nama" style={{fontSize:'12px',color:'#5a7da0',display:'block',marginBottom:'4px'}}>Nama Lengkap</label>
              <input
                id="nama"
                name="name"
                value={nama}
                onChange={e=>setNama(e.target.value)}
                autoComplete="name"
                placeholder="Nama kamu"
                style={{width:'100%',padding:'11px 12px',border:'0.5px solid #c5d9ef',borderRadius:'8px',fontSize:'13px',outline:'none',boxSizing:'border-box',minHeight:'44px'}}
              />
            </div>
          )}

          <div style={{marginBottom:'12px'}}>
            <label htmlFor="email" style={{fontSize:'12px',color:'#5a7da0',display:'block',marginBottom:'4px'}}>Email</label>
            <input
              id="email"
              name="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              type="email"
              // username, bukan email — ini yang dikenali password manager
              // sebagai pasangan dari field kata sandi
              autoComplete="username"
              inputMode="email"
              placeholder="email@kamu.com"
              style={{width:'100%',padding:'11px 12px',border:'0.5px solid #c5d9ef',borderRadius:'8px',fontSize:'13px',outline:'none',boxSizing:'border-box',minHeight:'44px'}}
            />
          </div>

          <div style={{marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px',marginBottom:'4px'}}>
              <label htmlFor="kata-sandi" style={{fontSize:'12px',color:'#5a7da0'}}>Kata Sandi</label>
              {mode==='login' && (
                <button
                  type="button"
                  onClick={bukaLupa}
                  style={{background:'none',border:'none',color:'#0C447C',fontSize:'12px',fontWeight:'600',cursor:'pointer',padding:'4px 0'}}
                >
                  Lupa kata sandi?
                </button>
              )}
            </div>
            <InputPassword
              id="kata-sandi"
              value={password}
              onChange={setPassword}
              placeholder="Min 6 karakter"
              // Daftar memakai new-password supaya password manager menawarkan
              // membuat dan menyimpan sandi baru, bukan mengisi yang lama
              autoComplete={mode==='register' ? 'new-password' : 'current-password'}
            />
          </div>

          {/* Dua pilihan setara, bukan saklar. Pilihan kedua sengaja bernada
              netral: yang bukan alumni justru sedang diundang masuk, bukan
              ditandai sebagai orang luar. */}
          {mode==='register' && (
            <div style={{marginBottom:'12px'}}>
              <div style={{fontSize:'12px',color:'#5a7da0',marginBottom:'6px'}}>Kamu daftar sebagai</div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {([
                  { nilai:'alumni', label:'Saya alumni SMPN 5 Bandung' },
                  { nilai:'umum',   label:'Saya teman atau keluarga alumni' },
                ] as const).map(o=>{
                  const dipilih = jenis===o.nilai
                  return (
                    <label
                      key={o.nilai}
                      style={{
                        display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',
                        padding:'11px 12px',borderRadius:'8px',minHeight:'44px',boxSizing:'border-box',
                        border:`1px solid ${dipilih ? '#0C447C' : '#c5d9ef'}`,
                        background: dipilih ? '#E6F1FB' : '#fff',
                      }}
                    >
                      <input
                        type="radio" name="jenis-pendaftar" value={o.nilai}
                        checked={dipilih}
                        onChange={()=>setJenis(o.nilai)}
                        style={{accentColor:'#0C447C',width:'16px',height:'16px',flexShrink:0}}
                      />
                      <span style={{fontSize:'13px',color: dipilih ? '#0C447C' : '#1a1a1a',fontWeight: dipilih ? '600' : '400'}}>
                        {o.label}
                      </span>
                    </label>
                  )
                })}
              </div>

              {/* Angkatan hanya relevan untuk alumni — dan wajib, karena admin
                  memakainya untuk memeriksa pengajuan */}
              {jenis==='alumni' && (
                <div style={{marginTop:'10px'}}>
                  <label htmlFor="angkatan" style={{fontSize:'12px',color:'#5a7da0',display:'block',marginBottom:'4px'}}>Angkatan (Tahun Lulus) *</label>
                  <select id="angkatan" value={angkatan} onChange={e=>setAngkatan(e.target.value)} style={{width:'100%',padding:'9px 12px',border:'0.5px solid #c5d9ef',borderRadius:'8px',fontSize:'13px',outline:'none',background:'#fff'}}>
                    <option value="">-- Pilih Angkatan --</option>
                    {Array.from({length:new Date().getFullYear()-1970+1},(_,i)=>new Date().getFullYear()-i).map(y=>(
                      <option key={y} value={y}>Angkatan {y}</option>
                    ))}
                  </select>
                  <div style={{fontSize:'11px',color:'#9ab4cc',marginTop:'6px',lineHeight:'1.6'}}>
                    Pengajuanmu diperiksa admin. Sambil menunggu, kamu sudah bisa belanja seperti biasa.
                  </div>
                </div>
              )}
            </div>
          )}

          {pesan && (
            <div style={{background: pesan.includes('berhasil')?'#e8f5e9':'#fce4e4',border:`0.5px solid ${pesan.includes('berhasil')?'#a5d6a7':'#f09595'}`,borderRadius:'8px',padding:'10px 12px',fontSize:'12px',color:pesan.includes('berhasil')?'#2e7d32':'#c62828',marginBottom:'12px'}}>
              {pesan}
            </div>
          )}

          <button
            onClick={mode==='login'?handleLogin:handleRegister}
            disabled={loading}
            style={{width:'100%',background:'#0C447C',color:'#fff',border:'none',padding:'11px',borderRadius:'8px',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
            {loading ? 'Memproses...' : mode==='login' ? 'Masuk ke Superfive Market' : 'Daftar sebagai Superfive'}
          </button>
          </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  )
}
