'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { unduhKartuPengingat } from '../../../lib/kartuPengingat'

// Periksa Akun — satu layar sebelum signUp dikirim (Wave 3).
//
// Menggantikan dialog konfirmasi angkatan: pendaftar alumni cukup melewati
// SATU layar, bukan dua. Peringatan angkatan terkunci ikut ditampilkan di sini
// karena ajukan_alumni() mengunci angkatan begitu berhasil.
//
// Keamanan kata sandi:
// - kata sandi hanya dibaca dari prop, ditampilkan tertutup secara bawaan,
//   dan baru terlihat kalau pengguna sendiri menekan tombol mata
// - tidak pernah ditulis ke storage, URL, log, maupun kartu pengingat —
//   unduhKartuPengingat() memang hanya menerima email
// - menyimpan sandi diserahkan ke pengelola kata sandi bawaan peramban/HP;
//   formulir pendaftarannya memakai autocomplete="username"/"new-password"

type Props = {
  terbuka: boolean
  nama: string
  email: string
  kataSandi: string
  /** "Alumni SMPN 5 Bandung" / "Teman atau keluarga alumni" */
  jenisLabel: string
  /** "Superfive 92" — hanya untuk alumni */
  angkatanLabel: string | null
  memproses: boolean
  onKembali: () => void
  onDaftar: () => void
}

const NAVY = '#062F59'
const BIRU = '#07589F'
const TEKS2 = '#4f6b87'

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #EAF1F8' }}>
      <dt style={{ fontSize: '13px', color: TEKS2, marginBottom: '3px' }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: NAVY, wordBreak: 'break-word' }}>{children}</dd>
    </div>
  )
}

// Isinya dipasang ulang setiap kali dialog dibuka, jadi sandi selalu mulai
// tertutup dan status kartu selalu kosong — tanpa perlu mereset state.
export default function TinjauAkun(props: Props) {
  return props.terbuka ? <IsiTinjau {...props} /> : null
}

