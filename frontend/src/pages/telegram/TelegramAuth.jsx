import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Smartphone,
  Key,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Settings,
  RefreshCw,
  TestTube,
  Info,
  AlertTriangle,
  Lock,
  Unlock,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const TelegramAuth = () => {
  const { api } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [authMethods, setAuthMethods] = useState([]);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newMethodType, setNewMethodType] = useState('bot');

  // Form state for each auth method
  const [formData, setFormData] = useState({});

  // Verification state
  const [verificationState, setVerificationState] = useState({
    phoneNumber: '',
    code: '',
    password: '',
    step: 'idle', // idle, phone_sent, code_sent, password_sent, success, error
    methodId: null,
    error: null
  });

  useEffect(() => {
    fetchAuthMethods();
  }, []);

  const fetchAuthMethods = async () => {
    try {
      setLoading(true);
      const response = await api.get('/telegramAuth/auth-methods');
      setAuthMethods(response.data?.data?.methods || response.data?.methods || []);
      
      // Initialize form data for each method
      const initialFormData = {};
      (response.data?.data?.methods || response.data?.methods || []).forEach(method => {
        initialFormData[method.id] = {
          botToken: method.config?.botToken || '',
          apiId: method.config?.apiId || '',
          apiHash: method.config?.apiHash || '',
          phoneNumber: method.config?.phoneNumber || '',
          sessionString: method.config?.sessionString || ''
        };
      });
      setFormData(initialFormData);
    } catch (error) {
      console.error('Failed to fetch auth methods:', error);
      toast.error('Failed to load authentication methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = () => {
    const newMethod = {
      id: `new-${Date.now()}`, // L649: must match the `startsWith('new-')` check in handleSaveMethod — a bare timestamp was POSTed as PUT /auth-methods/<ts> → 404
      type: newMethodType,
      name: `${newMethodType === 'bot' ? 'Bot API' : 'MTProto'} - ${authMethods.length + 1}`,
      config: {},
      isActive: false,
      isDefault: false
    };

    setAuthMethods([...authMethods, newMethod]);
    setFormData({
      ...formData,
      [newMethod.id]: {
        botToken: '',
        apiId: '',
        apiHash: '',
        phoneNumber: '',
        sessionString: ''
      }
    });
    setShowAddMethod(false);
    setNewMethodType('bot');
  };

  const handleDeleteMethod = (methodId) => setDeleteTarget(methodId);

  const confirmDeleteMethod = async () => {
    const methodId = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/telegramAuth/auth-methods/${methodId}`);
      setAuthMethods(authMethods.filter(m => m.id !== methodId));
      const newFormData = { ...formData };
      delete newFormData[methodId];
      setFormData(newFormData);
      toast.success('Authentication method deleted');
    } catch (error) {
      console.error('Failed to delete auth method:', error);
      toast.error('Failed to delete authentication method');
    }
  };

  const handleSaveMethod = async (methodId) => {
    try {
      setSaving(true);
      const method = authMethods.find(m => m.id === methodId);
      const data = formData[methodId];

      const payload = {
        type: method.type,
        name: method.name,
        config: data,
        isActive: method.isActive,
        isDefault: method.isDefault
      };

      if (methodId.startsWith('new-')) {
        // Create new method
        const response = await api.post('/telegramAuth/auth-methods', payload);
        // Update with real ID
        const updatedMethods = authMethods.map(m => 
          m.id === methodId ? { ...m, id: response.data?.data?.id || response.data?.id } : m
        );
        setAuthMethods(updatedMethods);
      } else {
        // Update existing method
        await api.put(`/telegramAuth/auth-methods/${methodId}`, payload);
      }

      toast.success('Authentication method saved successfully');
    } catch (error) {
      console.error('Failed to save auth method:', error);
      toast.error('Failed to save authentication method');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (methodId) => {
    try {
      setTesting(true);
      const response = await api.post(`/telegramAuth/auth-methods/${methodId}/test`);
      
      if (response.data.success) {
        toast.success('Connection test successful');
      } else {
        toast.error('Connection test failed: ' + (response.data?.data?.error || response.data?.error));
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleStartVerification = async (methodId) => {
    try {
      const method = authMethods.find(m => m.id === methodId);
      const data = formData[methodId];

      if (!data.phoneNumber) {
        toast.error('Please enter a phone number first');
        return;
      }

      setVerificationState({
        ...verificationState,
        step: 'phone_sent',
        methodId,
        phoneNumber: data.phoneNumber,
        error: null
      });

      const response = await api.post('/telegramAuth/start-auth', {
        phoneNumber: data.phoneNumber,
        methodId: methodId
      });

      if (response.data.success) {
        toast.success('Verification code sent');
        setVerificationState(prev => ({
          ...prev,
          step: 'code_sent',
          code: response.data?.data?.code || response.data?.code // For testing
        }));
      }
    } catch (error) {
      console.error('Failed to start verification:', error);
      toast.error('Failed to send verification code');
      setVerificationState(prev => ({
        ...prev,
        step: 'error',
        error: error.response?.data?.error || 'Failed to send verification code'
      }));
    }
  };

  const handleVerifyCode = async () => {
    try {
      const response = await api.post('/telegramAuth/verify-auth', {
        code: verificationState.code,
        phoneNumber: verificationState.phoneNumber,
        methodId: verificationState.methodId
      });

      if (response.data.success) {
        toast.success('Authentication successful');
        setVerificationState({
          phoneNumber: '',
          code: '',
          password: '',
          step: 'success',
          methodId: null,
          error: null
        });
      }
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error('Verification failed');
      setVerificationState(prev => ({
        ...prev,
        step: 'error',
        error: error.response?.data?.error || 'Invalid verification code'
      }));
    }
  };

  const handleSetDefault = async (methodId) => {
    try {
      await api.put(`/telegramAuth/auth-methods/${methodId}/set-default`);
      setAuthMethods(authMethods.map(m => ({
        ...m,
        isDefault: m.id === methodId
      })));
      toast.success('Default authentication method updated');
    } catch (error) {
      console.error('Failed to set default:', error);
      toast.error('Failed to set default method');
    }
  };

  const handleToggleActive = async (methodId) => {
    try {
      const method = authMethods.find(m => m.id === methodId);
      await api.put(`/telegramAuth/auth-methods/${methodId}`, {
        ...method,
        isActive: !method.isActive
      });
      setAuthMethods(authMethods.map(m => 
        m.id === methodId ? { ...m, isActive: !m.isActive } : m
      ));
      toast.success('Authentication method updated');
    } catch (error) {
      console.error('Failed to toggle active:', error);
      toast.error('Failed to update authentication method');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">Telegram Authentication</h1>
        <p className="text-[var(--color-textSecondary)]">
          Configure Telegram authentication methods for the system. You can use Bot API or MTProto.
        </p>
      </div>

      {/* Verification Modal */}
      {verificationState.step !== 'idle' && verificationState.step !== 'success' && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-end sm:items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {verificationState.step === 'phone_sent' && 'Sending Code...'}
              {verificationState.step === 'code_sent' && 'Enter Verification Code'}
              {verificationState.step === 'password_sent' && 'Enter 2FA Password'}
              {verificationState.step === 'error' && 'Error'}
            </h2>

            {verificationState.step === 'code_sent' && (
              <>
                <p className="text-[var(--color-textSecondary)] mb-4">
                  Enter the verification code sent to {verificationState.phoneNumber}
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="Telegram verification code"
                  value={verificationState.code}
                  onChange={(e) => setVerificationState({ ...verificationState, code: e.target.value })}
                  className="w-full border rounded-lg p-3 mb-4"
                  placeholder="Enter code"
                  maxLength={6}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyCode}
                    className="flex-1 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg p-3 hover:bg-[var(--color-primary)]"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => setVerificationState({ phoneNumber: '', code: '', password: '', step: 'idle', methodId: null, error: null })}
                    className="flex-1 bg-[var(--color-surface)] text-[var(--color-text)] rounded-lg p-3 hover:bg-[var(--color-surface)]"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {verificationState.step === 'error' && (
              <>
                <div className="flex items-center gap-2 text-[var(--color-error)] mb-4">
                  <AlertTriangle className="w-5 h-5" />
                  <p>{verificationState.error}</p>
                </div>
                <button
                  onClick={() => setVerificationState({ phoneNumber: '', code: '', password: '', step: 'idle', methodId: null, error: null })}
                  className="w-full bg-[var(--color-surface)] text-[var(--color-text)] rounded-lg p-3 hover:bg-[var(--color-surface)]"
                >
                  Close
                </button>
              </>
            )}

            {verificationState.step === 'phone_sent' && (
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {verificationState.step === 'success' && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-end sm:items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-md w-full mx-4 text-center">
            <CheckCircle className="w-16 h-16 text-[var(--color-success)] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Authentication Successful</h2>
            <p className="text-[var(--color-textSecondary)] mb-4">
              Your Telegram account has been successfully authenticated.
            </p>
            <button
              onClick={() => setVerificationState({ phoneNumber: '', code: '', password: '', step: 'idle', methodId: null, error: null })}
              className="w-full bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg p-3 hover:bg-[var(--color-primary)]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Add Method Button */}
      <div className="mb-6">
        {!showAddMethod ? (
          <button
            onClick={() => setShowAddMethod(true)}
            className="flex items-center gap-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] px-4 py-2 rounded-lg hover:bg-[var(--color-primary)]"
          >
            <Plus className="w-5 h-5" />
            Add Authentication Method
          </button>
        ) : (
          <div className="bg-[var(--color-background)] rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">Select Authentication Type</h3>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setNewMethodType('bot')}
                className={`flex-1 p-4 rounded-lg border-2 ${
                  newMethodType === 'bot' 
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' 
                    : 'border-[var(--color-border)] hover:border-[var(--color-border)]'
                }`}
              >
                <Bot className="w-8 h-8 mx-auto mb-2 text-[var(--color-primary)]" />
                <p className="font-semibold">Bot API</p>
                <p className="text-sm text-[var(--color-textSecondary)]">For bot operations</p>
              </button>
              <button
                onClick={() => setNewMethodType('mtproto')}
                className={`flex-1 p-4 rounded-lg border-2 ${
                  newMethodType === 'mtproto' 
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' 
                    : 'border-[var(--color-border)] hover:border-[var(--color-border)]'
                }`}
              >
                <Smartphone className="w-8 h-8 mx-auto mb-2 text-[var(--color-success)]" />
                <p className="font-semibold">MTProto</p>
                <p className="text-sm text-[var(--color-textSecondary)]">For user operations</p>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddMethod}
                className="bg-[var(--color-primary)] text-[var(--color-on-solid)] px-4 py-2 rounded-lg hover:bg-[var(--color-primary)]"
              >
                Add Method
              </button>
              <button
                onClick={() => {
                  setShowAddMethod(false);
                  setNewMethodType('bot');
                }}
                className="bg-[var(--color-surface)] text-[var(--color-text)] px-4 py-2 rounded-lg hover:bg-[var(--color-surface)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auth Methods List */}
      <div className="space-y-4">
        {authMethods.map((method) => (
          <div key={method.id} className="bg-[var(--color-surface)] border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {method.type === 'bot' ? (
                  <Bot className="w-8 h-8 text-[var(--color-primary)]" />
                ) : (
                  <Smartphone className="w-8 h-8 text-[var(--color-success)]" />
                )}
                <div>
                  <h3 className="font-semibold text-lg">{method.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)]">
                    {method.isDefault && (
                      <span className="bg-[var(--color-primary-light)] text-[var(--color-primary)] px-2 py-0.5 rounded-full text-xs">
                        Default
                      </span>
                    )}
                    {method.isActive ? (
                      <span className="flex items-center gap-1 text-[var(--color-success)]">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[var(--color-textSecondary)]">
                        <XCircle className="w-4 h-4" />
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {method.isDefault ? (
                  <span className="text-sm text-[var(--color-textSecondary)]">Default method</span>
                ) : (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => handleToggleActive(method.id)}
                  className={`p-2 rounded ${
                    method.isActive 
                      ? 'bg-[var(--color-success-light)] text-[var(--color-success)] hover:bg-[var(--color-success)]' 
                      : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  {method.isActive ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDeleteMethod(method.id)}
                  className="p-2 rounded bg-[var(--color-error-light)] text-[var(--color-error)] hover:bg-[var(--color-error)]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Configuration Form */}
            <div className="space-y-4">
              {method.type === 'bot' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                      Bot Token
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={formData[method.id]?.botToken || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          [method.id]: { ...formData[method.id], botToken: e.target.value }
                        })}
                        className="flex-1 border rounded-lg p-2"
                        placeholder="Enter bot token from @BotFather"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(formData[method.id]?.botToken || '');
                          toast.success('Copied to clipboard');
                        }}
                        className="p-2 bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)]"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                      Get your bot token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">@BotFather</a>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        API ID
                      </label>
                      <input
                        type="text"
                        value={formData[method.id]?.apiId || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          [method.id]: { ...formData[method.id], apiId: e.target.value }
                        })}
                        className="w-full border rounded-lg p-2"
                        placeholder="Enter API ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        API Hash
                      </label>
                      <input
                        type="password"
                        value={formData[method.id]?.apiHash || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          [method.id]: { ...formData[method.id], apiHash: e.target.value }
                        })}
                        className="w-full border rounded-lg p-2"
                        placeholder="Enter API Hash"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={formData[method.id]?.phoneNumber || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        [method.id]: { ...formData[method.id], phoneNumber: e.target.value }
                      })}
                      className="w-full border rounded-lg p-2"
                      placeholder="+254736075771"
                    />
                  </div>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    Get your API credentials from <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">my.telegram.org</a>
                  </p>
                </>
              )}

              {/* Session String (for MTProto) */}
              {method.type === 'mtproto' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Session String (Optional)
                  </label>
                  <textarea
                    value={formData[method.id]?.sessionString || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      [method.id]: { ...formData[method.id], sessionString: e.target.value }
                    })}
                    className="w-full border rounded-lg p-2"
                    rows={3}
                    placeholder="Paste session string if you have one"
                  />
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                    If you have an existing session string, you can paste it here to skip verification
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => handleSaveMethod(method.id)}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                <button
                  onClick={() => handleTestConnection(method.id)}
                  disabled={testing}
                  className="flex items-center gap-2 bg-[var(--color-success)] text-[var(--color-on-solid)] px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                  Test Connection
                </button>
                {method.type === 'mtproto' && (
                  <button
                    onClick={() => handleStartVerification(method.id)}
                    className="flex items-center gap-2 bg-[var(--color-accent)] text-[var(--color-on-solid)] px-4 py-2 rounded-lg hover:bg-[var(--color-accent)]"
                  >
                    <Shield className="w-4 h-4" />
                    Verify Account
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {authMethods.length === 0 && (
          <div className="text-center py-12 bg-[var(--color-background)] rounded-lg">
            <Key className="w-16 h-16 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">No Authentication Methods</h3>
            <p className="text-[var(--color-textSecondary)] mb-4">
              Add a Telegram authentication method to enable Telegram features
            </p>
            <button
              onClick={() => setShowAddMethod(true)}
              className="bg-[var(--color-primary)] text-[var(--color-on-solid)] px-4 py-2 rounded-lg hover:bg-[var(--color-primary)]"
            >
              Add Authentication Method
            </button>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-[var(--color-primary-light)] border border-[var(--color-primary-light)] rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[var(--color-primary)] mt-0.5" />
          <div>
            <h3 className="font-semibold text-[var(--color-primary)] mb-2">How to Configure Telegram</h3>
            <div className="space-y-2 text-sm text-[var(--color-primary)]">
              <p><strong>Bot API:</strong> Create a bot via @BotFather on Telegram to get a bot token. Use this for bot operations like sending messages.</p>
              <p><strong>MTProto:</strong> Get API credentials from my.telegram.org. Use this for user operations like accessing channels and groups.</p>
              <p className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                <a href="https://core.telegram.org/api" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Learn more about Telegram API
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        show={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteMethod}
        title="Delete Authentication Method"
        message="Are you sure you want to delete this authentication method? This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
};

export default TelegramAuth;
