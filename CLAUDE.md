@AGENTS.md

# Superfive Market

Marketplace alumni SMPN 5 Bandung. Alumni bisa buka toko, jual produk, dan
alumni lain bisa belanja. Ada juga direktori alumni dan chat antar pengguna.

Bahasa di seluruh project — nama kolom, variabel, teks UI, pesan error — pakai
Bahasa Indonesia. Ikuti itu, jangan campur dengan istilah Inggris kecuali sudah
jadi konvensi teknis (`id`, `created_at`, `status`, `payment_status`).

## Stack

| Bagian | Yang dipakai |
|---|---|
| Framework | Next.js 16.2.6, App Router, React 19.2.4 |
| Bahasa | TypeScript (strict), beberapa file lama masih `.js` |
| Database & Auth | Supabase (Postgres 17), project ref `cbepplpvlizwyaalndas` |
| Storage | Supabase Storage, bucket `produk-foto` |
| Hosting | Vercel |
| Styling | Inline `style={{}}` — lihat bagian Konvensi Kode |

Client Supabase ada di [lib/supabase.js](lib/supabase.js) — **tanpa tipe generic**,
jadi semua hasil query bertipe `any`. Kalau butuh tipe, deklarasikan `type` manual
di file yang bersangkutan.

## Struktur Direktori

```
app/
  page.tsx           beranda
  about/             tentang
  admin/             panel admin (hapus produk & toko)
  alumni/            direktori alumni
  auth/              login & daftar  → /auth?redirect=...&msg=...
  chat/              chat pembeli–penjual
  checkout/          checkout, panggil RPC create_pesanan
  dashboard/         dashboard penjual (produk & pesanan masuk)
  keranjang/         keranjang belanja
  produk/            daftar produk + /produk/[id] detail
  profil/            profil & alamat pengguna
  toko/              /toko/[id] halaman toko
  components/        Navbar, FotoProduk, ReviewSection, SearchOverlay, SkeletonCard
  context/           CartContext (keranjang)
lib/
  supabase.js        client Supabase
  uploadFoto.ts      upload ke bucket produk-foto
```

## Skema Database

RLS **aktif di semua tabel**. Semua `id` bertipe `uuid` dengan default
`gen_random_uuid()`, semua `created_at` bertipe `timestamptz` default `now()`.
Tanda ✳ = NOT NULL.

### `users`
Profil alumni. `id` sama dengan `auth.users.id`.

`id`✳ · `nama` · `email` (unik) · `no_hp` · `angkatan` int · `foto_url` ·
`avatar_url` · `is_seller` bool (default false) · `role`✳ text (default `member`) ·
`jalan` · `kelurahan` · `kecamatan` · `kota` · `provinsi` · `kode_pos` ·
`status_verifikasi`✳ text (default `menunggu`) · `bukti_alumni_url` ·
`catatan_pendaftar` · `diverifikasi_at` · `diverifikasi_oleh` uuid ·
`alasan_tolak` · `created_at`

Alamat disimpan terpisah per bagian, lalu dirangkai jadi satu string saat checkout
(lihat `buildAlamat` di [app/checkout/page.tsx](app/checkout/page.tsx)).

**Tabel ini TIDAK bisa dibaca umum.** Policy `users_select_own` hanya mengizinkan
`id = auth.uid()`, ditambah `users_admin_all` untuk admin. Jadi:

- baca profil **sendiri** → `users`
- baca profil **alumni lain** → `alumni_publik` (lihat di bawah)
- halaman admin → `users` boleh, karena `is_admin()`

`role` bernilai `member` atau `admin`. `status_verifikasi` bernilai
`menunggu` | `terverifikasi` | `ditolak`.

Trigger `jaga_field_sensitif` mengembalikan diam-diam nilai `role`,
`status_verifikasi`, `diverifikasi_at`, `diverifikasi_oleh`, dan `alasan_tolak`
ke nilai lama kalau yang mengubah bukan admin — tidak melempar error, hanya
tidak berubah. Karena itu client **tidak perlu** dan **tidak boleh** menulis
kolom-kolom itu; pakai RPC `verifikasi_alumni`.

