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
  admin/             panel admin (hapus produk & toko) + /admin/verifikasi
  alumni/            direktori alumni
  auth/              login & daftar  → /auth?redirect=...&msg=...
                     plus /auth/reset untuk ganti kata sandi
  chat/              chat pembeli–penjual
  checkout/          checkout, panggil RPC create_pesanan
  dashboard/         dashboard penjual (produk & pesanan masuk)
  keranjang/         keranjang belanja
  pesanan/           riwayat pesanan pembeli
  preorder/          semua PO, dikelompokkan per periode
  produk/            daftar produk + /produk/[id] detail + /produk/tambah
  profil/            profil & alamat pengguna
  toko/              /toko/[id] halaman toko + /toko/saya
  verifikasi/        unggah bukti alumni
  components/
    Badge*           BadgeAngkatan, BadgeOfficial, BadgePreorder, BadgeVerifikasi
    Editor*          EditorVarian, EditorPreorder — dipakai form tambah & edit
    Section*         SectionOfficial (karosel merch), SectionPreorder (beranda)
    RekapPO          ringkasan PO satu produk untuk penjual
    PeringatanCampuranPO   peringatan keranjang campur PO + siap kirim
    lainnya          Navbar, BottomNav, FotoProduk, ReviewSection,
                     SearchOverlay, Skeleton, SkeletonCard, EmptyState,
                     Tombol, InputHarga, InputPassword, DialogKonfirmasi
  context/           CartContext, ChatContext, ToastContext
  hooks/
    useSkeleton      penundaan minimum 300 ms + mode uji ?skeleton=1
    useHitungMundur  jam bersama untuk hitung mundur PO
    useInfoPO        status PO tiap isi keranjang, sekali query
lib/
  supabase.js        client Supabase
  supabaseServer.ts  client untuk Server Component / generateMetadata
  uploadFoto.ts      upload ke bucket produk-foto
  buktiAlumni.ts     signed URL bukti alumni
  preorder.ts        aturan status PO, format tanggal, isian form PO
  statusPesanan.ts   kosakata dan warna status pesanan
  format.ts, foto.ts helper kecil
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
`alasan_tolak` · `is_institusi`✳ bool (default false) · `created_at`

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
`status_verifikasi`, `diverifikasi_at`, `diverifikasi_oleh`, `alasan_tolak`,
dan `is_institusi` ke nilai lama kalau yang mengubah bukan admin — tidak
melempar error, hanya tidak berubah. Karena itu client **tidak perlu** dan
**tidak boleh** menulis kolom-kolom itu; pakai RPC `verifikasi_alumni`.

### Akun institusi (`is_institusi`)

Menandai akun yang **bukan alumni perorangan** — toko resmi, panitia, dan
sejenisnya. Akun seperti ini dikecualikan dari:

- **Direktori alumni** (`/alumni`) — query wajib `.eq('is_institusi', false)`
- **Hitungan ALUMNI** di hero beranda
- **Pengelompokan dan filter angkatan**, karena keduanya dihitung dari hasil
  query direktori
- **Badge angkatan** di mana pun. Komponen
  [BadgeAngkatan](app/components/BadgeAngkatan.tsx) mengembalikan `null` kalau
  prop `institusi` bernilai true, jadi aturannya dijaga di satu tempat, bukan
  diulang di tiap pemanggil
- **Penanda "Seangkatan denganmu"**, bahkan kalau kolom `angkatan`-nya suatu
  saat kebetulan terisi

Alasannya: akun institusi tidak punya angkatan yang bermakna, dan menampilkan
angkatan kosong membuatnya terbaca seperti data yang belum lengkap.

Setiap query yang mengambil `angkatan` untuk ditampilkan harus ikut mengambil
`is_institusi` dan meneruskannya ke `BadgeAngkatan`. Di konteks toko resmi,
gantinya adalah lencana OFFICIAL dari
[BadgeOfficial](app/components/BadgeOfficial.tsx).

