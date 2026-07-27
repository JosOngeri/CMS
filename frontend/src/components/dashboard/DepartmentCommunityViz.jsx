import { useState, useEffect } from 'react'
import { Users, MessageCircle, Calendar, CheckCircle, Clock, TrendingUp, Award } from 'lucide-react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const DepartmentCommunityViz = ({ teamData, activityData, coordinationData, className = '' }) => {
  const { colors } = useColorPalette()
  const [activeTab, setActiveTab] = useState('overview')

  // Default data if not provided
  const defaultTeamData = teamData || {
    totalMembers: 25,
    activeMembers: 20,
    newMembers: 3,
    teamHealth: 85
  }

  const defaultActivityData = activityData || {
    meetingsHeld: 12,
    projectsCompleted: 8,
    volunteerHours: 150,
    memberParticipation: 75
  }

  const defaultCoordinationData = coordinationData || {
    responseRate: 90,
    taskCompletion: 85,
    communicationScore: 88,
    teamSatisfaction: 92
  }

  // Community/gathering metaphor for department team
  const renderTeamOverview = () => {
    const teamMetrics = [
      { label: 'Total Members', value: defaultTeamData.totalMembers, icon: Users, color: 'text-[var(--color-primary)]' },
      { label: 'Active Members', value: defaultTeamData.activeMembers, icon: CheckCircle, color: 'text-[var(--color-success)]' },
      { label: 'New Members', value: defaultTeamData.newMembers, icon: TrendingUp, color: 'text-[var(--color-secondary)]' },
      { label: 'Team Health', value: `${defaultTeamData.teamHealth}%`, icon: Award, color: 'text-[var(--color-accent)]' }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Department Team Overview</h4>
        
        {/* Community gathering visualization */}
        <div className="relative">
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="8"
                  strokeDasharray={`${(defaultTeamData.activeMembers / defaultTeamData.totalMembers) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[var(--color-text)]">
                  {Math.round((defaultTeamData.activeMembers / defaultTeamData.totalMembers) * 100)}%
                </span>
                <span className="text-xs text-[var(--color-textSecondary)]">Active Rate</span>
              </div>
            </div>
          </div>

          {/* Team metrics */}
          <div className="grid grid-cols-2 gap-3">
            {teamMetrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                  <div className={`p-2 rounded-lg ${metric.color} bg-opacity-10`}>
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-textSecondary)]">{metric.label}</div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{metric.value}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Activity and coordination display
  const renderActivity = () => {
    const activityMetrics = [
      { label: 'Meetings Held', value: defaultActivityData.meetingsHeld, icon: Calendar },
      { label: 'Projects Completed', value: defaultActivityData.projectsCompleted, icon: CheckCircle },
      { label: 'Volunteer Hours', value: defaultActivityData.volunteerHours, icon: Clock },
      { label: 'Member Participation', value: `${defaultActivityData.memberParticipation}%`, icon: TrendingUp }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Department Activity</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {activityMetrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <div key={index} className="flex items-center gap-3 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                <div className="p-2 rounded-lg bg-[var(--color-primary)]-10 text-[var(--color-primary)]">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs text-[var(--color-textSecondary)]">{metric.label}</div>
                  <div className="text-lg font-bold text-[var(--color-text)]">{metric.value}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Team coordination and communication
  const renderCoordination = () => {
    const coordinationMetrics = [
      { label: 'Response Rate', value: `${defaultCoordinationData.responseRate}%`, icon: MessageCircle },
      { label: 'Task Completion', value: `${defaultCoordinationData.taskCompletion}%`, icon: CheckCircle },
      { label: 'Communication Score', value: `${defaultCoordinationData.communicationScore}%`, icon: MessageCircle },
      { label: 'Team Satisfaction', value: `${defaultCoordinationData.teamSatisfaction}%`, icon: Award }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Team Coordination</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {coordinationMetrics.map((metric, index) => {
            const Icon = metric.icon
            const value = parseInt(metric.value)
            const isHigh = value >= 80
            const isMedium = value >= 60 && value < 80
            const color = isHigh ? 'text-[var(--color-success)]' : isMedium ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'
            const bgColor = isHigh ? 'bg-[var(--color-success)]-10' : isMedium ? 'bg-[var(--color-warning)]-10' : 'bg-[var(--color-error)]-10'
            
            return (
              <div key={index} className="flex items-center gap-3 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                <div className={`p-2 rounded-lg ${bgColor} ${color}`}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs text-[var(--color-textSecondary)]">{metric.label}</div>
                  <div className="text-lg font-bold text-[var(--color-text)]">{metric.value}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent team activity */}
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-[var(--color-text)]">Recent Team Activity</h5>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
              <div className="p-2 rounded-lg bg-[var(--color-success)]-10 text-[var(--color-success)]">
                <CheckCircle size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--color-text)]">Weekly meeting completed</div>
                <div className="text-xs text-[var(--color-textSecondary)]">2 days ago</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
              <div className="p-2 rounded-lg bg-[var(--color-primary)]-10 text-[var(--color-primary)]">
                <MessageCircle size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--color-text)]">New project announcement</div>
                <div className="text-xs text-[var(--color-textSecondary)]">5 days ago</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
              <div className="p-2 rounded-lg bg-[var(--color-secondary)]-10 text-[var(--color-secondary)]">
                <Users size={16} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--color-text)]">New team member joined</div>
                <div className="text-xs text-[var(--color-textSecondary)]">1 week ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Team Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'coordination', label: 'Coordination' }
  ]

  return (
    <div className={`department-community-viz ${className}`}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
            <Users className="text-[var(--color-primary)]" size={20} aria-hidden="true" />
            Department Community
          </h3>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                  : 'text-[var(--color-textSecondary)] border-transparent hover:text-[var(--color-text)]'
              }`}
              aria-label={`View ${tab.label}`}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[200px]">
          {activeTab === 'overview' && renderTeamOverview()}
          {activeTab === 'activity' && renderActivity()}
          {activeTab === 'coordination' && renderCoordination()}
        </div>
      </div>
    </div>
  )
}

export default DepartmentCommunityViz