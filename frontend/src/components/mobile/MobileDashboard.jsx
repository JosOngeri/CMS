import { useState, useEffect } from 'react'
import {
  Users, DollarSign, Calendar, Megaphone, RefreshCw,
  LogOut, Menu, Home, Activity, Settings
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const MobileDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const { colors } = useColorPalette()
  const navigate = useNavigate()
  
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalPayments: 0,
    upcomingEvents: 0,
    recentAnnouncements: 0
  })
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load stats
      const statsResponse = await api.get('/api/dashboard/stats')
      setStats(statsResponse.data.stats || {
        totalMembers: 0,
        totalPayments: 0,
        upcomingEvents: 0,
        recentAnnouncements: 0
      })

      // Load activities
      const activityResponse = await api.get('/api/dashboard/activity?limit=10')
      setActivities(activityResponse.data.activities || [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
  }

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout')
      navigate('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
      toast.error('Logout failed')
    }
  }

  const statCards = [
    {
      title: 'Total Members',
      value: stats.totalMembers,
      icon: Users,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.1)'
    },
    {
      title: 'Total Payments',
      value: `KES ${stats.totalPayments}`,
      icon: DollarSign,
      color: '#22C55E',
      bgColor: 'rgba(34, 197, 94, 0.1)'
    },
    {
      title: 'Upcoming Events',
      value: stats.upcomingEvents,
      icon: Calendar,
      color: '#A855F7',
      bgColor: 'rgba(168, 85, 247, 0.1)'
    },
    {
      title: 'Announcements',
      value: stats.recentAnnouncements,
      icon: Megaphone,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.1)'
    }
  ]

  const activityIcons = {
    payment: DollarSign,
    announcement: Megaphone,
    event: Calendar,
    member: Users,
    system: Activity
  }

  const activityColors = {
    payment: '#22C55E',
    announcement: '#3B82F6',
    event: '#A855F7',
    member: '#F59E0B',
    system: '#6B7280'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-textSecondary)]">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-app-container">
      {/* Mobile Header */}
      <div className="mobile-header flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">
            Welcome, {user?.first_name || 'Member'}!
          </h1>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Here's what's happening with your church
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-full hover:bg-[var(--color-border)]"
          disabled={refreshing}
        >
          <RefreshCw className={`h-5 w-5 text-[var(--color-text)] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="mobile-stat-card">
                <div 
                  className="icon"
                  style={{ color: stat.color }}
                >
                  <Icon size={32} />
                </div>
                <div className="value">{stat.value}</div>
                <div className="label">{stat.title}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
          Recent Activities
        </h2>
        {activities.length > 0 ? (
          <div className="space-y-2">
            {activities.map((activity, index) => {
              const Icon = activityIcons[activity.type] || Activity
              const color = activityColors[activity.type] || '#6B7280'
              return (
                <div key={index} className="mobile-activity-item">
                  <div 
                    className="icon"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="content">
                    <div className="title">{activity.title}</div>
                    <div className="description">{activity.description}</div>
                  </div>
                  <div className="time">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--color-textSecondary)]">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activities</p>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <button
          onClick={() => navigate('/dashboard/overview')}
          className="mobile-bottom-nav-item active"
        >
          <Home className="icon" />
          <span className="label">Home</span>
        </button>
        <button
          onClick={() => navigate('/dashboard/members')}
          className="mobile-bottom-nav-item"
        >
          <Users className="icon" />
          <span className="label">Members</span>
        </button>
        <button
          onClick={() => navigate('/dashboard/payments/my')}
          className="mobile-bottom-nav-item"
        >
          <DollarSign className="icon" />
          <span className="label">Payments</span>
        </button>
        <button
          onClick={() => navigate('/dashboard/profile')}
          className="mobile-bottom-nav-item"
        >
          <Settings className="icon" />
          <span className="label">Profile</span>
        </button>
      </div>

      {/* Header Menu Button */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 p-2 rounded-full bg-[var(--color-surface)] shadow-md z-50"
      >
        <LogOut className="h-5 w-5 text-[var(--color-text)]" />
      </button>
    </div>
  )
}

export default MobileDashboard