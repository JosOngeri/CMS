/**
 * WHAT THIS FILE DOES
 * -------------------
 * Home screen for department leaders (department heads, assistants,
 * subcommittee leaders, deacons and deaconesses). It gives a quick view of
 * their department members, budget, upcoming events, and tasks.
 *
 * Complexity is kept low — this is a daily check-in view, not a full
 * management page.
 *
 * FILES IT TALKS TO
 * -----------------
 * - AuthContext.jsx → current user
 * - backend /api/dashboard/department-stats      → member/budget/event counts
 * - backend /api/dashboard/department-health   → participation metrics
 * - backend /api/dashboard/department-activity → recent activity feed
 * - components/common/Card.jsx
 * - components/dashboard/ChurchStatsCard.jsx
 * - components/dashboard/ChurchQuickActions.jsx
 */

import { useState, useEffect } from 'react'
import {
  Users, DollarSign, Calendar, CheckCircle, ArrowRight, Building
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import ChurchStatsCard from '../../components/dashboard/ChurchStatsCard'
import ChurchQuickActions from '../../components/dashboard/ChurchQuickActions'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'
import { fmtKES } from '../../utils/format'

const DepartmentHeadDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()

  const [stats, setStats] = useState({
    departmentMembers: 0,
    pendingTasks: 0,
    departmentEvents: 0,
    departmentBudget: 0,
  })
  const [health, setHealth] = useState({
    memberParticipation: 0,
    taskCompletion: 0,
    budgetUtilization: 0,
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
        api.get('/api/dashboard/department-stats'),
        api.get('/api/dashboard/department-health'),
        api.get('/api/dashboard/department-activity?limit=10'),
      ])

      setStats({
        departmentMembers: statsRes.data.data?.departmentMembers ?? 0,
        pendingTasks: statsRes.data.data?.pendingTasks ?? 0,
        departmentEvents: statsRes.data.data?.departmentEvents ?? 0,
        departmentBudget: statsRes.data.data?.departmentBudget ?? 0,
      })

      const h = healthRes.data.data || {}
      setHealth({
        memberParticipation: parseFloat(h.memberParticipationCount) || 0,
        taskCompletion: parseFloat(h.taskCompletionRate) || 0,
        budgetUtilization: parseFloat(h.budgetUtilization) || 0,
      })

      setActivities(activityRes.data.data || [])
    } catch (error) {
      console.error('Failed to load department dashboard:', error)
      toast.error('Could not load department dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <FullPageLoading message="Loading your department..." />

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Department</h1>
          <p className="page-subtitle">
            Welcome back, {user?.first_name}! Here is how your department is doing today.
          </p>
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChurchStatsCard
          title="Department Members"
          value={stats.departmentMembers}
          change="Team members"
          changeType="neutral"
          icon={Users}
          statType="members"
          linkTo="/dashboard/my-departments"
        />
        <ChurchStatsCard
          title="Pending Tasks"
          value={stats.pendingTasks}
          change="Need attention"
          changeType={stats.pendingTasks > 0 ? 'negative' : 'positive'}
          icon={CheckCircle}
          statType="default"
          linkTo="/dashboard/my-departments"
        />
        <ChurchStatsCard
          title="Upcoming Events"
          value={stats.departmentEvents}
          change="Department events"
          changeType="neutral"
          icon={Calendar}
          statType="events"
          linkTo="/dashboard/events"
        />
        <ChurchStatsCard
          title="Department Budget"
          value={fmtKES(stats.departmentBudget)}
          change="Budget allocated"
          changeType="neutral"
          icon={DollarSign}
          statType="financial"
          linkTo="/dashboard/treasury/budgets"
        />
      </div>

      {/* Participation summary */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Participation</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-textSecondary)]">Member participation</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{Math.round(health.memberParticipation)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-textSecondary)]">Tasks completed</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{Math.round(health.taskCompletion)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-textSecondary)]">Budget used</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{Math.round(health.budgetUtilization)}%</p>
          </div>
        </div>
      </Card>

      <ChurchQuickActions />

      {/* Recent activity */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Recent Activity</h2>
          <Link to="/dashboard/my-departments" className="text-sm text-[var(--color-primary)] flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {activities.length ? (
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div key={activity.id || index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                <div className="p-2 rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]">
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
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
          <EmptyState icon={Building} title="No recent activity" description="Department activity will appear here." />
        )}
      </Card>
    </div>
  )
}

export default DepartmentHeadDashboard