### `alumni_publik` (VIEW)
View baca-saja berisi kolom `users` yang aman dilihat siapa pun, termasuk
pengunjung yang belum login.

`id` · `nama` · `angkatan` · `avatar_url` · `foto_url` · `is_seller` ·
`status_verifikasi` · `is_institusi` · `created_at`

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
`foto_toko` · `rating` numeric (default 0) · `is_official`✳ bool (default false) ·
`created_at`

`is_official` menandai toko resmi INILIMA. Pengaruhnya ke UI besar:

- produknya **tidak muncul** di etalase umum `/produk`, tidak ikut hitungan
  PRODUK di hero beranda, dan tidak ikut section Produk Terbaru maupun
  `/preorder` — semuanya menyaring dengan `toko!inner(...)` + `.eq('toko.is_official', false)`
- gantinya punya rak sendiri: carousel di [SectionOfficial](app/components/SectionOfficial.tsx),
  diurutkan `produk.urutan` menaik
- tetap muncul di pencarian, dengan lencana OFFICIAL dan diletakkan paling atas
- lencana OFFICIAL menggantikan badge angkatan, karena pemiliknya akun institusi

Trigger `trg_jaga_toko_official` (BEFORE INSERT OR UPDATE) mengembalikan diam-diam
`is_official` ke `false` saat INSERT dan ke nilai lama saat UPDATE, kecuali yang
mengubah admin. Seperti `jaga_field_sensitif`, tidak melempar error — jadi client
**tidak perlu** dan **tidak boleh** menulis kolom ini.

### `produk`
`id`✳ · `toko_id` → toko.id · `nama` · `deskripsi` · `harga` int · `stok` int ·
`kategori` · `foto_url` · `rating` numeric (default 0) · `terjual` int (default 0) ·
`urutan` int (default 0) · `is_unggulan` bool (default false) ·
`is_preorder`✳ bool (default false) · `po_mulai` timestamptz ·
`po_selesai` timestamptz · `po_janji_kirim` **date** · `po_target` int ·
`po_maks` int · `po_catatan` · `created_at`

Kategori yang dipakai UI: Teknologi, Fashion, Kuliner, Properti, Jasa, UMKM.

`urutan` hanya bermakna untuk toko resmi — itu yang menentukan susunan carousel
merchandise di beranda. `is_unggulan` ada di skema tapi belum dipakai UI mana pun.

Tiga CHECK:

| Constraint | Isi |
|---|---|
| `chk_produk_valid` | `toko_id IS NOT NULL AND harga IS NOT NULL AND harga > 0` |
| `chk_po_periode` | kalau `is_preorder`: `po_mulai` dan `po_selesai` wajib, dan `po_selesai > po_mulai` |
| `chk_po_janji_kirim` | kalau `is_preorder`: `po_janji_kirim` wajib dan `po_janji_kirim > (po_selesai AT TIME ZONE 'Asia/Jakarta')::date` |

`chk_produk_valid` sudah tervalidasi penuh, jadi produk yatim tanpa toko atau tanpa
harga tidak bisa masuk lagi. Secara tipe kolomnya masih `nullable`, tapi datanya
dijamin terisi oleh CHECK.

Soal `chk_po_janji_kirim`: zona waktunya **dipatok WIB**, bukan mengikuti setelan
`TimeZone` sesi. Itu disengaja — `::date` polos bisa berubah artinya tanpa ada
yang menyentuh kode, dan pembatalan otomatis nanti juga akan berbasis WIB, jadi
keduanya harus memakai kalender yang sama.

Konsekuensinya untuk klien: pembandingnya adalah tanggal WIB dari `po_selesai`,
bukan UTC dan bukan pula zona waktu peramban. Pakai `tanggalWIB()` dan
`validasiFormPO()` di [lib/preorder.ts](lib/preorder.ts), jangan menulis ulang —
keduanya memakai `Intl` dengan `timeZone: 'Asia/Jakarta'` supaya penjual yang
sedang di luar negeri tetap dinilai dengan aturan yang sama seperti database.

