/**
 * WHAT THIS FILE DOES
 * -------------------
 * Home screen for the Treasurer. It answers: how much money does the church
 * have, what came in and went out this month, and what still needs to be
 * matched or approved.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /api/dashboard/financial-stats   → balances & monthly totals
 * - backend /api/dashboard/financial-health  → budget/collection metrics
 * - backend /api/dashboard/transactions      → recent money activity
 * - components/common/Card.jsx
 * - components/dashboard/ChurchStatsCard.jsx
 * - components/dashboard/ChurchQuickActions.jsx
 */

import { useState, useEffect } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Clock, Wallet, ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import ChurchStatsCard from '../../components/dashboard/ChurchStatsCard'
import ChurchQuickActions from '../../components/dashboard/ChurchQuickActions'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'
import { fmtKES } from '../../utils/format'

const TreasurerDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()

  const [stats, setStats] = useState({
    totalBalance: 0,
    pendingPayments: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
  })
  const [health, setHealth] = useState({
    budgetUtilization: 0,
    collectionRate: 0,
    expenseRatio: 0,
  })
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const [statsRes, healthRes, txRes] = await Promise.all([
        api.get('/api/dashboard/financial-stats'),
        api.get('/api/dashboard/financial-health'),
        api.get('/api/dashboard/transactions?limit=10'),
      ])

      const s = statsRes.data.data || {}
      setStats({
        totalBalance: s.totalBalance ?? 0,
        pendingPayments: s.pendingPayments ?? 0,
        monthlyIncome: s.monthlyIncome ?? 0,
        monthlyExpenses: s.monthlyExpenses ?? 0,
      })

      const h = healthRes.data.data || {}
      setHealth({
        budgetUtilization: parseFloat(h.budgetUtilization) || 0,
        collectionRate: parseFloat(h.collectionRate) || 0,
        expenseRatio: parseFloat(h.expenseRatio) || 0,
      })

      const iconMap = {
        income: TrendingUp,
        expense: TrendingDown,
        payment: CreditCard,
        refund: Wallet,
      }
      const colorClassMap = {
        income: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
        expense: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
        payment: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
        refund: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
      }

      setTransactions(
        (txRes.data.data || []).map((t, i) => ({
          id: i,
          type: t.type,
          title: t.title,
          description: t.description,
          amount: t.amount,
          time: t.time,
          icon: iconMap[t.type] || DollarSign,
          colorClass: colorClassMap[t.type] || 'bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)]',
        }))
      )
    } catch (error) {
      console.error('Failed to load treasurer dashboard:', error)
      toast.error('Could not load financial data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <FullPageLoading message="Loading church finances..." />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Church Finances</h1>
          <p className="page-subtitle">
            Welcome back, {user?.first_name}! Here is the money picture for this month.
          </p>
        </div>
      </div>

      {/* Money totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Each card deep-links to the page that lists the rows behind the
            number — Payment Management honours ?status= / ?period= params. */}
        <ChurchStatsCard
          title="Total Balance"
          value={fmtKES(stats.totalBalance)}
          change="All accounts combined"
          changeType="neutral"
          icon={Wallet}
          statType="financial"
          linkTo="/dashboard/treasury"
        />
        <ChurchStatsCard
          title="Pending Payments"
          value={stats.pendingPayments}
          change="Awaiting confirmation"
          changeType={stats.pendingPayments > 0 ? 'negative' : 'positive'}
          icon={Clock}
          statType="default"
          linkTo="/dashboard/payments/management?status=pending"
        />
        <ChurchStatsCard
          title="Monthly Income"
          value={fmtKES(stats.monthlyIncome)}
          change="Payments received"
          changeType="positive"
          icon={TrendingUp}
          statType="financial"
          linkTo="/dashboard/payments/management?status=completed&period=month"
        />
        <ChurchStatsCard
          title="Monthly Expenses"
          value={fmtKES(stats.monthlyExpenses)}
          change="Money spent"
          changeType="neutral"
          icon={TrendingDown}
          statType="financial"
          linkTo="/dashboard/treasury/expenses"
        />
      </div>

      {/* Finance health */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Finance Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-textSecondary)]">Budget used</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{Math.round(health.budgetUtilization)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-textSecondary)]">Collections matched</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{Math.round(health.collectionRate)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-textSecondary)]">Expense ratio</p>
            <p className="text-2xl font-bold text-[var(--color-text)]">{Math.round(health.expenseRatio)}%</p>
          </div>
        </div>
      </Card>

      <ChurchQuickActions />

      {/* Recent money activity */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Recent Transactions</h2>
          <Link to="/dashboard/payments/management" className="text-sm text-[var(--color-primary)] flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {transactions.length ? (
          <div className="space-y-3">
            {transactions.map((t) => {
              const Icon = t.icon
              return (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                  <div className={`p-2 rounded-lg ${t.colorClass}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)]">{t.title}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">{t.description}</p>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">{fmtKES(t.amount)} · {t.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState icon={Wallet} title="No recent transactions" description="Money activity will appear here." />
        )}
      </Card>
    </div>
  )
}

export default TreasurerDashboard