### `alumni_publik` (VIEW)
View baca-saja berisi kolom `users` yang aman dilihat siapa pun, termasuk
pengunjung yang belum login.

`id` · `nama` · `angkatan` · `avatar_url` · `foto_url` · `is_seller` ·
`status_verifikasi` · `created_at`

Cara pakainya sama seperti tabel biasa:
`supabase.from('alumni_publik').select('id, nama, angkatan, status_verifikasi')`

Dua hal yang perlu diingat:

- **Embed foreign key ke `users` tidak bisa dipakai lagi** untuk data publik.
  Pola `toko(nama_toko, users(angkatan))` akan kosong. Gantinya: query `toko`
  dulu, kumpulkan `seller_id`-nya, ambil sekali ke `alumni_publik` dengan
  `.in('id', sellerIds)`, lalu gabungkan di JavaScript. Contoh terpakai ada di
  [app/produk/page.tsx](app/produk/page.tsx) dan
  [app/toko/[id]/page.tsx](app/toko/[id]/page.tsx).
- View sengaja dibuat `security_invoker = false` supaya tetap bisa dibaca
  meski `users` tertutup. Kalau Supabase linter mengeluh soal
  "SECURITY DEFINER VIEW", itu memang disengaja dan sudah aman karena hak
  tulisnya dicabut. Jangan diubah ke `true` — view akan mengembalikan 0 baris.

### `toko`
`id`✳ · `seller_id` → users.id · `nama_toko` · `deskripsi` · `kategori` ·
`foto_toko` · `rating` numeric (default 0) · `created_at`

### `produk`
`id`✳ · `toko_id` → toko.id · `nama` · `deskripsi` · `harga` int · `stok` int ·
`kategori` · `foto_url` · `rating` numeric (default 0) · `terjual` int (default 0) ·
`created_at`

Kategori yang dipakai UI: Teknologi, Fashion, Kuliner, Properti, Jasa, UMKM.

Constraint `chk_produk_valid` menjamin `toko_id IS NOT NULL`, `harga IS NOT NULL`,
dan `harga > 0`. Sudah tervalidasi penuh, jadi produk yatim tanpa toko atau tanpa
harga tidak bisa masuk lagi, termasuk lewat form tambah produk. Secara tipe kolom
keduanya masih `nullable`, tapi datanya dijamin terisi oleh CHECK di atas.

### `keranjang`
Keranjang pengguna yang sudah login. Guest disimpan di `localStorage`.

`id`✳ · `user_id`✳ → auth.users.id · `produk_id`✳ · `nama`✳ · `harga`✳ numeric ·
`kategori`✳ · `foto_url` · `qty`✳ int (default 1) · `created_at`

Unik: `(user_id, produk_id)` — dipakai untuk `upsert` dengan
`{ onConflict: 'user_id,produk_id' }`.

### `pesanan`
**Satu baris = satu toko.** Kalau keranjang berisi produk dari 3 toko, checkout
menghasilkan 3 baris `pesanan` dengan `group_id` yang sama.

`id`✳ · `buyer_id` → users.id · `group_id` uuid · `toko_id` → toko.id ·
`nomor_pesanan` (unik, diisi trigger) · `subtotal` int (0) · `ongkir` int (0) ·
`diskon` int (0) · `total` int · `metode_bayar` · `status` (default `menunggu`) ·
`payment_status` (default `menunggu`) · `midtrans_order_id` · `snap_token` ·
`paid_at` · `kurir` · `no_resi` · `penerima_nama` · `penerima_hp` ·
`alamat_kirim` · `catatan` · `dikirim_at` · `selesai_at` · `dibatalkan_at` ·
`alasan_batal` · `created_at` · `updated_at`

`produk_id` masih ada sebagai sisa skema lama — **jangan dipakai**, item pesanan
sekarang ada di `pesanan_items`.