### Pre-Order

`po_janji_kirim` bukan sekadar keterangan. Tanggal itu janji ke pembeli dan akan
dipakai sistem untuk membatalkan pesanan yang telat serta mengembalikan dana —
karena itu tipenya `date` dan bukan teks bebas, supaya bisa dibandingkan.

Aturan tampilan yang berlaku di semua halaman:

- Lencana ungu PRE-ORDER dari [BadgePreorder](app/components/BadgePreorder.tsx).
  `bentuk="pita"` di kartu produk, lencana biasa di tempat sempit
- **Jangan pernah menampilkan angka stok produk PO.** `trg_kurangi_stok` sengaja
  melewati produk PO, jadi stoknya selalu 0 dan akan terbaca "habis" padahal
  PO-nya sedang buka. Ganti dengan teks "Pre-Order"
- Format tanggal janji kirim lewat `janjiKirim()` di
  [lib/preorder.ts](lib/preorder.ts) → "Dikirim 28 September 2026". Fungsinya
  mengurai string date secara manual, karena `new Date('2026-09-28')` dianggap
  UTC dan bisa mundur sehari di WIB
- Buka/tutupnya periode **selalu diputuskan database**, tidak pernah dihitung
  dari jam peramban: `preorder_progress.sedang_buka`, atau filter dengan nilai
  `'now'` yang ditafsirkan Postgres sebagai waktu transaksi

Setiap query produk yang hasilnya ditampilkan sebagai kartu wajib ikut mengambil
`is_preorder` dan `po_janji_kirim`.

### `produk_varian`
Ukuran atau varian lain dari satu produk. Produk tanpa baris di sini berperilaku
seperti sebelum fitur varian ada.

`id`✳ · `produk_id`✳ → produk.id (ON DELETE CASCADE) · `tipe`✳ text
(default `Ukuran`) · `nama`✳ · `stok`✳ int (default 0, CHECK ≥ 0) ·
`harga_tambahan`✳ int (default 0) · `urutan` int (default 0) ·
`aktif`✳ bool (default true) · `created_at`

Unik: `(produk_id, tipe, nama)`.

- `harga_tambahan` ditambahkan ke `produk.harga`; harga finalnya tetap dihitung
  ulang server saat `create_pesanan`
- `aktif = false` menyembunyikan varian dari pembeli tanpa menghapus riwayat
- Stok induk `produk.stok` diturunkan dari jumlah stok varian aktif saat
  penjual menyimpan — bukan otomatis lewat trigger
- RLS: SELECT terbuka; INSERT/UPDATE/DELETE hanya pemilik toko lewat
  `varian_kelola_pemilik`
- Kalau sebuah produk punya varian aktif, `create_pesanan` **menolak** item yang
  tidak menyertakan `varian_id`

### `keranjang`
Keranjang pengguna yang sudah login. Guest disimpan di `localStorage`.

`id`✳ · `user_id`✳ → auth.users.id · `produk_id`✳ · `nama`✳ · `harga`✳ numeric ·
`kategori`✳ · `foto_url` · `qty`✳ int (default 1) · `varian_id` → produk_varian.id
(ON DELETE CASCADE) · `varian_nama` · `created_at`

Satu baris = satu kombinasi produk + varian. Uniknya dijaga index **ekspresi**:

```sql
create unique index keranjang_user_produk_varian_key
  on keranjang (user_id, produk_id, coalesce(varian_id, '00000000-...'::uuid));
```

**`upsert` dengan `onConflict` tidak bisa dipakai di sini.** `ON CONFLICT`
menuntut daftar kolom polos, dan index ini memakai ekspresi — Postgres menolak
dengan error 42P10. Pola yang dipakai: cari barisnya dulu, lalu UPDATE atau
INSERT (`simpanBaris()` di [app/context/CartContext.tsx](app/context/CartContext.tsx)).

`keranjang.varian_nama` berisi **nama varian saja** ("XXL"), berbeda dengan
`pesanan_items.varian_nama` yang sudah termasuk tipenya ("Ukuran XXL").

