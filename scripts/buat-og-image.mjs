// Membuat public/og-image.jpg — gambar pratinjau tautan 1200x630.
//
// Dijalankan manual, bukan saat build:  node scripts/buat-og-image.mjs
//
// Kenapa JPG dan bukan PNG: WhatsApp menolak memuat gambar besar dan diam-diam
// jatuh ke pratinjau kotak kecil. Target di bawah 300KB.
//
// Kenapa 60px tepinya dikosongkan: WhatsApp, Facebook, dan Telegram memotong
// dengan rasio berbeda-beda. Apa pun yang penting harus di dalam batas itu.

import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const L = 1200
const T = 630
const AMAN = 60          // tepi yang tidak boleh diisi apa pun yang penting

// Gradien navy yang sama dengan hero beranda
const NAVY_1 = '#0d4f91'
const NAVY_2 = '#0C447C'
const NAVY_3 = '#082e57'
const EMAS = '#EF9F27'

// Ukuran & posisi logo Superfive di kiri
const LOGO_W = 250
const LOGO_X = AMAN + 30
const LOGO_Y = Math.round((T - LOGO_W) / 2)

// Logo IniLima kecil di pojok kanan bawah, tetap di dalam batas aman
const INILIMA_W = 104
const INILIMA_X = L - AMAN - INILIMA_W
const INILIMA_Y = T - AMAN - INILIMA_W

// Blok teks mulai setelah logo kiri
const TEKS_X = LOGO_X + LOGO_W + 56

const latar = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${T}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${NAVY_1}"/>
      <stop offset="45%"  stop-color="${NAVY_2}"/>
      <stop offset="100%" stop-color="${NAVY_3}"/>
    </linearGradient>
  </defs>

  <rect width="${L}" height="${T}" fill="url(#bg)"/>

  <!-- Watermark angka 5, sama seperti hero. Sangat samar, dan sengaja
       menabrak tepi karena memang bukan sesuatu yang penting terbaca. -->
  <text x="${L - 40}" y="${T + 120}" text-anchor="end"
        font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="560" font-weight="700" fill="#ffffff" opacity="0.05">5</text>

  <!-- Judul + subjudul -->
  <text x="${TEKS_X}" y="300"
        font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="74" font-weight="700" fill="#ffffff"
        letter-spacing="-1">Superfive Market</text>

  <text x="${TEKS_X}" y="360"
        font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="31" font-weight="400" fill="#B5D4F4">Ekosistem Bisnis Alumni SMPN 5 Bandung</text>

  <!-- Garis aksen emas, penanda identitas yang sama dengan section resmi -->
  <rect x="${TEKS_X}" y="392" width="96" height="6" rx="3" fill="${EMAS}"/>
</svg>
`)

const logoSuperfive = await sharp(readFileSync('public/LOGO-512.png'))
  .resize(LOGO_W, LOGO_W, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer()

const logoInilima = await sharp(readFileSync('public/logo-inilima.png'))
  .resize(INILIMA_W, INILIMA_W, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer()

await sharp(latar)
  .composite([
    { input: logoSuperfive, left: LOGO_X, top: LOGO_Y },
    { input: logoInilima, left: INILIMA_X, top: INILIMA_Y },
  ])
  .jpeg({ quality: 88, progressive: true, mozjpeg: true })
  .toFile('public/og-image.jpg')

const { size } = await sharp('public/og-image.jpg').metadata()
console.log('public/og-image.jpg dibuat —', Math.round(size / 1024) + 'KB')
