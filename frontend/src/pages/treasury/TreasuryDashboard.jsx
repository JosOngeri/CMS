import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, BarChart3,
  FileText, ArrowRight, Calendar, Users, AlertCircle,
  CheckCircle, Clock, Plus, Download, RefreshCw, Settings
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading, InlineLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'
import Breadcrumb from '../../components/common/Breadcrumb'
import TabNavigation from '../../components/common/TabNavigation'
import PermissionButton from '../../components/common/PermissionButton'
import { PERMISSIONS } from '../../constants/permissions'

const TreasuryDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    fundBalance: 0,
    pendingExpenses: 0,
    budgetVariance: 0
  })
  const [recentTransactions, setRecentTransactions] = useState([])
  const [budgetAlerts, setBudgetAlerts] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])

  const hasTreasuryAccess = user?.roles?.some(role => 
    ['Super Admin', 'Pastor', 'First Elder', 'Treasurer'].includes(role)
  )

  useEffect(() => {
    if (hasTreasuryAccess) {
      fetchTreasuryData()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchTreasuryData = async () => {
    try {
      setLoading(true)
      
      // Use mock data for now since treasury stats endpoint doesn't exist
      setStats({
        totalIncome: 1500000,
        totalExpenses: 850000,
        netIncome: 650000,
        fundBalance: 2500000,
        pendingExpenses: 120000,
        budgetVariance: 50000
      })

      // Fetch recent transactions
      const transactionsResponse = await api.get('/treasury/journal-entries?limit=5')
      if (transactionsResponse.data) {
        setRecentTransactions(transactionsResponse.data.entries || [])
      }

      // Fetch budget alerts
      const alertsResponse = await api.get('/treasury/budgets/alerts')
      if (alertsResponse.data) {
        setBudgetAlerts(alertsResponse.data.alerts || [])
      }

      // Fetch pending approvals
      const approvalsResponse = await api.get('/treasury/expenses?status=pending')
      if (approvalsResponse.data) {
        setPendingApprovals(approvalsResponse.data.expenses || [])
      }
    } catch (error) {
      console.error('Failed to fetch treasury data:', error)
      toast.error('Failed to load treasury data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchTreasuryData()
    setRefreshing(false)
    toast.success('Dashboard refreshed')
  }

  const quickActions = [
    {
      title: 'Create Journal Entry',
      description: 'Record financial transactions',
      icon: Plus,
      color: 'bg-green-100 text-green-600',
      link: '/dashboard/payments/journal-entries'
    },
    {
      title: 'Submit Expense',
      description: 'Create expense request',
      icon: DollarSign,
      color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600',
      link: '/dashboard/payments/expenses'
    },
    {
      title: 'Manage Budgets',
      description: 'Budget tracking',
      icon: BarChart3,
      color: 'bg-orange-100 text-orange-600',
      link: '/dashboard/payments/budgets'
    }
  ]

  const treasuryTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'budgets', label: 'Budgets', icon: Wallet },
    { id: 'collections', label: 'Collections', icon: DollarSign },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-textSecondary)] ">Total Income</p>
                      <p className="text-2xl font-bold text-[var(--color-text)] ">
                        KES {stats.totalIncome.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-textSecondary)] ">Total Expenses</p>
                      <p className="text-2xl font-bold text-[var(--color-text)] ">
                        KES {stats.totalExpenses.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-textSecondary)] ">Net Income</p>
                      <p className="text-2xl font-bold text-[var(--color-text)] ">
                        KES {stats.netIncome.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--color-primary)]-100 rounded-lg">
                      <Wallet className="h-6 w-6 text-[var(--color-primary)]-600" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-textSecondary)] ">Fund Balance</p>
                      <p className="text-2xl font-bold text-[var(--color-text)] ">
                        KES {stats.fundBalance.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Recent Transactions</h3>
                {recentTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background)]  rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {transaction.type === 'income' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--color-text)] ">{transaction.description}</p>
                            <p className="text-sm text-[var(--color-textSecondary)] ">{transaction.date}</p>
                          </div>
                        </div>
                        <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'income' ? '+' : '-'}KES {transaction.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No transactions yet"
                    description="No transactions have been recorded."
                    size="small"
                  />
                )}
              </div>
            </Card>
          </div>
        )

      case 'transactions':
        return (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Transaction Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: 'Record Income', icon: TrendingUp, link: '/dashboard/treasury/income', color: 'bg-green-100 text-green-600' },
                    { title: 'Record Expense', icon: TrendingDown, link: '/dashboard/treasury/expenses', color: 'bg-red-100 text-red-600' },
                    { title: 'View History', icon: FileText, link: '/dashboard/treasury/history', color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600' }
                  ].map((action, index) => (
                    <Link
                      key={index}
                      to={action.link}
                      className="flex items-center gap-4 p-4 bg-[var(--color-background)]  rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className={`p-3 ${action.color} rounded-lg`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text)] ">{action.title}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[var(--color-textSecondary)]" />
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )

      case 'budgets':
        return (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Budget Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: 'Create Budget', icon: Plus, link: '/dashboard/treasury/budgets/create', color: 'bg-green-100 text-green-600' },
                    { title: 'View Budgets', icon: Wallet, link: '/dashboard/treasury/budgets', color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600' },
                    { title: 'Budget Reports', icon: BarChart3, link: '/dashboard/treasury/budgets/reports', color: 'bg-purple-100 text-purple-600' }
                  ].map((action, index) => (
                    <Link
                      key={index}
                      to={action.link}
                      className="flex items-center gap-4 p-4 bg-[var(--color-background)]  rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className={`p-3 ${action.color} rounded-lg`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text)] ">{action.title}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[var(--color-textSecondary)]" />
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )

      case 'collections':
        return (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Collections Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'My Collections', icon: Wallet, link: '/dashboard/collections', color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600' },
                    { title: 'Payment History', icon: FileText, link: '/dashboard/payment-history', color: 'bg-green-100 text-green-600' },
                    { title: 'Payment Management', icon: DollarSign, link: '/dashboard/payment-management', color: 'bg-purple-100 text-purple-600' },
                    { title: 'Contribution Reports', icon: BarChart3, link: '/dashboard/payments/contributions', color: 'bg-orange-100 text-orange-600' }
                  ].map((action, index) => (
                    <Link
                      key={index}
                      to={action.link}
                      className="flex items-center gap-4 p-4 bg-[var(--color-background)]  rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className={`p-3 ${action.color} rounded-lg`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text)] ">{action.title}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[var(--color-textSecondary)]" />
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )

      case 'reports':
        return (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Financial Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Income Statement', icon: FileText, link: '/dashboard/treasury/reports/income' },
                    { title: 'Balance Sheet', icon: BarChart3, link: '/dashboard/treasury/reports/balance' },
                    { title: 'Budget Report', icon: Wallet, link: '/dashboard/treasury/reports/budget' },
                    { title: 'Expense Report', icon: TrendingDown, link: '/dashboard/treasury/reports/expenses' }
                  ].map((report, index) => (
                    <Link
                      key={index}
                      to={report.link}
                      className="flex items-center gap-4 p-4 bg-[var(--color-background)]  rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className="p-3 bg-[var(--color-primary)]-100 rounded-lg">
                        <report.icon className="h-6 w-6 text-[var(--color-primary)]-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text)] ">{report.title}</p>
                        <p className="text-sm text-[var(--color-textSecondary)] ">View report</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[var(--color-textSecondary)]" />
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )

      case 'settings':
        return (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">Treasury Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Currency Settings', icon: DollarSign, link: '/settings/treasury/currency', color: 'bg-green-100 text-green-600' },
                    { title: 'Account Settings', icon: Wallet, link: '/settings/treasury/accounts', color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600' },
                    { title: 'Tax Settings', icon: FileText, link: '/settings/treasury/tax', color: 'bg-purple-100 text-purple-600' },
                    { title: 'Approval Settings', icon: CheckCircle, link: '/settings/treasury/approvals', color: 'bg-orange-100 text-orange-600' }
                  ].map((setting, index) => (
                    <Link
                      key={index}
                      to={setting.link}
                      className="flex items-center gap-4 p-4 bg-[var(--color-background)]  rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className={`p-3 ${setting.color} rounded-lg`}>
                        <setting.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text)] ">{setting.title}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[var(--color-textSecondary)]" />
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  if (!hasTreasuryAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <EmptyState
          icon={AlertCircle}
          title="Access Denied"
          description="You don't have permission to access the treasury dashboard."
        />
      </div>
    )
  }

  if (loading) {
    return <FullPageLoading message="Loading treasury dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] ">Treasury Dashboard</h1>
          <p className="text-sm text-[var(--color-textSecondary)] ">
            Financial overview and management
          </p>
        </div>
        <PermissionButton
          permission={PERMISSIONS.TREASURY_VIEW}
          buttonProps={{
            onClick: handleRefresh,
            disabled: refreshing,
            className: "flex items-center space-x-2 px-4 py-2 bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors",
          }}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </PermissionButton>
      </div>

      {/* Tab Navigation */}
      <TabNavigation 
        tabs={treasuryTabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        persistKey="treasury-dashboard-tab-v2"
      />

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  )
}

export default TreasuryDashboard
