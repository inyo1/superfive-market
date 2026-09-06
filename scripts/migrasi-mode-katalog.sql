-- =====================================================================
-- MODE KATALOG — migrasi untuk dijalankan Inyo di SQL editor
-- =====================================================================
--
-- Kode klien mode katalog SUDAH TERPASANG dan menganggap semua objek di
-- berkas ini ada. Sampai migrasi ini dijalankan:
--
--   * /produk, /toko/[id], /dashboard, /toko/saya GAGAL MEMUAT — query-nya
--     menyebut kolom `produk.is_tersedia` yang belum ada, dan Postgres
--     menolak seluruh SELECT-nya, bukan cuma kolomnya
--   * tombol "Hubungi Penjual" menampilkan toast error dari RPC yang belum ada
--   * tab Kontak dan Prospek di dashboard, serta kartu statistik di /admin,
--     melaporkan gagal memuat
--
-- Jadi ini bukan langkah opsional. Jalankan seluruh berkas dalam satu
-- transaksi, lalu jalankan blok VERIFIKASI di paling bawah.
--
-- Catatan: dibuat oleh sesi Claude yang DILARANG mengubah skema sendiri
-- (lihat "ATURAN: Perubahan Skema Database" di CLAUDE.md). Tolong dibaca
-- dulu sebelum dijalankan — terutama bagian REVOKE create_pesanan, karena
-- itu yang benar-benar menutup transaksi.

begin;

-- ---------------------------------------------------------------------
-- 1. produk.is_tersedia — pengganti stok untuk mode katalog
-- ---------------------------------------------------------------------
-- NOT NULL default true: produk yang sudah ada dianggap tersedia, karena
-- menyembunyikan barang yang sebenarnya ada lebih merugikan penjual
-- daripada sebaliknya. Kolom `stok` dan tabel `produk_varian` SENGAJA
-- dipertahankan utuh — mode transaksi bisa dinyalakan lagi lewat
-- MODE_TRANSAKSI di lib/config.ts, dan datanya masih dipakai di sana.

alter table public.produk
  add column if not exists is_tersedia boolean not null default true;

-- ---------------------------------------------------------------------
-- 2. toko_kontak — nomor WA penjual
-- ---------------------------------------------------------------------
-- toko_id jadi PRIMARY KEY: satu toko tepat satu baris kontak. Itu yang
-- membuat upsert(onConflict: 'toko_id') di FormKontakToko bekerja.

create table if not exists public.toko_kontak (
  toko_id     uuid primary key references public.toko(id) on delete cascade,
  no_wa       text,
  ig_username text,
  link_lain   text,
  pesan_awal  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Bentuk 62xxxxxxxxx dijaga di database juga, bukan cuma di klien.
  -- normalisasiWA() di lib/kontak.ts sudah merapikan 08… dan +62… lebih
  -- dulu; CHECK ini yang menangkap kalau ada jalur lain yang lupa.
  constraint chk_no_wa_bentuk
    check (no_wa is null or no_wa ~ '^628[0-9]{7,12}$')
);

alter table public.toko_kontak enable row level security;

-- Pemilik toko boleh baca-tulis barisnya sendiri; admin boleh semua.
-- PEMBELI TIDAK BOLEH MEMBACA TABEL INI SAMA SEKALI — itu justru inti
-- rancangannya. Satu-satunya jalan keluar nomor WA ke pembeli adalah RPC
-- buka_kontak_toko di bawah, yang sekalian mencatat prospeknya. Kalau
-- policy SELECT untuk publik ditambahkan di sini, pencatatan prospek bisa
-- dilewati begitu saja dan seluruh tab Prospek jadi bohong.
drop policy if exists kontak_kelola_pemilik on public.toko_kontak;
create policy kontak_kelola_pemilik on public.toko_kontak
  for all
  using (
    exists (select 1 from public.toko t
             where t.id = toko_kontak.toko_id and t.seller_id = auth.uid())
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.toko t
             where t.id = toko_kontak.toko_id and t.seller_id = auth.uid())
    or public.is_admin()
  );