### `pesanan_items`
Snapshot produk saat pesanan dibuat, supaya riwayat tidak berubah kalau penjual
mengedit atau menghapus produknya.

`id`✳ · `pesanan_id`✳ → pesanan.id · `produk_id` → produk.id · `nama_produk`✳ ·
`harga`✳ int · `qty`✳ int (default 1, CHECK > 0) · `subtotal`✳ int · `foto_url` ·
`created_at`

### `reviews`
`id`✳ · `produk_id` · `user_id` → auth.users.id · `nama_reviewer` · `rating` int
(CHECK 1–5) · `komentar` · `created_at` — unik `(produk_id, user_id)`

### `conversations` & `messages`
Chat yang dipakai sekarang.

`conversations`: `id`✳ · `buyer_id`✳ · `seller_id`✳ · `produk_id` ·
`last_message` · `last_message_at` · `created_at` — unik `(buyer_id, seller_id)`

`messages`: `id`✳ · `conversation_id`✳ · `sender_id`✳ · `content`✳ ·
`is_read` bool (false) · `created_at`

### Tabel warisan — jangan dipakai untuk fitur baru
`ulasan` (digantikan `reviews`) dan `chat` (digantikan `conversations`/`messages`).

## Supabase Storage

| Bucket | Sifat | Isi |
|---|---|---|
| `produk-foto` | publik | Foto produk, lewat `uploadFotoProduk()` di [lib/uploadFoto.ts](lib/uploadFoto.ts) |
| `avatar` | publik | Foto profil |
| `bukti-alumni` | **privat** | Ijazah/rapor/kartu pelajar, maks 5 MB, hanya jpeg/png/webp |

`bukti-alumni` privat karena isinya dokumen identitas. Aturannya:

- Path **wajib** diawali user id: `${user.id}/namafile.jpg`. Kalau tidak,
  policy storage menolak upload.
- Kolom `users.bukti_alumni_url` menyimpan **path**, bukan URL publik.
- Membacanya lewat signed URL berumur 10 menit — pakai `urlBukti()` di
  [lib/buktiAlumni.ts](lib/buktiAlumni.ts), jangan bikin URL sendiri.
- Pemilik bisa unggah/lihat/hapus miliknya sendiri; admin bisa lihat semua.

## Kosakata Status

Dijaga CHECK constraint di database. Nilai di luar daftar ini **ditolak**.

```
status:         menunggu | dibayar | diproses | dikirim | selesai | dibatalkan
payment_status: menunggu | lunas | gagal | kadaluarsa | refund
```

Keduanya default `menunggu`. Jangan pakai `pending`, `dikonfirmasi`, `paid`, atau
variasi Inggris lain.

## RPC yang Tersedia

### `create_pesanan` — satu-satunya cara membuat pesanan

**Jangan pernah insert manual ke `pesanan` atau `pesanan_items` dari client.**
RPC ini `SECURITY DEFINER` dan mengerjakan semuanya dalam satu transaksi:
validasi login & field wajib, cek produk masih ada, pecah keranjang per toko,
buat satu `group_id`, lalu insert `pesanan` + `pesanan_items` sekaligus. Gagal di
tengah = rollback total, tidak ada pesanan tanpa item.

```ts
const { data, error } = await supabase.rpc('create_pesanan', {
  p_penerima_nama: nama,
  p_penerima_hp:   noHp,
  p_alamat:        alamat,
  p_catatan:       catatan,
  p_metode_bayar:  metode,
  p_items:         items.map(i => ({ produk_id: i.id, qty: i.qty })),
})
// data: [{ pesanan_id, nomor, toko_id, total }, ...] — satu elemen per toko
```

Dua hal penting:

1. **Harga diambil dari database, bukan dari client.** Cukup kirim `produk_id`
   dan `qty`. Jangan kirim harga atau nama dari keranjang — itu celah supaya
   orang bisa mengubah harga lewat DevTools.
