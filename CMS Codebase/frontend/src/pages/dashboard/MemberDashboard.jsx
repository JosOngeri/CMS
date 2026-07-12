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

  // Tab-specific data states
  const [eventsData, setEventsData] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState(null)

  const [approvalsData, setApprovalsData] = useState([])
  const [approvalsLoading, setApprovalsLoading] = useState(false)
  const [approvalsError, setApprovalsError] = useState(null)

  const [profileData, setProfileData] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)

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

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents()
    } else if (activeTab === 'approvals') {
      fetchApprovals()
    } else if (activeTab === 'profile') {
      fetchProfile()
    }
  }, [activeTab])

  const fetchEvents = async () => {
    try {
      setEventsLoading(true)
      setEventsError(null)
      const response = await api.get('/api/events')
      setEventsData(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch events:', error)
      setEventsError(error.message || 'Failed to load events')
      toast.error('Failed to load events')
    } finally {
      setEventsLoading(false)
    }
  }

  const fetchApprovals = async () => {
    try {
      setApprovalsLoading(true)
      setApprovalsError(null)
      const response = await api.get('/api/approvals')
      // Filter for user's approvals only
      const userApprovals = (response.data.data || []).filter(
        approval => approval.user_id === user?.id
      )
      setApprovalsData(userApprovals)
    } catch (error) {
      console.error('Failed to fetch approvals:', error)
      setApprovalsError(error.message || 'Failed to load approvals')
      toast.error('Failed to load approvals')
    } finally {
      setApprovalsLoading(false)
    }
  }

  const fetchProfile = async () => {
    try {
      setProfileLoading(true)
      setProfileError(null)
      // Profile data is already in user from AuthContext
      setProfileData(user)
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setProfileError(error.message || 'Failed to load profile')
      toast.error('Failed to load profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleEventRSVP = async (eventId) => {
    try {
      await api.post(`/api/events/${eventId}/rsvp`)
      toast.success('RSVP submitted successfully')
      fetchEvents() // Refresh the list
    } catch (error) {
      console.error('Failed to RSVP:', error)
      toast.error('Failed to submit RSVP')
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
            <span className="text-sm font-medium">Personal Status: {Math.round((personalStatus.attendanceRate + personalStatus.contributionRate + personalStatus.activityLevel) / 3)}%</span>
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

      {/* Events Tab */}
      {activeTab === 'events' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming Events</h2>
            <Link to="/events" className="text-sm text-primary-600 hover:text-primary-700">
              View All Events
            </Link>
          </div>
          {eventsLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading events...</div>
          ) : eventsError ? (
            <div className="text-center py-8 text-red-600">{eventsError}</div>
          ) : eventsData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventsData.map((event) => (
                <div key={event.id} className="border border-[var(--color-border)] rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-[var(--color-primary)]-100 rounded-lg">
                      <Calendar className="h-4 w-4 text-[var(--color-primary)]-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--color-text)]">{event.title || 'Event'}</h3>
                      <p className="text-sm text-[var(--color-textSecondary)]">{event.location || 'Location TBD'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center gap-2 text-[var(--color-textSecondary)]">
                      <Clock className="h-4 w-4" />
                      <span>{event.start_date || 'Date TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-textSecondary)]">
                      <Users className="h-4 w-4" />
                      <span>{event.attendee_count || 0} attendees</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEventRSVP(event.id)}
                      className="flex-1 px-3 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg text-sm hover:bg-[var(--color-primary)]-700 transition-colors"
                    >
                      RSVP
                    </button>
                    <Link to={`/events/${event.id}`} className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm text-center hover:bg-[var(--color-surface)] transition-colors">
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No upcoming events"
              description="Check back later for new events"
            />
          )}
        </Card>
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Approvals</h2>
            <Link to="/approvals/submit" className="text-sm text-primary-600 hover:text-primary-700">
              Submit Request
            </Link>
          </div>
          {approvalsLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading approvals...</div>
          ) : approvalsError ? (
            <div className="text-center py-8 text-red-600">{approvalsError}</div>
          ) : approvalsData.length > 0 ? (
            <div className="space-y-4">
              {approvalsData.map((approval) => (
                <div key={approval.id} className="border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      approval.status === 'approved' ? 'bg-green-100' :
                      approval.status === 'rejected' ? 'bg-red-100' :
                      'bg-yellow-100'
                    }`}>
                      <CheckSquare className={`h-4 w-4 ${
                        approval.status === 'approved' ? 'text-green-600' :
                        approval.status === 'rejected' ? 'text-red-600' :
                        'text-yellow-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          approval.status === 'approved' ? 'bg-green-100 text-green-700' :
                          approval.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {approval.status || 'pending'}
                        </span>
                        <span className="text-xs text-[var(--color-textSecondary)]">{approval.type || 'Request'}</span>
                      </div>
                      <h3 className="font-medium text-[var(--color-text)]">{approval.title || 'Approval Request'}</h3>
                      <p className="text-sm text-[var(--color-textSecondary)] mt-1">{approval.description || 'No description'}</p>
                      <p className="text-xs text-[var(--color-textSecondary)] mt-2">Submitted: {approval.created_at || 'Recently'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckSquare}
              title="No approval requests"
              description="Submit approval requests to track their status"
            />
          )}
        </Card>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Profile</h2>
            <Link to="/profile/edit" className="text-sm text-primary-600 hover:text-primary-700">
              Edit Profile
            </Link>
          </div>
          {profileLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading profile...</div>
          ) : profileError ? (
            <div className="text-center py-8 text-red-600">{profileError}</div>
          ) : profileData ? (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 pb-6 border-b border-[var(--color-border)]">
                <div className="p-4 bg-[var(--color-primary)]-100 rounded-full">
                  <User className="h-8 w-8 text-[var(--color-primary)]-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text)]">
                    {profileData.first_name} {profileData.last_name}
                  </h3>
                  <p className="text-sm text-[var(--color-textSecondary)]">{profileData.email || 'N/A'}</p>
                  <div className="flex gap-2 mt-2">
                    {profileData.roles?.map((role) => (
                      <span key={role} className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-[var(--color-textSecondary)] mb-2">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--color-textSecondary)]">Phone:</span>
                      <span className="text-sm text-[var(--color-text)]">{profileData.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--color-textSecondary)]">Email:</span>
                      <span className="text-sm text-[var(--color-text)]">{profileData.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--color-textSecondary)]">Address:</span>
                      <span className="text-sm text-[var(--color-text)]">{profileData.address || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[var(--color-textSecondary)] mb-2">Member Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--color-textSecondary)]">Member ID:</span>
                      <span className="text-sm text-[var(--color-text)]">{profileData.member_id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--color-textSecondary)]">Join Date:</span>
                      <span className="text-sm text-[var(--color-text)]">{profileData.joined_date || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--color-textSecondary)]">Department:</span>
                      <span className="text-sm text-[var(--color-text)]">{profileData.department_name || 'None'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Status */}
              <div>
                <h4 className="text-sm font-medium text-[var(--color-textSecondary)] mb-3">Personal Status</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-[var(--color-surface)] rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{personalStatus.attendanceRate}%</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">Attendance</p>
                  </div>
                  <div className="text-center p-4 bg-[var(--color-surface)] rounded-lg">
                    <p className="text-2xl font-bold text-[var(--color-primary)]-600">{personalStatus.contributionRate}%</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">Contributions</p>
                  </div>
                  <div className="text-center p-4 bg-[var(--color-surface)] rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{personalStatus.activityLevel}%</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">Activity</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={User}
              title="Profile not found"
              description="Unable to load your profile information"
            />
          )}
        </Card>
      )}
    </div>
  )
}

export default MemberDashboard
