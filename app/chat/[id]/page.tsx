'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../components/Navbar'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

type ConvInfo = {
  otherNama: string | null
  otherAvatar: string | null
  produkNama: string | null
}

function AvatarCircle({ nama, avatar, size = 30 }: { nama: string | null; avatar: string | null; size?: number }) {
  const initials = nama ? nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #185FA5, #0C447C)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {avatar
        ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: `${Math.round(size * 0.38)}px`, fontWeight: '700', color: '#fff' }}>{initials}</span>
      }
    </div>
  )
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Hari ini'
  const yest = new Date(today); yest.setDate(today.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return 'Kemarin'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [convInfo, setConvInfo] = useState<ConvInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      setUid(user.id)

      const { data: conv, error } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id, produk:produk_id(nama)')
        .eq('id', id)
        .single()

      if (error || !conv) { router.replace('/chat'); return }

      const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id
      const { data: profile } = await supabase
        .from('users').select('nama, avatar_url').eq('id', otherId).single()

      setConvInfo({
        otherNama: profile?.nama ?? null,
        otherAvatar: profile?.avatar_url ?? null,
        produkNama: (conv.produk as any)?.nama ?? null,
      })

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, is_read')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })

      setMessages((msgs ?? []) as Message[])
      setLoading(false)

      // Mark received messages as read
      const unreadIds = (msgs ?? []).filter(m => !m.is_read && m.sender_id !== user.id).map(m => m.id)
      if (unreadIds.length > 0) {
        supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then(() => {})
      }
    }
    if (id) init()
  }, [id])

  useEffect(() => {
    if (!loading) scrollToBottom(false)
  }, [loading])

  useEffect(() => {
    if (!id || !uid) return
    const channel = supabase
      .channel(`conv-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${id}`,
      }, (payload) => {
        const m = payload.new as Message
        setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
        if (m.sender_id !== uid) {
          supabase.from('messages').update({ is_read: true }).eq('id', m.id).then(() => {})
        }
        setTimeout(() => scrollToBottom(), 50)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, uid])

  async function handleSend() {
    const content = input.trim()
    if (!content || !uid || sending) return
    setInput('')
    setSending(true)

    const { data: newMsg, error } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender_id: uid, content })
      .select('id, sender_id, content, created_at, is_read')
      .single()

    if (error) {
      setInput(content)
    } else if (newMsg) {
      supabase.from('conversations')
        .update({ last_message: content, last_message_at: newMsg.created_at })
        .eq('id', id).then(() => {})
    }
    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const m of messages) {
    const date = fmtDate(m.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.msgs.push(m)
    else grouped.push({ date, msgs: [m] })
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5a7da0' }}>Memuat chat...</div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Chat header */}
      <div style={{
        background: '#fff', borderBottom: '0.5px solid #c5d9ef',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px',
        position: 'sticky', top: '61px', zIndex: 10,
      }}>
        <button onClick={() => router.push('/chat')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0C447C', fontSize: '20px', padding: '2px 8px 2px 0', lineHeight: 1 }}>←</button>
        <AvatarCircle nama={convInfo?.otherNama ?? null} avatar={convInfo?.otherAvatar ?? null} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>{convInfo?.otherNama || 'Alumni'}</div>
          {convInfo?.produkNama && (
            <div style={{ fontSize: '11px', color: '#5a7da0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Re: {convInfo.produkNama}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '16px', maxWidth: '600px', width: '100%', margin: '0 auto', boxSizing: 'border-box', paddingBottom: '80px' }}>
        {grouped.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ab4cc', fontSize: '13px' }}>
            Kirim pesan pertamamu 👋
          </div>
        ) : (
          grouped.map(g => (
            <div key={g.date}>
              <div style={{ textAlign: 'center', margin: '16px 0 12px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#dde8f4' }} />
                <span style={{ position: 'relative', background: '#f0f5fb', padding: '0 10px', fontSize: '11px', color: '#9ab4cc' }}>{g.date}</span>
              </div>
              {g.msgs.map(m => {
                const mine = m.sender_id === uid
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: '8px', alignItems: 'flex-end', gap: '6px' }}>
                    {!mine && <AvatarCircle nama={convInfo?.otherNama ?? null} avatar={convInfo?.otherAvatar ?? null} size={26} />}
                    <div style={{ maxWidth: '72%' }}>
                      <div style={{
                        background: mine ? '#0C447C' : '#fff',
                        color: mine ? '#fff' : '#1a1a1a',
                        padding: '9px 13px',
                        borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        fontSize: '13px', lineHeight: '1.5',
                        border: mine ? 'none' : '0.5px solid #e8f0f8',
                        wordBreak: 'break-word',
                      }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ab4cc', marginTop: '3px', textAlign: mine ? 'right' : 'left' }}>
                        {fmtTime(m.created_at)}
                        {mine && <span style={{ marginLeft: '4px' }}>{m.is_read ? ' ✓✓' : ' ✓'}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #c5d9ef', padding: '10px 16px', zIndex: 10 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pesan... (Enter kirim)"
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', border: '0.5px solid #c5d9ef', borderRadius: '20px',
              fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'sans-serif',
              maxHeight: '96px', overflowY: 'auto', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              background: !input.trim() || sending ? '#c5d9ef' : '#0C447C',
              color: '#fff', border: 'none', borderRadius: '50%',
              width: '42px', height: '42px', fontSize: '16px',
              cursor: !input.trim() || sending ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            ➤
          </button>
        </div>
      </div>
    </main>
  )
}