2. **Pesan error sudah berbahasa Indonesia.** Tampilkan `error.message` apa
   adanya, jangan dibungkus lagi. Pesan yang mungkin muncul:
   - `Harus login untuk membuat pesanan`
   - `Keranjang kosong`
   - `Nama, nomor HP, dan alamat wajib diisi`
   - `Ada produk yang sudah tidak tersedia`
   - `Produk "X" belum lengkap datanya dan tidak bisa dipesan. Hapus dari
     keranjang atau hubungi penjual.`
   - `Gagal menyimpan item pesanan (N dari M tersimpan). Transaksi dibatalkan.`

Pesanan tidak mungkin terbentuk tanpa item. Ada tiga lapis yang menjaganya:
pemeriksaan produk cacat di awal fungsi sebelum insert apa pun, join item ke
pesanan memakai `IS NOT DISTINCT FROM` sehingga `toko_id` NULL pun tetap cocok,
dan jaring pengaman di akhir yang membandingkan jumlah item tersimpan dengan
jumlah baris keranjang — kalau tidak sama, seluruh transaksi dibatalkan.

### `verifikasi_alumni` — hanya admin

Menyetujui atau menolak pendaftar. Jangan menulis `status_verifikasi` langsung
ke tabel — trigger `jaga_field_sensitif` akan mengabaikannya tanpa error.

```ts
const { data, error } = await supabase.rpc('verifikasi_alumni', {
  p_user_id: id,
  p_setujui: true,      // false = tolak
  p_alasan:  null,      // wajib diisi kalau menolak
})
// data: { nama, status }
```

### `is_admin()` — helper

Mengembalikan boolean, dipakai di dalam policy. Hanya bisa dipanggil pengguna
yang sudah login. Di client cukup baca `users.role` milik sendiri.

## Trigger Otomatis

Jangan tulis manual hal-hal di bawah ini dari aplikasi — sudah ditangani database.

| Trigger | Kapan | Yang dilakukan |
|---|---|---|
| `trg_nomor_pesanan` | BEFORE INSERT `pesanan` | Isi `nomor_pesanan` format `SF-YYMM-00001`. Karena BEFORE, `.select('nomor_pesanan')` langsung dapat nilainya |
| `trg_pesanan_updated` | BEFORE UPDATE `pesanan` | Isi `updated_at` |
| `trg_tambah_terjual` | BEFORE UPDATE `pesanan` | Saat status jadi `selesai`: tambah `produk.terjual` dan isi `selesai_at` |
| `trg_kurangi_stok` | AFTER INSERT `pesanan_items` | Kurangi `produk.stok`, minimum 0 |
| `trg_refresh_rating` | AFTER INSERT/UPDATE/DELETE `reviews` | Hitung ulang rating produk |

## Ringkasan RLS

- `users` — SELECT/UPDATE hanya pemilik (`id = auth.uid()`), plus akses penuh
  untuk admin lewat `users_admin_all`. **Tidak ada akses publik.** Data alumni
  lain diambil dari view `alumni_publik`
- `produk`, `toko` — SELECT terbuka untuk publik; INSERT/UPDATE/DELETE hanya
  pemilik toko (`toko.seller_id = auth.uid()`). `toko_insert_own` juga menolak
  pengguna yang `status_verifikasi`-nya belum `terverifikasi`, jadi yang belum
  lolos verifikasi tidak bisa membuka toko
- `keranjang` — pengguna hanya bisa menyentuh barisnya sendiri
- `pesanan` — INSERT wajib `buyer_id = auth.uid()`. SELECT/UPDATE untuk pembeli
  (`buyer_id = auth.uid()`) **atau** penjual pemilik toko
  (`toko.seller_id = auth.uid()` lewat `pesanan.toko_id`). UPDATE punya
  WITH CHECK yang sama, jadi penjual tidak bisa memindahkan pesanan ke toko
  lain. **Tidak ada policy DELETE** — pesanan tidak bisa dihapus dari client,
  pembatalan pakai `status = 'dibatalkan'`
- `pesanan_items` — akses menumpang pada policy `pesanan` induknya

Konsekuensi praktis: setiap alur yang menulis data wajib memastikan pengguna
sudah login lebih dulu. Pola yang dipakai di project ini:

