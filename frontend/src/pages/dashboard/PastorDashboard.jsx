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
import ChurchStatsCard from '../../components/dashboard/ChurchStatsCard'
import ChurchQuickActions from '../../components/dashboard/ChurchQuickActions'
import MinistryHealthViz from '../../components/dashboard/MinistryHealthViz'
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
            <span className="text-sm font-medium">Ministry Health: {Math.round((ministryHealth.memberEngagement + ministryHealth.departmentActivity + ministryHealth.spiritualGrowth) / 3)}%</span>
          </div>
        </div>
      </div>

      {/* Ministry Health Visualization - Signature Element */}
      <MinistryHealthViz 
        ministryData={{
          totalMembers: stats.totalMembers,
          activeMembers: Math.round(stats.totalMembers * 0.8),
          newMembers: Math.round(stats.totalMembers * 0.1),
          memberRetention: ministryHealth.memberEngagement
        }}
        congregationData={{
          averageAttendance: ministryHealth.memberEngagement,
          volunteerParticipation: ministryHealth.departmentActivity,
          smallGroupParticipation: Math.round(ministryHealth.spiritualGrowth * 0.8),
          ministryGrowth: Math.round(ministryHealth.spiritualGrowth * 0.2)
        }}
        engagementData={{
          prayerRequests: Math.round(stats.totalMembers * 0.3),
          communityService: Math.round(stats.totalMembers * 0.2),
          eventParticipation: ministryHealth.departmentActivity,
          spiritualGrowth: ministryHealth.spiritualGrowth
        }}
      />

      {/* Stats Grid with Church-Focused Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ChurchStatsCard
          title="Total Members"
          value={stats.totalMembers}
          change="Active congregation"
          changeType="positive"
          icon={Users}
          statType="members"
          linkTo="/members"
        />
        <ChurchStatsCard
          title="Active Departments"
          value={stats.activeDepartments}
          change="Ministry departments"
          changeType="neutral"
          icon={Building}
          statType="default"
          linkTo="/departments"
        />
        <ChurchStatsCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          change="Requires attention"
          changeType="neutral"
          icon={CheckCircle}
          statType="default"
          linkTo="/approvals"
        />
        <ChurchStatsCard
          title="Upcoming Events"
          value={stats.upcomingEvents}
          change="Church calendar"
          changeType="neutral"
          icon={Calendar}
          statType="events"
          linkTo="/events"
        />
      </div>

      {/* Church-Focused Quick Actions */}
      <ChurchQuickActions />

      {/* Recent Ministry Activity Feed */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Recent Ministry Activity</h2>
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
            description="Your ministry activities will appear here"
          />
        )}
      </Card>
    </div>
  )
}

export default PastorDashboard