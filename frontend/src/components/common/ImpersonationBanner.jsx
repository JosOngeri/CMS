/**
 * ImpersonationBanner — shows when the current session is a platform
 * support/impersonation session (F4). The backend flags it on the
 * profile payload as user.impersonation; readonly sessions can't mutate
 * (server-enforced), and the operator ends the session from the console.
 */
import { Eye, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ImpersonationBanner = () => {
  const { user } = useAuth();
  const imp = user?.impersonation;
  if (!imp) return null;

  const readonly = imp.mode === 'readonly';
  return (
    <div
      role="alert"
      className={`px-4 py-1.5 text-center text-xs font-medium flex items-center justify-center gap-2 ${
        readonly
          ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
          : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
      }`}
    >
      {readonly ? <Eye className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
      <span>
        Platform support session — viewing as this user{readonly ? ' (read-only: changes are disabled)' : ' (full access — actions are attributed to support)'}.
      </span>
    </div>
  );
};

export default ImpersonationBanner;
