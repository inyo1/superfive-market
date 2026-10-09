-- =====================================================================
-- WAVE 2 ALUMNI PUBLIK — CATATAN MIGRASI YANG SUDAH DITERAPKAN
-- =====================================================================
--
-- Berkas ini CATATAN, bukan perintah yang menunggu dijalankan. Ketiga
-- bagian di bawah SUDAH diterapkan ke production (project
-- cbepplpvlizwyaalndas) pada 10 Oktober 2026 WIB, masing-masing setelah
-- dry-run dalam transaksi yang di-rollback dan persetujuan Inyo.
-- Menjalankannya ulang akan GAGAL (kolom dan view sudah ada) — itu
-- disengaja, bukan bug.
--
-- Urutannya mengikuti urutan eksekusi, bukan nomor bagian:
--   Bagian 2  policy Storage bucket `avatar`       — diterapkan lebih dulu
--   Bagian 1  users.tampil_publik + alumni_direktori + trigger daftar
--   Bagian 3  cabut SELECT anon dari pengguna_publik — diterapkan terakhir
--
-- Kode klien yang memakainya: /alumni, /alumni/[id], /profil, /auth.
-- Rinciannya di CLAUDE.md, bagian `alumni_direktori` dan `users`.


-- ---------------------------------------------------------------------
-- BAGIAN 2 — Storage `avatar`: hanya pemilik folder yang boleh menulis
-- ---------------------------------------------------------------------
-- Temuan: keempat policy lama hanya memeriksa bucket_id, sehingga SIAPA PUN
-- yang login bisa menimpa, menghapus, dan mendaftar foto profil orang lain.
-- Policy baru memeriksa bahwa folder teratas = uid pemanggil. Tampilan foto
-- tidak terpengaruh: bucket tetap public, dan URL publik tidak melewati
-- policy apa pun.
--
-- Uji sesudah terap: pemilik bisa unggah lalu hapus file di foldernya
-- sendiri lewat Storage API; dua avatar asli tidak berubah.
--
-- JANGAN mengembalikan policy lama sebagai "rollback" — itu membuka lagi
-- celahnya. Kalau ada masalah, perbaiki maju.
begin;
drop policy if exists "Avatar upload authenticated" on storage.objects;
drop policy if exists "Avatar update authenticated" on storage.objects;
drop policy if exists "Avatar delete authenticated" on storage.objects;
drop policy if exists "Avatar read public"          on storage.objects;

