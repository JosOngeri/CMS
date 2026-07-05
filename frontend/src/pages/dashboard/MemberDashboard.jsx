import { useState, useEffect } from 'react'
import {
  Users, DollarSign, Calendar, Megaphone, TrendingUp,
  Clock, CheckCircle, AlertCircle, ArrowRight, Building, User,
  FileText, Heart, CheckSquare, Bell
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

const MemberDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const { colors } = useColorPalette()
  const [stats, setStats] = useState({
    departmentAssignments: 0,
    pendingApprovals: 0,
    upcomingEvents: 0,
    personalContributions: 0
  })
  const [personalStatus, setPersonalStatus] = useState({
    attendanceRate: 92,
    contributionRate: 85,
    activityLevel: 78
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
      
      // Fetch personal stats
      const statsResponse = await api.get('/api/dashboard/personal-stats')
      setStats(statsResponse.data.data || {
        departmentAssignments: 0,
        pendingApprovals: 0,
        upcomingEvents: 0,
        personalContributions: 0
      })

      // Fetch personal status metrics
      const statusResponse = await api.get('/api/dashboard/personal-status')
      setPersonalStatus(statusResponse.data.data || {
        attendanceRate: 92,
        contributionRate: 85,
        activityLevel: 78
      })

      // Fetch recent personal activities
      const activityResponse = await api.get('/api/dashboard/personal-activity?limit=10')
      const iconMap = {
        payment: DollarSign,
        event: Calendar,
        announcement: Megaphone,
        approval: CheckSquare,
        department: Building
      }
      const colorMap = {
        payment: colors.success,
        event: colors.secondary,
        announcement: colors.primary,
        approval: colors.warning,
        department: colors.accent
      }

      const formattedActivities = (activityResponse.data.data || []).map((activity, index) => ({
        id: index,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        time: activity.time,
        icon: iconMap[activity.type] || Bell,
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
      title: 'View Profile',
      description: 'Personal information',
      icon: User,
      color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600',
      link: '/profile'
    },
    {
      title: 'Submit Approval Request',
      description: 'Request approval',
      icon: CheckSquare,
      color: 'bg-green-100 text-green-600',
      link: '/approvals/submit'
    },
    {
      title: 'RSVP to Events',
      description: 'Upcoming events',
      icon: Calendar,
      color: 'bg-purple-100 text-purple-600',
      link: '/events'
    },
    {
      title: 'View Announcements',
      description: 'Church news',
      icon: Megaphone,
      color: 'bg-orange-100 text-orange-600',
      link: '/announcements'
    },
    {
      title: 'My Departments',
      description: 'Department activities',
      icon: Building,
      color: 'bg-pink-100 text-pink-600',
      link: '/departments/my'
    },
    {
      title: 'My Contributions',
      description: 'Payment history',
      icon: DollarSign,
      color: 'bg-[var(--color-surface)] text-[var(--color-textSecondary)]',
      link: '/payments/my'
    }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'events', label: 'Events' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'profile', label: 'Profile' }
  ]

  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Personal Status */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Member Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.first_name}! Personal overview and member tools.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Personal Status Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-50 text-[var(--color-primary)]-700 rounded-lg">
            <Heart className="h-4 w-4" />
            <span className="text-sm font-medium">Personal Status: 85%</span>
          </div>
        </div>
      </div>

      {/* Personal Status */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Attendance Rate</span>
              <span className="block text-sm font-medium text-green-600">{personalStatus.attendanceRate}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-[var(--color-primary)]-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Contribution Rate</span>
              <span className="block text-sm font-medium text-[var(--color-primary)]-600">{personalStatus.contributionRate}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-purple-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Activity Level</span>
              <span className="block text-sm font-medium text-purple-600">{personalStatus.activityLevel}%</span>
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
              title="Department Assignments"
              value={stats.departmentAssignments}
              change="Active departments"
              changeType="neutral"
              icon={Building}
              iconColor="bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600"
              linkTo="/departments/my"
            />
            <StatsCard
              title="Pending Approvals"
              value={stats.pendingApprovals}
              change="Requires attention"
              changeType="neutral"
              icon={CheckSquare}
              iconColor="bg-yellow-100 text-yellow-600"
              linkTo="/approvals/my"
            />
            <StatsCard
              title="Upcoming Events"
              value={stats.upcomingEvents}
              change="Next event in 3 days"
              changeType="neutral"
              icon={Calendar}
              iconColor="bg-green-100 text-green-600"
              linkTo="/events"
            />
            <StatsCard
              title="Personal Contributions"
              value={`KES ${stats.personalContributions.toLocaleString()}`}
              change="This year total"
              changeType="neutral"
              icon={DollarSign}
              iconColor="bg-purple-100 text-purple-600"
              linkTo="/payments/my"
            />
          </div>

          {/* Quick Actions Grid */}
          <QuickActionsPanel 
            actions={quickActions}
            title="Quick Actions"
          />

          {/* Recent Personal Activity Feed */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
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
                title="No recent activity"
                description="Your activities will appear here"
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

export default MemberDashboard
