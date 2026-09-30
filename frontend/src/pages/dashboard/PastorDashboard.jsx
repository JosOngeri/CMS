/**
 * WHAT THIS FILE DOES
 * -------------------
 * Home screen for church leadership — Pastor, First Elder, Elders, and
 * Church Board members. It shows the health of the whole congregation:
 * how many members, what was given, upcoming events, announcements, and
 * recent ministry activity.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /api/dashboard/stats           → congregation totals
 * - backend /api/dashboard/ministry-health → engagement percentages
 * - backend /api/dashboard/activity        → recent church activity
 * - components/common/Card.jsx
 * - components/dashboard/ChurchStatsCard.jsx
 * - components/dashboard/ChurchQuickActions.jsx
 */

import { useState, useEffect } from 'react'
import {
  Users, DollarSign, Calendar, Megaphone, CheckCircle, ArrowRight, Heart
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import ChurchStatsCard from '../../components/dashboard/ChurchStatsCard'
import ChurchQuickActions from '../../components/dashboard/ChurchQuickActions'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const fmtKES = (n) => `KES ${(Number(n) || 0).toLocaleString()}`

const PastorDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()

  const [stats, setStats] = useState({
    totalMembers: 0,
    totalPayments: 0,
    upcomingEvents: 0,
    recentAnnouncements: 0,
    pendingApprovals: 0,
  })
  const [health, setHealth] = useState({
    memberEngagement: 0,
    departmentActivity: 0,
    spiritualGrowth: 0,
  })
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const [statsRes, healthRes, activityRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/ministry-health'),
        api.get('/api/dashboard/activity?limit=10'),
      ])

      const s = statsRes.data.data || {}
      setStats({
        totalMembers: s.totalMembers ?? 0,
        totalPayments: s.totalPayments ?? 0,
        upcomingEvents: s.upcomingEvents ?? 0,
        recentAnnouncements: s.recentAnnouncements ?? 0,
        pendingApprovals: s.pendingApprovals ?? 0,
      })

      const h = healthRes.data.data || {}
      setHealth({
        memberEngagement: parseFloat(h.memberEngagement) || 0,
        departmentActivity: parseFloat(h.departmentActivity) || 0,
        spiritualGrowth: parseFloat(h.spiritualGrowth) || 0,
      })

      setActivities(activityRes.data.data || [])
    } catch (error) {
      console.error('Failed to load ministry dashboard:', error)
      toast.error('Could not load ministry data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <FullPageLoading message="Loading ministry overview..." />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ministry Overview</h1>
          <p className="page-subtitle">
            Welcome back, {user?.first_name}! Here is how the congregation is doing.
          </p>
        </div>
      </div>

      {/* Congregation totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChurchStatsCard
          title="Total Members"
          value={stats.totalMembers}
          change="Registered members"
          changeType="neutral"
          icon={Users}
          statType="members"
          linkTo="/dashboard/members"
        />
        <ChurchStatsCard
          title="Payments Recorded"
          value={stats.totalPayments}
          change="Giving transactions"
          changeType="neutral"
          icon={DollarSign}
          statType="financial"
          linkTo="/dashboard/payments/management"
        />
        <ChurchStatsCard
          title="Upcoming Events"
          value={stats.upcomingEvents}
          change="On the calendar"
          changeType="neutral"
          icon={Calendar}
          statType="events"
          linkTo="/dashboard/events"
        />
        <ChurchStatsCard
          title="Approvals Pending"
          value={stats.pendingApprovals}
          change="Need your attention"
          changeType={stats.pendingApprovals > 0 ? 'negative' : 'positive'}
          icon={CheckCircle}
          statType="default"
          linkTo="/dashboard/approvals"
        />
      </div>

      {/* Ministry health */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Congregation Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-textSecondary)]">Member engagement</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{Math.round(health.memberEngagement)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-textSecondary)]">Department activity</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{Math.round(health.departmentActivity)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-textSecondary)]">Growth trend</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{Math.round(health.spiritualGrowth)}%</p>
          </div>
        </div>
      </Card>

      <ChurchQuickActions />

      {/* Recent ministry activity */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Recent Activity</h2>
          <Link to="/dashboard/notifications" className="text-sm text-[var(--color-primary)] flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {activities.length ? (
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div key={activity.id || index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Heart className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">{activity.title}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">{activity.description}</p>
                  <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Heart} title="No recent activity" description="Church activity will appear here." />
        )}
      </Card>
    </div>
  )
}

export default PastorDashboard
