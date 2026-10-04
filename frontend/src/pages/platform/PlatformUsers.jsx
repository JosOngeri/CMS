import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Plus, KeyRound, UserX, UserCheck, Copy, Check, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'
import { fmtDateTime } from '../../utils/format'

const ROLE_LABELS = {
  platform_owner: 'Owner',
  platform_admin: 'Admin',
  support_staff: 'Support',
}

const PlatformUsers = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'platform_admin' })
  const [credentials, setCredentials] = useState(null) // {email, temporaryPassword}
  const [resetTarget, setResetTarget] = useState(null)

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/api/platform/users')
      setUsers(response.data.data || [])
    } catch (error) {
      if (error.response?.status === 403) {
        setForbidden(true)
      } else {
        toast.error('Failed to load platform admins')
      }
    } finally {
      setLoading(false)
    }
  }, [api, toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const createUser = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post('/api/platform/users', form)
      setShowCreate(false)
      setForm({ name: '', email: '', role: 'platform_admin' })
      if (response.data.data?.temporaryPassword) {
        setCredentials({ email: response.data.data.email, temporaryPassword: response.data.data.temporaryPassword })
      } else {
        toast.success('Platform user created')
      }
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create user')
    }
  }

  const toggleMfa = async (user) => {
    try {
      await api.patch(`/api/platform/users/${user.id}`, { mfa_required: !user.mfa_required })
      toast.success(user.mfa_required ? 'MFA requirement removed' : 'MFA now required — user will be forced through setup at next login')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update MFA requirement')
    }
  }

  const toggleActive = async (user) => {
    try {
      await api.patch(`/api/platform/users/${user.id}`, { is_active: !user.is_active })
      toast.success(user.is_active ? 'Account deactivated' : 'Account reactivated')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update user')
    }
  }

  const resetPassword = async () => {
    try {
      const response = await api.post(`/api/platform/users/${resetTarget.id}/reset-password`, {})
      const temporaryPassword = response.data.data?.temporaryPassword
      setResetTarget(null)
      if (temporaryPassword) {
        setCredentials({ email: resetTarget.email, temporaryPassword })
      } else {
        toast.success('Password updated')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password')
    }
  }

  if (loading) return <FullPageLoading message="Loading platform admins..." />

  if (forbidden) {
    return <EmptyState icon={ShieldCheck} title="Owner access required" description="Only the platform owner can manage admin accounts." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Platform Admins</h1>
          <p className="text-[var(--color-textSecondary)]">People who can sign in to this console. Church users are managed inside each church.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg"
        >
          <Plus className="h-4 w-4" /> Add admin
        </button>
      </div>

      <Card className="p-6">
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">MFA</th>
                  <th className="pb-3 font-medium">Last login</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3">
                      <p className="text-[var(--color-text)] font-medium">{user.name}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">{user.email}</p>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-error-light)] text-[var(--color-error)]'}`}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${user.mfa_enabled ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : user.mfa_required ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' : 'bg-[var(--color-background)] text-[var(--color-textSecondary)]'}`}>
                        {user.mfa_enabled ? 'Enabled' : user.mfa_required ? 'Required' : 'Off'}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{user.last_login ? fmtDateTime(user.last_login) : 'Never'}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setResetTarget(user)} title="Reset password" className="p-2 rounded-lg hover:bg-[var(--color-background)] text-[var(--color-textSecondary)]">
                          <KeyRound className="h-4 w-4" />
                        </button>
                        {user.role !== 'platform_owner' && (
                          <>
                            <button onClick={() => toggleMfa(user)} title={user.mfa_required ? 'Remove MFA requirement' : 'Require MFA'} className={`p-2 rounded-lg hover:bg-[var(--color-background)] ${user.mfa_required ? 'text-[var(--color-warning)]' : 'text-[var(--color-textSecondary)]'}`}>
                              <ShieldAlert className="h-4 w-4" />
                            </button>
                            <button onClick={() => toggleActive(user)} title={user.is_active ? 'Deactivate' : 'Reactivate'} className="p-2 rounded-lg hover:bg-[var(--color-background)] text-[var(--color-textSecondary)]">
                              {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={ShieldCheck} title="No platform admins" description="Add the first admin account." />
        )}
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-overlay)] p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg bg-[var(--color-surface)] p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Add platform admin</h2>
            <form onSubmit={createUser} className="space-y-4">
              <label className="block text-sm text-[var(--color-text)]">Name
                <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" />
              </label>
              <label className="block text-sm text-[var(--color-text)]">Email
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" />
              </label>
              <label className="block text-sm text-[var(--color-text)]">Role
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <option value="platform_admin">Admin — manage churches and settings</option>
                  <option value="support_staff">Support — read-only access</option>
                </select>
              </label>
              <p className="text-xs text-[var(--color-textSecondary)]">A temporary password is generated and shown once — share it with the admin securely.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-[var(--color-border)] px-4 py-2">Cancel</button>
                <button type="submit" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[var(--color-on-solid)]">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-overlay)] p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-lg bg-[var(--color-surface)] p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Reset password for {resetTarget.name}?</h2>
            <p className="text-sm text-[var(--color-textSecondary)]">A new temporary password will be generated and shown once. Their old password stops working immediately.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setResetTarget(null)} className="rounded-lg border border-[var(--color-border)] px-4 py-2">Cancel</button>
              <button onClick={resetPassword} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[var(--color-on-solid)]">Reset password</button>
            </div>
          </div>
        </div>
      )}

      {credentials && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-overlay)] p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-lg bg-[var(--color-surface)] p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Credentials — shown once</h2>
            <div className="rounded-lg bg-[var(--color-background)] p-4 space-y-2">
              <p className="text-sm text-[var(--color-textSecondary)]">Email</p>
              <p className="font-mono text-[var(--color-text)]">{credentials.email}</p>
              <p className="text-sm text-[var(--color-textSecondary)] pt-2">Temporary password</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-[var(--color-text)]">{credentials.temporaryPassword}</p>
                <CopyButton text={credentials.temporaryPassword} />
              </div>
            </div>
            <p className="text-xs text-[var(--color-textSecondary)]">This password will not be shown again. The admin should change it after first login.</p>
            <div className="flex justify-end">
              <button onClick={() => setCredentials(null)} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[var(--color-on-solid)]">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1.5 rounded hover:bg-[var(--color-surface)] text-[var(--color-textSecondary)]"
      title="Copy"
    >
      {copied ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

export default PlatformUsers
