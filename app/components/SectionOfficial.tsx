'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'
import { useTampilSkeleton } from '../hooks/useSkeleton'
import LogoInilima from './LogoInilima'
import BadgeTersedia from './BadgeTersedia'
import BadgePreorder from './BadgePreorder'
import FotoBeranda from './beranda/FotoBeranda'
import { IkonPerisai, IkonOrang, IkonHati, IkonPanah } from './beranda/Ikon'

// Official Merchandise IniLima — banner horizontal mengikuti mockup yang
// disetujui (Oktober 2026, putaran koreksi).
//
// Desktop (>=1280px): satu banner 400-460px, kiri ±40% identitas + manfaat
// di bawahnya, tengah ±20% SATU kartu spotlight, kanan ±40% display
// merchandise. Tablet (768-1279): identitas | kartu, tanpa kolom kanan.
// HP: identitas → kartu → display (kalau asetnya ada) → manfaat.
//
// DISPLAY MERCHANDISE KANAN MASIH MENUNGGU ASET. Visual di referensi adalah
// satu komposisi produk (jaket, kaos, dst. di atas alas, berlatar gedung),
// bukan kumpulan foto katalog. Foto produk di database adalah foto orang
// memakai kaos/jaket dan mockup kaos — menumpuknya sebagai kolase sudah
// ditolak secara visual. Jadi kolom kanan dibaca dari FOTO_DISPLAY: selama
// null, yang tampil hanya atmosfer (siluet gedung SMPN 5 + cahaya), tanpa
// produk apa pun. Begitu asetnya ada, isi konstanta itu — tidak ada kode lain
// yang perlu disentuh.
//
// Satu pengatur waktu saja: setTimeout yang dipasang ulang tiap kali slide
// berpindah, dan dibersihkan di cleanup effect yang sama. Tidak ada
// setInterval yang bisa tertinggal berlapis saat state berubah cepat.

/** Display merchandise kanan: berkas di /public, latar transparan. null = belum ada. */
const FOTO_DISPLAY: string | null = null

const JEDA = 4000           // jarak antar pergantian otomatis
const JEDA_SETELAH_MANUAL = 8000
const AMBANG_GESER = 40     // px minimum supaya sentuhan dihitung geser
const MAKS = 12

type ProdukResmi = {
  id: string
  nama: string
  harga: number | null
  kategori: string | null
  foto_url: string | string[] | null
  is_tersedia: boolean | null
  is_preorder: boolean
  toko: { id: string; nama_toko: string | null; is_official: boolean } | null
}

function fmt(n: number | null | undefined) {
  return 'Rp ' + (n ?? 0).toLocaleString('id-ID')
}