function IsiTinjau({
  nama, email, kataSandi, jenisLabel, angkatanLabel, memproses, onKembali, onDaftar,
}: Props) {
  const [terlihat, setTerlihat] = useState(false)
  const [kartu, setKartu] = useState<'' | 'membuat' | 'selesai' | 'gagal'>('')
  const kotakRef = useRef<HTMLDivElement>(null)
  const kembaliRef = useRef<HTMLButtonElement>(null)

  // Fokus ke tombol aman (Perbaiki) saat dibuka, dan dikembalikan ke
  // pemicunya saat ditutup
  useEffect(() => {
    const sebelumnya = document.activeElement as HTMLElement | null
    // preventScroll: tanpa ini isi dialog tergulir ke tombol di bawah dan
    // judulnya tidak terlihat
    kembaliRef.current?.focus({ preventScroll: true })
    return () => { sebelumnya?.focus?.() }
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && !memproses) { e.stopPropagation(); onKembali(); return }
    if (e.key !== 'Tab' || !kotakRef.current) return
    // Fokus berputar di dalam dialog
    const fokusable = kotakRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')
    if (!fokusable.length) return
    const pertama = fokusable[0], terakhir = fokusable[fokusable.length - 1]
    if (e.shiftKey && document.activeElement === pertama) { e.preventDefault(); terakhir.focus() }
    else if (!e.shiftKey && document.activeElement === terakhir) { e.preventDefault(); pertama.focus() }
  }

  async function unduhKartu() {
    setKartu('membuat')
    try {
      await unduhKartuPengingat(email)
      setKartu('selesai')
    } catch {
      setKartu('gagal')
    }
  }

  // Portal ke body: <main> punya animasi (stacking context sendiri), jadi
  // tanpa portal BottomNav ikut tampil di atas lapisan gelap dialog
  return createPortal(
    <div
      className="tinjau-latar"
      onClick={memproses ? undefined : onKembali}
      onKeyDown={onKeyDown}
    >
      <div
        ref={kotakRef}
        className="tinjau-kotak"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tinjau-judul"
        aria-describedby="tinjau-ket"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="tinjau-judul" className="tinjau-judul">Periksa akunmu dulu</h2>
        <p id="tinjau-ket" className="tinjau-ket">
          Pastikan email ini benar dan bisa kamu buka — tautan aktivasi akun akan dikirim ke sana.
        </p>

        <dl style={{ margin: '0 0 14px' }}>
          <Baris label="Nama">{nama}</Baris>
          <Baris label="Email untuk masuk">{email}</Baris>
          <div style={{ padding: '10px 0', borderBottom: '1px solid #EAF1F8' }}>
            <dt style={{ fontSize: '13px', color: TEKS2, marginBottom: '3px' }}>Kata sandi</dt>
            <dd style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                aria-live="polite"
                style={{ flex: 1, minWidth: 0, fontSize: '16px', fontWeight: 600, color: NAVY, wordBreak: 'break-all', letterSpacing: terlihat ? 0 : '2px' }}
              >
                {terlihat ? kataSandi : '•'.repeat(Math.min(kataSandi.length, 16))}
              </span>
              <button
                type="button"
                className="tinjau-mata"
                onClick={() => setTerlihat(v => !v)}
                aria-pressed={terlihat}
              >
                {terlihat ? 'Sembunyikan' : 'Lihat'}
              </button>
            </dd>
          </div>
          <Baris label="Daftar sebagai">{jenisLabel}</Baris>
          {angkatanLabel && <Baris label="Angkatan">{angkatanLabel}</Baris>}
        </dl>

        {angkatanLabel && (
          <p className="tinjau-peringatan">
            Setelah ini angkatan tidak bisa kamu ubah sendiri. Pastikan <strong>{angkatanLabel}</strong> sudah benar.
          </p>
        )}

        <div className="tinjau-simpan">
          <div style={{ fontSize: '14px', fontWeight: 700, color: NAVY, marginBottom: '4px' }}>Simpan kata sandimu</div>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: TEKS2, lineHeight: 1.6 }}>
            Setelah menekan Daftar, peramban atau HP biasanya menawarkan <strong>&ldquo;Simpan kata sandi&rdquo;</strong> —
            pilih <strong>Simpan</strong>. Kata sandi tersimpan aman di Google Password Manager, iCloud Keychain,
            atau pengelola kata sandi lain milikmu, dan terisi otomatis saat masuk berikutnya.
          </p>
          <button type="button" className="tinjau-kartu" onClick={unduhKartu} disabled={kartu === 'membuat'}>
            {kartu === 'membuat' ? 'Menyiapkan kartu…' : 'Unduh Kartu Pengingat Akun (PNG)'}
          </button>
          <p role="status" style={{ margin: '6px 0 0', fontSize: '12px', color: kartu === 'gagal' ? '#c62828' : TEKS2, lineHeight: 1.5 }}>
            {kartu === 'selesai'
              ? 'Kartu tersimpan di folder unduhan. Isinya alamat website, email, dan petunjuk lupa kata sandi — tanpa kata sandi.'
              : kartu === 'gagal'
                ? 'Kartu gagal dibuat di peramban ini. Kamu tetap bisa mendaftar.'
                : 'Berisi alamat website, email, dan petunjuk lupa kata sandi. Kata sandi tidak ikut dicantumkan.'}
          </p>
        </div>

        <div className="tinjau-aksi">
          <button ref={kembaliRef} type="button" className="tinjau-kembali" onClick={onKembali} disabled={memproses}>
            Perbaiki
          </button>
          <button type="button" className="tinjau-daftar" onClick={onDaftar} disabled={memproses}>
            {memproses && <span className="spinner-tombol" />}
            {memproses ? 'Mendaftarkan…' : 'Ya, Daftarkan'}
          </button>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: TEKS2, textAlign: 'center' }}>
          Tidak ada yang dikirim sebelum kamu menekan <span style={{ color: BIRU, fontWeight: 600 }}>Ya, Daftarkan</span>.
        </p>
      </div>
    </div>,
    document.body,
  )
}
