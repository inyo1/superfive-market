'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

export type JenisToast = 'sukses' | 'error' | 'info' | 'peringatan'

type Toast = {
  id: number
  jenis: JenisToast
  pesan: string
}

type ToastCtx = {
  toast: (pesan: string, jenis?: JenisToast) => void
  sukses: (pesan: string) => void
  error: (pesan: string) => void
  info: (pesan: string) => void
  peringatan: (pesan: string) => void
}

const Ctx = createContext<ToastCtx | null>(null)

const DURASI = 4000

const GAYA: Record<JenisToast, { bg: string; border: string; teks: string; ikon: string }> = {
  sukses:     { bg: '#e8f5e9', border: '#a5d6a7', teks: '#2e7d32', ikon: '✓' },
  error:      { bg: '#fce4e4', border: '#f09595', teks: '#c62828', ikon: '✕' },
  info:       { bg: '#E6F1FB', border: '#a9cdf0', teks: '#0C447C', ikon: 'i' },
  peringatan: { bg: '#fff8e1', border: '#ffe082', teks: '#e08600', ikon: '!' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [daftar, setDaftar] = useState<Toast[]>([])
  const idRef = useRef(0)

  const tutup = useCallback((id: number) => {
    setDaftar(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((pesan: string, jenis: JenisToast = 'info') => {
    const id = ++idRef.current
    setDaftar(prev => [...prev, { id, jenis, pesan }])
    setTimeout(() => tutup(id), DURASI)
  }, [tutup])

  const nilai: ToastCtx = {
    toast,
    sukses:     useCallback((p: string) => toast(p, 'sukses'), [toast]),
    error:      useCallback((p: string) => toast(p, 'error'), [toast]),
    info:       useCallback((p: string) => toast(p, 'info'), [toast]),
    peringatan: useCallback((p: string) => toast(p, 'peringatan'), [toast]),
  }

  return (
    <Ctx.Provider value={nilai}>
      {children}

      {/* Di mobile turun dari atas, di desktop menempel di pojok kanan bawah.
          Penempatannya diatur lewat kelas .toast-wrap di globals.css. */}
      <div className="toast-wrap" aria-live="polite">
        {daftar.map(t => {
          const g = GAYA[t.jenis]
          return (
            <div
              key={t.id}
              className="toast-item"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: g.bg, border: `0.5px solid ${g.border}`,
                borderLeft: `3px solid ${g.teks}`,
                borderRadius: '10px', padding: '11px 12px',
                boxShadow: '0 4px 16px rgba(12,68,124,0.14)',
                pointerEvents: 'auto',
              }}
            >
              <span style={{
                flexShrink: 0, width: '18px', height: '18px', borderRadius: '50%',
                background: g.teks, color: '#fff', fontSize: '11px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, marginTop: '1px',
              }}>
                {g.ikon}
              </span>
              <span style={{ flex: 1, fontSize: '13px', color: g.teks, lineHeight: 1.45 }}>
                {t.pesan}
              </span>
              <button
                onClick={() => tutup(t.id)}
                aria-label="Tutup notifikasi"
                style={{
                  flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                  color: g.teks, opacity: 0.55, fontSize: '15px', lineHeight: 1,
                  padding: '2px 2px 2px 4px',
                }}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return ctx
}
