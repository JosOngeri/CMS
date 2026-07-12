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

  // Tab-specific data states
  const [departmentsData, setDepartmentsData] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState(null)

  const [approvalsData, setApprovalsData] = useState([])
  const [approvalsLoading, setApprovalsLoading] = useState(false)
  const [approvalsError, setApprovalsError] = useState(null)

  const [eventsData, setEventsData] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState(null)

  const [membersData, setMembersData] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState(null)

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

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'departments') {
      fetchDepartments()
    } else if (activeTab === 'approvals') {
      fetchApprovals()
    } else if (activeTab === 'events') {
      fetchEvents()
    } else if (activeTab === 'members') {
      fetchMembers()
    }
  }, [activeTab])

  const fetchDepartments = async () => {
    try {
      setDepartmentsLoading(true)
      setDepartmentsError(null)
      const response = await api.get('/api/departments')
      setDepartmentsData(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch departments:', error)
      setDepartmentsError(error.message || 'Failed to load departments')
      toast.error('Failed to load departments')
    } finally {
      setDepartmentsLoading(false)
    }
  }

  const fetchApprovals = async () => {
    try {
      setApprovalsLoading(true)
      setApprovalsError(null)
      const response = await api.get('/api/approvals')
      setApprovalsData(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch approvals:', error)
      setApprovalsError(error.message || 'Failed to load approvals')
      toast.error('Failed to load approvals')
    } finally {
      setApprovalsLoading(false)
    }
  }

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

  const fetchMembers = async () => {
    try {
      setMembersLoading(true)
      setMembersError(null)
      const response = await api.get('/api/members')
      setMembersData(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch members:', error)
      setMembersError(error.message || 'Failed to load members')
      toast.error('Failed to load members')
    } finally {
      setMembersLoading(false)
    }
  }

  const handleApprovalAction = async (approvalId, action) => {
    try {
      await api.post(`/api/approvals/${approvalId}/${action}`)
      toast.success(`Approval ${action}ed successfully`)
      fetchApprovals() // Refresh the list
    } catch (error) {
      console.error(`Failed to ${action} approval:`, error)
      toast.error(`Failed to ${action} approval`)
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
            <span className="text-sm font-medium">Ministry Health: {Math.round((ministryHealth.memberEngagement + ministryHealth.departmentActivity + ministryHealth.spiritualGrowth) / 3)}%</span>
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

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Church Departments</h2>
            <Link to="/departments" className="text-sm text-primary-600 hover:text-primary-700">
              Manage Departments
            </Link>
          </div>
          {departmentsLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading departments...</div>
          ) : departmentsError ? (
            <div className="text-center py-8 text-red-600">{departmentsError}</div>
          ) : departmentsData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Head</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Members</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentsData.map((dept) => (
                    <tr key={dept.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[var(--color-primary)]-100 rounded-lg">
                            <Building className="h-4 w-4 text-[var(--color-primary)]-600" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--color-text)]">{dept.name}</p>
                            <p className="text-sm text-[var(--color-textSecondary)]">{dept.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text)]">{dept.head_name || 'Not assigned'}</td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text)]">{dept.member_count || 0}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          dept.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {dept.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link to={`/departments/${dept.id}`} className="text-sm text-primary-600 hover:text-primary-700">
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Building}
              title="No departments found"
              description="Create departments to get started"
            />
          )}
        </Card>
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Pending Approvals</h2>
            <Link to="/approvals" className="text-sm text-primary-600 hover:text-primary-700">
              View All Approvals
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          approval.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          approval.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {approval.status || 'pending'}
                        </span>
                        <span className="text-xs text-[var(--color-textSecondary)]">{approval.type || 'Request'}</span>
                      </div>
                      <h3 className="font-medium text-[var(--color-text)]">{approval.title || 'Approval Request'}</h3>
                      <p className="text-sm text-[var(--color-textSecondary)] mt-1">{approval.description || 'No description'}</p>
                      <p className="text-xs text-[var(--color-textSecondary)] mt-2">Submitted by: {approval.submitted_by || 'Unknown'}</p>
                    </div>
                    {approval.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApprovalAction(approval.id, 'approve')}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprovalAction(approval.id, 'reject')}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="No pending approvals"
              description="All approvals have been processed"
            />
          )}
        </Card>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming Events</h2>
            <Link to="/events/create" className="text-sm text-primary-600 hover:text-primary-700">
              Create Event
            </Link>
          </div>
          {eventsLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading events...</div>
          ) : eventsError ? (
            <div className="text-center py-8 text-red-600">{eventsError}</div>
          ) : eventsData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-[var(--color-textSecondary)]">
                      <Clock className="h-4 w-4" />
                      <span>{event.start_date || 'Date TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-textSecondary)]">
                      <Users className="h-4 w-4" />
                      <span>{event.attendee_count || 0} attendees</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <Link to={`/events/${event.id}`} className="text-sm text-primary-600 hover:text-primary-700">
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No upcoming events"
              description="Create events to fill the calendar"
            />
          )}
        </Card>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Church Members</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search members..."
                className="px-3 py-1 border border-[var(--color-border)] rounded-lg text-sm"
                onChange={(e) => {
                  // Implement search filtering
                }}
              />
              <Link to="/members/add" className="text-sm text-primary-600 hover:text-primary-700">
                Add Member
              </Link>
            </div>
          </div>
          {membersLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading members...</div>
          ) : membersError ? (
            <div className="text-center py-8 text-red-600">{membersError}</div>
          ) : membersData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {membersData.map((member) => (
                    <tr key={member.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[var(--color-primary)]-100 rounded-full">
                            <Users className="h-4 w-4 text-[var(--color-primary)]-600" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--color-text)]">{member.first_name} {member.last_name}</p>
                            <p className="text-sm text-[var(--color-textSecondary)]">{member.member_id || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text)]">{member.email || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text)]">{member.phone || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text)]">{member.department_name || 'None'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {member.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link to={`/members/${member.id}`} className="text-sm text-primary-600 hover:text-primary-700">
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No members found"
              description="Add members to the church directory"
            />
          )}
        </Card>
      )}
    </div>
  )
}

export default PastorDashboard
