import { useState, useEffect, useCallback } from 'react'
import { Megaphone, Plus, FileText } from 'lucide-react'
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
  const [templates, setTemplates] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', severity: 'info', target: 'all' })

  const load = useCallback(async () => {
    try {
      const [ann, tpl] = await Promise.all([
        api.get('/api/platform/announcements'),
        api.get('/api/platform/communication/templates').catch(() => ({ data: { data: [] } })),
      ])
      setItems(ann.data.data || [])
      setTemplates(tpl.data.data || [])
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

  const saveTemplate = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/api/platform/communication/templates/${editing.key}`, editing)
      toast.success(`Template '${editing.key}' saved`)
      setEditing(null)
      await load()
    } catch {
      toast.error('Failed to save template')
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

      {/* Message templates (11.4) */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2"><FileText className="h-5 w-5" /> Message Templates</h2>
        <p className="text-xs text-[var(--color-textSecondary)] mb-4">
          Reusable email/SMS bodies. Variables render at send time — e.g. {'{{church_name}}'}, {'{{invoice_number}}'}.
        </p>
        {editing ? (
          <form onSubmit={saveTemplate} className="space-y-3">
            <div className="flex items-center gap-3">
              <code className="px-2 py-1 rounded bg-[var(--color-background)] text-sm text-[var(--color-primary)]">{editing.key}</code>
              <select value={editing.channel} onChange={(e) => setEditing({ ...editing, channel: e.target.value })} className={inputCls}>
                <option value="email">email</option><option value="sms">sms</option>
              </select>
            </div>
            {editing.channel === 'email' && (
              <input value={editing.subject || ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} placeholder="Subject" className={inputCls} />
            )}
            <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={4} className={`${inputCls} font-mono text-xs`} required />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium">Save template</button>
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)]">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.key} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-[var(--color-background)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-medium text-[var(--color-primary)]">{t.key}</code>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-border)] text-[var(--color-textSecondary)]">{t.channel}</span>
                  </div>
                  {t.subject && <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">subject: {t.subject}</p>}
                  <p className="text-xs text-[var(--color-text)] mt-1 truncate">{t.body}</p>
                </div>
                <button onClick={() => setEditing({ key: t.key, channel: t.channel, subject: t.subject, body: t.body })} className="shrink-0 text-xs text-[var(--color-primary)] hover:underline">edit</button>
              </div>
            ))}
            {templates.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No templates seeded.</p>}
            <button
              onClick={() => {
                const key = window.prompt('New template key (a-z, 0-9, underscore):')
                if (key) setEditing({ key: key.trim().toLowerCase(), channel: 'email', subject: '', body: '' })
              }}
              className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
            >+ new template</button>
          </div>
        )}
      </Card>
    </div>
  )
}

export default PlatformComms
