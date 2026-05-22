'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Review = {
  id: string
  user_id: string
  rating: number
  komentar: string
  created_at: string
  nama_reviewer: string
}

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            fontSize: '28px', cursor: 'pointer', userSelect: 'none',
            color: n <= (hover || value) ? '#f59e0b' : '#d1d5db',
            transition: 'color 0.1s',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function StarDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span style={{ fontSize: `${size}px`, letterSpacing: '1px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= Math.round(value) ? '#f59e0b' : '#d1d5db' }}>★</span>
      ))}
    </span>
  )
}

function fmtTgl(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ReviewSection({ produkId }: { produkId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [editMode, setEditMode] = useState(false)

  const [rating, setRating] = useState(5)
  const [komentar, setKomentar] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pesan, setPesan] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [produkId])

  async function fetchReviews() {
    setLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select('id, user_id, rating, komentar, created_at, nama_reviewer')
      .eq('produk_id', produkId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setReviews(data as Review[])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!currentUserId || reviews.length === 0) { setMyReview(null); return }
    const mine = reviews.find(r => r.user_id === currentUserId) ?? null
    setMyReview(mine)
    if (mine) { setRating(mine.rating); setKomentar(mine.komentar) }
  }, [currentUserId, reviews])

  async function handleSubmit() {
    if (!currentUserId) return
    if (rating < 1) { setPesan('Pilih bintang dulu!'); return }
    setSubmitting(true)
    setPesan('')

    const { data: userData } = await supabase
      .from('users')
      .select('nama')
      .eq('id', currentUserId)
      .single()
    const namaReviewer = userData?.nama ?? 'Alumni'

    let error: any = null

    if (myReview) {
      // Update review yang ada
      const res = await supabase
        .from('reviews')
        .update({ rating, komentar, nama_reviewer: namaReviewer })
        .eq('id', myReview.id)
      error = res.error
    } else {
      // Insert review baru
      const res = await supabase
        .from('reviews')
        .insert({ produk_id: produkId, user_id: currentUserId, rating, komentar, nama_reviewer: namaReviewer })
      error = res.error
    }

    if (error) {
      setPesan('Gagal menyimpan: ' + error.message)
    } else {
      // Update kolom rating di tabel produk (rata-rata)
      await fetchReviews()
      const allRatings = [...reviews.filter(r => r.user_id !== currentUserId).map(r => r.rating), rating]
      const avg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length
      await supabase.from('produk').update({ rating: parseFloat(avg.toFixed(1)) }).eq('id', produkId)

      setPesan(myReview ? 'Review diperbarui!' : 'Review berhasil dikirim!')
      setEditMode(false)
    }
    setSubmitting(false)
  }

  async function handleHapus() {
    if (!myReview) return
    const { error } = await supabase.from('reviews').delete().eq('id', myReview.id)
    if (!error) {
      await fetchReviews()
      setMyReview(null)
      setRating(5)
      setKomentar('')
      setPesan('Review dihapus.')
    }
  }

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  const isShowingForm = currentUserId && (!myReview || editMode)
  const isShowingMyReview = myReview && !editMode

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #c5d9ef', marginBottom: '24px', overflow: 'hidden' }}>

      {/* Header ringkasan */}
      <div style={{ padding: '18px', borderBottom: '0.5px solid #e8f0f8' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0C447C', marginBottom: '10px' }}>
          ⭐ Rating & Ulasan
        </div>
        {reviews.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#1a1a1a', lineHeight: 1 }}>
                {avgRating.toFixed(1)}
              </div>
              <StarDisplay value={avgRating} size={16} />
              <div style={{ fontSize: '11px', color: '#5a7da0', marginTop: '2px' }}>
                {reviews.length} ulasan
              </div>
            </div>
            {/* Bar distribusi */}
            <div style={{ flex: 1 }}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.filter(r => r.rating === star).length
                const pct = reviews.length ? (count / reviews.length) * 100 : 0
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#5a7da0', width: '8px' }}>{star}</span>
                    <span style={{ fontSize: '11px', color: '#f59e0b' }}>★</span>
                    <div style={{ flex: 1, height: '6px', background: '#e8f0f8', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#5a7da0', width: '16px' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#5a7da0' }}>Belum ada ulasan untuk produk ini.</div>
        )}
      </div>

      {/* Pesan notifikasi */}
      {pesan && (
        <div style={{ margin: '12px 18px 0', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', background: pesan.includes('Gagal') ? '#fce4e4' : '#e8f5e9', color: pesan.includes('Gagal') ? '#c62828' : '#2e7d32', border: `0.5px solid ${pesan.includes('Gagal') ? '#f09595' : '#a5d6a7'}` }}>
          {pesan}
        </div>
      )}

      {/* Review milik saya */}
      {isShowingMyReview && (
        <div style={{ padding: '16px 18px', borderBottom: '0.5px solid #e8f0f8', background: '#f8fbff' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#0C447C', marginBottom: '8px' }}>Ulasan Kamu</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <StarDisplay value={myReview.rating} size={15} />
              {myReview.komentar && (
                <p style={{ fontSize: '13px', color: '#444', margin: '6px 0 0', lineHeight: '1.5' }}>{myReview.komentar}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => setEditMode(true)} style={{ background: '#E6F1FB', color: '#0C447C', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
              <button onClick={handleHapus} style={{ background: '#fce4e4', color: '#c62828', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Form tulis / edit review */}
      {isShowingForm && (
        <div style={{ padding: '16px 18px', borderBottom: reviews.length > 0 ? '0.5px solid #e8f0f8' : 'none' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '10px' }}>
            {editMode ? 'Edit Ulasan Kamu' : 'Tulis Ulasan'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '6px' }}>Rating</div>
            <StarSelector value={rating} onChange={setRating} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#5a7da0', marginBottom: '6px' }}>Komentar (opsional)</div>
            <textarea
              value={komentar}
              onChange={e => setKomentar(e.target.value)}
              rows={3}
              placeholder="Bagikan pengalamanmu dengan produk ini..."
              style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #c5d9ef', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {editMode && (
              <button onClick={() => { setEditMode(false); setRating(myReview?.rating ?? 5); setKomentar(myReview?.komentar ?? '') }}
                style={{ padding: '9px 16px', background: '#f0f5fb', color: '#5a7da0', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                Batal
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ flex: 1, padding: '9px', background: submitting ? '#7fa8c9' : '#0C447C', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Menyimpan...' : editMode ? 'Simpan Perubahan' : 'Kirim Ulasan'}
            </button>
          </div>
        </div>
      )}

      {/* CTA login jika belum masuk */}
      {!currentUserId && (
        <div style={{ padding: '14px 18px', borderBottom: reviews.length > 0 ? '0.5px solid #e8f0f8' : 'none', textAlign: 'center' }}>
          <a href="/auth" style={{ fontSize: '13px', color: '#0C447C', textDecoration: 'none', fontWeight: '500' }}>
            Masuk untuk menulis ulasan →
          </a>
        </div>
      )}

      {/* Daftar semua review */}
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#5a7da0' }}>Memuat ulasan...</div>
      ) : reviews.filter(r => r.user_id !== currentUserId).length > 0 ? (
        <div>
          {reviews.filter(r => r.user_id !== currentUserId).map((r, i, arr) => (
            <div key={r.id} style={{ padding: '14px 18px', borderBottom: i < arr.length - 1 ? '0.5px solid #e8f0f8' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                    {r.nama_reviewer?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a' }}>{r.nama_reviewer}</div>
                    <div style={{ fontSize: '10px', color: '#5a7da0' }}>{fmtTgl(r.created_at)}</div>
                  </div>
                </div>
                <StarDisplay value={r.rating} size={13} />
              </div>
              {r.komentar && (
                <p style={{ fontSize: '13px', color: '#444', margin: 0, lineHeight: '1.6', paddingLeft: '38px' }}>{r.komentar}</p>
              )}
            </div>
          ))}
        </div>
      ) : !isShowingForm && !isShowingMyReview && reviews.length === 0 ? null : (
        reviews.filter(r => r.user_id !== currentUserId).length === 0 && reviews.length > 0 ? (
          <div style={{ padding: '14px 18px', fontSize: '12px', color: '#5a7da0', textAlign: 'center' }}>
            Belum ada ulasan dari pengguna lain.
          </div>
        ) : null
      )}
    </div>
  )
}
