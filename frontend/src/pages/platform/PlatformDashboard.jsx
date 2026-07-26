import { useState, useEffect } from 'react'
import {
  Users, DollarSign, TrendingUp, AlertCircle, Activity,
  Building, ArrowRight, CheckCircle, Clock, BarChart
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useColorPalette } from '../../contexts/ColorPaletteContext'
import Card from '../../components/common/Card'
import StatsCard from '../../components/common/StatsCard'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const PlatformDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const { colors } = useColorPalette()
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
  const [activeTab, setActiveTab] = useState('overview')

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
        const colorMap = {
          church: colors.primary,
          payment: colors.success,
          system: colors.textSecondary,
          alert: colors.error,
          user: colors.warning
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
      color: 'bg-blue-100 text-blue-600',
      link: '/platform/tenants/create'
    },
    {
      title: 'View All Tenants',
      description: 'Manage all church tenants',
      icon: Users,
      color: 'bg-green-100 text-green-600',
      link: '/platform/tenants'
    },
    {
      title: 'Revenue Analytics',
      description: 'View platform revenue and subscriptions',
      icon: DollarSign,
      color: 'bg-purple-100 text-purple-600',
      link: '/platform/analytics/revenue'
    },
    {
      title: 'System Health',
      description: 'Monitor platform performance',
      icon: Activity,
      color: 'bg-orange-100 text-orange-600',
      link: '/platform/monitoring/health'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">
          Platform Dashboard
        </h1>
        <p className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
          SaaS Platform Overview and Management
        </p>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Churches"
          value={stats.totalChurches}
          icon={Building}
          color="bg-blue-100 text-blue-600"
          trend={stats.newChurchesThisMonth > 0 ? `+${stats.newChurchesThisMonth} this month` : 'No new churches'}
        />
        <StatsCard
          title="Monthly Revenue"
          value={`$${(stats.totalMRR / 1000).toFixed(0)}K`}
          icon={DollarSign}
          color="bg-green-100 text-green-600"
          trend="MRR"
        />
        <StatsCard
          title="Active Churches"
          value={stats.activeChurches}
          icon={CheckCircle}
          color="bg-purple-100 text-purple-600"
          trend={`${((stats.activeChurches / stats.totalChurches) * 100).toFixed(0)}% active rate`}
        />
        <StatsCard
          title="Platform Health"
          value={`${stats.platformHealthScore}%`}
          icon={Activity}
          color="bg-orange-100 text-orange-600"
          trend={healthStatus.overall}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-text)] text-white">Churn Rate</h3>
            <TrendingUp className="h-5 w-5 text-[var(--color-textSecondary)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--color-text)] text-white mb-2">
            {stats.churnRate.toFixed(1)}%
          </p>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Monthly customer churn
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-text)] text-white">Avg Revenue/Church</h3>
            <DollarSign className="h-5 w-5 text-[var(--color-textSecondary)]" />
          </div>
          <p className="text-3xl font-bold text-[var(--color-text)] text-white mb-2">
            ${stats.arpc.toFixed(0)}
          </p>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Average revenue per customer
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-text)] text-white">System Status</h3>
            <Activity className="h-5 w-5 text-[var(--color-textSecondary)]" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-textSecondary)]">API</span>
              <span className={`text-sm font-medium ${healthStatus.api === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                {healthStatus.api}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-textSecondary)]">Database</span>
              <span className={`text-sm font-medium ${healthStatus.database === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                {healthStatus.database}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">Quick Actions</h2>
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
                <h3 className="font-semibold text-[var(--color-text)] text-white mb-2 group-hover:text-primary-600">
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
        <h2 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">Recent Platform Activity</h2>
        {recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon
              return (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${activity.color} bg-opacity-20`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--color-text)] text-white">{activity.title}</p>
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