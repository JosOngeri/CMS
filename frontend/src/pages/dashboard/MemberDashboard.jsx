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
import ChurchStatsCard from '../../components/dashboard/ChurchStatsCard'
import ChurchQuickActions from '../../components/dashboard/ChurchQuickActions'
import PersonalGrowthViz from '../../components/dashboard/PersonalGrowthViz'
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
            <span className="text-sm font-medium">Personal Status: {Math.round((personalStatus.attendanceRate + personalStatus.contributionRate + personalStatus.activityLevel) / 3)}%</span>
          </div>
        </div>
      </div>

      {/* Personal Growth Visualization - Hero Element */}
      <PersonalGrowthViz 
        growthData={{
          attendanceRate: personalStatus.attendanceRate,
          contributionRate: personalStatus.contributionRate,
          activityLevel: personalStatus.activityLevel,
          spiritualGrowth: Math.round((personalStatus.attendanceRate + personalStatus.contributionRate + personalStatus.activityLevel) / 3)
        }}
        engagementData={{
          departmentsInvolved: stats.departmentAssignments,
          eventsAttended: stats.upcomingEvents,
          communityService: 0,
          prayerRequests: 0
        }}
        journeyData={{
          memberSince: user?.created_at || '2023-01-01',
          milestones: [
            { date: user?.created_at || '2023-01-01', title: 'Joined Church', type: 'milestone' }
          ]
        }}
      />

      {/* Stats Grid with Church-Focused Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ChurchStatsCard
          title="Department Assignments"
          value={stats.departmentAssignments}
          change="Active departments"
          changeType="neutral"
          icon={Building}
          statType="members"
          linkTo="/departments/my"
        />
        <ChurchStatsCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          change="Requires attention"
          changeType="neutral"
          icon={CheckSquare}
          statType="default"
          linkTo="/approvals/my"
        />
        <ChurchStatsCard
          title="Upcoming Events"
          value={stats.upcomingEvents}
          change="Next event in 3 days"
          changeType="neutral"
          icon={Calendar}
          statType="events"
          linkTo="/events"
        />
        <ChurchStatsCard
          title="Personal Contributions"
          value={`KES ${stats.personalContributions.toLocaleString()}`}
          change="This year total"
          changeType="neutral"
          icon={DollarSign}
          statType="financial"
          linkTo="/payments/my"
        />
      </div>

      {/* Church-Focused Quick Actions */}
      <ChurchQuickActions />

      {/* Recent Personal Activity Feed */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Recent Activity</h2>
          <Link to="/activity" className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]-700">
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
            icon={Heart}
            title="No recent activity"
            description="Your activities will appear here"
          />
        )}
      </Card>
    </div>
  )
}

export default MemberDashboard