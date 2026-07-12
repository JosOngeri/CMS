import React, { useState } from 'react';
import { X, Send, Key, Smartphone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const TelegramAuthModal = ({ isOpen, onClose }) => {
  const { api, user } = useAuth();
  const toast = useToast();
  
  const [step, setStep] = useState('idle'); // idle, phone, code, success, error
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is admin
  const isAdmin = user?.roles?.some(role => 
    ['Super Admin', 'Pastor', 'Department Head'].includes(role)
  );

  if (!isOpen) return null;

  const handleStartAuth = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError('Phone number is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await api.post('/telegram/start-auth', {
        phoneNumber: phoneNumber
      });

      if (response.data.success) {
        setStep('code');
        toast.success('Verification code sent to your Telegram app');
      }
    } catch (error) {
      console.error('Auth start failed:', error);
      setError(error.response?.data?.error || 'Failed to send verification code');
      toast.error('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      setError('Verification code is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await api.post('/telegram/verify-auth', {
        code: verificationCode,
        phoneNumber: phoneNumber
      });

      if (response.data.success) {
        setStep('success');
        toast.success('Telegram authentication successful!');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setError(error.response?.data?.error || 'Invalid verification code');
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('idle');
    setPhoneNumber('');
    setVerificationCode('');
    setError('');
    onClose();
  };

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[var(--color-text)]">Access Denied</h3>
            <button onClick={handleClose} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-[var(--color-textSecondary)]">
            You need admin privileges to configure Telegram integration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-text)]">Telegram Authentication</h3>
          </div>
          <button onClick={handleClose} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'idle' && (
          <div>
            <p className="text-[var(--color-textSecondary)] mb-6">
              Connect your Telegram account to enable photo sync from your church channel.
            </p>
            <form onSubmit={handleStartAuth}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254700000000"
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--color-background)] text-[var(--color-text)]"
                  required
                />
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  Include country code (e.g., +254 for Kenya)
                </p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {step === 'code' && (
          <div>
            <p className="text-[var(--color-textSecondary)] mb-6">
              Enter the verification code sent to your Telegram app.
            </p>
            <form onSubmit={handleVerifyCode}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--color-background)] text-[var(--color-text)] text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  6-digit code from Telegram
                </p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    Verify Code
                  </>
                )}
              </button>
            </form>
            <button
              onClick={() => setStep('idle')}
              className="w-full mt-3 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] py-2"
            >
              Back to Phone Number
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">
              Authentication Successful!
            </h3>
            <p className="text-[var(--color-textSecondary)] mb-6">
              Your Telegram account is now connected. You can sync photos from your church channel.
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600"
            >
              Done
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-start gap-2">
            <Key className="h-4 w-4 text-[var(--color-textSecondary)] mt-0.5" />
            <p className="text-xs text-[var(--color-textSecondary)]">
              Your Telegram credentials are securely stored and used only for syncing church photos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramAuthModal;
