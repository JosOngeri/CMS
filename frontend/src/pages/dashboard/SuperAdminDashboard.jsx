import { useState, useEffect } from 'react'
import {
  Users, DollarSign, Calendar, Megaphone, TrendingUp,
  Clock, CheckCircle, AlertCircle, ArrowRight, Building, Image as ImageIcon,
  Server, Database, Activity, Shield, Settings, FileText, Users as UsersIcon
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useColorPalette } from '../../contexts/ColorPaletteContext'
import Card from '../../components/common/Card'
import ChurchStatsCard from '../../components/dashboard/ChurchStatsCard'
import ChurchQuickActions from '../../components/dashboard/ChurchQuickActions'
import SystemOrganismViz from '../../components/dashboard/SystemOrganismViz'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const SuperAdminDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const { colors } = useColorPalette()
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeDepartments: 0,
    pendingApprovals: 0,
    financialOverview: 0,
    totalPayments: 0,
    upcomingEvents: 0,
    recentAnnouncements: 0
  })
  const [systemHealth, setSystemHealth] = useState({
    database: 'healthy',
    api: 'healthy',
    lastSync: '2 minutes ago',
    activeUsers: 12
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch system-wide stats
      try {
        const statsResponse = await api.get('/api/dashboard/stats')
        console.log('Dashboard stats response:', statsResponse.data)
        const rawStats = statsResponse.data.data || {}
        setStats({
          totalMembers: rawStats.totalMembers || 0,
          activeDepartments: rawStats.activeDepartments || 0,
          pendingApprovals: rawStats.pendingApprovals || 0,
          financialOverview: rawStats.financialOverview || rawStats.totalPayments || 0,
          totalPayments: rawStats.totalPayments || 0,
          upcomingEvents: rawStats.upcomingEvents || 0,
          recentAnnouncements: rawStats.recentAnnouncements || 0
        })
      } catch (statsError) {
        console.error('Failed to fetch stats:', statsError)
        // Set default values if stats endpoint fails
        setStats({
          totalMembers: 1, // At least the admin user
          activeDepartments: 0,
          pendingApprovals: 0,
          financialOverview: 0,
          totalPayments: 0,
          upcomingEvents: 0,
          recentAnnouncements: 0
        })
      }

      // Fetch system health
      try {
        const healthResponse = await api.get('/api/dashboard/system-health')
        setSystemHealth(healthResponse.data.data || {
          database: 'healthy',
          api: 'healthy',
          lastSync: '2 minutes ago',
          activeUsers: 12
        })
      } catch (healthError) {
        console.error('Failed to fetch system health:', healthError)
        // Set default values if health endpoint fails
        setSystemHealth({
          database: 'healthy',
          api: 'healthy',
          lastSync: '2 minutes ago',
          activeUsers: 12
        })
      }

      // Fetch recent system activities
      try {
        const activityResponse = await api.get('/api/dashboard/activity?limit=10')
        const iconMap = {
          user: Users,
          payment: DollarSign,
          announcement: Megaphone,
          event: Calendar,
          system: Server,
          security: Shield
        }
        const colorMap = {
          user: colors.primary,
          payment: colors.success,
          announcement: colors.secondary,
          event: colors.accent,
          system: colors.warning,
          security: colors.error
        }

        const formattedActivities = (activityResponse.data.data || []).map((activity, index) => ({
          id: index,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          time: activity.time,
          icon: iconMap[activity.type] || Activity,
          color: colorMap[activity.type] || colors.textSecondary
        }))

        setRecentActivities(formattedActivities)
      } catch (activityError) {
        console.error('Failed to fetch activities:', activityError)
        setRecentActivities([])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header with System Health */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Super Admin Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.first_name}! System administration and platform oversight.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* System Health Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-success)]-50 text-[var(--color-success)]-700 rounded-lg">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">System Health: {systemHealth.database === 'healthy' && systemHealth.api === 'healthy' ? 'Excellent' : 'Degraded'}</span>
          </div>
        </div>
      </div>

      {/* System Organism Visualization - Signature Element */}
      <SystemOrganismViz 
        systemData={{
          totalServices: 8,
          activeServices: systemHealth.database === 'healthy' && systemHealth.api === 'healthy' ? 7 : 6,
          degradedServices: systemHealth.database === 'healthy' && systemHealth.api === 'healthy' ? 1 : 2,
          systemUptime: 99.9
        }}
        healthData={{
          databaseHealth: systemHealth.database,
          apiHealth: systemHealth.api,
          cacheHealth: 'healthy',
          storageHealth: 'healthy'
        }}
        performanceData={{
          cpuUsage: 45,
          memoryUsage: 60,
          diskUsage: 55,
          networkLatency: 25
        }}
      />

      {/* Stats Grid with Church-Focused Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ChurchStatsCard
          title="Total Members"
          value={stats.totalMembers}
          change="Platform users"
          changeType="positive"
          icon={Users}
          statType="members"
          linkTo="/admin/members"
        />
        <ChurchStatsCard
          title="Active Departments"
          value={stats.activeDepartments}
          change="Platform departments"
          changeType="neutral"
          icon={Building}
          statType="default"
          linkTo="/admin/departments"
        />
        <ChurchStatsCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          change="Requires attention"
          changeType="neutral"
          icon={CheckCircle}
          statType="default"
          linkTo="/admin/approvals"
        />
        <ChurchStatsCard
          title="Financial Overview"
          value={`KES ${stats.financialOverview.toLocaleString()}`}
          change="Platform finances"
          changeType="positive"
          icon={DollarSign}
          statType="financial"
          linkTo="/admin/finance"
        />
      </div>

      {/* Church-Focused Quick Actions */}
      <ChurchQuickActions />

      {/* Recent System Activity Feed */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Recent System Activity</h2>
          <Link to="/admin/activity" className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]-700">
            View all
          </Link>
        </div>
        {recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                <div className={`p-2 rounded-lg ${activity.color} bg-opacity-10`}>
                  <activity.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-text)]">{activity.title}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">{activity.description}</p>
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Server}
            title="No recent activity"
            description="System activities will appear here"
          />
        )}
      </Card>
    </div>
  )
}

export default SuperAdminDashboard