/**
 * Test upload foto langsung ke Supabase Storage + insert produk
 * Jalankan: node scripts/test-upload.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envRaw = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// PNG 1x1 pixel merah (file minimal valid)
const PNG_1PX = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
  '2e00000000c4944415478016360f8cfc00000000200016712a5e0000000049454e44ae426082',
  'hex'
)

async function run() {
  console.log('\n=== TEST UPLOAD FOTO PRODUK ===\n')
  console.log('Supabase URL:', env.NEXT_PUBLIC_SUPABASE_URL)

  // ── STEP 1: Cek bucket produk-foto ──
  console.log('\n[1] Cek bucket produk-foto...')
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets()
  if (bucketErr) {
    console.error('❌ Gagal list buckets:', bucketErr.message)
  } else {
    const bucket = buckets.find(b => b.name === 'produk-foto')
    if (bucket) {
      console.log(`✅ Bucket ditemukan: produk-foto (public: ${bucket.public})`)
    } else {
      console.log('❌ Bucket "produk-foto" TIDAK DITEMUKAN')
      console.log('   Bucket yang ada:', buckets.map(b => b.name).join(', ') || '(kosong)')
    }
  }

  // ── STEP 2: Upload file ke storage ──
  const testPath = `test-${Date.now()}.png`
  console.log(`\n[2] Upload file test ke storage: ${testPath}`)

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('produk-foto')
    .upload(testPath, PNG_1PX, { contentType: 'image/png', upsert: true })

  console.log('   Upload result:', JSON.stringify({ data: uploadData, error: uploadErr?.message ?? null }, null, 2))

  if (uploadErr) {
    console.error('❌ Upload gagal:', uploadErr.message)
    console.log('\n   Kemungkinan penyebab:')
    console.log('   - Bucket belum dibuat')
    console.log('   - Policy storage belum diset')
    console.log('   - Perlu login dulu (anonymous key tidak punya izin upload)')
    return
  }

  // ── STEP 3: Ambil public URL ──
  console.log('\n[3] Ambil public URL...')
  const { data: urlData } = supabase.storage.from('produk-foto').getPublicUrl(testPath)
  const publicUrl = urlData.publicUrl
  console.log('   Public URL:', publicUrl)

  // ── STEP 4: Verifikasi URL bisa diakses ──
  console.log('\n[4] Verifikasi URL bisa diakses...')
  try {
    const res = await fetch(publicUrl, { method: 'HEAD' })
    console.log(`   HTTP Status: ${res.status} ${res.statusText}`)
    if (res.ok) console.log('✅ URL dapat diakses publik')
    else console.log('❌ URL tidak dapat diakses (bucket mungkin private)')
  } catch (e) {
    console.log('❌ Fetch error:', e.message)
  }

  // ── STEP 5: Cek kolom foto_url di tabel produk ──
  console.log('\n[5] Cek struktur kolom foto_url di tabel produk...')
  const { data: sampleRow, error: selectErr } = await supabase
    .from('produk')
    .select('id, foto_url')
    .limit(1)
    .maybeSingle()

  if (selectErr) {
    console.error('❌ Gagal select produk:', selectErr.message)
  } else {
    console.log('   Sample row:', JSON.stringify(sampleRow))
    if (sampleRow) {
      const val = sampleRow.foto_url
      console.log(`   Tipe foto_url dari JS: ${typeof val} | Array: ${Array.isArray(val)}`)
      console.log(`   Nilai: ${JSON.stringify(val)}`)
    }
  }

  // ── STEP 6: Insert produk test dengan foto_url ──
  console.log('\n[6] Test insert produk dengan foto_url sebagai plain string...')
  const { data: insertData, error: insertErr } = await supabase
    .from('produk')
    .insert({
      toko_id: null,
      nama: '[TEST] Produk Debug',
      harga: 0,
      deskripsi: 'Ini produk test, hapus setelah debug',
      kategori: 'UMKM',
      stok: 0,
      foto_url: publicUrl,
    })
    .select('id, foto_url')

  console.log('   Insert result:', JSON.stringify({ data: insertData, error: insertErr?.message ?? null }, null, 2))

  if (insertErr) {
    console.error('\n❌ Insert GAGAL:', insertErr.message)
    console.log('   Code:', insertErr.code)
    console.log('   Hint:', insertErr.hint)
    console.log('   Details:', insertErr.details)

    if (insertErr.message.includes('array')) {
      console.log('\n   → Kolom foto_url masih bertipe text[]')
      console.log('   → Jalankan SQL ini di Supabase SQL Editor:')
      console.log('   ALTER TABLE produk ALTER COLUMN foto_url TYPE text USING foto_url[1];')
    }
    if (insertErr.message.includes('null') || insertErr.message.includes('toko_id')) {
      console.log('\n   → Gagal karena toko_id null (expected untuk test ini)')
    }
  } else {
    const inserted = insertData?.[0]
    console.log('\n✅ Insert BERHASIL')
    console.log('   foto_url tersimpan sebagai:', JSON.stringify(inserted?.foto_url))
    console.log('   Tipe di JS:', typeof inserted?.foto_url, '| Array:', Array.isArray(inserted?.foto_url))

    // Cleanup - hapus row test
    if (inserted?.id) {
      await supabase.from('produk').delete().eq('id', inserted.id)
      console.log('   (Row test sudah dihapus)')
    }
  }

  // ── STEP 7: Hapus file test dari storage ──
  await supabase.storage.from('produk-foto').remove([testPath])
  console.log('\n[7] File test dihapus dari storage')

  console.log('\n=== SELESAI ===\n')
}

run().catch(console.error)
