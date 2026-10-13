// Salin teks ke clipboard, dengan dua jaring pengaman. Dipakai tombol Salin
// nomor WA (InfoToko) dan Bagikan Link Toko (/toko/[id]).

/** Batas tunggu navigator.clipboard sebelum beralih ke cara lama. */
const BATAS_MS = 1500

/**
 * Mengembalikan true kalau teksnya benar-benar tersalin.
 *
 * Dua hal yang dijaga, keduanya terlihat saat QA di panel pratinjau:
 *  - writeText bisa MENGGANTUNG (menunggu izin yang promptnya tidak pernah
 *    tampil), dan tombolnya diam tanpa feedback apa pun. Karena itu dibatasi
 *    BATAS_MS.
 *  - navigator.clipboard tidak ada di konteks tidak aman (http) dan bisa
 *    ditolak izin. Cadangannya execCommand('copy') lewat textarea.
 */
export async function salinTeks(teks: string): Promise<boolean> {
  try {
    await Promise.race([
      navigator.clipboard.writeText(teks),
      new Promise((_, tolak) => setTimeout(() => tolak(new Error('lewat waktu')), BATAS_MS)),
    ])
    return true
  } catch {
    return salinCaraLama(teks)
  }
}

/** execCommand('copy') lewat textarea tersembunyi. Usang, tapi masih jalan di
 *  tempat navigator.clipboard tidak ada atau menggantung. */
function salinCaraLama(teks: string): boolean {
  const ta = document.createElement('textarea')
  ta.value = teks
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    ta.remove()
  }
}
