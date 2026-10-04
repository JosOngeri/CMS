import { useState, useEffect, useCallback } from 'react'
import { UserCog, KeyRound, ToggleLeft, Gauge, Eye, ShieldAlert, CheckCircle, CalendarClock, ListChecks, Settings2 } from 'lucide-react'
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
      const [usersRes, flagsRes, quotasRes] = await Promise.all([
        api.get(`/api/platform/tenants/${id}/users`),
        api.get(`/api/platform/tenants/${id}/flags`),
        api.get(`/api/platform/tenants/${id}/quotas`),
      ])
      setUsers(usersRes.data.data || [])
      setFlags(flagsRes.data.data || [])
      setQuotas(quotasRes.data.data || null)
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
        <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className={`${inputCls} max-w-xs`} aria-label="Select church">
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
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
    </div>
  )
}

export default PlatformTenantAdmin
