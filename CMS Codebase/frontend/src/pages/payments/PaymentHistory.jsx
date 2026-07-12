import { useState, useEffect } from 'react'
import { Search, Filter, Download, Calendar, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FullPageLoading } from '../../components/common/Loading'
import { PaymentsEmptyState } from '../../components/common/EmptyState'
import { API_ENDPOINTS } from '../../constants/api'

const PaymentHistory = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchPayments()
  }, [currentPage, statusFilter])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      let url = API_ENDPOINTS.PAYMENTS.MY_PAYMENTS
      const separator = url.includes('?') ? '&' : '?'
      url += `${separator}page=${currentPage}&limit=10`
      if (statusFilter) {
        url += `&status=${statusFilter}`
      }

      const response = await api.get(url)
      setPayments(response.data.payments || [])
      setTotalPages(response.data.pagination?.pages || 1)
    } catch (error) {
      console.error('Failed to fetch payments:', error)
      toast.error('Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-[var(--color-textSecondary)]" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'badge-success'
      case 'failed':
        return 'badge-error'
      case 'pending':
        return 'badge-warning'
      default:
        return 'badge-secondary'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredPayments = payments.filter(payment =>
    payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.phone_number.includes(searchTerm) ||
    payment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const downloadReceipt = (payment) => {
    // Mock download functionality
    const receiptData = {
      id: payment.id,
      amount: payment.amount,
      date: payment.payment_date,
      status: payment.status,
      items: payment.payment_items
    }
    
    const blob = new Blob([JSON.stringify(receiptData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt_${payment.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <FullPageLoading message="Loading payment history..." />
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)] text-white mb-2">
          Payment History
        </h1>
        <p className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
          View and manage your payment history
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input pl-10 appearance-none"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] self-center">
            {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm overflow-hidden">
        {filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-background)] bg-[var(--color-surface)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-text)] text-white">
                      {payment.id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text)] text-white font-semibold">
                      KES {parseFloat(payment?.amount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                      {payment.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(payment.status)}
                        <span className={`badge ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                      <div className="flex items-center space-x-2">
                        {payment.status === 'completed' && (
                          <button
                            onClick={() => downloadReceipt(payment)}
                            className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                          >
                            <Download className="h-4 w-4" />
                            <span>Receipt</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // Show payment details
                          }}
                          className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)] text-[var(--color-textSecondary)] hover:text-white"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PaymentsEmptyState />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn btn-outline btn-sm"
          >
            Previous
          </button>
          
          <span className="px-4 py-2 text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-outline btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default PaymentHistory
