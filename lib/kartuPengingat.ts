// Kartu Pengingat Akun — PNG kecil yang bisa disimpan pendaftar baru.
//
// ATURAN KEAMANAN, jangan dilonggarkan:
// - Fungsi di sini HANYA menerima email. Tidak ada parameter kata sandi, jadi
//   tidak ada pemanggil yang bisa (sengaja atau tidak) memasukkannya ke gambar.
// - Gambarnya dibuat sepenuhnya di peramban (canvas). Tidak ada yang dikirim
//   ke server mana pun, tidak ada yang disimpan di localStorage/sessionStorage.
// - Kata sandi disimpan pengguna lewat pengelola kata sandi bawaan peramban
//   atau HP-nya, bukan lewat fitur buatan Superfive.

const SITUS = 'www.superfivemarket.com'
const W = 1080
const H = 680
const NAVY = '#062F59'
const BIRU = '#07589F'
const EMAS = '#FFB71B'

function muatGambar(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)   // tanpa logo pun kartunya tetap berguna
    img.src = src
  })
}

/** Perkecil huruf sampai teksnya muat di lebar yang tersedia */
function pasFont(ctx: CanvasRenderingContext2D, teks: string, tebal: string, besar: number, maks: number) {
  let ukuran = besar
  do {
    ctx.font = `${tebal} ${ukuran}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
    if (ctx.measureText(teks).width <= maks) break
    ukuran -= 2
  } while (ukuran > 18)
}

export async function buatKartuPengingat(email: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Peramban tidak mendukung pembuatan gambar')

  // Latar navy + kartu putih
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.roundRect(40, 40, W - 80, H - 80, 28)
  ctx.fill()
  ctx.fillStyle = EMAS
  ctx.fillRect(40, 40 + 28, 10, H - 80 - 56)

  const kiri = 96
  const logo = await muatGambar('/LOGO-512.png')
  if (logo) ctx.drawImage(logo, kiri, 78, 96, 96)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = NAVY
  ctx.font = '700 40px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillText('Superfive Market', kiri + 116, 124)
  ctx.fillStyle = BIRU
  ctx.font = '600 22px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillText('KARTU PENGINGAT AKUN', kiri + 116, 160)

  const label = (teks: string, y: number) => {
    ctx.fillStyle = '#617B95'
    ctx.font = '600 22px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(teks, kiri, y)
  }
  const isi = (teks: string, y: number, besar = 34) => {
    ctx.fillStyle = NAVY
    pasFont(ctx, teks, '700', besar, W - kiri - 96)
    ctx.fillText(teks, kiri, y)
  }

  label('Alamat website', 240)
  isi(SITUS, 282)
  label('Email untuk masuk', 344)
  isi(email.trim(), 386)

  // Garis pemisah + petunjuk
  ctx.fillStyle = '#DCE8F4'
  ctx.fillRect(kiri, 424, W - kiri - 96, 2)

  ctx.fillStyle = NAVY
  ctx.font = '700 24px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillText('Lupa kata sandi?', kiri, 472)
  ctx.fillStyle = '#334e68'
  ctx.font = '400 22px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(`Buka ${SITUS}, tekan Masuk, lalu pilih "Lupa kata sandi?".`, kiri, 508)
  ctx.fillText('Tautan untuk membuat kata sandi baru dikirim ke email di atas.', kiri, 540)

  ctx.fillStyle = '#617B95'
  ctx.font = 'italic 400 19px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillText('Kata sandi sengaja tidak dicantumkan. Simpan di pengelola kata sandi peramban/HP-mu.', kiri, 596)

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Gagal membuat gambar'))), 'image/png')
  })
}

export async function unduhKartuPengingat(email: string): Promise<void> {
  const blob = await buatKartuPengingat(email)
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = 'kartu-akun-superfive.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    // beri waktu peramban memulai unduhan sebelum URL-nya dicabut
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }
}
