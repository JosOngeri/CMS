import { useState, useEffect, useCallback } from 'react'
import { Siren, Plus, Ban } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'

/**
 * §8 Disaster & Incident — incident playbook + tenant quarantine.
 */
const STATUS_FLOW = ['open', 'investigating', 'monitoring', 'resolved']
const SEV_STYLE = {
  low: 'bg-[var(--color-border)] text-[var(--color-textSecondary)]',
  medium: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  high: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
  critical: 'bg-[var(--color-error)] text-[var(--color-on-solid)]',
}

const PlatformIncidents = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [incidents, setIncidents] = useState([])
  const [fleet, setFleet] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', summary: '', severity: 'medium' })
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    try {
      const [incRes, fleetRes] = await Promise.all([
        api.get('/api/platform/incidents'),
        api.get('/api/platform/fleet'),
      ])
      setIncidents(incRes.data.data || [])
      setFleet(fleetRes.data.data || [])
    } catch {
      toast.error('Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }, [api, toast])

  useEffect(() => { load() }, [load])

  const create = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/platform/incidents', form)
      toast.success('Incident opened')
      setForm({ title: '', summary: '', severity: 'medium' })
      setShowForm(false)
      await load()
    } catch {
      toast.error('Failed to create incident')
    }
  }

  const setStatus = async (id, status) => {
    try {
      const notes = status === 'resolved' ? window.prompt('Resolution notes:') : null
      await api.patch(`/api/platform/incidents/${id}`, { status, resolutionNotes: notes })
      toast.success(`Incident ${status}`)
      await load()
    } catch {
      toast.error('Failed to update incident')
    }
  }

  const toggleQuarantine = async (tenant) => {
    const reason = tenant.quarantined ? null : window.prompt('Quarantine reason (audit trail):')
    if (!tenant.quarantined && !reason) return
    try {
      await api.post(`/api/platform/tenants/${tenant.id}/quarantine`, { quarantined: !tenant.quarantined, reason })
      toast.success(tenant.quarantined ? 'Quarantine lifted' : 'Tenant quarantined')
      await load()
    } catch {
      toast.error('Failed to update quarantine')
    }
  }

  if (loading) return <FullPageLoading message="Loading incidents..." />

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text)]'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Incidents & Quarantine</h1>
          <p className="text-[var(--color-textSecondary)]">Open playbooks and isolate compromised tenants.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium">
          <Plus className="h-4 w-4" /> New incident
        </button>
      </div>

      {showForm && (
        <Card className="p-6">
          <form onSubmit={create} className="space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Incident title" className={inputCls} required />
            <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="What happened, impact, current state" rows={3} className={inputCls} />
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={inputCls}>
              {['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium">Open incident</button>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2"><Siren className="h-5 w-5" /> Incidents</h2>
        <div className="space-y-3">
          {incidents.map((i) => (
            <div key={i.id} className="p-4 rounded-lg bg-[var(--color-background)] flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEV_STYLE[i.severity]}`}>{i.severity}</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">{i.title}</span>
                </div>
                {i.summary && <p className="mt-1 text-xs text-[var(--color-textSecondary)]">{i.summary}</p>}
                <p className="mt-1 text-xs text-[var(--color-textSecondary)]">
                  opened {fmtDateTime(i.created_at)}{i.tenant_name ? ` · affects ${i.tenant_name}` : ''}{i.resolved_at ? ` · resolved ${fmtDateTime(i.resolved_at)}` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                {STATUS_FLOW.filter((s) => s !== i.status).map((s) => (
                  <button key={s} onClick={() => setStatus(i.id, s)} className="px-2 py-1 rounded border border-[var(--color-border)] text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)]">{s}</button>
                ))}
              </div>
            </div>
          ))}
          {incidents.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No incidents on record.</p>}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2"><Ban className="h-5 w-5" /> Tenant Quarantine</h2>
        <p className="text-sm text-[var(--color-textSecondary)] mb-4">Quarantined churches get a 503 on every API call — use for compromised or abusive tenants.</p>
        <div className="space-y-2">
          {fleet.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)]">
              <span className="text-sm text-[var(--color-text)]">{t.name}</span>
              <button
                onClick={() => toggleQuarantine(t)}
                className={`px-3 py-1 rounded text-xs font-medium ${t.quarantined ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-error-light)] text-[var(--color-error)]'}`}
              >
                {t.quarantined ? 'Lift quarantine' : 'Quarantine'}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default PlatformIncidents
