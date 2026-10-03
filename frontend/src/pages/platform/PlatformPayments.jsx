import { useState, useEffect, useCallback } from 'react'
import { CreditCard, AlertOctagon, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'

/**
 * §5 Payments & Oversight — cross-tenant payment feed + the stuck-payment
 * queue with manual reconcile.
 */
const STATUS_STYLE = {
  completed: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  pending: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  failed: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
}

const PlatformPayments = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('feed')
  const [payments, setPayments] = useState([])
  const [stuck, setStuck] = useState([])
  const [filter, setFilter] = useState({ status: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const [feedRes, stuckRes] = await Promise.all([
        api.get('/api/platform/payments', { params: { limit: 100, ...(filter.status && { status: filter.status }) } }),
        api.get('/api/platform/payments/stuck'),
      ])
      setPayments(feedRes.data.data?.payments || [])
      setStuck(stuckRes.data.data || [])
    } catch {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [api, toast, filter.status])

  useEffect(() => { load() }, [load])

  const reconcile = async (id, status) => {
    setBusy(id)
    try {
      await api.post(`/api/platform/payments/${id}/reconcile`, { status, note: 'Manual reconcile from platform console' })
      toast.success(`Payment marked ${status}`)
      await load()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Reconcile failed')
    } finally {
      setBusy('')
    }
  }

  if (loading) return <FullPageLoading message="Loading payments..." />

  const tabCls = (t) => `px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-[var(--color-primary)] text-[var(--color-on-solid)]' : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Payments & Oversight</h1>
          <p className="text-[var(--color-textSecondary)]">Money moving across every church.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('feed')} className={tabCls('feed')}><CreditCard className="h-4 w-4 inline mr-1" />Feed</button>
          <button onClick={() => setTab('stuck')} className={tabCls('stuck')}><AlertOctagon className="h-4 w-4 inline mr-1" />Stuck ({stuck.length})</button>
        </div>
      </div>

      {tab === 'feed' && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <select value={filter.status} onChange={(e) => { setLoading(true); setFilter({ status: e.target.value }) }} className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text)]">
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">Church</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 text-[var(--color-text)]">{p.church_name}</td>
                    <td className="py-3 text-[var(--color-text)] font-medium">{p.currency} {Number(p.amount).toLocaleString()}</td>
                    <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[p.status] || ''}`}>{p.status}</span></td>
                    <td className="py-3 text-[var(--color-textSecondary)] font-mono text-xs">{p.transaction_reference || '—'}</td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{fmtDateTime(p.created_at)}</td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-[var(--color-textSecondary)]">No payments match</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'stuck' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Stuck payments</h2>
          <p className="text-sm text-[var(--color-textSecondary)] mb-4">Pending for over 24 hours — reconcile manually after checking the M-Pesa statement.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">Church</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Stuck since</th>
                  <th className="pb-3 font-medium">Resolve</th>
                </tr>
              </thead>
              <tbody>
                {stuck.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 text-[var(--color-text)]">{p.church_name}</td>
                    <td className="py-3 text-[var(--color-text)] font-medium">{p.currency} {Number(p.amount).toLocaleString()}</td>
                    <td className="py-3 text-[var(--color-textSecondary)] font-mono text-xs">{p.transaction_reference || '—'}</td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{fmtDateTime(p.created_at)}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => reconcile(p.id, 'completed')} disabled={busy === p.id} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-success)] text-xs text-[var(--color-success)] hover:bg-[var(--color-success-light)] disabled:opacity-50"><CheckCircle className="h-3 w-3" />Paid</button>
                        <button onClick={() => reconcile(p.id, 'failed')} disabled={busy === p.id} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-error)] text-xs text-[var(--color-error)] hover:bg-[var(--color-error-light)] disabled:opacity-50"><XCircle className="h-3 w-3" />Failed</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {stuck.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-[var(--color-textSecondary)]">No stuck payments — the queue is clean.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

export default PlatformPayments
