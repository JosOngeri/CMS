import { useState, useEffect } from 'react'
import {
  DollarSign, Calendar, Megaphone, Building, ArrowRight,
  HandCoins, Bell, CheckCircle, AlertCircle, Wallet
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { useChurchBranding } from '../../hooks/useChurchBranding'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const fmtKES = (n) => `KES ${(Number(n) || 0).toLocaleString()}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }) : null

const MemberDashboard = () => {
  const { user, api } = useAuth()
  const { can } = usePermission()
  const { churchName } = useChurchBranding()

  const canSeeGiving = can('obligations.view') || can('payments.view_own')

  const [stats, setStats] = useState(null)
  const [obligations, setObligations] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [events, setEvents] = useState([])
  const [departments, setDepartments] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const safeGet = async (url, fallback) => {
    try {
      const r = await api.get(url)
      return r.data?.data ?? fallback
    } catch {
      return fallback
    }
  }

  const load = async () => {
    setLoading(true)
    const [st, obs, anns, evs, depts, act] = await Promise.all([
      safeGet('/api/dashboard/personal-stats', null),
      canSeeGiving
        ? safeGet('/api/departments/me/obligations', { obligations: [] })
        : Promise.resolve({ obligations: [] }),
      safeGet('/api/announcements?limit=3', { announcements: [] }),
      safeGet('/api/events?limit=20', { events: [] }),
      safeGet('/api/department/my-departments', { departments: [] }),
      safeGet('/api/dashboard/personal-activity?limit=8', []),
    ])
    setStats(st)
    setObligations(Array.isArray(obs?.obligations) ? obs.obligations : [])
    setAnnouncements(Array.isArray(anns?.announcements) ? anns.announcements.slice(0, 3) : [])
    const evList = Array.isArray(evs?.events) ? evs.events : Array.isArray(evs) ? evs : []
    const upcoming = evList
      .filter(e => !e.event_date || new Date(e.event_date) >= new Date())
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
      .slice(0, 3)
    setEvents(upcoming.length ? upcoming : evList.slice(0, 3))
    setDepartments(Array.isArray(depts) ? depts : depts?.departments || [])
    setActivity(Array.isArray(act) ? act : [])
    setLoading(false)
  }

  if (loading) return <FullPageLoading message="Loading your dashboard..." />

  const outstanding = obligations
    .filter(o => ['pending', 'partial'].includes(o.status))
    .reduce((s, o) => s + (Number(o.amount) - Number(o.paid_amount || 0)), 0)

  const paidThisYear = obligations.reduce((s, o) => s + Number(o.paid_amount || 0), 0)
  const firstName = user?.first_name || 'Member'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {firstName}</h1>
          <p className="page-subtitle">{churchName}</p>
        </div>
      </div>

      {/* Giving hero — the main reason a member is here */}
      {canSeeGiving && (
        <div className="church-gradient rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-white/80 text-sm font-medium">Outstanding obligations</p>
              <p className="text-3xl font-bold mt-1">{fmtKES(outstanding)}</p>
              <p className="text-white/70 text-sm mt-1">
                {outstanding > 0
                  ? `${obligations.filter(o => ['pending','partial'].includes(o.status)).length} pending across your departments`
                  : 'You are all settled — thank you for your faithfulness'}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/dashboard/obligations"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white text-[var(--color-primary)] font-semibold rounded-xl hover:bg-white/90 transition-colors"
              >
                <HandCoins className="h-5 w-5" />
                Give Now
              </Link>
              <Link
                to="/dashboard/payments/my"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/15 text-white font-medium rounded-xl hover:bg-white/25 transition-colors"
              >
                <Wallet className="h-5 w-5" />
                History
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canSeeGiving && (
          <Link to="/dashboard/payments/my" className="bg-[var(--color-surface)] p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-100 text-green-600"><DollarSign className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-textSecondary)]">My giving</p>
                <p className="font-bold text-[var(--color-text)] truncate">{fmtKES(paidThisYear)}</p>
              </div>
            </div>
          </Link>
        )}
        <Link to="/dashboard/events" className="bg-[var(--color-surface)] p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-600"><Calendar className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--color-textSecondary)]">Upcoming events</p>
              <p className="font-bold text-[var(--color-text)]">{stats?.upcomingEvents ?? events.length}</p>
            </div>
          </div>
        </Link>
        <Link to="/dashboard/my-departments" className="bg-[var(--color-surface)] p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-100 text-purple-600"><Building className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--color-textSecondary)]">My departments</p>
              <p className="font-bold text-[var(--color-text)]">{stats?.departmentAssignments ?? departments.length}</p>
            </div>
          </div>
        </Link>
        <Link to="/dashboard/announcements" className="bg-[var(--color-surface)] p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600"><Megaphone className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--color-textSecondary)]">Announcements</p>
              <p className="font-bold text-[var(--color-text)]">{announcements.length}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Obligations list (top 3) */}
      {canSeeGiving && outstanding > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">What I owe</h2>
            <Link to="/dashboard/obligations" className="text-sm text-[var(--color-primary)] flex items-center gap-1">
              All obligations <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {obligations.filter(o => ['pending', 'partial'].includes(o.status)).slice(0, 3).map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{o.purpose || o.department_name}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    {o.department_name}{o.due_date ? ` · due ${fmtDate(o.due_date)}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-bold text-[var(--color-text)]">{fmtKES(Number(o.amount) - Number(o.paid_amount || 0))}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">of {fmtKES(o.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Announcements + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Latest announcements</h2>
            <Link to="/dashboard/announcements" className="text-sm text-[var(--color-primary)] flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {announcements.length ? (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                  <p className="text-sm font-medium text-[var(--color-text)]">{a.title}</p>
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1 line-clamp-2">{a.content || a.body}</p>
                  {a.created_at && <p className="text-xs text-[var(--color-textSecondary)] mt-1">{fmtDate(a.created_at)}</p>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Megaphone} title="No announcements" description="Church news will appear here." />
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Upcoming events</h2>
            <Link to="/dashboard/events" className="text-sm text-[var(--color-primary)] flex items-center gap-1">
              Calendar <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {events.length ? (
            <div className="space-y-3">
              {events.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                  <div className="w-12 h-12 rounded-lg church-gradient text-white flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">{e.event_date ? new Date(e.event_date).toLocaleDateString('en-KE', { month: 'short' }) : '—'}</span>
                    <span className="text-lg font-bold leading-none">{e.event_date ? new Date(e.event_date).getDate() : ''}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{e.title}</p>
                    <p className="text-xs text-[var(--color-textSecondary)] truncate">{[e.location, e.event_time].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Calendar} title="No upcoming events" description="Events will appear here." />
          )}
        </Card>
      </div>

      {/* My departments */}
      {departments.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">My departments</h2>
            <Link to="/dashboard/my-departments" className="text-sm text-[var(--color-primary)] flex items-center gap-1">
              Manage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {departments.map(d => (
              <span key={d.id || d.department_id} className="px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm font-medium">
                {d.name || d.department_name}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Recent activity */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">My recent activity</h2>
        {activity.length ? (
          <div className="space-y-3">
            {activity.map((a, i) => (
              <div key={a.id || i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {a.type === 'payment' ? <CheckCircle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">{a.title}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">{a.description}</p>
                  <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">{a.time || fmtDate(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Bell} title="No recent activity" description="Your payments and updates will appear here." />
        )}
      </Card>
    </div>
  )
}

export default MemberDashboard
