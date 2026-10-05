/**
 * Friendly landing spot when the platform has switched a module off for
 * this church. The AuthContext axios interceptor redirects MODULE_DISABLED
 * 403s here instead of treating them like session failures.
 */
import { Ban, ArrowLeft, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ModuleDisabledPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const slug = user?.church_slug;
  const back = () => navigate(slug ? `/${slug}/dashboard` : '/dashboard');

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 shadow-sm">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-warning-light)] flex items-center justify-center mb-6">
          <Ban className="w-8 h-8 text-[var(--color-warning)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-3">
          This module is unavailable
        </h1>
        <p className="text-[var(--color-textSecondary)] mb-2">
          This feature has been turned off for your church.
        </p>
        <p className="text-[var(--color-textSecondary)] mb-8 flex items-center justify-center gap-2">
          <Mail className="w-4 h-4" />
          If you believe this is a mistake, please contact your platform administrator.
        </p>
        <button onClick={back} className="btn btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ModuleDisabledPage;
