import { useState, useEffect } from 'react'
import {
  Users, DollarSign, Calendar, Megaphone, TrendingUp,
  Clock, CheckCircle, AlertCircle, ArrowRight, Building, Heart,
  FileText, Users as UsersIcon, Church
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useColorPalette } from '../../contexts/ColorPaletteContext'
import Card from '../../components/common/Card'
import StatsCard from '../../components/common/StatsCard'
import QuickActionsPanel from '../../components/common/QuickActionsPanel'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const PastorDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const { colors } = useColorPalette()
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeDepartments: 0,
    pendingApprovals: 0,
    upcomingEvents: 0
  })
  const [ministryHealth, setMinistryHealth] = useState({
    memberEngagement: 85,
    departmentActivity: 92,
    spiritualGrowth: 78
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch ministry-focused stats
      const statsResponse = await api.get('/api/dashboard/stats')
      setStats(statsResponse.data.data || {
        totalMembers: 0,
        activeDepartments: 0,
        pendingApprovals: 0,
        upcomingEvents: 0
      })

      // Fetch ministry health metrics
      const healthResponse = await api.get('/api/dashboard/ministry-health')
      setMinistryHealth(healthResponse.data.data || {
        memberEngagement: 85,
        departmentActivity: 92,
        spiritualGrowth: 78
      })

      // Fetch recent ministry activities
      const activityResponse = await api.get('/api/dashboard/activity?limit=10')
      const iconMap = {
        payment: DollarSign,
        announcement: Megaphone,
        event: Calendar,
        member: Users,
        ministry: Heart,
        approval: CheckCircle
      }
      const colorMap = {
        payment: colors.success,
        announcement: colors.primary,
        event: colors.secondary,
        member: colors.warning,
        ministry: colors.accent,
        approval: colors.success
      }

      const formattedActivities = (activityResponse.data.data || []).map((activity, index) => ({
        id: index,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        time: activity.time,
        icon: iconMap[activity.type] || Megaphone,
        color: colorMap[activity.type] || colors.textSecondary
      }))

      setRecentActivities(formattedActivities)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'Create Announcement',
      description: 'Send church announcement',
      icon: Megaphone,
      color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600',
      link: '/announcements/create',
      permission: 'announcement.create'
    },
    {
      title: 'Review Approvals',
      description: 'Pending requests',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
      link: '/approvals',
      permission: 'approval.review',
      badge: stats.pendingApprovals > 0 ? stats.pendingApprovals : null
    },
    {
      title: 'View Department Reports',
      description: 'Ministry analytics',
      icon: Building,
      color: 'bg-purple-100 text-purple-600',
      link: '/departments/reports',
      permission: 'report.view'
    },
    {
      title: 'Manage Events',
      description: 'Church calendar',
      icon: Calendar,
      color: 'bg-orange-100 text-orange-600',
      link: '/events',
      permission: 'event.manage'
    },
    {
      title: 'Member Directory',
      description: 'View members',
      icon: Users,
      color: 'bg-pink-100 text-pink-600',
      link: '/members',
      permission: 'member.view'
    },
    {
      title: 'Ministry Reports',
      description: 'Spiritual growth',
      icon: Heart,
      color: 'bg-red-100 text-red-600',
      link: '/reports/ministry',
      permission: 'report.view'
    }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'departments', label: 'Departments' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'events', label: 'Events' },
    { id: 'members', label: 'Members' }
  ]

  // Add recent ministry activity feed (Task 1.2.4)
  // Already implemented in the activity feed section above

  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Ministry Health */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pastor Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.first_name}! Ministry overview and pastoral tools.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Ministry Health Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-50 text-[var(--color-primary)]-700 rounded-lg">
            <Heart className="h-4 w-4" />
            <span className="text-sm font-medium">Ministry Health: 85%</span>
          </div>
        </div>
      </div>

      {/* Ministry Health Status */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <UsersIcon className="h-5 w-5 text-[var(--color-primary)]-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Member Engagement</span>
              <span className="block text-sm font-medium text-[var(--color-primary)]-600">{ministryHealth.memberEngagement}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-green-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Department Activity</span>
              <span className="block text-sm font-medium text-green-600">{ministryHealth.departmentActivity}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Church className="h-5 w-5 text-purple-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Spiritual Growth</span>
              <span className="block text-sm font-medium text-purple-600">{ministryHealth.spiritualGrowth}%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Members"
              value={stats.totalMembers.toLocaleString()}
              change="↑ 12% from last month"
              changeType="positive"
              icon={Users}
              iconColor="bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600"
              linkTo="/members"
            />
            <StatsCard
              title="Active Departments"
              value={stats.activeDepartments}
              change="All departments active"
              changeType="neutral"
              icon={Building}
              iconColor="bg-green-100 text-green-600"
              linkTo="/departments"
            />
            <StatsCard
              title="Pending Approvals"
              value={stats.pendingApprovals}
              change="Requires attention"
              changeType="neutral"
              icon={CheckCircle}
              iconColor="bg-yellow-100 text-yellow-600"
              linkTo="/approvals"
            />
            <StatsCard
              title="Upcoming Events"
              value={stats.upcomingEvents}
              change="Next event in 2 days"
              changeType="neutral"
              icon={Calendar}
              iconColor="bg-purple-100 text-purple-600"
              linkTo="/events"
            />
          </div>

          {/* Quick Actions Grid */}
          <QuickActionsPanel 
            actions={quickActions}
            title="Quick Actions"
          />

          {/* Recent Activity Feed */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Ministry Activity</h2>
              <Link to="/activity" className="text-sm text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${activity.color} bg-opacity-10`}>
                      <activity.icon className="h-4 w-4" />
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
                icon={Heart}
                title="No recent ministry activity"
                description="Ministry activities will appear here"
              />
            )}
          </Card>
        </>
      )}

      {/* Other tabs would be implemented similarly */}
      {activeTab !== 'overview' && (
        <Card>
          <EmptyState
            icon={FileText}
            title={`${tabs.find(t => t.id === activeTab)?.label} Coming Soon`}
            description="This section is under development"
          />
        </Card>
      )}
    </div>
  )
}

export default PastorDashboard
