'use client'
import { WARNA_PO, WARNA_PO_TUA } from './BadgePreorder'
import {
  tanggalWIB, tanggalBesok, waktuLengkapWIB, tanggalLengkap,
  type FormPO, type StatusBarang,
} from '../../lib/preorder'

// Pilihan status barang di form produk. Dipakai form tambah maupun form edit
// di dashboard, supaya aturannya tidak bercabang jadi dua versi.
//
// Sengaja radio, bukan saklar: pre-order bukan fitur tambahan yang diaktifkan,
// melainkan pernyataan tentang barangnya. Keduanya setara dan tidak ada yang
// terpilih dari awal, jadi produk baru tidak bisa berstatus ready hanya karena
// penjual melewatkan bagian ini — `validasiFormPO` menolak kalau masih kosong.

const gayaLabel: React.CSSProperties = {
  display: 'block', fontSize: '11px', color: '#5a7da0', marginBottom: '4px',
}

const gayaInput: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '0.5px solid #c5d9ef',
  borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff',
  fontFamily: 'inherit',
}

// Pratinjau di bawah kolom tanggal. Kotak tanggalnya sendiri dirender browser
// mengikuti bahasa sistem — laptop berbahasa Inggris menampilkan MM/DD/YYYY
// dan itu tidak bisa diubah dari sini. Yang bisa dikendalikan cuma teks ini,
// dan nama bulan yang dieja menghilangkan keraguan urutan hari/bulan.
function Pratinjau({ teks }: { teks: string | null }) {
  if (!teks) return null
  return (
    <div style={{ fontSize: '11px', color: WARNA_PO_TUA, marginTop: '4px', fontWeight: 600 }}>
      {teks}
    </div>
  )
}

type Props = {
  nilai: FormPO
  onChange: (f: FormPO) => void
}

