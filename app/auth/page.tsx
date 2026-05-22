'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [angkatan, setAngkatan] = useState('')
  const [loading, setLoading] = useState(false)
  const [pesan, setPesan] = useState('')
  const [registered, setRegistered] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setPesan('Login gagal: ' + error.message)
    else setPesan('Login berhasil! Selamat datang Superfive!')
    setLoading(false)
  }

  async function handleRegister() {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setPesan('Gagal daftar: ' + error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        nama, email, angkatan: angkatan ? parseInt(angkatan) : null,
      })
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
            <img src="/logo.png" alt="Logo" style={{width:'60px',height:'60px',objectFit:'contain',marginBottom:'8px'}} />
            <div style={{fontSize:'16px',fontWeight:'500',color:'#0C447C'}}>Superfive Market</div>
            <div style={{fontSize:'12px',color:'#5a7da0'}}>Khusus alumni SMPN 5 Bandung</div>
          </div>

          <div style={{display:'flex',background:'#f0f5fb',borderRadius:'8px',padding:'3px',marginBottom:'16px'}}>
            <button onClick={()=>setMode('login')} style={{flex:1,padding:'8px',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',background:mode==='login'?'#0C447C':'transparent',color:mode==='login'?'#fff':'#5a7da0',fontWeight:mode==='login'?'500':'400'}}>Masuk</button>
            <button onClick={()=>setMode('register')} style={{flex:1,padding:'8px',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',background:mode==='register'?'#0C447C':'transparent',color:mode==='register'?'#fff':'#5a7da0',fontWeight:mode==='register'?'500':'400'}}>Daftar Alumni</button>
          </div>

          {mode==='register' && (
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'12px',color:'#5a7da0',display:'block',marginBottom:'4px'}}>Nama Lengkap</label>
              <input value={nama} onChange={e=>setNama(e.target.value)} placeholder="Nama kamu" style={{width:'100%',padding:'9px 12px',border:'0.5px solid #c5d9ef',borderRadius:'8px',fontSize:'13px',outline:'none'}} />
            </div>
          )}

          <div style={{marginBottom:'12px'}}>
            <label style={{fontSize:'12px',color:'#5a7da0',display:'block',marginBottom:'4px'}}>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="email@kamu.com" style={{width:'100%',padding:'9px 12px',border:'0.5px solid #c5d9ef',borderRadius:'8px',fontSize:'13px',outline:'none'}} />
          </div>

          <div style={{marginBottom:'12px'}}>
            <label style={{fontSize:'12px',color:'#5a7da0',display:'block',marginBottom:'4px'}}>Kata Sandi</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Min 6 karakter" style={{width:'100%',padding:'9px 12px',border:'0.5px solid #c5d9ef',borderRadius:'8px',fontSize:'13px',outline:'none'}} />
          </div>

          {mode==='register' && (
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'12px',color:'#5a7da0',display:'block',marginBottom:'4px'}}>Angkatan (Tahun Lulus)</label>
              <select value={angkatan} onChange={e=>setAngkatan(e.target.value)} style={{width:'100%',padding:'9px 12px',border:'0.5px solid #c5d9ef',borderRadius:'8px',fontSize:'13px',outline:'none',background:'#fff'}}>
                <option value="">-- Pilih Angkatan --</option>
                {Array.from({length:new Date().getFullYear()-1970+1},(_,i)=>new Date().getFullYear()-i).map(y=>(
                  <option key={y} value={y}>Angkatan {y}</option>
                ))}
              </select>
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
        </div>
      </div>
    </main>
  )
}