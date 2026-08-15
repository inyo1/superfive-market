import Image from 'next/image'

// Logo IniLima — lencana bundar putih bercincin abu, 512×512 RGBA.
//
// MEWAKILI KOMUNITAS, BUKAN PLATFORM. Logo Superfive Market (/LOGO-512.png)
// mewakili platformnya — navbar, hero, favicon. Logo ini mewakili komunitas
// alumni IniLima dan toko resminya. Keduanya tidak saling menggantikan; kalau
// ragu, tanyakan "yang sedang diwakili ini lapaknya atau yang punya lapak?".
//
// Yang transparan hanya putih di LUAR lingkaran; putih di dalam lencana
// sengaja dipertahankan karena itu bagian desainnya. Jadi yang tayang adalah
// cakram putih di atas latar biru tua, terbaca seperti stempel resmi — itu
// memang yang dimaksud.
//
// JANGAN menambahkan bingkai, lingkaran, atau bayangan di sekitarnya: logonya
// sudah punya cincinnya sendiri, dan tambahan apa pun jadi cincin kedua.

type Props = {
  /** Angka jadi piksel; string dipakai apa adanya, mis. "100%" */
  lebar: number | string
  prioritas?: boolean
}

export default function LogoInilima({ lebar, prioritas = false }: Props) {
  return (
    <Image
      src="/logo-inilima.png"
      alt="Logo IniLima — Alumni SMPN 5 Bandung"
      width={200}
      height={200}
      unoptimized
      priority={prioritas}
      style={{
        width: typeof lebar === 'number' ? `${lebar}px` : lebar,
        height: 'auto', maxWidth: '100%',
        objectFit: 'contain', flexShrink: 0,
      }}
    />
  )
}
