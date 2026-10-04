/**
 * WHAT THIS FILE DOES
 * -------------------
 * The church-side end of the platform <-> church admin thread (the SaaS
 * operator ↔ your church's admin team). Shows the conversation and lets
 * an admin reply. Rendered on the Announcements page.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /api/platform-messages          → GET thread, POST reply
 * - backend /api/platform-messages/unread-count → badge number
 * - pages/announcements/Announcements.jsx   → host page
 *
 * Access: the backend allows only Super Admin, Pastor, and First Elder —
 * this card hides itself entirely on a 403 instead of showing an error.
 */
import { useState, useEffect, useCallback } from 'react'
import { MessagesSquare, Send, LifeBuoy } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const fmtTime = (ts) => new Date(ts).toLocaleString('en-KE', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
})

const PlatformMessagesCard = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [allowed, setAllowed] = useState(false)
  const [messages, setMessages] = useState([])
  const [unread, setUnread] = useState(0)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [msgRes, unreadRes] = await Promise.all([
        api.get('/platform-messages'),
        api.get('/platform-messages/unread-count'),
      ])
      setMessages(msgRes.data.data || [])
      setUnread(unreadRes.data.data?.n || 0)
      setAllowed(true)
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) return // not an admin role — hide
      // Any other error: also stay quiet; this card is a convenience, not a gate.
    }
  }, [api])

  useEffect(() => { load() }, [load])

  const send = async () => {
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      await api.post('/platform-messages', { body })
      setDraft('')
      await load()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send')
    } finally {
      setBusy(false)
    }
  }

  if (!allowed) return null

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-background)] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <LifeBuoy className="h-5 w-5 text-[var(--color-primary)]" />
          Messages from the platform team
          {unread > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-error)] text-[var(--color-on-solid)]">{unread}</span>
          )}
        </span>
        <span className="text-xs text-[var(--color-textSecondary)]">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] p-4">
          <p className="text-xs text-[var(--color-textSecondary)] mb-3">
            A direct line to the people who run Msabato — billing questions, incidents, or help requests. For church announcements see below.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
            {messages.map((m) => (
              <div key={m.id} className={`p-3 rounded-lg text-sm max-w-lg ${m.sender_type === 'platform' ? 'bg-[var(--color-primary-light)]' : 'bg-[var(--color-background)] ml-auto'}`}>
                <p className="text-[var(--color-text)] whitespace-pre-wrap">{m.body}</p>
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  {m.sender_type === 'platform' ? `Platform · ${m.sender_label}` : 'You'} · {fmtTime(m.created_at)}
                </p>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center py-6">
                <MessagesSquare className="h-8 w-8 mx-auto text-[var(--color-textSecondary)] mb-2" />
                <p className="text-sm text-[var(--color-textSecondary)]">No messages yet — say hello if you need a hand.</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder="Write to the platform team…"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text)]"
            />
            <button
              onClick={send}
              disabled={busy || !draft.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlatformMessagesCard
