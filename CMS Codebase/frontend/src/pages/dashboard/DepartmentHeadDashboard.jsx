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

  // Tab-specific data states
  const [membersData, setMembersData] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState(null)

  const [eventsData, setEventsData] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState(null)

  const [tasksData, setTasksData] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState(null)

  const [budgetData, setBudgetData] = useState([])
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [budgetError, setBudgetError] = useState(null)

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

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembers()
    } else if (activeTab === 'events') {
      fetchEvents()
    } else if (activeTab === 'tasks') {
      fetchTasks()
    } else if (activeTab === 'budget') {
      fetchBudget()
    }
  }, [activeTab])

  const fetchMembers = async () => {
    try {
      setMembersLoading(true)
      setMembersError(null)
      const response = await api.get('/api/members')
      setMembersData(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch department members:', error)
      setMembersError(error.message || 'Failed to load members')
      toast.error('Failed to load members')
    } finally {
      setMembersLoading(false)
    }
  }

  const fetchEvents = async () => {
    try {
      setEventsLoading(true)
      setEventsError(null)
      const response = await api.get('/api/events')
      setEventsData(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch department events:', error)
      setEventsError(error.message || 'Failed to load events')
      toast.error('Failed to load events')
    } finally {
      setEventsLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      setTasksLoading(true)
      setTasksError(null)
      // Tasks endpoint is TBD - using department activity as fallback
      const response = await api.get('/api/dashboard/department-activity')
      setTasksData(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      setTasksError(error.message || 'Failed to load tasks')
      toast.error('Failed to load tasks')
    } finally {
      setTasksLoading(false)
    }
  }

  const fetchBudget = async () => {
    try {
      setBudgetLoading(true)
      setBudgetError(null)
      const response = await api.get('/api/treasury/budgets')
      setBudgetData(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch budget:', error)
      setBudgetError(error.message || 'Failed to load budget')
      toast.error('Failed to load budget')
    } finally {
      setBudgetLoading(false)
    }
  }

  const handleTaskComplete = async (taskId) => {
    try {
      await api.post(`/api/tasks/${taskId}/complete`)
      toast.success('Task marked as complete')
      fetchTasks() // Refresh the list
    } catch (error) {
      console.error('Failed to complete task:', error)
      toast.error('Failed to complete task')
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
            <span className="text-sm font-medium">Department Health: {Math.round((departmentHealth.memberParticipation + departmentHealth.taskCompletion + departmentHealth.budgetUtilization) / 3)}%</span>
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

      {/* Members Tab */}
      {activeTab === 'members' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Department Members</h2>
            <Link to="/departments/members/add" className="text-sm text-primary-600 hover:text-primary-700">
              Add Member
            </Link>
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Join Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Participation</th>
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
                            <p className="text-sm text-[var(--color-textSecondary)]">{member.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {member.role || 'Member'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text)]">{member.joined_date || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.participation >= 80 ? 'bg-green-100 text-green-700' :
                          member.participation >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {member.participation || 0}%
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
              title="No department members"
              description="Add members to your department"
            />
          )}
        </Card>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Department Events</h2>
            <Link to="/departments/events/create" className="text-sm text-primary-600 hover:text-primary-700">
              Create Event
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
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex gap-2">
                    <Link to={`/events/${event.id}`} className="text-sm text-primary-600 hover:text-primary-700">
                      View Details
                    </Link>
                    <button className="text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No department events"
              description="Create events for your department"
            />
          )}
        </Card>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Department Tasks</h2>
            <button className="text-sm text-primary-600 hover:text-primary-700">
              Create Task
            </button>
          </div>
          {tasksLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading tasks...</div>
          ) : tasksError ? (
            <div className="text-center py-8 text-red-600">{tasksError}</div>
          ) : tasksData.length > 0 ? (
            <div className="space-y-3">
              {tasksData.map((task) => (
                <div key={task.id} className="border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.status === 'completed' ? 'bg-green-100 text-green-700' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {task.status || 'pending'}
                        </span>
                        <span className="text-xs text-[var(--color-textSecondary)]">{task.priority || 'Normal'}</span>
                      </div>
                      <h3 className="font-medium text-[var(--color-text)]">{task.title || 'Task'}</h3>
                      <p className="text-sm text-[var(--color-textSecondary)] mt-1">{task.description || 'No description'}</p>
                      <p className="text-xs text-[var(--color-textSecondary)] mt-2">Due: {task.due_date || 'No due date'}</p>
                    </div>
                    {task.status !== 'completed' && (
                      <button
                        onClick={() => handleTaskComplete(task.id)}
                        className="ml-4 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="No tasks found"
              description="Tasks will appear here once assigned"
            />
          )}
        </Card>
      )}

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Department Budget</h2>
            <Link to="/departments/budget" className="text-sm text-primary-600 hover:text-primary-700">
              Manage Budget
            </Link>
          </div>
          {budgetLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading budget...</div>
          ) : budgetError ? (
            <div className="text-center py-8 text-red-600">{budgetError}</div>
          ) : budgetData.length > 0 ? (
            <div className="space-y-4">
              {budgetData.map((budget) => (
                <div key={budget.id} className="border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-[var(--color-text)]">{budget.category || 'Budget Category'}</h3>
                      <p className="text-sm text-[var(--color-textSecondary)]">{budget.description || 'No description'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      budget.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {budget.status || 'active'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--color-textSecondary)]">Allocated</p>
                      <p className="font-medium text-[var(--color-text)]">KES {budget.allocated?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)]">Spent</p>
                      <p className="font-medium text-[var(--color-text)]">KES {budget.spent?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)]">Remaining</p>
                      <p className="font-medium text-green-600">KES {(budget.allocated - budget.spent)?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[var(--color-primary)]-600 h-2 rounded-full transition-all"
                        style={{ width: `${((budget.spent || 0) / (budget.allocated || 1)) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                      {Math.round(((budget.spent || 0) / (budget.allocated || 1)) * 100)}% utilized
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={DollarSign}
              title="No budget data"
              description="Budget information will appear here"
            />
          )}
        </Card>
      )}
    </div>
  )
}

export default DepartmentHeadDashboard
