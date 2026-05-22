'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../components/Navbar'

type ConvDisplay = {
  id: string
  otherId: string
  otherNama: string | null
  otherAvatar: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unread: number
  produkNama: string | null
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function AvatarCircle({ nama, avatar, size = 48 }: { nama: string | null; avatar: string | null; size?: number }) {
  const initials = nama ? nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #185FA5, #0C447C)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', border: '2px solid #e8f0f8',
    }}>
      {avatar
        ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: `${Math.round(size * 0.38)}px`, fontWeight: '700', color: '#fff' }}>{initials}</span>
      }
    </div>
  )
}

export default function ChatListPage() {
  const router = useRouter()
  const [convs, setConvs] = useState<ConvDisplay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      const { data: rawConvs } = await supabase
        .from('conversations')
        .select('id, buyer_id, seller_id, last_message, last_message_at, produk:produk_id(nama)')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })

      if (!rawConvs?.length) { setLoading(false); return }

      const otherIds = rawConvs.map(c => c.buyer_id === user.id ? c.seller_id : c.buyer_id)
      const { data: profiles } = await supabase
        .from('users')
        .select('id, nama, avatar_url')
        .in('id', [...new Set(otherIds)])

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', rawConvs.map(c => c.id))
        .eq('is_read', false)
        .neq('sender_id', user.id)

      const unreadByConv: Record<string, number> = {}
      for (const m of unreadMsgs ?? []) {
        unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] ?? 0) + 1
      }

      setConvs(rawConvs.map(c => {
        const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id
        const p = profileMap[otherId]
        return {
          id: c.id,
          otherId,
          otherNama: p?.nama ?? null,
          otherAvatar: p?.avatar_url ?? null,
          lastMessage: c.last_message,
          lastMessageAt: c.last_message_at,
          unread: unreadByConv[c.id] ?? 0,
          produkNama: (c.produk as any)?.nama ?? null,
        }
      }))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        <h1 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 16px' }}>
          Pesan
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5a7da0' }}>Memuat...</div>
        ) : convs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '0.5px solid #e8f0f8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
            <div style={{ fontSize: '14px', color: '#5a7da0', marginBottom: '6px' }}>Belum ada percakapan</div>
            <div style={{ fontSize: '12px', color: '#9ab4cc' }}>Mulai chat dari halaman produk atau toko alumni</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {convs.map(c => (
              <button
                key={c.id}
                onClick={() => router.push(`/chat/${c.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: '#fff', border: '0.5px solid #e8f0f8',
                  borderRadius: '12px', padding: '14px', cursor: 'pointer',
                  textAlign: 'left', width: '100%',
                }}
              >
                <AvatarCircle nama={c.otherNama} avatar={c.otherAvatar} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <div style={{ fontSize: '14px', fontWeight: c.unread > 0 ? '700' : '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.otherNama || 'Alumni'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ab4cc', flexShrink: 0, marginLeft: '8px' }}>
                      {timeAgo(c.lastMessageAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: c.unread > 0 ? '#0C447C' : '#5a7da0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {c.lastMessage || (c.produkNama ? `Re: ${c.produkNama}` : 'Mulai percakapan')}
                    </div>
                    {c.unread > 0 && (
                      <div style={{ background: '#0C447C', color: '#fff', borderRadius: '50%', minWidth: '20px', height: '20px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {c.unread > 9 ? '9+' : c.unread}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
