'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'
import Skeleton, { SkeletonPanel } from '../components/Skeleton'
import Tombol from '../components/Tombol'
import { useTampilSkeleton } from '../hooks/useSkeleton'

// Pintu berjualan — satu-satunya pagar yang tersisa setelah verifikasi dipecah
// dua sumbu. Yang menentukan toko tayang hanya users.status_penjual; belanja
// tidak pernah bergantung padanya.
//
// Semua aturan siapa-boleh-apa ada di dalam ajukan_jadi_penjual(). Halaman ini
// tidak mengulang validasinya — pesan error dari RPC ditampilkan apa adanya.

// Ditulis apa adanya, tidak diperhalus. Penjual yang membaca ini sedang
// menyetujui sesuatu yang akibatnya nyata: pesanannya bisa dibatalkan sistem.
const ATURAN = [
  'Barang ready wajib dikirim maksimal 3 hari setelah pembayaran diterima.',
  'Barang pre-order wajib dikirim sesuai tanggal janji kirim yang kamu tetapkan.',
  'Pesanan yang lewat batas DIBATALKAN SISTEM dan dana pembeli dikembalikan.',
  'Nomor resi wajib diisi saat menandai pesanan dikirim.',
]

function rangkaiAlamat(d: Record<string, string | null>) {
  const bagian: string[] = []
  if (d.jalan) bagian.push(d.jalan)
  const kelKec = [
    d.kelurahan && `Kel. ${d.kelurahan}`,
    d.kecamatan && `Kec. ${d.kecamatan}`,
  ].filter(Boolean).join(', ')
  if (kelKec) bagian.push(kelKec)
  const kota = [d.kota, d.provinsi, d.kode_pos].filter(Boolean).join(', ')
  if (kota) bagian.push(kota)
  return bagian.join('\n')
}

