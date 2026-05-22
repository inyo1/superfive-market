'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../context/CartContext'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'

const metodeBayar = [
  { id: 'transfer_bca', label: 'Transfer BCA', icon: '🏦', info: 'BCA 1234567890 a/n Superfive Market' },
  { id: 'qris', label: 'QRIS', icon: '📱', info: 'Scan QR Code saat konfirmasi pesanan' },
  { id: 'cod', label: 'COD', icon: '🚚', info: 'Bayar saat barang tiba (Bandung area)' },
]

function fmt(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

const emojiKategori: Record<string, string> = {
  Teknologi: '💻', Fashion: '👗', Kuliner: '🍱',
  Properti: '🏠', Jasa: '🛠️', UMKM: '🏪',
}

export default function CheckoutPage() {
  const { items, totalHarga, kosongkan } = useCart()
  const router = useRouter()

  const [nama, setNama] = useState('')
  const [noHp, setNoHp] = useState('')
  const [alamat, setAlamat] = useState('')
  const [catatan, setCatatan] = useState('')
  const [metode, setMetode] = useState('transfer_bca')
  const [loading, setLoading] = useState(false)
  const [sukses, setSukses] = useState<string | null>(null)
  const [error, setError] = useState('')

  const ongkir = 0
  const total = totalHarga + ongkir

  if (items.length === 0 && !sukses) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
          <div style={{ fontSize: '16px', color: '#333', marginBottom: '20px' }}>Keranjang kamu kosong</div>
          <a href="/produk" style={{ background: '#0C447C', color: '#fff', padding: '12px 24px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
            Lihat Produk
          </a>
        </div>
      </main>
    )
  }

  if (sukses) {
    const selectedMetode = metodeBayar.find(m => m.id === metode)
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ maxWidth: '480px', margin: '32px auto', padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px 20px', border: '0.5px solid #c5d9ef', textAlign: 'center' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>Pesanan Berhasil!</h2>
            <p style={{ fontSize: '13px', color: '#5a7da0', marginBottom: '16px' }}>
              Terima kasih, <strong>{nama}</strong>! Pesananmu sudah kami terima.
            </p>

            <div style={{ background: '#f0f5fb', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', textAlign: 'left' }}>
              <div style={{ fontSize: '11px', color: '#5a7da0', marginBottom: '4px' }}>ID Pesanan</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', fontFamily: 'monospace' }}>{sukses}</div>
            </div>

            <div style={{ background: '#E6F1FB', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>
                {selectedMetode?.icon} {selectedMetode?.label}
              </div>
              <div style={{ fontSize: '12px', color: '#5a7da0' }}>{selectedMetode?.info}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0C447C', marginTop: '8px' }}>
                Total: {fmt(total)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/produk" style={{ flex: 1, background: '#fff', color: '#0C447C', border: '1px solid #0C447C', padding: '11px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', textAlign: 'center' }}>
                Lanjut Belanja
              </a>
              <a href="/" style={{ flex: 1, background: '#0C447C', color: '#fff', padding: '11px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', textAlign: 'center' }}>
                Beranda
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }

  async function handleCheckout() {
    if (!nama.trim()) { setError('Nama wajib diisi'); return }
    if (!noHp.trim()) { setError('Nomor HP wajib diisi'); return }
    if (!alamat.trim()) { setError('Alamat wajib diisi'); return }
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error: errDb } = await supabase
      .from('pesanan')
      .insert({
        user_id: user?.id ?? null,
        nama,
        no_hp: noHp,
        alamat,
        catatan,
        metode_bayar: metode,
        total,
        items: items.map(i => ({ id: i.id, nama: i.nama, harga: i.harga, qty: i.qty, kategori: i.kategori })),
        status: 'menunggu',
      })
      .select('id')
      .single()

    if (errDb || !data) {
      setError('Gagal membuat pesanan: ' + (errDb?.message ?? 'Coba lagi'))
      setLoading(false)
      return
    }

    kosongkan()
    setSukses(data.id)
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '16px' }}>
        <h1 style={{ fontSize: '17px', fontWeight: '600', color: '#1a1a1a', marginBottom: '16px' }}>Checkout</h1>

        {/* Form data penerima */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '14px' }}>📋 Data Penerima</div>

          {[
            { label: 'Nama Lengkap', value: nama, set: setNama, placeholder: 'Nama penerima', type: 'text' },
            { label: 'Nomor HP / WhatsApp', value: noHp, set: setNoHp, placeholder: '08xxxxxxxxxx', type: 'tel' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>{f.label}</label>
              <input
                value={f.value}
                onChange={e => f.set(e.target.value)}
                type={f.type}
                placeholder={f.placeholder}
                style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Alamat Lengkap</label>
            <textarea
              value={alamat}
              onChange={e => setAlamat(e.target.value)}
              rows={3}
              placeholder="Jl. Contoh No. 10, Kel. ..., Kec. ..., Bandung"
              style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#5a7da0', display: 'block', marginBottom: '4px' }}>Catatan (opsional)</label>
            <input
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Misal: tolong dibungkus rapi"
              style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Metode pembayaran */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '14px' }}>💳 Metode Pembayaran</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {metodeBayar.map(m => (
              <button
                key={m.id}
                onClick={() => setMetode(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '8px', cursor: 'pointer',
                  border: metode === m.id ? '1.5px solid #0C447C' : '0.5px solid #c5d9ef',
                  background: metode === m.id ? '#E6F1FB' : '#fff',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '22px' }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: metode === m.id ? '600' : '400', color: '#1a1a1a' }}>{m.label}</div>
                  <div style={{ fontSize: '11px', color: '#5a7da0' }}>{m.info}</div>
                </div>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                  border: metode === m.id ? '4px solid #0C447C' : '1.5px solid #c5d9ef',
                  background: '#fff',
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* Ringkasan order */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '12px' }}>🧾 Ringkasan Pesanan</div>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '36px', height: '36px', background: '#E6F1FB', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {emojiKategori[item.kategori] ?? '📦'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nama}</div>
                <div style={{ fontSize: '11px', color: '#5a7da0' }}>x{item.qty}</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#0C447C', flexShrink: 0 }}>{fmt(item.harga * item.qty)}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #e8f0f8', paddingTop: '10px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5a7da0', marginBottom: '6px' }}>
              <span>Subtotal</span><span>{fmt(totalHarga)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5a7da0', marginBottom: '10px' }}>
              <span>Ongkir</span><span style={{ color: '#2e7d32' }}>Gratis</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>
              <span>Total</span>
              <span style={{ color: '#0C447C' }}>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fce4e4', border: '0.5px solid #f09595', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#c62828', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        {/* Tombol checkout */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          style={{
            width: '100%', background: loading ? '#7fa8c9' : '#0C447C',
            color: '#fff', border: 'none', padding: '14px',
            borderRadius: '10px', fontSize: '14px', fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '10px',
          }}
        >
          {loading ? 'Memproses...' : `Pesan Sekarang — ${fmt(total)}`}
        </button>

        <a href="/keranjang" style={{ display: 'block', textAlign: 'center', color: '#5a7da0', fontSize: '13px', textDecoration: 'none', paddingBottom: '24px' }}>
          ← Kembali ke Keranjang
        </a>
      </div>
    </main>
  )
}
