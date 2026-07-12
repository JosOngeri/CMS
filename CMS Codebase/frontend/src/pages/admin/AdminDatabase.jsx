import { Database, Server, ShieldAlert } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const AdminDatabase = () => {
  const { user } = useAuth()
  const allowed = user?.roles?.includes('Super Admin')

  if (!allowed) {
    return <Navigate to="/dashboard/admin" replace />
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">Database & backups</h1>
        <p className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] mt-1">
          Operational notes for Super Admins. Heavy maintenance is done on the server, not in the browser.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 border-amber-900/50 bg-amber-50 bg-amber-950/30 p-4 flex gap-3">
        <ShieldAlert className="w-6 h-6 text-amber-700 text-amber-400 shrink-0" />
        <p className="text-sm text-amber-900 text-amber-100">
          Do not expose database credentials in the frontend. Use server SSH, managed Postgres consoles, or your
          hosting provider&apos;s backup tools.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] border-[var(--color-border)] bg-[var(--color-surface)] bg-[var(--color-surface)] p-5">
          <Database className="w-8 h-8 text-[var(--color-primary)]-600 text-[var(--color-primary)]-400 mb-3" />
          <h2 className="font-semibold text-[var(--color-text)] text-white mb-2">Backups</h2>
          <ul className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] space-y-2 list-disc pl-4">
            <li>Schedule automated dumps (e.g. <code className="text-xs bg-[var(--color-surface)] px-1 rounded">pg_dump</code>) on the host.</li>
            <li>Store copies off-site with encryption.</li>
            <li>Test restore on a staging instance periodically.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] border-[var(--color-border)] bg-[var(--color-surface)] bg-[var(--color-surface)] p-5">
          <Server className="w-8 h-8 text-green-600 text-green-400 mb-3" />
          <h2 className="font-semibold text-[var(--color-text)] text-white mb-2">Health</h2>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] mb-3">
            The API exposes a health route for uptime checks once the database check is configured correctly on the
            server.
          </p>
          <code className="text-xs block bg-[var(--color-surface)] p-2 rounded text-[var(--color-text)] text-[var(--color-text)]">
            GET /api/health
          </code>
        </div>
      </div>
    </div>
  )
}

export default AdminDatabase
