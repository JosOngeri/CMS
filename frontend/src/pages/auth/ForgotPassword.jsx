/**
 * WHAT THIS FILE DOES
 * -------------------
 * Public "forgot password" page. The user enters their email; the backend
 * sends a reset link if the account exists.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /auth/forgot-password  → triggers the reset email
 * - contexts/AuthContext.jsx       → api client (CSRF token attached)
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Church, Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'

const ForgotPassword = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const { api } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      await api.post('/auth/forgot-password', { email: data.email })
      setIsSuccess(true)
      toast.success('Password reset email sent! Check your inbox.')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send reset email. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-[var(--color-success-light)] rounded-full">
              <CheckCircle className="h-8 w-8 text-[var(--color-success)]" aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Email Sent</h2>
          <p className="mt-2 text-sm text-[var(--color-textSecondary)]">
            We've sent a password reset link to your email. Please check your inbox and follow the instructions.
          </p>
        </div>
        <div className="bg-[var(--color-surface)] py-6 px-6 shadow-lg rounded-lg space-y-4 text-sm text-[var(--color-text)]">
          <p className="text-[var(--color-textSecondary)]">
            Didn't receive the email? Check your spam folder or request another reset link.
          </p>
        </div>
        <div className="text-center space-y-4">
          <button
            onClick={() => setIsSuccess(false)}
            className="text-primary-600 hover:underline text-sm"
          >
            Request another reset link
          </button>
          <p className="text-sm">
            <Link to="/auth/login" className="text-primary-600 hover:underline">
              ← Back to sign in
            </Link>
          </p>
        </div>
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
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Reset your password</h2>
        <p className="mt-2 text-sm text-[var(--color-textSecondary)]">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="bg-[var(--color-surface)] py-6 px-6 shadow-lg rounded-lg">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Email Address
            </label>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Invalid email address',
                },
              })}
              id="email"
              type="email"
              inputMode="email"
              className="input w-full"
              aria-label="Email address"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              placeholder="Enter your email"
              autoComplete="email"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-[var(--color-error)]" role="alert">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send reset link"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
                Sending...
              </div>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      </div>

      <div className="bg-[var(--color-surface)] py-4 px-6 shadow-lg rounded-lg space-y-2 text-sm text-[var(--color-text)]">
        <p className="text-[var(--color-textSecondary)]">Need immediate help?</p>
        <a
          href="mailto:info@sda-kiserian.org?subject=Portal%20password%20reset"
          className="flex items-center gap-2 text-primary-600 font-medium hover:underline"
          aria-label="Email info@sda-kiserian.org for password reset"
        >
          <Mail className="w-4 h-4" aria-hidden="true" />
          Email info@sda-kiserian.org
        </a>
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

export default ForgotPassword
