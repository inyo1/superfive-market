'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatNomorWA, rapikanKota } from '../../lib/kontak'
import { salinTeks } from '../../lib/salin'
import { IkonPin, IkonWhatsApp } from './beranda/Ikon'

type Info = { kota: string | null; no_wa: string | null }

const TEMA = {
  terang: { teks: '#33465a', ikon: '#5a7da0', wa: '#128C7E', tombolLatar: '#fff', tombolGaris: '#c5d9ef', tombolTeks: '#0C447C' },
  gelap:  { teks: '#fff',    ikon: '#B5D4F4', wa: '#7be3a6', tombolLatar: 'rgba(255,255,255,0.12)', tombolGaris: 'rgba(255,255,255,0.3)', tombolTeks: '#fff' },
}

/**
 * Kota asal penjual dan nomor WA toko, dari RPC `info_toko_publik`
 * (SECURITY DEFINER, boleh anon). RPC itu mengembalikan 0 baris untuk
 * penjual yang tidak aktif — dianggap keduanya kosong, dan komponen ini
 * tidak merender apa pun.
 *
 * Nomornya SENGAJA teks biasa + tombol Salin, bukan tautan wa.me. Jalan
 * resmi ke WhatsApp tetap tombol Hubungi Penjual, yang lewat
 * `buka_kontak_toko` dan mencatat prospeknya. Tautan di sini akan membuat
 * prospek itu bocor tanpa tercatat.
 */
export default function InfoToko({ tokoId, tema = 'terang' }: { tokoId: string; tema?: 'terang' | 'gelap' }) {
  const [info, setInfo] = useState<Info | null>(null)
  const [salin, setSalin] = useState<'diam' | 'tersalin' | 'gagal'>('diam')
  const pewaktu = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!tokoId) return
    let hidup = true
    supabase.rpc('info_toko_publik', { p_toko_id: tokoId }).then(({ data, error }) => {
      if (!hidup) return
      // Gagal dimuat → diam saja. Ini informasi pelengkap; kartu toko tetap
      // utuh tanpanya, dan pesan error di sini cuma mengganggu pembeli.
      const baris = !error && Array.isArray(data) ? (data[0] as Info | undefined) : undefined
      setInfo({ kota: baris?.kota ?? null, no_wa: baris?.no_wa ?? null })
    })
    return () => { hidup = false }
  }, [tokoId])

  useEffect(() => () => { if (pewaktu.current) clearTimeout(pewaktu.current) }, [])

  const kota = rapikanKota(info?.kota)
  const nomor = info?.no_wa ? formatNomorWA(info.no_wa) : ''
  if (!kota && !nomor) return null

  const w = TEMA[tema]

  async function salinNomor() {
    // Yang disalin tanpa spasi dan tanda hubung, supaya langsung dikenali
    // aplikasi kontak dan kolom telepon mana pun
    const berhasil = await salinTeks('+' + (info?.no_wa ?? '').replace(/\D/g, ''))
    setSalin(berhasil ? 'tersalin' : 'gagal')
    if (pewaktu.current) clearTimeout(pewaktu.current)
    pewaktu.current = setTimeout(() => setSalin('diam'), 2000)
  }

  const baris: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px',
    color: w.teks, lineHeight: 1.4, minHeight: '28px',
  }

  return (
    <div style={{ display: 'grid', gap: '4px', marginTop: '12px' }}>
      {kota && (
        <div style={baris}>
          <span style={{ color: w.ikon, display: 'inline-flex', flexShrink: 0 }}><IkonPin size={17} /></span>
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{kota}</span>
        </div>
      )}
      {nomor && (
        <div style={baris}>
          <span style={{ color: w.wa, display: 'inline-flex', flexShrink: 0 }}><IkonWhatsApp size={17} /></span>
          <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{nomor}</span>
          <button
            type="button"
            onClick={salinNomor}
            aria-label={`Salin nomor WhatsApp ${nomor}`}
            style={{
              marginLeft: '2px', padding: '3px 10px', minHeight: '28px', borderRadius: '999px',
              border: `1px solid ${w.tombolGaris}`, background: w.tombolLatar, color: w.tombolTeks,
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}
          >
            {salin === 'tersalin' ? 'Tersalin' : salin === 'gagal' ? 'Gagal menyalin' : 'Salin'}
          </button>
          <span role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            {salin === 'tersalin' ? 'Nomor tersalin' : salin === 'gagal' ? 'Gagal menyalin nomor' : ''}
          </span>
        </div>
      )}
    </div>
  )
}
