// Kosakata peran, satu sumber untuk seluruh klien.
//
// Empat tingkat, dan batas wewenangnya BUKAN sekadar urutan menaik:
//
//   member          — pengguna biasa
//   admin_angkatan  — hanya memverifikasi alumni SEANGKATANNYA. Tidak punya
//                     kuasa atas produk, toko, maupun peran orang lain
//   admin_umum      — panel admin penuh
//   superadmin      — admin penuh + satu-satunya yang boleh mengangkat dan
//                     menurunkan admin umum. Perannya sendiri tidak bisa
//                     diubah dari aplikasi
//
// PENTING: `adminPenuh` adalah cerminan is_admin() di database, dan
// is_admin() TIDAK memuat admin_angkatan. Jangan "merapikan" dengan
// memasukkannya — fungsi itu dipakai di policy produk, toko, users, dan
// jaga_field_sensitif, jadi menambahkannya berarti memberi admin angkatan
// kuasa menghapus produk siapa pun dan mengubah toko orang.

export type Peran = 'member' | 'admin_angkatan' | 'admin_umum' | 'superadmin'

export const SEMUA_PERAN: Peran[] = ['member', 'admin_angkatan', 'admin_umum', 'superadmin']

/** Cerminan is_admin(): admin umum dan superadmin SAJA. */
export function adminPenuh(peran: string | null | undefined): boolean {
  return peran === 'admin_umum' || peran === 'superadmin'
}

export function isSuperadmin(peran: string | null | undefined): boolean {
  return peran === 'superadmin'
}

/** Boleh membuka panel verifikasi alumni. Admin angkatan ikut, tapi hanya
 *  untuk angkatannya sendiri — batas itu ditegakkan verifikasi_alumni. */
export function bolehVerifikasiAlumni(peran: string | null | undefined): boolean {
  return adminPenuh(peran) || peran === 'admin_angkatan'
}

export function labelPeran(peran: string | null | undefined, angkatan?: number | null): string {
  switch (peran) {
    case 'superadmin':     return 'Superadmin'
    case 'admin_umum':     return 'Admin Umum'
    // Angkatannya ikut disebut karena itulah batas kuasanya — "Admin
    // Angkatan" tanpa angka tidak memberi tahu apa pun
    case 'admin_angkatan': return angkatan ? `Admin Angkatan ${angkatan}` : 'Admin Angkatan'
    default:               return 'Member'
  }
}

type GayaPeran = { latar: string; teks: string; garis: string; ikon: string }

/** Superadmin sengaja paling menonjol — emas, warna identitas Superfive. */
export function gayaPeran(peran: string | null | undefined): GayaPeran {
  switch (peran) {
    case 'superadmin':
      return { latar: 'rgba(239,159,39,0.18)', teks: '#8a5a05', garis: '#EF9F27', ikon: '👑' }
    case 'admin_umum':
      return { latar: '#fff3e0', teks: '#e65100', garis: '#ffcc80', ikon: '⭐' }
    case 'admin_angkatan':
      return { latar: '#E6F1FB', teks: '#0C447C', garis: '#b3d1ee', ikon: '🎓' }
    default:
      return { latar: '#f0f5fb', teks: '#5a7da0', garis: '#c5d9ef', ikon: '' }
  }
}
