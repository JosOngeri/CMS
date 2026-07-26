import { useEffect, useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import Card from '../../../components/common/Card'
import { FullPageLoading } from '../../../components/common/Loading'

const TenantSettings = () => {
  const { api } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadTenant = async () => {
      try {
        const response = await api.get(`/api/platform/tenants/${id}`)
        const tenant = response.data.data
        setForm({
          name: tenant.name || '',
          slug: tenant.slug || '',
          contactName: tenant.contact_name || '',
          contactEmail: tenant.contact_email || '',
          subscriptionTier: tenant.subscription_tier || 'basic',
          billingCycle: tenant.billing_cycle || 'monthly'
        })
      } catch (error) {
        toast.error('Failed to load tenant settings')
        navigate('/platform/tenants')
      }
    }
    loadTenant()
  }, [api, id, navigate, toast])

  if (!form) return <FullPageLoading message="Loading tenant settings..." />

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const save = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await api.put(`/api/platform/tenants/${id}`, form)
      toast.success('Tenant settings updated')
      navigate(`/platform/tenants/${id}`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update tenant settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(`/platform/tenants/${id}`)} className="inline-flex items-center gap-2 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"><ArrowLeft className="h-4 w-4" /> Back to tenant</button>
      <div><h1 className="text-2xl font-bold text-[var(--color-text)]">Tenant settings</h1><p className="text-[var(--color-textSecondary)]">Update church details and subscription settings.</p></div>
      <Card className="p-6"><form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-[var(--color-text)]">Church name<input required value={form.name} onChange={(event) => updateField('name', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" /></label>
          <label className="block text-sm text-[var(--color-text)]">Slug<input required pattern="[a-z0-9-]+" value={form.slug} onChange={(event) => updateField('slug', event.target.value.toLowerCase())} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" /></label>
          <label className="block text-sm text-[var(--color-text)]">Contact name<input value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" /></label>
          <label className="block text-sm text-[var(--color-text)]">Contact email<input type="email" value={form.contactEmail} onChange={(event) => updateField('contactEmail', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" /></label>
          <label className="block text-sm text-[var(--color-text)]">Plan<select value={form.subscriptionTier} onChange={(event) => updateField('subscriptionTier', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"><option value="basic">Basic</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></label>
          <label className="block text-sm text-[var(--color-text)]">Billing cycle<select value={form.billingCycle} onChange={(event) => updateField('billingCycle', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
        </div>
        <div className="flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save changes'}</button></div>
      </form></Card>
    </div>
  )
}

export default TenantSettings
