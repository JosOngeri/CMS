/**
 * WHAT THIS FILE DOES
 * -------------------
 * Home screen for Subcommittee Collectors — the people who physically gather
 * money (or match M-Pesa messages) and hand it over to the church treasurer.
 *
 * It answers three questions at a glance:
 *   1. How much collected money is still in my hands?
 *   2. What have I already handed over?
 *   3. Which department(s) do I collect for?
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /departments/my-departments              → departments I serve
 * - backend /api/departments/{id}/remittances/pending-funds → money not yet handed over
 * - backend /api/departments/{id}/remittances           → my handover history
 * - components/common/Card.jsx
 * - components/dashboard/ChurchStatsCard.jsx
 */

import { useState, useEffect } from 'react'
import {
  HandCoins, Building, CheckCircle, ArrowRight, AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import ChurchStatsCard from '../../components/dashboard/ChurchStatsCard'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'
import { fmtDate, fmtKES } from '../../utils/format'

const CollectorDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()

  const [departments, setDepartments] = useState([])
  const [pendingFunds, setPendingFunds] = useState([]) // [{department, pending}]
  const [remittances, setRemittances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)

      // Find every department this user is a member/collector of.
      const deptRes = await api.get('/departments/my-departments')
      const deptList = Array.isArray(deptRes.data?.data) ? deptRes.data.data : deptRes.data?.data?.departments || []
      setDepartments(deptList)

      // For each department, fetch money in hand + my handover history.
      // Departments where I lack collector rights return 403 — that is fine.
      const results = await Promise.allSettled(
        deptList.map(async (d) => {
          const deptId = d.department_id || d.id
          const [pendingRes, remitRes] = await Promise.allSettled([
            api.get(`/api/departments/${deptId}/remittances/pending-funds`),
            api.get(`/api/departments/${deptId}/remittances`),
          ])
          return {
            department: d.name || d.department_name,
            pending: pendingRes.status === 'fulfilled' ? pendingRes.value.data?.data?.pending_funds || [] : [],
            remittances: remitRes.status === 'fulfilled' ? remitRes.value.data?.data?.remittances || [] : [],
          }
        })
      )

      const summaries = results.filter(r => r.status === 'fulfilled').map(r => r.value)
      setPendingFunds(summaries.filter(s => s.pending.length > 0))
      setRemittances(summaries.flatMap(s => s.remittances.map(r => ({ ...r, department_name: r.department_name || s.department }))))
    } catch (error) {
      console.error('Failed to load collector dashboard:', error)
      toast.error('Could not load your collections. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <FullPageLoading message="Loading your collections..." />

  const inHand = pendingFunds.reduce(
    (sum, s) => sum + s.pending.reduce((x, f) => x + Number(f.amount || 0), 0), 0
  )
  const pendingCount = pendingFunds.reduce((sum, s) => sum + s.pending.length, 0)
  const remittedThisMonth = remittances
    .filter(r => {
      const d = new Date(r.created_at || r.remitted_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, r) => s + Number(r.total_amount || r.amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Collections</h1>
          <p className="page-subtitle">
            Welcome back, {user?.first_name}! Track money you have collected and handed over.
          </p>
        </div>
      </div>

      {/* Money in hand hero — the number one thing a collector needs */}
      <div className="church-gradient rounded-2xl p-6 text-[var(--color-on-solid)] shadow-lg">
        <p className="text-[var(--color-on-solid-80)] text-sm font-medium">Money in my hands</p>
        <p className="text-3xl font-bold mt-1">{fmtKES(inHand)}</p>
        <p className="text-[var(--color-on-solid-80)] text-sm mt-1">
          {pendingCount > 0
            ? `${pendingCount} collected payment${pendingCount === 1 ? '' : 's'} not yet handed over`
            : 'Everything you collected has been handed over'}
        </p>
        {inHand > 0 && (
          <Link
            to="/dashboard/departments/handovers"
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold rounded-xl hover:bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] transition-colors"
          >
            <HandCoins className="h-5 w-5" />
            Hand Over to Treasurer
          </Link>
        )}
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChurchStatsCard
          title="Departments I Collect For"
          value={departments.length}
          change="Your collection areas"
          changeType="neutral"
          icon={Building}
          statType="members"
          linkTo="/dashboard/my-departments"
        />
        <ChurchStatsCard
          title="Payments to Hand Over"
          value={pendingCount}
          change="Waiting for remittance"
          changeType={pendingCount > 0 ? 'negative' : 'positive'}
          icon={AlertCircle}
          statType="default"
          linkTo="/dashboard/departments/handovers"
        />
        <ChurchStatsCard
          title="Handed Over This Month"
          value={fmtKES(remittedThisMonth)}
          change="Completed handovers"
          changeType="positive"
          icon={CheckCircle}
          statType="financial"
          linkTo="/dashboard/departments/handovers"
        />
      </div>

      {/* Pending funds by department */}
      {pendingFunds.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Collected — waiting to hand over</h2>
          <div className="space-y-3">
            {pendingFunds.map(s => (
              <div key={s.department} className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                <div className="px-4 py-2.5 bg-[var(--color-background)] flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{s.department}</p>
                  <p className="text-sm font-bold text-[var(--color-primary)]">
                    {fmtKES(s.pending.reduce((x, f) => x + Number(f.amount || 0), 0))}
                  </p>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {s.pending.slice(0, 5).map(f => (
                    <div key={f.id} className="px-4 py-2.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--color-text)] truncate">
                          {f.sender_name || f.mpesa_code || 'Payment'}
                        </p>
                        <p className="text-xs text-[var(--color-textSecondary)]">{fmtDate(f.created_at)}</p>
                      </div>
                      <p className="text-sm font-bold text-[var(--color-text)] ml-4">{fmtKES(f.amount)}</p>
                    </div>
                  ))}
                  {s.pending.length > 5 && (
                    <div className="px-4 py-2 text-xs text-[var(--color-textSecondary)]">
                      + {s.pending.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Handover history */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">My Handover History</h2>
          <Link to="/dashboard/departments/handovers" className="text-sm text-[var(--color-primary)] flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {remittances.length ? (
          <div className="space-y-3">
            {remittances.slice(0, 8).map((r, i) => (
              <div key={r.id || i} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-background)] transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">
                    {r.department_name} → {r.destination_account_name || 'Church account'}
                  </p>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    {fmtDate(r.created_at || r.remitted_at)} · {r.status}
                  </p>
                </div>
                <p className="text-sm font-bold text-[var(--color-text)] ml-4">
                  {fmtKES(r.total_amount || r.amount)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={HandCoins}
            title="No handovers yet"
            description="When you hand collected money to the treasurer, it will appear here."
          />
        )}
      </Card>
    </div>
  )
}

export default CollectorDashboard