```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  router.replace('/auth?redirect=/checkout&msg=Login+dulu+untuk+menyelesaikan+pesanan')
  return
}
```

## ATURAN: Jangan `git add -A`

**Jangan pernah memakai `git add -A` atau `git add .`.** Selalu jalankan
`git status` lebih dulu, lihat apa saja yang muncul, lalu `git add` file yang
memang dimaksud satu per satu.

```bash
git status --short
```

```bash
git add app/components/Navbar.tsx app/page.tsx
```

Alasannya bukan teori. Pada commit `2b0e4fe`, `git add -A` menyapu
`public/files.zip` — arsip aset 2,7 MB yang kebetulan ada di folder `public/`
dan sama sekali tidak berhubungan dengan commit itu. Arsipnya ikut ter-push,
ter-deploy, dan bisa diunduh siapa saja di `/files.zip` selama beberapa jam
sampai ketahuan.

`public/` sangat rawan untuk ini, karena apa pun di dalamnya otomatis
tersaji ke publik.

## ATURAN: Hak Tulis VIEW dan TABEL Baru

Setiap kali membuat **VIEW atau TABEL baru di schema `public`**, hak tulis untuk
`anon` dan `authenticated` **WAJIB dicabut secara eksplisit**. Supabase
memberikannya otomatis lewat default privileges.

```sql
revoke insert, update, delete, truncate on public.nama_objek from anon, authenticated;
```

Ini bukan teori. View `alumni_publik` sempat bisa ditulis pengunjung yang belum
login — nama alumni bisa ditimpa dan baris `users` bisa dihapus lewat view,
melewati RLS sepenuhnya, karena view auto-updatable + `security_invoker=false`
+ grant bawaan. `GRANT SELECT` tidak membatasi apa pun; ia hanya menambah.

Default privileges di project ini sudah dikunci, tapi tetap **verifikasi tiap
kali** membuat objek baru:

```sql
select grantee, privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='nama_objek'
  and grantee in ('anon','authenticated');
```

Hal yang sama berlaku untuk fungsi: fungsi trigger tidak perlu bisa dipanggil
lewat REST. `EXECUTE` untuk enam fungsi trigger di project ini sudah dicabut
dari `anon` dan `authenticated`; hanya `create_pesanan`, `verifikasi_alumni`,
dan `is_admin` yang boleh dipanggil pengguna login.

## ATURAN: Perubahan Skema Database

**Jangan pernah mengubah skema database dari sesi ini.** Termasuk: `CREATE` /
`ALTER` / `DROP` tabel, kolom, constraint, index, trigger, function, atau policy,
dan menjalankan file migrasi.

Kalau ada perubahan skema yang dibutuhkan: tulis SQL-nya, jelaskan alasannya,
lalu **minta ke Inyo** untuk dijalankan. Inyo yang pegang migrasi.

Membaca skema, menjalankan `SELECT`, dan memeriksa definisi function lewat
Supabase MCP tetap boleh dan memang dianjurkan sebelum menulis query.

**Semua perubahan skema dikerjakan Inyo di sesi terpisah**, jadi dokumen ini
bisa saja tertinggal dari kondisi database sebenarnya. Kalau ada info skema di
sini yang terasa aneh atau tidak cocok dengan gejala yang kamu lihat,
**verifikasi dulu ke database** — jangan percaya catatan lama:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'pesanan'
order by ordinal_position;
```

Untuk constraint pakai `pg_constraint`, untuk policy pakai `pg_policies`, untuk
function dan trigger pakai `pg_get_functiondef` / `pg_get_triggerdef`. Kalau
temuannya beda dengan dokumen ini, perbaiki dokumennya sekalian.

## Konvensi Kode

**Styling — inline style objects.** Tailwind v4 terpasang di dependency tapi
praktis tidak dipakai di komponen. Ikuti gaya yang sudah ada
(`style={{ padding: '18px', borderRadius: '12px' }}`), jangan campurkan
className Tailwind ke halaman lama.

Palet warna:

| Warna | Kode | Dipakai untuk |
|---|---|---|
| Biru utama | `#0C447C` | Tombol, judul section, angka penting |
| Biru muda | `#E6F1FB` | Latar kartu aksen, placeholder foto |
| Latar halaman | `#f0f5fb` | Background `<main>` |
| Border | `#c5d9ef` | Umumnya `0.5px solid` |
| Teks sekunder | `#5a7da0` | Label, keterangan |
| Teks utama | `#1a1a1a` | Judul dan isi |
| Sukses / error | `#2e7d32` / `#c62828` | Status |

