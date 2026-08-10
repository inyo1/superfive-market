// Format angka untuk input harga. Yang tampil ke pengguna pakai pemisah
// ribuan, yang dikirim ke database tetap angka murni.

/** 3500000 -> "3.500.000" */
export function formatRibuan(nilai: string | number | null | undefined): string {
  const angka = angkaMurni(nilai)
  if (angka === '') return ''
  return Number(angka).toLocaleString('id-ID')
}

/** "3.500.000" atau "Rp 3.500.000" -> "3500000" */
export function angkaMurni(nilai: string | number | null | undefined): string {
  if (nilai === null || nilai === undefined) return ''
  return String(nilai).replace(/\D/g, '')
}

/** Nilai numerik siap kirim ke database, 0 kalau kosong */
export function keAngka(nilai: string | number | null | undefined): number {
  const bersih = angkaMurni(nilai)
  return bersih === '' ? 0 : Number(bersih)
}
