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
                     + /admin/verifikasi (alumni) + /admin/penjual (izin jualan)
  alumni/            direktori alumni
  auth/              login & daftar  → /auth?redirect=...&msg=...
                     plus /auth/reset untuk ganti kata sandi
  chat/              chat pembeli–penjual
  checkout/          checkout, panggil RPC create_pesanan
  dashboard/         dashboard penjual (produk & pesanan masuk)
  jual/              "Mulai Berjualan" — panggil RPC ajukan_jadi_penjual
  keranjang/         keranjang belanja
  pesanan/           riwayat pesanan pembeli
  produk/            daftar produk + /produk/[id] detail + /produk/tambah
  profil/            profil & alamat pengguna
  toko/              /toko/[id] halaman toko + /toko/saya
  verifikasi/        pengajuan alumni — panggil RPC ajukan_alumni
  components/
    Badge*           BadgeAngkatan, BadgeOfficial, BadgePreorder, BadgeVerifikasi
    Editor*          EditorVarian, EditorPreorder — dipakai form tambah & edit
    SectionOfficial  karosel merchandise resmi di beranda
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

Dua sumbu status — **ini yang dipakai semua logika baru**, lihat
[Dua sumbu verifikasi](#dua-sumbu-verifikasi):

`status_alumni`✳ text (default `umum`) · `status_penjual`✳ text
(default `belum_ajukan`) · `alamat_lengkap` · `bank_nama` · `bank_rekening` ·
`bank_atas_nama` · `setuju_aturan_at` · `ajukan_penjual_at` ·
`penjual_diputus_at` · `penjual_diputus_oleh` uuid · `alasan_penjual` ·
`jml_telat_kirim`✳ int (default 0) · `telat_terakhir_at`

Penonaktifan akun dan permintaan data ulang oleh admin:

`nonaktif_at` · `nonaktif_oleh` uuid · `alasan_nonaktif` · `catatan_admin` ·
`diminta_data_at` · `diminta_data_oleh` uuid

Alamat disimpan terpisah per bagian, lalu dirangkai jadi satu string saat checkout
(lihat `buildAlamat` di [app/checkout/page.tsx](app/checkout/page.tsx)).

**Tabel ini TIDAK bisa dibaca umum.** Policy `users_select_own` hanya mengizinkan
`id = auth.uid()`, ditambah `users_admin_all` untuk admin. Jadi:

- baca profil **sendiri** → `users` (status, peran, alamat — semuanya boleh)
- baca **nama/avatar/lencana orang lain** → `pengguna_publik`
- baca **angkatan orang lain**, atau isi direktori → `alumni_publik`
- halaman admin → `users` boleh, karena `is_admin()`

**Jangan pernah membaca `users` untuk menampilkan profil orang lain.** Barisnya
tidak akan terbaca, dan hasilnya bukan error yang jelas melainkan nama kosong
di layar. Yang tersisa membaca `users` langsung dari klien hanyalah tiga hal
di atas: baris sendiri, panel admin, dan tulis-menulis milik sendiri.

`role` bernilai `member` atau `admin`. `status_verifikasi` bernilai
`menunggu` | `terverifikasi` | `ditolak`.

Trigger `jaga_field_sensitif` mengembalikan diam-diam nilai `role`,
`status_verifikasi`, `diverifikasi_at`, `diverifikasi_oleh`, `alasan_tolak`,
dan `is_institusi` ke nilai lama kalau yang mengubah bukan admin — tidak
melempar error, hanya tidak berubah. Karena itu client **tidak perlu** dan
**tidak boleh** menulis kolom-kolom itu; pakai RPC yang sesuai.

### Dua sumbu verifikasi

Sejak 14 Agustus 2026 verifikasi dipecah jadi **dua pertanyaan yang berbeda**,
dan menggabungkannya kembali adalah kesalahan yang paling mudah terjadi di
sini. Belanja **tidak bergantung pada keduanya** — pembeli sekarang siapa saja.

```
status_alumni  : umum | menunggu | alumni | ditolak
  Siapa orang ini. Menentukan lencana dan masuk-tidaknya ke direktori alumni.
  'umum' = pembeli biasa, tidak diperiksa siapa pun. Itu default-nya.

status_penjual : belum_ajukan | menunggu | aktif | ditolak | dibekukan
  HANYA ini yang menentukan toko tayang.
```

Keduanya dijaga CHECK constraint (`chk_status_alumni`, `chk_status_penjual`),
jadi nilai di luar daftar ditolak database.

Yang perlu dipegang:

- **Jangan pernah memakai status alumni untuk memagari belanja.** Yang
  berstatus `umum` tidak boleh dihalangi apa pun: tidak ada layar tunggu,
  tidak ada pengalihan paksa, tidak ada tombol yang dimatikan. Satu-satunya
  ajakan verifikasi ada di [/profil](app/profil/page.tsx), sekali, bernada
  undangan
- **Pintu berjualan hanya `status_penjual = 'aktif'`.** Itu yang diperiksa
  [/produk/tambah](app/produk/tambah/page.tsx). Policy `toko_insert_own`
  masih memakai `status_verifikasi` lama, jadi pagar itu **tidak cukup**
  sendirian — alumni terverifikasi yang belum disetujui admin masih lolos RLS
- **Lencana alumni hanya untuk `status_alumni = 'alumni'`.**
  [BadgeVerifikasi](app/components/BadgeVerifikasi.tsx) menerima boolean, bukan
  status mentah, supaya tidak ada pemanggil yang menebak nilai mana yang sah
- Syarat berjualan adalah alumni: `ajukan_jadi_penjual` menolak yang
  `status_alumni <> 'alumni'`, dan `putuskan_penjual` menolak mengaktifkan
  yang bukan alumni maupun institusi
- Penjual `ditolak` atau `dibekukan` **tetap masuk dashboard**, dan itu
  disengaja: tokonya turun dari etalase, **kewajibannya tidak**. Pesanan yang
  sedang berjalan tetap harus dikirim, tenggat dan pembatalan otomatis tetap
  jalan. Karena itu dashboard menampilkan `alasan_penjual` beserta pengingat
  kewajiban, bukan mengunci halamannya

#### Keduanya dijaga `jaga_field_sensitif`

Trigger `trg_jaga_field_sensitif` (BEFORE UPDATE `users`) mengembalikan
**22 kolom** ke nilai lamanya kalau yang mengubah bukan admin dan bukan RPC
resmi — `status_alumni` dan `status_penjual` termasuk di dalamnya, beserta
`is_seller`, seluruh jejak keputusan penjual, `jml_telat_kirim`, kolom
penonaktifan, dan `catatan_admin`.

**Jangan menyalin daftar kolomnya ke mana pun, termasuk ke dokumen ini.**
Daftarnya akan bertambah tiap kali ada kolom sensitif baru, dan salinan yang
tertinggal lebih berbahaya daripada tidak ada daftar sama sekali — orang akan
mengira kolomnya aman padahal tidak, atau sebaliknya. Baca langsung:

```sql
select pg_get_functiondef(oid) from pg_proc where proname = 'jaga_field_sensitif';
```

Kolom biasa (`nama`, `no_hp`, `avatar_url`, alamat) tetap bebas diubah
pemiliknya. Yang ditahan hanya kolom yang menentukan kewenangan.

Penjaganya **diam-diam**, sama seperti sebelumnya: UPDATE-nya sukses, nilainya
saja yang tidak berubah. Alasannya sama seperti dulu — yang ditahan di sini
adalah orang yang mencoba menaikkan haknya sendiri, dan kegagalan tanpa pesan
tidak memberi petunjuk apa pun soal cara kerja penjagaannya. Bandingkan dengan
`jaga_status_pesanan` yang justru melempar error, di
[Kenapa melempar error](#kenapa-melempar-error-bukan-diam-diam-seperti-jaga_field_sensitif).

Sudah diuji dengan menjalankannya sebagai akun ber-role `member` di dalam
transaksi yang di-rollback: `status_alumni`, `status_penjual`, dan
`jml_telat_kirim` kembali ke nilai lama, sementara `nama` yang diubah di
UPDATE yang sama tetap berubah. **Uji seperti ini tidak boleh memakai akun
admin** — lihat [Aturan pengujian](#aturan-pengujian-penjaga-jangan-pakai-akun-admin).

`status_verifikasi` lama **masih ada dan masih ditulis** oleh `ajukan_alumni`
dan `verifikasi_alumni` selama peralihan. Jangan dibuang, jangan diandalkan —
tidak ada satu pun kode klien yang membacanya lagi (sudah diperiksa dengan
grep). Kalau ada yang kembali membacanya, itu hampir pasti bug: nilainya
default `menunggu` untuk **semua** akun baru, termasuk pembeli biasa yang
tidak pernah mengaku alumni.

### Akun institusi (`is_institusi`)

Menandai akun yang **bukan alumni perorangan** — toko resmi, panitia, dan
sejenisnya. Akun seperti ini dikecualikan dari:

- **Direktori alumni** (`/alumni`) — sudah disaring di view `alumni_publik`,
  **jangan menyaring lagi di klien**
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

Untuk data yang datang dari `alumni_publik` **tidak perlu** meneruskan
`is_institusi` ke `BadgeAngkatan`: akun institusi tidak punya baris di view
itu sama sekali, jadi angkatannya sudah pasti kosong. Prop `institusi` masih
ada dan tetap dipakai untuk data yang dibaca langsung dari `users`. Di konteks
toko resmi, gantinya adalah lencana OFFICIAL dari
[BadgeOfficial](app/components/BadgeOfficial.tsx).

### `pengguna_publik` (VIEW) — identitas siapa pun

View baca-saja berisi identitas **semua akun aktif**, alumni maupun bukan.

`id` · `nama` · `avatar_url` · `foto_url` · `is_institusi` ·
`alumni_terverifikasi` bool

```sql
WHERE nonaktif_at IS NULL
```

`alumni_terverifikasi` adalah `status_alumni = 'alumni'` yang sudah dihitung
di view, jadi klien tidak perlu tahu kosakata statusnya sama sekali —
langsung diteruskan ke `BadgeVerifikasi`.

**Ini yang dipakai setiap kali sebuah nama muncul di layar**, karena sejak
pembeli boleh siapa saja, lawan bicara di chat dan penulis ulasan belum tentu
alumni. Sebelum view ini ada, mereka tampil sebagai kata "Pengguna" tanpa nama.

Yang memakainya sekarang: [chat](app/chat/page.tsx) dan
[detail percakapan](app/chat/[id]/page.tsx), header
[halaman toko](app/toko/[id]/page.tsx) beserta metadata-nya, dan
`nama_reviewer` di [ReviewSection](app/components/ReviewSection.tsx).

### `alumni_publik` (VIEW) — khusus urusan alumni

**Dua view ini berbeda tujuan dan tidak saling menggantikan.** Yang di atas
menjawab "siapa orang ini"; yang ini menjawab "apa dia alumni, dan angkatan
berapa". Pilihannya sederhana:

| Butuh | Pakai |
|---|---|
| nama, avatar, lencana terverifikasi | `pengguna_publik` |
| angkatan, isi direktori `/alumni` | `alumni_publik` |
| keduanya sekaligus (mis. header toko) | dua query, gabung di JavaScript |

`angkatan` **hanya ada di `alumni_publik`**, dan itu disengaja: angkatan cuma
bermakna untuk alumni, jadi tidak ada gunanya diekspos di view identitas umum.

View baca-saja berisi kolom `users` yang aman dilihat siapa pun, termasuk
pengunjung yang belum login.

`id` · `nama` · `angkatan` · `avatar_url` · `foto_url` · `is_seller` ·
`created_at`

**View-nya menyaring sendiri**, dan ini yang paling penting soal cara pakainya:

```sql
WHERE status_alumni = 'alumni' AND nonaktif_at IS NULL AND NOT is_institusi
```

Akibatnya, tiga hal:

- **Ada barisnya di sini = alumni terverifikasi.** Itu sebabnya
  `BadgeVerifikasi` cukup diberi `alumni={Boolean(baris)}` — tidak perlu kolom
  status, dan kolomnya memang sudah tidak ada
- **Jangan menyaring lagi di klien.** `.eq('is_institusi', false)` akan gagal
  karena kolomnya sudah tidak ada di view, dan menyaring dua kali di dua
  tempat berbeda hanya menunggu salah satunya ketinggalan saat aturannya
  berubah
- **Yang tidak punya baris bukan keadaan salah.** Pembeli biasa, akun
  institusi, akun nonaktif — semuanya wajar tidak ada di sini. Untuk lookup
  satu orang pakai `.maybeSingle()`, bukan `.single()`; `.single()` akan
  melempar error untuk keadaan yang normal

Kalau yang dibutuhkan cuma nama atau lencana, **jangan pakai view ini** —
ambil dari `pengguna_publik`, yang memuat semua akun aktif. Menyimpulkan
"tidak ada barisnya berarti bukan alumni" masih benar, tapi menyimpulkan
"tidak ada barisnya berarti tidak punya nama" itu yang dulu melahirkan kata
"Pengguna" tanpa nama di chat.

Cara pakainya sama seperti tabel biasa:
`supabase.from('alumni_publik').select('id, nama, angkatan')`

Dua hal lagi:

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
  PRODUK di hero beranda, dan tidak ikut section Produk Terbaru — semuanya
  menyaring dengan `toko!inner(...)` + `.eq('toko.is_official', false)`
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

#### PO adalah status barang, bukan kategori

Ini keputusan bentuk yang menentukan segalanya di bawahnya. Penjual memilih
**Ready Stock** atau **Pre-Order** saat memasang produk — itu pernyataan tentang
barangnya, bukan fitur yang diaktifkan.

Konsekuensinya: produk PO **tidak punya halaman atau section tersendiri**, dan
itu disengaja. Penjelajahan terjadi di tempat orang memang mencari barang —
`/produk`, `/toko/[id]`, dan pencarian — dan produk PO muncul berdampingan
dengan produk biasa di sana, cukup dibedakan penandanya.

**Jangan membangun ulang halaman `/preorder` atau komponen `SectionPreorder`.**
Keduanya pernah ada dan sengaja dibongkar (commit `c699b18`): memberi PO rak
sendiri membuatnya terbaca seperti kategori terpisah, padahal statusnya melekat
pada produk, bukan menggantikan tempat produk itu berada.

Yang tetap ada dan memang dipakai: [BadgePreorder](app/components/BadgePreorder.tsx),
[EditorPreorder](app/components/EditorPreorder.tsx), [RekapPO](app/components/RekapPO.tsx),
[useHitungMundur](app/hooks/useHitungMundur.ts), [lib/preorder.ts](lib/preorder.ts),
dan panel PO di halaman detail produk.

#### Memilih status di form produk

Radio dua pilihan setara, **bukan** saklar — lihat
[EditorPreorder](app/components/EditorPreorder.tsx):

```ts
type StatusBarang = '' | 'ready' | 'preorder'   // FormPO.status
```

- **Tidak ada nilai awal.** String kosong berarti penjual belum memilih, dan
  `validasiFormPO()` menolaknya sebelum apa pun disimpan. Tanpa ini akan ada
  produk berstatus ready hanya karena penjual tidak pernah memikirkannya
- Produk yang sudah ada selalu punya status jelas, karena `produk.is_preorder`
  NOT NULL — `formPODari()` memetakannya ke `'ready'` / `'preorder'`
- **Pemilih status diletakkan DI ATAS kolom stok** di form tambah maupun form
  edit dashboard. Kolom stok muncul-hilang mengikuti pilihan, jadi kontrolnya
  harus berada di atas yang dikendalikan — kalau dibalik, form terlihat
  kehilangan kolom tanpa sebab yang terlihat

#### Janji kirim

`po_janji_kirim` bukan sekadar keterangan. Tanggal itu janji ke pembeli dan akan
dipakai sistem untuk membatalkan pesanan yang telat serta mengembalikan dana —
karena itu tipenya `date` dan bukan teks bebas, supaya bisa dibandingkan.

#### Aturan tampilan di semua permukaan

- Lencana ungu PRE-ORDER dari [BadgePreorder](app/components/BadgePreorder.tsx).
  `bentuk="pita"` di kartu produk, lencana biasa di tempat sempit
- **Jangan pernah menampilkan angka stok produk PO.** `trg_kurangi_stok` sengaja
  melewati produk PO, jadi stoknya selalu 0 dan akan terbaca "habis" padahal
  PO-nya sedang buka
- **Kartu produk** (`/produk`, `/toko/[id]`, Produk Terbaru di beranda,
  pencarian): teks `"Pre-Order"` menggantikan `"N terjual"`. Di kartu tidak ada
  panel yang menjelaskan apa pun, jadi katanya masih perlu di sana
- **Detail produk**: slot yang sama diisi `"N dipesan"` dari `terkumpul`, dan
  dikosongkan kalau masih nol. Kata "Pre-Order" tidak diulang di situ karena
  lencananya ada tepat di atas dan panel PO tepat di bawahnya
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
`alamat_kirim` · `catatan` · `diproses_at` · `dikirim_at` · `selesai_at` ·
`dibatalkan_at` · `alasan_batal` · `po_batas_kirim` **date** ·
`batas_kirim` timestamptz · `created_at` · `updated_at`

`produk_id` masih ada sebagai sisa skema lama — **jangan dipakai**, item pesanan
sekarang ada di `pesanan_items`.

Dua kolom tenggat, jangan tertukar:

- **`po_batas_kirim`** (date) diisi `create_pesanan` dengan janji kirim
  **terjauh** di antara item pesanan itu. Ini bahan mentah, bukan tenggat aktif
- **`batas_kirim`** (timestamptz) itu tenggat yang benar-benar dipakai tugas
  harian. Diisi saat pembayaran dikonfirmasi, bukan saat pesanan dibuat —
  hitungannya baru bermakna setelah uangnya masuk

Semua cap waktu (`paid_at`, `diproses_at`, `dikirim_at`, `selesai_at`,
`dibatalkan_at`) diisi RPC atau trigger. **Jangan pernah menulisnya dari
client.**

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
`po_maks` · `po_janji_kirim` date · `sedang_buka` bool · `terkumpul` int

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

View ini **tidak memuat harga maupun foto**. Kalau butuh keduanya, query view
dulu, kumpulkan `produk_id`, lalu sekali ke `produk` dengan `.in('id', ids)` dan
`toko!inner`, gabung di JavaScript.

Yang membacanya sekarang cuma dua, dan keduanya sudah punya baris `produk`-nya
sendiri sehingga tidak perlu penggabungan itu:

- [detail produk](app/produk/[id]/page.tsx) — `terkumpul` dan `sedang_buka`
  untuk panel PO
- [dashboard penjual](app/dashboard/page.tsx) → [RekapPO](app/components/RekapPO.tsx)
  — sekali query untuk seluruh produk toko, disaring `.eq('toko_id', ...)`

### `refund`
Antrean pengembalian dana. Barisnya **dibuat otomatis** saat pesanan yang sudah
lunas dibatalkan — tidak pernah dari client.

`id`✳ · `pesanan_id`✳ → pesanan.id · `nominal`✳ int (CHECK > 0) · `alasan`✳ text ·
`status`✳ text (default `menunggu`) · `metode` · `bukti_url` · `catatan` ·
`diproses_oleh` uuid → users.id · `created_at`✳ · `selesai_at`

```
status refund: menunggu | diproses | selesai | gagal
```

- `alasan` **NOT NULL**, dan isinya alasan pembatalan yang diketik penjual atau
  pembeli. Karena itu pembatalan di UI wajib meminta alasan — tanpa itu
  insert-nya gagal dan seluruh pembatalan ikut batal
- Index unik parsial `uq_refund_terbuka` pada `(pesanan_id) WHERE status IN
  ('menunggu','diproses')` menjaga satu pesanan tidak punya dua refund terbuka
  sekaligus. RPC pembatalan memakai `ON CONFLICT DO NOTHING`, jadi memanggilnya
  dua kali tidak menggandakan antrean
- RLS menyala. Ada **dua policy dan keduanya SELECT**: `refund_baca_pembeli` dan
  `refund_baca_penjual`. **Tidak ada policy tulis sama sekali** — jangan mencoba
  INSERT/UPDATE dari client, termasuk dari halaman admin nanti; itu harus lewat
  RPC baru
- Grant untuk `anon` dan `authenticated` hanya SELECT — sudah diverifikasi

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

### Unggah bukti alumni DIMATIKAN SEMENTARA (sejak 14 Agustus 2026)

Keputusan produk, bukan pembersihan kode. Yang berubah hanya tampilan dan
alur — **kolom `users.bukti_alumni_url` dan bucket `bukti-alumni` sengaja
dipertahankan utuh**, beserta policy-nya, supaya fitur ini bisa dinyalakan
lagi tanpa migrasi apa pun.

Keadaan sekarang:

- Halaman [/verifikasi](app/verifikasi/page.tsx) tidak lagi punya kolom unggah.
  Yang dikirim pendaftar cuma `catatan_pendaftar`
- `uploadBuktiAlumni()` di [lib/buktiAlumni.ts](lib/buktiAlumni.ts) **tidak
  dipanggil dari mana pun**. Itu disengaja — jangan dihapus karena terlihat
  tak terpakai. `urlBukti()` masih dipakai panel admin
- Panel admin **tidak menampilkan peringatan "belum mengunggah bukti"**.
  Selama unggahnya mati, peringatan itu menyala untuk hampir semua orang, dan
  peringatan yang selalu menyala akan diabaikan — termasuk nanti saat ada
  peringatan yang benar-benar penting. Tautan buktinya tetap muncul kalau
  `bukti_alumni_url` memang terisi dari data lama
- **Verifikasi untuk sekarang bersandar pada penilaian admin** atas nama dan
  angkatan pendaftar, dibantu catatan yang ditulisnya

Kalau dinyalakan lagi: kembalikan kolom unggah di `/verifikasi`, dan barulah
peringatan "belum mengunggah" di panel admin punya arti kembali.

## Kosakata Status

Dijaga CHECK constraint di database. Nilai di luar daftar ini **ditolak**.

```
status:         menunggu | dibayar | diproses | dikirim | selesai | dibatalkan
payment_status: menunggu | lunas | gagal | kadaluarsa | refund
```

Keduanya default `menunggu`. Jangan pakai `pending`, `dikonfirmasi`, `paid`, atau
variasi Inggris lain.

## Mesin Status Pesanan

**Status pesanan hanya berpindah lewat RPC.** Tidak pernah lewat UPDATE
langsung dari client — bukan karena RLS melarang (policy UPDATE-nya masih ada
untuk pihak terkait), tapi karena semua aturan siapa-boleh-apa, pengisian cap
waktu, tenggat, dan antrean refund ada di dalam fungsi. UPDATE langsung akan
melewati semuanya dan meninggalkan baris setengah jadi.

Sejak 14 Agustus 2026 ini **bukan lagi konvensi, tapi dijaga database** —
lihat [Trigger penjaga](#trigger-penjaga-trg_jaga_status_pesanan) di bawah.

Perpindahan yang sah:

| Dari | Ke | Oleh | Syarat |
|---|---|---|---|
| `menunggu` | `dibayar` | penjual | — |
| `dibayar` | `diproses` | penjual | — |
| `dibayar` / `diproses` | `dikirim` | penjual | **nomor resi wajib** |
| `dikirim` | `selesai` | **pembeli** | — |
| `menunggu` / `dibayar` / `diproses` | `dibatalkan` | pembeli atau penjual | alasan wajib |

Dua hal yang mudah salah dikira:

- `diproses` **boleh dilewati** — penjual bisa langsung mengirim setelah lunas
- `selesai` **tidak bisa dilakukan penjual**. Hanya pembeli, atau tugas harian
- Pesanan yang sudah `dikirim` **tidak bisa dibatalkan** siapa pun; barang yang
  terlanjur jalan itu urusan komplain, bukan pembatalan

Cerminannya di klien ada di `aksiPenjual()` dan `bisaDiterimaPembeli()` di
[lib/statusPesanan.ts](lib/statusPesanan.ts). Itu **hanya** untuk menyembunyikan
tombol yang pasti ditolak — bukan sumber kebenaran, dan tidak boleh dipakai
untuk menyimpulkan apa pun yang tidak ditanyakan ke server.

### Trigger penjaga `trg_jaga_status_pesanan`

BEFORE UPDATE di `pesanan`. Menolak **semua** UPDATE langsung yang menyentuh
kolom di bawah, dengan error:

> Status pesanan hanya boleh diubah lewat ubah_status_pesanan() atau
> batalkan_pesanan(), bukan UPDATE langsung

Kolom yang dikunci — sebelas, semuanya milik mesin status:

```
status · payment_status · no_resi · kurir · batas_kirim
paid_at · diproses_at · dikirim_at · selesai_at · dibatalkan_at · alasan_batal
```

Kolom lain di `pesanan` tetap bebas di-UPDATE seperti biasa (`catatan`,
`alamat_kirim`, `penerima_nama`, dan seterusnya) — penjaganya membandingkan
`IS DISTINCT FROM` per kolom, jadi yang tidak berubah tidak ikut tertahan.

**Jangan pernah menulis kolom-kolom itu dengan `.update()` dari aplikasi.**
Bukan "sebaiknya jangan" — permintaannya akan gagal. Kalau butuh perpindahan
status baru, tambahkan aturannya di dalam `ubah_status_pesanan`, jangan cari
jalan memutar.

Kenapa perlu, padahal sudah ada aturan tertulis: RLS **mengizinkan** penjual
meng-UPDATE baris pesanannya sendiri. Jadi satu tempat saja di UI yang menulis
status langsung sudah cukup untuk melewati seluruh mesin status — lompat ke
`dikirim` tanpa resi, tanpa `paid_at`, tanpa `batas_kirim`. Dan pesanan dengan
`batas_kirim` NULL tidak akan pernah disentuh cron, sehingga janji "kalau telat,
uang kembali" diam-diam batal untuk pesanan itu tanpa ada yang tahu.

#### Pola penanda transaksi — sekarang dipakai DUA trigger

Yang membedakan RPC resmi dari UPDATE biasa adalah penanda transaksi
`superfive.lewat_rpc`, dipasang **di dalam** RPC dengan:

```sql
perform set_config('superfive.lewat_rpc', 'ya', true);  -- true = is_local
```

Dua sifat yang membuat pola ini aman:

- `is_local = true` berarti penandanya **hilang sendiri saat transaksi
  selesai**, sukses maupun gagal. Tidak ada yang perlu membersihkannya, dan
  tidak ada sisa yang bocor ke permintaan berikutnya di koneksi yang sama
- **Tidak bisa dipasang dari PostgREST**, karena setiap permintaan REST
  berjalan di transaksinya sendiri. Client tidak punya cara memanggil
  `set_config` lalu meng-UPDATE di transaksi yang sama

Penanda yang sama sekarang dibaca **dua trigger**, bukan satu:

| Trigger | Tabel |
|---|---|
| `jaga_status_pesanan` | `pesanan` |
| `jaga_field_sensitif` | `users` |

Yang memasang penanda ini, per hari ini: `ubah_status_pesanan`,
`batalkan_pesanan`, `batalkan_pesanan_sistem`, `jalankan_tugas_pesanan`,
`ajukan_alumni`, `ajukan_jadi_penjual`, dan `minta_data_ulang`. Daftar
mutakhirnya selalu bisa dibaca ulang:

```sql
select proname from pg_proc where pronamespace = 'public'::regnamespace
  and pg_get_functiondef(oid) like '%lewat_rpc%' order by proname;
```

**SETIAP RPC baru yang menulis kolom terjaga WAJIB memasang penanda ini.**
Kalau lupa, tidak ada error yang muncul — `jaga_field_sensitif` gagalnya
diam-diam, jadi RPC-nya akan tampak sukses sementara kolomnya sama sekali
tidak berubah. Ini kegagalan yang paling mahal dilacak di project ini, dan
satu baris `perform set_config(...)` di awal fungsi sudah cukup mencegahnya.

Ada satu jalur lain yang juga lolos: RPC khusus admin. `jaga_field_sensitif`
melewatkan siapa pun yang `is_admin()`, jadi `verifikasi_alumni`,
`putuskan_penjual`, `nonaktifkan_user`, dan `aktifkan_user` bekerja **tanpa**
penanda. Itu berjalan, tapi jangan dijadikan pola untuk RPC baru: begitu
sebuah fungsi suatu saat boleh dipanggil non-admin, ia akan mati diam-diam.
Pasang penandanya sejak awal.

`create_pesanan` tidak perlu — trigger `pesanan` yang dijaga BEFORE UPDATE,
sedangkan pembuatan pesanan INSERT.

Kalau nanti ada tabel lain yang butuh penjagaan serupa, ikuti pola yang sama:
penanda transaksi + trigger, bukan flag di parameter RPC (alasannya di
[Kewenangan sistem harus dari hak akses](#kewenangan-sistem-harus-dari-hak-akses-bukan-dari-argumen)).
Soal trigger-nya melempar error atau diam-diam, lihat perbandingannya di
bawah — pilihannya bergantung siapa yang sedang ditahan.

#### Kenapa melempar error, bukan diam-diam seperti `jaga_field_sensitif`

Dua penjaga di project ini sengaja berperilaku berbeda:

| Penjaga | Kelakuan | Kenapa |
|---|---|---|
| `jaga_field_sensitif` (`users`) | kembalikan nilai lama **diam-diam** | yang ditahan adalah penyerang yang mencoba menaikkan `role` sendiri. Gagal tanpa pesan tidak memberi petunjuk apa pun soal cara kerja penjagaannya |
| `jaga_status_pesanan` (`pesanan`) | **lempar error** terang-terangan | yang ditahan adalah pengembang sendiri yang salah menulis kode. Kegagalan diam-diam di sini akan menghasilkan pesanan setengah jadi yang baru ketahuan berminggu-minggu kemudian, dan sangat sulit dilacak |

Jangan menyamakan keduanya "supaya konsisten" — perbedaannya justru intinya.

### Tenggat otomatis

Tiga tenggat dijalankan tugas harian, bukan oleh aplikasi:

| Keadaan | Tenggat | Akibat |
|---|---|---|
| `menunggu` belum dibayar | 24 jam sejak `created_at` | dibatalkan, **tanpa** refund — tidak ada uang masuk |
| `dibayar` / `diproses` belum dikirim | lewat `batas_kirim` | dibatalkan **+ antrean refund** |
| `dikirim` tanpa konfirmasi pembeli | 6 hari sejak `dikirim_at` | `selesai` otomatis |

`batas_kirim` diisi `ubah_status_pesanan` saat pembayaran dikonfirmasi:

- pesanan PO → `po_batas_kirim + 1 hari`, dipatok **akhir hari WIB**
  (`23:59:59 Asia/Jakarta`). Satu hari itu tenggang, supaya janji kirim
  tanggal X tidak lewat tepat pada dini hari tanggal X
- pesanan barang ready → `now() + 3 hari`

Yang tetap 6 hari untuk konfirmasi pembeli juga ada di klien sebagai
`HARI_SELESAI_OTOMATIS`; kalau angkanya diubah di database, ubah di sana juga.

### Tenggat kirim longgar — ini disengaja

**Tenggat kirim tidak berlaku pada detiknya, dan itu memang dikehendaki.**
Bukan efek samping dari cron yang jalan sekali sehari — jangan "diperbaiki".

Tugas harian jalan pukul 05:05 WIB, jadi penjual yang `batas_kirim`-nya jatuh
tengah malam masih bisa menyelamatkan pesanannya sampai pagi. Alasannya
memaafkan keterlambatan kecil: penjual rumahan yang baru selesai mengemas lewat
tengah malam tidak kehilangan seluruh pesanannya padahal barangnya sudah jadi.

Tenggangnya berhenti di **`batas_kirim + 30 jam`**. Lewat dari itu
`ubah_status_pesanan` menolak `'dikirim'` dengan pesan *"Batas waktu pengiriman
sudah terlampaui jauh. Pesanan ini akan dibatalkan sistem."* Batas itu ada
supaya kalau cron pernah gagal atau dimatikan, pesanan yang telat berhari-hari
tidak ikut lolos begitu cron hidup lagi.

Konsekuensinya untuk UI: **tampilkan tenggat efektif, bukan `batas_kirim`
mentah.** Penjual yang melihat "batas 23:59" akan panik padahal masih punya
lima jam. Hitungannya ada di `tenggatEfektif()` di
[lib/statusPesanan.ts](lib/statusPesanan.ts) — jangan disebar ulang.

Satu jebakan di situ: tenggat efektif **bukan selalu "hari berikutnya"**. Kalau
`batas_kirim` jatuh sebelum pukul 05:05 WIB, cron hari itu juga yang
menyapunya. Pesanan PO memang selalu 23:59:59 WIB sehingga selalu ke besok,
tapi pesanan barang ready memakai `now() + 3 hari` dan jamnya bisa berapa saja
— menganggapnya selalu besok akan menjanjikan 24 jam yang tidak ada.

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

### `ubah_status_pesanan` — satu-satunya pintu perpindahan status

```ts
const { error } = await supabase.rpc('ubah_status_pesanan', {
  p_pesanan_id:  id,
  p_status_baru: 'dikirim',
  p_no_resi:     resi,          // wajib saat 'dikirim', selain itu null
  p_kurir:       kurir ?? null, // opsional
})
// data: { ok: true, status: '...' }
```

Semua aturan di tabel [Mesin Status Pesanan](#mesin-status-pesanan) sudah
divalidasi di dalamnya, termasuk siapa yang berhak. **UI tidak perlu dan tidak
boleh mengulang validasinya** — tampilkan `error.message` apa adanya:

- `Harus login` · `Pesanan tidak ditemukan` · `Kamu tidak berhak mengubah pesanan ini`
- `Hanya penjual yang bisa menandai pembayaran diterima`
- `Pesanan ini sudah tidak menunggu pembayaran`
- `Hanya penjual yang bisa memproses pesanan` · `Pesanan harus lunas dulu sebelum diproses`
- `Hanya penjual yang bisa mengirim pesanan` · `Pesanan belum siap dikirim`
- `Nomor resi wajib diisi saat menandai pesanan dikirim`
- `Batas waktu pengiriman sudah terlampaui jauh. Pesanan ini akan dibatalkan sistem.`
  — muncul kalau lewat `batas_kirim + 30 jam`, lihat
  [Tenggat kirim longgar](#tenggat-kirim-longgar--ini-disengaja)
- `Hanya pembeli yang bisa menyelesaikan pesanan` · `Pesanan belum dikirim`

Kembaliannya cuma `{ok, status}` — cap waktu dan `batas_kirim` diisi di dalam
fungsi. Kalau UI perlu nilainya, **baca ulang barisnya**, jangan menebak.

### `batalkan_pesanan` — pembeli atau penjual

```ts
const { error } = await supabase.rpc('batalkan_pesanan', {
  p_pesanan_id: id,
  p_alasan:     alasan,   // wajib, ikut tersimpan di baris refund
})
// data: { ok: true, refund: boolean }
```

Kalau `payment_status` sudah `lunas`, fungsi ini sekalian mengubahnya jadi
`refund` dan membuat baris di tabel `refund`. Karena `refund.alasan` NOT NULL,
alasan kosong membuat seluruh pembatalan gagal — UI wajib memintanya.

**Hanya dua parameter.** Versi lama sempat punya `p_oleh_sistem`; itu sudah
dibuang, lihat catatannya di aturan hak akses di bawah.

### Fungsi yang TIDAK boleh dipanggil dari aplikasi

- `batalkan_pesanan_sistem(uuid, text)` — jalur pembatalan oleh sistem
- `jalankan_tugas_pesanan()` — tugas harian

Keduanya sengaja **tidak diberi EXECUTE ke `anon` maupun `authenticated`**.
Jangan coba memanggilnya, dan jangan menambahkan grant supaya "bisa dites dari
UI" — jalankan lewat SQL editor sebagai `postgres` kalau perlu.

## Tugas Terjadwal

`pg_cron` aktif. Satu job:

| Job | Jadwal | Perintah |
|---|---|---|
| `tugas-pesanan-harian` | `5 22 * * *` UTC = **05:05 WIB** tiap hari | `select public.jalankan_tugas_pesanan();` |

Fungsinya mengerjakan tiga tenggat di tabel [Tenggat otomatis](#tenggat-otomatis)
dan mengembalikan ringkasan `{waktu, kadaluarsa, telat_kirim, selesai_otomatis}`.

Karena tugasnya jalan sekali sehari, tenggat tidak berlaku pada detiknya —
itu disengaja, lihat [Tenggat kirim longgar](#tenggat-kirim-longgar--ini-disengaja).
Dua akibatnya untuk UI:

- **Jangan menampilkan status seolah-olah sudah berubah** hanya karena jam
  klien sudah lewat tenggat. Baca statusnya dari database
- Untuk tenggat kirim, tampilkan hasil `tenggatEfektif()`, bukan `batas_kirim`

### `ajukan_alumni` — pengguna sendiri

Mengaku alumni. Dipanggil dari [/verifikasi](app/verifikasi/page.tsx) dan
sekali lagi tepat setelah pendaftaran, kalau pendaftarnya memilih "Saya alumni
SMPN 5 Bandung".

```ts
const { error } = await supabase.rpc('ajukan_alumni', {
  p_angkatan: 2015,
  p_catatan:  catatan || null,   // opsional
})
// data: { ok: true, status: 'menunggu' }
```

Menolak kalau sudah `alumni`, sudah `menunggu`, akunnya nonaktif, atau
angkatannya tidak masuk akal (< 1950 atau melebihi tahun berjalan). Kolom
`angkatan` diisi RPC ini, jadi UI tidak perlu menulisnya terpisah.

### `ajukan_jadi_penjual` — pengguna sendiri

Pintu berjualan. Dipanggil dari [/jual](app/jual/page.tsx).

```ts
const { error } = await supabase.rpc('ajukan_jadi_penjual', {
  p_alamat:         alamat,        // alamat asal pengiriman
  p_bank_nama:      'BCA',
  p_bank_rekening:  '1234567890',
  p_bank_atas_nama: nama,
  p_setuju_aturan:  true,
})
// data: { ok: true, status: 'menunggu' }
```

**Syaratnya `status_alumni = 'alumni'`** — kalau bukan, fungsinya melempar
"Kamu harus terverifikasi sebagai alumni dulu sebelum bisa berjualan". Karena
itu UI tidak menampilkan formulirnya sama sekali untuk yang belum alumni:
percuma mengisi panjang lebar lalu ditolak di detik terakhir.

Juga menolak yang sudah `aktif`, sedang `menunggu`, atau `dibekukan`. Yang
`ditolak` boleh mengirim ulang.

### `putuskan_penjual` — hanya admin

```ts
const { data, error } = await supabase.rpc('putuskan_penjual', {
  p_user_id:   id,
  p_keputusan: 'aktif',   // 'aktif' | 'ditolak' | 'dibekukan'
  p_alasan:    null,      // wajib untuk 'ditolak' dan 'dibekukan'
})
// data: { ok: true, nama, status }
```

Ikut menyetel `is_seller`. Menolak mengaktifkan yang bukan alumni dan bukan
akun institusi. Dipakai [/admin/penjual](app/admin/penjual/page.tsx).

### `verifikasi_alumni` — hanya admin

Menyetujui atau menolak pendaftar alumni. Jangan menulis `status_alumni` atau
`status_verifikasi` langsung ke tabel — trigger `jaga_field_sensitif` akan
mengabaikannya tanpa error.

```ts
const { data, error } = await supabase.rpc('verifikasi_alumni', {
  p_user_id: id,
  p_setujui: true,      // false = tolak
  p_alasan:  null,      // wajib diisi kalau menolak
})
// data: { nama, status }   status: 'alumni' | 'ditolak'
```

Menulis **kedua** kolom status sekaligus (`status_alumni` dan
`status_verifikasi` lama). Menolak kalau sasarannya diri sendiri, kalau
sasarannya sesama admin dan keputusannya menolak, atau kalau angkatannya masih
kosong untuk akun non-institusi.

### `minta_data_ulang` — hanya admin

Menarik keputusan yang sudah dibuat dan mengembalikan pendaftar ke antrean
`menunggu` dengan `catatan_admin`, untuk keraguan administratif kecil yang
dulu memaksa admin menolak. Menyetel **kedua sumbu** (`status_alumni` dan
`status_verifikasi`) sekaligus, dan mengosongkan jejak putusan sebelumnya.

```ts
await supabase.rpc('minta_data_ulang', { p_user_id: id, p_catatan: catatan })
// data: { ok: true, nama, status_sebelumnya }
```

Catatannya dibaca pendaftar di [/verifikasi](app/verifikasi/page.tsx), dan
tombolnya ada di [/admin/verifikasi](app/admin/verifikasi/page.tsx).

Dua penolakan yang perlu diketahui, keduanya sudah dicegah UI dengan
menyembunyikan tombolnya:

- `Pendaftar ini memang sedang menunggu diperiksa` — statusnya `menunggu`
- `Akun ini tidak pernah mengajukan diri sebagai alumni` — statusnya `umum`.
  Mereka pembeli biasa dan memang tidak punya apa pun untuk dilengkapi; panel
  verifikasi pun tidak menampilkan mereka sama sekali

### `nonaktifkan_user` / `aktifkan_user` — hanya admin

Menonaktifkan akun (`nonaktif_at`, `alasan_nonaktif`) dan membuka kembali.
Akun nonaktif hilang dari `alumni_publik` dan `penjual_aktif()` ikut
mengembalikan false, jadi tokonya turun. Menolak menonaktifkan diri sendiri
dan admin aktif terakhir. Belum ada UI yang memanggil keduanya.

### `is_admin()` dan `penjual_aktif(uuid)` — helper policy

Dipakai **di dalam policy**, bukan dari aplikasi. Keduanya `SECURITY DEFINER`
dan **sengaja punya EXECUTE untuk `anon`** — alasannya di
[Temuan RLS](#temuan-rls-yang-akan-berulang). Di client cukup baca
`users.role` milik sendiri.

## Trigger Otomatis

Jangan tulis manual hal-hal di bawah ini dari aplikasi — sudah ditangani database.

| Trigger | Kapan | Yang dilakukan |
|---|---|---|
| `trg_jaga_status_pesanan` | BEFORE UPDATE `pesanan` | **Melempar error** kalau UPDATE langsung menyentuh kolom mesin status. Lihat [Trigger penjaga](#trigger-penjaga-trg_jaga_status_pesanan) |
| `trg_nomor_pesanan` | BEFORE INSERT `pesanan` | Isi `nomor_pesanan` format `SF-YYMM-00001`. Karena BEFORE, `.select('nomor_pesanan')` langsung dapat nilainya |
| `trg_pesanan_updated` | BEFORE UPDATE `pesanan` | Isi `updated_at` |
| `trg_tambah_terjual` | BEFORE UPDATE `pesanan` | Saat status jadi `selesai`: tambah `produk.terjual` dan isi `selesai_at` |
| `trg_kurangi_stok` | AFTER INSERT `pesanan_items` | Kurangi `produk_varian.stok` (kalau ada varian) dan `produk.stok`, minimum 0. **Produk PO dilewati sepenuhnya** |
| `trg_kembalikan_stok` | BEFORE UPDATE `pesanan` | Saat status jadi `dibatalkan`: kembalikan stok varian dan produk. **Produk PO dilewati sepenuhnya.** Lihat [Pengembalian stok](#pengembalian-stok-trg_kembalikan_stok) |
| `trg_refresh_rating` | AFTER INSERT/UPDATE/DELETE `reviews` | Hitung ulang rating produk |
| `trg_jaga_toko_official` | BEFORE INSERT/UPDATE `toko` | Kembalikan `is_official` ke false / nilai lama kalau yang mengubah bukan admin |
| `trg_jaga_field_sensitif` | BEFORE UPDATE `users` | Kembalikan 22 kolom kewenangan (`role`, `status_alumni`, `status_penjual`, dan seterusnya) ke nilai lama **diam-diam**, kecuali admin atau ada penanda `superfive.lewat_rpc`. Daftar kolomnya baca dari database, lihat [Keduanya dijaga](#keduanya-dijaga-jaga_field_sensitif) |

`trg_kurangi_stok` melewati produk PO dengan sengaja — itu sebabnya stok produk
PO selalu 0 dan **tidak boleh ditampilkan** sebagai angka di UI.

Urutan trigger BEFORE UPDATE di `pesanan` mengikuti abjad, jadi
`trg_jaga_status_pesanan` selalu jalan lebih dulu. Itu kebetulan yang
menguntungkan tapi bukan sesuatu yang perlu diandalkan: `trg_tambah_terjual`
mengisi `NEW.selesai_at` **setelah** penjaga lewat, dan itu aman karena
penjaganya sudah dilewatkan oleh penanda `superfive.lewat_rpc` — bukan karena
urutannya.

### Pengembalian stok `trg_kembalikan_stok`

Cermin dari `trg_kurangi_stok`, arah sebaliknya. BEFORE UPDATE di `pesanan`;
begitu `status` berubah **menjadi** `dibatalkan`, `qty` tiap item dikembalikan
ke `produk_varian.stok` (kalau itemnya bervarian) dan ke `produk.stok`.

Tiga hal yang menentukan bentuknya:

- **Produk PO dilewati sepenuhnya**, sama persis seperti `trg_kurangi_stok`.
  Stok produk PO memang tidak pernah dipotong, jadi mengembalikannya justru
  akan menciptakan stok dari udara. Dua trigger ini harus selalu sepakat soal
  PO — kalau salah satu diubah, ubah keduanya
- **Hanya jalan pada perpindahan masuk.** Kalau `OLD.status` sudah
  `dibatalkan`, trigger langsung keluar. Jadi UPDATE lain pada pesanan yang
  sudah batal tidak menggandakan stok
- **Dipasang di tabel, bukan di dalam RPC.** Ini yang penting: pembatalan
  datang dari tiga arah — `batalkan_pesanan` (pembeli maupun penjual),
  `batalkan_pesanan_sistem`, dan `jalankan_tugas_pesanan` yang membatalkan
  pesanan kadaluarsa dan telat kirim. Menaruh logikanya di tabel membuat
  ketiganya tercakup sekaligus, dan jalur pembatalan baru yang ditambahkan
  nanti ikut tercakup tanpa harus diingat

Sebelum trigger ini ada, **tidak ada apa pun yang mengembalikan stok**:
`trg_kurangi_stok` memotong saat pesanan dibuat dan pembatalan tidak
mengembalikannya, sehingga setiap pesanan batal memakan stok secara permanen.

Konsekuensinya untuk UI: kalimat seperti "stoknya kembali tersedia" di panel
pembatalan [/pesanan](app/pesanan/page.tsx) sekarang memang benar — sebelumnya
tidak.

## Ringkasan RLS

- `users` — SELECT/UPDATE hanya pemilik (`id = auth.uid()`), plus akses penuh
  untuk admin lewat `users_admin_all`. **Tidak ada akses publik.** Data alumni
  lain diambil dari view `alumni_publik`
- `produk` dan `toko` — SELECT publik **hanya kalau penjualnya aktif**:
  `penjual_aktif(seller_id) OR seller_id = auth.uid() OR is_admin()`. Jadi toko
  penjual yang dibekukan hilang dari etalase, tapi **pemiliknya sendiri tetap
  bisa melihatnya** — itu disengaja supaya dia bisa membenahi datanya
- `produk_varian` — SELECT terbuka penuh (`true`); yang menyembunyikan produknya
  adalah policy `produk`
- INSERT/UPDATE/DELETE ketiganya hanya pemilik toko
  (`toko.seller_id = auth.uid()`) atau admin. Untuk `produk_varian`
  kepemilikannya ditelusuri lewat `produk → toko`. `toko_insert_own` masih
  memeriksa `status_verifikasi = 'terverifikasi'` — sumbu **lama**, jadi pagar
  ini tidak setara dengan `status_penjual = 'aktif'` dan tidak boleh
  diandalkan sendirian, lihat [Dua sumbu verifikasi](#dua-sumbu-verifikasi)
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

Sudah diverifikasi: `alumni_publik`, `pengguna_publik`, `preorder_progress`,
dan tabel `refund` sama-sama hanya memberi SELECT ke `anon` dan
`authenticated`. Ketiga view itu juga `security_invoker = false`, sama
alasannya: tanpa itu `users` yang tertutup membuat hasilnya kosong.

Default privileges di project ini sudah dikunci, tapi tetap **verifikasi tiap
kali** membuat objek baru:

```sql
select grantee, privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='nama_objek'
  and grantee in ('anon','authenticated');
```

## ATURAN: Hak EXECUTE Fungsi Baru

Dua belas fungsi boleh dipanggil pengguna login:

```
create_pesanan · ubah_status_pesanan · batalkan_pesanan
ajukan_alumni · ajukan_jadi_penjual
verifikasi_alumni · putuskan_penjual · minta_data_ulang
nonaktifkan_user · aktifkan_user
is_admin · penjual_aktif
```

Dua di antaranya — **`is_admin` dan `penjual_aktif`** — juga punya EXECUTE
untuk `anon`, dan itu **wajib**, bukan kelalaian. Alasannya di
[Temuan RLS](#temuan-rls-yang-akan-berulang). Sisanya `anon_bisa = false`.

Semua fungsi lain — fungsi trigger, `batalkan_pesanan_sistem`, dan
`jalankan_tugas_pesanan` — tidak punya EXECUTE untuk `anon` maupun
`authenticated`. Sudah diverifikasi dengan `has_function_privilege`.

### `REVOKE ... FROM anon, authenticated` TIDAK CUKUP

Ini jebakan yang sudah memakan korban di project ini. Postgres memberi
`EXECUTE` ke **PUBLIC** untuk setiap fungsi baru, dan `anon` mewarisi lewat
PUBLIC. Mencabut dari `anon` dan `authenticated` saja tidak menyentuh hibah
PUBLIC itu, jadi fungsinya **tetap bisa dipanggil lewat REST** meski sudah
"dicabut".

Pola yang benar, dua langkah:

```sql
revoke all on function public.nama_fungsi(arg types) from public;
grant execute on function public.nama_fungsi(arg types) to authenticated;
```

Lalu **wajib verifikasi**, jangan percaya pada REVOKE saja:

```sql
select proname,
       has_function_privilege('anon', oid, 'EXECUTE') as anon_bisa,
       has_function_privilege('authenticated', oid, 'EXECUTE') as auth_bisa
from pg_proc where pronamespace = 'public'::regnamespace order by proname;
```

`anon_bisa` harus `false` untuk semua baris **kecuali `is_admin` dan
`penjual_aktif`**, yang memang perlu. Bisa juga dilihat dari `pg_proc.proacl`:
kalau di sana ada entri tanpa nama peran (`=X/postgres`), itu hibah PUBLIC yang
masih menempel.

### Kewenangan sistem harus dari hak akses, bukan dari argumen

`batalkan_pesanan` sempat punya parameter ketiga `p_oleh_sistem boolean`, dan
penjaganya berbunyi "kalau `p_oleh_sistem` true maka `auth.uid()` harus NULL".

Itu rapuh, dan bocor persis lewat celah PUBLIC di atas: `auth.uid()` juga NULL
untuk `anon`. Jadi pengunjung yang belum login memenuhi syarat "sistem" —
sakelar kewenangan yang dititipkan di parameter dilewati begitu saja.

Sekarang jalur sistem dipisah jadi fungsi tersendiri
(`batalkan_pesanan_sistem`) yang tidak diberi EXECUTE ke siapa pun. Yang
membedakan sistem dari pengguna adalah **hak akses**, bukan nilai argumen.
Kalau nanti ada jalur istimewa lain, ikuti pola yang sama: fungsi terpisah,
tanpa grant — jangan tambahkan flag.

## ATURAN: Uji Setiap Policy Baru sebagai `anon` dan `authenticated`

**Setiap policy baru wajib DIJALANKAN dengan `set local role anon` dan
`set local role authenticated`, bukan sekadar dibaca.** Policy yang terbaca
benar bisa berperilaku sama sekali lain tergantung siapa yang bertanya.

```sql
begin;
  set local role anon;
  select count(*) from public.produk;      -- pengunjung
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claims to '{"sub":"<uuid-user>"}';
  select count(*) from public.produk;      -- pengguna login
rollback;
```

Ini bukan kehati-hatian berlebihan. Dua temuan di bawah keduanya lolos
pembacaan mata dan baru ketahuan saat benar-benar dijalankan.

### ATURAN PENGUJIAN PENJAGA: jangan pakai akun admin

**Uji keamanan TIDAK BOLEH memakai akun admin.** `is_admin()` melewatkan
seluruh penjaga di project ini — `jaga_field_sensitif` mengembalikan `NEW` apa
adanya, `users_admin_all` membuka seluruh tabel, `jaga_toko_official`
melewatkan `is_official`. Menguji dengan akun admin akan **selalu hijau**,
apa pun keadaan penjaganya, termasuk kalau penjaganya tidak ada sama sekali.

Akun **ITZ (`inyots1@gmail.com`) adalah admin — jangan dipakai untuk menguji
penjaga.** Pakai akun ber-`role = 'member'`.

Cari sasaran ujinya dulu, jangan menebak dari nama:

```sql
select id, nama, role, status_alumni, status_penjual
from users where role = 'member' and nonaktif_at is null;
```

Lalu pilih **nilai uji yang berbeda dari nilai sekarang**. Ini yang paling
mudah keliru: kalau akun ujinya sudah `status_alumni = 'alumni'` lalu ditulisi
`'alumni'` lagi, hasilnya terbaca "berubah" padahal penjaganya bekerja dengan
benar. Sertakan juga satu kolom biasa sebagai pembanding — kalau kolom itu
ikut tidak berubah, yang gagal UPDATE-nya, bukan penjaganya.

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims to '{"sub":"<uuid-member>","role":"authenticated"}';
  update users set status_penjual = 'aktif',      -- kolom terjaga, nilai baru
                   nama           = 'UJI'         -- kolom biasa, pembanding
   where id = '<uuid-member>';
  select nama, status_penjual from users where id = '<uuid-member>';
rollback;
```

Yang benar: `status_penjual` kembali ke nilai lamanya, `nama` berubah jadi
'UJI'. Selalu bungkus dengan `begin … rollback` supaya data sungguhan tidak
ikut berubah, dan periksa ulang datanya setelah selesai.

### Temuan RLS yang akan berulang

**(a) Subquery ke `users` di dalam policy dijalankan sebagai peran penanya.**

Artinya RLS `users` ikut berlaku di dalam subquery itu, dan karena `users`
tertutup untuk publik, `anon` melihat **himpunan kosong**. Policy lama memakai
`NOT EXISTS (select 1 from users where ...)` — dan `NOT EXISTS` atas himpunan
kosong **selalu true**. Jadi policy itu tidak pernah benar-benar memeriksa apa
pun untuk pengunjung: penjagaan yang terlihat ada di teksnya, tapi tidak ada
efeknya.

Sekarang jalannya lewat `penjual_aktif(seller_id)` yang `SECURITY DEFINER`,
sehingga pemeriksaannya berjalan dengan hak pemilik fungsi dan hasilnya sama
untuk siapa pun yang bertanya.

Aturan turunannya: **jangan menaruh subquery ke tabel ber-RLS langsung di
dalam policy** kalau tabel itu tidak terbaca oleh peran yang akan dievaluasi.
Bungkus jadi fungsi `SECURITY DEFINER` — dan hati-hati khusus dengan
`NOT EXISTS`, karena bentuk itulah yang gagalnya diam-diam ke arah "izinkan".

**(b) Fungsi helper yang dipakai di policy harus bisa dipanggil peran yang
mengevaluasinya.**

`is_admin()` muncul di dalam policy yang juga dievaluasi `anon` (mis.
`produk_select_public`). Tanpa EXECUTE untuk `anon`, evaluasi policy-nya gagal
dengan permission denied — dan yang terlihat di aplikasi bukan pesan error
yang jelas, melainkan **halaman kosong untuk pengunjung**.

Karena itu `is_admin()` dan `penjual_aktif()` sengaja diberi EXECUTE ke `anon`.
Keduanya aman: `is_admin()` hanya membaca peran si penanya sendiri dan
mengembalikan false untuk `anon`, `penjual_aktif()` hanya menjawab pertanyaan
yang jawabannya sudah publik lewat etalase.

Ini **berlawanan** dengan aturan umum "tidak ada fungsi yang boleh dipanggil
`anon`" di [Hak EXECUTE Fungsi Baru](#aturan-hak-execute-fungsi-baru).
Pengecualiannya hanya untuk helper yang dipakai di dalam policy — bukan untuk
fungsi yang mengubah data.

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
- **Antrean refund belum punya panel admin.** Barisnya tercipta sendiri saat
  pesanan lunas dibatalkan, pembeli dan penjual bisa melihat statusnya, tapi
  belum ada siapa pun yang bisa menandainya `selesai`. Semua refund akan
  menumpuk di status `menunggu` sampai panelnya dibuat — dan karena `refund`
  tidak punya policy tulis, panel itu harus lewat RPC baru, bukan UPDATE dari
  client.
- **Unggah bukti alumni dimatikan sementara** (14 Agustus 2026). Kolom
  `users.bukti_alumni_url` dan bucket `bukti-alumni` sengaja dipertahankan;
  verifikasi untuk sekarang bersandar pada penilaian admin atas nama dan
  angkatan. Rinciannya di
  [Unggah bukti alumni DIMATIKAN SEMENTARA](#unggah-bukti-alumni-dimatikan-sementara-sejak-14-agustus-2026).
- **Dua RPC admin belum punya tombol.** `nonaktifkan_user` dan `aktifkan_user`
  jalan dan sudah diberi EXECUTE ke `authenticated`, tapi tidak ada halaman
  yang memanggilnya — jadi belum ada cara menonaktifkan anggota dari UI.
  Tempat yang wajar: [/admin](app/admin/page.tsx), di daftar pengguna.
- **`toko_insert_own` masih memeriksa sumbu lama** (`status_verifikasi =
  'terverifikasi'`), bukan `status_penjual = 'aktif'`. Untuk sekarang pagarnya
  ditegakkan di klien ([/produk/tambah](app/produk/tambah/page.tsx)), yang
  berarti alumni terverifikasi yang belum disetujui admin **masih bisa
  membuat baris `toko` lewat REST langsung**. Produknya tidak akan tayang
  (`produk_select_public` memakai `penjual_aktif`), tapi barisnya tetap
  terbentuk. Perbaikan sebenarnya ada di policy-nya.
- **Alur dua sumbu belum diuji manual di browser** (per 14 Agustus 2026).
  Dev server tidak menyala saat pekerjaan ini dikerjakan, jadi yang sudah
  dipastikan hanya `npx tsc --noEmit`, `npm run lint`, dan pengujian penjaga
  lewat SQL. Yang paling perlu dilihat langsung: pendaftaran dua pilihan,
  `/jual` di tiap nilai `status_penjual`, `/admin/penjual`, tombol Minta Data
  Ulang, dan nama lawan bicara di chat dengan akun non-alumni.
- **Stok pesanan yang batal sebelum `trg_kembalikan_stok` ada tidak kembali
  secara surut.** Trigger-nya hanya bekerja pada pembatalan yang terjadi
  setelah ia dipasang (14 Agustus 2026); pesanan yang dibatalkan sebelum itu
  sudah terlanjur memakan stok permanen dan angkanya masih salah sampai
  sekarang — misalnya KAOS 1 yang tersisa 99 karena pesanan yang disapu cron
  pagi itu. Perbaikannya sekali jalan, dan harus dijalankan Inyo di SQL
  editor, bukan dari aplikasi. Untuk melihat dulu seberapa besar
  selisihnya:

  ```sql
  select i.produk_id, p.nama, p.stok as stok_sekarang, sum(i.qty) as belum_kembali
  from pesanan_items i
  join pesanan ps on ps.id = i.pesanan_id
  join produk p  on p.id = i.produk_id
  where ps.status = 'dibatalkan'
    and ps.dibatalkan_at < timestamptz '2026-08-14'   -- ganti dengan waktu trigger dipasang
    and not coalesce(p.is_preorder, false)
  group by i.produk_id, p.nama, p.stok
  order by belum_kembali desc;
  ```

  Angkanya perlu diperiksa mata dulu sebelum ditambahkan — pesanan yang
  produknya sudah dihapus punya `produk_id` NULL dan tidak muncul di sini.
- Buku besar penjual belum ada.
- Kontribusi kas 5% belum ada.
- Seluruh fitur verifikasi alumni (halaman admin, /verifikasi, badge, banner)
  dan konfirmasi pembayaran manual belum diuji manual di browser
  (per 10 Agustus 2026).
- Fitur pre-order baru diuji dengan **satu** produk PO di database (per
  13 Agustus 2026). Yang belum pernah terlihat dengan data sungguhan: periode
  yang belum dibuka dan yang sudah ditutup, kuota penuh, serta tampilan
  progres saat target tercapai.