Konvensi lain:

- Hampir semua halaman `'use client'` — data diambil di `useEffect` lewat client
  Supabase, bukan Server Component. Ikuti pola itu supaya konsisten.
- Format rupiah: helper lokal `fmt(n)` → `'Rp ' + n.toLocaleString('id-ID')`.
- Emoji kategori dipakai sebagai fallback gambar. Komponen `FotoProduk` sudah
  menangani `foto_url` yang bentuknya string, array, atau literal array Postgres —
  pakai komponen itu, jangan `<img>` langsung.
- Async handler pakai `try/catch/finally`, dan `setLoading(false)` selalu di
  `finally` supaya tombol tidak nyangkut di "Memproses...".
- Error ditampilkan sebagai state string di halaman, bukan `alert()`.
- Upload gambar lewat `uploadFotoProduk()` di [lib/uploadFoto.ts](lib/uploadFoto.ts).

## Cara Kerja yang Diharapkan

- Keputusan teknis biasa diambil sendiri, langsung kerjakan, laporkan di akhir.
  Kalau dua pilihan sama masuk akal, pilih yang paling sederhana dan gampang
  dirawat, sebutkan alasannya satu kalimat.
- Bug lain yang jelas rusak dan ketemu di jalan: perbaiki sekalian.
- Commit lokal per fitur, langsung saja tanpa tanya.
- Laporkan tiap satu tugas selesai, jangan tunggu semuanya kelar. Laporan
  singkat, Bahasa Indonesia. Hal yang belum kelar atau berisiko ditulis di
  bagian paling bawah.
- Minta izin hanya untuk tiga hal: **git push** (commit lokal boleh langsung),
  **menghapus file atau folder**, dan **mengubah skema database / menjalankan
  migrasi SQL**.

### JANGAN jalankan perintah yang blocking

**Jangan pernah menjalankan `npm run dev`, `next dev`, `npm start`, atau
perintah lain yang tidak pernah selesai sendiri.** Perintah seperti itu
menggantung sesi sampai timeout dan membuang waktu berjam-jam.

Dev server sudah dijalankan Inyo sendiri di **port 3000** dan menyala terus.
Perubahan kode langsung terpakai lewat Fast Refresh — tidak perlu restart,
tidak perlu start server baru.

Verifikasi cukup dengan dua perintah ini:

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

Kalau butuh memastikan sesuatu di sisi data, pakai Supabase MCP untuk `SELECT`
— jangan menghidupkan server untuk itu.

## Utang Teknis yang Diketahui

- **Migrasi `<a>` ke `<Link>` seluruh project.** `npm run lint` melaporkan
  sekitar 97 masalah, mayoritas `@next/next/no-html-link-for-pages` karena
  hampir semua halaman memakai `<a href>` untuk navigasi internal. Jangan
  dikerjakan sepotong — mengubah satu atau dua halaman saja justru membuat
  codebase punya dua gaya navigasi. Kerjakan sekaligus dalam satu pekerjaan
  tersendiri, sekalian menyapu sisa warning `no-explicit-any` dan
  `no-img-element`.
- Tabel `ulasan` dan `chat` sudah tidak terpakai tapi belum dihapus.
- Seluruh fitur verifikasi alumni (halaman admin, /verifikasi, badge, banner)
  dan konfirmasi pembayaran manual belum diuji manual di browser
  (per 10 Agustus 2026).
