'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useTampilSkeleton } from '../hooks/useSkeleton'
import FotoProduk from './FotoProduk'
import BadgeOfficial from './BadgeOfficial'
import LogoInilima from './LogoInilima'
import { SkeletonKartuProduk } from './Skeleton'
import { IkonLencana, IkonHati, IkonPanah } from './beranda/Ikon'

const EMAS = '#FFB51B'
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
  const [perView, setPerView] = useState(3)
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
      // Tiga kartu di desktop maupun tablet: di desktop deretannya hanya
      // mengisi kolom kanan panel, di tablet panelnya bertumpuk penuh
      setPerView(3)
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
    position: 'absolute', top: '42%', transform: 'translateY(-50%)',
    width: '44px', height: '44px', borderRadius: '50%',
    background: '#fff', color: '#062F59',
    border: 'none', cursor: 'pointer', zIndex: 3,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px', lineHeight: 1,
    boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
    opacity: hover ? 1 : 0,
    transition: 'opacity 0.2s ease',
    pointerEvents: hover ? 'auto' : 'none',
  }

  return (
    <section className="b-seksi" aria-labelledby="judul-inilima">
      <div className="b-wadah">
        {/* Panel kampanye: identitas IniLima di kiri, deretan merchandise di
            kanan. Bertumpuk di bawah 1024px. Rak ini SATU-SATUNYA tempat
            merchandise di beranda — Produk Terbaru di bawahnya menyaringnya. */}
        <div
          className="inilima-panel"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div className="inilima-info">
            {/* Hierarki: logo dan nama IniLima memimpin, "Official
                Merchandise" hanya eyebrow kecil di atas namanya */}
            <div className="inilima-identitas">
              <div className="inilima-logo">
                <LogoInilima lebar="100%" />
              </div>
              <h2 id="judul-inilima" style={{ margin: 0, color: '#fff', minWidth: 0 }}>
                <span className="inilima-eyebrow">Official Merchandise</span>
                <span className="inilima-merek">
                  IniLima
                  <span className="inilima-resmi">RESMI</span>
                </span>
              </h2>
            </div>

            <p style={{ fontSize: '17px', color: '#C4DCF2', lineHeight: 1.65, margin: '20px 0 28px', maxWidth: '380px' }}>
              Merchandise original untuk kebanggaan alumni SMPN 5 Bandung.
            </p>

            {tokoResmiId && (
              <Link href={`/toko/${tokoResmiId}`} className="b-tombol b-tombol-emas">
                Lihat Koleksi IniLima <IkonPanah size={18} tebal={2} />
              </Link>
            )}

            {/* Hanya dua janji yang memang benar hari ini: tokonya toko resmi,
                dan pembelinya mendukung komunitas. "Kualitas terjamin" sengaja
                tidak ditulis — tidak ada apa pun di sistem yang menjaminnya. */}
            <ul className="inilima-janji" role="list">
              <li>
                <span className="inilima-janji-ikon"><IkonLencana size={20} /></span>
                <span><strong>Original</strong><span>Produk resmi IniLima</span></span>
              </li>
              <li>
                <span className="inilima-janji-ikon"><IkonHati size={20} /></span>
                <span><strong>Dukungan Alumni</strong><span>Setiap pembelian berarti</span></span>
              </li>
            </ul>
          </div>

          <div className="inilima-rak">
            {tampilSkeleton ? (
              <div className="merch-track">
                {Array.from({ length: 3 }, (_, i) => (
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
                <div style={{ overflow: 'hidden', margin: '-16px -8px -28px', padding: '16px 0 28px' }}>
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
                        style={{ flex: `0 0 ${lebarKartu}%`, minWidth: 0, padding: '0 8px', boxSizing: 'border-box' }}
                        aria-hidden={i >= jumlah}
                      >
                        <KartuMerch produk={p} tersembunyi={i >= jumlah} />
                      </div>
                    ))}
                  </div>
                </div>

                {bisaGeser && (
                  <>
                    <button
                      type="button"
                      className="merch-panah"
                      onClick={() => { tundaOtomatis(); mundur() }}
                      style={{ ...gayaPanah, left: '-14px' }}
                      aria-label="Lihat merchandise sebelumnya"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="merch-panah"
                      onClick={() => { tundaOtomatis(); maju() }}
                      style={{ ...gayaPanah, right: '-14px' }}
                      aria-label="Lihat merchandise berikutnya"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Titik indikator — hanya kalau memang ada yang bisa digeser */}
            {!tampilSkeleton && bisaGeser && (
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '16px' }}>
                {Array.from({ length: jumlahTitik }, (_, k) => {
                  const aktif = k === titikAktif
                  return (
                    <button
                      type="button"
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
          </div>
        </div>
      </div>
    </section>
  )
}

function KartuMerch({ produk: p, tersembunyi = false }: { produk: ProdukResmi; tersembunyi?: boolean }) {
  return (
    <Link
      href={`/produk/${p.id}`}
      className="prod-card"
      // Kartu kloning untuk putaran mulus tidak boleh ikut dijelajahi Tab
      tabIndex={tersembunyi ? -1 : undefined}
      style={{
        background: '#fff', borderRadius: '16px',
        overflow: 'hidden', textDecoration: 'none', display: 'block',
        boxShadow: '0 14px 36px rgba(0,0,0,0.28)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <BadgeOfficial aktif bentuk="pita" />
        <FotoProduk src={p.foto_url} kategori={p.kategori ?? ''} height={230} fontSize={48} />
      </div>
      <div style={{ padding: '16px 16px 18px' }}>
        <div style={{
          fontSize: '15px', fontWeight: 600, color: '#092D52',
          marginBottom: '6px', lineHeight: 1.35,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {p.nama}
        </div>
        <div style={{ fontSize: '17px', fontWeight: 800, color: '#07589F' }}>
          {fmt(p.harga)}
        </div>
      </div>
    </Link>
  )
}
