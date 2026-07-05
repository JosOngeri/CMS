import { useState, useEffect } from 'react';
import { Shield, QrCode, Key, RefreshCw, Copy, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const TwoFactorAuth = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch2FAStatus();
  }, []);

  const fetch2FAStatus = async () => {
    try {
      const response = await api.get('/security/2fa/status');
      setEnabled(response.data.enabled);
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    }
  };

  const enable2FA = async () => {
    try {
      const response = await api.post('/security/2fa/enable');
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setBackupCodes(response.data.backupCodes);
    } catch (error) {
      toast.error('Failed to enable 2FA');
    }
  };

  const verify2FA = async () => {
    try {
      await api.post('/security/2fa/verify', { code: verificationCode });
      setEnabled(true);
      toast.success('2FA enabled successfully');
      setQrCode('');
      setSecret('');
    } catch (error) {
      toast.error('Invalid verification code');
    }
  };

  const disable2FA = async () => {
    try {
      await api.post('/security/2fa/disable');
      setEnabled(false);
      toast.success('2FA disabled');
    } catch (error) {
      toast.error('Failed to disable 2FA');
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>

      {/* 2FA Status */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className={enabled ? 'text-green-600' : 'text-[var(--color-textSecondary)]'} size={24} aria-hidden="true" />
            <div>
              <div className="font-semibold">2FA Status</div>
              <div className="text-sm text-[var(--color-textSecondary)]">
                {enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>
          {!enabled ? (
            <button
              onClick={enable2FA}
              className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
              aria-label="Enable two-factor authentication"
            >
              Enable 2FA
            </button>
          ) : (
            <button
              onClick={disable2FA}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              aria-label="Disable two-factor authentication"
            >
              Disable 2FA
            </button>
          )}
        </div>
      </div>

      {/* QR Code Setup */}
      {qrCode && (
        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="text-[var(--color-primary)]-600" size={20} aria-hidden="true" />
            <h3 className="font-semibold">Scan QR Code</h3>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="bg-[var(--color-surface)] p-4 border rounded-lg">
              <img src={qrCode} alt="QR code for two-factor authentication setup" className="w-48 h-48" />
            </div>
            <div className="text-center">
              <div className="text-sm text-[var(--color-textSecondary)] mb-2">Or enter this secret:</div>
              <div className="flex items-center gap-2">
                <code className="bg-[var(--color-surface)] px-3 py-2 rounded">{secret}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                    toast.success('Secret copied');
                  }}
                  className="p-2 hover:bg-[var(--color-surface)] rounded"
                  aria-label="Copy secret to clipboard"
                >
                  <Copy size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="w-full max-w-xs">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full p-2 border rounded-lg text-center text-2xl tracking-widest"
                aria-label="Verification code"
                maxLength={6}
              />
              <button
                onClick={verify2FA}
                className="w-full mt-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                aria-label="Verify two-factor authentication code"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes */}
      {enabled && backupCodes.length > 0 && (
        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="text-orange-600" size={20} aria-hidden="true" />
            <h3 className="font-semibold">Backup Codes</h3>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              Save these backup codes in a safe place. You can use them to access your account if you lose your 2FA device.
            </p>
          </div>
          <div className="space-y-2 mb-4">
            {backupCodes.map((code, index) => (
              <div key={index} className="bg-[var(--color-background)] p-2 rounded font-mono text-center">
                {code}
              </div>
            ))}
          </div>
          <button
            onClick={copyBackupCodes}
            className="w-full py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)] flex items-center justify-center gap-2"
            aria-label="Copy all backup codes"
          >
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? 'Copied!' : 'Copy All Codes'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth;
