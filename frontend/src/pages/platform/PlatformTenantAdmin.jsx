import { useState, useEffect, useCallback } from 'react'
import { UserCog, KeyRound, ToggleLeft, Gauge, Eye, ShieldAlert, CheckCircle, CalendarClock, ListChecks, Settings2, Download, ShieldOff, Zap, LayoutTemplate } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'

/**
 * §2 Tenant Administration — reach into a church to fix accounts, limits,
 * and config. Church picker on top; the four panels below operate on the
 * selected tenant. Impersonation sets the church `jwt` cookie server-side
 * — open the app in a new tab to view as that user.
 */
const PlatformTenantAdmin = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [tenants, setTenants] = useState([])
  const [churchId, setChurchId] = useState('')
  const [users, setUsers] = useState([])
  const [flags, setFlags] = useState([])
  const [quotas, setQuotas] = useState(null)
  const [settingsText, setSettingsText] = useState('')
  const [tenantSessions, setTenantSessions] = useState([])
  const [benchmarks, setBenchmarks] = useState(null)
  const [rateLimit, setRateLimit] = useState(null)
  const [rateLimitForm, setRateLimitForm] = useState({ maxRequests: '', windowSeconds: 60 })
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const loadTenants = useCallback(async () => {
    try {
      const response = await api.get('/api/platform/tenants')
      const rows = response.data.data?.tenants || response.data.data || []
      setTenants(rows)
      if (rows.length && !churchId) setChurchId(String(rows[0].id))
    } catch {
      toast.error('Failed to load churches')
    } finally {
      setLoading(false)
    }
  }, [api, toast, churchId])

  const loadTenant = useCallback(async (id) => {
    if (!id) return
    try {
      const [usersRes, flagsRes, quotasRes, sessRes, benchRes, rlRes, tplRes] = await Promise.all([
        api.get(`/api/platform/tenants/${id}/users`),
        api.get(`/api/platform/tenants/${id}/flags`),
        api.get(`/api/platform/tenants/${id}/quotas`),
        api.get(`/api/platform/tenants/${id}/sessions`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/platform/tenants/${id}/benchmarks`).catch(() => ({ data: { data: null } })),
        api.get(`/api/platform/tenants/${id}/rate-limit`).catch(() => ({ data: { data: null } })),
        api.get('/api/platform/tenant-templates').catch(() => ({ data: { data: [] } })),
      ])
      setUsers(usersRes.data.data || [])
      setFlags(flagsRes.data.data || [])
      setQuotas(quotasRes.data.data || null)
      setTenantSessions(sessRes.data.data || [])
      setBenchmarks(benchRes.data.data || null)
      setRateLimit(rlRes.data.data || null)
      setTemplates(tplRes.data.data || [])
    } catch {
      toast.error('Failed to load tenant details')
    }
  }, [api, toast])

  useEffect(() => { loadTenants() }, [loadTenants])
  useEffect(() => { loadTenant(churchId) }, [churchId, loadTenant])

  const act = async (key, fn, successMsg) => {
    setBusy(key)
    try {
      const result = await fn()
      if (successMsg) toast.success(successMsg)
      return result
    } catch (error) {
      toast.error(error.response?.data?.error || 'Action failed')
      return null
    } finally {
      setBusy('')
    }
  }

  const resetAdmin = (userId) => act(`reset-${userId}`, async () => {
    const res = await api.post(`/api/platform/tenants/${churchId}/reset-admin`, { userId })
    const temp = res.data.data?.temporaryPassword
    if (temp) toast.success(`Temporary password: ${temp} — copy it now, it won't show again`, { duration: 15000 })
    await loadTenant(churchId)
  })

  const impersonate = (userId, mode) => act(`imp-${userId}`, async () => {
    const reason = window.prompt('Reason for impersonation (goes in the audit trail):')
    if (!reason || reason.trim().length < 5) {
      toast.error('Impersonation cancelled — a reason of at least 5 characters is required')
      return
    }
    await api.post(`/api/platform/tenants/${churchId}/impersonate`, { userId, mode, reason: reason.trim() })
    toast.success('Impersonation started — open the church app in a NEW TAB to view as this user')
    window.open('/dashboard/overview', '_blank', 'noopener')
  })

  const toggleFlag = (flag, enabled) => act(`flag-${flag}`, async () => {
    await api.put(`/api/platform/tenants/${churchId}/flags`, { flag, enabled })
    setFlags((prev) => prev.map((f) => (f.flag === flag ? { ...f, enabled } : f)))
  }, `Flag ${flag} ${enabled ? 'enabled' : 'disabled'}`)

  const saveQuota = (field, value) => act(`quota-${field}`, async () => {
    await api.put(`/api/platform/tenants/${churchId}/quotas`, { [field]: value === '' ? null : Number(value) })
    setQuotas((prev) => ({ ...prev, [field]: value === '' ? null : Number(value) }))
  }, 'Quota saved')

  const toggleOnboardingStep = (step, done) => act(`onb-${step}`, async () => {
    await api.put(`/api/platform/tenants/${churchId}/onboarding`, { [step]: done })
    setTenants((prev) => prev.map((t) => String(t.id) === churchId ? { ...t, onboarding_state: { ...(t.onboarding_state || {}), [step]: done } } : t))
  }, 'Onboarding updated')

  const extendTrial = (days) => act('trial', async () => {
    await api.post(`/api/platform/tenants/${churchId}/trial`, { days })
    await loadTenants()
  }, `Trial extended ${days} days`)

  const endTrial = () => act('trial', async () => {
    if (!window.confirm('End this church\'s trial now?')) return
    await api.post(`/api/platform/tenants/${churchId}/trial`, { end: true })
    await loadTenants()
  }, 'Trial ended')

  const applySettings = () => act('settings', async () => {
    let parsed
    try {
      parsed = JSON.parse(settingsText)
    } catch {
      toast.error('Invalid JSON — fix the settings object first')
      return
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      toast.error('Settings must be a JSON object')
      return
    }
    await api.put(`/api/platform/tenants/${churchId}/settings`, { settings: parsed })
    await loadTenants()
  }, 'Settings pushed to tenant')

  const toggleDemo = () => act('demo', async () => {
    const next = !tenant?.is_demo
    if (next && !window.confirm(`Mark ${tenant?.name} as a DEMO tenant? Demo tenants can be bulk-purged.`)) return
    const res = await api.patch(`/api/platform/tenants/${churchId}/demo`, { isDemo: next })
    toast.success(res.data.message || 'Demo flag updated')
    await loadTenants()
  }, null)

  const revokeUserSessions = (userId, email) => act(`sess-${userId}`, async () => {
    if (!window.confirm(`Force-logout ${email}? All their sessions are revoked.`)) return
    await api.post(`/api/platform/tenants/${churchId}/users/${userId}/revoke-sessions`)
    await loadTenant(churchId)
  }, `Sessions revoked`)

  const offboard = () => act('offboard', async () => {
    const reason = window.prompt('Offboarding reason (audit-logged):')
    if (!reason || reason.trim().length < 5) return toast.error('Reason of 5+ characters required')
    const days = window.prompt('Keep data for how many days before purge is allowed?', '30')
    if (days === null) return
    if (!window.confirm(`Offboard ${tenant?.name}? The church is deactivated NOW; data is kept ${days} days.`)) return
    await api.post(`/api/platform/tenants/${churchId}/offboard`, { reason: reason.trim(), retentionDays: Number(days) || 30 })
    await loadTenants()
  }, 'Tenant offboarded')

  const purge = () => act('purge', async () => {
    if (!window.confirm(`PERMANENTLY DELETE ${tenant?.name} and all its data? This cannot be undone.`)) return
    if (!window.confirm('Are you absolutely sure? Export the tenant first if you need the data.')) return
    const res = await api.post(`/api/platform/tenants/${churchId}/purge`)
    toast.success(res.data.message || 'Tenant purged')
    setChurchId('')
  }, null)

  const saveRateLimit = () => act('ratelimit', async () => {
    await api.put(`/api/platform/tenants/${churchId}/rate-limit`, {
      maxRequests: Number(rateLimitForm.maxRequests),
      windowSeconds: Number(rateLimitForm.windowSeconds) || 60,
    })
    await loadTenant(churchId)
  }, 'Rate limit saved')

  const removeRateLimit = () => act('ratelimit', async () => {
    await api.delete(`/api/platform/tenants/${churchId}/rate-limit`)
    await loadTenant(churchId)
  }, 'Override removed — global limit applies')

  const captureTemplate = () => act('tpl-capture', async () => {
    const name = window.prompt('Template name:', `${tenant?.name} structure`)
    if (!name) return
    const res = await api.post('/api/platform/tenant-templates', { name, sourceChurchId: churchId })
    toast.success(res.data.message || 'Template captured')
    await loadTenant(churchId)
  }, null)

  const applyTemplate = () => act('tpl-apply', async () => {
    if (!templateId) return toast.error('Pick a template first')
    const res = await api.post(`/api/platform/tenants/${churchId}/apply-template`, { templateId: Number(templateId) })
    toast.success(res.data.message || 'Template applied')
  }, null)

  if (loading) return <FullPageLoading message="Loading tenant administration..." />

  const tenant = tenants.find((t) => String(t.id) === churchId)
  const onboarding = tenant?.onboarding_state || {}
  const trialDaysLeft = tenant?.trial_ends_at ? Math.ceil((new Date(tenant.trial_ends_at) - Date.now()) / 86400000) : null
  const ONBOARDING_STEPS = [
    ['logo_uploaded', 'Logo uploaded'],
    ['members_imported', 'Members imported'],
    ['mpesa_configured', 'M-Pesa configured'],
    ['first_service', 'First service scheduled'],
    ['first_user_invited', 'First user invited'],
  ]

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] text-sm'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Tenant Administration</h1>
          <p className="text-[var(--color-textSecondary)]">Administer users, feature flags, and quotas inside a church.</p>
        </div>
        <div className="flex items-center gap-2">
          {churchId && (
            <button
              onClick={toggleDemo}
              disabled={busy === 'demo'}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${tenant?.is_demo ? 'border-[var(--color-warning)] text-[var(--color-warning)] bg-[var(--color-warning-light)]' : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`}
              title="Demo tenants are disposable test data and can be bulk-purged"
            >
              {tenant?.is_demo ? 'Demo ✓' : 'Mark demo'}
            </button>
          )}
          {churchId && (
            <a
              href={`/api/platform/tenants/${churchId}/export`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]"
              title="Download full tenant data as JSON (owner-only)"
            >
              <Download className="h-4 w-4" /> Export
            </a>
          )}
          <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className={`${inputCls} max-w-xs`} aria-label="Select church">
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Users + actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <UserCog className="h-5 w-5" /> Users
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Last login</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-3">
                    <p className="text-[var(--color-text)] font-medium">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">{u.email}</p>
                  </td>
                  <td className="py-3 text-[var(--color-textSecondary)] capitalize">{u.role || '—'}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.locked_until && new Date(u.locked_until) > new Date() ? 'bg-[var(--color-error-light)] text-[var(--color-error)]' : u.is_active ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'}`}>
                      {u.locked_until && new Date(u.locked_until) > new Date() ? 'Locked' : u.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {u.mfa_enabled && <span className="ml-1 text-xs text-[var(--color-textSecondary)]">MFA</span>}
                  </td>
                  <td className="py-3 text-[var(--color-textSecondary)]">{u.last_login ? fmtDateTime(u.last_login) : 'Never'}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => resetAdmin(u.id)} disabled={busy === `reset-${u.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-border)] text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-50">
                        <KeyRound className="h-3 w-3" /> Reset password
                      </button>
                      <button onClick={() => impersonate(u.id, 'readonly')} disabled={busy === `imp-${u.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-border)] text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-50" title="Read-only view as this user">
                        <Eye className="h-3 w-3" /> View as
                      </button>
                      <button onClick={() => impersonate(u.id, 'full')} disabled={busy === `imp-${u.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-warning)] text-xs text-[var(--color-warning)] hover:bg-[var(--color-warning-light)] disabled:opacity-50" title="Full impersonation — can make changes">
                        <ShieldAlert className="h-3 w-3" /> Full
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-[var(--color-textSecondary)]">No users in this church</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature flags */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <ToggleLeft className="h-5 w-5" /> Feature Flags
          </h2>
          <div className="space-y-3">
            {flags.map((f) => (
              <label key={f.flag} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)] cursor-pointer">
                <span className="text-sm font-medium text-[var(--color-text)] capitalize">{f.flag.replace('_', ' ')}</span>
                <button
                  type="button"
                  onClick={() => toggleFlag(f.flag, !f.enabled)}
                  disabled={busy === `flag-${f.flag}`}
                  className={`relative w-10 h-5 rounded-full transition-colors ${f.enabled ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'}`}
                  aria-label={`Toggle ${f.flag}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${f.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
            ))}
          </div>
        </Card>

        {/* Quotas */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5" /> Limits & Quotas
          </h2>
          {quotas && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-textSecondary)]">Members now: <strong>{quotas.member_count}</strong> · blank = unlimited</p>
              {[
                { field: 'member_cap', label: 'Member cap' },
                { field: 'sms_credits', label: 'SMS credits' },
                { field: 'storage_cap_mb', label: 'Storage (MB)' },
                { field: 'admin_seats', label: 'Admin seats' },
              ].map(({ field, label }) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-[var(--color-text)]">{label}</span>
                  <input
                    type="number" min="0" defaultValue={quotas[field] ?? ''}
                    onBlur={(e) => e.target.value !== String(quotas[field] ?? '') && saveQuota(field, e.target.value)}
                    className={inputCls} placeholder="unlimited"
                  />
                </div>
              ))}
              <p className="text-xs text-[var(--color-textSecondary)] flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Saves on blur</p>
            </div>
          )}
        </Card>
      </div>

      {/* Lifecycle: onboarding + trial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> Onboarding Checklist
          </h2>
          <div className="space-y-2">
            {ONBOARDING_STEPS.map(([step, label]) => (
              <label key={step} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-background)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onboarding[step] === true}
                  disabled={busy === `onb-${step}`}
                  onChange={(e) => toggleOnboardingStep(step, e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className={`text-sm ${onboarding[step] === true ? 'text-[var(--color-textSecondary)] line-through' : 'text-[var(--color-text)]'}`}>{label}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Trial
          </h2>
          {trialDaysLeft === null ? (
            <p className="text-sm text-[var(--color-textSecondary)] mb-4">No trial set for this church.</p>
          ) : trialDaysLeft > 0 ? (
            <p className="text-sm text-[var(--color-text)] mb-4">
              Trial ends <strong>{fmtDateTime(tenant.trial_ends_at)}</strong> — <strong className={trialDaysLeft <= 7 ? 'text-[var(--color-warning)]' : ''}>{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left</strong>
            </p>
          ) : (
            <p className="text-sm text-[var(--color-error)] mb-4">Trial expired {fmtDateTime(tenant.trial_ends_at)}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => extendTrial(14)} disabled={busy === 'trial'} className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-50">+14 days</button>
            <button onClick={() => extendTrial(30)} disabled={busy === 'trial'} className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-50">+30 days</button>
            <button onClick={endTrial} disabled={busy === 'trial'} className="px-3 py-2 rounded-lg border border-[var(--color-error)] text-sm text-[var(--color-error)] hover:bg-[var(--color-error-light)] disabled:opacity-50">End trial</button>
          </div>
        </Card>
      </div>

      {/* Benchmarks (10.5) + tenant sessions (6.4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {benchmarks && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
              <Gauge className="h-5 w-5" /> Benchmarks
            </h2>
            <p className="text-xs text-[var(--color-textSecondary)] mb-4">Percentile rank vs all other active churches — 90 means &quot;ahead of 90% of the fleet&quot;.</p>
            <div className="space-y-3">
              {[
                ['members', 'Members'],
                ['users', 'User accounts'],
                ['engagement_30d', '30-day engagement'],
                ['payment_volume_90d', 'Payment volume (90d)'],
                ['events', 'Events'],
              ].map(([key, label]) => {
                const m = benchmarks.vs_active_churches?.[key]
                if (!m) return null
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--color-text)]">{label}</span>
                      <span className="text-[var(--color-textSecondary)]">{m.value.toLocaleString()} · P{m.percentile}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-background)] overflow-hidden">
                      <div className={`h-full rounded-full ${m.percentile >= 50 ? 'bg-[var(--color-success)]' : m.percentile >= 25 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-error)]'}`} style={{ width: `${Math.max(m.percentile, 2)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> User Sessions
          </h2>
          <p className="text-xs text-[var(--color-textSecondary)] mb-4">Refresh-token sessions. Revoking forces the user to log in again on next token refresh.</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(() => {
              const byUser = {}
              tenantSessions.forEach((s) => {
                if (!byUser[s.user_id]) byUser[s.user_id] = { email: s.email, role: s.role, active: 0, total: 0 }
                byUser[s.user_id].total += 1
                if (s.status === 'active') byUser[s.user_id].active += 1
              })
              const entries = Object.entries(byUser)
              return entries.length === 0
                ? <p className="text-sm text-[var(--color-textSecondary)]">No sessions recorded.</p>
                : entries.map(([uid, u]) => (
                  <div key={uid} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--color-background)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{u.email}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">{u.role} · {u.active} active / {u.total} total</p>
                    </div>
                    {u.active > 0 && (
                      <button onClick={() => revokeUserSessions(uid, u.email)} disabled={busy === `sess-${uid}`} className="text-xs text-[var(--color-error)] hover:underline disabled:opacity-50">force logout</button>
                    )}
                  </div>
                ))
            })()}
          </div>
        </Card>
      </div>

      {/* Config override (2.5) */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
          <Settings2 className="h-5 w-5" /> Settings Override
        </h2>
        <p className="text-xs text-[var(--color-textSecondary)] mb-3">
          Merges into the church&apos;s settings JSON — use to repair a broken config or push a fix.
          Changed keys are audit-logged. Current tier: <strong className="text-[var(--color-text)]">{tenant?.subscription_tier || 'basic'}</strong>
        </p>
        <textarea
          value={settingsText}
          onChange={(e) => setSettingsText(e.target.value)}
          placeholder='{"subscription_tier": "professional", "contact_email": "admin@church.org"}'
          rows={4}
          className={`${inputCls} font-mono mb-3`}
        />
        <button onClick={applySettings} disabled={busy === 'settings' || !settingsText.trim()} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium disabled:opacity-50">
          {busy === 'settings' ? 'Pushing…' : 'Merge & push'}
        </button>
      </Card>

      {/* Offboarding lifecycle (1.5) */}
      <Card className="p-6 border-2 border-[var(--color-error-light)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
          <ShieldOff className="h-5 w-5" /> Offboarding &amp; Deletion
        </h2>
        {tenant?.offboarded_at ? (
          <>
            <p className="text-sm text-[var(--color-text)] mb-1">
              Offboarded {fmtDateTime(tenant.offboarded_at)} — {tenant.offboard_reason}
            </p>
            <p className="text-xs text-[var(--color-textSecondary)] mb-4">
              Data retained until <strong className="text-[var(--color-warning)]">{fmtDateTime(tenant.retention_deadline)}</strong>.
              {tenant.retention_deadline && new Date(tenant.retention_deadline) < new Date()
                ? ' Retention expired — purge is unlocked.'
                : ' Purge unlocks after that date.'}
            </p>
            {tenant.retention_deadline && new Date(tenant.retention_deadline) < new Date() && (
              <button onClick={purge} disabled={busy === 'purge'} className="px-4 py-2 rounded-lg bg-[var(--color-error)] text-[var(--color-on-solid)] text-sm font-semibold disabled:opacity-50">
                {busy === 'purge' ? 'Purging…' : 'PURGE — permanently delete all data'}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-[var(--color-textSecondary)] mb-4">
              Offboard deactivates the church immediately but keeps its data for a retention window.
              After the deadline passes, the purge button appears and permanently deletes everything.
            </p>
            <button onClick={offboard} disabled={busy === 'offboard'} className="px-4 py-2 rounded-lg border border-[var(--color-error)] text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-light)] disabled:opacity-50">
              {busy === 'offboard' ? 'Offboarding…' : 'Offboard this tenant'}
            </button>
          </>
        )}
      </Card>

      {/* 6.8 per-tenant rate-limit override */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
          <Zap className="h-5 w-5" /> Rate Limit Override
        </h2>
        <p className="text-xs text-[var(--color-textSecondary)] mb-4">
          {rateLimit
            ? `This tenant is capped at ${rateLimit.max_requests} requests / ${rateLimit.window_seconds}s (overrides the global limit).`
            : 'No override — the global API limit applies.'}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-[var(--color-textSecondary)]">Max requests
            <input type="number" min="10" max="100000" value={rateLimitForm.maxRequests} onChange={(e) => setRateLimitForm({ ...rateLimitForm, maxRequests: e.target.value })} placeholder={rateLimit ? String(rateLimit.max_requests) : 'e.g. 500'} className={inputCls + ' mt-1 w-32'} />
          </label>
          <label className="text-xs text-[var(--color-textSecondary)]">Per (seconds)
            <input type="number" min="10" max="3600" value={rateLimitForm.windowSeconds} onChange={(e) => setRateLimitForm({ ...rateLimitForm, windowSeconds: e.target.value })} className={inputCls + ' mt-1 w-24'} />
          </label>
          <button onClick={saveRateLimit} disabled={busy === 'ratelimit' || !rateLimitForm.maxRequests} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm disabled:opacity-50">Save override</button>
          {rateLimit && (
            <button onClick={removeRateLimit} disabled={busy === 'ratelimit'} className="px-4 py-2 rounded-lg border border-[var(--color-error)] text-sm text-[var(--color-error)] hover:bg-[var(--color-error-light)] disabled:opacity-50">Remove override</button>
          )}
        </div>
      </Card>

      {/* 1.4 tenant templates */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5" /> Structure Templates
        </h2>
        <p className="text-xs text-[var(--color-textSecondary)] mb-4">
          Capture this church&apos;s departments + roles as a reusable template, or apply an existing template here (existing names are skipped).
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <button onClick={captureTemplate} disabled={busy === 'tpl-capture'} className="px-4 py-2 rounded-lg border border-[var(--color-primary)] text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:opacity-50">
            {busy === 'tpl-capture' ? 'Capturing…' : 'Capture as template'}
          </button>
          {templates.length > 0 && (
            <>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls + ' w-64'}>
                <option value="">Apply a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.department_count} depts, {t.role_count} roles)</option>
                ))}
              </select>
              <button onClick={applyTemplate} disabled={busy === 'tpl-apply' || !templateId} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm disabled:opacity-50">
                {busy === 'tpl-apply' ? 'Applying…' : 'Apply template'}
              </button>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

export default PlatformTenantAdmin
