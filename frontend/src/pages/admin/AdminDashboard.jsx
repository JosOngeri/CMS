/**
 * WHAT THIS FILE DOES
 * -------------------
 * The Super Admin operations console — the page an admin opens to find and
 * fix "issues that might arise" without hunting through separate screens.
 *
 * Sections:
 *   1. Health strip   — DB/API status, CPU, memory, uptime, active users
 *   2. Needs Attention — live issue cards with inline resolve controls:
 *        failed logins → block IP, locked accounts → unlock,
 *        stuck payments → mark failed, open alerts → resolve,
 *        pending approvals / failed payments → deep links
 *   3. Audit trail    — the church's most recent audit-log entries
 *   4. Quick links    — jump to the full management screens
 *
 * DATA SOURCES
 * ------------
 * - GET  /api/dashboard/ops                → health + issue counts + lists
 * - POST /api/dashboard/ops/alerts/:id/resolve → close a financial alert
 * - POST /api/dashboard/ops/users/:id/unlock   → clear a lockout
 * - POST /api/security/block-ip            → block an offender's IP
 * - PUT  /api/payments/status/:id          → mark a stuck payment failed
 * - GET  /api/audit-logs                   → audit trail
 *
 * Refreshes on mount, on demand, and every 60s while the page is open.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Cpu, Database,
  DollarSign, FileText, HardDrive, Lock, LockOpen, Megaphone,
  RefreshCw, Server, Shield, ShieldAlert, UserCheck, Users,
  XCircle, Ban, ClipboardCheck, Bell
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Link } from 'react-router-dom'
import { FullPageLoading } from '../../components/common/Loading'

const REFRESH_MS = 60_000

const fmtTime = (ts) => (ts ? new Date(ts).toLocaleString() : '—')
const fmtAgo = (ts) => {
  if (!ts) return '—'
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

const AdminDashboard = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [ops, setOps] = useState(null)
  const [audit, setAudit] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(null) // key of the in-flight action
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async (initial = false) => {
    if (!initial) setRefreshing(true)
    try {
      const [opsRes, auditRes, statsRes] = await Promise.all([
        api.get('/dashboard/ops').catch(() => null),
        api.get('/audit-logs', { params: { limit: 8 } }).catch(() => null),
        api.get('/dashboard/stats').catch(() => null),
      ])
      setOps(opsRes?.data?.data || null)
      const auditData = auditRes?.data?.data
      setAudit(Array.isArray(auditData) ? auditData : auditData?.logs || [])
      setStats(statsRes?.data?.data || null)
      setLastUpdated(new Date())
    } catch {
      toast.error('Failed to load operations data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [api, toast])

  useEffect(() => {
    load(true)
    const timer = setInterval(() => load(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  // ── Inline resolve controls ──────────────────────────────────────────
  const act = async (key, fn, okMsg) => {
    setBusy(key)
    try {
      await fn()
      toast.success(okMsg)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const blockIp = (ip) =>
    act(`ip-${ip}`, () => api.post('/security/block-ip', {
      ipAddress: ip, reason: 'Repeated failed login attempts'
    }), `Blocked ${ip}`)

  const unlockUser = (id, email) =>
    act(`unlock-${id}`, () => api.post(`/dashboard/ops/users/${id}/unlock`), `Unlocked ${email}`)

  const resolveAlert = (id) =>
    act(`alert-${id}`, () => api.post(`/dashboard/ops/alerts/${id}/resolve`), 'Alert resolved')

  const failPayment = (id) =>
    act(`pay-${id}`, () => api.put(`/payments/status/${id}`, { status: 'failed' }), 'Payment marked failed')

  if (loading) return <FullPageLoading message="Loading operations console..." />

  const health = ops?.health || {}
  const issues = ops?.issues || {}
  const lists = ops?.lists || {}
  const metrics = health.metrics || {}
  const totalIssues = Object.values(issues).reduce((a, b) => a + (b || 0), 0)
  const healthTile = (label, value, Icon, ok = true) => (
    <div key={label} className="bg-[var(--color-surface)] rounded-lg shadow-sm p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${ok ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-error-light)] text-[var(--color-error)]'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-textSecondary)]">{label}</p>
        <p className="text-sm font-bold text-[var(--color-text)] truncate">{value}</p>
      </div>
    </div>
  )

  const ActionBtn = ({ busyKey, onClick, icon: BtnIcon, children, danger }) => (
    <button
      onClick={onClick}
      disabled={busy === busyKey}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
        danger
          ? 'bg-[var(--color-error-light)] text-[var(--color-error)] hover:opacity-80'
          : 'bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:opacity-80'
      }`}
    >
      <BtnIcon className="h-3.5 w-3.5" />
      {busy === busyKey ? 'Working…' : children}
    </button>
  )

  const Row = ({ children }) => (
    <div className="flex items-center justify-between gap-3 py-2 px-3 bg-[var(--color-background)] rounded-md text-xs">
      {children}
    </div>
  )

  const IssueCard = ({ icon: Icon, title, count, tone, children, footerLink }) => (
    <div className="bg-[var(--color-surface)] rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)]">
        <div className={`p-2 rounded-lg ${
          count > 0
            ? tone === 'error'
              ? 'bg-[var(--color-error-light)] text-[var(--color-error)]'
              : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
            : 'bg-[var(--color-success-light)] text-[var(--color-success)]'
        }`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
        </div>
        <span className={`text-lg font-bold ${count > 0 ? (tone === 'error' ? 'text-[var(--color-error)]' : 'text-[var(--color-warning)]') : 'text-[var(--color-success)]'}`}>
          {count ?? 0}
        </span>
      </div>
      <div className="p-3 space-y-1.5">
        {count === 0 ? (
          <p className="text-xs text-[var(--color-success)] flex items-center gap-1.5 px-1 py-1">
            <CheckCircle2 className="h-4 w-4" /> All clear
          </p>
        ) : children}
        {footerLink}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Operations Console</h1>
          <p className="text-[var(--color-textSecondary)]">
            System health and issues needing attention
            {lastUpdated && <> — updated {lastUpdated.toLocaleTimeString()}</>}
          </p>
        </div>
        <button
          onClick={() => load()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall status banner */}
      {totalIssues > 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-warning-light)] text-[var(--color-warning)]">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            {totalIssues} issue{totalIssues === 1 ? '' : 's'} need{totalIssues === 1 ? 's' : ''} attention — see the cards below.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-success-light)] text-[var(--color-success)]">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">No open issues — everything looks healthy.</p>
        </div>
      )}

      {/* Health strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {healthTile('Database', health.database === 'healthy' ? 'Healthy' : 'Down', Database, health.database === 'healthy')}
        {healthTile('CPU Load', `${metrics.cpuLoad ?? '—'}%`, Cpu, (metrics.cpuLoad ?? 0) < 85)}
        {healthTile('Memory', `${metrics.memoryUsage ?? '—'}%`, HardDrive, (metrics.memoryUsage ?? 0) < 90)}
        {healthTile('Uptime', `${metrics.uptimeHours ?? '—'}h`, Clock)}
        {healthTile('Active Users', health.activeUsers ?? 0, UserCheck)}
        {healthTile('Last Activity', fmtAgo(health.lastSync), Activity)}
      </div>

      {/* Needs attention */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Needs Attention</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <IssueCard icon={ShieldAlert} title="Failed Logins (24h)" count={issues.failedLogins24h} tone="error">
            {lists.failedLogins?.map((l, i) => (
              <Row key={i}>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-text)] truncate">{l.email || 'unknown'}</p>
                  <p className="text-[var(--color-textSecondary)]">{l.ip_address} · {fmtAgo(l.attempted_at)}</p>
                </div>
                {l.ip_address && (
                  <ActionBtn busyKey={`ip-${l.ip_address}`} onClick={() => blockIp(l.ip_address)} icon={Ban} danger>
                    Block IP
                  </ActionBtn>
                )}
              </Row>
            ))}
            <Link to="/dashboard/security" className="block text-xs text-[var(--color-primary)] hover:underline px-1 pt-1">
              Open Security Center →
            </Link>
          </IssueCard>

          <IssueCard icon={Lock} title="Locked Accounts" count={issues.lockedAccounts} tone="error">
            {lists.lockedUsers?.map((u) => (
              <Row key={u.id}>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-text)] truncate">
                    {u.first_name} {u.last_name} <span className="text-[var(--color-textSecondary)]">({u.email})</span>
                  </p>
                  <p className="text-[var(--color-textSecondary)]">
                    {u.failed_login_attempts} failed tries · until {fmtTime(u.locked_until)}
                  </p>
                </div>
                <ActionBtn busyKey={`unlock-${u.id}`} onClick={() => unlockUser(u.id, u.email)} icon={LockOpen}>
                  Unlock
                </ActionBtn>
              </Row>
            ))}
            <Link to="/dashboard/users" className="block text-xs text-[var(--color-primary)] hover:underline px-1 pt-1">
              Manage users →
            </Link>
          </IssueCard>

          <IssueCard icon={DollarSign} title="Stuck Payments (>24h pending)" count={issues.stuckPayments} tone="warn">
            {lists.stuckPayments?.map((p) => (
              <Row key={p.id}>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-text)]">
                    KES {Number(p.amount || 0).toLocaleString()} · {p.category || 'payment'}
                  </p>
                  <p className="text-[var(--color-textSecondary)]">
                    {p.phone_number || '—'} · {p.payment_method || ''} · {fmtAgo(p.created_at)}
                  </p>
                </div>
                <ActionBtn busyKey={`pay-${p.id}`} onClick={() => failPayment(p.id)} icon={XCircle} danger>
                  Mark Failed
                </ActionBtn>
              </Row>
            ))}
            <Link to="/dashboard/payments/management" className="block text-xs text-[var(--color-primary)] hover:underline px-1 pt-1">
              Open Payment Management →
            </Link>
          </IssueCard>

          <IssueCard icon={XCircle} title="Failed Payments (24h)" count={issues.failedPayments24h} tone="error">
            <Link to="/dashboard/payments/management" className="block text-xs text-[var(--color-primary)] hover:underline px-1 pt-1">
              Review in Payment Management →
            </Link>
          </IssueCard>

          <IssueCard icon={ClipboardCheck} title="Pending Approvals" count={issues.pendingApprovals} tone="warn">
            {lists.pendingApprovals?.map((a) => (
              <Row key={a.id}>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-text)] truncate">{a.title || a.request_type || 'Request'}</p>
                  <p className="text-[var(--color-textSecondary)]">{a.request_type || ''} · {fmtAgo(a.created_at)}</p>
                </div>
              </Row>
            ))}
            <Link to="/dashboard/approvals" className="block text-xs text-[var(--color-primary)] hover:underline px-1 pt-1">
              Open Approval Inbox →
            </Link>
          </IssueCard>

          <IssueCard icon={Bell} title="Open Financial Alerts" count={issues.openAlerts} tone="warn">
            {lists.openAlerts?.map((a) => (
              <Row key={a.id}>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-text)] truncate">{a.title || a.alert_type}</p>
                  <p className="text-[var(--color-textSecondary)] truncate">{a.message} · {a.priority} · {fmtAgo(a.created_at)}</p>
                </div>
                <ActionBtn busyKey={`alert-${a.id}`} onClick={() => resolveAlert(a.id)} icon={CheckCircle2}>
                  Resolve
                </ActionBtn>
              </Row>
            ))}
            <Link to="/dashboard/treasury" className="block text-xs text-[var(--color-primary)] hover:underline px-1 pt-1">
              Open Treasury →
            </Link>
          </IssueCard>
        </div>
      </div>

      {/* Church totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Members', value: stats?.totalMembers ?? 0, icon: Users },
          { label: 'Departments', value: stats?.totalDepartments ?? 0, icon: Server },
          { label: 'Revenue', value: `KES ${(Number(stats?.totalPayments || 0) / 1000).toFixed(0)}K`, icon: DollarSign },
          { label: 'Announcements', value: stats?.totalAnnouncements ?? 0, icon: Megaphone },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[var(--color-surface)] p-5 rounded-lg shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-textSecondary)]">{label}</p>
              <p className="text-xl font-bold text-[var(--color-text)]">{value}</p>
            </div>
            <div className="p-2.5 bg-[var(--color-primary-light)] rounded-lg">
              <Icon className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Audit trail + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--color-surface)] rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--color-primary)]" /> Recent Audit Log
          </h2>
          {audit.length === 0 ? (
            <p className="text-xs text-[var(--color-textSecondary)]">No audit entries yet.</p>
          ) : (
            <div className="space-y-1.5">
              {audit.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-1.5 px-2 bg-[var(--color-background)] rounded-md text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-text)] truncate">
                      {e.action} <span className="text-[var(--color-textSecondary)]">on {e.table_name}</span>
                    </p>
                    <p className="text-[var(--color-textSecondary)] truncate">
                      {[e.first_name, e.last_name].filter(Boolean).join(' ') || e.email || 'system'}
                    </p>
                  </div>
                  <span className="text-[var(--color-textSecondary)] whitespace-nowrap">{fmtAgo(e.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">Management</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/dashboard/security', label: 'Security Center', icon: Shield },
              { to: '/dashboard/users', label: 'User Management', icon: Users },
              { to: '/dashboard/admin/database', label: 'Database', icon: Database },
              { to: '/dashboard/monitoring', label: 'Monitoring', icon: Activity },
              { to: '/dashboard/payments/management', label: 'Payments', icon: DollarSign },
              { to: '/dashboard/admin/settings', label: 'Settings', icon: FileText },
            ].map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-background)] text-sm text-[var(--color-text)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] transition-colors"
              >
                <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
