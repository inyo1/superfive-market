'use client'
import { useState, useSyncExternalStore } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../context/ToastContext'
import { pesanDefault, urlWhatsApp, urlInstagram, urlLinkLain } from '../../lib/kontak'

type Props = {
  produkId: string
  tokoId: string
  /** Ikut masuk ke pesan pembuka. Dikirim sebagai prop supaya tombol tidak
   *  perlu query ulang produk yang barusan dibaca pemanggilnya. */
  namaProduk: string
  /** `produk.is_tersedia`. False = tombolnya mati dan berbunyi "Stok Habis". */
  tersedia?: boolean
  /** Tombol kecil untuk kartu produk; default tombol penuh untuk halaman detail. */
  kecil?: boolean
  /** Alasan lain tombolnya mati (mis. periode PO belum dibuka). */
  matiKarena?: string | null
}

// Satu baris dari RPC buka_kontak_toko
type Kontak = {
  nama_toko: string | null
  no_wa: string | null
  ig_username: string | null
  link_lain: string | null
  pesan_awal: string | null
}

// Toko yang sudah terbukti belum punya kontak, dibagi ke semua tombol di
// halaman. Di /toko/[id] tiap kartu produk punya tombolnya sendiri, dan
// setelah satu klik membuktikan kontaknya kosong, tidak ada gunanya tombol
// lain untuk toko yang sama tetap menawarkan "Hubungi Penjual".
//
// Sengaja hanya di memori: begitu penjual mengisi kontaknya, muat ulang
// halaman sudah cukup untuk mencobanya lagi. Tidak bisa diketahui sebelum
// klik — toko_kontak tertutup RLS, dan memanggil buka_kontak_toko hanya
// untuk memeriksa akan mencatat prospek palsu untuk toko yang punya kontak.
const tokoTanpaKontak = new Set<string>()
const pendengar = new Set<() => void>()

function langganan(fn: () => void) {
  pendengar.add(fn)
  return () => { pendengar.delete(fn) }
}

function tandaiTanpaKontak(tokoId: string) {
  tokoTanpaKontak.add(tokoId)
  pendengar.forEach(fn => fn())
}

/** Buka tujuan kontak di tab baru; kalau pop-up diblokir, di tab ini. */
function bukaTujuan(url: string) {
  // Tanpa 'noopener' di argumen supaya nilai baliknya bisa dipakai untuk
  // mendeteksi pemblokiran; opener diputus manual sesudahnya supaya situs
  // tujuan tidak bisa mengendalikan tab Superfive.
  const tab = window.open(url, '_blank')
  if (tab) {
    try { tab.opener = null } catch { /* sudah lintas origin — abaikan */ }
  } else {
    window.location.href = url
  }
}

const WA_HIJAU = '#25D366'
const WA_HIJAU_TUA = '#128C7E'

function IkonWA({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.85 9.85 0 0012.04 2zm0 18.13h-.01a8.2 8.2 0 01-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.37c0-4.54 3.7-8.24 8.24-8.24a8.19 8.19 0 015.82 2.42 8.18 8.18 0 012.41 5.83c0 4.54-3.69 8.23-8.24 8.23z" />
      <path d="M17.5 14.4c-.3-.15-1.7-.84-1.97-.94-.26-.1-.45-.15-.64.15-.19.28-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.15-1.22-.45-2.32-1.43-.86-.76-1.44-1.7-1.6-1.99-.17-.29-.02-.44.12-.59.13-.13.29-.34.44-.5.14-.18.19-.3.29-.5.1-.19.05-.36-.02-.5-.07-.15-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38s1.02 2.76 1.17 2.95c.14.19 2.01 3.06 4.86 4.29.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33z" />
    </svg>
  )
}

