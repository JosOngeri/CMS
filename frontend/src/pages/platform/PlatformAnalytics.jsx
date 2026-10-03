import { useState, useEffect } from 'react'
import { BarChart3, DollarSign, TrendingUp, Users, Building, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import StatsCard from '../../components/common/StatsCard'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'
import { fmtKES } from '../../utils/format'

const PlatformAnalytics = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/platform/stats')
        setStats(response.data.data)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
        toast.error('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [api, toast])

  if (loading) return <FullPageLoading message="Loading revenue analytics..." />
  if (!stats) return <EmptyState icon={BarChart3} title="No analytics data" description="Platform statistics are unavailable." />

  const tierBreakdown = stats.tierBreakdown || []
  const maxMrr = Math.max(...tierBreakdown.map(t => t.mrr), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Revenue Analytics</h1>
        <p className="text-[var(--color-textSecondary)]">Subscription revenue estimated from each church tier and the configured tier prices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Monthly Revenue (MRR)"
          value={fmtKES(stats.totalMRR)}
          icon={DollarSign}
          iconColor="bg-[var(--color-success-light)] text-[var(--color-success)]"
          subtitle={`${fmtKES(stats.arpc)} avg per church`}
        />
        <StatsCard
          title="Paying Churches"
          value={stats.activeChurches}
          icon={Building}
          iconColor="bg-[var(--color-primary-light)] text-[var(--color-primary)]"
          subtitle={`${stats.totalChurches} total, ${stats.suspendedChurches || 0} suspended`}
        />
        <StatsCard
          title="New This Month"
          value={stats.newChurchesThisMonth}
          icon={TrendingUp}
          iconColor="bg-[var(--color-accent-light)] text-[var(--color-accent)]"
          subtitle="churches onboarded"
        />
        <StatsCard
          title="Churn Rate"
          value={`${(stats.churnRate || 0).toFixed(1)}%`}
          icon={AlertCircle}
          iconColor="bg-[var(--color-error-light)] text-[var(--color-error)]"
          subtitle="archived this month"
        />
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Revenue by Subscription Tier</h2>
        {tierBreakdown.length > 0 ? (
          <div className="space-y-4">
            {tierBreakdown.map((tier) => (
              <div key={tier.tier}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-[var(--color-text)] capitalize">{tier.tier}</span>
                  <span className="text-[var(--color-textSecondary)]">
                    {tier.activeCount} church{tier.activeCount === 1 ? '' : 'es'} × {fmtKES(tier.monthlyPrice)} = <span className="font-medium text-[var(--color-text)]">{fmtKES(tier.mrr)}/mo</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-background)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${Math.max((tier.mrr / maxMrr) * 100, tier.mrr > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={BarChart3} title="No tier data" description="Churches will appear here once onboarded." />
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Platform Reach</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-background)]">
            <Users className="h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <p className="text-2xl font-bold text-[var(--color-text)]">{(stats.totalUsers || 0).toLocaleString()}</p>
              <p className="text-sm text-[var(--color-textSecondary)]">User accounts across all churches</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-background)]">
            <Users className="h-5 w-5 text-[var(--color-accent)]" />
            <div>
              <p className="text-2xl font-bold text-[var(--color-text)]">{(stats.totalMembers || 0).toLocaleString()}</p>
              <p className="text-sm text-[var(--color-textSecondary)]">Member records across all churches</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default PlatformAnalytics
