'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import Skeleton, { SkeletonPanel } from '../components/Skeleton'
import Tombol from '../components/Tombol'
import DialogKonfirmasi from '../components/DialogKonfirmasi'
import PilihAngkatan, { ANGKATAN_PERTAMA, labelOpsiAngkatan } from '../components/PilihAngkatan'
import { useTampilSkeleton } from '../hooks/useSkeleton'

// Halaman ini SATU-SATUNYA urusan: mengaku alumni. Bukan pagar belanja.
//
// SEJAK PELUNCURAN REUNI (Oktober 2026) TIDAK ADA LAGI ANTREAN ADMIN.
// ajukan_alumni() langsung memberi status 'alumni' dan MENGUNCI angkatannya —
// setelah itu jaga_field_sensitif menelan setiap perubahan angkatan dari
// pengguna sendiri. Penjaganya bukan admin lagi melainkan koreksi sosial:
// "Nama · Superfive 92" tampil di mana pun nama penjual muncul, dan teman
// seangkatan yang melihat kejanggalan bisa melapor. Karena itu satu-satunya
// rem di halaman ini adalah layar konfirmasi sebelum RPC dipanggil.
//
// UNGGAH BUKTI ALUMNI DIMATIKAN SEMENTARA — keputusan produk, bukan kode mati.
// Kolom users.bukti_alumni_url, bucket privat `bukti-alumni`, dan helper
// lib/buktiAlumni.ts sengaja DIPERTAHANKAN utuh supaya bisa dinyalakan lagi
// tanpa migrasi. `uploadBuktiAlumni` tidak dipanggil dari mana pun — JANGAN
// dihapus karena terlihat tak terpakai. `urlBukti` masih dipakai panel admin.

/** Tanda-tanda nama yang hampir pasti bukan nama sebenarnya. Hasilnya HANYA
 *  dipakai untuk memunculkan peringatan — tidak pernah untuk memblokir, karena
 *  kita tidak tahu nama orang. Yang ditangkap sengaja cuma yang tidak mungkin
 *  benar: ada angkanya, terlalu pendek, atau cuma menyalin alamat email. */
function namaTerlihatBelumLengkap(nama: string, email: string) {
  const n = nama.trim()
  if (!n) return false                                   // kosong sudah ditolak tombolnya
  if (/\d/.test(n)) return true                          // "inyo 3"
  if (n.replace(/\s+/g, '').length < 3) return true      // "AB"
  const lokal = email.split('@')[0]?.trim().toLowerCase()
  return Boolean(lokal) && n.toLowerCase() === lokal     // "inyots1"
}

