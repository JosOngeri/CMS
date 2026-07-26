import { useMemo, useState } from 'react'
import { ArrowLeft, Building, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import Card from '../../../components/common/Card'

const initialForm = {
  name: '',
  slug: '',
  contactName: '',
  contactEmail: '',
  subscriptionTier: 'basic',
  billingCycle: 'monthly'
}

const TenantCreate = () => {
  const { api } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const slugSuggestion = useMemo(() => form.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''), [form.name])

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const validateStep = () => {
    if (step === 1 && (!form.name.trim() || !form.slug.trim())) {
      toast.error('Church name and slug are required')
      return false
    }
    if (step === 2 && form.contactEmail && !/^\S+@\S+\.\S+$/.test(form.contactEmail)) {
      toast.error('Enter a valid contact email')
      return false
    }
    return true
  }

  const nextStep = () => {
    if (validateStep()) setStep((current) => Math.min(current + 1, 3))
  }

  const submit = async () => {
    if (!validateStep()) return
    try {
      setSubmitting(true)
      const response = await api.post('/api/platform/tenants', form)
      toast.success('Church created successfully')
      navigate(`/platform/tenants/${response.data.data.id}`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create church')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/platform/tenants')} className="inline-flex items-center gap-2 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
        <ArrowLeft className="h-4 w-4" /> Back to tenants
      </button>
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Onboard a church</h1>
        <p className="text-[var(--color-textSecondary)]">Step {step} of 3</p>
      </div>
      <Card className="p-6">
        {step === 1 && <div className="space-y-4">
          <h2 className="font-semibold text-[var(--color-text)]">Church identity</h2>
          <label className="block text-sm text-[var(--color-text)]">Church name<input value={form.name} onChange={(event) => updateField('name', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" /></label>
          <label className="block text-sm text-[var(--color-text)]">Church slug<input value={form.slug} onChange={(event) => updateField('slug', event.target.value.toLowerCase())} placeholder={slugSuggestion || 'church-name'} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" /></label>
          <button type="button" onClick={() => updateField('slug', slugSuggestion)} className="text-sm text-[var(--color-primary)]">Use suggested slug</button>
        </div>}
        {step === 2 && <div className="space-y-4">
          <h2 className="font-semibold text-[var(--color-text)]">Primary contact</h2>
          <label className="block text-sm text-[var(--color-text)]">Contact name<input value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" /></label>
          <label className="block text-sm text-[var(--color-text)]">Contact email<input type="email" value={form.contactEmail} onChange={(event) => updateField('contactEmail', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" /></label>
        </div>}
        {step === 3 && <div className="space-y-4">
          <h2 className="font-semibold text-[var(--color-text)]">Subscription and review</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-[var(--color-text)]">Plan<select value={form.subscriptionTier} onChange={(event) => updateField('subscriptionTier', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"><option value="basic">Basic</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></label>
            <label className="block text-sm text-[var(--color-text)]">Billing cycle<select value={form.billingCycle} onChange={(event) => updateField('billingCycle', event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
          </div>
          <div className="rounded-lg bg-[var(--color-background)] p-4 text-sm text-[var(--color-textSecondary)]"><Building className="mb-2 h-5 w-5" />{form.name} will be created with the {form.subscriptionTier} plan. No credentials are displayed or created by this flow.</div>
        </div>}
        <div className="mt-8 flex justify-between gap-3">
          <button type="button" onClick={() => step === 1 ? navigate('/platform/tenants') : setStep((current) => current - 1)} className="rounded-lg border border-[var(--color-border)] px-4 py-2">{step === 1 ? 'Cancel' : 'Back'}</button>
          {step < 3 ? <button type="button" onClick={nextStep} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white">Continue</button> : <button type="button" disabled={submitting} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-50"><CheckCircle className="h-4 w-4" />{submitting ? 'Creating...' : 'Create church'}</button>}
        </div>
      </Card>
    </div>
  )
}

export default TenantCreate
