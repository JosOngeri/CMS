import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Church, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { colors } = useColorPalette();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        newPassword: data.password,
      });
      setIsSuccess(true);
      toast.success('Password reset successfully');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Password reset failed');
    }
    setIsLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
        <div className="max-w-md w-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
              Invalid Reset Link
            </h2>
            <p className="mt-2" style={{ color: colors.textSecondary }}>
              This password reset link is invalid or has expired.
            </p>
            <Link
              to="/auth/forgot-password"
              className="mt-4 inline-block font-medium"
              style={{ color: colors.primary }}
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--color-success)20' }}>
              <CheckCircle className="h-12 w-12" style={{ color: 'var(--color-success)' }} aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-3xl font-bold" style={{ color: colors.text }}>
            Password Reset Successful
          </h2>
          <p className="mt-2" style={{ color: colors.textSecondary }}>
            Your password has been reset successfully. You will be redirected to the login page.
          </p>
        </div>
      </div>
    );
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
            Reset Password
          </h2>
          <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
            Create a new secure password
          </p>
        </div>

        {/* Reset Password Form */}
        <div className="py-8 px-6 shadow-lg rounded-lg" style={{ backgroundColor: colors.surface }}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                New Password
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
                  className="w-full pr-10 px-4 py-2 rounded-lg"
                  aria-label="New password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" style={{ color: colors.textSecondary }} aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: colors.textSecondary }} aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm" style={{ color: colors.error }} role="alert">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="w-full pr-10 px-4 py-2 rounded-lg"
                  aria-label="Confirm new password"
                  aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" style={{ color: colors.textSecondary }} aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: colors.textSecondary }} aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="mt-1 text-sm" style={{ color: colors.error }} role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg font-medium text-white"
                aria-label="Reset password"
                aria-busy={isLoading}
                style={{
                  backgroundColor: colors.primary,
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
                    Resetting password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Back to Login */}
        <div className="text-center">
          <Link
            to="/login"
            className="text-sm font-medium"
            style={{ color: colors.primary, textDecoration: 'none' }}
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;