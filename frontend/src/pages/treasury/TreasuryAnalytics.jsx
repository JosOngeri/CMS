import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  BarChart3, TrendingUp, TrendingDown, PieChart, Wallet,
  RefreshCw, Calendar, Filter, ChevronDown, DollarSign
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'

const TreasuryAnalytics = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), 0, 1)
    setDateFrom(firstDay.toISOString().split('T')[0])
    setDateTo(today.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchAnalytics()
    }
  }, [dateFrom, dateTo])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/analytics', {
        params: { date_from: dateFrom, date_to: dateTo }
      })
      if (response.data) {
        setAnalytics(response.data.analytics || response.data.data || response.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading analytics..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Treasury Analytics</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Financial insights and trends
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-[var(--color-success-light)] rounded-lg">
                <TrendingUp className="h-6 w-6 text-[var(--color-success)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Total Income</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  KES {analytics?.total_income?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-[var(--color-error-light)] rounded-lg">
                <TrendingDown className="h-6 w-6 text-[var(--color-error)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Total Expenses</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  KES {analytics?.total_expenses?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-[var(--color-primary-light)] rounded-lg">
                <Wallet className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Net Income</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  KES {analytics?.net_income?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-[var(--color-accent-light)] rounded-lg">
                <BarChart3 className="h-6 w-6 text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Transactions</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  {analytics?.total_transactions || 0}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Income vs Expenses Chart */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Income vs Expenses</h2>
          {(() => {
            // pg returns numerics as strings — parseFloat before math.
            // Both bars normalize against the larger amount so expenses > income
            // can't overflow past 100% and income isn't hardcoded full-width.
            const totalIncome = parseFloat(analytics?.total_income) || 0
            const totalExpenses = parseFloat(analytics?.total_expenses) || 0
            const maxAmount = Math.max(totalIncome, totalExpenses)
            const pct = (v) => (maxAmount > 0 ? `${((v / maxAmount) * 100).toFixed(0)}%` : '0%')
            return (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[var(--color-textSecondary)]">Income</span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      KES {totalIncome.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-surface)] rounded-full h-4">
                    <div
                      className="bg-[var(--color-success)] h-4 rounded-full transition-all"
                      style={{ width: pct(totalIncome) }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[var(--color-textSecondary)]">Expenses</span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      KES {totalExpenses.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-surface)] rounded-full h-4">
                    <div
                      className="bg-[var(--color-error)] h-4 rounded-full transition-all"
                      style={{ width: pct(totalExpenses) }}
                    />
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </Card>

      {/* Fund Distribution */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Fund Distribution</h2>
          {analytics?.fund_distribution && analytics.fund_distribution.length > 0 ? (
            <div className="space-y-3">
              {analytics.fund_distribution.map((fund, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[var(--color-text)]">{fund.fund_name}</span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      KES {parseFloat(fund?.balance ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-surface)] rounded-full h-3">
                    <div
                      className="bg-[var(--color-accent)] h-3 rounded-full transition-all"
                      style={{ width: `${fund.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[var(--color-textSecondary)] py-8">
              No fund data available
            </div>
          )}
        </div>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Monthly Trends</h2>
          {analytics?.monthly_trends && analytics.monthly_trends.length > 0 ? (
            <div className="space-y-3">
              {analytics.monthly_trends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[color-mix(in_srgb,var(--color-background)_50%,transparent)] rounded-lg">
                  <span className="text-sm text-[var(--color-text)]">{trend.month}</span>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs text-[var(--color-textSecondary)]">Income</p>
                      <p className="text-sm font-semibold text-[var(--color-success)]">
                        KES {parseFloat(trend?.income ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--color-textSecondary)]">Expenses</p>
                      <p className="text-sm font-semibold text-[var(--color-error)]">
                        KES {parseFloat(trend?.expenses ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--color-textSecondary)]">Net</p>
                      <p className={`text-sm font-semibold ${trend.net >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                        KES {parseFloat(trend?.net ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[var(--color-textSecondary)] py-8">
              No trend data available
            </div>
          )}
        </div>
      </Card>

      {/* Top Expense Categories */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Top Expense Categories</h2>
          {analytics?.expense_categories && analytics.expense_categories.length > 0 ? (
            <div className="space-y-3">
              {analytics.expense_categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[color-mix(in_srgb,var(--color-background)_50%,transparent)] rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[var(--color-warning-light)] rounded-lg">
                      <DollarSign className="h-4 w-4 text-[var(--color-warning)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text)]">{category.category}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      KES {parseFloat(category?.amount ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-[var(--color-textSecondary)]">{category.percentage}% of total</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[var(--color-textSecondary)] py-8">
              No expense data available
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default TreasuryAnalytics
