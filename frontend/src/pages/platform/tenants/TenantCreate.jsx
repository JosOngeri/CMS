import { useMemo, useState } from 'react'
import { ArrowLeft, Building, CheckCircle, Copy, Check, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import Card from '../../../components/common/Card'

const initialForm = {
  name: '',
  slug: '',
  contactName: '',
  contactEmail: '',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  subscriptionTier: 'basic',
  billingCycle: 'monthly'
}

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1.5 rounded hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]"
      title="Copy"
    >
      {copied ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

const TenantCreate = () => {
  const { api } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState(null)

  const slugSuggestion = useMemo(() => form.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''), [form.name])

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const inputClass = 'mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3'

  const validateStep = () => {
    if (step === 1 && (!form.name.trim() || !form.slug.trim())) {
      toast.error('Church name and slug are required')
      return false
    }
    if (step === 2 && form.contactEmail && !/^\S+@\S+\.\S+$/.test(form.contactEmail)) {
      toast.error('Enter a valid contact email')
      return false
    }
    if (step === 3) {
      if (!form.adminFirstName.trim() || !form.adminLastName.trim() || !form.adminEmail.trim()) {
        toast.error('Admin first name, last name, and email are required')
        return false
      }
      if (!/^\S+@\S+\.\S+$/.test(form.adminEmail)) {
        toast.error('Enter a valid admin email')
        return false
      }
    }
    return true
  }

  const nextStep = () => {
    if (validateStep()) setStep((current) => Math.min(current + 1, 4))
  }

  const submit = async () => {
    if (!validateStep()) return
    try {
      setSubmitting(true)
      const response = await api.post('/api/platform/tenants', {
        name: form.name,
        slug: form.slug,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        subscriptionTier: form.subscriptionTier,
        billingCycle: form.billingCycle,
        admin: {
          firstName: form.adminFirstName,
          lastName: form.adminLastName,
          email: form.adminEmail
        }
      })
      setCreated(response.data.data)
      toast.success('Church created successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create church')
    } finally {
      setSubmitting(false)
    }
  }

  // Post-creation screen: show the initial admin credentials exactly once.
  if (created) {
    const admin = created.initialAdmin
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-[var(--color-success)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{created.name} is live</h1>
            <p className="text-[var(--color-textSecondary)]">The church was created along with its first administrator.</p>
          </div>
        </div>

        {admin && (
          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-[var(--color-warning-light)] p-4 text-[var(--color-warning)]">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-sm font-medium">
                Save these credentials now — the temporary password is shown only once and cannot be recovered.
              </p>
            </div>
            <div className="rounded-lg bg-[var(--color-background)] p-4 space-y-3">
              <div>
                <p className="text-xs text-[var(--color-textSecondary)]">Admin email</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[var(--color-text)]">{admin.email}</p>
                  <CopyButton text={admin.email} />
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--color-textSecondary)]">Username</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[var(--color-text)]">{admin.username}</p>
                  <CopyButton text={admin.username} />
                </div>
              </div>
              {admin.temporaryPassword && (
                <div>
                  <p className="text-xs text-[var(--color-textSecondary)]">Temporary password</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[var(--color-text)]">{admin.temporaryPassword}</p>
                    <CopyButton text={admin.temporaryPassword} />
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--color-textSecondary)]">
              Send these to the church admin through a secure channel. They should change the password after first login.
            </p>
          </Card>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/platform/tenants/${created.id}`)}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[var(--color-on-solid)]"
          >
            Open church profile
          </button>
          <button
            onClick={() => navigate('/platform/tenants')}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          >
            Back to all churches
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/platform/tenants')} className="inline-flex items-center gap-2 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
        <ArrowLeft className="h-4 w-4" /> Back to tenants
      </button>
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Onboard a church</h1>
        <p className="text-[var(--color-textSecondary)]">Step {step} of 4</p>
      </div>
      <Card className="p-6">
        {step === 1 && <div className="space-y-4">
          <h2 className="font-semibold text-[var(--color-text)]">Church identity</h2>
          <label className="block text-sm text-[var(--color-text)]">Church name<input type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} className={inputClass} /></label>
          <label className="block text-sm text-[var(--color-text)]">Church slug<input type="text" value={form.slug} onChange={(event) => updateField('slug', event.target.value.toLowerCase())} placeholder={slugSuggestion || 'church-name'} className={inputClass} /></label>
          <button type="button" onClick={() => updateField('slug', slugSuggestion)} className="text-sm text-[var(--color-primary)]">Use suggested slug</button>
        </div>}
        {step === 2 && <div className="space-y-4">
          <h2 className="font-semibold text-[var(--color-text)]">Primary contact</h2>
          <label className="block text-sm text-[var(--color-text)]">Contact name<input type="text" value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} className={inputClass} /></label>
          <label className="block text-sm text-[var(--color-text)]">Contact email<input type="email" inputMode="email" autoComplete="email" value={form.contactEmail} onChange={(event) => updateField('contactEmail', event.target.value)} className={inputClass} /></label>
        </div>}
        {step === 3 && <div className="space-y-4">
          <h2 className="font-semibold text-[var(--color-text)]">First church administrator</h2>
          <p className="text-sm text-[var(--color-textSecondary)]">
            This person gets the first login for the new church. A temporary password is generated and shown once after creation.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-[var(--color-text)]">First name<input type="text" autoComplete="off" value={form.adminFirstName} onChange={(event) => updateField('adminFirstName', event.target.value)} className={inputClass} /></label>
            <label className="block text-sm text-[var(--color-text)]">Last name<input type="text" autoComplete="off" value={form.adminLastName} onChange={(event) => updateField('adminLastName', event.target.value)} className={inputClass} /></label>
          </div>
          <label className="block text-sm text-[var(--color-text)]">Admin email<input type="email" inputMode="email" autoComplete="off" value={form.adminEmail} onChange={(event) => updateField('adminEmail', event.target.value)} className={inputClass} /></label>
        </div>}
        {step === 4 && <div className="space-y-4">
          <h2 className="font-semibold text-[var(--color-text)]">Subscription and review</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-[var(--color-text)]">Plan<select value={form.subscriptionTier} onChange={(event) => updateField('subscriptionTier', event.target.value)} className={inputClass}><option value="free">Free</option><option value="basic">Basic</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></label>
            <label className="block text-sm text-[var(--color-text)]">Billing cycle<select value={form.billingCycle} onChange={(event) => updateField('billingCycle', event.target.value)} className={inputClass}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
          </div>
          <div className="rounded-lg bg-[var(--color-background)] p-4 text-sm text-[var(--color-textSecondary)] space-y-1">
            <Building className="mb-2 h-5 w-5" />
            <p><span className="font-medium text-[var(--color-text)]">{form.name}</span> will be created on the <span className="font-medium text-[var(--color-text)]">{form.subscriptionTier}</span> plan ({form.billingCycle}).</p>
            <p>{form.adminFirstName} {form.adminLastName} ({form.adminEmail}) will become its first administrator with a temporary password.</p>
          </div>
        </div>}
        <div className="mt-8 flex justify-between gap-3">
          <button type="button" onClick={() => step === 1 ? navigate('/platform/tenants') : setStep((current) => current - 1)} className="rounded-lg border border-[var(--color-border)] px-4 py-2">{step === 1 ? 'Cancel' : 'Back'}</button>
          {step < 4 ? <button type="button" onClick={nextStep} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[var(--color-on-solid)]">Continue</button> : <button type="button" disabled={submitting} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[var(--color-on-solid)] disabled:opacity-50"><CheckCircle className="h-4 w-4" />{submitting ? 'Creating...' : 'Create church'}</button>}
        </div>
      </Card>
    </div>
  )
}

export default TenantCreate
