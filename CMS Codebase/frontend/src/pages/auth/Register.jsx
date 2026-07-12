import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Church, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { register: registerUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm()

  const password = watch('password')

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    const result = await registerUser(data)
    if (result.success) {
      toast.success('Account created successfully. Please log in.')
      navigate('/auth/login')
    } else {
      toast.error(result.error || 'Registration failed')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]  py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-primary-100  rounded-full">
              <Church className="h-8 w-8 text-primary-600 " aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-text)] ">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-[var(--color-textSecondary)] ">
            Join SDA Church Kiserian Main community
          </p>
        </div>

        {/* Register Form */}
        <div className="bg-[var(--color-surface)]  py-8 px-6 shadow-lg rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  First Name
                </label>
                <input
                  {...register('first_name', {
                    required: 'First name is required',
                  })}
                  id="first_name"
                  type="text"
                  className="input w-full"
                  aria-label="First name"
                  aria-invalid={errors.first_name ? 'true' : 'false'}
                  aria-describedby={errors.first_name ? 'first_name-error' : undefined}
                  placeholder="First name"
                  autoComplete="given-name"
                />
                {errors.first_name && (
                  <p id="first_name-error" className="mt-1 text-sm text-red-600" role="alert">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Last Name
                </label>
                <input
                  {...register('last_name', {
                    required: 'Last name is required',
                  })}
                  id="last_name"
                  type="text"
                  className="input w-full"
                  aria-label="Last name"
                  aria-invalid={errors.last_name ? 'true' : 'false'}
                  aria-describedby={errors.last_name ? 'last_name-error' : undefined}
                  placeholder="Last name"
                  autoComplete="family-name"
                />
                {errors.last_name && (
                  <p id="last_name-error" className="mt-1 text-sm text-red-600" role="alert">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                Username
              </label>
              <input
                {...register('username', {
                  required: 'Username is required',
                  minLength: {
                    value: 3,
                    message: 'Username must be at least 3 characters',
                  },
                })}
                id="username"
                type="text"
                className="input w-full"
                aria-label="Username"
                aria-invalid={errors.username ? 'true' : 'false'}
                aria-describedby={errors.username ? 'username-error' : undefined}
                placeholder="Choose a username"
                autoComplete="username"
              />
              {errors.username && (
                <p id="username-error" className="mt-1 text-sm text-red-600" role="alert">{errors.username.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)]  mb-2">
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
                className="input w-full"
                aria-label="Email address"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                placeholder="Enter your email"
                autoComplete="email"
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                Phone Number
              </label>
              <input
                {...register('phone_number', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[\d\s\-\+\(\)]+$/,
                    message: 'Invalid phone number',
                  },
                })}
                id="phone_number"
                type="tel"
                className="input w-full"
                aria-label="Phone number"
                aria-invalid={errors.phone_number ? 'true' : 'false'}
                aria-describedby={errors.phone_number ? 'phone_number-error' : undefined}
                placeholder="+254 700 000 000"
                autoComplete="tel"
              />
              {errors.phone_number && (
                <p id="phone_number-error" className="mt-1 text-sm text-red-600" role="alert">{errors.phone_number.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input w-full pr-10"
                  aria-label="Password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  placeholder="Create a password"
                  autoComplete="new-password"
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
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input w-full pr-10"
                  aria-label="Confirm password"
                  aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="mt-1 text-sm text-red-600" role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-[var(--color-border)] rounded"
                aria-label="Agree to terms and privacy policy"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-[var(--color-text)] ">
                I agree to the{' '}
                <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                  Terms of use
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                  Privacy notice
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full btn-lg"
                aria-label="Create account"
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
                    Creating Account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-sm text-[var(--color-textSecondary)] ">
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
