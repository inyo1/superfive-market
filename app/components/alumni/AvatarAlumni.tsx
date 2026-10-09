import Image from 'next/image'
import { HOST_FOTO } from '../KartuPasar'

// Avatar alumni untuk direktori dan profil. Foto hanya dirender lewat
// next/image kalau host-nya Supabase Storage (satu-satunya host yang
// terdaftar di next.config); selain itu jatuh ke inisial.
export default function AvatarAlumni({ nama, foto, ukuran }: {
  nama: string | null
  foto: string | null
  ukuran: number
}) {
  const inisial = (nama ?? '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <span className="a-avatar" style={{ width: ukuran, height: ukuran, fontSize: Math.round(ukuran * 0.36) }} aria-hidden>
      {foto && foto.startsWith(HOST_FOTO)
        ? <Image src={foto} alt="" width={ukuran} height={ukuran} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : inisial}
    </span>
  )
}
