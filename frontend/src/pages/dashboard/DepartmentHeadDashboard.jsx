import { useState, useEffect } from 'react'
import {
  Users, DollarSign, Calendar, Megaphone, TrendingUp,
  Clock, CheckCircle, AlertCircle, ArrowRight, Building, UserPlus,
  FileText, Settings, Users as UsersIcon, Target
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

const DepartmentHeadDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const { colors } = useColorPalette()
  const [stats, setStats] = useState({
    departmentMembers: 0,
    pendingTasks: 0,
    departmentEvents: 0,
    departmentBudget: 0
  })
  const [departmentHealth, setDepartmentHealth] = useState({
    memberParticipation: 88,
    taskCompletion: 75,
    budgetUtilization: 65
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
      
      // Fetch department-focused stats
      const statsResponse = await api.get('/api/dashboard/department-stats')
      setStats(statsResponse.data.data || {
        departmentMembers: 0,
        pendingTasks: 0,
        departmentEvents: 0,
        departmentBudget: 0
      })

      // Fetch department health metrics
      const healthResponse = await api.get('/api/dashboard/department-health')
      setDepartmentHealth(healthResponse.data.data || {
        memberParticipation: 88,
        taskCompletion: 75,
        budgetUtilization: 65
      })

      // Fetch recent department activities
      const activityResponse = await api.get('/api/dashboard/department-activity?limit=10')
      const iconMap = {
        task: CheckCircle,
        event: Calendar,
        member: Users,
        budget: DollarSign,
        approval: Target
      }
      const colorMap = {
        task: colors.success,
        event: colors.secondary,
        member: colors.warning,
        budget: colors.primary,
        approval: colors.accent
      }

      const formattedActivities = (activityResponse.data.data || []).map((activity, index) => ({
        id: index,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        time: activity.time,
        icon: iconMap[activity.type] || CheckCircle,
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
      title: 'Add Department Member',
      description: 'Add member to department',
      icon: UserPlus,
      color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600',
      link: '/departments/members/add',
      permission: 'department.member.add'
    },
    {
      title: 'Create Event',
      description: 'Schedule department event',
      icon: Calendar,
      color: 'bg-green-100 text-green-600',
      link: '/departments/events/create',
      permission: 'department.event.create'
    },
    {
      title: 'Submit Approval Request',
      description: 'Request approval',
      icon: Target,
      color: 'bg-purple-100 text-purple-600',
      link: '/approvals/submit',
      permission: 'approval.submit'
    },
    {
      title: 'View Department Reports',
      description: 'Department analytics',
      icon: FileText,
      color: 'bg-orange-100 text-orange-600',
      link: '/departments/reports',
      permission: 'report.view'
    },
    {
      title: 'Department Settings',
      description: 'Configure department',
      icon: Settings,
      color: 'bg-pink-100 text-pink-600',
      link: '/departments/settings',
      permission: 'department.settings'
    },
    {
      title: 'Budget Overview',
      description: 'Financial status',
      icon: DollarSign,
      color: 'bg-[var(--color-surface)] text-[var(--color-textSecondary)]',
      link: '/departments/budget',
      permission: 'department.budget.view'
    }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Members' },
    { id: 'events', label: 'Events' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'budget', label: 'Budget' }
  ]

  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Department Health */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Head Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.first_name}! Department overview and management.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Department Health Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Department Health: 76%</span>
          </div>
        </div>
      </div>

      {/* Department Health Status */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <UsersIcon className="h-5 w-5 text-[var(--color-primary)]-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Member Participation</span>
              <span className="block text-sm font-medium text-[var(--color-primary)]-600">{departmentHealth.memberParticipation}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Task Completion</span>
              <span className="block text-sm font-medium text-green-600">{departmentHealth.taskCompletion}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Budget Utilization</span>
              <span className="block text-sm font-medium text-purple-600">{departmentHealth.budgetUtilization}%</span>
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
              title="Department Members"
              value={stats.departmentMembers}
              change="↑ 5% from last month"
              changeType="positive"
              icon={Users}
              iconColor="bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600"
              linkTo="/departments/members"
            />
            <StatsCard
              title="Pending Tasks"
              value={stats.pendingTasks}
              change="Requires attention"
              changeType="neutral"
              icon={CheckCircle}
              iconColor="bg-yellow-100 text-yellow-600"
              linkTo="/departments/tasks"
            />
            <StatsCard
              title="Department Events"
              value={stats.departmentEvents}
              change="Next event in 3 days"
              changeType="neutral"
              icon={Calendar}
              iconColor="bg-green-100 text-green-600"
              linkTo="/departments/events"
            />
            <StatsCard
              title="Department Budget"
              value={`KES ${stats.departmentBudget.toLocaleString()}`}
              change="65% utilized"
              changeType="neutral"
              icon={DollarSign}
              iconColor="bg-purple-100 text-purple-600"
              linkTo="/departments/budget"
            />
          </div>

          {/* Quick Actions Grid */}
          <QuickActionsPanel 
            actions={quickActions}
            title="Quick Actions"
          />

          {/* Recent Department Activity Feed */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Department Activity</h2>
              <Link to="/departments/activity" className="text-sm text-primary-600 hover:text-primary-700">
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
                icon={CheckCircle}
                title="No recent department activity"
                description="Department activities will appear here"
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

export default DepartmentHeadDashboard
