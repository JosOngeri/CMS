import { useState, useEffect, useCallback } from 'react'
import { Coins, TrendingUp, FileSpreadsheet, Wallet } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'

/**
 * §9 Billing & Revenue — plans, tenant subscriptions, invoices, MRR.
 */
const SUB_STATUS = {
  active: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  trialing: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  past_due: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  suspended: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
  cancelled: 'bg-[var(--color-border)] text-[var(--color-textSecondary)]',
}

const PlatformBilling = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('subscriptions')
  const [plans, setPlans] = useState([])
  const [subs, setSubs] = useState([])
  const [invoices, setInvoices] = useState([])
  const [revenue, setRevenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const [plansRes, subsRes, invRes, revRes] = await Promise.all([
        api.get('/api/platform/billing/plans'),
        api.get('/api/platform/billing/subscriptions'),
        api.get('/api/platform/billing/invoices'),
        api.get('/api/platform/billing/revenue'),
      ])
      setPlans(plansRes.data.data || [])
      setSubs(subsRes.data.data || [])
      setInvoices(invRes.data.data || [])
      setRevenue(revRes.data.data)
    } catch {
      toast.error('Failed to load billing')
    } finally {
      setLoading(false)
    }
  }, [api, toast])

  useEffect(() => { load() }, [load])

  const setPlan = async (churchId, planId) => {
    setBusy(churchId)
    try {
      await api.put(`/api/platform/billing/subscriptions/${churchId}`, { planId: planId ? Number(planId) : null })
      toast.success('Plan updated')
      await load()
    } catch {
      toast.error('Failed to update subscription')
    } finally {
      setBusy('')
    }
  }

  const setSubStatus = async (churchId, status) => {
    setBusy(churchId)
    try {
      await api.put(`/api/platform/billing/subscriptions/${churchId}`, { status })
      toast.success(`Subscription ${status}`)
      await load()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setBusy('')
    }
  }

  const invoiceAction = async (id, status) => {
    setBusy(id)
    try {
      await api.post(`/api/platform/billing/invoices/${id}/status`, { status })
      toast.success(`Invoice ${status}`)
      await load()
    } catch {
      toast.error('Failed to update invoice')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <FullPageLoading message="Loading billing..." />

  const inputCls = 'px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text)]'
  const tabCls = (t) => `px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-[var(--color-primary)] text-[var(--color-on-solid)]' : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`

  const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Billing & Revenue</h1>
          <p className="text-[var(--color-textSecondary)]">Plans, subscriptions, invoices, and the money the SaaS earns.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('subscriptions')} className={tabCls('subscriptions')}><Wallet className="h-4 w-4 inline mr-1" />Subscriptions</button>
          <button onClick={() => setTab('invoices')} className={tabCls('invoices')}><FileSpreadsheet className="h-4 w-4 inline mr-1" />Invoices</button>
          <button onClick={() => setTab('plans')} className={tabCls('plans')}><Coins className="h-4 w-4 inline mr-1" />Plans</button>
        </div>
      </div>

      {revenue && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'MRR', value: kes(revenue.mrr), Icon: TrendingUp },
            { label: 'ARR', value: kes(revenue.arr), Icon: TrendingUp },
            { label: 'Active subs', value: revenue.activeSubscriptions, Icon: Wallet },
            { label: 'Collected', value: kes(revenue.totalCollected), Icon: Coins },
          ].map(({ label, value, Icon }) => (
            <Card key={label} className="p-4">
              <Icon className="h-4 w-4 text-[var(--color-textSecondary)] mb-1" />
              <p className="text-xl font-bold text-[var(--color-text)]">{value}</p>
              <p className="text-xs text-[var(--color-textSecondary)]">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'subscriptions' && (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">Church</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Cycle</th>
                  <th className="pb-3 font-medium">Period end</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 text-[var(--color-text)] font-medium">{s.church_name}</td>
                    <td className="py-3">
                      <select value={s.plan_id || ''} disabled={busy === s.church_id} onChange={(e) => setPlan(s.church_id, e.target.value)} className={inputCls}>
                        <option value="">— none —</option>
                        {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SUB_STATUS[s.status] || ''}`}>{s.status}</span></td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{s.billing_cycle}</td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{s.current_period_end ? fmtDateTime(s.current_period_end) : '—'}</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {s.status !== 'suspended' && <button onClick={() => setSubStatus(s.church_id, 'suspended')} className="text-xs text-[var(--color-warning)] hover:underline">suspend</button>}
                        {s.status !== 'active' && <button onClick={() => setSubStatus(s.church_id, 'active')} className="text-xs text-[var(--color-success)] hover:underline">activate</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'invoices' && (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">Number</th>
                  <th className="pb-3 font-medium">Church</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Due</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 font-mono text-xs text-[var(--color-text)]">{i.number}</td>
                    <td className="py-3 text-[var(--color-text)]">{i.church_name}</td>
                    <td className="py-3 text-[var(--color-text)] font-medium">{kes(i.amount)}</td>
                    <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${i.status === 'paid' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : i.status === 'open' ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' : 'bg-[var(--color-border)] text-[var(--color-textSecondary)]'}`}>{i.status}</span></td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{i.due_date ? fmtDateTime(i.due_date) : '—'}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {i.status === 'open' && <button onClick={() => invoiceAction(i.id, 'paid')} disabled={busy === i.id} className="text-xs text-[var(--color-success)] hover:underline">mark paid</button>}
                        {i.status === 'open' && <button onClick={() => invoiceAction(i.id, 'void')} disabled={busy === i.id} className="text-xs text-[var(--color-error)] hover:underline">void</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-[var(--color-textSecondary)]">No invoices yet</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-[var(--color-text)]">{p.name}</h3>
                <span className="text-xs font-mono text-[var(--color-textSecondary)]">{p.code}</span>
              </div>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{kes(p.price_monthly)}<span className="text-sm font-normal text-[var(--color-textSecondary)]">/mo</span></p>
              <p className="text-xs text-[var(--color-textSecondary)] mb-3">{kes(p.price_yearly)}/yr</p>
              <ul className="text-xs text-[var(--color-textSecondary)] space-y-1">
                {(p.features || []).map((f) => <li key={f}>· {f}</li>)}
              </ul>
              <p className="mt-3 text-xs text-[var(--color-textSecondary)]">
                {p.member_cap ?? '∞'} members · {p.sms_credits_monthly ?? 0} SMS/mo · {p.storage_cap_mb ? `${p.storage_cap_mb}MB` : '∞ storage'}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default PlatformBilling
