// Ikon garis untuk beranda — satu keluarga bentuk, satu ketebalan garis.
//
// Digambar inline, bukan emoji dan bukan pustaka ikon: emoji tampil beda di
// tiap sistem operasi (🏪 muncul sebagai minimarket 24H), dan belasan bentuk
// sederhana tidak sepadan dengan satu dependensi. Warnanya `currentColor`,
// jadi diatur lewat `color` di pembungkusnya.
//
// IKON_KATEGORI bertipe Record<Kategori, …> karena alasan yang sama dengan
// EMOJI_KATEGORI di lib/kategori.ts: kategori ketujuh tanpa ikonnya ditolak
// tsc, bukan diam-diam tampil kosong di beranda.

import type { ReactNode } from 'react'
import type { Kategori } from '../../../lib/kategori'

type Props = { size?: number; tebal?: number }

function Svg({ size = 24, tebal = 1.7, children }: Props & { children: ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={tebal}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IkonLaptop(p: Props) {
  return <Svg {...p}><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></Svg>
}

export function IkonKaos(p: Props) {
  return <Svg {...p}><path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.1a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.3-2.2Z" /></Svg>
}

export function IkonAlatMakan(p: Props) {
  return <Svg {...p}><path d="M4 2v7a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V2" /><path d="M7.5 2v20" /><path d="M20 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3Zm0 0v7" /></Svg>
}

export function IkonRumah(p: Props) {
  return <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /><path d="M10 20v-6h4v6" /></Svg>
}

export function IkonSurat(p: Props) {
  return <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></Svg>
}

export function IkonKunci(p: Props) {
  return <Svg {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8Z" /></Svg>
}

export function IkonEtalase(p: Props) {
  return <Svg {...p}><path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" /><path d="M3 10 4.7 5.3a1 1 0 0 1 .95-.65h12.7a1 1 0 0 1 .95.65L21 10Z" /><path d="M9.5 20v-5.5h5V20" /></Svg>
}

export const IKON_KATEGORI: Record<Kategori, (p: Props) => ReactNode> = {
  Teknologi: IkonLaptop,
  Fashion:   IkonKaos,
  Kuliner:   IkonAlatMakan,
  Properti:  IkonRumah,
  Jasa:      IkonKunci,
  UMKM:      IkonEtalase,
}

export function IkonPanah(p: Props) {
  return <Svg {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>
}

export function IkonCari(p: Props) {
  return <Svg {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></Svg>
}

export function IkonOrang(p: Props) {
  return <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18.5 14.2A6.5 6.5 0 0 1 21.5 20" /></Svg>
}

export function IkonPerisai(p: Props) {
  return <Svg {...p}><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m8.8 12 2.2 2.2 4.2-4.4" /></Svg>
}

export function IkonPetak(p: Props) {
  return <Svg {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></Svg>
}

export function IkonGrafik(p: Props) {
  return <Svg {...p}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M2.5 20h19" /><path d="m14 7 3-3 3 3" /></Svg>
}

export function IkonLencana(p: Props) {
  return <Svg {...p}><circle cx="12" cy="9" r="6" /><path d="m9.5 9 1.7 1.7 3.3-3.4" /><path d="M8.5 14.2 7 21l5-2.5 5 2.5-1.5-6.8" /></Svg>
}

export function IkonHati(p: Props) {
  return <Svg {...p}><path d="M12 20s-7.5-4.4-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.6-7.5 10-7.5 10Z" /></Svg>
}

export function IkonCentang(p: Props) {
  return <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
}

export function IkonTruk(p: Props) {
  return <Svg {...p}><path d="M2.5 6.5h11v10h-11z" /><path d="M13.5 10h4l3 3v3.5h-7" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></Svg>
}

export function IkonSaring(p: Props) {
  return <Svg {...p}><path d="M4 6h10" /><path d="M18 6h2" /><circle cx="16" cy="6" r="2" /><path d="M4 12h4" /><path d="M12 12h8" /><circle cx="10" cy="12" r="2" /><path d="M4 18h12" /><path d="M20 18h0" /><circle cx="18" cy="18" r="2" /></Svg>
}

export function IkonTutup(p: Props) {
  return <Svg {...p}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Svg>
}

export function IkonPin(p: Props) {
  return <Svg {...p}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></Svg>
}

/**
 * Logo WhatsApp — satu-satunya ikon berisi (fill) di berkas ini, karena
 * bentuk merek yang dikenali orang memang berisi, bukan garis.
 */
export function IkonWhatsApp({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.85 9.85 0 0012.04 2zm0 18.13h-.01a8.2 8.2 0 01-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.37c0-4.54 3.7-8.24 8.24-8.24a8.19 8.19 0 015.82 2.42 8.18 8.18 0 012.41 5.83c0 4.54-3.69 8.23-8.24 8.23z" />
      <path d="M17.5 14.4c-.3-.15-1.7-.84-1.97-.94-.26-.1-.45-.15-.64.15-.19.28-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.15-1.22-.45-2.32-1.43-.86-.76-1.44-1.7-1.6-1.99-.17-.29-.02-.44.12-.59.13-.13.29-.34.44-.5.14-.18.19-.3.29-.5.1-.19.05-.36-.02-.5-.07-.15-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38s1.02 2.76 1.17 2.95c.14.19 2.01 3.06 4.86 4.29.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33z" />
    </svg>
  )
}
