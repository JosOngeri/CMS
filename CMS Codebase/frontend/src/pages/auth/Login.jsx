import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Church, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { colors } = useColorPalette()

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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-full" style={{ backgroundColor: colors.primary + '20' }}>
              <Church className="h-8 w-8" style={{ color: colors.primary }} aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-3xl font-bold" style={{ color: colors.text }}>
            Welcome Back
          </h2>
          <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
            Sign in to your SDA Church Kiserian account
          </p>
        </div>

        {/* Login Form */}
        <div className="py-8 px-6 shadow-lg rounded-lg" style={{ backgroundColor: colors.surface }}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email, Username, or Phone */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Email, Username, or Phone
              </label>
              <input
                {...register('email', {
                  required: 'Email, username, or phone is required',
                })}
                id="email"
                type="text"
                className="input w-full px-4 py-2 rounded-lg"
                aria-label="Email, username, or phone"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
                placeholder="Enter your email, username, or phone"
                autoComplete="username"
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm" style={{ color: colors.error }} role="alert">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                  })}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input w-full pr-10 px-4 py-2 rounded-lg"
                  aria-label="Password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
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
                    <EyeOff className="h-4 w-4" style={{ color: colors.textSecondary }} aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: colors.textSecondary }} aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">{errors.password.message}</p>
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
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-[var(--color-border)] rounded"
                  aria-label="Remember me"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-[var(--color-text)] ">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link to="/auth/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
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

          {/* Demo Credentials */}
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
        </div>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-sm text-[var(--color-textSecondary)] ">
            Don't have an account?{' '}
            <Link
              to="/auth/register"
              className="font-medium text-primary-600 hover:text-primary-500"
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