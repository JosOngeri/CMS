import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Trash2, Shield, LogOut, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { colors } = useColorPalette();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get('/api/auth/sessions');
      setSessions(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch sessions');
    }
    setIsLoading(false);
  };

  const revokeSession = async (sessionId) => {
    try {
      await axios.delete(`/api/auth/sessions/${sessionId}`);
      toast.success('Session revoked successfully');
      fetchSessions();
    } catch (err) {
      toast.error('Failed to revoke session');
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm('Are you sure you want to revoke all sessions? You will be logged out.')) {
      return;
    }

    try {
      await axios.delete('/api/auth/sessions');
      toast.success('All sessions revoked successfully');
      logout();
      navigate('/login');
    } catch (err) {
      toast.error('Failed to revoke all sessions');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.primary }} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
            Active Sessions
          </h1>
          <p className="mt-2" style={{ color: colors.textSecondary }}>
            Manage your active login sessions across devices
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={revokeAllSessions}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            aria-label="Revoke all sessions"
            style={{ backgroundColor: 'var(--color-error)' }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Revoke All Sessions
          </button>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12 rounded-lg" style={{ backgroundColor: colors.surface }}>
              <Monitor className="h-12 w-12 mx-auto mb-4" style={{ color: colors.textSecondary }} aria-hidden="true" />
              <p className="text-lg font-medium" style={{ color: colors.text }}>
                No active sessions
              </p>
              <p className="mt-2" style={{ color: colors.textSecondary }}>
                You don't have any active sessions
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="p-6 rounded-lg shadow-sm"
                style={{ backgroundColor: colors.surface }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full" style={{ backgroundColor: colors.primary + '20' }}>
                      <Monitor className="h-6 w-6" style={{ color: colors.primary }} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium" style={{ color: colors.text }}>
                          {session.status === 'Active' ? 'Current Session' : 'Other Session'}
                        </h3>
                        {session.status === 'Active' && (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--color-success)20', color: 'var(--color-success)' }}>
                            <Shield className="h-3 w-3" aria-hidden="true" />
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm space-y-1" style={{ color: colors.textSecondary }}>
                        <p>
                          <span className="font-medium">Created:</span>{' '}
                          {new Date(session.created_at).toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">Expires:</span>{' '}
                          {new Date(session.expires_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  {session.status !== 'Active' && (
                    <button
                      onClick={() => revokeSession(session.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      aria-label={`Revoke session from ${session.device_info}`}
                      style={{ color: 'var(--color-error)' }}
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Security Tips */}
        <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: colors.primary + '10' }}>
          <h3 className="font-medium mb-3" style={{ color: colors.text }}>
            Security Tips
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: colors.textSecondary }}>
            <li>• Regularly review your active sessions</li>
            <li>• Revoke sessions from devices you no longer use</li>
            <li>• Enable two-factor authentication for extra security</li>
            <li>• Use strong, unique passwords for your account</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sessions;