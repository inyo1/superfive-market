/**
 * Impor data wilayah Indonesia ke tabel public.wilayah — SEKALI JALAN.
 *
 * Sumber: https://github.com/cahyadsn/wilayah (db/wilayah.sql),
 * mengikuti Kepmendagri No 300.2.2-2138 Tahun 2025.
 * Isinya 91.599 baris: 38 provinsi, 514 kota/kabupaten, 7.285 kecamatan,
 * 83.762 kelurahan/desa.
 *
 * Jalankan dari folder superfive-market:
 *   node scripts/impor-wilayah.mjs                    # unduh dari GitHub
 *   node scripts/impor-wilayah.mjs --file wilayah.sql # dari berkas lokal
 *
 * ⚠ JANGAN dipanggil dari aplikasi. Ini skrip sekali pakai.
 *
 * ⚠ BUTUH SERVICE ROLE KEY. Tabel `wilayah` bisa DIBACA siapa saja
 * (policy wilayah_baca_semua) tapi tidak ada hak tulis untuk `anon` maupun
 * `authenticated` — memang begitu maunya: isinya data referensi yang hanya
 * berubah kalau Kemendagri mengubahnya. Dengan anon key skrip ini akan
 * ditolak, dan yang terlihat bukan error izin yang jelas melainkan "0 baris
 * tersimpan" tanpa sebab.
 *
 * Kuncinya dibaca dari env (.env.local atau environment shell):
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * JANGAN menaruh kunci itu di NEXT_PUBLIC_*. Apa pun yang berawalan
 * NEXT_PUBLIC_ ditanam ke bundel yang dikirim ke peramban, dan service role
 * key melewati SELURUH RLS — bocor sekali berarti seluruh tabel `users`
 * terbuka untuk siapa pun yang membuka DevTools.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')

const SUMBER = 'https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql'
const UKURAN_BATCH = 1000

// Jumlah yang diharapkan, dari Kepmendagri No 300.2.2-2138 Tahun 2025.
// Dipakai sebagai pemeriksa di akhir — kalau datasetnya berubah, angkanya
// akan tidak cocok dan itu memang harus terlihat, bukan lewat diam-diam.
const HARAPAN = { 1: 38, 2: 514, 3: 7285, 4: 83762 }
const TOTAL_HARAPAN = 91599

const NAMA_TINGKAT = {
  1: 'provinsi',
  2: 'kota/kabupaten',
  3: 'kecamatan',
  4: 'kelurahan/desa',
}

function bacaEnv() {
  const dariBerkas = existsSync(envPath)
    ? Object.fromEntries(
        readFileSync(envPath, 'utf8')
          .split('\n')
          .filter(baris => baris.includes('=') && !baris.trimStart().startsWith('#'))
          .map(baris => {
            const i = baris.indexOf('=')
            return [baris.slice(0, i).trim(), baris.slice(i + 1).trim()]
          })
      )
    : {}
  // Environment shell menang atas .env.local, supaya kuncinya bisa diberikan
  // sekali jalan tanpa pernah tersimpan di berkas
  return { ...dariBerkas, ...process.env }
}

/** Peran yang tertulis di dalam JWT Supabase, tanpa memverifikasi tanda tangan.
 *  Dipakai hanya untuk menolak lebih awal kalau yang dipakai anon key. */
function peranKunci(kunci) {
  try {
    const isi = JSON.parse(Buffer.from(kunci.split('.')[1], 'base64').toString('utf8'))
    return isi.role ?? null
  } catch {
    return null
  }
}

/**
 * Ekstrak pasangan ('kode','nama') dari dump SQL-nya.
 *
 * Nama boleh mengandung tanda kutip yang di-escape dengan cara SQL, yaitu
 * digandakan: 'Pasi Kuala Ba''u'. Ada 437 nama seperti itu di dataset, jadi
 * regex yang berhenti di kutip pertama akan memotong namanya di tengah.
 */
function urai(teks) {
  const pola = /\('([0-9.]{2,13})','((?:[^']|'')*)'\)/g
  const baris = []
  const terlihat = new Set()
  let m

  while ((m = pola.exec(teks)) !== null) {
    const kode = m[1]
    if (terlihat.has(kode)) continue
    terlihat.add(kode)

    const titikTerakhir = kode.lastIndexOf('.')
    baris.push({
      kode,
      nama: m[2].replace(/''/g, "'"),
      tingkat: kode.split('.').length,
      // Provinsi tidak punya induk; sisanya kodenya dipotong satu segmen
      induk: titikTerakhir === -1 ? null : kode.slice(0, titikTerakhir),
    })
  }

  return baris
}

async function ambilSumber() {
  const iBerkas = process.argv.indexOf('--file')
  if (iBerkas !== -1) {
    const path = resolve(process.cwd(), process.argv[iBerkas + 1] ?? '')
    console.log('Membaca berkas lokal:', path)
    return readFileSync(path, 'utf8')
  }

  console.log('Mengunduh', SUMBER)
  const res = await fetch(SUMBER)
  if (!res.ok) throw new Error(`Gagal mengunduh sumber: HTTP ${res.status}`)
  const teks = await res.text()
  console.log(`Terunduh ${(teks.length / 1048576).toFixed(1)} MB`)
  return teks
}