export default function VerifikasiPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  /** label_angkatan dari database — tidak pernah dirangkai di halaman ini */
  const [labelAngkatan, setLabelAngkatan] = useState<string | null>(null)
  const [alasanTolak, setAlasanTolak] = useState<string | null>(null)
  const [nama, setNama] = useState('')
  const [angkatan, setAngkatan] = useState('')
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  const [konfirmasi, setKonfirmasi] = useState(false)
  const [mengirim, setMengirim] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)

  useEffect(() => {
    async function muat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth?redirect=/verifikasi&msg=Login+dulu+untuk+mendaftar+sebagai+alumni')
        return
      }

      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('users')
        .select('nama, status_alumni, angkatan, alasan_tolak')
        .eq('id', user.id)
        .single()

      if (data) {
        setStatus(data.status_alumni ?? 'umum')
        setNama(data.nama ?? '')
        setAlasanTolak(data.alasan_tolak ?? null)

        // Angkatan yang dipilih saat pendaftaran disimpan di metadata auth
        // kalau sesinya belum ada waktu itu — dipakai sebagai isian awal.
        // Tetap harus melewati konfirmasi di bawah sebelum terkunci.
        const dariMeta = Number(user.user_metadata?.angkatan)
        const awal = data.angkatan
          ?? (Number.isInteger(dariMeta) && dariMeta >= ANGKATAN_PERTAMA ? dariMeta : null)
        setAngkatan(awal ? String(awal) : '')

        if (data.status_alumni === 'alumni') {
          const { data: publik } = await supabase
            .from('alumni_publik').select('label_angkatan').eq('id', user.id).maybeSingle()
          setLabelAngkatan(publik?.label_angkatan ?? null)
        }
      }
      setLoading(false)
    }
    muat()
  }, [])

  // Pemeriksaan isian saja. Tidak ada yang dikirim sebelum konfirmasi.
  function mintaKirim() {
    // Wajib terisi, tapi TIDAK divalidasi jumlah katanya. Banyak orang
    // Indonesia bernama satu kata, dan aturan "harus dua kata" akan menolak
    // nama yang justru benar.
    if (!nama.trim()) { setPesan('Isi dulu nama lengkapmu.'); return }
    if (!angkatan) { setPesan('Pilih dulu angkatanmu.'); return }
    setPesan(null)
    setKonfirmasi(true)
  }

  async function kirim() {
    setMengirim(true)
    try {
      // Nama ikut dikirim ke RPC, BUKAN di-UPDATE terpisah lebih dulu. Dua
      // permintaan REST tidak punya transaksi bersama.
      //
      // Semua aturannya ada di dalam RPC — rentang angkatan dan nama tidak
      // kosong. UI tidak mengulang validasinya, cukup menampilkan
      // error.message apa adanya.
      const { data, error } = await supabase.rpc('ajukan_alumni', {
        p_angkatan: parseInt(angkatan),
        p_catatan: null,
        p_nama: nama.trim(),
      })
      // Sengaja tidak ada reset state di jalur gagal: yang sudah diketik tetap
      // di formulir supaya orangnya tinggal membetulkan lalu kirim lagi.
      if (error) throw new Error(error.message)

      // Label dibaca dari nilai balik RPC, bukan dirangkai di sini
      setLabelAngkatan((data as { label?: string } | null)?.label ?? null)
      setStatus('alumni')
    } catch (e) {
      setPesan(e instanceof Error ? e.message : 'Gagal mengirim. Coba lagi.')
    } finally {
      setKonfirmasi(false)
      setMengirim(false)
    }
  }

  if (tampilSkeleton) return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>
        <Skeleton tinggi={18} lebar="45%" style={{ marginBottom: '6px' }} />
        <Skeleton tinggi={11} lebar="60%" style={{ marginBottom: '18px' }} />
        <SkeletonPanel baris={1} />
        <SkeletonPanel baris={2} />
      </div>
    </main>
  )

  // Sudah alumni — angkatannya terkunci, tidak ada yang perlu dikerjakan di sini
  if (status === 'alumni') return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '520px', margin: '32px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '32px 20px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>🎓</div>
          <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>
            {labelAngkatan ? `Kamu terdaftar sebagai ${labelAngkatan}` : 'Kamu sudah terdaftar sebagai alumni'}
          </h2>
          <p style={{ fontSize: '13px', color: '#5a7da0', margin: '0 0 20px', lineHeight: 1.7 }}>
            Kamu sudah masuk direktori alumni SMPN 5 Bandung.
            Kalau mau berjualan, ajukan diri jadi penjual dulu.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/alumni" style={{ flex: 1, background: '#fff', color: '#0C447C', border: '1px solid #0C447C', padding: '11px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
              Direktori Alumni
            </Link>
            <Link href="/jual" style={{ flex: 1, background: '#0C447C', color: '#fff', padding: '11px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
              Mulai Berjualan
            </Link>
          </div>
          <div style={{ fontSize: '11px', color: '#9ab4cc', marginTop: '16px', lineHeight: 1.6 }}>
            Angkatan tidak bisa diubah sendiri. Kalau ternyata salah, hubungi admin.
          </div>
        </div>
      </div>
    </main>
  )

  // Dicabut pengurus dari /admin/verifikasi (Alumni Terbaru). Formulirnya
  // SENGAJA tidak ditampilkan: ajukan_alumni() hanya menolak status
  // 'alumni', jadi formulir di sini akan langsung memberi status alumni lagi
  // — pencabutannya jadi tidak berarti apa-apa. Pagar yang sebenarnya harus
  // di RPC-nya; ini hanya menutup pintu yang terlihat.
  if (status === 'ditolak') return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '520px', margin: '32px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '28px 20px', border: '0.5px solid #f09595', textAlign: 'center' }}>
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>🎓</div>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>
            Status alumnimu dicabut pengurus
          </h2>
          {alasanTolak && (
            <div style={{ background: '#fce4e4', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#c62828', margin: '0 0 12px', whiteSpace: 'pre-line', textAlign: 'left' }}>
              {alasanTolak}
            </div>
          )}
          <p style={{ fontSize: '13px', color: '#5a7da0', margin: '0 0 18px', lineHeight: 1.7 }}>
            Kamu tetap bisa belanja seperti biasa. Kalau menurutmu ini keliru,
            hubungi pengurus Superfive untuk meluruskannya.
          </p>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', background: '#0C447C', color: '#fff', padding: '0 20px', minHeight: '44px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>
          Daftar sebagai Alumni
        </h1>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '16px' }}>
          Supaya kamu masuk direktori alumni dan bisa berjualan
        </div>

        {/* Penjelasan */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#5a7da0', lineHeight: '1.7' }}>
            Belanja di Superfive Market terbuka untuk siapa saja. Terdaftar sebagai alumni
            membuatmu masuk <strong style={{ color: '#1a1a1a' }}>direktori alumni</strong> dan
            boleh <strong style={{ color: '#1a1a1a' }}>berjualan</strong>.
            <br /><br />
            Angkatanmu akan tampil di samping namamu di seluruh Superfive, dan
            <strong style={{ color: '#1a1a1a' }}> tidak bisa kamu ubah sendiri</strong> setelah terdaftar.
          </div>
        </div>

        {/* Form */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          {/* Nama diedit di tempat, bukan dilempar ke /profil. Yang dilempar
              ke halaman lain kebanyakan tidak pernah kembali ke sini. */}
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="nama" style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', display: 'block', marginBottom: '4px' }}>
              Nama Lengkap *
            </label>
            <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '8px' }}>
              Pakai nama yang dikenali teman seangkatanmu.
            </div>
            <input
              id="nama"
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Nama lengkapmu"
              style={{ width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box', minHeight: '44px' }}
            />

            {/* Peringatan, bukan pagar: tombolnya tetap hidup. Kita tidak tahu
                nama orang, jadi yang salah di sini cuma boleh diingatkan. */}
            {namaTerlihatBelumLengkap(nama, email) && (
              <div style={{ marginTop: '8px', background: '#fff8e1', border: '0.5px solid #ffe082', borderRadius: '8px', padding: '9px 12px', fontSize: '11px', color: '#8d6e26', lineHeight: '1.7' }}>
                Nama ini akan tampil di samping angkatanmu. Pakai nama
                lengkapmu saat sekolah dulu supaya teman seangkatan mengenalimu.
              </div>
            )}
          </div>

          <div>
            <label htmlFor="angkatan" style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', display: 'block', marginBottom: '4px' }}>
              Angkatan *
            </label>
            <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '8px' }}>
              Pilih dengan teliti — ini yang terkunci setelah kamu terdaftar.
            </div>
            <PilihAngkatan value={angkatan} onChange={setAngkatan} />
          </div>
        </div>

        {pesan && (
          <div style={{ background: '#fce4e4', border: '0.5px solid #f09595', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#c62828', marginBottom: '12px' }}>
            {pesan}
          </div>
        )}

        <Tombol
          onClick={mintaKirim}
          loading={mengirim}
          teksLoading="Mendaftarkan..."
          penuh
          style={{ padding: '15px', fontSize: '14px', borderRadius: '10px', marginBottom: '10px' }}
        >
          Daftar sebagai Alumni
        </Tombol>

        <Link href="/" style={{ display: 'block', textAlign: 'center', color: '#5a7da0', fontSize: '13px', textDecoration: 'none', paddingBottom: '24px' }}>
          ← Kembali ke Beranda
        </Link>
      </div>

      {/* Label, bukan tahun: "Superfive 92" itu yang akan terbaca orang lain
          di samping namanya, jadi itu juga yang dikonfirmasi */}
      <DialogKonfirmasi
        terbuka={konfirmasi}
        ikon="🎓"
        judul={angkatan ? `Kamu terdaftar sebagai ${labelOpsiAngkatan(parseInt(angkatan))}.` : ''}
        pesan="Setelah ini angkatan nggak bisa diubah sendiri. Udah bener?"
        labelKonfirmasi="Ya, lanjut"
        labelBatal="Ubah dulu"
        merusak={false}
        memproses={mengirim}
        onKonfirmasi={kirim}
        onBatal={() => setKonfirmasi(false)}
      />
    </main>
  )
}
