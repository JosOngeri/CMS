import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Church, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useChurchBranding } from '../../hooks/useChurchBranding'

const Login = () => {
  const { churchName } = useChurchBranding()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    setIsLoading(true)
    const result = await login(data)
    if (result.success) {
      console.log('[Login] success:', result)
      toast.success('Login successful')
      navigate('/dashboard/overview')
    } else {
      console.error('[Login] failed:', result)
      toast.error(result.error || 'Login failed')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--color-background)]">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-full bg-[var(--color-primary-light)]">
              <Church className="h-8 w-8 text-[var(--color-primary)]" aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-text)]">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-[var(--color-textSecondary)]">
            Sign in to your {churchName} account
          </p>
        </div>

        {/* Login Form */}
        <div className="py-8 px-6 shadow-lg rounded-lg bg-[var(--color-surface)]">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email, Username, or Phone */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-[var(--color-text)]">
                Email, Username, or Phone
              </label>
              <input
                {...register('email', {
                  required: 'Email, username, or phone is required',
                })}
                id="email"
                type="text"
                className="input w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                aria-label="Email, username, or phone"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                placeholder="Enter your email, username, or phone"
                autoComplete="username"
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-[var(--color-error)]" role="alert">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-[var(--color-text)]">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                  })}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input w-full pr-10 px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  aria-label="Password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-[var(--color-error)]" role="alert">{errors.password.message}</p>
              )}
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  {...register('rememberMe')}
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-[var(--color-border)] rounded"
                  aria-label="Remember me"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-[var(--color-text)] ">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link to="/auth/forgot-password" className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-600)]">
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full btn-lg"
                aria-label="Sign in"
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Demo Credentials — dev builds only (L606) */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-4 bg-[var(--color-background)] rounded-lg">
              <p className="text-sm text-[var(--color-textSecondary)]  mb-2">
                <strong>Demo Credentials (Email/Username/Phone):</strong>
              </p>
              <div className="text-xs space-y-1 text-[var(--color-textSecondary)] ">
                <p>Admin: admin@sda.org / admin@123</p>
                <p>Treasurer: treasurer@sda.org / treasurer123</p>
                <p>Pastor: pastor@sda.org / pastor123</p>
                <p>Member: member@sda.org / member123</p>
              </div>
            </div>
          )}
        </div>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-sm text-[var(--color-textSecondary)] ">
            Don&rsquo;t have an account?{' '}
            <Link
              to="/auth/register"
              className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-600)]"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login