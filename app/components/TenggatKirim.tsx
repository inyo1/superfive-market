'use client'
import { useHitungMundur } from '../hooks/useHitungMundur'
import { tenggatEfektif, waktuWIB } from '../../lib/statusPesanan'
import { formatSisa } from '../../lib/preorder'

// Sisa waktu penjual untuk mengirim sebuah pesanan.
//
// Yang ditampilkan adalah tenggat EFEKTIF, bukan `batas_kirim` mentah. Tugas
// pembatalan jalan sekali sehari pukul 05:05 WIB, jadi pesanan yang tenggatnya
// jatuh tengah malam sebenarnya masih bisa diselamatkan sampai pagi. Kalau
// yang ditampilkan angka mentahnya, penjual panik padahal masih punya jam-jam
// terakhir yang memang sengaja diberikan. Perhitungannya di tenggatEfektif().
//
// Ini bukan hiasan: lewat tenggat berarti pesanan dibatalkan dan dananya
// dikembalikan ke pembeli — penjualannya hilang.

const MERAH = '#c62828'
const ORANYE = '#e65100'

const JAM_MENDESAK = 12

export default function TenggatKirim({ batasKirim }: { batasKirim: string | null | undefined }) {
  const tenggat = tenggatEfektif(batasKirim)
  const mundur = useHitungMundur(tenggat ? tenggat.toISOString() : null)

  // Belum lunas atau tidak punya tenggat: tidak ada yang perlu ditakuti
  if (!tenggat) return null
  // Jam klien belum jalan — lebih baik kosong sesaat daripada angka salah
  if (!mundur.siap) return null

  const sisaMs = tenggat.getTime() - mundur.sekarang
  const lewat = sisaMs <= 0
  const mendesak = !lewat && sisaMs < JAM_MENDESAK * 3600_000

  // Sudah lewat batas_kirim mentah tapi belum disapu cron — masih bisa dikirim
  const lewatBatasMentah = !lewat && batasKirim
    ? new Date(batasKirim).getTime() <= mundur.sekarang
    : false

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
      ) : lewatBatasMentah ? (
        <>
          <strong>Sudah lewat tenggat, tapi masih bisa dikirim.</strong> Kalau
          belum dikirim sampai {waktuWIB(tenggat)} — sekitar {formatSisa(sisaMs)}{' '}
          lagi — pesanan dibatalkan otomatis dan dananya dikembalikan.
        </>
      ) : mendesak ? (
        <>
          <strong>Kirim dalam {mundur.teks}.</strong> Batas {waktuWIB(tenggat)}.
          Lewat dari itu pesanan dibatalkan otomatis dan dananya dikembalikan
          ke pembeli.
        </>
      ) : (
        <>
          ⏳ Sisa waktu kirim <strong>{mundur.teks}</strong>
          <div style={{ color: '#5a7da0', marginTop: '2px' }}>
            Batas {waktuWIB(tenggat)}
          </div>
        </>
      )}
    </div>
  )
}