-- ---------------------------------------------------------------------
-- 3. prospek — log klik "Hubungi Penjual"
-- ---------------------------------------------------------------------
-- produk_id ON DELETE SET NULL: produk boleh dihapus, riwayat minatnya
-- tidak ikut hilang. user_id juga SET NULL supaya hapus_user() tidak
-- terhalang jejak di sini — DaftarProspek menampilkannya "Akun Dihapus".

create table if not exists public.prospek (
  id         uuid primary key default gen_random_uuid(),
  toko_id    uuid not null references public.toko(id)   on delete cascade,
  produk_id  uuid          references public.produk(id) on delete set null,
  user_id    uuid          references public.users(id)  on delete set null,
  kanal      text not null,
  created_at timestamptz not null default now(),

  constraint chk_prospek_kanal check (kanal in ('wa', 'ig'))
);

create index if not exists idx_prospek_toko_waktu
  on public.prospek (toko_id, created_at desc);
create index if not exists idx_prospek_waktu
  on public.prospek (created_at desc);

alter table public.prospek enable row level security;

-- Baris HANYA ditulis oleh buka_kontak_toko (SECURITY DEFINER), tidak
-- pernah oleh klien — jadi sengaja tidak ada policy INSERT di sini.
drop policy if exists prospek_baca_pemilik on public.prospek;
create policy prospek_baca_pemilik on public.prospek
  for select
  using (
    exists (select 1 from public.toko t
             where t.id = prospek.toko_id and t.seller_id = auth.uid())
    or public.is_admin()
  );

-- ---------------------------------------------------------------------
-- 4. Cabut hak tulis bawaan Supabase pada dua tabel baru
-- ---------------------------------------------------------------------
-- Lihat "ATURAN: Hak Tulis VIEW dan TABEL Baru" di CLAUDE.md. Untuk tabel
-- RLS memang sudah menahan, tapi prospek tidak punya policy tulis sama
-- sekali — mencabut grant-nya membuat itu berlapis, bukan bersandar pada
-- ketiadaan policy saja.
revoke insert, update, delete, truncate on public.prospek from anon, authenticated;
revoke all on public.toko_kontak from anon;

-- ---------------------------------------------------------------------
-- 5. buka_kontak_toko — SATU-SATUNYA jalan pembeli mendapat nomor WA
-- ---------------------------------------------------------------------

