'use client'
import { useHitungMundur } from '../hooks/useHitungMundur'

// Sisa waktu penjual untuk mengirim sebuah pesanan.
//
// Ini bukan hiasan. Lewat `batas_kirim`, tugas harian membatalkan pesanan dan
// membuat antrean pengembalian dana — pesanannya hilang beserta uangnya. Jadi
// tampilannya sengaja berubah keras di bawah 24 jam.

const MERAH = '#c62828'
const ORANYE = '#e65100'

export default function TenggatKirim({ batasKirim }: { batasKirim: string | null | undefined }) {
  const mundur = useHitungMundur(batasKirim)

  // Belum lunas atau tidak punya tenggat: tidak ada yang perlu ditakuti
  if (!batasKirim) return null
  // Jam klien belum jalan — lebih baik kosong sesaat daripada angka salah
  if (!mundur.siap) return null

  const sisaMs = new Date(batasKirim).getTime() - mundur.sekarang
  const lewat = sisaMs <= 0
  const mendesak = !lewat && sisaMs < 24 * 60 * 60 * 1000

  const warna = lewat || mendesak ? MERAH : ORANYE
  const latar = lewat || mendesak ? '#fce4e4' : '#fff3e0'

  return (
    <div style={{
      background: latar, border: `0.5px solid ${warna}`,
      borderRadius: '6px', padding: '8px 10px',
      fontSize: '11px', color: warna, lineHeight: 1.6,
    }}>
      {lewat ? (
        <>
          <strong>Lewat tenggat kirim.</strong> Pesanan ini akan dibatalkan
          sistem dan dananya dikembalikan ke pembeli.
        </>
      ) : mendesak ? (
        <>
          <strong>Kirim dalam {mundur.teks}.</strong> Lewat dari itu pesanan
          dibatalkan otomatis dan dananya dikembalikan ke pembeli.
        </>
      ) : (
        <>⏳ Sisa waktu kirim <strong>{mundur.teks}</strong></>
      )}
    </div>
  )
}
