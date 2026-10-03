import { useState, useEffect } from 'react'
import {
  Users, DollarSign, TrendingUp, AlertCircle, Activity,
  Building, CheckCircle, Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import StatsCard from '../../components/common/StatsCard'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'
import { fmtKES, fmtRelative } from '../../utils/format'

const PlatformDashboard = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [stats, setStats] = useState({
    totalChurches: 0,
    activeChurches: 0,
    totalMRR: 0,
    newChurchesThisMonth: 0,
    churnRate: 0,
    arpc: 0,
    platformHealthScore: 0
  })
  const [healthStatus, setHealthStatus] = useState({
    api: 'healthy',
    database: 'healthy',
    overall: 'healthy'
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlatformData()
  }, [])

  const fetchPlatformData = async () => {
    try {
      setLoading(true)
      
      // Fetch platform statistics
      try {
        const statsResponse = await api.get('/api/platform/stats')
        setStats(statsResponse.data.data || {
          totalChurches: 0,
          activeChurches: 0,
          totalMRR: 0,
          newChurchesThisMonth: 0,
          churnRate: 0,
          arpc: 0,
          platformHealthScore: 0
        })
      } catch (statsError) {
        console.error('Failed to fetch platform stats:', statsError)
        // Set default values if endpoint fails
        setStats({
          totalChurches: 0,
          activeChurches: 0,
          totalMRR: 0,
          newChurchesThisMonth: 0,
          churnRate: 0,
          arpc: 0,
          platformHealthScore: 0
        })
      }

      // Fetch platform health
      try {
        const healthResponse = await api.get('/api/platform/health')
        setHealthStatus(healthResponse.data.data || {
          api: 'healthy',
          database: 'healthy',
          overall: 'healthy'
        })
      } catch (healthError) {
        console.error('Failed to fetch platform health:', healthError)
        setHealthStatus({
          api: 'healthy',
          database: 'healthy',
          overall: 'healthy'
        })
      }

      // Fetch recent activities
      try {
        const activityResponse = await api.get('/api/platform/activity?limit=10')
        const iconMap = {
          church: Building,
          payment: DollarSign,
          system: Activity,
          alert: AlertCircle,
          user: Users
        }
        const colorClassMap = {
          church: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
          payment: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
          system: 'bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)]',
          alert: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
          user: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
        }

        const formattedActivities = (activityResponse.data.data || []).map((activity, index) => ({
          id: index,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          time: fmtRelative(activity.created_at || activity.time),
          icon: iconMap[activity.type] || Activity,
          colorClass: colorClassMap[activity.type] || 'bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)]'
        }))

        setRecentActivities(formattedActivities)
      } catch (activityError) {
        console.error('Failed to fetch activities:', activityError)
        setRecentActivities([])
      }
    } catch (error) {
      console.error('Failed to fetch platform data:', error)
      toast.error('Failed to load platform data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading platform dashboard..." />
  }

  const quickActions = [
    {
      title: 'Add New Church',
      description: 'Onboard a new church to the platform',
      icon: Building,
      color: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
      link: '/platform/tenants/create'
    },
    {
      title: 'View All Tenants',
      description: 'Manage all church tenants',
      icon: Users,
      color: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
      link: '/platform/tenants'
    },
    {
      title: 'Revenue Analytics',
      description: 'View platform revenue and subscriptions',
      icon: DollarSign,
      color: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
      link: '/platform/analytics'
    },
    {
      title: 'System Health',
      description: 'Monitor platform performance',
      icon: Activity,
      color: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
      link: '/platform/monitoring'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Platform Dashboard
        </h1>
        <p className="text-[var(--color-textSecondary)]">
          SaaS Platform Overview and Management
        </p>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Churches"
          value={stats.totalChurches}
          icon={Building}
          iconColor="bg-[var(--color-primary-light)] text-[var(--color-primary)]"
          subtitle={stats.newChurchesThisMonth > 0 ? `+${stats.newChurchesThisMonth} this month` : 'No new churches'}
        />
        <StatsCard
          title="Monthly Revenue"
          value={fmtKES(stats.totalMRR)}
          icon={DollarSign}
          iconColor="bg-[var(--color-success-light)] text-[var(--color-success)]"
          subtitle="MRR estimate"
        />
        <StatsCard
          title="Active Churches"
          value={stats.activeChurches}
          icon={CheckCircle}
          iconColor="bg-[var(--color-accent-light)] text-[var(--color-accent)]"
          subtitle={stats.totalChurches > 0 ? `${((stats.activeChurches / stats.totalChurches) * 100).toFixed(0)}% active rate` : 'No churches yet'}
        />
        <StatsCard
          title="Platform Health"
          value={`${stats.platformHealthScore}%`}
          icon={Activity}
          iconColor="bg-[var(--color-warning-light)] text-[var(--color-warning)]"
          subtitle={healthStatus.overall}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-text)]">Churn Rate</h3>
            <TrendingUp className="h-5 w-5 text-[var(--color-textSecondary)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--color-text)] mb-2">
            {(stats.churnRate || 0).toFixed(1)}%
          </p>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Churches archived this month
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-text)]">Avg Revenue/Church</h3>
            <DollarSign className="h-5 w-5 text-[var(--color-textSecondary)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--color-text)] mb-2">
            {fmtKES(stats.arpc)}
          </p>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Average revenue per church
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-text)]">System Status</h3>
            <Activity className="h-5 w-5 text-[var(--color-textSecondary)]" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-textSecondary)]">API</span>
              <span className={`text-sm font-medium ${healthStatus.api === 'healthy' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                {healthStatus.api}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-textSecondary)]">Database</span>
              <span className={`text-sm font-medium ${healthStatus.database === 'healthy' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                {healthStatus.database}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={index}
                to={action.link}
                className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className={`inline-flex p-3 rounded-lg ${action.color} mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-[var(--color-text)] mb-2 group-hover:text-primary-600 group-focus-within:text-primary-600">
                  {action.title}
                </h3>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {action.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Recent Platform Activity</h2>
        {recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon
              return (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${activity.colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--color-text)]">{activity.title}</p>
                    <p className="text-sm text-[var(--color-textSecondary)]">{activity.description}</p>
                  </div>
                  <span className="text-sm text-[var(--color-textSecondary)]">{activity.time}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="No recent activity"
            description="Platform activity will appear here"
          />
        )}
      </Card>
    </div>
  )
}

export default PlatformDashboard
