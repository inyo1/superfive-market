-- =====================================================================
-- MAINTENANCE 1 — Storage bucket produk-foto: hak berbasis pemilik
-- CATATAN MIGRASI YANG SUDAH DITERAPKAN (10 Okt 2026, 06:27 WIB)
-- =====================================================================
--
-- Berkas ini catatan, bukan perintah yang menunggu dijalankan. Menjalankannya
-- ulang akan gagal (policy lama sudah tidak ada) — disengaja.
--
-- Temuan: keempat policy lama, templat dashboard "Give users authenticated
-- access to folder 1d2ofj8_0..3", hanya memeriksa bucket_id dan
-- auth.role() = 'authenticated'. Siapa pun yang login — pembeli biasa
-- sekalipun — bisa menimpa dan menghapus foto produk siapa pun (termasuk
-- merchandise INILIMA), mendaftar seluruh isi bucket, dan mengunggah apa saja.
--
-- Rancangan: berkas di bucket ini datar (tanpa folder uid), jadi kepemilikan
-- memakai storage.objects.owner_id — diisi server Storage dari JWT, tidak bisa
-- dipalsukan (schema storage tidak dibuka PostgREST: PGRST106; tidak ada
-- fungsi public yang menulis storage.objects). Tidak ada perubahan kode:
-- aplikasi hanya mengunggah dengan upsert:false dan memakai URL publik.
--
-- Diterapkan dalam satu blok DO dengan penjaga baseline di depan dan enam
-- pemeriksaan pasca-DDL di belakang (gagal = seluruhnya batal). DDL-nya:
begin;
drop policy "Give users authenticated access to folder 1d2ofj8_0" on storage.objects;  -- SELECT lama
drop policy "Give users authenticated access to folder 1d2ofj8_1" on storage.objects;  -- INSERT lama
drop policy "Give users authenticated access to folder 1d2ofj8_2" on storage.objects;  -- UPDATE lama
drop policy "Give users authenticated access to folder 1d2ofj8_3" on storage.objects;  -- DELETE lama

create policy "produk_foto_insert_penjual" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'produk-foto'
              and (public.penjual_aktif((select auth.uid())) or public.is_admin()));
create policy "produk_foto_select_pemilik" on storage.objects
  for select to authenticated
  using (bucket_id = 'produk-foto'
         and (owner_id = (select auth.uid())::text or public.is_admin()));
create policy "produk_foto_delete_pemilik" on storage.objects
  for delete to authenticated
  using (bucket_id = 'produk-foto'
         and (owner_id = (select auth.uid())::text or public.is_admin()));
-- Sengaja TANPA policy UPDATE: tidak ada siapa pun, termasuk admin, yang
-- bisa menimpa foto. Kode memang tidak pernah menimpa (upsert:false).
commit;

-- ── Bukti ─────────────────────────────────────────────────────────────
-- Dry-run (dibatalkan), SQL: anon lihat 0 / unggah ditolak; member bukan
-- penjual lihat 0 / unggah ditolak / timpa foto INILIMA 0 baris; INILIMA
-- (penjual aktif) lihat hanya miliknya / unggah lolos / timpa 0 baris;
-- penjual dibekukan unggah ditolak; admin lihat semua / unggah lolos.
--
-- Storage API sesudah terap, berkas sementara uji-pf-*.png:
--   anon     list → []; unggah → 403 RLS; 5 URL publik INILIMA → 200
--   admin    unggah → 200; timpa x-upsert:true → 403; timpa PUT → 403;
--            list 14 → hapus 200 → 13; tidak ada berkas uji tersisa
--   penjual aktif & member bukan penjual lewat API: BELUM diuji (tidak ada
--   sesi) — terbukti di tingkat SQL saja
-- 13 berkas asli identik sebelum dan sesudah; policy bucket lain, policy di
-- luar storage, dan ACL schema public tidak berubah.

-- ── Pemulihan (perbaiki maju — pembatasan kepemilikan TETAP berlaku) ──
-- JANGAN mengembalikan keempat policy lama, dan JANGAN membuka INSERT ke
-- semua yang login. Kalau penjual aktif gagal mengunggah:
--   1. select public.penjual_aktif('<uid>');  -- false → urusan status penjual
--   2. periksa ketiga policy produk_foto_% di pg_policies
--   3. bila (1) true dan tetap ditolak, perluas INSERT SEMPIT ke pemilik toko:
--        ... or exists (select 1 from public.toko t where t.seller_id = (select auth.uid()))

-- ── Belum diterapkan, keputusan terpisah ──────────────────────────────
-- Batas bucket (10 MB, JPG/PNG/WebP):
--   update storage.buckets set file_size_limit = 10485760,
--     allowed_mime_types = array['image/jpeg','image/png','image/webp']
--   where id = 'produk-foto';
-- Pembersihan 8 berkas yatim (penghapusan data, lewat Storage API sebagai admin).
