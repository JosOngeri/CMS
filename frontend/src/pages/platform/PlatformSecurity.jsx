import { useState, useEffect, useCallback } from 'react'
import { Ban, Lock, KeyRound, FileWarning, Eye, MonitorSmartphone, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'

/**
 * §6 Security & Compliance — failed logins, lockouts, active
 * impersonations, IP rules, credential rotation, data requests.
 */
const PlatformSecurity = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [credentials, setCredentials] = useState([])
  const [requests, setRequests] = useState([])
  const [sessions, setSessions] = useState([])
  const [permAudit, setPermAudit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newRule, setNewRule] = useState({ cidr: '', mode: 'deny', reason: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [sec, creds, reqs, sess, perms] = await Promise.all([
        api.get('/api/platform/security'),
        api.get('/api/platform/security/credentials'),
        api.get('/api/platform/security/data-requests'),
        api.get('/api/platform/auth/sessions/all'),
        api.get('/api/platform/security/permission-audit'),
      ])
      setData(sec.data.data)
      setCredentials(creds.data.data || [])
      setRequests(reqs.data.data || [])
      setSessions(sess.data.data || [])
      setPermAudit(perms.data.data || null)
    } catch {
      toast.error('Failed to load security center')
    } finally {
      setLoading(false)
    }
  }, [api, toast])

  useEffect(() => { load() }, [load])

  const addRule = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/api/platform/security/ip-rules', newRule)
      toast.success('IP rule added')
      setNewRule({ cidr: '', mode: 'deny', reason: '' })
      await load()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add rule')
    } finally {
      setBusy(false)
    }
  }

  const removeRule = async (id) => {
    try {
      await api.delete(`/api/platform/security/ip-rules/${id}`)
      toast.success('Rule removed')
      await load()
    } catch {
      toast.error('Failed to remove rule')
    }
  }

  const revokeAllForUser = async (userId, name) => {
    try {
      const res = await api.post(`/api/platform/auth/users/${userId}/revoke-sessions`)
      toast.success(res.data.message || `All sessions revoked for ${name}`)
      load()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to revoke sessions')
    }
  }

  const revokeSession = async (id) => {
    try {
      await api.post(`/api/platform/auth/sessions/${id}/revoke`)
      toast.success('Session revoked')
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to revoke session')
    }
  }

  if (loading || !data) return <FullPageLoading message="Loading security center..." />

  const inputCls = 'px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text)]'
  const sectionCls = 'text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Security Center</h1>
        <p className="text-[var(--color-textSecondary)]">Threats, lockouts, impersonations, and rotation status across the platform.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className={sectionCls}><Lock className="h-5 w-5" /> Failed Logins & Lockouts</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.lockedUsers.map((u) => (
              <div key={u.email} className="flex items-center justify-between p-2 rounded bg-[var(--color-error-light)] text-sm">
                <span className="text-[var(--color-text)]">{u.email} <span className="text-xs text-[var(--color-textSecondary)]">({u.church_name})</span></span>
                <span className="text-xs text-[var(--color-error)]">until {fmtDateTime(u.locked_until)}</span>
              </div>
            ))}
            {data.failedLogins.map((u) => (
              <div key={u.email} className="flex items-center justify-between p-2 rounded bg-[var(--color-background)] text-sm">
                <span className="text-[var(--color-text)]">{u.email} <span className="text-xs text-[var(--color-textSecondary)]">({u.church_name})</span></span>
                <span className="text-xs text-[var(--color-warning)]">{u.failed_login_attempts} attempts</span>
              </div>
            ))}
            {data.lockedUsers.length === 0 && data.failedLogins.length === 0 && (
              <p className="text-sm text-[var(--color-textSecondary)]">No failed logins or locked accounts — quiet.</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className={sectionCls}><MonitorSmartphone className="h-5 w-5" /> Platform Sessions</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-[var(--color-background)] text-sm">
                <div className="min-w-0">
                  <p className="text-[var(--color-text)] truncate">{s.name || s.email}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">{s.ip || '?'} · since {fmtDateTime(s.created_at)}</p>
                </div>
                <div className="shrink-0 flex gap-3">
                  <button onClick={() => revokeSession(s.id)} className="text-xs text-[var(--color-error)] hover:underline">revoke</button>
                  <button onClick={() => revokeAllForUser(s.platform_user_id, s.name || s.email)} className="text-xs text-[var(--color-error)] hover:underline">revoke all</button>
                </div>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No active platform sessions.</p>}
          </div>
        </Card>

        {/* Permission audit (6.7) */}
        {permAudit && (
          <Card className="p-6">
            <h2 className={sectionCls}><ShieldCheck className="h-5 w-5" /> Permission Audit</h2>
            <p className="text-xs text-[var(--color-textSecondary)] mb-3">Effective access per staff member. Warnings flag drift — owner-only powers held by non-owners, or permissions outside the catalog.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {permAudit.users.map((u) => (
                <div key={u.id} className="p-3 rounded-lg bg-[var(--color-background)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-[var(--color-text)] font-medium">{u.name || u.email}
                      <span className="ml-2 text-xs text-[var(--color-textSecondary)]">{u.role} · {u.permissions_source}</span>
                    </p>
                    <div className="flex gap-1.5">
                      {u.mfa_enabled && <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-success-light)] text-[var(--color-success)]">MFA</span>}
                      {!u.is_active && <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-error-light)] text-[var(--color-error)]">disabled</span>}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1 font-mono break-all">{u.effective.join(', ')}</p>
                  {u.warnings.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {u.warnings.map((w) => <p key={w} className="text-xs text-[var(--color-warning)]">⚠ {w}</p>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className={sectionCls}><Eye className="h-5 w-5" /> Active Impersonations</h2>
          <div className="space-y-2">
            {data.activeImpersonations.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-[var(--color-warning-light)] text-sm">
                <span className="text-[var(--color-text)]">{s.operator} → {s.church_name}</span>
                <span className="text-xs text-[var(--color-warning)]">{s.mode} · ends {fmtDateTime(s.expires_at)}</span>
              </div>
            ))}
            {data.activeImpersonations.length === 0 && (
              <p className="text-sm text-[var(--color-textSecondary)]">No active impersonation sessions.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className={sectionCls}><Ban className="h-5 w-5" /> IP Rules</h2>
        <form onSubmit={addRule} className="flex flex-wrap gap-2 mb-4">
          <input value={newRule.cidr} onChange={(e) => setNewRule({ ...newRule, cidr: e.target.value })} placeholder="IP or CIDR, e.g. 41.90.0.0/16" className={`${inputCls} flex-1 min-w-[200px]`} required />
          <select value={newRule.mode} onChange={(e) => setNewRule({ ...newRule, mode: e.target.value })} className={inputCls}>
            <option value="deny">deny</option>
            <option value="allow">allow</option>
          </select>
          <input value={newRule.reason} onChange={(e) => setNewRule({ ...newRule, reason: e.target.value })} placeholder="Reason" className={`${inputCls} flex-1 min-w-[160px]`} />
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium disabled:opacity-50">Add rule</button>
        </form>
        <div className="space-y-2">
          {data.ipRules.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-2 rounded bg-[var(--color-background)] text-sm">
              <span className="font-mono text-[var(--color-text)]">{r.cidr}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${r.mode === 'deny' ? 'bg-[var(--color-error-light)] text-[var(--color-error)]' : 'bg-[var(--color-success-light)] text-[var(--color-success)]'}`}>{r.mode}</span>
              <span className="text-xs text-[var(--color-textSecondary)] flex-1 ml-3">{r.reason}</span>
              <button onClick={() => removeRule(r.id)} className="text-xs text-[var(--color-error)] hover:underline">remove</button>
            </div>
          ))}
          {data.ipRules.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No IP rules — all addresses allowed.</p>}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className={sectionCls}><KeyRound className="h-5 w-5" /> Credential Rotations</h2>
          <div className="space-y-2">
            {credentials.map((c) => (
              <div key={c.id} className={`flex items-center justify-between p-2 rounded text-sm ${c.overdue ? 'bg-[var(--color-error-light)]' : 'bg-[var(--color-background)]'}`}>
                <div>
                  <p className="font-mono text-[var(--color-text)]">{c.secret_name}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">{c.notes}</p>
                </div>
                <div className="text-right">
                  {c.overdue && <span className="text-xs font-medium text-[var(--color-error)]">OVERDUE</span>}
                  <p className="text-xs text-[var(--color-textSecondary)]">{c.last_rotated_at ? `rotated ${fmtDateTime(c.last_rotated_at)}` : 'never rotated'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className={sectionCls}><FileWarning className="h-5 w-5" /> Data Requests</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded bg-[var(--color-background)] text-sm">
                <span className="text-[var(--color-text)]">{r.request_type} <span className="text-xs text-[var(--color-textSecondary)]">— {r.church_name}</span></span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === 'fulfilled' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'}`}>{r.status}</span>
              </div>
            ))}
            {requests.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No data-protection requests logged.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default PlatformSecurity
