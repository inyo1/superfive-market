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
  varian_id?: string | null
  varian_nama?: string | null
}

type AddResult = { ok: true } | { ok: false; error: string }

type CartContextType = {
  items: CartItem[]
  totalItem: number
  totalHarga: number
  loading: boolean
  tambah: (item: Omit<CartItem, 'qty'>) => Promise<AddResult>
  kurang: (id: string, varianId?: string | null) => void
  hapus: (id: string, varianId?: string | null) => void
  kosongkan: () => void
}

const CartContext = createContext<CartContextType | null>(null)

// Satu produk bisa muncul beberapa kali dengan ukuran berbeda, jadi identitas
// baris keranjang adalah pasangan produk + varian, bukan produk saja.
function kunci(produkId: string, varianId?: string | null) {
  return `${produkId}|${varianId ?? ''}`
}

function samaItem(a: CartItem, produkId: string, varianId?: string | null) {
  return a.id === produkId && (a.varian_id ?? null) === (varianId ?? null)
}

function rowToItem(r: any): CartItem {
  return {
    id: r.produk_id,
    nama: r.nama,
    harga: r.harga,
    kategori: r.kategori,
    foto_url: r.foto_url ?? null,
    qty: r.qty,
    varian_id: r.varian_id ?? null,
    varian_nama: r.varian_nama ?? null,
  }
}

const KOLOM = 'produk_id, nama, harga, kategori, foto_url, qty, varian_id, varian_nama'

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
          .select(KOLOM)
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

        for (const i of localItems) {
          await simpanBaris(session.user.id, i, i.qty)
        }
        if (localItems.length > 0) localStorage.removeItem('keranjang')

        const { data } = await supabase
          .from('keranjang')
          .select(KOLOM)
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

  // Indeks unik keranjang memakai COALESCE(varian_id, ...) — sebuah expression
  // index, yang tidak bisa jadi target ON CONFLICT. Jadi upsert() tidak dipakai;
  // barisnya dicari dulu, lalu di-update atau di-insert.
  async function simpanBaris(uid: string, item: CartItem, qtyBaru: number) {
    const varianId = item.varian_id ?? null

    let cari = supabase.from('keranjang').select('id, qty')
      .eq('user_id', uid).eq('produk_id', item.id)
    cari = varianId ? cari.eq('varian_id', varianId) : cari.is('varian_id', null)

    const { data: adaBaris } = await cari.maybeSingle()

    if (adaBaris) {
      return supabase.from('keranjang').update({ qty: qtyBaru }).eq('id', adaBaris.id)
    }

    return supabase.from('keranjang').insert({
      user_id: uid,
      produk_id: item.id,
      nama: item.nama ?? '',
      harga: Number(item.harga) || 0,
      kategori: item.kategori ?? '',
      foto_url: item.foto_url ?? null,
      qty: qtyBaru,
      varian_id: varianId,
      varian_nama: item.varian_nama ?? null,
    })
  }

  async function tambah(item: Omit<CartItem, 'qty'>): Promise<AddResult> {
    const uid = userIdRef.current
    const cur = itemsRef.current
    const existing = cur.find(i => samaItem(i, item.id, item.varian_id))

    // Kolom di DB NOT NULL, jadi nilai kosong diamankan lebih dulu
    const safeItem = {
      ...item,
      harga: Number(item.harga) || 0,
      nama: item.nama ?? '',
      kategori: item.kategori ?? '',
      varian_id: item.varian_id ?? null,
      varian_nama: item.varian_nama ?? null,
    }

    let nextItem: CartItem
    let next: CartItem[]

    if (existing) {
      nextItem = { ...existing, qty: existing.qty + 1 }
      next = cur.map(i => samaItem(i, item.id, item.varian_id) ? nextItem : i)
    } else {
      nextItem = { ...safeItem, qty: 1 }
      next = [...cur, nextItem]
    }

    setItems(next)

    // Tamu — disimpan ke localStorage lewat useEffect, varian ikut terbawa
    if (!uid) return { ok: true }

    const { error } = await simpanBaris(uid, nextItem, nextItem.qty)

    if (error) {
      setItems(cur)   // batalkan pembaruan optimistis
      return { ok: false, error: error.message }
    }

    return { ok: true }
  }

  function kurang(id: string, varianId?: string | null) {
    const uid = userIdRef.current
    const cur = itemsRef.current
    const existing = cur.find(i => samaItem(i, id, varianId))
    if (!existing) return

    if (existing.qty <= 1) {
      setItems(cur.filter(i => !samaItem(i, id, varianId)))
      if (uid) hapusBaris(uid, id, varianId)
    } else {
      const updated = { ...existing, qty: existing.qty - 1 }
      setItems(cur.map(i => samaItem(i, id, varianId) ? updated : i))
      if (uid) simpanBaris(uid, updated, updated.qty)
    }
  }

  function hapus(id: string, varianId?: string | null) {
    const uid = userIdRef.current
    setItems(itemsRef.current.filter(i => !samaItem(i, id, varianId)))
    if (uid) hapusBaris(uid, id, varianId)
  }

  function hapusBaris(uid: string, produkId: string, varianId?: string | null) {
    let q = supabase.from('keranjang').delete().eq('user_id', uid).eq('produk_id', produkId)
    q = varianId ? q.eq('varian_id', varianId) : q.is('varian_id', null)
    q.then()
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

export { kunci as kunciItem }
