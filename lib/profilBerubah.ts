// Sinyal "status alumni milikku baru saja berubah" untuk halaman yang sedang
// terbuka. Dipancarkan AutoAlumni setelah ajukan_alumni() berhasil di latar,
// supaya lencana dan ajakan di /profil, /jual, dan /verifikasi langsung ikut
// berubah tanpa memuat ulang halaman.
//
// Tidak ada konteks pengguna global di project ini — tiap halaman membaca
// barisnya sendiri di useEffect — jadi yang dikirim cuma tanda, bukan datanya.
// Pendengarnya membaca ulang kolom yang ia butuhkan saja, bukan seluruh
// formulir, supaya isian yang sedang diketik tidak tertimpa.

const NAMA = 'superfive:profil-berubah'

export function umumkanProfilBerubah() {
  window.dispatchEvent(new Event(NAMA))
}

/** Kembalikan fungsi pelepas — pakai sebagai return useEffect. */
export function dengarProfilBerubah(fn: () => void) {
  window.addEventListener(NAMA, fn)
  return () => window.removeEventListener(NAMA, fn)
}