create policy "avatar_insert_milik_sendiri" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatar'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar_update_milik_sendiri" on storage.objects
  for update to authenticated
  using      (bucket_id = 'avatar' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatar' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar_delete_milik_sendiri" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatar' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar_select_milik_sendiri" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatar' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;


-- ---------------------------------------------------------------------
-- BAGIAN 1 — Direktori Alumni publik, opt-in
-- ---------------------------------------------------------------------
-- Diterapkan sebagai satu blok DO dengan penjaga baseline di depan dan
-- pemeriksaan pasca-DDL di belakang (gagal = seluruh transaksi batal).
-- Yang tercatat di sini hanya DDL-nya — identik dengan yang dijalankan.
begin;

-- Persetujuan pemilik akun. Default FALSE: tidak ada yang tampil ke
-- pengunjung sebelum ia sendiri mengizinkan. Sengaja TIDAK masuk
-- jaga_field_sensitif — ini pilihan privasi pemilik, bukan kewenangan.
-- Diubah lewat policy users_update_own yang sudah ada.
alter table public.users add column tampil_publik boolean not null default false;
comment on column public.users.tampil_publik is
  'Persetujuan pemilik akun agar nama, angkatan, dan foto profilnya tampil di '
  'Direktori Alumni untuk pengunjung yang belum login. Opt-in, default false. '
  'Diubah pemiliknya sendiri lewat /profil (policy users_update_own).';

-- View untuk pengunjung. security_invoker=false seperti view publik lain
-- (users tertutup RLS); security_barrier=true supaya penyaring view selalu
-- dievaluasi sebelum penyaring dari penanya.
create view public.alumni_direktori
  with (security_invoker = false, security_barrier = true)
as
select u.id, u.nama, u.angkatan,
       'Superfive ' || lpad((u.angkatan % 100)::text, 2, '0') as label_angkatan,
       u.avatar_url, u.foto_url
from public.users u
where u.status_alumni = 'alumni' and u.nonaktif_at is null
  and not u.is_institusi and u.angkatan is not null and u.tampil_publik;

-- WAJIB: default privileges project ini memberi view baru SELECT ke anon
-- dan SELURUH hak ke authenticated. View auto-updatable yang dijalankan
-- sebagai postgres tanpa revoke ini bisa dipakai menulis ke users.
revoke all on public.alumni_direktori from public, anon, authenticated;
grant select on public.alumni_direktori to anon, authenticated;

-- Persetujuan saat daftar: hanya nilai metadata 'true' (boolean true atau
-- teks "true") yang berarti setuju. Tanpa kuncinya — termasuk pendaftaran
-- yang tidak lewat formulir /auth — hasilnya false. Hanya dibaca saat
-- INSERT auth.users; mengubah metadata sesudahnya tidak berefek.
-- CREATE OR REPLACE mempertahankan ACL (EXECUTE hanya postgres/service_role).
create or replace function public.buat_profil_baru()
  returns trigger language plpgsql security definer set search_path to 'public'
as $function$
BEGIN
  BEGIN
    INSERT INTO public.users (id, email, nama, tampil_publik)
    VALUES (
      NEW.id,
      NEW.email,
      nullif(trim(coalesce(
        NEW.raw_user_meta_data->>'nama',
        NEW.raw_user_meta_data->>'full_name',
        ''
      )), ''),
      coalesce(NEW.raw_user_meta_data->>'tampil_publik', '') = 'true'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  RETURN NEW;
END;
$function$;

commit;

-- Hasil verifikasi sesudah COMMIT (10 Okt 2026): kolom boolean NOT NULL
-- default false; 5 akun lama semuanya false dan isi kolom lama identik;
-- view tepat enam kolom, anon/authenticated hanya SELECT, tanpa hak tulis;
-- alumni_publik tetap 401 untuk anon; view kosong untuk anon.

-- Pembatalan (hanya kalau benar-benar perlu, dan rollback APLIKASI dulu):
--   revoke all on public.alumni_direktori from anon, authenticated;
--   drop view public.alumni_direktori;
--   kembalikan buat_profil_baru() tanpa kolom tampil_publik.
-- Kolom tampil_publik JANGAN di-drop: isinya persetujuan pengguna.


-- ---------------------------------------------------------------------
-- BAGIAN 3 — pengguna_publik hanya untuk yang login
-- ---------------------------------------------------------------------
-- Diterapkan 10 Okt 2026 (05:18 WIB) setelah dry-run 21/21. Tanpa ini anon
-- bisa membaca nama, avatar, dan status alumni SEMUA akun aktif lewat
-- pengguna_publik, dan opt-in Bagian 1 tidak ada artinya.
--
-- Pemakai di kode (semuanya jalur anggota): chat, chat/[id], DaftarProspek,
-- ReviewSection.handleSubmit, dan /toko/[id] — yang terakhir dibuat hanya
-- memanggilnya kalau ada sesi. Tidak ada view, fungsi, atau policy yang
-- bergantung padanya, dan tidak ada hibah PUBLIC.
begin;
revoke select on public.pengguna_publik from anon;
commit;

-- Sesudah: relacl = {postgres=…, service_role=…, authenticated=r/postgres};
-- REST anon → 401 permission denied; authenticated → 5 akun, 6 kolom.
-- Pembatalan (membuka lagi kebocorannya): grant select on public.pengguna_publik to anon;
