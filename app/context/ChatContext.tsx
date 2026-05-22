'use client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

type ChatCtx = { unreadCount: number }
const ChatContext = createContext<ChatCtx>({ unreadCount: 0 })

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const uidRef = useRef<string | null>(null)

  async function refresh() {
    const uid = uidRef.current
    if (!uid) { setUnreadCount(0); return }

    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)

    if (!convs?.length) { setUnreadCount(0); return }

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convs.map(c => c.id))
      .eq('is_read', false)
      .neq('sender_id', uid)

    setUnreadCount(count ?? 0)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      uidRef.current = data.user?.id ?? null
      refresh()
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_e, session) => {
      uidRef.current = session?.user?.id ?? null
      refresh()
    })

    const channel = supabase
      .channel('chat-unread-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, refresh)
      .subscribe()

    return () => {
      authListener.subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  return <ChatContext.Provider value={{ unreadCount }}>{children}</ChatContext.Provider>
}

export function useChatContext() {
  return useContext(ChatContext)
}