const KOTAK = { background: '#fff', borderRadius: '12px', padding: '16px', border: '0.5px solid #c5d9ef', marginBottom: '12px' } as const
const LABEL = { fontSize: '13px', fontWeight: '600', color: '#0C447C', display: 'block', marginBottom: '4px' } as const
const KETERANGAN = { fontSize: '11px', color: '#5a7da0', marginBottom: '8px', lineHeight: '1.6' } as const
const ISIAN = { width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', minHeight: '44px', fontFamily: 'sans-serif' } as const

export default function JualPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)

  const [namaAkun, setNamaAkun] = useState('')
  const [statusAlumni, setStatusAlumni] = useState<string | null>(null)
  const [statusPenjual, setStatusPenjual] = useState<string | null>(null)
  const [alasanPenjual, setAlasanPenjual] = useState<string | null>(null)

  const [alamat, setAlamat] = useState('')
  const [bankNama, setBankNama] = useState('')
  const [bankRekening, setBankRekening] = useState('')
  const [bankAtasNama, setBankAtasNama] = useState('')
  const [setuju, setSetuju] = useState(false)

  const [mengirim, setMengirim] = useState(false)
  const [pesan, setPesan] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    async function muat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth?redirect=/jual&msg=Login+dulu+untuk+mulai+berjualan')
        return
      }

      const { data } = await supabase
        .from('users')
        .select('nama, status_alumni, status_penjual, alasan_penjual, alamat_lengkap, bank_nama, bank_rekening, bank_atas_nama, jalan, kelurahan, kecamatan, kota, provinsi, kode_pos')
        .eq('id', user.id)
        .single()

      if (data) {
        setNamaAkun(data.nama ?? '')
        setStatusAlumni(data.status_alumni ?? 'umum')
        setStatusPenjual(data.status_penjual ?? 'belum_ajukan')
        setAlasanPenjual(data.alasan_penjual ?? null)
        // Alamat pengiriman dipakai ulang dari alamat profil kalau belum pernah
        // diisi, supaya penjual tidak mengetik dua kali hal yang sama
        setAlamat(data.alamat_lengkap ?? rangkaiAlamat(data))
        setBankNama(data.bank_nama ?? '')
        setBankRekening(data.bank_rekening ?? '')
        setBankAtasNama(data.bank_atas_nama ?? data.nama ?? '')
      }
      setLoading(false)
    }
    muat()
  }, [])

  async function kirim() {
    setMengirim(true)
    setPesan(null)
    try {
      const { error } = await supabase.rpc('ajukan_jadi_penjual', {
        p_alamat: alamat.trim(),
        p_bank_nama: bankNama.trim(),
        p_bank_rekening: bankRekening.trim(),
        p_bank_atas_nama: bankAtasNama.trim(),
        p_setuju_aturan: setuju,
      })
      if (error) throw new Error(error.message)

      setStatusPenjual('menunggu')
      setAlasanPenjual(null)
      setPesan({ text: 'Pengajuan terkirim. Admin akan memeriksanya, biasanya dalam 1–2 hari.', ok: true })
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
        <Skeleton tinggi={11} lebar="65%" style={{ marginBottom: '18px' }} />
        <SkeletonPanel baris={2} />
        <SkeletonPanel baris={3} />
      </div>
    </main>
  )

  // Syaratnya alumni terverifikasi, dan database memang akan menolak kalau
  // bukan. Formulirnya tidak ditampilkan supaya tidak ada yang mengisi panjang
  // lebar lalu ditolak di detik terakhir.
  if (statusAlumni !== 'alumni') return (
    <Bingkai>
      <div style={{ ...KOTAK, textAlign: 'center', padding: '28px 20px' }}>
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>🎓</div>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
          Verifikasi alumni dulu
        </div>
        <p style={{ fontSize: '13px', color: '#5a7da0', lineHeight: '1.7', margin: '0 0 18px' }}>
          {statusAlumni === 'menunggu'
            ? 'Pengajuan alumni-mu sedang diperiksa admin. Begitu disetujui, halaman ini terbuka sendiri.'
            : 'Yang boleh berjualan di Superfive Market hanya alumni SMPN 5 Bandung yang sudah terverifikasi.'}
        </p>
        <Link href="/verifikasi" style={{ display: 'inline-flex', alignItems: 'center', background: '#0C447C', color: '#fff', padding: '0 20px', minHeight: '44px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
          {statusAlumni === 'menunggu' ? 'Lihat Status Pengajuan' : 'Verifikasi Alumni'}
        </Link>
      </div>
    </Bingkai>
  )

  if (statusPenjual === 'aktif') return (
    <Bingkai>
      <div style={{ ...KOTAK, textAlign: 'center', padding: '28px 20px' }}>
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>🏪</div>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
          Kamu sudah jadi penjual
        </div>
        <p style={{ fontSize: '13px', color: '#5a7da0', lineHeight: '1.7', margin: '0 0 18px' }}>
          Tokomu sudah tayang. Kelola produk dan pesanan dari dashboard.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard" style={{ flex: 1, background: '#0C447C', color: '#fff', padding: '11px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
            Dashboard
          </Link>
          <Link href="/produk/tambah" style={{ flex: 1, background: '#fff', color: '#0C447C', border: '1px solid #0C447C', padding: '11px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
            Tambah Produk
          </Link>
        </div>
      </div>
    </Bingkai>
  )

  if (statusPenjual === 'menunggu') return (
    <Bingkai>
      <div style={{ background: '#fff8e1', border: '0.5px solid #ffe082', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#f57f17', marginBottom: '6px' }}>
          ⏳ Pengajuanmu sedang diperiksa
        </div>
        <div style={{ fontSize: '12px', color: '#8d6e26', lineHeight: '1.7' }}>
          Admin memeriksa alamat dan data rekeningmu, biasanya 1–2 hari.
          Begitu disetujui, tokomu langsung bisa dibuka.
        </div>
      </div>
      <div style={{ ...KOTAK }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '10px' }}>
          Aturan yang sudah kamu setujui
        </div>
        <DaftarAturan />
      </div>
      <Link href="/" style={{ display: 'block', textAlign: 'center', color: '#5a7da0', fontSize: '13px', textDecoration: 'none' }}>
        ← Kembali ke Beranda
      </Link>
    </Bingkai>
  )

  if (statusPenjual === 'dibekukan') return (
    <Bingkai>
      <div style={{ background: '#fff', border: '0.5px solid #f09595', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#c62828', marginBottom: '6px' }}>
          Akun penjualmu sedang dibekukan
        </div>
        {alasanPenjual && (
          <div style={{ background: '#fce4e4', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#c62828', marginBottom: '10px', whiteSpace: 'pre-line' }}>
            {alasanPenjual}
          </div>
        )}
        <div style={{ fontSize: '12px', color: '#8d4040', lineHeight: '1.7' }}>
          Tokomu tidak tayang, tapi <strong>pesanan yang sedang berjalan tetap wajib
          kamu selesaikan</strong> — kirim barangnya seperti biasa lewat dashboard.
          Untuk membuka pembekuan, hubungi admin.
        </div>
      </div>
      <Link href="/dashboard" style={{ display: 'block', textAlign: 'center', color: '#0C447C', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
        Ke Dashboard →
      </Link>
    </Bingkai>
  )

  // 'belum_ajukan' dan 'ditolak' — keduanya boleh mengisi formulir
  const ditolak = statusPenjual === 'ditolak'
  const lengkap = Boolean(alamat.trim() && bankNama.trim() && bankRekening.trim() && bankAtasNama.trim() && setuju)

  return (
    <Bingkai>
      {ditolak && (
        <div style={{ background: '#fce4e4', border: '0.5px solid #f09595', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#c62828', marginBottom: '4px' }}>
            ❌ Pengajuan sebelumnya ditolak
          </div>
          {alasanPenjual && (
            <div style={{ fontSize: '12px', color: '#c62828', marginBottom: '6px', whiteSpace: 'pre-line' }}>{alasanPenjual}</div>
          )}
          <div style={{ fontSize: '12px', color: '#8d4040' }}>
            Perbaiki sesuai catatan di atas, lalu kirim ulang.
          </div>
        </div>
      )}

      {/* Alamat asal pengiriman */}
      <div style={KOTAK}>
        <label htmlFor="alamat" style={LABEL}>Alamat Lengkap *</label>
        <div style={KETERANGAN}>
          Ini alamat asal pengiriman — dari sini barangmu dijemput kurir.
        </div>
        <textarea
          id="alamat"
          value={alamat}
          onChange={e => setAlamat(e.target.value)}
          rows={4}
          placeholder={'Jl. Contoh No. 10, RT 01/RW 02\nKel. Sukajadi, Kec. Sukajadi\nBandung, Jawa Barat, 40161'}
          style={{ ...ISIAN, resize: 'none' }}
        />
      </div>

      {/* Rekening */}
      <div style={KOTAK}>
        <div style={LABEL}>Data Rekening *</div>
        <div style={KETERANGAN}>
          Ke sinilah hasil penjualanmu dikirim. Nama rekening harus sama dengan nama akun
          {namaAkun ? <> — akunmu terdaftar sebagai <strong style={{ color: '#1a1a1a' }}>{namaAkun}</strong>.</> : '.'}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="bank-nama" style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Nama Bank</label>
            <input id="bank-nama" value={bankNama} onChange={e => setBankNama(e.target.value)} placeholder="BCA" style={ISIAN} />
          </div>
          <div style={{ flex: 1.4 }}>
            <label htmlFor="bank-rek" style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Nomor Rekening</label>
            <input id="bank-rek" value={bankRekening} onChange={e => setBankRekening(e.target.value.replace(/[^\d-]/g, ''))} inputMode="numeric" placeholder="1234567890" style={ISIAN} />
          </div>
        </div>

        <div>
          <label htmlFor="bank-an" style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Atas Nama</label>
          <input id="bank-an" value={bankAtasNama} onChange={e => setBankAtasNama(e.target.value)} placeholder="Nama sesuai buku tabungan" style={ISIAN} />
        </div>
      </div>

      {/* Aturan penjual */}
      <div style={KOTAK}>
        <div style={LABEL}>Aturan Penjual</div>
        <div style={KETERANGAN}>Baca dulu sampai habis. Ini yang mengikat begitu tokomu tayang.</div>

        <DaftarAturan />

        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
          marginTop: '14px', padding: '12px', borderRadius: '8px',
          border: `1px solid ${setuju ? '#0C447C' : '#c5d9ef'}`,
          background: setuju ? '#E6F1FB' : '#fff',
        }}>
          <input
            type="checkbox"
            checked={setuju}
            onChange={e => setSetuju(e.target.checked)}
            style={{ accentColor: '#0C447C', width: '17px', height: '17px', flexShrink: 0, marginTop: '1px' }}
          />
          <span style={{ fontSize: '12px', color: setuju ? '#0C447C' : '#1a1a1a', lineHeight: '1.6', fontWeight: setuju ? '600' : '400' }}>
            Saya sudah membaca dan menyetujui keempat aturan di atas.
          </span>
        </label>
      </div>

      {pesan && (
        <div style={{ background: pesan.ok ? '#e8f5e9' : '#fce4e4', border: `0.5px solid ${pesan.ok ? '#a5d6a7' : '#f09595'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: pesan.ok ? '#2e7d32' : '#c62828', marginBottom: '12px' }}>
          {pesan.text}
        </div>
      )}

      <Tombol
        onClick={kirim}
        loading={mengirim}
        teksLoading="Mengirim..."
        disabled={!lengkap}
        penuh
        style={{ padding: '15px', fontSize: '14px', borderRadius: '10px', marginBottom: '10px' }}
      >
        {ditolak ? 'Kirim Ulang Pengajuan' : 'Kirim Pengajuan'}
      </Tombol>

      <Link href="/" style={{ display: 'block', textAlign: 'center', color: '#5a7da0', fontSize: '13px', textDecoration: 'none' }}>
        ← Kembali ke Beranda
      </Link>
    </Bingkai>
  )
}

// Di luar komponen, bukan di dalamnya: komponen yang dibuat saat render akan
// kehilangan state tiap kali induknya render ulang.
function Bingkai({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px 16px 32px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 4px' }}>
          Mulai Berjualan
        </h1>
        <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '16px' }}>
          Buka toko di Superfive Market
        </div>
        {children}
      </div>
    </main>
  )
}

function DaftarAturan() {
  return (
    <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {ATURAN.map(a => (
        <li key={a} style={{ fontSize: '12px', color: '#1a1a1a', lineHeight: '1.7' }}>{a}</li>
      ))}
    </ol>
  )
}