create or replace function public.buka_kontak_toko(
  p_toko_id   uuid,
  p_produk_id uuid default null,
  p_kanal     text default 'wa'
)
returns table (
  nama_toko   text,
  no_wa       text,
  ig_username text,
  link_lain   text,
  pesan_awal  text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_nama   text;
  v_wa     text;
  v_ig     text;
  v_link   text;
  v_pesan  text;
  v_kanal  text;
  v_produk uuid;
begin
  if v_uid is null then
    raise exception 'Harus login untuk menghubungi penjual';
  end if;

  select t.nama_toko, k.no_wa, k.ig_username, k.link_lain, k.pesan_awal
    into v_nama, v_wa, v_ig, v_link, v_pesan
  from public.toko t
  left join public.toko_kontak k on k.toko_id = t.id
  where t.id = p_toko_id;

  if v_nama is null then
    raise exception 'Toko tidak ditemukan';
  end if;

  -- Kanal EFEKTIF, bukan yang diminta klien. Klien mengirim 'wa' sebagai
  -- preferensi karena ia belum tahu penjualnya mengisi apa; kalau ternyata
  -- cuma Instagram yang terisi, yang tercatat harus 'ig' — kalau tidak,
  -- tab Prospek melaporkan kanal yang tidak pernah dipakai siapa pun.
  v_kanal := case
    when coalesce(v_wa, '') <> '' then 'wa'
    when coalesce(v_ig, '') <> '' then 'ig'
    else null
  end;

  -- Produk yang sudah dihapus tidak boleh menggagalkan seluruh pemanggilan
  -- hanya karena foreign key-nya tidak cocok
  select p.id into v_produk from public.produk p where p.id = p_produk_id;

  -- Penjual yang belum mengisi kontak tidak menghasilkan prospek: tidak ada
  -- yang benar-benar dihubungi, jadi mencatatnya akan menggelembungkan
  -- angka di dashboard tanpa ada percakapan yang terjadi.
  if v_kanal is not null then
    insert into public.prospek (toko_id, produk_id, user_id, kanal)
    values (p_toko_id, v_produk, v_uid, v_kanal);
  end if;

  return query select v_nama, v_wa, v_ig, v_link, v_pesan;
end;
$$;

-- REVOKE dari PUBLIC dulu, baru GRANT — mencabut dari anon/authenticated
-- saja TIDAK CUKUP, karena Postgres memberi EXECUTE ke PUBLIC untuk setiap
-- fungsi baru dan anon mewarisinya. Lihat "REVOKE ... FROM anon,
-- authenticated TIDAK CUKUP" di CLAUDE.md.
revoke all on function public.buka_kontak_toko(uuid, uuid, text) from public;
grant execute on function public.buka_kontak_toko(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Tutup checkout — INI yang benar-benar membekukan transaksi
-- ---------------------------------------------------------------------
-- MODE_TRANSAKSI di lib/config.ts hanya menyembunyikan pintunya di UI, dan
-- siapa pun bisa mengubah konstanta klien lewat DevTools. Pagar yang
-- sesungguhnya ada di sini.
--
-- Fungsinya TIDAK di-DROP: mesin status pesanan, refund, dan tugas harian
-- masih dipakai untuk pesanan yang terlanjur masuk, dan menghapusnya berarti
-- menulis ulang semuanya kalau mode transaksi dinyalakan lagi.
revoke all on function public.create_pesanan(text, text, text, text, text, jsonb) from public;
revoke execute on function public.create_pesanan(text, text, text, text, text, jsonb) from authenticated;

commit;


-- =====================================================================
-- VERIFIKASI — jalankan setelah commit, jangan dilewati
-- =====================================================================

-- (a) Kolom, tabel, dan RPC-nya ada
select
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='produk' and column_name='is_tersedia') as ada_is_tersedia,
  (select count(*) from pg_tables where schemaname='public' and tablename='toko_kontak') as ada_toko_kontak,
  (select count(*) from pg_tables where schemaname='public' and tablename='prospek')     as ada_prospek,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='buka_kontak_toko')                          as ada_rpc;
-- Keempatnya harus 1.

-- (b) RLS menyala di dua tabel baru
select relname, relrowsecurity
from pg_class
where relname in ('toko_kontak','prospek');
-- relrowsecurity harus true untuk keduanya.

-- (c) Hak EXECUTE — yang paling gampang salah
select p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_bisa,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_bisa
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname in ('buka_kontak_toko','create_pesanan');
-- buka_kontak_toko : anon=false, auth=true
-- create_pesanan   : anon=false, auth=FALSE  ← ini yang membekukan checkout

-- (d) Hak tulis tabel baru untuk peran publik
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in ('toko_kontak','prospek')
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;
-- prospek: authenticated hanya SELECT. anon tidak muncul sama sekali.

-- (e) Penjaga RLS diuji sebagai pembeli sungguhan, BUKAN admin.
--     Akun admin melewati seluruh penjaga lewat is_admin(), jadi uji dengan
--     akun ber-role 'member' — lihat "ATURAN PENGUJIAN PENJAGA" di CLAUDE.md.
--     Ganti <uuid-member> dengan id akun member yang bukan pemilik toko.
--
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims to '{"sub":"<uuid-member>","role":"authenticated"}';
--   select count(*) as harus_nol from public.toko_kontak;   -- harus 0
--   select count(*) as harus_nol from public.prospek;       -- harus 0
-- rollback;
