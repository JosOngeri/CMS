import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import GlobalSettingsCatalog from '../../components/platform/GlobalSettingsCatalog'

const PlatformSettings = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [canEdit, setCanEdit] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/api/platform/settings')
        const s = response.data.data || {}
        const pricing = s.tier_pricing || {}
        setForm({
          platform_name: s.platform_name || '',
          support_email: s.support_email || '',
          trial_days: s.trial_days ?? 30,
          price_basic: pricing.basic ?? 0,
          price_professional: pricing.professional ?? 0,
          price_enterprise: pricing.enterprise ?? 0,
        })
      } catch {
        toast.error('Failed to load settings')
        setForm({})
      }
    }
    load()
  }, [api, toast])

  if (form === null) return <FullPageLoading message="Loading platform settings..." />

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const save = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await api.put('/api/platform/settings', {
        platform_name: form.platform_name,
        support_email: form.support_email,
        trial_days: Number(form.trial_days),
        tier_pricing: {
          free: 0,
          basic: Number(form.price_basic),
          professional: Number(form.price_professional),
          enterprise: Number(form.price_enterprise),
        }
      })
      toast.success('Settings saved')
    } catch (error) {
      if (error.response?.status === 403) {
        setCanEdit(false)
        toast.error('You do not have permission to change settings')
      } else {
        toast.error(error.response?.data?.error || 'Failed to save settings')
      }
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 disabled:opacity-60'

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Platform Settings</h1>
        <p className="text-[var(--color-textSecondary)]">SaaS-wide configuration. Tier prices drive the MRR estimate on the dashboard and analytics page.</p>
      </div>

      {!canEdit && (
        <div className="p-4 rounded-lg bg-[var(--color-warning-light)] text-[var(--color-warning)] text-sm">
          Your role has read-only access to settings.
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">General</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-[var(--color-text)]">Platform name
              <input type="text" value={form.platform_name || ''} disabled={!canEdit} onChange={(e) => updateField('platform_name', e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm text-[var(--color-text)]">Support email
              <input type="email" value={form.support_email || ''} disabled={!canEdit} onChange={(e) => updateField('support_email', e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm text-[var(--color-text)]">Default trial days
              <input type="number" min="0" max="365" value={form.trial_days ?? 30} disabled={!canEdit} onChange={(e) => updateField('trial_days', e.target.value)} className={inputClass} />
            </label>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Subscription pricing</h2>
          <p className="text-sm text-[var(--color-textSecondary)] mb-4">Monthly price per tier in KES.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm text-[var(--color-text)]">Basic
              <input type="number" min="0" value={form.price_basic ?? 0} disabled={!canEdit} onChange={(e) => updateField('price_basic', e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm text-[var(--color-text)]">Professional
              <input type="number" min="0" value={form.price_professional ?? 0} disabled={!canEdit} onChange={(e) => updateField('price_professional', e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm text-[var(--color-text)]">Enterprise
              <input type="number" min="0" value={form.price_enterprise ?? 0} disabled={!canEdit} onChange={(e) => updateField('price_enterprise', e.target.value)} className={inputClass} />
            </label>
          </div>
        </Card>

        {canEdit && (
          <div className="flex justify-end">
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[var(--color-on-solid)] disabled:opacity-50">
              <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        )}
      </form>

      <GlobalSettingsCatalog canEdit={canEdit} />
    </div>
  )
}

export default PlatformSettings
