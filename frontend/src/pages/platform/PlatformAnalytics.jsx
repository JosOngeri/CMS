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
  const [growth, setGrowth] = useState(null)
  const [usage, setUsage] = useState([])
  const [adoption, setAdoption] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, growthRes, usageRes, adoptionRes] = await Promise.all([
          api.get('/api/platform/stats'),
          api.get('/api/platform/analytics/growth').catch(() => ({ data: { data: null } })),
          api.get('/api/platform/analytics/usage').catch(() => ({ data: { data: [] } })),
          api.get('/api/platform/analytics/adoption').catch(() => ({ data: { data: [] } })),
        ])
        setStats(statsRes.data.data)
        setGrowth(growthRes.data.data)
        setUsage(usageRes.data.data || [])
        setAdoption(adoptionRes.data.data || [])
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Revenue Analytics</h1>
          <p className="text-[var(--color-textSecondary)]">Subscription revenue estimated from each church tier and the configured tier prices.</p>
        </div>
        <a
          href="/api/platform/analytics/export.csv"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]"
          title="Download monthly metrics CSV for stakeholders"
        >
          Export CSV
        </a>
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

      {/* Growth (10.2) */}
      {growth && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Growth & Activity</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total users', value: growth.totalUsers?.toLocaleString() },
              { label: 'Active users', value: growth.activeUsers?.toLocaleString() },
              { label: 'DAU (24h)', value: growth.dau?.toLocaleString() },
              { label: 'MAU (30d)', value: growth.mau?.toLocaleString() },
            ].map((m) => (
              <div key={m.label} className="p-4 rounded-lg bg-[var(--color-background)]">
                <p className="text-2xl font-bold text-[var(--color-text)]">{m.value ?? '—'}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">{m.label}</p>
              </div>
            ))}
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Tenants onboarded per month</h3>
          <div className="space-y-2">
            {(growth.tenantsByMonth || []).map((row) => {
              const max = Math.max(...growth.tenantsByMonth.map((t) => Number(t.tenants)), 1)
              return (
                <div key={row.month} className="flex items-center gap-3 text-sm">
                  <span className="w-20 text-[var(--color-textSecondary)] font-mono">{row.month}</span>
                  <div className="flex-1 h-4 rounded bg-[var(--color-background)] overflow-hidden">
                    <div className="h-full rounded bg-[var(--color-accent)]" style={{ width: `${(Number(row.tenants) / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-[var(--color-text)]">{row.tenants}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Feature adoption (10.3) */}
      {adoption.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Feature Adoption</h2>
          <p className="text-xs text-[var(--color-textSecondary)] mb-4">Which modules each church actually uses — a module lights up once the church has at least one record in it.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-2 font-medium">Church</th>
                  {['members', 'payments', 'events', 'documents', 'sms', 'announcements', 'departments'].map((m) => (
                    <th key={m} className="pb-2 font-medium text-center capitalize">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adoption.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2.5 text-[var(--color-text)]">{t.name}</td>
                    {['members', 'payments', 'events', 'documents', 'sms', 'announcements', 'departments'].map((m) => (
                      <td key={m} className="py-2.5 text-center">
                        <span className={`inline-block h-3 w-3 rounded-full ${t.modules?.[m] ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Usage (10.4) */}
      {usage.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Usage by Tenant</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-2 font-medium">Church</th>
                  <th className="pb-2 font-medium text-right">Members</th>
                  <th className="pb-2 font-medium text-right">Users</th>
                  <th className="pb-2 font-medium text-right">Payments</th>
                  <th className="pb-2 font-medium text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2.5 text-[var(--color-text)]">{t.name}</td>
                    <td className="py-2.5 text-right text-[var(--color-textSecondary)]">{Number(t.members).toLocaleString()}</td>
                    <td className="py-2.5 text-right text-[var(--color-textSecondary)]">{Number(t.users).toLocaleString()}</td>
                    <td className="py-2.5 text-right text-[var(--color-textSecondary)]">{Number(t.payment_count).toLocaleString()}</td>
                    <td className="py-2.5 text-right font-medium text-[var(--color-text)]">{fmtKES(Number(t.payment_volume))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

export default PlatformAnalytics
