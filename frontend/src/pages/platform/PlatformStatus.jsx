import { useState, useEffect } from 'react'
import { Activity, CheckCircle, AlertTriangle, XCircle, Wrench } from 'lucide-react'
import Card from '../../components/common/Card'
import { fmtDateTime } from '../../utils/format'

/**
 * §11.3 Public status page — reachable without login at /status.
 * Reads the unauthenticated /api/platform/status endpoint.
 */
const STATUS_META = {
  operational: { icon: CheckCircle, label: 'All systems operational', cls: 'text-[var(--color-success)]' },
  degraded: { icon: AlertTriangle, label: 'Degraded performance', cls: 'text-[var(--color-warning)]' },
  major_outage: { icon: XCircle, label: 'Major outage', cls: 'text-[var(--color-error)]' },
  maintenance: { icon: Wrench, label: 'Scheduled maintenance', cls: 'text-[var(--color-warning)]' },
}
const COMPONENT_DOT = {
  operational: 'bg-[var(--color-success)]',
  degraded: 'bg-[var(--color-warning)]',
  major_outage: 'bg-[var(--color-error)]',
  maintenance: 'bg-[var(--color-warning)]',
}

const PlatformStatus = () => {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/platform/status')
        const json = await res.json()
        setStatus(json.data)
      } catch {
        setError(true)
      }
    }
    load()
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [])

  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <XCircle className="h-10 w-10 mx-auto text-[var(--color-error)] mb-3" />
      <h1 className="text-xl font-bold text-[var(--color-text)]">Status unavailable</h1>
      <p className="text-sm text-[var(--color-textSecondary)]">The platform may be down — try again shortly.</p>
    </div>
  )
  if (!status) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-[var(--color-textSecondary)]">Checking status…</div>

  const meta = STATUS_META[status.status] || STATUS_META.operational
  const Icon = meta.icon

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <div className="text-center">
        <Icon className={`h-12 w-12 mx-auto mb-3 ${meta.cls}`} />
        <h1 className={`text-2xl font-bold ${meta.cls}`}>{meta.label}</h1>
        <p className="text-xs text-[var(--color-textSecondary)] mt-1">Checked {fmtDateTime(status.checked_at)} — refreshes every minute</p>
      </div>

      {status.maintenance?.enabled && (
        <Card className="p-4 border-2 border-[var(--color-warning)]">
          <p className="text-sm font-medium text-[var(--color-warning)]">{status.maintenance.message || 'Scheduled maintenance in progress.'}</p>
          {status.maintenance.ends_at && <p className="text-xs text-[var(--color-textSecondary)] mt-1">Expected back: {fmtDateTime(status.maintenance.ends_at)}</p>}
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2"><Activity className="h-4 w-4" /> Components</h2>
        <div className="space-y-2">
          {status.components.map((c) => (
            <div key={c.name} className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text)]">{c.name}</span>
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${COMPONENT_DOT[c.status] || COMPONENT_DOT.operational}`} />
                <span className="text-xs text-[var(--color-textSecondary)] capitalize">{c.status.replace('_', ' ')}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">Recent incidents</h2>
        {status.incidents.length === 0 ? (
          <p className="text-sm text-[var(--color-textSecondary)]">No incidents reported.</p>
        ) : (
          <div className="space-y-2">
            {status.incidents.map((i, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text)]">{i.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${i.status === 'resolved' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-error-light)] text-[var(--color-error)]'}`}>
                  {i.status === 'resolved' ? `resolved ${fmtDateTime(i.resolved_at)}` : i.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default PlatformStatus
