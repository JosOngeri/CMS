import { useState, useEffect, useCallback } from 'react'
import { CreditCard, AlertOctagon, CheckCircle, XCircle, Undo2, MessageSquareText, FileUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { fmtDateTime } from '../../utils/format'
import { csvToObjects } from '../../utils/csv'

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
  const [refunds, setRefunds] = useState([])
  const [smsLedger, setSmsLedger] = useState([])
  const [filter, setFilter] = useState({ status: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const [feedRes, stuckRes, refundsRes, smsRes] = await Promise.all([
        api.get('/api/platform/payments', { params: { limit: 100, ...(filter.status && { status: filter.status }) } }),
        api.get('/api/platform/payments/stuck'),
        api.get('/api/platform/payments/refunds'),
        api.get('/api/platform/sms-ledger'),
      ])
      setPayments(feedRes.data.data?.payments || [])
      setStuck(stuckRes.data.data || [])
      setRefunds(refundsRes.data.data || [])
      setSmsLedger(smsRes.data.data || [])
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

  const [reconResult, setReconResult] = useState(null)

  // M-Pesa statement CSV -> {reference, amount, date} rows for the matcher.
  const importStatement = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const text = await file.text()
    const { objects } = csvToObjects(text)
    const rows = objects.map((o) => ({
      reference: o.receipt_no || o.receipt || o.transaction_receipt || o.reference || '',
      amount: o.paid_in || o.paidin || o.amount || '',
      date: o.completion_time || o.completion || o.date || '',
    })).filter((r) => r.reference)
    if (rows.length === 0) {
      toast.error('No receipt numbers found — is this an M-Pesa statement CSV?')
      return
    }
    setBusy('statement')
    try {
      const res = await api.post('/api/platform/payments/reconcile-statement', { rows })
      setReconResult(res.data.data)
      toast.success(res.data.message || 'Statement reconciled')
      await load()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Statement reconciliation failed')
    } finally {
      setBusy('')
    }
  }

  const decideRefund = async (id, decision) => {
    const note = window.prompt(`Reason for ${decision} (audit-logged):`)
    if (note === null) return
    setBusy(id)
    try {
      await api.post(`/api/platform/payments/refunds/${id}/decision`, { decision, note: note.trim() })
      toast.success(`Refund ${decision}`)
      await load()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Decision failed')
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
          <button onClick={() => setTab('refunds')} className={tabCls('refunds')}><Undo2 className="h-4 w-4 inline mr-1" />Refunds ({refunds.filter((r) => r.status === 'pending').length})</button>
          <button onClick={() => setTab('sms')} className={tabCls('sms')}><MessageSquareText className="h-4 w-4 inline mr-1" />SMS ledger</button>
          <label className={`${tabCls('x')} inline-flex items-center cursor-pointer border border-[var(--color-border)] ${busy === 'statement' ? 'opacity-50' : ''}`}>
            <FileUp className="h-4 w-4 inline mr-1" />{busy === 'statement' ? 'Reconciling…' : 'Import statement'}
            <input type="file" accept=".csv,text/csv" onChange={importStatement} disabled={busy === 'statement'} className="hidden" />
          </label>
        </div>
      </div>

      {reconResult && (
        <Card className="p-6 border-2 border-[var(--color-primary-light)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Last reconciliation</h2>
            <button onClick={() => setReconResult(null)} className="text-xs text-[var(--color-textSecondary)] hover:underline">dismiss</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg bg-[var(--color-success-light)]"><p className="text-2xl font-bold text-[var(--color-success)]">{reconResult.completedNow?.length || 0}</p><p className="text-xs text-[var(--color-textSecondary)]">marked paid</p></div>
            <div className="p-3 rounded-lg bg-[var(--color-background)]"><p className="text-2xl font-bold text-[var(--color-text)]">{reconResult.alreadySettled?.length || 0}</p><p className="text-xs text-[var(--color-textSecondary)]">already settled</p></div>
            <div className="p-3 rounded-lg bg-[var(--color-warning-light)]"><p className="text-2xl font-bold text-[var(--color-warning)]">{reconResult.unmatched?.length || 0}</p><p className="text-xs text-[var(--color-textSecondary)]">statement unmatched</p></div>
            <div className="p-3 rounded-lg bg-[var(--color-error-light)]"><p className="text-2xl font-bold text-[var(--color-error)]">{reconResult.stillPending?.length || 0}</p><p className="text-xs text-[var(--color-textSecondary)]">still pending</p></div>
          </div>
          {reconResult.unmatched?.length > 0 && (
            <details className="mt-3 text-xs text-[var(--color-textSecondary)]">
              <summary className="cursor-pointer">Unmatched statement rows ({reconResult.unmatched.length})</summary>
              <pre className="mt-2 p-3 rounded bg-[var(--color-background)] overflow-x-auto">{reconResult.unmatched.map((u) => `${u.reference}  ${u.amount}  ${u.date}`).join('\n')}</pre>
            </details>
          )}
        </Card>
      )}

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

      {tab === 'refunds' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">Refund requests</h2>
          <p className="text-sm text-[var(--color-textSecondary)] mb-4">Cross-tenant refund oversight — approve or reject pending requests.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">Church</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Reason</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Requested</th>
                  <th className="pb-3 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 text-[var(--color-text)]">{r.church_name}</td>
                    <td className="py-3 text-[var(--color-text)] font-medium">{Number(r.amount).toLocaleString()}</td>
                    <td className="py-3 text-[var(--color-textSecondary)] max-w-xs truncate" title={r.reason}>{r.reason || '—'}</td>
                    <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'approved' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : r.status === 'rejected' ? 'bg-[var(--color-error-light)] text-[var(--color-error)]' : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'}`}>{r.status}</span></td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{fmtDateTime(r.created_at)}</td>
                    <td className="py-3">
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => decideRefund(r.id, 'approved')} disabled={busy === r.id} className="text-xs text-[var(--color-success)] hover:underline disabled:opacity-50">approve</button>
                          <button onClick={() => decideRefund(r.id, 'rejected')} disabled={busy === r.id} className="text-xs text-[var(--color-error)] hover:underline disabled:opacity-50">reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {refunds.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-[var(--color-textSecondary)]">No refund requests.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'sms' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">SMS spend ledger</h2>
          <p className="text-sm text-[var(--color-textSecondary)] mb-4">Per-tenant send volume (last 30 days) and remaining credit quota.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-textSecondary)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-medium">Church</th>
                  <th className="pb-3 font-medium text-right">Sent (30d)</th>
                  <th className="pb-3 font-medium text-right">Failed (30d)</th>
                  <th className="pb-3 font-medium text-right">Total sent</th>
                  <th className="pb-3 font-medium text-right">Credits left</th>
                  <th className="pb-3 font-medium">Last send</th>
                </tr>
              </thead>
              <tbody>
                {smsLedger.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 text-[var(--color-text)]">{t.name}</td>
                    <td className="py-3 text-right text-[var(--color-text)]">{Number(t.sent_30d).toLocaleString()}</td>
                    <td className="py-3 text-right text-[var(--color-textSecondary)]">{Number(t.failed_30d).toLocaleString()}</td>
                    <td className="py-3 text-right text-[var(--color-textSecondary)]">{Number(t.total_sent).toLocaleString()}</td>
                    <td className="py-3 text-right font-medium text-[var(--color-text)]">{t.sms_credits == null ? '—' : Number(t.sms_credits).toLocaleString()}</td>
                    <td className="py-3 text-[var(--color-textSecondary)]">{t.last_sent_at ? fmtDateTime(t.last_sent_at) : 'never'}</td>
                  </tr>
                ))}
                {smsLedger.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-[var(--color-textSecondary)]">No SMS activity.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

export default PlatformPayments
