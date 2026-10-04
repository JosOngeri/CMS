import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, RotateCcw, Lock, Loader2, Save } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../common/Card'

// Renders the right input for a setting's declared type.
const FieldInput = ({ def, value, onChange }) => {
  const base = 'w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)] text-sm min-h-[44px]'
  if (def.type === 'boolean') {
    const on = value === 'true' || value === true
    return (
      <button
        type="button"
        onClick={() => onChange(on ? 'false' : 'true')}
        className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
        aria-pressed={on}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--color-surface)] transition-transform ${on ? 'translate-x-5' : ''}`} />
      </button>
    )
  }
  if (def.type === 'color') {
    return (
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded border border-[var(--color-border)] shrink-0" style={{ background: /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : 'transparent' }} />
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} className={base} placeholder="#RRGGBB" />
      </div>
    )
  }
  if (def.secret) {
    return (
      <input
        type="password"
        value={value === '***' ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={value === '***' ? 'Set — enter to replace' : 'Not set'}
        className={base}
        autoComplete="new-password"
      />
    )
  }
  if (def.validation?.enum) {
    return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={base}>
        {def.validation.enum.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    )
  }
  return (
    <input
      type={def.type === 'number' ? 'number' : 'text'}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={base}
    />
  )
}

const SourceBadge = ({ def }) => {
  if (def.managed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--color-warning-light)] text-[var(--color-warning)]">
        <Lock className="h-3 w-3" /> Platform
      </span>
    )
  }
  if (def.source === 'override') {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-primary-light)] text-[var(--color-primary)]">Overridden</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-surface)] text-[var(--color-textSecondary)] border border-[var(--color-border)]">Inherited</span>
}

/**
 * TenantSettingsEditor — platform-admin view of a church's `settings` table
 * catalog. Shows effective values, override vs inherited source, allows
 * bulk per-church overrides and revert-to-default. Global-scope keys are
 * locked (managed at /settings/catalog).
 */
const TenantSettingsEditor = ({ tenantId }) => {
  const { api } = useAuth()
  const toast = useToast()

  const [catalog, setCatalog] = useState(null)
  const [drafts, setDrafts] = useState({})   // key -> unsaved value
  const [open, setOpen] = useState({})      // category -> expanded
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(null)

  const dirty = useMemo(() => Object.keys(drafts).length > 0, [drafts])

  const fetchCatalog = async () => {
    try {
      const res = await api.get(`/api/platform/tenants/${tenantId}/settings/catalog`)
      setCatalog(res.data.data || {})
    } catch (e) {
      toast.error('Failed to load settings catalog')
    }
  }

  useEffect(() => { fetchCatalog() }, [tenantId])

  const setDraft = (key, value) =>
    setDrafts((p) => ({ ...p, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/api/platform/tenants/${tenantId}/settings/catalog`, { settings: drafts })
      toast.success(`Saved ${Object.keys(drafts).length} setting${Object.keys(drafts).length > 1 ? 's' : ''}`)
      setDrafts({})
      fetchCatalog()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async (key) => {
    setResetting(key)
    try {
      await api.delete(`/api/platform/tenants/${tenantId}/settings/catalog/${key}`)
      toast.success(`'${key}' reverted to platform default`)
      setDrafts((p) => { const n = { ...p }; delete n[key]; return n })
      fetchCatalog()
    } catch (e) {
      toast.error('Failed to reset setting')
    } finally {
      setResetting(null)
    }
  }

  if (!catalog) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-[var(--color-textSecondary)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
        </div>
      </Card>
    )
  }

  const categories = Object.keys(catalog).filter((c) => (catalog[c] || []).length > 0)

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Church Settings</h2>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Effective configuration — <span className="font-medium">Overridden</span> keys differ from the platform default.
            <Lock className="inline h-3 w-3 mx-1" />Platform keys are managed in platform settings.
          </p>
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium disabled:opacity-50 min-h-[44px]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes{dirty ? ` (${Object.keys(drafts).length})` : ''}
        </button>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {categories.map((category) => {
          const items = catalog[category]
          const isOpen = open[category] !== false // default expanded
          const dirtyInCat = items.filter((i) => drafts[i.key] !== undefined).length
          return (
            <div key={category}>
              <button
                type="button"
                onClick={() => setOpen((p) => ({ ...p, [category]: !isOpen }))}
                className="w-full flex items-center justify-between py-3 text-left"
              >
                <span className="flex items-center gap-2 font-medium text-[var(--color-text)] capitalize">
                  {category.replace(/-/g, ' ')}
                  <span className="text-xs text-[var(--color-textSecondary)]">({items.length})</span>
                  {dirtyInCat > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-warning-light)] text-[var(--color-warning)]">{dirtyInCat} unsaved</span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 text-[var(--color-textSecondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="pb-4 space-y-3">
                  {items.map((def) => {
                    const value = drafts[def.key] !== undefined ? drafts[def.key] : def.value
                    const locked = def.managed || def.editable === false
                    return (
                      <div key={def.key} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:items-center">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-sm font-medium text-[var(--color-text)]">{def.label || def.key}</label>
                            <SourceBadge def={def} />
                          </div>
                          <p className="text-xs text-[var(--color-textSecondary)]">{def.key}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:w-72">
                          {locked ? (
                            <span className="flex-1 text-sm text-[var(--color-textSecondary)] italic truncate">
                              {def.secret ? (def.value ? '••••••••' : 'not set') : String(def.value ?? '')}
                            </span>
                          ) : (
                            <div className="flex-1">
                              <FieldInput def={def} value={value} onChange={(v) => setDraft(def.key, v)} />
                            </div>
                          )}
                          {def.source === 'override' && !locked && (
                            <button
                              type="button"
                              title="Reset to platform default"
                              onClick={() => resetToDefault(def.key)}
                              disabled={resetting === def.key}
                              className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                              {resetting === def.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default TenantSettingsEditor
