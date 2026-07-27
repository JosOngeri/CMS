import { useState, useEffect } from 'react'
import { TrendingUp, Heart, Users, Calendar, Award, Target } from 'lucide-react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const PersonalGrowthViz = ({ growthData, engagementData, journeyData, className = '' }) => {
  const { colors } = useColorPalette()
  const [activeTab, setActiveTab] = useState('overview')

  // Default data if not provided
  const defaultGrowthData = growthData || {
    attendanceRate: 85,
    contributionRate: 78,
    activityLevel: 82,
    spiritualGrowth: 75
  }

  const defaultEngagementData = engagementData || {
    departmentsInvolved: 3,
    eventsAttended: 12,
    communityService: 5,
    prayerRequests: 8
  }

  const defaultJourneyData = journeyData || {
    memberSince: '2023-01-15',
    milestones: [
      { date: '2023-02-01', title: 'First Service', type: 'milestone' },
      { date: '2023-06-15', title: 'Baptism', type: 'milestone' },
      { date: '2024-01-20', title: 'Department Leadership', type: 'achievement' }
    ]
  }

  // Growth path visualization - spiritual journey metaphor
  const renderGrowthPath = () => {
    const growthMetrics = [
      { label: 'Attendance', value: defaultGrowthData.attendanceRate, icon: Users, color: 'text-[var(--color-primary)]' },
      { label: 'Contributions', value: defaultGrowthData.contributionRate, icon: Heart, color: 'text-[var(--color-success)]' },
      { label: 'Activity', value: defaultGrowthData.activityLevel, icon: Target, color: 'text-[var(--color-accent)]' },
      { label: 'Spiritual Growth', value: defaultGrowthData.spiritualGrowth, icon: Award, color: 'text-[var(--color-secondary)]' }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Spiritual Journey Progress</h4>
        
        {/* Growth path visualization */}
        <div className="relative">
          {/* Main growth indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32">
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
                  strokeDasharray={`${(defaultGrowthData.attendanceRate / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[var(--color-text)]">
                  {Math.round((defaultGrowthData.attendanceRate + defaultGrowthData.contributionRate + defaultGrowthData.activityLevel + defaultGrowthData.spiritualGrowth) / 4)}%
                </span>
                <span className="text-xs text-[var(--color-textSecondary)]">Growth Score</span>
              </div>
            </div>
          </div>

          {/* Growth metrics */}
          <div className="grid grid-cols-2 gap-3">
            {growthMetrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                  <div className={`p-2 rounded-lg ${metric.color} bg-opacity-10`}>
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-textSecondary)]">{metric.label}</div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{metric.value}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Engagement metrics display
  const renderEngagement = () => {
    const engagementMetrics = [
      { label: 'Departments', value: defaultEngagementData.departmentsInvolved, icon: Users },
      { label: 'Events', value: defaultEngagementData.eventsAttended, icon: Calendar },
      { label: 'Service Hours', value: defaultEngagementData.communityService, icon: Heart },
      { label: 'Prayer Requests', value: defaultEngagementData.prayerRequests, icon: Target }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Community Engagement</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {engagementMetrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <div key={index} className="flex items-center gap-3 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                <div className="p-2 rounded-lg bg-[var(--color-accent)]-10 text-[var(--color-accent)]">
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

  // Journey timeline
  const renderJourney = () => {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Spiritual Journey Timeline</h4>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--color-border)]"></div>
          
          {/* Timeline items */}
          <div className="space-y-4">
            {defaultJourneyData.milestones.map((milestone, index) => (
              <div key={index} className="relative flex items-start gap-4 pl-2">
                {/* Timeline dot */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                  milestone.type === 'milestone' 
                    ? 'bg-[var(--color-primary)] text-white' 
                    : 'bg-[var(--color-success)] text-white'
                }`}>
                  {index + 1}
                </div>
                
                {/* Timeline content */}
                <div className="flex-1 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{milestone.title}</div>
                  <div className="text-xs text-[var(--color-textSecondary)]">{milestone.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Growth Path' },
    { id: 'engagement', label: 'Engagement' },
    { id: 'journey', label: 'Timeline' }
  ]

  return (
    <div className={`personal-growth-viz ${className}`}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
            <TrendingUp className="text-[var(--color-primary)]" size={20} aria-hidden="true" />
            Personal Growth
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
          {activeTab === 'overview' && renderGrowthPath()}
          {activeTab === 'engagement' && renderEngagement()}
          {activeTab === 'journey' && renderJourney()}
        </div>
      </div>
    </div>
  )
}

export default PersonalGrowthViz