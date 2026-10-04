import { useState, useEffect, useCallback } from 'react'
import { ScrollText, Search, Download, Fingerprint } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'
import { fmtDateTime } from '../../utils/format'

const inputCls = 'px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'

const PlatformAuditLog = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [logs, setLogs] = useState([])
  const [actions, setActions] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ action: '', actor: '', ip: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [showForensics, setShowForensics] = useState(false)
  const [forensics, setForensics] = useState(null)

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))

  useEffect(() => {
    api.get('/api/platform/audit-logs/actions')
      .then((res) => setActions(res.data.data || []))
      .catch(() => {})
  }, [api])

  useEffect(() => {
    const delay = setTimeout(async () => {
      try {
        setLoading(true)
        const response = await api.get('/api/platform/audit-logs', {
          params: { page, limit: 25, ...activeFilters }
        })
        setLogs(response.data.data?.logs || [])
        setPagination(response.data.data?.pagination || null)
      } catch (error) {
        console.error('Failed to fetch audit logs:', error)
        toast.error('Failed to load audit log')
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(delay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, page, filters, toast])

  const loadForensics = useCallback(async () => {
    try {
      const res = await api.get('/api/platform/audit-logs/forensics', {
        params: { ...(filters.from ? { from: filters.from } : {}), ...(filters.to ? { to: filters.to } : {}) }
      })
      setForensics(res.data.data)
    } catch {
      toast.error('Failed to load forensic view')
    }
  }, [api, filters.from, filters.to, toast])

  useEffect(() => {
    if (showForensics) loadForensics()
  }, [showForensics, loadForensics])

  const exportCsv = () => {
    const qs = new URLSearchParams(activeFilters).toString()
    window.open(`/api/platform/audit-logs/export${qs ? `?${qs}` : ''}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Platform Audit Log</h1>
          <p className="text-[var(--color-textSecondary)]">Every mutation made from this console is recorded here.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForensics((s) => !s)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]">
            <Fingerprint className="h-4 w-4" /> Forensics
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {showForensics && (
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'Top actors', rows: forensics?.byActor, render: (r) => <><span className="text-[var(--color-text)]">{r.actor}</span><span className="text-[var(--color-textSecondary)]">{r.events} events</span></> },
            { title: 'Top IPs', rows: forensics?.byIp, render: (r) => <><span className="text-[var(--color-text)]">{r.ip || 'unknown'}</span><span className="text-[var(--color-textSecondary)]">{r.events} events · {r.actors} actor(s)</span></> },
            { title: 'Top actions', rows: forensics?.byAction, render: (r) => <><span className="text-[var(--color-text)] font-mono text-xs">{r.action}</span><span className="text-[var(--color-textSecondary)]">{r.events}</span></> },
          ].map((col) => (
            <Card key={col.title} className="p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">{col.title}{filters.from || filters.to ? ' (filtered window)' : ' (all time)'}</h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {(col.rows || []).map((r, i) => (
                  <div key={i} className="flex justify-between gap-2 text-xs">{col.render(r)}</div>
                ))}
                {!col.rows && <p className="text-xs text-[var(--color-textSecondary)]">Loading...</p>}
                {col.rows?.length === 0 && <p className="text-xs text-[var(--color-textSecondary)]">No events in window.</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
            <input
              type="text"
              aria-label="Search audit actions"
              placeholder="Action contains..."
              value={filters.action}
              onChange={(e) => setFilter('action', e.target.value)}
              className={`${inputCls} w-full pl-10`}
            />
          </div>
          <input type="text" aria-label="Filter by actor" placeholder="Actor email/name" value={filters.actor} onChange={(e) => setFilter('actor', e.target.value)} className={inputCls} />
          <input type="text" aria-label="Filter by IP" placeholder="IP address" value={filters.ip} onChange={(e) => setFilter('ip', e.target.value)} className={inputCls} />
          <input type="date" aria-label="From date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className={inputCls} />
          <input type="date" aria-label="To date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className={inputCls} />
        </div>
        <div className="mt-3">
          <select
            aria-label="Filter by exact action"
            value={filters.action}
            onChange={(e) => setFilter('action', e.target.value)}
            className={inputCls}
          >
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </Card>

      <Card className="p-6">
        {loading ? (
          <FullPageLoading message="Loading audit log..." />
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">When</th>
                  <th className="pb-3 font-medium">Actor</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Resource</th>
                  <th className="pb-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 text-[var(--color-textSecondary)] whitespace-nowrap">{fmtDateTime(log.created_at)}</td>
                    <td className="py-3">
                      <p className="text-[var(--color-text)] font-medium">{log.actor_name || 'System'}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">{log.actor_email}</p>
                    </td>
                    <td className="py-3">
                      <code className="text-xs bg-[var(--color-background)] px-2 py-1 rounded text-[var(--color-text)]">{log.action}</code>
                    </td>
                    <td className="py-3 text-[var(--color-textSecondary)]">
                      {log.resource_type}{log.resource_id ? ` #${String(log.resource_id).slice(0, 8)}` : ''}
                    </td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={ScrollText} title="No audit entries" description="Platform actions will appear here as they happen." />
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-textSecondary)]">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)} className="rounded border border-[var(--color-border)] px-3 py-2 disabled:opacity-50">Previous</button>
              <button disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)} className="rounded border border-[var(--color-border)] px-3 py-2 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default PlatformAuditLog