### `pesanan`
**Satu baris = satu toko.** Kalau keranjang berisi produk dari 3 toko, checkout
menghasilkan 3 baris `pesanan` dengan `group_id` yang sama.

`id`✳ · `buyer_id` → users.id · `group_id` uuid · `toko_id` → toko.id ·
`nomor_pesanan` (unik, diisi trigger) · `subtotal` int (0) · `ongkir` int (0) ·
`diskon` int (0) · `total` int · `metode_bayar` · `status` (default `menunggu`) ·
`payment_status` (default `menunggu`) · `midtrans_order_id` · `snap_token` ·
`paid_at` · `kurir` · `no_resi` · `penerima_nama` · `penerima_hp` ·
`alamat_kirim` · `catatan` · `dikirim_at` · `selesai_at` · `dibatalkan_at` ·
`alasan_batal` · `po_batas_kirim` **date** · `created_at` · `updated_at`

`produk_id` masih ada sebagai sisa skema lama — **jangan dipakai**, item pesanan
sekarang ada di `pesanan_items`.

`po_batas_kirim` diisi `create_pesanan` dengan janji kirim **terjauh** di antara
item pesanan itu. Gunanya untuk pembatalan otomatis pesanan PO yang telat —
mekanismenya **belum ada**, kolomnya belum dipakai UI mana pun.

### `pesanan_items`
Snapshot produk saat pesanan dibuat, supaya riwayat tidak berubah kalau penjual
mengedit atau menghapus produknya.

`id`✳ · `pesanan_id`✳ → pesanan.id (ON DELETE CASCADE) · `produk_id` → produk.id
(ON DELETE SET NULL) · `nama_produk`✳ · `harga`✳ int · `qty`✳ int (default 1,
CHECK > 0) · `subtotal`✳ int · `foto_url` · `varian_id` → produk_varian.id
(ON DELETE SET NULL) · `varian_nama` · `is_preorder`✳ bool (default false) ·
`po_janji_kirim` **date** · `created_at`

Semua yang ditampilkan di halaman pesanan dan dashboard dibaca dari sini, bukan
dari `produk` — termasuk tanda PO dan janji kirimnya. Kalau penjual mematikan PO
belakangan, riwayat tetap menunjukkan keadaan saat pesanan dibuat.

`varian_nama` di sini berisi **tipe + nama** ("Ukuran XXL"), sudah dirangkai
`create_pesanan`. Jangan tambahkan lagi kata "Ukuran" di depannya saat
menampilkan — beda dengan `keranjang.varian_nama` yang hanya berisi namanya.

### `preorder_progress` (VIEW)
Rekap satu baris per produk PO. Sumber tunggal untuk semua tampilan progres —
jangan menghitung ulang dari `pesanan_items` sendiri.

`produk_id` · `nama` · `toko_id` · `po_mulai` · `po_selesai` · `po_target` ·
`po_maks` · `sedang_buka` bool · `terkumpul` int

- `sedang_buka` = `now() >= po_mulai AND now() <= po_selesai`, dihitung di
  database. Itu sebabnya jam peramban pengunjung tidak pernah ikut menentukan
- `terkumpul` = jumlah `qty` dari semua `pesanan_items` yang pesanan induknya
  **statusnya bukan `dibatalkan`** — termasuk yang belum dibayar. Jadi angkanya
  adalah minat, bukan uang masuk
- `WHERE p.is_preorder`, jadi produk biasa tidak punya baris di sini
- `security_invoker = false` seperti `alumni_publik`. Itu disengaja: tanpa itu
  `terkumpul` hanya akan menghitung pesanan milik si pembaca sendiri, karena
  `pesanan_items` dibatasi RLS
- Hak `anon` dan `authenticated` hanya SELECT — sudah diverifikasi

