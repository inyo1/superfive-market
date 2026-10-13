// Jalankan: node --test lib/kontak.test.mjs
// Memakai node:test bawaan dan type stripping Node 24, jadi tanpa dependency.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalisasiUsernameIG, PESAN_IG_TIDAK_VALID, formatNomorWA, rapikanKota, rapikanKotaRingkas, rapikanKotaHP, normalisasiWAOpsional, pesanKabarPenjual } from './kontak.ts'

const ok = username => ({ ok: true, username })
const gagal = { ok: false, pesan: PESAN_IG_TIDAK_VALID }

test('membuang @ di depan', () => {
  assert.deepEqual(normalisasiUsernameIG('@inilima.shop'), ok('inilima.shop'))
})

test('mengambil username dari link profil lengkap', () => {
  assert.deepEqual(
    normalisasiUsernameIG('https://www.instagram.com/inilima.shop/?hl=id'),
    ok('inilima.shop'),
  )
  assert.deepEqual(normalisasiUsernameIG('instagram.com/inilima.shop'), ok('inilima.shop'))
  assert.deepEqual(normalisasiUsernameIG('http://instagr.am/inilima_shop/'), ok('inilima_shop'))
})

test('trim spasi di tepi', () => {
  assert.deepEqual(normalisasiUsernameIG('  inilima_shop '), ok('inilima_shop'))
})

test('kosong jadi null, bukan string kosong', () => {
  assert.deepEqual(normalisasiUsernameIG(''), ok(null))
  assert.deepEqual(normalisasiUsernameIG('   '), ok(null))
  assert.deepEqual(normalisasiUsernameIG('@'), ok(null))
  assert.deepEqual(normalisasiUsernameIG(null), ok(null))
})

test('spasi di tengah ditolak, tidak dihapus diam-diam', () => {
  assert.deepEqual(normalisasiUsernameIG('INILIMA SHOP'), gagal)
})

test('lebih dari 30 karakter ditolak', () => {
  assert.deepEqual(normalisasiUsernameIG('a'.repeat(30)), ok('a'.repeat(30)))
  assert.deepEqual(normalisasiUsernameIG('a'.repeat(31)), gagal)
})

test('formatNomorWA: bentuk tersimpan 62…', () => {
  assert.equal(formatNomorWA('6281322305799'), '+62 813-2230-5799')
  assert.equal(formatNomorWA('628123456789'), '+62 812-3456-789')
})

test('formatNomorWA: tidak pernah ada 0 setelah +62', () => {
  assert.equal(formatNomorWA('081322305799'), '+62 813-2230-5799')
  assert.equal(formatNomorWA('+62 813-2230-5799'), '+62 813-2230-5799')
  assert.equal(formatNomorWA('62081322305799'), '+62 813-2230-5799')
  assert.equal(formatNomorWA('81322305799'), '+62 813-2230-5799')
})

test('formatNomorWA: kosong dan yang tidak dikenali', () => {
  assert.equal(formatNomorWA(''), '')
  assert.equal(formatNomorWA(null), '')
  assert.equal(formatNomorWA('bukan nomor'), 'bukan nomor')
})

test('rapikanKota: kapitalisasi per kata', () => {
  assert.equal(rapikanKota('KOTA BANDUNG'), 'Kota Bandung')
  assert.equal(rapikanKota('  kab. bandung   barat '), 'Kab. Bandung Barat')
  assert.equal(rapikanKota('Kota Bandung'), 'Kota Bandung')
})

test('rapikanKota: kosong jadi null', () => {
  assert.equal(rapikanKota(''), null)
  assert.equal(rapikanKota('   '), null)
  assert.equal(rapikanKota(null), null)
})

test('normalisasiWAOpsional: kosong jadi null, isi dinormalkan ke 62', () => {
  assert.deepEqual(normalisasiWAOpsional(''), { ok: true, nomor: null })
  assert.deepEqual(normalisasiWAOpsional('  '), { ok: true, nomor: null })
  assert.deepEqual(normalisasiWAOpsional(null), { ok: true, nomor: null })
  assert.deepEqual(normalisasiWAOpsional('0813-2230-5799'), { ok: true, nomor: '6281322305799' })
  assert.deepEqual(normalisasiWAOpsional('+62 813 2230 5799'), { ok: true, nomor: '6281322305799' })
  assert.equal(normalisasiWAOpsional('12345').ok, false)
  assert.equal(normalisasiWAOpsional('08abc').ok, false)
})

test('pesanKabarPenjual: per status', () => {
  assert.match(pesanKabarPenjual('Inyo', 'aktif', null), /^Halo Inyo, pengajuanmu sebagai penjual .*DISETUJUI/)
  assert.equal(
    pesanKabarPenjual('Inyo', 'ditolak', 'nama rekening tidak cocok'),
    'Halo Inyo, terkait pengajuan penjualmu di Superfive Market: nama rekening tidak cocok. Kalau ada pertanyaan, balas pesan ini. — Admin Superfive Market',
  )
  assert.match(pesanKabarPenjual('Inyo', 'dibekukan', 'telat kirim'), /: telat kirim./)
  assert.equal(pesanKabarPenjual('Inyo', 'menunggu', null), null)
})

test('rapikanKotaRingkas: ringkas untuk kartu', () => {
  assert.equal(rapikanKotaRingkas('Kota Administrasi Jakarta Pusat'), 'Jakarta Pusat')
  assert.equal(rapikanKotaRingkas('KOTA ADMINISTRASI JAKARTA SELATAN'), 'Jakarta Selatan')
  assert.equal(rapikanKotaRingkas('Kabupaten Bandung'), 'Kab. Bandung')
  assert.equal(rapikanKotaRingkas('kabupaten bandung barat'), 'Kab. Bandung Barat')
  assert.equal(rapikanKotaRingkas('Kabupaten Administrasi Kepulauan Seribu'), 'Kab. Kepulauan Seribu')
  assert.equal(rapikanKotaRingkas('Kota Bandung'), 'Kota Bandung')
  assert.equal(rapikanKotaRingkas('KOTA BANDUNG'), 'Kota Bandung')
  assert.equal(rapikanKotaRingkas(''), null)
  assert.equal(rapikanKotaRingkas(null), null)
})

test('rapikanKotaHP: buang awalan Kota, Kab. tetap', () => {
  assert.equal(rapikanKotaHP('Kota Bandung'), 'Bandung')
  assert.equal(rapikanKotaHP('KOTA BANDUNG'), 'Bandung')
  assert.equal(rapikanKotaHP('Kota Administrasi Jakarta Pusat'), 'Jakarta Pusat')
  assert.equal(rapikanKotaHP('Kabupaten Bandung'), 'Kab. Bandung')
  assert.equal(rapikanKotaHP('Kabupaten Administrasi Kepulauan Seribu'), 'Kab. Kepulauan Seribu')
  assert.equal(rapikanKotaHP('Bandung'), 'Bandung')
  assert.equal(rapikanKotaHP(''), null)
  assert.equal(rapikanKotaHP(null), null)
})