export default function EditorPreorder({ nilai, onChange }: Props) {
  const ubah = (bagian: Partial<FormPO>) => onChange({ ...nilai, ...bagian })

  // Batas bawah pemilih tanggal: sehari setelah tanggal PO ditutup menurut
  // kalender WIB — kalender yang sama dengan chk_po_janji_kirim di database.
  const tutupWIB = tanggalWIB(nilai.selesai)
  const minJanji = tutupWIB ? tanggalBesok(tutupWIB) : undefined

  const po = nilai.status === 'preorder'

  return (
    <div style={{
      border: `0.5px solid ${po ? WARNA_PO : '#c5d9ef'}`,
      borderRadius: '10px',
      padding: '14px',
      background: po ? 'rgba(124,77,255,0.05)' : '#fff',
      marginBottom: '12px',
    }}>
      <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '10px' }}>
        Status barang *
      </div>

      <div role="radiogroup" aria-label="Status barang" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <PilihanStatus
          nilai="ready"
          terpilih={nilai.status}
          onPilih={s => ubah({ status: s })}
          judul="Ready Stock"
          keterangan="Barang sudah ada, dikirim setelah pesanan masuk."
        />
        <PilihanStatus
          nilai="preorder"
          terpilih={nilai.status}
          onPilih={s => ubah({ status: s })}
          judul="Pre-Order"
          keterangan="Barang dibuat setelah pesanan, ada waktu tunggu."
        />
      </div>

      {po && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 150px' }}>
              <label style={gayaLabel}>Mulai PO *</label>
              <input
                type="datetime-local"
                value={nilai.mulai}
                onChange={e => ubah({ mulai: e.target.value })}
                style={gayaInput}
              />
              <Pratinjau teks={waktuLengkapWIB(nilai.mulai)} />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={gayaLabel}>Tutup PO *</label>
              <input
                type="datetime-local"
                value={nilai.selesai}
                onChange={e => ubah({ selesai: e.target.value })}
                style={gayaInput}
              />
              <Pratinjau teks={waktuLengkapWIB(nilai.selesai)} />
            </div>
          </div>

          <div>
            <label style={gayaLabel}>Janji kirim *</label>
            <input
              type="date"
              value={nilai.janji}
              // Tidak boleh sama dengan hari PO ditutup; batas bawahnya
              // sehari sesudahnya, sama seperti CHECK di database
              min={minJanji}
              onChange={e => ubah({ janji: e.target.value })}
              style={gayaInput}
            />
            <Pratinjau teks={tanggalLengkap(nilai.janji)} />
            <div style={{
              marginTop: '6px', padding: '8px 10px', borderRadius: '6px',
              background: 'rgba(124,77,255,0.1)',
              fontSize: '11px', color: '#1a1a1a', lineHeight: 1.6,
            }}>
              <strong style={{ color: WARNA_PO_TUA }}>Ini janji kepada pembeli. </strong>
              Kalau pesanan belum dikirim sampai tanggal ini, sistem akan
              membatalkannya dan dana pembeli dikembalikan. Beri jarak yang
              masuk akal dari tanggal PO ditutup.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 130px' }}>
              <label style={gayaLabel}>Target minimal</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={nilai.target}
                onChange={e => ubah({ target: e.target.value })}
                placeholder="opsional"
                style={gayaInput}
              />
              <div style={{ fontSize: '10px', color: '#9ab4cc', marginTop: '3px' }}>
                Ditampilkan sebagai bilah progres
              </div>
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <label style={gayaLabel}>Kuota maksimal</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={nilai.maks}
                onChange={e => ubah({ maks: e.target.value })}
                placeholder="opsional"
                style={gayaInput}
              />
              <div style={{ fontSize: '10px', color: '#9ab4cc', marginTop: '3px' }}>
                PO tertutup sendiri saat kuota penuh
              </div>
            </div>
          </div>

          <div>
            <label style={gayaLabel}>Catatan penting untuk pembeli</label>
            <textarea
              value={nilai.catatan}
              onChange={e => ubah({ catatan: e.target.value })}
              placeholder="Contoh: Pembayaran di muka, tidak bisa dibatalkan setelah PO ditutup."
              rows={3}
              maxLength={300}
              style={{ ...gayaInput, resize: 'vertical' }}
            />
          </div>

          <div style={{ fontSize: '11px', color: '#5a7da0', lineHeight: 1.6 }}>
            Produk pre-order tidak memakai stok — jumlah pesanan yang masuk
            dihitung otomatis dan bisa dilihat di tab Ringkasan.
          </div>
        </div>
      )}
    </div>
  )
}

// Satu baris pilihan. Seluruh kotaknya bisa diklik karena dibungkus <label>,
// jadi sasaran sentuhnya lebar dan tetap satu kontrol bagi pembaca layar.
function PilihanStatus({ nilai, terpilih, onPilih, judul, keterangan }: {
  nilai: Exclude<StatusBarang, ''>
  terpilih: StatusBarang
  onPilih: (s: StatusBarang) => void
  judul: string
  keterangan: string
}) {
  const aktif = terpilih === nilai
  const warna = nilai === 'preorder' ? WARNA_PO : '#0C447C'

  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '11px 12px', borderRadius: '8px', cursor: 'pointer',
      border: `1px solid ${aktif ? warna : '#c5d9ef'}`,
      background: aktif ? '#fff' : 'transparent',
    }}>
      <input
        type="radio"
        name="status-barang"
        value={nilai}
        checked={aktif}
        onChange={() => onPilih(nilai)}
        style={{ width: '17px', height: '17px', marginTop: '1px', accentColor: warna, cursor: 'pointer', flexShrink: 0 }}
      />
      <span>
        <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: aktif ? warna : '#1a1a1a' }}>
          {judul}
        </span>
        <span style={{ display: 'block', fontSize: '11px', color: '#5a7da0', marginTop: '2px', lineHeight: 1.5 }}>
          {keterangan}
        </span>
      </span>
    </label>
  )
}
