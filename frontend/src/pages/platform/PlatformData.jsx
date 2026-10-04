import { useState, useEffect, useCallback } from 'react'
import { DatabaseBackup, HardDrive, GitBranch, CheckCircle, Play } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'

/**
 * §7 Data Management — backup registry, per-tenant storage, schema drift.
 */
const PlatformData = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [backups, setBackups] = useState([])
  const [storage, setStorage] = useState([])
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(true)
  const [backingUp, setBackingUp] = useState(false)

  const load = useCallback(async () => {
    try {
      const [b, s, v] = await Promise.all([
        api.get('/api/platform/data/backups'),
        api.get('/api/platform/data/storage'),
        api.get('/api/platform/data/schema'),
      ])
      setBackups(b.data.data || [])
      setStorage(s.data.data || [])
      setSchema(v.data.data)
    } catch {
      toast.error('Failed to load data management')
    } finally {
      setLoading(false)
    }
  }, [api, toast])

  useEffect(() => { load() }, [load])

  const restoreStaging = async (id) => {
    try {
      const res = await api.post(`/api/platform/data/backups/${id}/restore-staging`)
      toast.success(res.data.message || 'Restored into staging')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Restore failed')
    }
  }

  const verifyBackup = async (id) => {
    try {
      await api.post(`/api/platform/data/backups/${id}/verify`)
      toast.success('Backup marked verified')
      await load()
    } catch {
      toast.error('Failed to verify backup')
    }
  }

  const runBackup = async () => {
    setBackingUp(true)
    try {
      const res = await api.post('/api/platform/data/backups/run')
      toast.success(res.data.message || 'Backup complete')
      await load()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Backup failed')
    } finally {
      setBackingUp(false)
    }
  }

  if (loading) return <FullPageLoading message="Loading data management..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Data Management</h1>
        <p className="text-[var(--color-textSecondary)]">Backups, storage usage, and schema version across tenants.</p>
      </div>

      {schema && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2 flex items-center gap-2"><GitBranch className="h-5 w-5" /> Schema Version</h2>
          <p className="text-sm text-[var(--color-textSecondary)]">
            {schema.appliedCount} of {schema.availableCount} migrations applied
            {schema.pending.length > 0
              ? <span className="text-[var(--color-warning)]"> — pending: {schema.pending.join(', ')}</span>
              : ' — database is current'}
          </p>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2"><DatabaseBackup className="h-5 w-5" /> Backups</h2>
          <button onClick={runBackup} disabled={backingUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium disabled:opacity-50">
            <Play className="h-4 w-4" /> {backingUp ? 'Running pg_dump…' : 'Run backup now'}
          </button>
        </div>
        <p className="text-xs text-[var(--color-textSecondary)] mb-3">The scheduler takes a full pg_dump daily and keeps the newest 14. Small files are auto-flagged unverified.</p>
        <div className="space-y-2">
          {backups.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)] text-sm">
              <div>
                <p className="text-[var(--color-text)] font-medium">{b.scope} backup{b.church_name ? ` — ${b.church_name}` : ''}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">{fmtDateTime(b.created_at)}{b.size_bytes ? ` · ${(b.size_bytes / 1024 / 1024).toFixed(1)} MB` : ''}{b.file_path ? ` · ${b.file_path}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs ${b.status === 'verified' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : b.status === 'failed' ? 'bg-[var(--color-error-light)] text-[var(--color-error)]' : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'}`}>{b.status}</span>
                {b.status === 'completed' && (
                  <button onClick={() => verifyBackup(b.id)} className="inline-flex items-center gap-1 text-xs text-[var(--color-success)] hover:underline"><CheckCircle className="h-3 w-3" />verify</button>
                )}
                {['completed', 'verified'].includes(b.status) && (
                  <button onClick={() => restoreStaging(b.id)} className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">restore to staging</button>
                )}
              </div>
            </div>
          ))}
          {backups.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No backups recorded yet — the scheduler runs pg_dump daily, or use Run backup now.</p>}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2"><HardDrive className="h-5 w-5" /> Tenant Storage</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                <th className="pb-3 font-medium">Church</th>
                <th className="pb-3 font-medium">Members</th>
                <th className="pb-3 font-medium">Documents</th>
                <th className="pb-3 font-medium">Photos</th>
                <th className="pb-3 font-medium">Payments</th>
                <th className="pb-3 font-medium">Cap</th>
              </tr>
            </thead>
            <tbody>
              {storage.map((t) => (
                <tr key={t.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-3 text-[var(--color-text)]">{t.name}</td>
                  <td className="py-3 text-[var(--color-textSecondary)]">{t.member_count}</td>
                  <td className="py-3 text-[var(--color-textSecondary)]">{t.document_count}</td>
                  <td className="py-3 text-[var(--color-textSecondary)]">{t.photo_count}</td>
                  <td className="py-3 text-[var(--color-textSecondary)]">{t.payment_count}</td>
                  <td className="py-3 text-[var(--color-textSecondary)]">{t.storage_cap_mb ? `${t.storage_cap_mb} MB` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default PlatformData
