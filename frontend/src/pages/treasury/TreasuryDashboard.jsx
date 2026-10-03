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
import { hasFinanceRole } from '../../constants/roles'

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

  const hasTreasuryAccess = hasFinanceRole(user?.roles)

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

      const [statsResponse, transactionsResponse, alertsResponse, approvalsResponse] = await Promise.all([
        api.get('/api/dashboard/financial-stats').catch(() => null),
        api.get('/api/dashboard/transactions?limit=5').catch(() => null),
        api.get('/api/treasury/dashboard/alert-summary').catch(() => null),
        api.get('/api/treasury/expenses?status=pending').catch(() => null)
      ]);

      if (statsResponse?.data?.data) {
        const data = statsResponse.data.data;
        setStats({
          totalIncome: data.totalIncome || 0,
          totalExpenses: data.totalExpenses || 0,
          netIncome: data.netIncome || 0,
          fundBalance: data.fundBalance || 0,
          pendingExpenses: data.pendingExpenses || 0,
          budgetVariance: data.budgetVariance || 0
        });
      }

      setRecentTransactions(transactionsResponse?.data?.data || []);
      setBudgetAlerts(alertsResponse?.data?.data?.alerts || []);
      setPendingApprovals(approvalsResponse?.data?.expenses || []);
    } catch (error) {
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
                    <div className="p-3 bg-[var(--color-success-light)] rounded-lg">
                      <TrendingUp className="h-6 w-6 text-[var(--color-success)]" />
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
                    <div className="p-3 bg-[var(--color-error-light)] rounded-lg">
                      <TrendingDown className="h-6 w-6 text-[var(--color-error)]" />
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
                    <div className="p-3 bg-[var(--color-primary-light)] rounded-lg">
                      <Wallet className="h-6 w-6 text-[var(--color-primary)]" />
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
                    <div className="p-3 bg-[var(--color-accent-light)] rounded-lg">
                      <DollarSign className="h-6 w-6 text-[var(--color-accent)]" />
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
                          <div className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-[var(--color-success-light)]' : 'bg-[var(--color-error-light)]'}`}>
                            {transaction.type === 'income' ? (
                              <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-[var(--color-error)]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--color-text)] ">{transaction.description}</p>
                            <p className="text-sm text-[var(--color-textSecondary)] ">{transaction.date}</p>
                          </div>
                        </div>
                        <p className={`font-semibold ${transaction.type === 'income' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
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
                    { title: 'Record Income', icon: TrendingUp, link: '/dashboard/treasury/receipts', color: 'bg-[var(--color-success-light)] text-[var(--color-success)]' },
                    { title: 'Record Expense', icon: TrendingDown, link: '/dashboard/treasury/expenses', color: 'bg-[var(--color-error-light)] text-[var(--color-error)]' },
                    { title: 'View History', icon: FileText, link: '/dashboard/treasury/journal-entries', color: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' }
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
                    { title: 'Create Budget', icon: Plus, link: '/dashboard/treasury/budgets', color: 'bg-[var(--color-success-light)] text-[var(--color-success)]' },
                    { title: 'View Budgets', icon: Wallet, link: '/dashboard/treasury/budgets', color: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' },
                    { title: 'Budget Reports', icon: BarChart3, link: '/dashboard/treasury/reports', color: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]' }
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
                    { title: 'My Collections', icon: Wallet, link: '/dashboard/collections', color: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' },
                    { title: 'Payment History', icon: FileText, link: '/dashboard/payments/history', color: 'bg-[var(--color-success-light)] text-[var(--color-success)]' },
                    { title: 'Payment Management', icon: DollarSign, link: '/dashboard/payments/management', color: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]' },
                    { title: 'Contribution Reports', icon: BarChart3, link: '/dashboard/treasury/contributions', color: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' }
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
                    { title: 'Income Statement', icon: FileText, link: '/dashboard/treasury/reports' },
                    { title: 'Balance Sheet', icon: BarChart3, link: '/dashboard/treasury/reports' },
                    { title: 'Budget Report', icon: Wallet, link: '/dashboard/treasury/reports' },
                    { title: 'Expense Report', icon: TrendingDown, link: '/dashboard/treasury/reports' }
                  ].map((report, index) => (
                    <Link
                      key={index}
                      to={report.link}
                      className="flex items-center gap-4 p-4 bg-[var(--color-background)]  rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className="p-3 bg-[var(--color-primary-light)] rounded-lg">
                        <report.icon className="h-6 w-6 text-[var(--color-primary)]" />
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
                    { title: 'Currency Settings', icon: DollarSign, link: '/dashboard/admin/settings', color: 'bg-[var(--color-success-light)] text-[var(--color-success)]' },
                    { title: 'Account Settings', icon: Wallet, link: '/dashboard/treasury/accounts', color: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' },
                    { title: 'Tax Settings', icon: FileText, link: '/dashboard/admin/settings', color: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]' },
                    { title: 'Approval Settings', icon: CheckCircle, link: '/dashboard/approvals', color: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' }
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
