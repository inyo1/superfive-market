// Jalankan: node --test lib/kontak.test.mjs
// Memakai node:test bawaan dan type stripping Node 24, jadi tanpa dependency.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalisasiUsernameIG, PESAN_IG_TIDAK_VALID } from './kontak.ts'

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
