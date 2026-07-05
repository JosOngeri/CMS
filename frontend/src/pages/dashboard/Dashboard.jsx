import { useState, useEffect } from 'react'
import {
  Users, DollarSign, Calendar, Megaphone, TrendingUp,
  Clock, CheckCircle, AlertCircle, ArrowRight, Building, Image as ImageIcon
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useColorPalette } from '../../contexts/ColorPaletteContext'
import Card from '../../components/common/Card'
import { FullPageLoading, InlineLoading } from '../../components/common/Loading'
import { EmptyState, ErrorEmptyState, GalleryEmptyState } from '../../components/common/EmptyState'
import { useDataFetch } from '../../hooks/useDataFetch'
import SuperAdminDashboard from './SuperAdminDashboard'
import PastorDashboard from './PastorDashboard'
import DepartmentHeadDashboard from './DepartmentHeadDashboard'
import TreasurerDashboard from './TreasurerDashboard'
import MemberDashboard from './MemberDashboard'
import '../../styles/dashboard.css'

const Dashboard = () => {
  const { user, loading } = useAuth()
  
  // Show loading while user data is being fetched
  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />
  }
  
  // Route to appropriate dashboard based on user role
  const userRoles = user?.roles || []
  const userRole = userRoles.length > 0 ? userRoles[0] : 'Member'
  
  // Check if user has Super Admin role
  if (userRoles.includes('Super Admin')) {
    return <SuperAdminDashboard />
  }
  
  // Check if user has Pastor role
  if (userRoles.includes('Pastor')) {
    return <PastorDashboard />
  }
  
  // Check if user has Department Head role
  if (userRoles.includes('Department Head')) {
    return <DepartmentHeadDashboard />
  }
  
  // Check if user has Treasurer role
  if (userRoles.includes('Treasurer')) {
    return <TreasurerDashboard />
  }
  
  // Default dashboard for members and other roles
  return <MemberDashboard />
}

const DefaultDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const { colors } = useColorPalette()
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalPayments: 0,
    upcomingEvents: 0,
    recentAnnouncements: 0
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [failedImages, setFailedImages] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch recent photos using useDataFetch hook
  const { data: recentPhotos, loading: photosLoading, error: photosError, isEmpty: photosEmpty, refetch: refetchPhotos } = useDataFetch(
    '/api/gallery/photos?limit=4',
    {
      transform: (result) => result.photos || []
    }
  )

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch dashboard stats from API
      const statsResponse = await api.get('/api/dashboard/stats')
      setStats(statsResponse.data.data || {
        totalMembers: 0,
        totalPayments: 0,
        upcomingEvents: 0,
        recentAnnouncements: 0
      })

      // Fetch recent activities from API
      const activityResponse = await api.get('/api/dashboard/activity?limit=10')
      const iconMap = {
        payment: DollarSign,
        announcement: Megaphone,
        event: Calendar,
        member: Users
      }
      const colorMap = {
        payment: colors.success,
        announcement: colors.primary,
        event: colors.secondary,
        member: colors.warning
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
      setError(error.message || 'Failed to load dashboard data')
      toast.error('Failed to load dashboard data. Please try again.')
      // Fallback to mock data on error
      setStats({
        totalMembers: 0,
        totalPayments: 0,
        upcomingEvents: 0,
        recentAnnouncements: 0
      })
      setRecentActivities([])
    } finally {
      setLoading(false)
    }
  }

  const handleImageError = (fileId) => {
    setFailedImages(prev => new Set(prev).add(fileId))
  }

  const renderGalleryImage = (photo) => {
    if (failedImages.has(photo.id)) {
      return (
        <div className="w-full h-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-textSecondary)]">
          <span className="text-xs">Photo unavailable</span>
        </div>
      )
    }
    return (
      <img
        src={`/api/gallery/image/${photo.id}`}
        alt={photo.caption || 'Photo'}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => handleImageError(photo.id)}
      />
    )
  }

  const quickActions = [
    {
      title: 'Make Payment',
      description: 'Pay tithe and offerings',
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
      link: '/dashboard/payments'
    },
    {
      title: 'View Announcements',
      description: 'Latest church news',
      icon: Megaphone,
      color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600',
      link: '/dashboard/announcements'
    },
    {
      title: 'Upcoming Events',
      description: 'Church calendar',
      icon: Calendar,
      color: 'bg-purple-100 text-purple-600',
      link: '/dashboard/events'
    },
    {
      title: 'Member Directory',
      description: 'Find church members',
      icon: Users,
      color: 'bg-orange-100 text-orange-600',
      link: '/dashboard/members'
    },
    {
      title: 'My Departments',
      description: 'Manage department communications',
      icon: Building,
      color: 'bg-purple-100 text-purple-600',
      link: '/dashboard/my-departments'
    }
  ]

  const isAdmin = user?.roles?.some(role => 
    ['Super Admin', 'Pastor', 'First Elder'].includes(role)
  )

  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Church Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.first_name}! Here's what's happening at SDA Church Kiserian Main today.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              to="/dashboard/users"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              <Users className="h-4 w-4" />
              Manage Users
            </Link>
            <Link
              to="/dashboard/sms"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
            >
              <Megaphone className="h-4 w-4" />
              Send SMS
            </Link>
            <Link
              to="/dashboard/departments"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Building className="h-4 w-4" />
              Departments
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={28} />
            </div>
            <span className="stat-label">Total Members</span>
            <span className="stat-value">{(stats?.totalMembers ?? 0).toLocaleString()}</span>
            <span className="stat-change">↑ 12% from last month</span>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div className="stat-icon success">
              <DollarSign size={28} />
            </div>
            <span className="stat-label">Total Payments</span>
            <span className="stat-value">KES {(stats?.totalPayments ?? 0).toLocaleString()}</span>
            <span className="stat-change">↑ 8% from last month</span>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div className="stat-icon pending">
              <Calendar size={28} />
            </div>
            <span className="stat-label">Upcoming Events</span>
            <span className="stat-value">{stats.upcomingEvents}</span>
            <span className="stat-change">Next event in 2 days</span>
          </div>
        </Card>

        <Card>
          <div className="stat-card present">
            <Megaphone size={28} />
          </div>
          <span className="stat-label">Announcements</span>
          <span className="stat-value">{stats.recentAnnouncements}</span>
          <span className="stat-change">3 new this week</span>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={index}
                to={action.link}
                className="bg-[var(--color-surface)]  p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow group h-full flex flex-col"
              >
                <div className={`inline-flex p-3 rounded-lg ${action.color} mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-[var(--color-text)]  mb-2 group-hover:text-primary-600">
                  {action.title}
                </h3>
                <p className="text-sm text-[var(--color-textSecondary)]  mt-auto">
                  {action.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--color-surface)]  p-6 rounded-lg shadow-sm h-full">
          <h2 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Recent Activity</h2>
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const Icon = activity.icon
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${activity.color} bg-opacity-10 flex-shrink-0`}>
                      <Icon className={`h-4 w-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] ">
                        {activity.title}
                      </p>
                      <p className="text-sm text-[var(--color-textSecondary)] ">
                        {activity.description}
                      </p>
                      <p className="text-xs text-[var(--color-textSecondary)]  mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="No recent activity"
              description="There has been no recent activity in the system."
            />
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-[var(--color-surface)]  p-6 rounded-lg shadow-sm h-full">
          <h2 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-[var(--color-text)] ">
                  Completed Tasks
                </span>
              </div>
              <span className="text-lg font-bold text-green-600 flex-shrink-0">24</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <span className="text-sm font-medium text-[var(--color-text)] ">
                  Pending Tasks
                </span>
              </div>
              <span className="text-lg font-bold text-yellow-600 flex-shrink-0">8</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[var(--color-primary)]-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <Users className="h-5 w-5 text-[var(--color-primary)]-600 flex-shrink-0" />
                <span className="text-sm font-medium text-[var(--color-text)] ">
                  Active Members
                </span>
              </div>
              <span className="text-lg font-bold text-[var(--color-primary)]-600 flex-shrink-0">186</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <Calendar className="h-5 w-5 text-purple-600 flex-shrink-0" />
                <span className="text-sm font-medium text-[var(--color-text)] ">
                  This Week
                </span>
              </div>
              <span className="text-lg font-bold text-purple-600 flex-shrink-0">3 events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Photos */}
      <div className="bg-[var(--color-surface)]  p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)] ">Recent Photos</h2>
          <Link
            to="/dashboard/gallery"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
          >
            <span>Manage Gallery</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {(recentPhotos?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden aspect-square"
              >
                {renderGalleryImage(photo)}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all">
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs font-medium truncate">{photo.caption || 'Photo'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ImageIcon}
            title="No photos yet"
            description="Upload photos to the gallery to see them here."
          />
        )}
      </div>
    </div>
  )
}

export default Dashboard
