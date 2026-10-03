import { useState, useEffect, useCallback } from 'react'
import { Megaphone, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'

/**
 * §11 Communication — broadcast announcements to church dashboards.
 */
const SEV = {
  info: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  critical: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
}

const PlatformComms = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', severity: 'info', target: 'all' })

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/platform/announcements')
      setItems(res.data.data || [])
    } catch {
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [api, toast])

  useEffect(() => { load() }, [load])

  const create = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/platform/announcements', form)
      toast.success('Announcement published to church dashboards')
      setForm({ title: '', body: '', severity: 'info', target: 'all' })
      setShowForm(false)
      await load()
    } catch {
      toast.error('Failed to publish')
    }
  }

  const toggle = async (id, isActive) => {
    try {
      await api.patch(`/api/platform/announcements/${id}`, { isActive })
      toast.success(isActive ? 'Announcement live' : 'Announcement hidden')
      await load()
    } catch {
      toast.error('Failed to update')
    }
  }

  if (loading) return <FullPageLoading message="Loading communication..." />

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text)]'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Communication</h1>
          <p className="text-[var(--color-textSecondary)]">Announcements churches see on their dashboards.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium">
          <Plus className="h-4 w-4" /> New announcement
        </button>
      </div>

      {showForm && (
        <Card className="p-6">
          <form onSubmit={create} className="space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className={inputCls} required />
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message — shown as a banner in church dashboards" rows={3} className={inputCls} required />
            <div className="flex gap-3">
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={inputCls}>
                <option value="info">info</option><option value="warning">warning</option><option value="critical">critical</option>
              </select>
              <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className={inputCls}>
                <option value="all">all churches</option><option value="admins">admins only</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium">Publish</button>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[var(--color-primary)]" />
                  <span className="font-semibold text-[var(--color-text)]">{a.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEV[a.severity]}`}>{a.severity}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text)]">{a.body}</p>
                <p className="mt-1 text-xs text-[var(--color-textSecondary)]">
                  {fmtDateTime(a.created_at)} · target: {a.target}{a.created_by_name ? ` · by ${a.created_by_name}` : ''}
                </p>
              </div>
              <button onClick={() => toggle(a.id, !a.is_active)} className={`shrink-0 px-3 py-1 rounded text-xs font-medium ${a.is_active ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-border)] text-[var(--color-textSecondary)]'}`}>
                {a.is_active ? 'live' : 'hidden'}
              </button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card className="p-6 text-center text-[var(--color-textSecondary)]">No announcements yet</Card>}
      </div>
    </div>
  )
}

export default PlatformComms
