'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useTampilSkeleton } from '../hooks/useSkeleton'
import FotoProduk from './FotoProduk'
import BadgeOfficial from './BadgeOfficial'
import { SkeletonKartuProduk } from './Skeleton'

const EMAS = '#EF9F27'
const JEDA_OTOMATIS = 4000   // jarak antar geseran otomatis
const DURASI_LUNCUR = 500    // lama animasi meluncur
const TUNDA_SETELAH_MANUAL = 8000
const MAKS_TITIK = 8

type ProdukResmi = {
  id: string
  nama: string
  harga: number | null
  kategori: string | null
  foto_url: string | string[] | null
  toko: { id: string; nama_toko: string | null; is_official: boolean } | null
}

function fmt(n: number | null | undefined) {
  return 'Rp ' + (n ?? 0).toLocaleString('id-ID')
}

export default function SectionOfficial() {
  const [produk, setProduk] = useState<ProdukResmi[]>([])
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)

  // Berapa kartu terlihat sekaligus. 0 berarti mode mobile: geser manual
  // dengan scroll-snap, bukan transform.
  const [perView, setPerView] = useState(4)
  const [mobile, setMobile] = useState(false)
  const [kurangiGerak, setKurangiGerak] = useState(false)

  const [index, setIndex] = useState(0)
  const [transisi, setTransisi] = useState(true)
  const [hover, setHover] = useState(false)
  const [tabAktif, setTabAktif] = useState(true)

  // Menggeser manual me-restart timer dengan jeda lebih panjang, supaya
  // putaran otomatis tidak merebut kendali dari orang yang sedang melihat.
  // Counter yang memicu effect; jeda pertamanya dibawa lewat ref.
  const [restart, setRestart] = useState(0)
  const jedaAwalRef = useRef(JEDA_OTOMATIS)

  useEffect(() => {
    async function muat() {
      const { data } = await supabase
        .from('produk')
        .select('id, nama, harga, kategori, foto_url, toko!inner(id, nama_toko, is_official)')
        .eq('toko.is_official', true)
        .order('urutan', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(20)

      setProduk((data ?? []) as unknown as ProdukResmi[])
      setLoading(false)
    }
    muat()
  }, [])

  // Lebar layar menentukan jumlah kartu; mobile pindah ke mode geser manual
  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 767px)')
    const mqTablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')

    function terapkan() {
      setMobile(mqMobile.matches)
      setPerView(mqTablet.matches ? 3 : 4)
      setIndex(0)
    }
    terapkan()

    mqMobile.addEventListener('change', terapkan)
    mqTablet.addEventListener('change', terapkan)
    return () => {
      mqMobile.removeEventListener('change', terapkan)
      mqTablet.removeEventListener('change', terapkan)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const terapkan = () => setKurangiGerak(mq.matches)
    terapkan()
    mq.addEventListener('change', terapkan)
    return () => mq.removeEventListener('change', terapkan)
  }, [])

  // Tab di latar belakang tidak perlu memutar apa-apa
  useEffect(() => {
    function cek() { setTabAktif(!document.hidden) }
    cek()
    document.addEventListener('visibilitychange', cek)
    return () => document.removeEventListener('visibilitychange', cek)
  }, [])

  const jumlah = produk.length
  // Kalau kartu muat semua, carousel dimatikan sepenuhnya
  const bisaGeser = !mobile && jumlah > perView
  const kloning = bisaGeser ? produk.slice(0, perView) : []

  const maju = useCallback(() => {
    setTransisi(true)
    setIndex(i => i + 1)
  }, [])

  const mundur = useCallback(() => {
    setIndex(i => {
      if (i > 0) { setTransisi(true); return i - 1 }
      // Dari kartu pertama, lompat diam-diam ke ujung kloning lalu animasikan
      // mundur satu langkah — supaya tidak terlihat meluncur balik jauh
      setTransisi(false)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setTransisi(true)
        setIndex(jumlah - 1)
      }))
      return jumlah
    })
  }, [jumlah])

  function tundaOtomatis() {
    jedaAwalRef.current = TUNDA_SETELAH_MANUAL
    setRestart(n => n + 1)
  }

  // Putaran otomatis. Berhenti saat kursor di atas section, tab tidak aktif,
  // pengguna minta gerak dikurangi, di mobile, atau kartu sudah muat semua.
  useEffect(() => {
    if (!bisaGeser || kurangiGerak || hover || !tabAktif) return

    // Jeda pertama lebih panjang kalau baru saja digeser manual, lalu
    // kembali ke ritme normal
    const jedaAwal = jedaAwalRef.current
    jedaAwalRef.current = JEDA_OTOMATIS

    let ulang: ReturnType<typeof setInterval> | undefined
    const awal = setTimeout(() => {
      maju()
      ulang = setInterval(maju, JEDA_OTOMATIS)
    }, jedaAwal)

    return () => { clearTimeout(awal); if (ulang) clearInterval(ulang) }
  }, [bisaGeser, kurangiGerak, hover, tabAktif, maju, restart])

  // Saat sampai di zona kloning, balik ke awal tanpa transisi supaya
  // perputarannya tidak terlihat meloncat mundur
  useEffect(() => {
    if (!bisaGeser || index !== jumlah) return
    const t = setTimeout(() => {
      setTransisi(false)
      setIndex(0)
      requestAnimationFrame(() => requestAnimationFrame(() => setTransisi(true)))
    }, DURASI_LUNCUR + 20)
    return () => clearTimeout(t)
  }, [index, jumlah, bisaGeser])

  if (!tampilSkeleton && jumlah === 0) return null

  const tokoResmiId = produk[0]?.toko?.id
  const lebarKartu = 100 / perView

  // Titik indikator, dibatasi supaya tidak jadi barisan panjang
  const jumlahTitik = Math.min(MAKS_TITIK, jumlah)
  const posisiNyata = index % (jumlah || 1)
  const titikAktif = jumlah > 1
    ? Math.round((posisiNyata * (jumlahTitik - 1)) / (jumlah - 1))
    : 0

  function keTitik(k: number) {
    tundaOtomatis()
    setTransisi(true)
    setIndex(jumlah > 1 ? Math.round((k * (jumlah - 1)) / (jumlahTitik - 1)) : 0)
  }

  const gayaPanah: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: '44px', height: '44px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.94)', color: '#0C447C',
    border: 'none', cursor: 'pointer', zIndex: 3,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', lineHeight: 1,
    boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
    opacity: hover ? 1 : 0,
    transition: 'opacity 0.2s ease',
    pointerEvents: hover ? 'auto' : 'none',
  }

  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #0a3a6b 0%, #0C447C 100%)',
        padding: '22px 0 26px',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Official Merchandise INILIMA"
    >
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 16px' }}>

        {/* Di HP logonya di ATAS judul, bukan jadi kolom kiri: dua kolom di
            layar sempit menyisakan kartu yang terlalu ramping. */}
        {mobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <LogoInilima lebar={90} />
          </div>
        )}

        {/* Judul */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: EMAS, letterSpacing: '0.3px' }}>
            Official Merchandise INILIMA
          </h2>
          <span style={{
            background: EMAS, color: '#3d2600',
            fontSize: '9px', fontWeight: '800', letterSpacing: '0.8px',
            padding: '3px 8px', borderRadius: '4px', lineHeight: 1.4,
          }}>
            RESMI
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#B5D4F4', margin: 0, lineHeight: 1.6 }}>
          Merchandise resmi komunitas alumni SMPN 5 Bandung.
        </p>

        <div style={{ width: '54px', height: '3px', background: EMAS, borderRadius: '2px', margin: '12px 0 14px' }} />

        {/* Dua kolom: logo di kiri, deretan kartu bergeser ke kanan.
            Rata tengah vertikal terhadap deretan kartu.

            Batasnya 160px, bukan 200px: logonya lencana bundar, dan bentuk
            bundar terbaca lebih besar daripada logo persegi seukuran sama.
            Jaraknya juga dirapatkan jadi 16px — tepi bundar sudah memberi
            ruang kosong sendiri di sudut-sudutnya, jadi jarak selebar logo
            persegi akan terasa menganga. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!mobile && (
            <div style={{
              flex: '0 0 22%', maxWidth: '160px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LogoInilima lebar="100%" />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>

        {/* ── Skeleton ── */}
        {tampilSkeleton ? (
          <div className="merch-track">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="merch-item"><SkeletonKartuProduk /></div>
            ))}
          </div>
        ) : mobile ? (
          /* ── Mobile: geser manual dengan snap, tanpa putaran otomatis ── */
          <div className="merch-track">
            {produk.map(p => (
              <div key={p.id} className="merch-item">
                <KartuMerch produk={p} />
              </div>
            ))}
          </div>
        ) : (
          /* ── Desktop & tablet: satu baris, digeser lewat transform ── */
          <div style={{ position: 'relative' }}>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  transform: `translate3d(-${index * lebarKartu}%, 0, 0)`,
                  transition: transisi && !kurangiGerak
                    ? `transform ${DURASI_LUNCUR}ms cubic-bezier(0.22, 1, 0.36, 1)`
                    : 'none',
                }}
              >
                {[...produk, ...kloning].map((p, i) => (
                  <div
                    key={`${p.id}-${i}`}
                    style={{ flex: `0 0 ${lebarKartu}%`, minWidth: 0, paddingRight: '12px', boxSizing: 'border-box' }}
                    aria-hidden={i >= jumlah}
                  >
                    <KartuMerch produk={p} />
                  </div>
                ))}
              </div>
            </div>

            {bisaGeser && (
              <>
                <button
                  onClick={() => { tundaOtomatis(); mundur() }}
                  style={{ ...gayaPanah, left: '-6px' }}
                  aria-label="Lihat merchandise sebelumnya"
                >
                  ‹
                </button>
                <button
                  onClick={() => { tundaOtomatis(); maju() }}
                  style={{ ...gayaPanah, right: '-6px' }}
                  aria-label="Lihat merchandise berikutnya"
                >
                  ›
                </button>
              </>
            )}
          </div>
        )}

          </div>
        </div>

        {/* Titik indikator — hanya kalau memang ada yang bisa digeser */}
        {!tampilSkeleton && bisaGeser && (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '14px' }}>
            {Array.from({ length: jumlahTitik }, (_, k) => {
              const aktif = k === titikAktif
              return (
                <button
                  key={k}
                  onClick={() => keTitik(k)}
                  aria-label={`Ke merchandise kelompok ${k + 1} dari ${jumlahTitik}`}
                  aria-current={aktif ? 'true' : undefined}
                  style={{
                    width: '24px', height: '24px', padding: 0,
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{
                    display: 'block',
                    width: aktif ? '20px' : '7px', height: '7px', borderRadius: '4px',
                    background: aktif ? EMAS : 'rgba(255,255,255,0.35)',
                    transition: kurangiGerak ? 'none' : 'width 0.25s ease, background 0.25s ease',
                  }} />
                </button>
              )
            })}
          </div>
        )}

        {tokoResmiId && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Link
              href={`/toko/${tokoResmiId}`}
              className="btn-primary"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '44px', padding: '0 26px', borderRadius: '9px',
                background: EMAS, color: '#3d2600',
                fontSize: '13px', fontWeight: '700', textDecoration: 'none',
              }}
            >
              Lihat Semua Merchandise →
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Logo IniLima — lencana bundar putih bercincin abu, 512×512 RGBA.
 *
 * Yang transparan hanya putih di luar lingkaran; putih di DALAM lencana
 * sengaja dipertahankan karena itu bagian desainnya. Jadi yang tayang adalah
 * cakram putih di atas biru tua, terbaca seperti stempel resmi — itu memang
 * yang dimaksud.
 *
 * JANGAN menambahkan bingkai, lingkaran, atau bayangan apa pun di sini:
 * logonya sudah punya cincinnya sendiri, dan tambahan apa pun akan jadi
 * cincin kedua.
 *
 * `object-fit: contain` menjaga rasionya — tidak pernah melar maupun
 * terpotong berapa pun lebar kolomnya.
 */