View ini **tidak memuat harga, foto, maupun `po_janji_kirim`**. Pola yang dipakai
[SectionPreorder](app/components/SectionPreorder.tsx) dan
[/preorder](app/preorder/page.tsx): query view dulu, kumpulkan `produk_id`, lalu
sekali ke `produk` dengan `.in('id', ids)` dan `toko!inner`, gabung di JavaScript.

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
validasi login & field wajib, cek produk masih ada, cek varian dan periode PO,
pecah keranjang per toko, buat satu `group_id`, lalu insert `pesanan` +
`pesanan_items` sekaligus. Gagal di tengah = rollback total, tidak ada pesanan
tanpa item.

```ts
const { data, error } = await supabase.rpc('create_pesanan', {
  p_penerima_nama: nama,
  p_penerima_hp:   noHp,
  p_alamat:        alamat,
  p_catatan:       catatan,
  p_metode_bayar:  metode,
  p_items:         items.map(i => ({
    produk_id: i.id,
    varian_id: i.varian_id ?? null,
    qty:       i.qty,
  })),
})
// data: [{ pesanan_id, nomor, toko_id, total }, ...] — satu elemen per toko
```

Tiga hal penting:

1. **Harga diambil dari database, bukan dari client.** Cukup kirim `produk_id`,
   `varian_id`, dan `qty`. Jangan kirim harga atau nama dari keranjang — itu
   celah supaya orang bisa mengubah harga lewat DevTools. Harga final =
   `produk.harga + produk_varian.harga_tambahan`.
2. **Snapshot diisi server.** `nama_produk`, `foto_url`, `varian_nama`
   (tipe + nama), `is_preorder`, dan `po_janji_kirim` semuanya dibaca ulang dari
   `produk`/`produk_varian` di dalam RPC. `pesanan.po_batas_kirim` diisi janji
   kirim terjauh di pesanan itu.
3. **Pesan error sudah berbahasa Indonesia.** Tampilkan `error.message` apa
   adanya, jangan dibungkus lagi. Pesan yang mungkin muncul:
   - `Harus login untuk membuat pesanan`
   - `Keranjang kosong`
   - `Nama, nomor HP, dan alamat wajib diisi`
   - `Ada produk yang sudah tidak tersedia`
   - `Produk "X" belum lengkap datanya dan tidak bisa dipesan.`
   - `Pilih dulu varian untuk produk "X".`
   - `Periode pre-order untuk "X" sudah ditutup atau belum dibuka.`
   - `Kuota pre-order "X" sudah penuh.`
   - `Stok tidak mencukupi untuk X (Ukuran M).`
   - `Gagal menyimpan item pesanan (N dari M). Transaksi dibatalkan.`

Yang dijaga versi sekarang (v7):

- **Kuota PO tidak bisa jebol karena checkout bersamaan.** Sebelum memeriksa
  kuota, tiap produk PO dikunci dengan `pg_advisory_xact_lock(hashtext(id))`,
  diurutkan menaik supaya tidak saling menunggu. Kuncinya lepas sendiri saat
  transaksi selesai.
- **Qty dijumlahkan per produk lebih dulu.** Dua baris keranjang untuk produk PO
  yang sama (beda varian) dihitung sebagai satu total sebelum dibandingkan dengan
  `po_maks`, jadi tidak bisa lolos dengan memecah pesanan.
- **Stok hanya diperiksa untuk produk non-PO.** Produk PO memang belum punya
  barang; yang membatasi adalah periode dan kuota.
- **Pesanan tidak mungkin terbentuk tanpa item.** Pemeriksaan produk cacat
  berjalan sebelum insert apa pun, join item ke pesanan memakai
  `IS NOT DISTINCT FROM` sehingga `toko_id` NULL pun tetap cocok, dan di akhir
  jumlah item tersimpan dibandingkan dengan jumlah baris keranjang — kalau tidak
  sama, seluruh transaksi dibatalkan.

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
| `trg_kurangi_stok` | AFTER INSERT `pesanan_items` | Kurangi `produk_varian.stok` (kalau ada varian) dan `produk.stok`, minimum 0. **Produk PO dilewati sepenuhnya** |
| `trg_refresh_rating` | AFTER INSERT/UPDATE/DELETE `reviews` | Hitung ulang rating produk |
| `trg_jaga_toko_official` | BEFORE INSERT/UPDATE `toko` | Kembalikan `is_official` ke false / nilai lama kalau yang mengubah bukan admin |
| `trg_jaga_field_sensitif` | BEFORE UPDATE `users` | Kembalikan `role`, `status_verifikasi`, dan kawan-kawan ke nilai lama kalau bukan admin |

