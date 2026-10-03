import { useState, useEffect, useCallback } from 'react'
import { Flag, Server } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [newFlag, setNewFlag] = useState('')

  const load = useCallback(async () => {
    try {
      const [f, v] = await Promise.all([
        api.get('/api/platform/flags'),
        api.get('/api/platform/version'),
      ])
      setFlags(f.data.data || [])
      setVersion(v.data.data)
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

  if (loading) return <FullPageLoading message="Loading configuration..." />

  const inputCls = 'px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text)]'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Feature Flags & Version</h1>
        <p className="text-[var(--color-textSecondary)]">Global flags roll out to every tenant at once.</p>
      </div>

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
