import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const EmailVerification = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const toast = useToast();
  const navigate = useNavigate();
  const { colors } = useColorPalette();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmailToken(token);
    }
  }, [token]);

  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const verifyEmailToken = async (verificationToken) => {
    try {
      await axios.post('/api/auth/verify-email', { token: verificationToken });
      setIsVerified(true);
      toast.success('Email verified successfully');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Email verification failed');
    }
  };

  const resendVerification = async () => {
    setIsSending(true);
    try {
      // This would typically call an endpoint to resend verification email
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Verification email sent');
      setCountdown(60);
    } catch (err) {
      toast.error('Failed to send verification email');
    }
    setIsSending(false);
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--color-success)20' }}>
              <CheckCircle className="h-12 w-12" style={{ color: 'var(--color-success)' }} aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-3xl font-bold" style={{ color: colors.text }}>
            Email Verified
          </h2>
          <p className="mt-2" style={{ color: colors.textSecondary }}>
            Your email has been verified successfully. Redirecting to login...
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
              <Mail className="h-8 w-8" style={{ color: colors.primary }} aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-3xl font-bold" style={{ color: colors.text }}>
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
            We've sent a verification link to your email address
          </p>
        </div>

        {/* Verification Info */}
        <div className="py-8 px-6 shadow-lg rounded-lg" style={{ backgroundColor: colors.surface }}>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Please check your email and click the verification link to complete your registration.
              </p>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: colors.background }}>
              <h3 className="font-medium mb-2" style={{ color: colors.text }}>
                Didn't receive the email?
              </h3>
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                Check your spam folder or request a new verification email.
              </p>
              <button
                onClick={resendVerification}
                disabled={isSending || countdown > 0}
                className="w-full py-2 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                aria-label="Resend verification email"
                aria-busy={isSending}
                style={{
                  backgroundColor: colors.primary,
                  opacity: (isSending || countdown > 0) ? 0.7 : 1,
                  cursor: (isSending || countdown > 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    Resend Verification Email
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-medium"
                style={{ color: colors.primary, textDecoration: 'none' }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;