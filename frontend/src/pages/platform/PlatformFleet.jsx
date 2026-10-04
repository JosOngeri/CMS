import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertTriangle, Building2, Bell, Plug } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'

/**
 * §4.2 Fleet dashboard — every tenant at a glance: status, users,
 * activity, stuck payments, subscription.
 */
const PlatformFleet = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [fleet, setFleet] = useState([])
  const [alerts, setAlerts] = useState([])
  const [jobs, setJobs] = useState([])
  const [rules, setRules] = useState([])
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true)
    try {
      const [fleetRes, alertsRes, jobsRes, rulesRes, intRes] = await Promise.all([
        api.get('/api/platform/fleet'),
        api.get('/api/platform/alerts'),
        api.get('/api/platform/jobs'),
        api.get('/api/platform/alert-rules'),
        api.get('/api/platform/integrations'),
      ])
      setFleet(fleetRes.data.data || [])
      setAlerts((alertsRes.data.data || []).filter((a) => a.status === 'active'))
      setJobs(jobsRes.data.data || [])
      setRules(rulesRes.data.data || [])
      setIntegrations(intRes.data.data || [])
    } catch {
      toast.error('Failed to load fleet')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [api, toast])

  useEffect(() => { load(true) }, [load])

  const retryJob = async (id) => {
    try {
      await api.post(`/api/platform/jobs/${id}/retry`)
      toast.success('Job queued for retry')
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'queued' } : j)))
    } catch {
      toast.error('Retry failed')
    }
  }

  const resolveAlert = async (id) => {
    try {
      await api.post(`/api/platform/alerts/${id}/resolve`)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch {
      toast.error('Failed to resolve alert')
    }
  }

  const toggleRule = async (rule) => {
    try {
      await api.patch(`/api/platform/alert-rules/${rule.id}`, { enabled: !rule.enabled })
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)))
    } catch {
      toast.error('Failed to update rule')
    }
  }

  const toggleChannel = async (rule, channel) => {
    const current = Array.isArray(rule.notify_channels) ? rule.notify_channels : []
    const next = current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel]
    try {
      await api.patch(`/api/platform/alert-rules/${rule.id}`, { notifyChannels: next })
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, notify_channels: next } : r)))
    } catch {
      toast.error('Failed to update channels')
    }
  }

  const evaluateNow = async () => {
    try {
      const res = await api.post('/api/platform/alerts/evaluate')
      toast.success(res.data.message || 'Evaluation complete')
      await load(false)
    } catch {
      toast.error('Evaluation failed')
    }
  }

  const failedJobs = jobs.filter((j) => j.status === 'failed')

  if (loading) return <FullPageLoading message="Loading fleet..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Fleet & Infrastructure</h1>
          <p className="text-[var(--color-textSecondary)]">Every tenant at a glance.</p>
        </div>
        <button onClick={() => load(false)} disabled={refreshing} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="p-4 rounded-lg bg-[var(--color-warning-light)] text-[var(--color-warning)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium truncate">{a.message}</span>
              </div>
              <button onClick={() => resolveAlert(a.id)} className="shrink-0 px-3 py-1 rounded text-xs font-medium bg-[var(--color-surface)] text-[var(--color-text)]">Resolve</button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {fleet.map((t) => (
          <Card key={t.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-5 w-5 text-[var(--color-primary)] shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--color-text)] truncate">{t.name}</h3>
                  <p className="text-xs text-[var(--color-textSecondary)]">{t.slug}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {t.quarantined && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-error-light)] text-[var(--color-error)]">quarantined</span>}
                {!t.is_active && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-warning-light)] text-[var(--color-warning)]">suspended</span>}
                {t.is_active && !t.quarantined && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-success-light)] text-[var(--color-success)]">active</span>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-[var(--color-background)]">
                <p className="text-lg font-bold text-[var(--color-text)]">{t.member_count}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">members</p>
              </div>
              <div className="p-2 rounded bg-[var(--color-background)]">
                <p className="text-lg font-bold text-[var(--color-text)]">{t.active_users_7d}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">active 7d</p>
              </div>
              <div className="p-2 rounded bg-[var(--color-background)]">
                <p className={`text-lg font-bold ${t.stuck_payments > 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text)]'}`}>{t.stuck_payments}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">stuck pay</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--color-textSecondary)]">
              {t.subscription_status || t.subscription_tier || 'no plan'} · last payment {t.last_payment_at ? fmtDateTime(t.last_payment_at) : 'never'}
            </p>
          </Card>
        ))}
      </div>
      {fleet.length === 0 && <Card className="p-6 text-center text-[var(--color-textSecondary)]">No tenants yet</Card>}

      {/* Background jobs */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Background Jobs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                <th className="pb-3 font-medium">Job</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Last run</th>
                <th className="pb-3 font-medium">Error</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-3 text-[var(--color-text)] font-mono text-xs">{j.name}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${j.status === 'failed' ? 'bg-[var(--color-error-light)] text-[var(--color-error)]' : j.status === 'queued' ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' : 'bg-[var(--color-success-light)] text-[var(--color-success)]'}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="py-3 text-[var(--color-textSecondary)]">{j.last_run_at ? fmtDateTime(j.last_run_at) : '—'}</td>
                  <td className="py-3 text-[var(--color-textSecondary)] text-xs max-w-xs truncate" title={j.last_error}>{j.last_error || '—'}</td>
                  <td className="py-3">
                    {j.status === 'failed' && (
                      <button onClick={() => retryJob(j.id)} className="px-3 py-1 rounded border border-[var(--color-border)] text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)]">Retry</button>
                    )}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-[var(--color-textSecondary)]">No jobs recorded — workers report here once the job runner registers them.</td></tr>}
            </tbody>
          </table>
        </div>
        {failedJobs.length > 0 && <p className="mt-2 text-xs text-[var(--color-error)]">{failedJobs.length} failed job{failedJobs.length > 1 ? 's' : ''} need attention.</p>}
      </Card>

      {/* Integration health (4.4) */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2"><Plug className="h-5 w-5" /> Integration Health</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {integrations.map((i) => {
            const tone = i.status === 'green' ? 'bg-[var(--color-success)]' : i.status === 'amber' ? 'bg-[var(--color-warning)]' : i.status === 'red' ? 'bg-[var(--color-error)]' : 'bg-[var(--color-border)]'
            return (
              <div key={i.key} className="p-3 rounded-lg bg-[var(--color-background)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
                  <p className="text-sm font-medium text-[var(--color-text)]">{i.name}</p>
                </div>
                <p className="text-xs text-[var(--color-textSecondary)]">{i.detail || i.status}</p>
                {i.last_success_at && <p className="text-xs text-[var(--color-textSecondary)] mt-1">Last ok: {fmtDateTime(i.last_success_at)}</p>}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Alert rules */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2"><Bell className="h-5 w-5" /> Alert Rules</h2>
          <button onClick={evaluateNow} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)]">Evaluate now</button>
        </div>
        <p className="text-xs text-[var(--color-textSecondary)] mb-3">The scheduler evaluates enabled rules every 5 minutes. <code className="font-mono">%v</code> in a message is the measured value.</p>
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)]">
              <div className="min-w-0">
                <p className="text-sm text-[var(--color-text)]">
                  <span className="font-mono">{r.metric} {r.comparator} {r.threshold}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${r.severity === 'high' || r.severity === 'critical' ? 'bg-[var(--color-error-light)] text-[var(--color-error)]' : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'}`}>{r.severity}</span>
                </p>
                <p className="text-xs text-[var(--color-textSecondary)] truncate">{r.message}{r.last_fired_at ? ` · last fired ${fmtDateTime(r.last_fired_at)}` : ''}</p>
                <div className="flex gap-2 mt-1">
                  {['email', 'telegram'].map((ch) => {
                    const on = (r.notify_channels || []).includes(ch)
                    return (
                      <button key={ch} onClick={() => toggleChannel(r, ch)}
                        className={`px-2 py-0.5 rounded text-xs border ${on ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border)] text-[var(--color-textSecondary)]'}`}>
                        {ch}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button
                onClick={() => toggleRule(r)}
                className={`shrink-0 ml-3 relative w-10 h-5 rounded-full transition-colors ${r.enabled ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'}`}
                aria-label={`Toggle rule ${r.metric}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--color-surface)] transition-transform ${r.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
          {rules.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No alert rules.</p>}
        </div>
      </Card>
    </div>
  )
}

export default PlatformFleet
