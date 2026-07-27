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
import ChurchStatsCard from '../../components/dashboard/ChurchStatsCard'
import ChurchQuickActions from '../../components/dashboard/ChurchQuickActions'
import DepartmentCommunityViz from '../../components/dashboard/DepartmentCommunityViz'
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

  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Department Health */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Head Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.first_name}! Department coordination and team management.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Department Health Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)]-50 text-[var(--color-accent)]-700 rounded-lg">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Department Health: {Math.round((departmentHealth.memberParticipation + departmentHealth.taskCompletion + departmentHealth.budgetUtilization) / 3)}%</span>
          </div>
        </div>
      </div>

      {/* Department Community Visualization - Signature Element */}
      <DepartmentCommunityViz 
        teamData={{
          totalMembers: stats.departmentMembers,
          activeMembers: Math.round(stats.departmentMembers * 0.85),
          newMembers: Math.round(stats.departmentMembers * 0.1),
          teamHealth: Math.round((departmentHealth.memberParticipation + departmentHealth.taskCompletion) / 2)
        }}
        activityData={{
          meetingsHeld: Math.round(stats.departmentEvents * 0.8),
          projectsCompleted: Math.round(stats.pendingTasks * 0.6),
          volunteerHours: Math.round(stats.departmentMembers * 5),
          memberParticipation: departmentHealth.memberParticipation
        }}
        coordinationData={{
          responseRate: Math.round(departmentHealth.taskCompletion * 1.1),
          taskCompletion: departmentHealth.taskCompletion,
          communicationScore: Math.round((departmentHealth.memberParticipation + departmentHealth.taskCompletion) / 2),
          teamSatisfaction: Math.round((departmentHealth.memberParticipation + departmentHealth.taskCompletion + departmentHealth.budgetUtilization) / 3)
        }}
      />

      {/* Stats Grid with Church-Focused Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ChurchStatsCard
          title="Department Members"
          value={stats.departmentMembers}
          change="Team members"
          changeType="positive"
          icon={Users}
          statType="members"
          linkTo="/department/members"
        />
        <ChurchStatsCard
          title="Pending Tasks"
          value={stats.pendingTasks}
          change="Requires attention"
          changeType="neutral"
          icon={Target}
          statType="default"
          linkTo="/department/tasks"
        />
        <ChurchStatsCard
          title="Department Events"
          value={stats.departmentEvents}
          change="Upcoming events"
          changeType="neutral"
          icon={Calendar}
          statType="events"
          linkTo="/department/events"
        />
        <ChurchStatsCard
          title="Department Budget"
          value={`KES ${stats.departmentBudget.toLocaleString()}`}
          change="Budget utilization"
          changeType="neutral"
          icon={DollarSign}
          statType="financial"
          linkTo="/department/budget"
        />
      </div>

      {/* Church-Focused Quick Actions */}
      <ChurchQuickActions />

      {/* Recent Department Activity Feed */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Recent Department Activity</h2>
          <Link to="/department/activity" className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]-700">
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
            icon={Users}
            title="No recent activity"
            description="Department activities will appear here"
          />
        )}
      </Card>
    </div>
  )
}

export default DepartmentHeadDashboard