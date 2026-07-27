import { useState, useEffect } from 'react'
import { Users, Heart, TrendingUp, Building, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const MinistryHealthViz = ({ ministryData, congregationData, engagementData, className = '' }) => {
  const { colors } = useColorPalette()
  const [activeTab, setActiveTab] = useState('overview')

  // Default data if not provided
  const defaultMinistryData = ministryData || {
    totalMembers: 150,
    activeMembers: 120,
    newMembers: 15,
    memberRetention: 85
  }

  const defaultCongregationData = congregationData || {
    averageAttendance: 95,
    volunteerParticipation: 70,
    smallGroupParticipation: 60,
    ministryGrowth: 12
  }

  const defaultEngagementData = engagementData || {
    prayerRequests: 45,
    communityService: 30,
    eventParticipation: 80,
    spiritualGrowth: 75
  }

  // Flock/shepherd metaphor for congregation oversight
  const renderMinistryOverview = () => {
    const healthMetrics = [
      { label: 'Total Members', value: defaultMinistryData.totalMembers, icon: Users, color: 'text-[var(--color-primary)]' },
      { label: 'Active Members', value: defaultMinistryData.activeMembers, icon: Heart, color: 'text-[var(--color-secondary)]' },
      { label: 'New Members', value: defaultMinistryData.newMembers, icon: TrendingUp, color: 'text-[var(--color-success)]' },
      { label: 'Retention Rate', value: `${defaultMinistryData.memberRetention}%`, icon: CheckCircle, color: 'text-[var(--color-accent)]' }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Ministry Health Overview</h4>
        
        {/* Flock visualization */}
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
                  strokeDasharray={`${(defaultMinistryData.activeMembers / defaultMinistryData.totalMembers) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[var(--color-text)]">
                  {Math.round((defaultMinistryData.activeMembers / defaultMinistryData.totalMembers) * 100)}%
                </span>
                <span className="text-xs text-[var(--color-textSecondary)]">Active Rate</span>
              </div>
            </div>
          </div>

          {/* Health metrics */}
          <div className="grid grid-cols-2 gap-3">
            {healthMetrics.map((metric, index) => {
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

  // Congregation engagement display
  const renderCongregation = () => {
    const congregationMetrics = [
      { label: 'Average Attendance', value: `${defaultCongregationData.averageAttendance}%`, icon: Users },
      { label: 'Volunteer Participation', value: `${defaultCongregationData.volunteerParticipation}%`, icon: Heart },
      { label: 'Small Group Participation', value: `${defaultCongregationData.smallGroupParticipation}%`, icon: Building },
      { label: 'Ministry Growth', value: `+${defaultCongregationData.ministryGrowth}%`, icon: TrendingUp }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Congregation Engagement</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {congregationMetrics.map((metric, index) => {
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

  // Department oversight
  const renderDepartments = () => {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Department Health</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--color-success)]-10 text-[var(--color-success)]">
                <CheckCircle size={16} aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--color-text)]">Worship Ministry</div>
                <div className="text-xs text-[var(--color-textSecondary)]">15 volunteers</div>
              </div>
            </div>
            <span className="text-sm font-semibold text-[var(--color-success)]">Active</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--color-warning)]-10 text-[var(--color-warning)]">
                <AlertCircle size={16} aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--color-text)]">Youth Ministry</div>
                <div className="text-xs text-[var(--color-textSecondary)]">8 volunteers</div>
              </div>
            </div>
            <span className="text-sm font-semibold text-[var(--color-warning)]">Needs Support</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--color-success)]-10 text-[var(--color-success)]">
                <CheckCircle size={16} aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--color-text)]">Outreach Ministry</div>
                <div className="text-xs text-[var(--color-textSecondary)]">12 volunteers</div>
              </div>
            </div>
            <span className="text-sm font-semibold text-[var(--color-success)]">Active</span>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Ministry Health' },
    { id: 'congregation', label: 'Congregation' },
    { id: 'departments', label: 'Departments' }
  ]

  return (
    <div className={`ministry-health-viz ${className}`}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
            <Heart className="text-[var(--color-primary)]" size={20} aria-hidden="true" />
            Ministry Health
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
          {activeTab === 'overview' && renderMinistryOverview()}
          {activeTab === 'congregation' && renderCongregation()}
          {activeTab === 'departments' && renderDepartments()}
        </div>
      </div>
    </div>
  )
}

export default MinistryHealthViz