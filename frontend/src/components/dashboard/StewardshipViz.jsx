import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, PieChart, Shield, CheckCircle, AlertTriangle, Target } from 'lucide-react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const StewardshipViz = ({ financialData, budgetData, growthData, className = '' }) => {
  const { colors } = useColorPalette()
  const [activeTab, setActiveTab] = useState('overview')

  // Default data if not provided
  const defaultFinancialData = financialData || {
    totalIncome: 150000,
    totalExpenses: 120000,
    netBalance: 30000,
    budgetUtilization: 80
  }

  const defaultBudgetData = budgetData || {
    totalBudget: 200000,
    spent: 160000,
    remaining: 40000,
    categories: [
      { name: 'Operations', spent: 80000, budget: 100000 },
      { name: 'Ministry', spent: 50000, budget: 60000 },
      { name: 'Outreach', spent: 30000, budget: 40000 }
    ]
  }

  const defaultGrowthData = growthData || {
    monthlyGrowth: 15,
    quarterlyGrowth: 22,
    yearlyGrowth: 18,
    memberContributions: 85
  }

  // Stewardship/growth metaphor for financial oversight
  const renderFinancialOverview = () => {
    const financialMetrics = [
      { label: 'Total Income', value: `KES ${defaultFinancialData.totalIncome.toLocaleString()}`, icon: DollarSign, color: 'text-[var(--color-success)]' },
      { label: 'Total Expenses', value: `KES ${defaultFinancialData.totalExpenses.toLocaleString()}`, icon: TrendingUp, color: 'text-[var(--color-warning)]' },
      { label: 'Net Balance', value: `KES ${defaultFinancialData.netBalance.toLocaleString()}`, icon: PieChart, color: 'text-[var(--color-primary)]' },
      { label: 'Budget Utilization', value: `${defaultFinancialData.budgetUtilization}%`, icon: Target, color: 'text-[var(--color-secondary)]' }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Financial Stewardship Overview</h4>
        
        {/* Growth visualization */}
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
                  stroke="var(--color-success)"
                  strokeWidth="8"
                  strokeDasharray={`${(defaultFinancialData.netBalance / defaultFinancialData.totalIncome) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[var(--color-text)]">
                  {Math.round((defaultFinancialData.netBalance / defaultFinancialData.totalIncome) * 100)}%
                </span>
                <span className="text-xs text-[var(--color-textSecondary)]">Growth Rate</span>
              </div>
            </div>
          </div>

          {/* Financial metrics */}
          <div className="grid grid-cols-2 gap-3">
            {financialMetrics.map((metric, index) => {
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

  // Budget tracking with trust indicators
  const renderBudgetTracking = () => {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Budget Tracking</h4>
        
        {/* Overall budget status */}
        <div className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--color-textSecondary)]">Total Budget</span>
            <span className="text-lg font-bold text-[var(--color-text)]">KES {defaultBudgetData.totalBudget.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--color-textSecondary)]">Spent</span>
            <span className="text-lg font-bold text-[var(--color-warning)]">KES {defaultBudgetData.spent.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-textSecondary)]">Remaining</span>
            <span className="text-lg font-bold text-[var(--color-success)]">KES {defaultBudgetData.remaining.toLocaleString()}</span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="space-y-3">
          {defaultBudgetData.categories.map((category, index) => {
            const percentage = (category.spent / category.budget) * 100
            const isOverBudget = percentage > 100
            const isNearBudget = percentage > 90 && percentage <= 100
            
            return (
              <div key={index} className="p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-text)]">{category.name}</span>
                  <div className="flex items-center gap-2">
                    {isOverBudget && <AlertTriangle size={14} className="text-[var(--color-error)]" aria-hidden="true" />}
                    {isNearBudget && <AlertTriangle size={14} className="text-[var(--color-warning)]" aria-hidden="true" />}
                    {!isOverBudget && !isNearBudget && <CheckCircle size={14} className="text-[var(--color-success)]" aria-hidden="true" />}
                    <span className="text-sm font-semibold text-[var(--color-text)]">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="w-full bg-[var(--color-border)] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isOverBudget ? 'bg-[var(--color-error)]' : isNearBudget ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-[var(--color-textSecondary)]">KES {category.spent.toLocaleString()}</span>
                  <span className="text-xs text-[var(--color-textSecondary)]">of KES {category.budget.toLocaleString()}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Trust indicators and transparency
  const renderTrustIndicators = () => {
    const trustMetrics = [
      { label: 'Monthly Growth', value: `+${defaultGrowthData.monthlyGrowth}%`, icon: TrendingUp, status: 'positive' },
      { label: 'Quarterly Growth', value: `+${defaultGrowthData.quarterlyGrowth}%`, icon: TrendingUp, status: 'positive' },
      { label: 'Yearly Growth', value: `+${defaultGrowthData.yearlyGrowth}%`, icon: TrendingUp, status: 'positive' },
      { label: 'Member Contributions', value: `${defaultGrowthData.memberContributions}%`, icon: Shield, status: 'positive' }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Trust & Transparency</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {trustMetrics.map((metric, index) => {
            const Icon = metric.icon
            const statusColor = metric.status === 'positive' ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'
            const bgColor = metric.status === 'positive' ? 'bg-[var(--color-success)]-10' : 'bg-[var(--color-warning)]-10'
            
            return (
              <div key={index} className="flex items-center gap-3 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                <div className={`p-2 rounded-lg ${bgColor} ${statusColor}`}>
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

        {/* Audit trail indicator */}
        <div className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary)]-10 text-[var(--color-primary)]">
              <Shield size={20} aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--color-text)]">Audit Trail</div>
              <div className="text-xs text-[var(--color-textSecondary)]">Last audit: 30 days ago</div>
            </div>
            <CheckCircle size={20} className="text-[var(--color-success)] ml-auto" aria-hidden="true" />
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Financial Overview' },
    { id: 'budget', label: 'Budget Tracking' },
    { id: 'trust', label: 'Trust & Transparency' }
  ]

  return (
    <div className={`stewardship-viz ${className}`}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
            <DollarSign className="text-[var(--color-primary)]" size={20} aria-hidden="true" />
            Financial Stewardship
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
          {activeTab === 'overview' && renderFinancialOverview()}
          {activeTab === 'budget' && renderBudgetTracking()}
          {activeTab === 'trust' && renderTrustIndicators()}
        </div>
      </div>
    </div>
  )
}

export default StewardshipViz