/**
 * Tombol "Hubungi Penjual" — pintu utama mode katalog.
 *
 * Nomor WA penjual TIDAK PERNAH diambil dengan query ke `toko_kontak`.
 * Tabel itu tertutup RLS untuk siapa pun kecuali pemilik toko dan admin, dan
 * memang begitu maunya: satu-satunya jalan keluarnya adalah RPC
 * `buka_kontak_toko`, yang sekalian mencatat prospeknya. Query langsung akan
 * mengembalikan nol baris — bukan error yang jelas, melainkan tombol yang
 * diam-diam bilang "Kontak belum tersedia" untuk penjual yang justru sudah
 * mengisinya.
 */
export default function TombolHubungi({
  produkId, tokoId, namaProduk, tersedia = true, kecil = false, matiKarena = null,
}: Props) {
  const { error: toastError, peringatan } = useToast()
  const [memuat, setMemuat] = useState(false)
  const tanpaKontak = useSyncExternalStore(
    langganan,
    () => tokoTanpaKontak.has(tokoId),
    () => false,
  )

  // TIDAK ADA GATE LOGIN. Sejak peluncuran reuni buka_kontak_toko() boleh
  // dipanggil anon, dan prospeknya tetap tercatat dengan peminat_id NULL.
  // Memaksa login dulu justru membuang pengunjung yang datang dari tautan
  // yang dibagikan di grup WhatsApp angkatan — mereka paling banyak, dan
  // paling tidak mau membuat akun hanya untuk bertanya "masih ada?".
  const mati = !tersedia || Boolean(matiKarena) || memuat

  // Nama dan angkatan dibaca dari baris sendiri di `users` — satu-satunya
  // baris yang boleh dibaca klien, lewat policy users_select_own. Pengunjung
  // yang belum login mendapat pesan tanpa nama.
  //
  // getSession() dulu, bukan langsung getUser(): untuk pengunjung anon itu
  // tidak memanggil server sama sekali.
  async function pesanUntukSaya(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    let nama = ''
    let labelAngkatan: string | null = null

    if (user) {
      // Nama dari baris sendiri; label angkatan dari alumni_publik supaya
      // bunyinya ditentukan database. Baris di sana hanya ada untuk alumni,
      // jadi yang belum terdaftar otomatis tanpa angkatan.
      const [saya, publik] = await Promise.all([
        supabase.from('users').select('nama').eq('id', user.id).maybeSingle(),
        supabase.from('alumni_publik').select('label_angkatan').eq('id', user.id).maybeSingle(),
      ])
      nama = saya.data?.nama ?? ''
      labelAngkatan = publik.data?.label_angkatan ?? null
    }

    return pesanDefault({ namaPembeli: nama, labelAngkatan, namaProduk })
  }

  async function hubungi() {
    if (memuat || mati) return

    // RPC DULU, TAB BELAKANGAN. Versi sebelumnya membuka tab kosong lebih
    // dulu supaya tidak dianggap pop-up, dengan 'noopener' — padahal
    // window.open dengan noopener SELALU mengembalikan null. Tab kosongnya
    // tidak pernah bisa ditutup, dan untuk toko tanpa kontak (saat
    // peluncuran: semuanya) setiap klik meninggalkan tab kosong yatim.
    //
    // Sekarang tab hanya dibuka kalau memang ada tujuan. Kalau peramban
    // memblokirnya karena sudah lewat dari gerakan klik (Safari iOS paling
    // ketat), bukaTujuan jatuh ke halaman yang sama — di HP itu tetap
    // membuka aplikasi WhatsApp.
    setMemuat(true)
    try {
      // p_kanal cuma preferensi. buka_kontak_toko menentukan sendiri kanal
      // efektifnya dari kontak yang benar-benar terisi — kalau WhatsApp
      // kosong, prospeknya dicatat sebagai 'ig' atau 'link' sesuai yang ada,
      // dan kalau semuanya kosong tidak ada prospek yang dicatat sama sekali.
      // Jadi CUKUP SATU PANGGILAN: memanggil ulang untuk kanal lain hanya
      // akan menggandakan barisnya di tab Prospek dan di panel admin.
      const { data, error } = await supabase.rpc('buka_kontak_toko', {
        p_toko_id: tokoId,
        p_produk_id: produkId,
        p_kanal: 'wa',
      })

      if (error) {
        toastError('Gagal membuka kontak penjual: ' + error.message)
        return
      }

      // RETURNS TABLE — PostgREST mengirimnya sebagai array satu elemen.
      // Toko tanpa baris toko_kontak tetap mengembalikan satu baris (LEFT
      // JOIN) dengan semua kontak NULL, dan tidak ada prospek yang dicatat.
      const kontak: Kontak | null = Array.isArray(data) ? (data[0] ?? null) : (data ?? null)

      // Bukan error dan bukan peringatan — keadaan wajar, terutama di awal
      // peluncuran. Tombolnya berubah jadi status tenang, dan semua tombol
      // lain untuk toko yang sama di halaman ini ikut berubah.
      if (!kontak || (!kontak.no_wa && !kontak.ig_username && !kontak.link_lain)) {
        tandaiTanpaKontak(tokoId)
        return
      }

      // Urutannya sama dengan urutan kanal efektif yang dipakai RPC, supaya
      // tujuan yang dibuka selalu cocok dengan kanal yang tercatat.
      const tujuan = kontak.no_wa
        ? urlWhatsApp(kontak.no_wa, kontak.pesan_awal?.trim() || await pesanUntukSaya())
        : kontak.ig_username
          ? urlInstagram(kontak.ig_username)
          : urlLinkLain(kontak.link_lain)

      // Hanya bisa terjadi kalau link_lain satu-satunya kontak yang terisi
      // tapi isinya bukan http/https — lihat urlLinkLain soal kenapa yang
      // selain itu tidak boleh dibuka.
      if (!tujuan) {
        peringatan('Link kontak penjual tidak bisa dibuka.')
        return
      }

      bukaTujuan(tujuan)
    } catch (e: unknown) {
      const pesan = e instanceof Error ? e.message : 'Coba lagi.'
      toastError('Gagal membuka kontak penjual: ' + pesan)
    } finally {
      setMemuat(false)
    }
  }

  const gaya: React.CSSProperties = kecil
    ? { width: '100%', padding: '8px', fontSize: '12px', borderRadius: '8px', minHeight: '36px', gap: '6px' }
    : { flex: 1, padding: '13px', fontSize: '14px', borderRadius: '8px', minHeight: '44px', gap: '8px' }

  const dasar: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', fontWeight: '600', textDecoration: 'none',
    boxSizing: 'border-box', lineHeight: 1.2,
    ...gaya,
  }

  if (tanpaKontak && tersedia && !matiKarena) {
    return (
      <button
        disabled
        style={{
          ...dasar,
          background: '#f0f5fb', color: '#7a97b3',
          border: '0.5px dashed #c5d9ef', fontWeight: '500',
          cursor: 'default',
        }}
      >
        Kontak belum tersedia
      </button>
    )
  }

  return (
    <button
      onClick={hubungi}
      disabled={mati}
      aria-label={tersedia ? 'Hubungi penjual lewat WhatsApp' : 'Produk sedang habis'}
      style={{
        ...dasar,
        background: mati ? '#cfe0ef' : WA_HIJAU,
        color: mati ? '#7a97b3' : '#fff',
        cursor: mati ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!mati) e.currentTarget.style.background = WA_HIJAU_TUA }}
      onMouseLeave={e => { if (!mati) e.currentTarget.style.background = WA_HIJAU }}
    >
      {!tersedia ? 'Stok Habis'
        : matiKarena ? matiKarena
        : memuat ? 'Membuka…'
        : <><IkonWA size={kecil ? 15 : 18} /> Hubungi Penjual</>}
    </button>
  )
}
