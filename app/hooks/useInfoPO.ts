'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Keranjang tidak menyimpan keterangan pre-order — isinya sengaja cuma
// cuplikan harga dan nama. Jadi status PO tiap produk diambil ulang di sini
// sekali untuk seluruh isi keranjang, bukan satu query per baris.

export type InfoPO = {
  is_preorder: boolean
  po_janji_kirim: string | null
}

export function useInfoPO(produkIds: string[]) {
  const [info, setInfo] = useState<Record<string, InfoPO>>({})

  // Dijadikan string supaya dependensi effect-nya stabil; array baru tiap
  // render akan membuat query berulang tanpa henti.
  const kunci = [...new Set(produkIds)].sort().join(',')

  useEffect(() => {
    const ids = kunci ? kunci.split(',') : []
    // Keranjang kosong: tidak ada yang perlu ditanyakan. Sisa isi state
    // dibiarkan saja — pencarian selalu lewat id yang masih ada di keranjang,
    // jadi entri lama tidak pernah terbaca.
    if (ids.length === 0) return

    let batal = false
    supabase
      .from('produk')
      .select('id, is_preorder, po_janji_kirim')
      .in('id', ids)
      .then(({ data }) => {
        if (batal || !data) return
        setInfo(Object.fromEntries(
          data.map((p: InfoPO & { id: string }) => [p.id, {
            is_preorder: Boolean(p.is_preorder),
            po_janji_kirim: p.po_janji_kirim,
          }])
        ))
      })

    return () => { batal = true }
  }, [kunci])

  const adaPo = Object.values(info).some(i => i.is_preorder)
  const adaBiasa = produkIds.some(id => info[id] && !info[id].is_preorder)

  return {
    info,
    /** Keranjang mencampur barang siap kirim dengan barang PO */
    campuran: adaPo && adaBiasa,
  }
}
