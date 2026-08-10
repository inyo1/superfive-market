import { createClient } from '@supabase/supabase-js'

// Client khusus server, dipakai generateMetadata. Sengaja terpisah dari
// lib/supabase.js karena di server tidak ada sesi yang perlu disimpan atau
// di-refresh — semua bacaannya anonim dan dibatasi RLS.
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
