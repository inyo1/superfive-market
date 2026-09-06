'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../context/ToastContext'
import { normalisasiWA, normalisasiIG, tampilkanWA } from '../../lib/kontak'

type Kontak = {
  no_wa: string | null
  ig_username: string | null
  link_lain: string | null
  pesan_awal: string | null
}

const KOSONG: Kontak = { no_wa: '', ig_username: '', link_lain: '', pesan_awal: '' }

const gayaInput: React.CSSProperties = {
  width: '100%', padding: '11px 12px', border: '0.5px solid #c5d9ef',
  borderRadius: '8px', fontSize: '13px', outline: 'none',
  boxSizing: 'border-box', minHeight: '44px', background: '#fff',
}

const gayaLabel: React.CSSProperties = {
  fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px',
}

const gayaBantuan: React.CSSProperties = {
  fontSize: '11px', color: '#9ab4cc', marginTop: '4px', lineHeight: 1.5,
}

/**
 * Form kontak toko — sumber nomor yang dipakai tombol "Hubungi Penjual".
 *
 * Pemilik toko boleh membaca dan menulis barisnya sendiri di `toko_kontak`;
 * yang tidak boleh membacanya adalah pembeli, dan itulah kenapa jalur pembeli
 * lewat RPC `buka_kontak_toko`. Jadi query langsung di komponen INI memang
 * benar — jangan menyalin polanya ke halaman publik.
 */
