import { useState, useEffect } from 'react'
import { ShieldCheck, Copy, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'

/**
 * Forced MFA enrollment — rendered instead of the console when the
 * account is flagged mfa_required but not yet enrolled (3.4). The server
 * independently confines the session to the setup endpoints until a
 * valid code is confirmed.
 */
const PlatformMfaSetup = ({ email, onComplete }) => {
  const { api } = useAuth()
  const toast = useToast()
  const [setup, setSetup] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const start = async () => {
      try {
        const res = await api.post('/api/platform/auth/mfa/setup')
        setSetup(res.data.data)
      } catch {
        toast.error('Could not start MFA setup')
      }
    }
    start()
  }, [api, toast])

  const confirm = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/api/platform/auth/mfa/enable', { code })
      toast.success('MFA enabled')
      onComplete()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid code')
    } finally {
      setBusy(false)
    }
  }

  const copy = (text) => {
    navigator.clipboard?.writeText(text)
    toast.success('Copied')
  }

  if (!setup) return <FullPageLoading message="Starting MFA setup..." />

  const inputCls = 'w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-[var(--color-primary-light)] rounded-full mb-4">
            <ShieldCheck className="h-8 w-8 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">MFA Required</h1>
          <p className="text-[var(--color-textSecondary)]">
            Your account <strong className="text-[var(--color-text)]">{email}</strong> must enrol in
            two-factor authentication before you can use the console.
          </p>
        </div>

        <Card className="p-6 space-y-5">
          <div>
            <p className="text-sm font-medium text-[var(--color-text)] mb-1">1. Add this secret to your authenticator app</p>
            <p className="text-xs text-[var(--color-textSecondary)] mb-2">Google Authenticator, Authy, 1Password — choose &quot;enter key manually&quot;.</p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-background)]">
              <code className="flex-1 text-sm font-mono text-[var(--color-text)] break-all">{setup.secret}</code>
              <button onClick={() => copy(setup.secret)} className="shrink-0 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]" aria-label="Copy secret">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <details className="mt-2">
              <summary className="text-xs text-[var(--color-textSecondary)] cursor-pointer">otpauth URI (for apps that accept links)</summary>
              <code className="block mt-1 p-2 text-xs font-mono text-[var(--color-textSecondary)] break-all bg-[var(--color-background)] rounded">{setup.otpauthUri}</code>
            </details>
          </div>

          <form onSubmit={confirm} className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">2. Enter the 6-digit code it shows</p>
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className={`${inputCls} tracking-widest font-mono text-center`} placeholder="123456" autoFocus
              />
            </div>
            <button
              type="submit" disabled={busy || code.length !== 6}
              className="w-full flex items-center justify-center px-4 py-3 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg disabled:opacity-50"
            >
              Enable MFA <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default PlatformMfaSetup