export default function SectionOfficial() {
  const [produk, setProduk] = useState<ProdukResmi[]>([])
  const [loading, setLoading] = useState(true)
  const tampilSkeleton = useTampilSkeleton(loading)

  const [index, setIndex] = useState(0)
  const [hover, setHover] = useState(false)
  const [fokus, setFokus] = useState(false)
  const [dijeda, setDijeda] = useState(false)   // tombol jeda eksplisit
  const [tabAktif, setTabAktif] = useState(true)
  const [kurangiGerak, setKurangiGerak] = useState(false)
  // Jeda pertama setelah navigasi manual lebih panjang, supaya putaran
  // otomatis tidak merebut kendali dari orang yang sedang melihat
  const jedaBerikutRef = useRef(JEDA)
  const sentuhRef = useRef<number | null>(null)

  useEffect(() => {
    async function muat() {
      // Yang tayang: produk toko resmi yang penjualnya aktif (dijaga RLS
      // produk_select_public), dan yang masih bisa ditanyakan — produk PO
      // memakai periode PO, bukan is_tersedia; sisanya harus tersedia.
      // Barang habis tidak dipajang di panel kampanye.
      const { data } = await supabase
        .from('produk')
        .select('id, nama, harga, kategori, foto_url, is_tersedia, is_preorder, toko!inner(id, nama_toko, is_official)')
        .eq('toko.is_official', true)
        .or('is_preorder.eq.true,is_tersedia.eq.true')
        .order('urutan', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(MAKS)

      setProduk((data ?? []) as unknown as ProdukResmi[])
      setLoading(false)
    }
    muat()
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
    const cek = () => setTabAktif(!document.hidden)
    cek()
    document.addEventListener('visibilitychange', cek)
    return () => document.removeEventListener('visibilitychange', cek)
  }, [])

  const jumlah = produk.length
  const bisaGeser = jumlah > 1
  // Pengguna yang minta gerak dikurangi tidak mendapat putaran otomatis sama
  // sekali — navigasi manual tetap ada
  const berputar = bisaGeser && !kurangiGerak && !dijeda && !hover && !fokus && tabAktif

  const keSlide = useCallback((i: number, manual: boolean) => {
    if (jumlah === 0) return
    const tujuan = ((i % jumlah) + jumlah) % jumlah
    // Memilih slide yang sedang tampil tidak memicu render ulang, jadi jeda
    // panjangnya jangan dipasang — nanti terpakai di putaran yang salah
    if (tujuan === index) return
    if (manual) jedaBerikutRef.current = JEDA_SETELAH_MANUAL
    setIndex(tujuan)
  }, [jumlah, index])

  useEffect(() => {
    if (!berputar) return
    const jeda = jedaBerikutRef.current
    jedaBerikutRef.current = JEDA
    const t = setTimeout(() => setIndex(i => (i + 1) % jumlah), jeda)
    return () => clearTimeout(t)
  }, [berputar, index, jumlah])

  if (!tampilSkeleton && jumlah === 0) return null

  const tokoResmiId = produk[0]?.toko?.id
  const aktif = Math.min(index, Math.max(jumlah - 1, 0))

  function onKeyDown(e: React.KeyboardEvent) {
    if (!bisaGeser) return
    if (e.key === 'ArrowRight') { e.preventDefault(); keSlide(aktif + 1, true) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); keSlide(aktif - 1, true) }
  }

  return (
    <section className="b-seksi" aria-labelledby="judul-inilima">
      <div className="b-wadah">
        <div className={`il-panel${FOTO_DISPLAY ? ' ada-display' : ''}`}>
          {/* Atmosfer kanan: siluet gedung SMPN 5, sangat samar, menyatu
              dengan gradien — bukan foto produk */}
          <div className="il-gedung" aria-hidden>
            <Image src="/smpn5-hero.png" alt="" fill sizes="(max-width: 1279px) 60vw, 520px" style={{ objectFit: 'cover', objectPosition: 'center 28%' }} />
          </div>

          {/* ── Kiri: identitas ── */}
          <div className="il-info">
            <div className="il-identitas">
              <div className="il-logo"><LogoInilima lebar="100%" /></div>
              <h2 id="judul-inilima" className="il-judul">
                <span className="il-eyebrow">Official Merchandise</span>
                <span className="il-merek">
                  IniLima <span className="il-resmi">RESMI</span>
                </span>
              </h2>
            </div>
            <p className="il-desk">
              Merchandise original untuk kebanggaan alumni SMPN 5 Bandung.
            </p>
            {tokoResmiId && (
              <div className="il-aksi">
                <Link href={`/toko/${tokoResmiId}`} className="b-tombol il-tombol-putih">
                  Lihat Koleksi IniLima <IkonPanah size={18} tebal={2} />
                </Link>
                {/* IniLima belum punya halaman profil sendiri; deskripsinya
                    tinggal di halaman toko resmi, jadi tautannya ke sana */}
                <Link href={`/toko/${tokoResmiId}`} className="b-tombol b-tombol-garis">
                  Tentang IniLima
                </Link>
              </div>
            )}
          </div>

          {/* ── Manfaat ── bawah kolom kiri di desktop, paling akhir di HP.
              Teks ketiganya permintaan pemilik produk. */}
          <ul className="il-nilai" role="list">
            <li>
              <span className="il-nilai-ikon"><IkonPerisai size={17} /></span>
              <span><strong>Original</strong><span>Produk Resmi</span></span>
            </li>
            <li>
              <span className="il-nilai-ikon"><IkonOrang size={17} /></span>
              <span><strong>Dukungan Alumni</strong><span>Setiap pembelian berarti</span></span>
            </li>
            <li>
              <span className="il-nilai-ikon"><IkonHati size={17} /></span>
              <span><strong>Kualitas Terjamin</strong><span>Untuk kebanggaan bersama</span></span>
            </li>
          </ul>

          {/* ── Tengah: satu kartu spotlight ── */}
          <div
            className="il-panggung"
            role="region"
            aria-roledescription="carousel"
            aria-label="Merchandise resmi IniLima"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setFokus(true)}
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFokus(false) }}
            onKeyDown={onKeyDown}
            onTouchStart={e => { sentuhRef.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              const awal = sentuhRef.current
              sentuhRef.current = null
              if (awal === null || !bisaGeser) return
              const dx = e.changedTouches[0].clientX - awal
              if (Math.abs(dx) >= AMBANG_GESER) keSlide(aktif + (dx < 0 ? 1 : -1), true)
            }}
          >
            {tampilSkeleton ? (
              <div className="il-kartu il-kartu-skeleton" aria-hidden>
                <div className="il-kartu-foto skeleton" />
                <div className="il-kartu-isi">
                  <span className="skeleton" style={{ height: 16, width: '75%', borderRadius: 6, opacity: 0.3 }} />
                  <span className="skeleton" style={{ height: 12, width: '45%', borderRadius: 6, opacity: 0.3 }} />
                </div>
              </div>
            ) : (
              <>
                {/* Semua slide ditumpuk di satu sel grid supaya tinggi
                    panggung tetap — yang berganti hanya opacity */}
                <div className="il-tumpuk" aria-live={berputar ? 'off' : 'polite'}>
                  {produk.map((p, i) => {
                    const tampil = i === aktif
                    return (
                      <div
                        key={p.id}
                        className={`il-slide${tampil ? ' aktif' : ''}`}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${i + 1} dari ${jumlah}`}
                        aria-hidden={!tampil}
                        inert={!tampil}
                      >
                        <Link href={`/produk/${p.id}`} className="il-kartu">
                          <div className="il-kartu-foto">
                            <span className="il-kartu-pita">Official</span>
                            <BadgePreorder aktif={p.is_preorder} bentuk="pita" />
                            {/* contain: barang tampil utuh, tidak dipotong */}
                            <FotoBeranda
                              src={p.foto_url}
                              kategori={p.kategori}
                              alt={p.nama}
                              sizes="(max-width: 767px) 280px, 240px"
                              fit="contain"
                            />
                          </div>
                          <div className="il-kartu-isi">
                            <span className="il-kartu-nama">{p.nama}</span>
                            <span className="il-kartu-meta">
                              {p.kategori ?? 'Merchandise'} <i aria-hidden>|</i> Official IniLima
                            </span>
                            <span className="il-kartu-baris">
                              <span className="il-kartu-harga">{fmt(p.harga)}</span>
                              {/* Stok produk PO selalu 0 — PO memakai lencana
                                  ungunya sendiri, bukan lencana stok */}
                              {!p.is_preorder && <BadgeTersedia tersedia={p.is_tersedia} kecil />}
                            </span>
                            <span className="il-kartu-lihat">
                              Lihat Detail <IkonPanah size={14} tebal={2.2} />
                            </span>
                          </div>
                        </Link>
                      </div>
                    )
                  })}
                </div>

                {/* Kontrol hanya kalau memang ada yang bisa diganti */}
                {bisaGeser && (
                  <div className="il-kontrol">
                    <button type="button" className="il-panah" onClick={() => keSlide(aktif - 1, true)} aria-label="Merchandise sebelumnya">
                      <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><IkonPanah size={14} tebal={2.2} /></span>
                    </button>
                    <div className="il-titik" role="group" aria-label="Pilih merchandise">
                      {produk.map((p, i) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => keSlide(i, true)}
                          aria-label={`Tampilkan ${p.nama} (${i + 1} dari ${jumlah})`}
                          aria-current={i === aktif ? 'true' : undefined}
                        >
                          <span />
                        </button>
                      ))}
                    </div>
                    <button type="button" className="il-panah" onClick={() => keSlide(aktif + 1, true)} aria-label="Merchandise berikutnya">
                      <IkonPanah size={14} tebal={2.2} />
                    </button>
                    {!kurangiGerak && (
                      <button
                        type="button"
                        className="il-jeda"
                        onClick={() => setDijeda(d => !d)}
                        aria-pressed={dijeda}
                        aria-label={dijeda ? 'Putar otomatis' : 'Jeda putaran otomatis'}
                      >
                        {dijeda ? <IkonPutar /> : <IkonJeda />}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Kanan: display merchandise (menunggu aset, lihat FOTO_DISPLAY) ── */}
          {FOTO_DISPLAY && (
            <div className="il-display" aria-hidden>
              <Image src={FOTO_DISPLAY} alt="" fill sizes="(max-width: 767px) 100vw, 480px" style={{ objectFit: 'contain', objectPosition: 'right bottom' }} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function IkonJeda() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function IkonPutar() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  )
}
