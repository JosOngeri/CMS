import { useState, useEffect } from 'react'
import { ScrollText, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'
import { fmtDateTime } from '../../utils/format'

const PlatformAuditLog = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [logs, setLogs] = useState([])
  const [actions, setActions] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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
          params: {
            page,
            limit: 25,
            ...(actionFilter ? { action: actionFilter } : {}),
            ...(search ? { action: search } : {}),
          }
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
  }, [api, page, actionFilter, search, toast])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Platform Audit Log</h1>
        <p className="text-[var(--color-textSecondary)]">Every mutation made from this console is recorded here.</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
            <input
              type="text"
              aria-label="Search audit actions"
              placeholder="Search actions (e.g. tenant, login, settings)..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActionFilter(''); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <select
            aria-label="Filter by action"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setSearch(''); setPage(1) }}
            className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
