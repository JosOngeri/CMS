/**
 * WHAT THIS FILE DOES
 * -------------------
 * Public "reset password" page — the target of the link sent by
 * forgot-password. Reads ?token= from the URL, collects a new password
 * (twice), and posts it to the backend which validates strength + token
 * and rotates the credentials.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /auth/reset-password   → validates token + applies the new hash
 * - utils/emailService.js          → sends users here (?token=...)
 * - contexts/AuthContext.jsx       → api client (CSRF token attached)
 */

import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Church, Lock, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'

// Client-side mirror of helpers/security.js validatePasswordStrength —
// instant feedback; the backend re-validates authoritatively.
const passwordRules = {
  required: 'New password is required',
  minLength: { value: 8, message: 'Password must be at least 8 characters' },
  validate: {
    upper: (v) => /[A-Z]/.test(v) || 'Must contain an uppercase letter',
    lower: (v) => /[a-z]/.test(v) || 'Must contain a lowercase letter',
    number: (v) => /[0-9]/.test(v) || 'Must contain a number',
    special: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v) || 'Must contain a special character',
  },
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()
  const { api } = useAuth()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const newPassword = watch('newPassword')

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: data.newPassword })
      setIsSuccess(true)
      toast.success('Password reset successfully! You can now sign in.')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password. The link may have expired.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-[var(--color-error-light)] rounded-full">
            <AlertCircle className="h-8 w-8 text-[var(--color-error)]" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Invalid reset link</h2>
        <p className="mt-2 text-sm text-[var(--color-textSecondary)]">
          This link is missing its reset token. Request a new password reset to get a valid link.
        </p>
        <p className="text-sm">
          <Link to="/auth/forgot-password" className="text-primary-600 hover:underline">
            Request a new reset link
          </Link>
        </p>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-[var(--color-success-light)] rounded-full">
            <CheckCircle className="h-8 w-8 text-[var(--color-success)]" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Password updated</h2>
        <p className="mt-2 text-sm text-[var(--color-textSecondary)]">
          Your password has been reset. Sign in with your new password.
        </p>
        <p className="text-sm">
          <Link to="/auth/login" className="text-primary-600 hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md w-full space-y-8">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-[var(--color-primary-light)]">
            <Church className="h-8 w-8 text-[var(--color-primary)]" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Choose a new password</h2>
        <p className="mt-2 text-sm text-[var(--color-textSecondary)]">
          Enter a new password for your account.
        </p>
      </div>

      <div className="bg-[var(--color-surface)] py-6 px-6 shadow-lg rounded-lg">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--color-text)] mb-2">
              New Password
            </label>
            <input
              {...register('newPassword', passwordRules)}
              id="newPassword"
              type="password"
              className="input w-full"
              aria-label="New password"
              aria-invalid={errors.newPassword ? 'true' : 'false'}
              aria-describedby={errors.newPassword ? 'newpassword-error' : undefined}
              placeholder="Enter new password"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {errors.newPassword && (
              <p id="newpassword-error" className="mt-1 text-sm text-[var(--color-error)]" role="alert">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Confirm Password
            </label>
            <input
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === newPassword || 'Passwords do not match',
              })}
              id="confirmPassword"
              type="password"
              className="input w-full"
              aria-label="Confirm new password"
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              aria-describedby={errors.confirmPassword ? 'confirmpassword-error' : undefined}
              placeholder="Repeat new password"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <p id="confirmpassword-error" className="mt-1 text-sm text-[var(--color-error)]" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Reset password"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
                Resetting...
              </div>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Lock className="h-5 w-5" aria-hidden="true" />
                Reset Password
              </span>
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-sm">
        <Link to="/auth/login" className="text-primary-600 hover:underline flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

export default ResetPassword