async function main() {
  const env = bacaEnv()
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const kunci = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL belum ada di env')
  if (!kunci) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY belum ada di env.\n' +
      'Ambil dari Supabase Dashboard → Project Settings → API → service_role,\n' +
      'lalu jalankan: SUPABASE_SERVICE_ROLE_KEY=... node scripts/impor-wilayah.mjs'
    )
  }

  const peran = peranKunci(kunci)
  if (peran && peran !== 'service_role') {
    throw new Error(
      `Kunci yang dipakai berperan '${peran}', bukan 'service_role'. ` +
      'Tabel wilayah tidak bisa ditulis dengan kunci itu.'
    )
  }

  const supabase = createClient(url, kunci, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const semua = urai(await ambilSumber())
  if (semua.length === 0) throw new Error('Tidak ada pasangan kode/nama yang terbaca dari sumber')

  console.log(`Terbaca ${semua.length.toLocaleString('id-ID')} baris:`)
  for (const t of [1, 2, 3, 4]) {
    const n = semua.filter(b => b.tingkat === t).length
    console.log(`  tingkat ${t} (${NAMA_TINGKAT[t]}): ${n.toLocaleString('id-ID')}`)
  }

  // BERURUTAN PER TINGKAT, dan ini wajib: `induk` FK ke `wilayah.kode` sendiri,
  // jadi kecamatan tidak bisa masuk sebelum kota/kabupatennya ada. Kalau
  // urutannya diacak, yang muncul error FK di tengah jalan dengan tabel
  // setengah terisi.
  for (const tingkat of [1, 2, 3, 4]) {
    const baris = semua.filter(b => b.tingkat === tingkat)
    let tersimpan = 0

    for (let i = 0; i < baris.length; i += UKURAN_BATCH) {
      const batch = baris.slice(i, i + UKURAN_BATCH)
      // ignoreDuplicates: ON CONFLICT (kode) DO NOTHING — skripnya aman
      // dijalankan ulang, dan nama yang sudah ada tidak ditimpa
      const { error } = await supabase
        .from('wilayah')
        .upsert(batch, { onConflict: 'kode', ignoreDuplicates: true })

      if (error) {
        throw new Error(
          `Gagal menyimpan tingkat ${tingkat} batch ${i / UKURAN_BATCH + 1}: ${error.message}`
        )
      }

      tersimpan += batch.length
      process.stdout.write(
        `\r  tingkat ${tingkat} (${NAMA_TINGKAT[tingkat]}): ` +
        `${tersimpan.toLocaleString('id-ID')} / ${baris.length.toLocaleString('id-ID')}`
      )
    }
    process.stdout.write('\n')
  }

  // Hitungan akhir dibaca ULANG dari database, bukan dari angka yang barusan
  // dikirim — yang perlu dipastikan adalah apa yang benar-benar tersimpan
  console.log('\nHasil di database:')
  let total = 0
  let cocok = true

  for (const tingkat of [1, 2, 3, 4]) {
    const { count, error } = await supabase
      .from('wilayah')
      .select('kode', { count: 'exact', head: true })
      .eq('tingkat', tingkat)
    if (error) throw new Error('Gagal menghitung: ' + error.message)

    total += count ?? 0
    const sesuai = count === HARAPAN[tingkat]
    if (!sesuai) cocok = false
    console.log(
      `  tingkat ${tingkat} (${NAMA_TINGKAT[tingkat]}): ` +
      `${(count ?? 0).toLocaleString('id-ID')} ` +
      `${sesuai ? '✓' : `✗ (diharapkan ${HARAPAN[tingkat].toLocaleString('id-ID')})`}`
    )
  }

  console.log(`  TOTAL: ${total.toLocaleString('id-ID')} ${total === TOTAL_HARAPAN ? '✓' : `✗ (diharapkan ${TOTAL_HARAPAN.toLocaleString('id-ID')})`}`)

  // Uji petik satu kelurahan yang namanya khas, supaya yang diperiksa bukan
  // cuma jumlah baris tapi juga isinya
  const { data: uji } = await supabase
    .from('wilayah').select('nama').eq('kode', '32.73.06.1001').maybeSingle()
  const namaUji = uji?.nama ?? null
  const ujiCocok = namaUji === 'Husein Sastranegara'
  console.log(`  uji 32.73.06.1001: ${namaUji ?? '(tidak ada)'} ${ujiCocok ? '✓' : '✗'}`)

  if (!cocok || total !== TOTAL_HARAPAN || !ujiCocok) {
    throw new Error('Verifikasi TIDAK lolos — periksa keluaran di atas.')
  }
  console.log('\nSelesai. Semua verifikasi lolos.')
}

main().catch(e => {
  console.error('\n' + e.message)
  process.exit(1)
})
