import { useState, useEffect, useMemo } from 'react'
import { Loader2, Save } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../common/Card'

/**
 * GlobalSettingsCatalog — platform-managed keys of the church-facing
 * `settings` table (provider creds, maintenance mode, SaaS switches).
 * These are scope='global' in backend/constants/settingKeys.js — churches
 * can't override them. Secret values are masked; an empty field means
 * "leave unchanged" on save.
 */
const GlobalSettingsCatalog = ({ canEdit = true }) => {
  const { api } = useAuth()
  const toast = useToast()
  const [catalog, setCatalog] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(false)

  const dirty = useMemo(() => Object.keys(drafts).length > 0, [drafts])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/platform/settings/catalog')
        setCatalog(res.data.data || {})
      } catch (e) {
        toast.error('Failed to load global settings')
      }
    }
    load()
  }, [])

  const managed = useMemo(() => {
    if (!catalog) return []
    return Object.values(catalog).flat().filter((d) => d.managed)
  }, [catalog])

  if (!catalog) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-[var(--color-textSecondary)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading church defaults…
        </div>
      </Card>
    )
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 disabled:opacity-60'

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/api/platform/settings/catalog', { settings: drafts })
      toast.success('Global settings saved')
      setDrafts({})
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save global settings')
    } finally {
      setSaving(false)
    }
  }

  const renderField = (def) => {
    const value = drafts[def.key] !== undefined ? drafts[def.key] : def.value
    const onChange = (v) => setDrafts((p) => ({ ...p, [def.key]: v }))
    if (def.type === 'boolean') {
      const on = value === 'true' || value === true
      return (
        <label className="flex items-center justify-between text-sm text-[var(--color-text)]">
          {def.label}
          <button type="button" disabled={!canEdit} onClick={() => onChange(on ? 'false' : 'true')}
            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
            aria-pressed={on}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--color-surface)] transition-transform ${on ? 'translate-x-5' : ''}`} />
          </button>
        </label>
      )
    }
    if (def.validation?.enum) {
      return (
        <label className="block text-sm text-[var(--color-text)]">{def.label}
          <select value={value || ''} disabled={!canEdit} onChange={(e) => onChange(e.target.value)} className={inputClass}>
            {def.validation.enum.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>
      )
    }
    if (def.secret) {
      return (
        <label className="block text-sm text-[var(--color-text)]">{def.label}
          <input type="password" value={drafts[def.key] ?? ''} disabled={!canEdit}
            placeholder={def.value ? 'Set — enter to replace' : 'Not set'}
            onChange={(e) => onChange(e.target.value)} className={inputClass} autoComplete="new-password" />
        </label>
      )
    }
    return (
      <label className="block text-sm text-[var(--color-text)]">{def.label}
        <input type="text" value={value || ''} disabled={!canEdit} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      </label>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Church-facing configuration</h2>
      <p className="text-sm text-[var(--color-textSecondary)] mb-4">
        Platform-managed keys of every church's settings — provider credentials and SaaS switches.
        Churches cannot override these. Secret fields never display stored values.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {managed.map((def) => <div key={def.key}>{renderField(def)}</div>)}
      </div>
      {canEdit && dirty && (
        <div className="flex justify-end mt-4">
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[var(--color-on-solid)] disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save configuration
          </button>
        </div>
      )}
    </Card>
  )
}

export default GlobalSettingsCatalog