export default function FormKontakToko({ tokoId }: { tokoId: string }) {
  const toast = useToast()
  const [nilai, setNilai] = useState<Kontak>(KOSONG)
  const [memuat, setMemuat] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galatWa, setGalatWa] = useState<string | null>(null)

  useEffect(() => {
    let hidup = true
    async function muat() {
      // maybeSingle: toko yang belum pernah mengisi kontak memang tidak punya
      // baris di sini, dan itu keadaan normal — bukan error
      const { data, error } = await supabase
        .from('toko_kontak')
        .select('no_wa, ig_username, link_lain, pesan_awal')
        .eq('toko_id', tokoId)
        .maybeSingle()

      if (!hidup) return
      if (error) toast.error('Gagal memuat kontak toko: ' + error.message)
      if (data) {
        setNilai({
          no_wa: data.no_wa ?? '',
          ig_username: data.ig_username ?? '',
          link_lain: data.link_lain ?? '',
          pesan_awal: data.pesan_awal ?? '',
        })
      }
      setMemuat(false)
    }
    muat()
    return () => { hidup = false }
    // toast sengaja tidak masuk dependency: fungsinya stabil dari context,
    // dan memasukkannya membuat form dimuat ulang tiap kali ada notifikasi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokoId])

  function ubah<K extends keyof Kontak>(kunci: K, v: string) {
    setNilai(prev => ({ ...prev, [kunci]: v }))
    if (kunci === 'no_wa') setGalatWa(null)
  }

  async function simpan() {
    if (menyimpan) return

    const waMentah = (nilai.no_wa ?? '').trim()
    const ig = normalisasiIG(nilai.ig_username ?? '')

    // Nomor boleh dikosongkan sepenuhnya — penjual yang hanya memakai
    // Instagram tidak dipaksa punya WhatsApp. Yang divalidasi hanya nomor
    // yang benar-benar diisi.
    let waBersih: string | null = null
    if (waMentah) {
      const hasil = normalisasiWA(waMentah)
      if (!hasil.ok) { setGalatWa(hasil.pesan); return }
      waBersih = hasil.nomor
    }

    if (!waBersih && !ig) {
      toast.peringatan('Isi minimal salah satu: nomor WhatsApp atau username Instagram.')
      return
    }

    setMenyimpan(true)
    try {
      // toko_id adalah kunci primernya, jadi upsert cukup — satu toko satu
      // baris kontak, dan penjual boleh menyimpannya berkali-kali
      const { error } = await supabase
        .from('toko_kontak')
        .upsert({
          toko_id: tokoId,
          no_wa: waBersih,
          ig_username: ig || null,
          link_lain: (nilai.link_lain ?? '').trim() || null,
          pesan_awal: (nilai.pesan_awal ?? '').trim() || null,
        }, { onConflict: 'toko_id' })

      if (error) { toast.error('Gagal menyimpan kontak: ' + error.message); return }

      // Nomor yang sudah dinormalkan dikembalikan ke kolomnya, supaya penjual
      // melihat bentuk yang benar-benar tersimpan — bukan yang tadi diketik
      setNilai(prev => ({ ...prev, no_wa: waBersih ?? '', ig_username: ig }))
      toast.sukses('Kontak toko tersimpan.')
    } finally {
      setMenyimpan(false)
    }
  }

  if (memuat) {
    return (
      <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef' }}>
        <div style={{ fontSize: '13px', color: '#5a7da0' }}>Memuat kontak toko…</div>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef' }}>
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
        Kontak Toko
      </div>
      <p style={{ fontSize: '12px', color: '#5a7da0', lineHeight: 1.6, margin: '0 0 16px' }}>
        Nomor ini yang dipakai tombol <strong>Hubungi Penjual</strong> di halaman produkmu.
        Kalau belum diisi, pembeli tidak bisa menghubungimu sama sekali.
      </p>

      <div style={{ marginBottom: '12px' }}>
        <label style={gayaLabel}>Nomor WhatsApp</label>
        <input
          value={nilai.no_wa ?? ''}
          onChange={e => ubah('no_wa', e.target.value)}
          placeholder="081234567890"
          inputMode="tel"
          style={{ ...gayaInput, borderColor: galatWa ? '#f09595' : '#c5d9ef' }}
        />
        {galatWa ? (
          <div style={{ ...gayaBantuan, color: '#c62828' }}>{galatWa}</div>
        ) : (
          <div style={gayaBantuan}>
            Boleh ditulis 08…, +62…, atau 62… — nanti dirapikan otomatis.
            {nilai.no_wa ? ` Tersimpan sebagai ${tampilkanWA(nilai.no_wa)}.` : ''}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={gayaLabel}>Username Instagram</label>
        <input
          value={nilai.ig_username ?? ''}
          onChange={e => ubah('ig_username', e.target.value)}
          placeholder="tokokamu"
          style={gayaInput}
        />
        <div style={gayaBantuan}>
          Dipakai sebagai cadangan kalau nomor WhatsApp kosong. Tanpa @.
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={gayaLabel}>Link Lain <span style={{ color: '#9ab4cc' }}>(opsional)</span></label>
        <input
          value={nilai.link_lain ?? ''}
          onChange={e => ubah('link_lain', e.target.value)}
          placeholder="https://linktr.ee/tokokamu"
          inputMode="url"
          style={gayaInput}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={gayaLabel}>Pesan Pembuka <span style={{ color: '#9ab4cc' }}>(opsional)</span></label>
        <textarea
          value={nilai.pesan_awal ?? ''}
          onChange={e => ubah('pesan_awal', e.target.value)}
          rows={3}
          placeholder="Kosongkan saja kalau tidak yakin."
          style={{ ...gayaInput, minHeight: '76px', resize: 'vertical', fontFamily: 'inherit' }}
        />
        <div style={gayaBantuan}>
          Kalau diisi, teks ini yang muncul di WhatsApp pembeli menggantikan pesan
          bawaan. Isinya sama untuk semua orang — nama pembeli dan nama produk
          tidak ikut terisi otomatis, jadi biarkan kosong kalau ragu.
        </div>
      </div>

      <button
        onClick={simpan}
        disabled={menyimpan}
        style={{
          width: '100%', background: menyimpan ? '#7fa8c9' : '#0C447C', color: '#fff',
          border: 'none', padding: '12px', borderRadius: '8px', fontSize: '13px',
          fontWeight: '600', cursor: menyimpan ? 'not-allowed' : 'pointer', minHeight: '44px',
        }}
      >
        {menyimpan ? 'Menyimpan…' : 'Simpan Kontak'}
      </button>
    </div>
  )
}
