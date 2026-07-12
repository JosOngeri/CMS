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

  // Tab-specific data states
  const [transactionsData, setTransactionsData] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsError, setTransactionsError] = useState(null)

  const [budgetsData, setBudgetsData] = useState([])
  const [budgetsLoading, setBudgetsLoading] = useState(false)
  const [budgetsError, setBudgetsError] = useState(null)

  const [reportsData, setReportsData] = useState({
    summary: {},
    income: [],
    expenses: []
  })
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState(null)

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

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions()
    } else if (activeTab === 'budgets') {
      fetchBudgets()
    } else if (activeTab === 'reports') {
      fetchReports()
    }
  }, [activeTab])

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true)
      setTransactionsError(null)
      const response = await api.get('/api/treasury/transactions')
      setTransactionsData(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      setTransactionsError(error.message || 'Failed to load transactions')
      toast.error('Failed to load transactions')
    } finally {
      setTransactionsLoading(false)
    }
  }

  const fetchBudgets = async () => {
    try {
      setBudgetsLoading(true)
      setBudgetsError(null)
      const response = await api.get('/api/treasury/budgets')
      setBudgetsData(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch budgets:', error)
      setBudgetsError(error.message || 'Failed to load budgets')
      toast.error('Failed to load budgets')
    } finally {
      setBudgetsLoading(false)
    }
  }

  const fetchReports = async () => {
    try {
      setReportsLoading(true)
      setReportsError(null)
      const response = await api.get('/api/treasury/summary')
      setReportsData(response.data.data || {
        summary: {},
        income: [],
        expenses: []
      })
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      setReportsError(error.message || 'Failed to load reports')
      toast.error('Failed to load reports')
    } finally {
      setReportsLoading(false)
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
            <span className="text-sm font-medium">Financial Health: {Math.round((financialHealth.budgetUtilization + financialHealth.collectionRate) / 2)}%</span>
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

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">All Transactions</h2>
            <div className="flex gap-2">
              <select className="px-3 py-1 border border-[var(--color-border)] rounded-lg text-sm">
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expenses</option>
                <option value="payment">Payments</option>
              </select>
              <Link to="/treasury/transactions" className="text-sm text-primary-600 hover:text-primary-700">
                View All
              </Link>
            </div>
          </div>
          {transactionsLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading transactions...</div>
          ) : transactionsError ? (
            <div className="text-center py-8 text-red-600">{transactionsError}</div>
          ) : transactionsData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Category</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-textSecondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsData.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]">
                      <td className="py-3 px-4 text-sm text-[var(--color-text)]">{transaction.date || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text)]">{transaction.description || 'No description'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'income' ? 'bg-green-100 text-green-700' :
                          transaction.type === 'expense' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {transaction.type || 'payment'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text)]">{transaction.category || 'General'}</td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        transaction.type === 'income' ? 'text-green-600' :
                        transaction.type === 'expense' ? 'text-red-600' :
                        'text-[var(--color-text)]'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}KES {transaction.amount?.toLocaleString() || 0}
                      </td>
                      <td className="py-3 px-4">
                        <Link to={`/treasury/transactions/${transaction.id}`} className="text-sm text-primary-600 hover:text-primary-700">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={BarChart}
              title="No transactions found"
              description="Financial transactions will appear here"
            />
          )}
        </Card>
      )}

      {/* Budgets Tab */}
      {activeTab === 'budgets' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Budget Management</h2>
            <Link to="/treasury/budgets/create" className="text-sm text-primary-600 hover:text-primary-700">
              Create Budget
            </Link>
          </div>
          {budgetsLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading budgets...</div>
          ) : budgetsError ? (
            <div className="text-center py-8 text-red-600">{budgetsError}</div>
          ) : budgetsData.length > 0 ? (
            <div className="space-y-4">
              {budgetsData.map((budget) => (
                <div key={budget.id} className="border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-[var(--color-text)]">{budget.category || 'Budget Category'}</h3>
                      <p className="text-sm text-[var(--color-textSecondary)]">{budget.description || 'No description'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        budget.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {budget.status || 'active'}
                      </span>
                      <Link to={`/treasury/budgets/${budget.id}`} className="text-sm text-primary-600 hover:text-primary-700">
                        Edit
                      </Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
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
                      <p className={`font-medium ${budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        KES {(budget.allocated - budget.spent)?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          ((budget.spent || 0) / (budget.allocated || 1)) > 0.9 ? 'bg-red-600' :
                          ((budget.spent || 0) / (budget.allocated || 1)) > 0.7 ? 'bg-yellow-600' :
                          'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(((budget.spent || 0) / (budget.allocated || 1)) * 100, 100)}%` }}
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
              icon={PieChart}
              title="No budgets found"
              description="Create budgets to track department spending"
            />
          )}
        </Card>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Financial Reports</h2>
            <Link to="/treasury/reports" className="text-sm text-primary-600 hover:text-primary-700">
              Generate Reports
            </Link>
          </div>
          {reportsLoading ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)]">Loading reports...</div>
          ) : reportsError ? (
            <div className="text-center py-8 text-red-600">{reportsError}</div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-[var(--color-textSecondary)]">Total Income</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">KES {reportsData.summary?.total_income?.toLocaleString() || stats.monthlyIncome.toLocaleString()}</p>
                </div>
                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-[var(--color-textSecondary)]">Total Expenses</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">KES {reportsData.summary?.total_expenses?.toLocaleString() || stats.monthlyExpenses.toLocaleString()}</p>
                </div>
                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-[var(--color-primary)]-600" />
                    <span className="text-sm text-[var(--color-textSecondary)]">Net Balance</span>
                  </div>
                  <p className="text-2xl font-bold text-[var(--color-primary)]-600">KES {stats.totalBalance.toLocaleString()}</p>
                </div>
              </div>

              {/* Income Breakdown */}
              <div>
                <h3 className="text-md font-semibold mb-3">Income Breakdown</h3>
                {reportsData.income && reportsData.income.length > 0 ? (
                  <div className="space-y-2">
                    {reportsData.income.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text)]">{item.category || 'Income'}</p>
                            <p className="text-xs text-[var(--color-textSecondary)]">{item.description || 'No description'}</p>
                          </div>
                        </div>
                        <span className="font-medium text-green-600">KES {item.amount?.toLocaleString() || 0}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-textSecondary)]">No income data available</p>
                )}
              </div>

              {/* Expense Breakdown */}
              <div>
                <h3 className="text-md font-semibold mb-3">Expense Breakdown</h3>
                {reportsData.expenses && reportsData.expenses.length > 0 ? (
                  <div className="space-y-2">
                    {reportsData.expenses.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text)]">{item.category || 'Expense'}</p>
                            <p className="text-xs text-[var(--color-textSecondary)]">{item.description || 'No description'}</p>
                          </div>
                        </div>
                        <span className="font-medium text-red-600">KES {item.amount?.toLocaleString() || 0}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-textSecondary)]">No expense data available</p>
                )}
              </div>

              {/* Quick Report Actions */}
              <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
                <button className="flex-1 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg text-sm hover:bg-[var(--color-primary)]-700 transition-colors">
                  Download Monthly Report
                </button>
                <button className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-[var(--color-surface)] transition-colors">
                  Export to Excel
                </button>
                <button className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-[var(--color-surface)] transition-colors">
                  Print Report
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default TreasurerDashboard
