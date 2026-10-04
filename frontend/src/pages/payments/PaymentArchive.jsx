/**
 * WHAT THIS FILE DOES
 * -------------------
 * Archive view for soft-deleted payments. PaymentManagement archives rows
 * (PUT /payments/:id/archive → payments.archived_at); this page lists them
 * (GET /payments?archived=true) and offers Restore
 * (PUT /payments/:id/restore) so financial history is never lost.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /payments?archived=true        → archived payment records
 * - backend /payments/:id/restore          → un-archive a row
 * - PaymentManagement.jsx                  → the working list these rows came from
 * - contexts/AuthContext.jsx               → api client (cookie + CSRF)
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, ArrowLeft, Users } from 'lucide-react'
import MobileCard, { CardField } from '../../components/common/MobileCard'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const STATUS_COLORS = {
  pending: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  completed: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  failed: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
  cancelled: 'bg-[var(--color-surface)] text-[var(--color-textSecondary)]',
  refunded: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
}

const PaymentArchive = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(null)

  const canManagePayments = user?.roles?.some(role =>
    ['Super Admin', 'Pastor', 'First Elder', 'Treasurer', 'Department Head'].includes(role)
  )

  useEffect(() => {
    const fetchArchived = async () => {
      try {
        const response = await api.get('/payments', { params: { archived: 'true', limit: 200 } })
        setPayments(response.data?.data || response.data?.payments || response.data || [])
      } catch (error) {
        console.error('Error fetching archived payments:', error)
        toast.error('Failed to load archived payments')
      } finally {
        setLoading(false)
      }
    }
    fetchArchived()
  }, [api, toast])

  const handleRestore = async (payment) => {
    setRestoring(payment.id)
    try {
      await api.put(`/payments/${payment.id}/restore`)
      setPayments(prev => prev.filter(p => p.id !== payment.id))
      toast.success('Payment restored to Payment Management')
    } catch (error) {
      console.error('Error restoring payment:', error)
      toast.error(error.response?.data?.error || 'Failed to restore payment')
    } finally {
      setRestoring(null)
    }
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Payment Archive</h1>
          <p className="page-subtitle">Archived payments are kept here — nothing is permanently deleted</p>
        </div>
        <Link
          to="/dashboard/payments/management"
          className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] text-[var(--color-textSecondary)] rounded-lg hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Payment Management
        </Link>
      </div>

      {/* Archived payments table (desktop) */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)]">
            <thead className="bg-[var(--color-background)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Payment Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Archived</th>
                {canManagePayments && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-[var(--color-background)]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text)]">
                    {payment.member_name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-text)]">
                    KES {parseFloat(payment?.amount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)] capitalize">
                    {payment.payment_type || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[payment.status] || STATUS_COLORS.cancelled}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)]">
                    {fmtDate(payment.payment_date || payment.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)]">
                    {fmtDate(payment.archived_at)}
                  </td>
                  {canManagePayments && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleRestore(payment)}
                        disabled={restoring === payment.id}
                        title="Restore payment"
                        className="flex items-center gap-1 text-[var(--color-primary)] hover:opacity-80 disabled:opacity-50"
                      >
                        <ArchiveRestore className="w-4 h-4" />
                        <span>Restore</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Archived payments (mobile cards) */}
        <div className="md:hidden p-3 space-y-3">
          {payments.map((payment) => (
            <MobileCard
              key={payment.id}
              icon={Users}
              title={payment.member_name || '—'}
              subtitle={`${payment.payment_type || 'payment'} · ${fmtDate(payment.payment_date || payment.created_at)}`}
              badge={
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[payment.status] || STATUS_COLORS.cancelled}`}>
                  {payment.status}
                </span>
              }
              actions={canManagePayments ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRestore(payment) }}
                  disabled={restoring === payment.id}
                  className="flex items-center gap-1 text-sm text-[var(--color-primary)] font-medium min-h-[44px] px-2 disabled:opacity-50"
                >
                  <ArchiveRestore className="w-4 h-4" /><span>Restore</span>
                </button>
              ) : null}
            >
              <CardField label="Amount" value={`KES ${parseFloat(payment?.amount ?? 0).toLocaleString()}`} />
              <CardField label="Archived" value={fmtDate(payment.archived_at)} />
            </MobileCard>
          ))}
        </div>
      </div>

      {payments.length === 0 && (
        <div className="text-center py-12">
          <Archive className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">Archive is empty</h3>
          <p className="text-[var(--color-textSecondary)]">
            Payments archived from Payment Management will appear here.
          </p>
        </div>
      )}
    </div>
  )
}

export default PaymentArchive