function LogoInilima({ lebar }: { lebar: number | string }) {
  return (
    <Image
      src="/logo-inilima.png"
      alt="Logo IniLima — Alumni SMPN 5 Bandung"
      width={200}
      height={200}
      unoptimized
      style={{
        width: typeof lebar === 'number' ? `${lebar}px` : lebar,
        height: 'auto', maxWidth: '100%',
        objectFit: 'contain', flexShrink: 0,
      }}
    />
  )
}

function KartuMerch({ produk: p }: { produk: ProdukResmi }) {
  return (
    <Link
      href={`/produk/${p.id}`}
      className="prod-card"
      style={{
        background: '#fff', borderRadius: '10px',
        border: '0.5px solid rgba(255,255,255,0.18)',
        overflow: 'hidden', textDecoration: 'none', display: 'block',
      }}
    >
      <div style={{ position: 'relative' }}>
        <BadgeOfficial aktif bentuk="pita" />
        <FotoProduk src={p.foto_url} kategori={p.kategori ?? ''} height={130} fontSize={40} />
      </div>
      <div style={{ padding: '10px' }}>
        <div style={{
          fontSize: '12px', fontWeight: '500', color: '#1a1a1a',
          marginBottom: '5px', height: '32px', overflow: 'hidden', lineHeight: 1.35,
        }}>
          {p.nama}
        </div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0C447C' }}>
          {fmt(p.harga)}
        </div>
      </div>
    </Link>
  )
}
