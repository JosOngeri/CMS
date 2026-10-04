import { useState, useEffect, useCallback } from 'react'
import { Flag, Server, Power, Sparkles } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'

/**
 * §13 Platform Configuration — global feature flags + version/changelog.
 * System settings stay on the existing PlatformSettings page.
 */
const PlatformConfig = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [flags, setFlags] = useState([])
  const [version, setVersion] = useState(null)
  const [maintenance, setMaintenance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newFlag, setNewFlag] = useState('')
  const [maintMsg, setMaintMsg] = useState('')
  const [defaultsJson, setDefaultsJson] = useState('')

  const load = useCallback(async () => {
    try {
      const [f, v, m, s] = await Promise.all([
        api.get('/api/platform/flags'),
        api.get('/api/platform/version'),
        api.get('/api/platform/maintenance'),
        api.get('/api/platform/settings'),
      ])
      setFlags(f.data.data || [])
      setVersion(v.data.data)
      setMaintenance(m.data.data)
      setMaintMsg(m.data.data?.message || '')
      setDefaultsJson(JSON.stringify(s.data.data?.new_tenant_defaults || {}, null, 2))
    } catch {
      toast.error('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }, [api, toast])

  useEffect(() => { load() }, [load])

  const toggle = async (flag, enabled, rolloutPct, description) => {
    try {
      await api.put('/api/platform/flags', { flag, enabled, rolloutPct, description })
      setFlags((prev) => {
        const exists = prev.find((f) => f.flag === flag)
        return exists
          ? prev.map((f) => (f.flag === flag ? { ...f, enabled } : f))
          : [...prev, { flag, enabled, rollout_pct: rolloutPct, description }]
      })
      toast.success(`Flag ${flag} ${enabled ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error('Failed to update flag')
    }
  }

  const saveDefaults = async () => {
    let parsed
    try {
      parsed = JSON.parse(defaultsJson || '{}')
    } catch {
      toast.error('Defaults must be valid JSON')
      return
    }
    try {
      await api.put('/api/platform/settings', { new_tenant_defaults: parsed })
      toast.success('New-tenant defaults saved')
    } catch {
      toast.error('Failed to save defaults')
    }
  }

  const saveMaintenance = async (enabled) => {
    try {
      const res = await api.put('/api/platform/maintenance', { enabled, message: maintMsg })
      setMaintenance(res.data.data)
      toast.success(res.data.message || (enabled ? 'Maintenance ON' : 'Maintenance off'))
    } catch {
      toast.error('Failed to update maintenance mode')
    }
  }

  if (loading) return <FullPageLoading message="Loading configuration..." />

  const inputCls = 'px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text)]'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Feature Flags & Version</h1>
        <p className="text-[var(--color-textSecondary)]">Global flags roll out to every tenant at once.</p>
      </div>

      {/* Maintenance mode (13.6) */}
      {maintenance && (
        <Card className={`p-6 ${maintenance.enabled ? 'border-2 border-[var(--color-warning)]' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[260px]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2"><Power className="h-5 w-5" /> Maintenance Mode</h2>
              <p className="text-xs text-[var(--color-textSecondary)] mb-2">
                When on, every tenant API call returns 503 with this message. This console stays up.
              </p>
              <input value={maintMsg} onChange={(e) => setMaintMsg(e.target.value)} className={`${inputCls} w-full`} placeholder="Message tenants see" />
            </div>
            <button
              onClick={() => saveMaintenance(!maintenance.enabled)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold ${maintenance.enabled ? 'bg-[var(--color-error)] text-[var(--color-on-solid)]' : 'bg-[var(--color-warning)] text-[var(--color-on-solid)]'}`}
            >
              {maintenance.enabled ? 'Turn OFF (live again)' : 'Turn ON (take tenants down)'}
            </button>
          </div>
          {maintenance.enabled && (
            <p className="mt-3 text-sm font-medium text-[var(--color-warning)]">MAINTENANCE ACTIVE — tenants are seeing 503s right now.</p>
          )}
        </Card>
      )}

      {/* New-tenant defaults (13.3) */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2"><Sparkles className="h-5 w-5" /> New-Tenant Defaults</h2>
        <p className="text-xs text-[var(--color-textSecondary)] mb-3">
          JSON merged into every new church&apos;s settings at signup. E.g. {'{"subscription_tier":"free","trial_days":14,"sms_quota":50}'} — explicit signup input still wins.
        </p>
        <textarea
          value={defaultsJson}
          onChange={(e) => setDefaultsJson(e.target.value)}
          rows={5}
          className={`${inputCls} w-full font-mono text-xs mb-3`}
          placeholder="{}"
        />
        <button onClick={saveDefaults} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium">Save defaults</button>
      </Card>

      {version && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2 flex items-center gap-2"><Server className="h-5 w-5" /> Deployed Version</h2>
          <div className="flex gap-6 text-sm text-[var(--color-textSecondary)]">
            <span>app <strong className="text-[var(--color-text)]">{version.version}</strong></span>
            {version.sha && <span>sha <strong className="text-[var(--color-text)] font-mono">{version.sha}</strong></span>}
            <span>node <strong className="text-[var(--color-text)]">{version.node}</strong></span>
            <span>uptime <strong className="text-[var(--color-text)]">{Math.floor(version.uptime / 3600)}h</strong></span>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2"><Flag className="h-5 w-5" /> Global Feature Flags</h2>
        <form onSubmit={(e) => { e.preventDefault(); newFlag.trim() && toggle(newFlag.trim(), true, 100, 'added via console') && setNewFlag('') }} className="flex gap-2 mb-4">
          <input value={newFlag} onChange={(e) => setNewFlag(e.target.value)} placeholder="new_flag_name" className={`${inputCls} flex-1`} />
          <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium">Add flag</button>
        </form>
        <div className="space-y-2">
          {flags.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)]">
              <div>
                <p className="text-sm font-mono text-[var(--color-text)]">{f.flag}</p>
                {f.description && <p className="text-xs text-[var(--color-textSecondary)]">{f.description}</p>}
                {f.rollout_pct < 100 && <p className="text-xs text-[var(--color-warning)]">rolling out: {f.rollout_pct}%</p>}
              </div>
              <button
                onClick={() => toggle(f.flag, !f.enabled, f.rollout_pct, f.description)}
                className={`relative w-10 h-5 rounded-full transition-colors ${f.enabled ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'}`}
                aria-label={`Toggle ${f.flag}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${f.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
          {flags.length === 0 && <p className="text-sm text-[var(--color-textSecondary)]">No flags yet — add one to start gating features globally.</p>}
        </div>
      </Card>
    </div>
  )
}

export default PlatformConfig
