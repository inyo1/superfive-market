'use client'
import Image from 'next/image'
import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { METADATA_SAMBUTAN, alamatSambutan, perluSambutan } from '../../lib/sambutan'
import Navbar from '../components/Navbar'
import InputPassword from '../components/InputPassword'
import PilihAngkatan, { labelOpsiAngkatan } from '../components/PilihAngkatan'
import TinjauAkun from '../components/auth/TinjauAkun'
import CekEmail from '../components/auth/CekEmail'
import { IkonSurat } from '../components/beranda/Ikon'

// Pemeriksaan bentuk email yang longgar — yang memastikan emailnya benar
// adalah tautan konfirmasi, bukan regex. Ini hanya menangkap salah ketik jelas.
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Sama dengan batas minimum Supabase Auth project ini (placeholder "Min 6 karakter")
const SANDI_MIN = 6

// Kotak informasi (bukan peringatan): biru muda + teks navy, sama dengan
// pesan ?msg= di atas formulir. Jangan diberi merah — pendaftar belum
// berbuat salah apa pun.
const gayaInfo: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: '8px',
  background: '#E6F1FB', border: '0.5px solid #b3d1ee', borderRadius: '8px',
  color: '#0C447C', fontSize: '12px', lineHeight: '1.6',
}

function AuthContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawRedirect = searchParams.get('redirect') ?? ''
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/'
  const msg = searchParams.get('msg')

  // ?mode=daftar membuka tab Daftar langsung — dipakai CTA direktori alumni
  const [mode, setMode] = useState<'login' | 'register' | 'lupa'>(
    searchParams.get('mode') === 'daftar' ? 'register' : 'login'
  )
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
  // Persetujuan tampil di Direktori Alumni publik. TIDAK tercentang secara
  // bawaan, dan hanya dikirim kalau dicentang — trigger trg_buat_profil_baru
  // membaca raw_user_meta_data->>'tampil_publik' dan hanya 'true' yang
  // berarti setuju; tanpa kuncinya sama sekali, hasilnya false.
  const [setujuPublik, setSetujuPublik] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan] = useState('')
  const [registered, setRegistered] = useState(false)
  // Label dari ajukan_alumni() kalau angkatannya sudah terkunci saat daftar;
  // null kalau sesi belum terbentuk (email masih harus dikonfirmasi)
  const [labelTerkunci, setLabelTerkunci] = useState<string | null>(null)
  // Layar Periksa Akun sebelum signUp — menggantikan dialog konfirmasi
  // angkatan, jadi pendaftar alumni tetap hanya melewati satu layar
  const [tinjau, setTinjau] = useState(false)
  // Login ditolak karena email belum dikonfirmasi → tampilkan layar Cek Email
  const [belumKonfirmasi, setBelumKonfirmasi] = useState(false)
  // Dipasang tepat sebelum formulir dikirim ulang dari dialog, supaya
  // pengiriman yang sebenarnya tetap lewat <form> — itu yang dikenali
  // pengelola kata sandi peramban sebagai pendaftaran
  const siapKirim = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleLogin() {
    if (!email.trim() || !password) { setPesan('Isi email dan kata sandi dulu.'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      const kode = (error as { code?: string }).code
      if (kode === 'email_not_confirmed' || /not confirmed/i.test(error.message)) {
        setPesan('')
        setBelumKonfirmasi(true)
      } else if (kode === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
        setPesan('Email atau kata sandi salah. Periksa lagi, atau pilih "Lupa kata sandi?".')
      } else {
        setPesan('Login gagal: ' + error.message)
      }
      setLoading(false)
      return
    }
    // Akun baru Wave 3 yang belum menyelesaikan sambutan: mampir dulu, lalu
    // halaman sambutan membawanya ke tujuan semula
    // Kalau tujuannya memang halaman sambutan (dialihkan dari sana), teruskan
    // apa adanya supaya ?lanjut= miliknya tidak hilang
    const keSambutan = redirectTo.startsWith('/selamat-datang')
    router.replace(perluSambutan(data.user?.user_metadata) && !keSambutan ? alamatSambutan(redirectTo) : redirectTo)
  }

  function kirimFormulir(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (mode === 'login') { handleLogin(); return }
    if (siapKirim.current) { siapKirim.current = false; handleRegister(); return }
    mintaDaftar()
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

  // Pemeriksaan isian saja — belum ada yang dikirim. Pendaftar alumni
  // melewati layar konfirmasi dulu, karena angkatannya terkunci begitu
  // ajukan_alumni() berhasil.
  function mintaDaftar() {
    if (!nama.trim()) { setPesan('Nama lengkap wajib diisi.'); return }
    if (!POLA_EMAIL.test(email.trim())) { setPesan('Periksa lagi alamat emailnya — contoh: nama@gmail.com'); return }
    if (password.length < SANDI_MIN) { setPesan(`Kata sandi minimal ${SANDI_MIN} karakter.`); return }
    if (!jenis) { setPesan('Pilih dulu salah satu: alumni, atau teman/keluarga alumni.'); return }
    if (jenis === 'alumni' && !angkatan) { setPesan('Angkatan wajib diisi kalau kamu alumni.'); return }
    setPesan('')
    setTinjau(true)
  }

  // Dari dialog: kirim lewat <form> yang sebenarnya, bukan memanggil
  // handleRegister langsung
  function daftarDariTinjau() {
    siapKirim.current = true
    formRef.current?.requestSubmit()
  }

  async function handleRegister() {
    setLoading(true)
    try {
      // Baris public.users dibuat trigger trg_buat_profil_baru di auth.users,
      // yang membaca nama dari raw_user_meta_data->>'nama'. JANGAN insert
      // manual ke `users` di sini: anon tidak punya grant apa pun di tabel
      // itu, dan kalau email perlu dikonfirmasi, di titik ini kita memang
      // masih anon.
      //
      // Angkatan ikut disimpan di metadata (trigger tidak membacanya) supaya
      // /verifikasi bisa mengisikannya lagi kalau RPC di bawah belum bisa
      // dipanggil karena sesinya belum ada.
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nama: nama.trim(),
            // Penanda akun baru Wave 3 → halaman sambutan sekali setelah
            // login pertama. Akun lama tidak punya kunci ini. Lihat lib/sambutan.ts
            ...METADATA_SAMBUTAN,
            ...(jenis === 'alumni' ? { angkatan: parseInt(angkatan) } : {}),
            // Hanya alumni, dan hanya kalau dicentang sendiri. Nilai false
            // sengaja tidak dikirim: ketiadaan kunci sudah berarti tidak setuju.
            ...(jenis === 'alumni' && setujuPublik === true ? { tampil_publik: true } : {}),
          },
        },
      })
      if (error) { setPesan('Gagal daftar: ' + error.message); return }

      // Pendaftar biasa berhenti di sini: status_alumni tetap 'umum', dan
      // belanjanya tidak dihalangi apa pun.
      //
      // Alumni langsung dikunci angkatannya — tapi hanya kalau sesinya sudah
      // ada. Tanpa sesi (email masih harus dikonfirmasi) RPC-nya pasti ditolak
      // "Harus login", jadi tidak dipanggil; angkatannya dikunci dari
      // /verifikasi setelah masuk, dengan konfirmasi yang sama.
      if (jenis === 'alumni' && data.session) {
        const { data: hasil, error: errAlumni } = await supabase.rpc('ajukan_alumni', {
          p_angkatan: parseInt(angkatan),
          p_catatan: null,
          p_nama: nama.trim(),
        })
        if (!errAlumni) setLabelTerkunci((hasil as { label?: string } | null)?.label ?? null)
      }
      // Sesi langsung terbentuk (konfirmasi email tidak diwajibkan): ini
      // memang login pertamanya, jadi langsung ke sambutan
      if (data.session) {
        router.replace(alamatSambutan(redirectTo))
        return
      }
      setRegistered(true)
    } finally {
      setTinjau(false)
      setLoading(false)
    }
  }

  // Layar Cek Email — setelah daftar, atau saat login ditolak karena email
  // belum dikonfirmasi. Komponennya sama; yang beda jeda kirim ulang awalnya.
  if (registered || belumKonfirmasi) {
    const catatanAlumni = registered && jenis === 'alumni'
      ? (labelTerkunci
          ? `Kamu sudah tercatat sebagai ${labelTerkunci}.`
          : 'Setelah masuk, angkatanmu dikunci lewat halaman pendaftaran alumni — angkatannya sudah terisi di sana.')
      : null
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ maxWidth: '440px', margin: '32px auto', padding: '0 16px' }}>
          <CekEmail
            email={email.trim()}
            jedaAwal={registered ? 60 : 0}
            judul={registered ? 'Satu langkah lagi: cek emailmu' : 'Emailmu belum dikonfirmasi'}
            catatanAlumni={catatanAlumni}
            onKeMasuk={() => {
              const alumniBelumKunci = registered && jenis === 'alumni' && !labelTerkunci
              setRegistered(false); setBelumKonfirmasi(false); setMode('login'); setPesan(''); setPassword('')
              // Alumni yang angkatannya belum terkunci dibawa ke /verifikasi
              // begitu masuk — angkatan dari pendaftaran sudah terisi di sana
              if (alumniBelumKunci) router.replace('/auth?redirect=/verifikasi&msg=Masuk+untuk+mengunci+angkatanmu')
            }}
            onUbahEmail={() => {
              setRegistered(false); setBelumKonfirmasi(false); setMode('register'); setPesan('')
            }}
          />
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
          // <form> sungguhan + autocomplete username/current-password/new-password:
          // itu yang membuat pengelola kata sandi peramban menawarkan simpan & isi otomatis
          <form ref={formRef} onSubmit={kirimFormulir} noValidate>
          <div style={{display:'flex',background:'#f0f5fb',borderRadius:'8px',padding:'3px',marginBottom:'16px'}}>
            <button type="button" onClick={()=>{setMode('login');setPesan('')}} aria-pressed={mode==='login'} style={{flex:1,padding:'8px',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',background:mode==='login'?'#0C447C':'transparent',color:mode==='login'?'#fff':'#5a7da0',fontWeight:mode==='login'?'500':'400'}}>Masuk</button>
            <button type="button" onClick={()=>{setMode('register');setPesan('')}} aria-pressed={mode==='register'} style={{flex:1,padding:'8px',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',background:mode==='register'?'#0C447C':'transparent',color:mode==='register'?'#fff':'#5a7da0',fontWeight:mode==='register'?'500':'400'}}>Daftar</button>
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
              aria-describedby={mode==='register' ? 'info-email-daftar' : undefined}
              style={{width:'100%',padding:'11px 12px',border:'0.5px solid #c5d9ef',borderRadius:'8px',fontSize:'13px',outline:'none',boxSizing:'border-box',minHeight:'44px'}}
            />
            {/* Hanya saat daftar: akun baru harus dikonfirmasi lewat email,
                jadi email yang salah ketik atau tidak bisa dibuka berarti
                akunnya tidak pernah aktif. Di tab Masuk tidak relevan. */}
            {mode==='register' && (
              <p id="info-email-daftar" style={{...gayaInfo, margin:'6px 0 0', padding:'8px 10px'}}>
                <span style={{flexShrink:0, marginTop:'1px', display:'inline-flex'}}><IkonSurat size={16} tebal={1.8} /></span>
                <span>Gunakan email aktif yang bisa kamu akses. Kami akan mengirimkan tautan konfirmasi untuk mengaktifkan akunmu.</span>
              </p>
            )}
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
                        onChange={()=>{ setJenis(o.nilai); if (o.nilai!=='alumni') setSetujuPublik(false) }}
                        style={{accentColor:'#0C447C',width:'16px',height:'16px',flexShrink:0}}
                      />
                      <span style={{fontSize:'13px',color: dipilih ? '#0C447C' : '#1a1a1a',fontWeight: dipilih ? '600' : '400'}}>
                        {o.label}
                      </span>
                    </label>
                  )
                })}
              </div>

              {/* Angkatan hanya relevan untuk alumni — dan wajib, karena ia
                  tampil di samping namamu di seluruh Superfive */}
              {jenis==='alumni' && (
                <div style={{marginTop:'10px'}}>
                  <label htmlFor="angkatan" style={{fontSize:'12px',color:'#5a7da0',display:'block',marginBottom:'4px'}}>Angkatan *</label>
                  <PilihAngkatan value={angkatan} onChange={setAngkatan} />
                  <div style={{fontSize:'11px',color:'#9ab4cc',marginTop:'6px',lineHeight:'1.6'}}>
                    Pilih dengan teliti — setelah terdaftar, angkatan tidak bisa kamu ubah sendiri.
                  </div>

                  {/* Opt-in Direktori Alumni publik — tidak tercentang secara
                      bawaan. Hanya untuk alumni: teman/keluarga alumni memang
                      tidak masuk direktori. */}
                  <label style={{display:'flex',alignItems:'flex-start',gap:'10px',cursor:'pointer',marginTop:'12px',padding:'11px 12px',borderRadius:'8px',border:`1px solid ${setujuPublik ? '#0C447C' : '#c5d9ef'}`,background: setujuPublik ? '#E6F1FB' : '#fff'}}>
                    <input
                      type="checkbox"
                      checked={setujuPublik}
                      onChange={e=>setSetujuPublik(e.target.checked)}
                      style={{accentColor:'#0C447C',width:'16px',height:'16px',flexShrink:0,marginTop:'2px'}}
                    />
                    <span style={{minWidth:0}}>
                      <span style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#0C447C',marginBottom:'4px'}}>
                        Tampilkan profil saya di Direktori Alumni publik
                      </span>
                      <span style={{display:'block',fontSize:'11px',color:'#5a7da0',lineHeight:'1.6'}}>
                        Jika dicentang, pengunjung yang belum masuk dapat menemukan saya di Direktori Alumni dan
                        melihat nama, angkatan (Superfive NN), dan foto profil saya, serta lapak saya bila sedang
                        aktif. Direktori Alumni tidak menampilkan email, nomor HP, alamat, maupun rekening.
                        Pengaturan ini bisa diubah kapan saja di halaman Profil.
                      </span>
                    </span>
                  </label>
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
            type="submit"
            disabled={loading}
            style={{width:'100%',background:'#0C447C',color:'#fff',border:'none',padding:'11px',borderRadius:'8px',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
            {loading ? 'Memproses...' : mode==='login' ? 'Masuk ke Superfive Market' : 'Daftar sebagai Superfive'}
          </button>
          </form>
          )}
        </div>
      </div>

      {/* Periksa Akun: satu layar sebelum signUp. Untuk alumni ikut memuat
          LABEL angkatan ("Superfive 92"), bukan tahunnya — itu yang akan terbaca
          orang lain, jadi itu juga yang dikonfirmasi */}
      <TinjauAkun
        terbuka={tinjau}
        nama={nama.trim()}
        email={email.trim()}
        kataSandi={password}
        jenisLabel={jenis === 'alumni' ? 'Alumni SMPN 5 Bandung' : 'Teman atau keluarga alumni'}
        angkatanLabel={jenis === 'alumni' && angkatan ? labelOpsiAngkatan(parseInt(angkatan)) : null}
        memproses={loading}
        onKembali={() => setTinjau(false)}
        onDaftar={daftarDariTinjau}
      />
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
