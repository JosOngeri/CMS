import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Shield, Loader2, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const MFASetup = () => {
  const [step, setStep] = useState(1); // 1: setup, 2: verify
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { colors } = useColorPalette();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const initiateSetup = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/mfa/enable');
      setQrCode(response.data.data.qrCode);
      setSecret(response.data.data.secret);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate MFA setup');
    }
    setIsLoading(false);
  };

  const verifySetup = async (data) => {
    setIsLoading(true);
    try {
      await axios.post('/api/auth/mfa/verify', { token: data.token });
      toast.success('MFA enabled successfully');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid verification code');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-full" style={{ backgroundColor: colors.primary + '20' }}>
              <Shield className="h-8 w-8" style={{ color: colors.primary }} aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-3xl font-bold" style={{ color: colors.text }}>
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
            Add an extra layer of security to your account
          </p>
        </div>

        {/* Step 1: Introduction */}
        {step === 1 && (
          <div className="py-8 px-6 shadow-lg rounded-lg" style={{ backgroundColor: colors.surface }}>
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <Smartphone className="h-6 w-6 mt-1" style={{ color: colors.primary }} aria-hidden="true" />
                <div>
                  <h3 className="font-medium" style={{ color: colors.text }}>Authenticator App</h3>
                  <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                    Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 mt-1" style={{ color: 'var(--color-success)' }} aria-hidden="true" />
                <div>
                  <h3 className="font-medium" style={{ color: colors.text }}>Enhanced Security</h3>
                  <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                    Even if someone has your password, they won't be able to access your account without the code
                  </p>
                </div>
              </div>

              <button
                onClick={initiateSetup}
                disabled={isLoading}
                className="w-full py-3 rounded-lg font-medium text-white"
                aria-label="Get started with MFA setup"
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
                    Setting up...
                  </div>
                ) : (
                  'Get Started'
                )}
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 rounded-lg font-medium"
                aria-label="Skip MFA setup for now"
                style={{
                  backgroundColor: 'transparent',
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Scan QR Code */}
        {step === 2 && (
          <div className="py-8 px-6 shadow-lg rounded-lg" style={{ backgroundColor: colors.surface }}>
            <form className="space-y-6" onSubmit={handleSubmit(verifySetup)}>
              {/* QR Code */}
              <div className="text-center">
                <div className="inline-block p-4 rounded-lg bg-[var(--color-surface)]">
                  {qrCode && (
                    <img
                      src={qrCode}
                      alt="QR code for two-factor authentication setup"
                      className="w-48 h-48"
                    />
                  )}
                </div>
                <p className="mt-4 text-sm" style={{ color: colors.textSecondary }}>
                  Scan this QR code with your authenticator app
                </p>
              </div>

              {/* Manual Entry */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Or enter this code manually:
                </label>
                <div className="p-3 rounded-lg font-mono text-sm break-all" style={{ backgroundColor: colors.background, color: colors.text }}>
                  {secret}
                </div>
              </div>

              {/* Verification Code */}
              <div>
                <label htmlFor="token" className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Enter the 6-digit code from your app
                </label>
                <input
                  {...register('token', {
                    required: 'Verification code is required',
                    pattern: {
                      value: /^\d{6}$/,
                      message: 'Please enter a 6-digit code',
                    },
                  })}
                  id="token"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full px-4 py-2 rounded-lg text-center text-2xl tracking-widest"
                  aria-label="Verification code"
                  aria-invalid={errors.token ? 'true' : 'false'}
                  aria-describedby={errors.token ? 'token-error' : undefined}
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
                {errors.token && (
                  <p id="token-error" className="mt-1 text-sm" style={{ color: colors.error }} role="alert">{errors.token.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-lg font-medium"
                  aria-label="Go back to MFA setup introduction"
                  style={{
                    backgroundColor: 'transparent',
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-lg font-medium text-white"
                  aria-label="Verify and enable MFA"
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
                      Verifying...
                    </div>
                  ) : (
                    'Verify & Enable'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFASetup;