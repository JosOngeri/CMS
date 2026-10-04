import { useState, useEffect, useCallback } from 'react'
import { Coins, TrendingUp, FileSpreadsheet, Wallet, AlarmClock } from 'lucide-react'
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
  const [dunningState, setDunningState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const [plansRes, subsRes, invRes, revRes, dunRes] = await Promise.all([
        api.get('/api/platform/billing/plans'),
        api.get('/api/platform/billing/subscriptions'),
        api.get('/api/platform/billing/invoices'),
        api.get('/api/platform/billing/revenue'),
        api.get('/api/platform/billing/dunning'),
      ])
      setPlans(plansRes.data.data || [])
      setSubs(subsRes.data.data || [])
      setInvoices(invRes.data.data || [])
      setRevenue(revRes.data.data)
      setDunningState(dunRes.data.data)
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

  const creditInvoice = async (i) => {
    const amount = window.prompt(`Credit amount (max ${i.currency} ${Number(i.amount).toLocaleString()}):`, String(i.amount))
    if (amount === null) return
    const reason = window.prompt('Credit reason (audit-logged):')
    if (!reason || reason.trim().length < 3) return toast.error('Reason required')
    setBusy(i.id)
    try {
      await api.post(`/api/platform/billing/invoices/${i.id}/credit`, { amount: Number(amount), reason: reason.trim() })
      toast.success('Credit applied')
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to credit invoice')
    } finally {
      setBusy('')
    }
  }

  const printInvoice = async (id) => {
    try {
      const res = await api.get(`/api/platform/billing/invoices/${id}/print`, { responseType: 'text' })
      const win = window.open('', '_blank', 'noopener')
      if (win) { win.document.write(res.data); win.document.close(); win.print() }
    } catch {
      toast.error('Failed to load printable invoice')
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
          <button onClick={() => setTab('dunning')} className={tabCls('dunning')}><AlarmClock className="h-4 w-4 inline mr-1" />Dunning{dunningState?.invoices?.length ? ` (${dunningState.invoices.length})` : ''}</button>
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
                    <td className="py-3 text-[var(--color-text)] font-medium">
                      {kes(i.amount)}
                      {Number(i.credit_amount) > 0 && <span className="block text-xs text-[var(--color-success)]">−{kes(i.credit_amount)} credited</span>}
                    </td>
                    <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${i.status === 'paid' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : i.status === 'overdue' ? 'bg-[var(--color-error-light)] text-[var(--color-error)]' : i.status === 'open' ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' : 'bg-[var(--color-border)] text-[var(--color-textSecondary)]'}`}>{i.status}</span></td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{i.due_date ? fmtDateTime(i.due_date) : '—'}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {['open', 'overdue'].includes(i.status) && <button onClick={() => invoiceAction(i.id, 'paid')} disabled={busy === i.id} className="text-xs text-[var(--color-success)] hover:underline">mark paid</button>}
                        {i.status !== 'void' && <button onClick={() => creditInvoice(i)} disabled={busy === i.id} className="text-xs text-[var(--color-warning)] hover:underline">credit</button>}
                        <button onClick={() => printInvoice(i.id)} className="text-xs text-[var(--color-primary)] hover:underline">print</button>
                        {['open', 'overdue'].includes(i.status) && <button onClick={() => invoiceAction(i.id, 'void')} disabled={busy === i.id} className="text-xs text-[var(--color-error)] hover:underline">void</button>}
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

      {tab === 'dunning' && dunningState && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Dunning</h2>
              <p className="text-sm text-[var(--color-textSecondary)]">
                The scheduler runs every 6h: open invoices past due become overdue + reminder email,
                subscriptions go past_due, and after <strong className="text-[var(--color-text)]">{dunningState.graceDays} days</strong> the church auto-suspends.
              </p>
            </div>
            <button
              onClick={async () => {
                setBusy('dunning')
                try {
                  const res = await api.post('/api/platform/billing/dunning/run')
                  toast.success(res.data.message || 'Dunning complete')
                  await load()
                } catch { toast.error('Dunning run failed') } finally { setBusy('') }
              }}
              disabled={busy === 'dunning'}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-solid)] text-sm font-medium disabled:opacity-50"
            >
              Run now
            </button>
          </div>
          {dunningState.willSuspend > 0 && (
            <p className="mb-3 p-3 rounded-lg bg-[var(--color-error-light)] text-[var(--color-error)] text-sm font-medium">
              {dunningState.willSuspend} church{dunningState.willSuspend > 1 ? 'es' : ''} past grace — will suspend on the next run.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">Church</th>
                  <th className="pb-3 font-medium">Invoice</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Days overdue</th>
                  <th className="pb-3 font-medium">Tenant</th>
                </tr>
              </thead>
              <tbody>
                {dunningState.invoices.map((i) => (
                  <tr key={i.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 text-[var(--color-text)]">{i.church_name}</td>
                    <td className="py-3 font-mono text-xs text-[var(--color-textSecondary)]">{i.number || `#${i.id}`}</td>
                    <td className="py-3 text-[var(--color-text)]">{kes(i.amount)}</td>
                    <td className={`py-3 font-medium ${i.days_overdue > dunningState.graceDays ? 'text-[var(--color-error)]' : 'text-[var(--color-warning)]'}`}>{i.days_overdue}d</td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{i.is_active ? 'active' : 'suspended'}</td>
                  </tr>
                ))}
                {dunningState.invoices.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-[var(--color-textSecondary)]">No overdue invoices — clean.</td></tr>}
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
