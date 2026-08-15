'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import Skeleton, { SkeletonPanel } from '../components/Skeleton'
import Tombol from '../components/Tombol'
import { useTampilSkeleton } from '../hooks/useSkeleton'

// Halaman ini SATU-SATUNYA urusan: mengaku alumni. Bukan pagar belanja.
//
// Sejak verifikasi dipecah dua sumbu, yang berstatus 'umum' adalah pembeli
// biasa yang tidak diperiksa siapa pun — mereka sampai di sini hanya kalau
// sendiri yang mau masuk direktori alumni atau mau berjualan.
//
// UNGGAH BUKTI ALUMNI DIMATIKAN SEMENTARA — keputusan produk, bukan kode mati.
// Kolom users.bukti_alumni_url, bucket privat `bukti-alumni`, dan helper
// lib/buktiAlumni.ts sengaja DIPERTAHANKAN utuh supaya bisa dinyalakan lagi
// tanpa migrasi. `uploadBuktiAlumni` tidak dipanggil dari mana pun — JANGAN
// dihapus karena terlihat tak terpakai. `urlBukti` masih dipakai panel admin.

const TAHUN_INI = new Date().getFullYear()

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
  const [alasanTolak, setAlasanTolak] = useState<string | null>(null)
  const [catatanAdmin, setCatatanAdmin] = useState<string | null>(null)
  const [nama, setNama] = useState('')
  const [angkatan, setAngkatan] = useState('')
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)
  const [mengirim, setMengirim] = useState(false)
  const [pesan, setPesan] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    async function muat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth?redirect=/verifikasi&msg=Login+dulu+untuk+mengajukan+verifikasi')
        return
      }

      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('users')
        .select('nama, status_alumni, angkatan, catatan_pendaftar, alasan_tolak, catatan_admin')
        .eq('id', user.id)
        .single()

      if (data) {
        setStatus(data.status_alumni ?? 'umum')
        setNama(data.nama ?? '')
        setAngkatan(data.angkatan ? String(data.angkatan) : '')
        setCatatan(data.catatan_pendaftar ?? '')
        setAlasanTolak(data.alasan_tolak ?? null)
        setCatatanAdmin(data.catatan_admin ?? null)
      }
      setLoading(false)
    }
    muat()
  }, [])

  async function kirim() {
    // Wajib terisi, tapi TIDAK divalidasi jumlah katanya. Banyak orang
    // Indonesia bernama satu kata, dan aturan "harus dua kata" akan menolak
    // nama yang justru benar.
    if (!nama.trim()) { setPesan({ text: 'Isi dulu nama lengkapmu.', ok: false }); return }
    if (!angkatan) { setPesan({ text: 'Pilih dulu angkatanmu.', ok: false }); return }

    setMengirim(true)
    try {
      // Nama ikut dikirim ke RPC, BUKAN di-UPDATE terpisah lebih dulu. Dua
      // permintaan REST tidak punya transaksi bersama, jadi cara lama bisa
      // meninggalkan nama yang sudah berubah tanpa pengajuan yang menyertainya.
      //
      // Semua aturannya ada di dalam RPC — angkatan yang masuk akal dan nama
      // tidak kosong. Mengirim ulang saat masih mengantre BOLEH: barisnya
      // ditimpa, bukan jadi antrean baru. UI tidak mengulang validasinya,
      // cukup menampilkan error.message apa adanya.
      const { data, error } = await supabase.rpc('ajukan_alumni', {
        p_angkatan: parseInt(angkatan),
        p_catatan: catatan.trim() || null,
        p_nama: nama.trim(),
      })
      // Sengaja tidak ada reset state di jalur gagal: yang sudah diketik tetap
      // di formulir supaya orangnya tinggal membetulkan lalu kirim lagi.
      if (error) throw new Error(error.message)

      // Dibaca dari nilai balik RPC, bukan disimpulkan dari state: `status`
      // di klien bisa saja sudah tertinggal dari keadaan sebenarnya.
      const diperbarui = Boolean((data as { diperbarui?: boolean } | null)?.diperbarui)

      setStatus('menunggu')
      setAlasanTolak(null)
      setCatatanAdmin(null)
      setPesan({
        text: diperbarui
          ? 'Pengajuanmu diperbarui. Data yang baru ini yang akan diperiksa admin.'
          : 'Pengajuan terkirim. Admin akan memeriksa datamu, biasanya dalam 1–2 hari.',
        ok: true,
      })
    } catch (e) {
      setPesan({ text: e instanceof Error ? e.message : 'Gagal mengirim. Coba lagi.', ok: false })
    } finally {
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

  // Sudah diakui alumni — tidak ada yang perlu dikerjakan di sini
  if (status === 'alumni') return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '520px', margin: '32px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '32px 20px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>🎓</div>
          <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>
            Kamu sudah terverifikasi
          </h2>
          <p style={{ fontSize: '13px', color: '#5a7da0', margin: '0 0 20px' }}>
            Akunmu sudah diakui sebagai alumni SMPN 5 Bandung dan masuk direktori alumni.
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
        </div>
      </div>
    </main>
  )

  const menunggu = status === 'menunggu'
  const ditolak = status === 'ditolak'

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>
          Verifikasi Alumni
        </h1>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '16px' }}>
          Supaya kamu masuk direktori alumni dan bisa berjualan
        </div>

        {/* Pengajuan sedang diperiksa */}
        {menunggu && (
          <div style={{ background: '#fff8e1', border: '0.5px solid #ffe082', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#f57f17', marginBottom: '4px' }}>
              ⏳ Pengajuanmu sedang diperiksa admin
            </div>
            <div style={{ fontSize: '12px', color: '#8d6e26', lineHeight: '1.7' }}>
              Biasanya 1–2 hari. Sambil menunggu, belanjamu tidak dibatasi sama sekali —
              yang belum bisa hanya berjualan.
              <br />
              <strong>Datamu masih bisa diperbaiki selama admin belum memutuskan</strong> —
              ubah di bawah, lalu perbarui pengajuanmu.
            </div>
          </div>
        )}

        {/* Admin minta data dilengkapi */}
        {catatanAdmin && (
          <div style={{ background: '#E6F1FB', border: '0.5px solid #b3d1ee', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>
              📝 Catatan dari admin
            </div>
            <div style={{ fontSize: '12px', color: '#0C447C', whiteSpace: 'pre-line' }}>{catatanAdmin}</div>
          </div>
        )}

        {/* Alasan penolakan */}
        {ditolak && alasanTolak && (
          <div style={{ background: '#fce4e4', border: '0.5px solid #f09595', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#c62828', marginBottom: '4px' }}>
              ❌ Pengajuan sebelumnya ditolak
            </div>
            <div style={{ fontSize: '12px', color: '#c62828', marginBottom: '6px' }}>{alasanTolak}</div>
            <div style={{ fontSize: '12px', color: '#8d4040' }}>
              Perbaiki sesuai catatan di atas, lalu kirim ulang.
            </div>
          </div>
        )}

        {/* Penjelasan */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '8px' }}>
            Kenapa perlu verifikasi?
          </div>
          <div style={{ fontSize: '12px', color: '#5a7da0', lineHeight: '1.7' }}>
            Belanja di Superfive Market terbuka untuk siapa saja. Yang diperiksa hanya
            dua hal: siapa yang masuk <strong style={{ color: '#1a1a1a' }}>direktori alumni</strong>,
            dan siapa yang boleh <strong style={{ color: '#1a1a1a' }}>berjualan</strong>.
            <br /><br />
            Admin memeriksa <strong style={{ color: '#1a1a1a' }}>nama dan angkatan</strong>-mu
            terhadap daftar alumni. Keduanya diisi langsung di bawah ini.
          </div>
        </div>

        {/* Form pengajuan */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          {/* Nama diedit di tempat, bukan dilempar ke /profil. Yang dilempar
              ke halaman lain kebanyakan tidak pernah kembali ke sini. */}
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="nama" style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', display: 'block', marginBottom: '4px' }}>
              Nama Lengkap *
            </label>
            <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '8px' }}>
              Pakai nama seperti yang tertulis di data sekolah dulu.
            </div>
            {/* TIDAK dikunci saat menunggu. Orang justru paling sering sadar
                namanya salah setelah mengirim, dan mengunci kolomnya di situ
                menghapus satu-satunya kesempatan membetulkannya. */}
            <input
              id="nama"
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Nama lengkapmu"
              style={{ width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box', minHeight: '44px' }}
            />

            {/* Peringatan, bukan pagar: tombolnya tetap hidup. Kita tidak tahu
                nama orang, jadi yang salah di sini cuma boleh diingatkan.
                Ikut tampil saat menunggu — di situ justru paling penting,
                karena nama yang salah sedang mengantre di meja admin. */}
            {namaTerlihatBelumLengkap(nama, email) && (
              <div style={{ marginTop: '8px', background: '#fff8e1', border: '0.5px solid #ffe082', borderRadius: '8px', padding: '9px 12px', fontSize: '11px', color: '#8d6e26', lineHeight: '1.7' }}>
                Nama ini akan dicocokkan admin dengan daftar alumni. Pakai nama
                lengkapmu saat sekolah dulu.
              </div>
            )}
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="angkatan" style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', display: 'block', marginBottom: '4px' }}>
              Angkatan (Tahun Lulus) *
            </label>
            <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '8px' }}>
              Ini yang dipakai admin untuk mencocokkan datamu dengan daftar alumni.
            </div>
            <select
              id="angkatan"
              value={angkatan}
              onChange={e => setAngkatan(e.target.value)}
              style={{ width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box', minHeight: '44px' }}
            >
              <option value="">-- Pilih Angkatan --</option>
              {Array.from({ length: TAHUN_INI - 1970 + 1 }, (_, i) => TAHUN_INI - i).map(y => (
                <option key={y} value={y}>Angkatan {y}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="catatan" style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', display: 'block', marginBottom: '4px' }}>
              Catatan untuk Admin
            </label>
            <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '8px' }}>
              Tulis hal yang membantu admin mengenalimu — nama wali kelas, kelas terakhir,
              nomor absen, atau teman seangkatan yang bisa dikonfirmasi.
            </div>
            <textarea
              id="catatan"
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              rows={4}
              placeholder="Misal: kelas 9C, wali kelas Bu Rina"
              style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif', background: '#fff' }}
            />
          </div>
        </div>

        {pesan && (
          <div style={{ background: pesan.ok ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesan.ok ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesan.ok ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
            {pesan.text}
          </div>
        )}

        {/* Tombolnya berubah, bukan hilang. Yang sedang mengantre tetap punya
            jalan untuk membetulkan datanya. */}
        <Tombol
          onClick={kirim}
          loading={mengirim}
          teksLoading={menunggu ? 'Memperbarui...' : 'Mengirim...'}
          penuh
          style={{ padding: '15px', fontSize: '14px', borderRadius: '10px', marginBottom: '10px' }}
        >
          {menunggu ? 'Perbarui Pengajuan' : ditolak ? 'Kirim Ulang Pengajuan' : 'Kirim Pengajuan'}
        </Tombol>

        <Link href="/" style={{ display: 'block', textAlign: 'center', color: '#5a7da0', fontSize: '13px', textDecoration: 'none', paddingBottom: '24px' }}>
          ← Kembali ke Beranda
        </Link>
      </div>
    </main>
  )
}
