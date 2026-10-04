/**
 * WHAT THIS FILE DOES
 * -------------------
 * Home screen for the platform administrator. It answers: is the system
 * healthy, how many people and departments use it, what needs approval,
 * and what just happened.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /api/dashboard/stats          → platform totals
 * - backend /api/dashboard/system-health  → live server metrics (CPU, memory, uptime)
 * - backend /api/dashboard/activity       → recent system activity
 * - components/dashboard/SystemOrganismViz.jsx → health visualization
 * - components/dashboard/ChurchStatsCard.jsx
 * - components/dashboard/ChurchQuickActions.jsx
 */

import { useState, useEffect } from 'react'
import {
  Users, DollarSign, CheckCircle, Building, Shield, Server, ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import ChurchStatsCard from '../../components/dashboard/ChurchStatsCard'
import ChurchQuickActions from '../../components/dashboard/ChurchQuickActions'
import SystemOrganismViz from '../../components/dashboard/SystemOrganismViz'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'
import { fmtKES } from '../../utils/format'

const SuperAdminDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()

  const [stats, setStats] = useState({
    totalMembers: 0,
    activeDepartments: 0,
    pendingApprovals: 0,
    financialOverview: 0,
  })
  const [systemHealth, setSystemHealth] = useState({
    database: 'unknown',
    api: 'unknown',
    lastSync: null,
    activeUsers: 0,
    metrics: {},
  })
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    // Each section is independent — one failing endpoint shouldn't blank the page.
    const [statsRes, healthRes, activityRes] = await Promise.allSettled([
      api.get('/api/dashboard/stats'),
      api.get('/api/dashboard/system-health'),
      api.get('/api/dashboard/activity?limit=10'),
    ])

    if (statsRes.status === 'fulfilled') {
      const s = statsRes.value.data.data || {}
      setStats({
        totalMembers: s.totalMembers ?? 0,
        activeDepartments: s.activeDepartments ?? 0,
        pendingApprovals: s.pendingApprovals ?? 0,
        financialOverview: s.financialOverview ?? s.totalPayments ?? 0,
      })
    } else {
      console.error('Stats fetch failed:', statsRes.reason)
    }

    if (healthRes.status === 'fulfilled') {
      const h = healthRes.value.data.data || {}
      setSystemHealth({
        database: h.database || 'unknown',
        api: h.api || 'unknown',
        lastSync: h.lastSync || null,
        activeUsers: h.activeUsers || 0,
        metrics: h.metrics || {},
      })
    } else {
      console.error('System health fetch failed:', healthRes.reason)
    }

    if (activityRes.status === 'fulfilled') {
      setActivities(activityRes.value.data.data || [])
    } else {
      console.error('Activity fetch failed:', activityRes.reason)
    }

    setLoading(false)

    if (statsRes.status === 'rejected' && healthRes.status === 'rejected') {
      toast.error('Could not load system data. Please try again.')
    }
  }

  if (loading) return <FullPageLoading message="Loading system overview..." />

  const servicesHealthy = [systemHealth.database, systemHealth.api]
    .filter(s => s === 'healthy').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Overview</h1>
          <p className="page-subtitle">
            Welcome back, {user?.first_name}! Here is the platform health at a glance.
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          servicesHealthy === 2
            ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
            : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
        }`}>
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">
            {servicesHealthy === 2 ? 'All systems healthy' : 'Some systems degraded'}
          </span>
        </div>
      </div>

      {/* Live system metrics visualization */}
      <SystemOrganismViz
        systemData={{
          totalServices: 2,
          activeServices: servicesHealthy,
          degradedServices: 2 - servicesHealthy,
          uptimeHours: systemHealth.metrics?.uptimeHours ?? null,
        }}
        healthData={{
          databaseHealth: systemHealth.database,
          apiHealth: systemHealth.api,
          cacheHealth: 'unmonitored',
          storageHealth: 'unmonitored',
        }}
        performanceData={{
          cpuUsage: systemHealth.metrics?.cpuLoad ?? null,
          memoryUsage: systemHealth.metrics?.memoryUsage ?? null,
          diskUsage: null,
          dbLatencyMs: systemHealth.metrics?.dbLatencyMs ?? null,
        }}
      />

      {/* Platform totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChurchStatsCard
          title="Total Members"
          value={stats.totalMembers}
          change="Platform users"
          changeType="neutral"
          icon={Users}
          statType="members"
          linkTo="/dashboard/members"
        />
        <ChurchStatsCard
          title="Active Departments"
          value={stats.activeDepartments}
          change="Across all churches"
          changeType="neutral"
          icon={Building}
          statType="default"
          linkTo="/dashboard/departments"
        />
        <ChurchStatsCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          change="Need attention"
          changeType={stats.pendingApprovals > 0 ? 'negative' : 'positive'}
          icon={CheckCircle}
          statType="default"
          linkTo="/dashboard/approvals"
        />
        <ChurchStatsCard
          title="Financial Overview"
          value={fmtKES(stats.financialOverview)}
          change="Platform finances"
          changeType="neutral"
          icon={DollarSign}
          statType="financial"
          linkTo="/dashboard/treasury"
        />
      </div>

      <ChurchQuickActions />

      {/* Recent system activity */}
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
                <div className="p-2 rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]">
                  <Server className="h-4 w-4" aria-hidden="true" />
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
          <EmptyState icon={Server} title="No recent activity" description="System activity will appear here." />
        )}
      </Card>
    </div>
  )
}

export default SuperAdminDashboard
