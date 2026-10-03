import { useState, useEffect, useCallback } from 'react'
import { HeartPulse, RefreshCw, Server, Database, Cpu, Clock, Activity } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'

const STATUS_STYLES = {
  healthy: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  degraded: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  down: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
}

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_STYLES[status] || STATUS_STYLES.degraded}`}>
    {status}
  </span>
)

const PlatformMonitoring = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchHealth = useCallback(async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true)
    try {
      const response = await api.get('/api/platform/health')
      setHealth(response.data.data)
    } catch (error) {
      console.error('Failed to fetch health:', error)
      toast.error('Failed to load health status')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [api, toast])

  useEffect(() => { fetchHealth(true) }, [fetchHealth])

  if (loading) return <FullPageLoading message="Checking platform health..." />
  if (!health) return null

  const live = health.live || {}
  const services = health.services || []

  const statusCard = (label, status, Icon, detail) => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[var(--color-text)]">
          <Icon className="h-5 w-5" />
          <h3 className="font-semibold">{label}</h3>
        </div>
        <StatusBadge status={status} />
      </div>
      {detail && <p className="text-sm text-[var(--color-textSecondary)]">{detail}</p>}
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">System Monitoring</h1>
          <p className="text-[var(--color-textSecondary)]">Live health checks across the platform.</p>
        </div>
        <button
          onClick={() => fetchHealth(false)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className={`p-4 rounded-lg flex items-center gap-3 ${STATUS_STYLES[health.overall] || STATUS_STYLES.degraded}`}>
        <HeartPulse className="h-5 w-5" />
        <span className="font-medium capitalize">Overall status: {health.overall}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statusCard('API Server', health.api, Server, `Node ${live.nodeVersion || 'unknown'} · uptime ${live.uptimeHours ?? '—'}h`)}
        {statusCard('Database', health.database, Database, live.dbLatencyMs != null ? `Query latency ${live.dbLatencyMs}ms` : 'No recent probe')}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Process Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Uptime', value: `${live.uptimeHours ?? '—'} h`, Icon: Clock },
            { label: 'Memory (RSS)', value: `${live.memoryMb ?? '—'} MB`, Icon: Cpu },
            { label: 'DB Latency', value: live.dbLatencyMs != null ? `${live.dbLatencyMs} ms` : '—', Icon: Activity },
            { label: 'Node', value: live.nodeVersion || '—', Icon: Server },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="p-4 rounded-lg bg-[var(--color-background)]">
              <Icon className="h-4 w-4 text-[var(--color-textSecondary)] mb-2" />
              <p className="text-xl font-bold text-[var(--color-text)]">{value}</p>
              <p className="text-xs text-[var(--color-textSecondary)]">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Service Checks</h2>
        {services.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">Service</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Response</th>
                  <th className="pb-3 font-medium">Error rate</th>
                  <th className="pb-3 font-medium">Last check</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => (
                  <tr key={svc.name} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 text-[var(--color-text)] font-medium capitalize">{svc.name}</td>
                    <td className="py-3"><StatusBadge status={svc.status} /></td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{svc.responseTime != null ? `${svc.responseTime} ms` : '—'}</td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{svc.errorRate != null ? `${svc.errorRate}%` : '—'}</td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{fmtDateTime(svc.lastCheck)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-textSecondary)]">
            No external service checks recorded yet. The API and database probes above run live every time this page loads.
          </p>
        )}
      </Card>
    </div>
  )
}

export default PlatformMonitoring
