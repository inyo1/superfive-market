'use client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type CartItem = {
  id: string        // produk_id
  nama: string
  harga: number
  kategori: string
  foto_url?: string | null
  qty: number
}

type AddResult = { ok: true } | { ok: false; error: string }

type CartContextType = {
  items: CartItem[]
  totalItem: number
  totalHarga: number
  loading: boolean
  tambah: (item: Omit<CartItem, 'qty'>) => Promise<AddResult>
  kurang: (id: string) => void
  hapus: (id: string) => void
  kosongkan: () => void
}

const CartContext = createContext<CartContextType | null>(null)

function rowToItem(r: any): CartItem {
  return {
    id: r.produk_id,
    nama: r.nama,
    harga: r.harga,
    kategori: r.kategori,
    foto_url: r.foto_url ?? null,
    qty: r.qty,
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const userIdRef = useRef<string | null>(null)
  const itemsRef = useRef<CartItem[]>([])

  useEffect(() => { itemsRef.current = items }, [items])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userIdRef.current = user.id
        const { data, error } = await supabase
          .from('keranjang')
          .select('produk_id, nama, harga, kategori, foto_url, qty')
          .eq('user_id', user.id)
        if (!error && data) setItems(data.map(rowToItem))
      } else {
        try {
          const stored = localStorage.getItem('keranjang')
          if (stored) setItems(JSON.parse(stored))
        } catch {}
      }
      setLoading(false)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        userIdRef.current = session.user.id

        let localItems: CartItem[] = []
        try {
          const stored = localStorage.getItem('keranjang')
          if (stored) localItems = JSON.parse(stored)
        } catch {}

        if (localItems.length > 0) {
          await supabase.from('keranjang').upsert(
            localItems.map(i => ({
              user_id: session.user.id,
              produk_id: i.id,
              nama: i.nama,
              harga: i.harga,
              kategori: i.kategori,
              foto_url: i.foto_url ?? null,
              qty: i.qty,
            })),
            { onConflict: 'user_id,produk_id' }
          )
          localStorage.removeItem('keranjang')
        }

        const { data } = await supabase
          .from('keranjang')
          .select('produk_id, nama, harga, kategori, foto_url, qty')
          .eq('user_id', session.user.id)
        if (data) setItems(data.map(rowToItem))
      } else if (event === 'SIGNED_OUT') {
        userIdRef.current = null
        setItems([])
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!loading && !userIdRef.current) {
      localStorage.setItem('keranjang', JSON.stringify(items))
    }
  }, [items, loading])

  async function tambah(item: Omit<CartItem, 'qty'>): Promise<AddResult> {
    const uid = userIdRef.current
    const cur = itemsRef.current
    const existing = cur.find(i => i.id === item.id)

    // Sanitize — DB columns are NOT NULL, coerce any null/undefined to safe defaults
    const safeItem = {
      ...item,
      harga: Number(item.harga) || 0,
      nama: item.nama ?? '',
      kategori: item.kategori ?? '',
    }

    let nextItem: CartItem
    let next: CartItem[]

    if (existing) {
      nextItem = { ...existing, qty: existing.qty + 1 }
      next = cur.map(i => i.id === item.id ? nextItem : i)
    } else {
      nextItem = { ...safeItem, qty: 1 }
      next = [...cur, nextItem]
    }

    // Optimistic update
    setItems(next)

    // Guest user — saved to localStorage via useEffect
    if (!uid) return { ok: true }

    const { error } = await supabase.from('keranjang').upsert(
      {
        user_id: uid,
        produk_id: nextItem.id,
        nama: nextItem.nama ?? '',
        harga: Number(nextItem.harga) || 0,
        kategori: nextItem.kategori ?? '',
        foto_url: nextItem.foto_url ?? null,
        qty: nextItem.qty,
      },
      { onConflict: 'user_id,produk_id' }
    )

    if (error) {
      // Rollback optimistic update
      setItems(cur)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  }

  function kurang(id: string) {
    const uid = userIdRef.current
    const cur = itemsRef.current
    const existing = cur.find(i => i.id === id)
    if (!existing) return

    if (existing.qty <= 1) {
      setItems(cur.filter(i => i.id !== id))
      if (uid) supabase.from('keranjang').delete()
        .eq('user_id', uid).eq('produk_id', id).then()
    } else {
      const updated = { ...existing, qty: existing.qty - 1 }
      setItems(cur.map(i => i.id === id ? updated : i))
      if (uid) supabase.from('keranjang').upsert(
        { user_id: uid, produk_id: updated.id, nama: updated.nama, harga: updated.harga, kategori: updated.kategori, foto_url: updated.foto_url ?? null, qty: updated.qty },
        { onConflict: 'user_id,produk_id' }
      ).then()
    }
  }

  function hapus(id: string) {
    const uid = userIdRef.current
    setItems(itemsRef.current.filter(i => i.id !== id))
    if (uid) supabase.from('keranjang').delete()
      .eq('user_id', uid).eq('produk_id', id).then()
  }

  function kosongkan() {
    const uid = userIdRef.current
    setItems([])
    if (uid) supabase.from('keranjang').delete().eq('user_id', uid).then()
    localStorage.removeItem('keranjang')
  }

  const totalItem = items.reduce((sum, i) => sum + i.qty, 0)
  const totalHarga = items.reduce((sum, i) => sum + i.harga * i.qty, 0)

  return (
    <CartContext.Provider value={{ items, totalItem, totalHarga, loading, tambah, kurang, hapus, kosongkan }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart harus dipakai di dalam CartProvider')
  return ctx
}