`trg_kurangi_stok` melewati produk PO dengan sengaja — itu sebabnya stok produk
PO selalu 0 dan **tidak boleh ditampilkan** sebagai angka di UI.

## Ringkasan RLS

- `users` — SELECT/UPDATE hanya pemilik (`id = auth.uid()`), plus akses penuh
  untuk admin lewat `users_admin_all`. **Tidak ada akses publik.** Data alumni
  lain diambil dari view `alumni_publik`
- `produk`, `toko`, `produk_varian` — SELECT terbuka untuk publik;
  INSERT/UPDATE/DELETE hanya pemilik toko (`toko.seller_id = auth.uid()`) atau
  admin. Untuk `produk_varian` kepemilikannya ditelusuri lewat
  `produk → toko`. `toko_insert_own` juga menolak pengguna yang
  `status_verifikasi`-nya belum `terverifikasi`, jadi yang belum lolos
  verifikasi tidak bisa membuka toko
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

Yang paling gawat adalah **VIEW**, karena view tidak punya RLS sendiri — grant
adalah satu-satunya penjaganya. Untuk TABEL, grant bawaan Supabase yang lebar
memang normal dan ditahan oleh RLS; semua tabel di project ini punya
`relrowsecurity = true` (sudah diperiksa). Jadi jangan panik melihat
`authenticated` punya INSERT/UPDATE/DELETE di sebuah tabel — periksa dulu
policy-nya. Untuk view, tidak ada yang menahan.

Sudah diverifikasi: `alumni_publik` dan `preorder_progress` sama-sama hanya
memberi SELECT ke `anon` dan `authenticated`.

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
| Emas | `#EF9F27` | Aksen identitas, lencana OFFICIAL |
| Ungu PO | `#7c4dff` / `#4527a0` | Pre-order — jangan dipakai untuk hal lain, ekspor `WARNA_PO` dan `WARNA_PO_TUA` dari [BadgePreorder](app/components/BadgePreorder.tsx) |

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

- **Sisa lint.** `npm run lint` masih melaporkan sekitar 40 error dan 25
  warning, semuanya di berkas lama: `no-explicit-any`, `no-img-element`,
  beberapa `set-state-in-effect` (Navbar, chat, SearchOverlay, useSkeleton),
  dan `Cannot create components during render` di Navbar. Jangan dikerjakan
  sepotong — kerjakan sekaligus dalam satu pekerjaan tersendiri.
- Tabel `ulasan` dan `chat` sudah tidak terpakai tapi belum dihapus.
- Kolom `produk.po_estimasi_kirim` dan `pesanan_items.po_estimasi_kirim` sudah
  tidak dipakai kode mana pun, tapi masih ada di database dan masih ditulis
  `create_pesanan`. View `preorder_progress` juga masih menyeleksinya.
  Pembuangannya menunggu Inyo (per 12 Agustus 2026).
- `pesanan.po_batas_kirim` sudah terisi tapi belum ada mekanisme pembatalan
  otomatis dan belum dipakai UI.
- Seluruh fitur verifikasi alumni (halaman admin, /verifikasi, badge, banner)
  dan konfirmasi pembayaran manual belum diuji manual di browser
  (per 10 Agustus 2026).
- **Seluruh fitur pre-order belum pernah diuji dengan data sungguhan** — sampai
  12 Agustus 2026 belum ada satu pun produk `is_preorder = true` di database,
  jadi semua tampilan PO baru terbukti benar secara tipe dan lint saja.
