import { useState, useEffect, useCallback } from 'react'
import { Inbox, Bug, HeartHandshake, Send } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'

/**
 * §12 Support Operations — ticket inbox, known issues, tenant health scores.
 */
const TICKET_STATUS = {
  open: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  in_progress: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  waiting: 'bg-[var(--color-border)] text-[var(--color-textSecondary)]',
  resolved: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  closed: 'bg-[var(--color-border)] text-[var(--color-textSecondary)]',
}

const PlatformSupport = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('tickets')
  const [tickets, setTickets] = useState([])
  const [issues, setIssues] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState({})
  const [openTicket, setOpenTicket] = useState(null)
  const [messages, setMessages] = useState([])

  const load = useCallback(async () => {
    try {
      const [t, i, s] = await Promise.all([
        api.get('/api/platform/support/tickets'),
        api.get('/api/platform/support/known-issues'),
        api.get('/api/platform/support/health-scores'),
      ])
      setTickets(t.data.data || [])
      setIssues(i.data.data || [])
      setScores(s.data.data || [])
    } catch {
      toast.error('Failed to load support')
    } finally {
      setLoading(false)
    }
  }, [api, toast])

  useEffect(() => { load() }, [load])

  const openThread = async (ticket) => {
    setOpenTicket(ticket)
    try {
      const res = await api.get(`/api/platform/support/tickets/${ticket.id}/messages`)
      setMessages(res.data.data || [])
    } catch {
      setMessages([])
    }
  }

  const sendReply = async (id) => {
    const body = (reply[id] || '').trim()
    if (!body) return
    try {
      await api.post(`/api/platform/support/tickets/${id}/messages`, { body })
      setReply({ ...reply, [id]: '' })
      await openThread(openTicket)
      await load()
    } catch {
      toast.error('Reply failed')
    }
  }

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/api/platform/support/tickets/${id}`, { status })
      toast.success(`Ticket ${status}`)
      await load()
      if (openTicket?.id === id) setOpenTicket({ ...openTicket, status })
    } catch {
      toast.error('Failed to update ticket')
    }
  }

  if (loading) return <FullPageLoading message="Loading support..." />

  const tabCls = (t) => `px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-[var(--color-primary)] text-[var(--color-on-solid)]' : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`
  const scoreColor = (s) => s >= 75 ? 'text-[var(--color-success)]' : s >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Support Operations</h1>
          <p className="text-[var(--color-textSecondary)]">Tickets, known issues, and churches that need attention.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('tickets')} className={tabCls('tickets')}><Inbox className="h-4 w-4 inline mr-1" />Tickets ({tickets.filter((t) => t.status === 'open').length})</button>
          <button onClick={() => setTab('issues')} className={tabCls('issues')}><Bug className="h-4 w-4 inline mr-1" />Known Issues</button>
          <button onClick={() => setTab('health')} className={tabCls('health')}><HeartHandshake className="h-4 w-4 inline mr-1" />Health Scores</button>
        </div>
      </div>

      {tab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Inbox</h2>
            <div className="space-y-2">
              {tickets.map((t) => (
                <button key={t.id} onClick={() => openThread(t)} className={`w-full text-left p-3 rounded-lg ${openTicket?.id === t.id ? 'bg-[var(--color-primary-light)]' : 'bg-[var(--color-background)]'} hover:bg-[var(--color-primary-light)]`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text)] truncate">{t.subject}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TICKET_STATUS[t.status]}`}>{t.status}</span>
                  </div>
                  <p className="text-xs text-[var(--color-textSecondary)]">{t.church_name || 'no church'} · {t.priority} · {fmtDateTime(t.created_at)}</p>
                </button>
              ))}
              {tickets.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No tickets.</p>}
            </div>
          </Card>

          <Card className="p-6">
            {openTicket ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-[var(--color-text)]">{openTicket.subject}</h2>
                  <select value={openTicket.status} onChange={(e) => setStatus(openTicket.id, e.target.value)} className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] text-xs text-[var(--color-text)]">
                    {['open', 'in_progress', 'waiting', 'resolved', 'closed'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                  {messages.map((m) => (
                    <div key={m.id} className={`p-2 rounded text-sm ${m.author_type === 'platform' ? 'bg-[var(--color-primary-light)] ml-6' : 'bg-[var(--color-background)] mr-6'}`}>
                      <p className="text-[var(--color-text)]">{m.body}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">{m.author_type} · {fmtDateTime(m.created_at)}</p>
                    </div>
                  ))}
                  {messages.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No messages yet.</p>}
                </div>
                <div className="flex gap-2">
                  <input value={reply[openTicket.id] || ''} onChange={(e) => setReply({ ...reply, [openTicket.id]: e.target.value })} placeholder="Reply..." className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text)]" onKeyDown={(e) => e.key === 'Enter' && sendReply(openTicket.id)} />
                  <button onClick={() => sendReply(openTicket.id)} className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)]"><Send className="h-4 w-4" /></button>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--color-textSecondary)]">Select a ticket to view the thread.</p>
            )}
          </Card>
        </div>
      )}

      {tab === 'issues' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Known Issues</h2>
          <div className="space-y-2">
            {issues.map((i) => (
              <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)]">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{i.title}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">{i.severity} · affects {i.affected_tenants} tenant{i.affected_tenants === 1 ? '' : 's'}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${i.status === 'fixed' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'}`}>{i.status}</span>
              </div>
            ))}
            {issues.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No known issues tracked.</p>}
          </div>
        </Card>
      )}

      {tab === 'health' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Tenant Health Scores</h2>
          <p className="text-sm text-[var(--color-textSecondary)] mb-4">Score drops as a church goes quiet — reach out before they churn.</p>
          <div className="space-y-2">
            {scores.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)]">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{t.name}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    {t.members} members · last login {t.last_login ? fmtDateTime(t.last_login) : 'never'}{t.stuck_payments > 0 ? ` · ${t.stuck_payments} stuck payments` : ''}
                  </p>
                </div>
                <span className={`text-lg font-bold ${scoreColor(t.health_score)}`}>{t.health_score}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default PlatformSupport
