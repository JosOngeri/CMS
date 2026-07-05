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
import StatsCard from '../../components/common/StatsCard'
import QuickActionsPanel from '../../components/common/QuickActionsPanel'
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
    budgetUtilization: 72,
    collectionRate: 85,
    expenseRatio: 68
  })
  const [recentTransactions, setRecentTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

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
        budgetUtilization: 72,
        collectionRate: 85,
        expenseRatio: 68
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

  const quickActions = [
    {
      title: 'Process Payment',
      description: 'Record payment',
      icon: CreditCard,
      color: 'bg-green-100 text-green-600',
      link: '/payments/process',
      permission: 'payment.create',
      badge: stats.pendingPayments > 0 ? stats.pendingPayments : null
    },
    {
      title: 'Create Budget',
      description: 'Set budget limits',
      icon: PieChart,
      color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600',
      link: '/treasury/budgets/create',
      permission: 'budget.create'
    },
    {
      title: 'Generate Report',
      description: 'Financial reports',
      icon: FileText,
      color: 'bg-purple-100 text-purple-600',
      link: '/treasury/reports',
      permission: 'report.view'
    },
    {
      title: 'View Transactions',
      description: 'Transaction history',
      icon: BarChart,
      color: 'bg-orange-100 text-orange-600',
      link: '/treasury/transactions',
      permission: 'transaction.view'
    },
    {
      title: 'Budget Overview',
      description: 'Budget vs actual',
      icon: PieChart,
      color: 'bg-pink-100 text-pink-600',
      link: '/treasury/budgets',
      permission: 'budget.view'
    },
    {
      title: 'Collection Tracking',
      description: 'Member contributions',
      icon: Wallet,
      color: 'bg-[var(--color-surface)] text-[var(--color-textSecondary)]',
      link: '/treasury/collections',
      permission: 'collection.view'
    }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'budgets', label: 'Budgets' },
    { id: 'reports', label: 'Reports' }
  ]

  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Financial Health */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Treasurer Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.first_name}! Financial overview and treasury management.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Financial Health Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Financial Health: 75%</span>
          </div>
        </div>
      </div>

      {/* Financial Health Status */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <PieChart className="h-5 w-5 text-[var(--color-primary)]-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Budget Utilization</span>
              <span className="block text-sm font-medium text-[var(--color-primary)]-600">{financialHealth.budgetUtilization}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Collection Rate</span>
              <span className="block text-sm font-medium text-green-600">{financialHealth.collectionRate}%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BarChart className="h-5 w-5 text-purple-600" />
            <div>
              <span className="text-sm text-[var(--color-textSecondary)]">Expense Ratio</span>
              <span className="block text-sm font-medium text-purple-600">{financialHealth.expenseRatio}%</span>
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
              title="Total Balance"
              value={`KES ${stats.totalBalance.toLocaleString()}`}
              change="↑ 15% from last month"
              changeType="positive"
              icon={Wallet}
              iconColor="bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600"
              linkTo="/treasury/balance"
            />
            <StatsCard
              title="Pending Payments"
              value={stats.pendingPayments}
              change="Requires processing"
              changeType="neutral"
              icon={CreditCard}
              iconColor="bg-yellow-100 text-yellow-600"
              linkTo="/treasury/payments/pending"
            />
            <StatsCard
              title="Monthly Income"
              value={`KES ${stats.monthlyIncome.toLocaleString()}`}
              change="↑ 10% from last month"
              changeType="positive"
              icon={TrendingUp}
              iconColor="bg-green-100 text-green-600"
              linkTo="/treasury/income"
            />
            <StatsCard
              title="Monthly Expenses"
              value={`KES ${stats.monthlyExpenses.toLocaleString()}`}
              change="↓ 5% from last month"
              changeType="positive"
              icon={TrendingDown}
              iconColor="bg-purple-100 text-purple-600"
              linkTo="/treasury/expenses"
            />
          </div>

          {/* Quick Actions Grid */}
          <QuickActionsPanel 
            actions={quickActions}
            title="Quick Actions"
          />

          {/* Recent Transactions Feed */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
              <Link to="/treasury/transactions" className="text-sm text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${transaction.color} bg-opacity-10`}>
                      <transaction.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--color-text)]">{transaction.title}</p>
                      <p className="text-sm text-[var(--color-textSecondary)]">{transaction.description}</p>
                      <p className="text-xs text-[var(--color-textSecondary)] mt-1">{transaction.time}</p>
                    </div>
                    <span className={`text-sm font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 
                      transaction.type === 'expense' ? 'text-red-600' : 'text-[var(--color-textSecondary)]'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}KES {transaction.amount.toLocaleString()}
                    </span>
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
        </>
      )}

      {/* Other tabs would be implemented similarly */}
      {activeTab !== 'overview' && (
        <Card>
          <EmptyState
            icon={FileText}
            title={`${tabs.find(t => t.id === activeTab)?.label} Coming Soon`}
            description="This section is under development"
          />
        </Card>
      )}
    </div>
  )
}

export default TreasurerDashboard
