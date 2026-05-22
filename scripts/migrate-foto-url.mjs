/**
 * Migrasi foto_url: bersihkan nilai array menjadi plain text URL
 * Jalankan dari folder superfive-market:
 *   node scripts/migrate-foto-url.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')

// Baca .env.local
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/**
 * Ekstrak URL dari semua format yang mungkin tersimpan di DB:
 *   - plain string  : "https://..."          → "https://..."
 *   - JSON array    : ["https://..."]         → "https://..."
 *   - PG array text : {https://...}           → "https://..."
 *   - PG quoted     : {"https://..."}         → "https://..."
 */
function extractUrl(raw) {
  if (!raw) return null

  // Sudah array JS (kolom text[] yang difetch)
  if (Array.isArray(raw)) return raw[0] ?? null

  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()

  // JSON array string: ["https://..."]
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed) && parsed[0]) return String(parsed[0])
    } catch {}
  }

  // PostgreSQL array literal: {url} atau {"url"}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(1, -1).trim()
    // Hapus kutip jika ada: "url" → url
    const unquoted = inner.replace(/^"(.*)"$/, '$1')
    return unquoted || null
  }

  // Sudah plain URL
  return trimmed
}

function isSudahBersih(raw) {
  const url = extractUrl(raw)
  const asString = Array.isArray(raw) ? JSON.stringify(raw) : String(raw ?? '')
  // Bersih jika sama persis dengan hasil ekstrak
  return url === raw
}

async function migrate() {
  console.log('=== Migrasi foto_url ===\n')
  console.log('Supabase URL:', env.NEXT_PUBLIC_SUPABASE_URL)

  // Ambil semua produk yang punya foto_url
  const { data, error } = await supabase
    .from('produk')
    .select('id, nama, foto_url')
    .not('foto_url', 'is', null)

  if (error) {
    console.error('❌ Gagal fetch data:', error.message)
    process.exit(1)
  }

  console.log(`Ditemukan ${data.length} produk dengan foto_url\n`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const row of data) {
    const cleanUrl = extractUrl(row.foto_url)
    const rawDisplay = JSON.stringify(row.foto_url)

    if (isSudahBersih(row.foto_url)) {
      console.log(`⏭  SKIP  [${row.id.slice(0, 8)}] ${row.nama} — sudah plain text`)
      skipped++
      continue
    }

    if (!cleanUrl) {
      console.log(`⚠️  NULL  [${row.id.slice(0, 8)}] ${row.nama} — tidak ada URL valid, set null`)
      await supabase.from('produk').update({ foto_url: null }).eq('id', row.id)
      updated++
      continue
    }

    const { error: updateErr } = await supabase
      .from('produk')
      .update({ foto_url: cleanUrl })
      .eq('id', row.id)

    if (updateErr) {
      console.error(`❌ GAGAL [${row.id.slice(0, 8)}] ${row.nama}: ${updateErr.message}`)
      failed++
    } else {
      console.log(`✅ UPDATE [${row.id.slice(0, 8)}] ${row.nama}`)
      console.log(`   Sebelum: ${rawDisplay}`)
      console.log(`   Sesudah: "${cleanUrl}"`)
      updated++
    }
  }

  console.log('\n=== Hasil ===')
  console.log(`✅ Diupdate : ${updated}`)
  console.log(`⏭  Diskip  : ${skipped}`)
  console.log(`❌ Gagal    : ${failed}`)

  if (failed > 0) {
    console.log('\n⚠️  Ada yang gagal. Kemungkinan tipe kolom foto_url adalah text[].')
    console.log('Jalankan SQL ini di Supabase SQL Editor:')
    console.log('\n  ALTER TABLE produk ALTER COLUMN foto_url TYPE text USING foto_url[1];\n')
    console.log('Lalu jalankan script ini lagi.')
  } else {
    console.log('\n🎉 Migrasi selesai! Semua foto_url sekarang plain text URL.')
  }
}

migrate().catch(console.error)
