import { useState, useEffect } from 'react'
import {
  Users, DollarSign, Calendar, Megaphone, TrendingUp,
  Clock, CheckCircle, AlertCircle, ArrowRight, Building, Wallet,
  FileText, PieChart, BarChart, TrendingDown, CreditCard
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useColorPalette } from '../../contexts/ColorPaletteContext'
import Card from '../../components/common/Card'
import ChurchStatsCard from '../../components/dashboard/ChurchStatsCard'
import ChurchQuickActions from '../../components/dashboard/ChurchQuickActions'
import StewardshipViz from '../../components/dashboard/StewardshipViz'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const TreasurerDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const { colors } = useColorPalette()
  const [stats, setStats] = useState({
    totalBalance: 0,
    pendingPayments: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0
  })
  const [financialHealth, setFinancialHealth] = useState({
    budgetUtilization: 0,
    collectionRate: 0,
    expenseRatio: 0
  })
  const [recentTransactions, setRecentTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch financial stats
      const statsResponse = await api.get('/api/dashboard/financial-stats')
      setStats(statsResponse.data.data || {
        totalBalance: 0,
        pendingPayments: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0
      })

      // Fetch financial health metrics
      const healthResponse = await api.get('/api/dashboard/financial-health')
      setFinancialHealth(healthResponse.data.data || {
        budgetUtilization: 0,
        collectionRate: 0,
        expenseRatio: 0
      })

      // Fetch recent transactions
      const transactionResponse = await api.get('/api/dashboard/transactions?limit=10')
      const iconMap = {
        income: TrendingUp,
        expense: TrendingDown,
        payment: CreditCard,
        refund: Wallet
      }
      const colorMap = {
        income: colors.success,
        expense: colors.error,
        payment: colors.primary,
        refund: colors.warning
      }

      const formattedTransactions = (transactionResponse.data.data || []).map((transaction, index) => ({
        id: index,
        type: transaction.type,
        title: transaction.title,
        description: transaction.description,
        amount: transaction.amount,
        time: transaction.time,
        icon: iconMap[transaction.type] || DollarSign,
        color: colorMap[transaction.type] || colors.textSecondary
      }))

      setRecentTransactions(formattedTransactions)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Financial Health */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Treasurer Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.first_name}! Financial oversight and stewardship tools.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Financial Health Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-success-light)] text-[var(--color-success)] rounded-lg">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-medium">Financial Health: {Math.round((financialHealth.budgetUtilization + financialHealth.collectionRate + financialHealth.expenseRatio) / 3)}%</span>
          </div>
        </div>
      </div>

      {/* Stewardship Visualization - Signature Element */}
      <StewardshipViz
        financialData={{
          totalIncome: stats.monthlyIncome,
          totalExpenses: stats.monthlyExpenses,
          netBalance: stats.totalBalance,
          budgetUtilization: financialHealth.budgetUtilization
        }}
        budgetData={{
          totalBudget: stats.monthlyIncome + stats.totalBalance,
          spent: stats.monthlyExpenses,
          remaining: stats.totalBalance,
          categories: []
        }}
        growthData={{
          monthlyGrowth: 0,
          quarterlyGrowth: 0,
          yearlyGrowth: 0,
          memberContributions: financialHealth.collectionRate
        }}
      />

      {/* Stats Grid with Church-Focused Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ChurchStatsCard
          title="Total Balance"
          value={`KES ${stats.totalBalance.toLocaleString()}`}
          change="Current balance"
          changeType="positive"
          icon={Wallet}
          statType="financial"
          linkTo="/dashboard/treasury"
        />
        <ChurchStatsCard
          title="Pending Payments"
          value={stats.pendingPayments}
          change="Awaiting processing"
          changeType="neutral"
          icon={Clock}
          statType="default"
          linkTo="/dashboard/treasury/reconciliations"
        />
        <ChurchStatsCard
          title="Monthly Income"
          value={`KES ${stats.monthlyIncome.toLocaleString()}`}
          change="This month"
          changeType="positive"
          icon={TrendingUp}
          statType="financial"
          linkTo="/dashboard/treasury/reports"
        />
        <ChurchStatsCard
          title="Monthly Expenses"
          value={`KES ${stats.monthlyExpenses.toLocaleString()}`}
          change="This month"
          changeType="neutral"
          icon={TrendingDown}
          statType="financial"
          linkTo="/dashboard/treasury/expenses"
        />
      </div>

      {/* Church-Focused Quick Actions */}
      <ChurchQuickActions />

      {/* Recent Financial Activity Feed */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Recent Financial Activity</h2>
          <Link to="/dashboard/treasury/journal-entries" className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]">
            View all
          </Link>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                <div className={`p-2 rounded-lg ${transaction.color} bg-opacity-10`}>
                  <transaction.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--color-text)]">{transaction.title}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">{transaction.description}</p>
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">KES {Number(transaction.amount || 0).toLocaleString()} • {transaction.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Wallet}
            title="No recent transactions"
            description="Financial transactions will appear here"
          />
        )}
      </Card>
    </div>
  )
}

export default TreasurerDashboard