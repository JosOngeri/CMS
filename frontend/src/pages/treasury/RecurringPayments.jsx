import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  RefreshCw, Clock, Play, Pause, Calendar, DollarSign
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const RecurringPayments = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [filteredPayments, setFilteredPayments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    payment_number: '',
    description: '',
    amount: '',
    frequency: 'monthly',
    start_date: '',
    end_date: '',
    account_id: '',
    category: '',
    notes: ''
  })

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  useEffect(() => {
    fetchPayments()
  }, [])

  useEffect(() => {
    filterPayments()
  }, [searchTerm, filterStatus, payments])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/recurring-payments')
      if (response.data) {
        setPayments(response.data.payments || [])
      }
    } catch (error) {
      console.error('Failed to fetch recurring payments:', error)
      toast.error('Failed to load recurring payments')
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = [...payments]

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(payment => payment.status === filterStatus)
    }

    setFilteredPayments(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingPayment) {
        await api.put(`/treasury/recurring-payments/${editingPayment.id}`, formData)
        toast.success('Recurring payment updated successfully')
      } else {
        await api.post('/treasury/recurring-payments', formData)
        toast.success('Recurring payment created successfully')
      }
      setShowForm(false)
      setEditingPayment(null)
      resetForm()
      fetchPayments()
    } catch (error) {
      console.error('Failed to save recurring payment:', error)
      toast.error('Failed to save recurring payment')
    }
  }

  const resetForm = () => {
    setFormData({
      payment_number: '',
      description: '',
      amount: '',
      frequency: 'monthly',
      start_date: '',
      end_date: '',
      account_id: '',
      category: '',
      notes: ''
    })
  }

  const handleEdit = (payment) => {
    setEditingPayment(payment)
    setFormData({
      payment_number: payment.payment_number,
      description: payment.description,
      amount: payment.amount,
      frequency: payment.frequency,
      start_date: payment.start_date,
      end_date: payment.end_date,
      account_id: payment.account_id || '',
      category: payment.category || '',
      notes: payment.notes || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this recurring payment?')) {
      try {
        await api.delete(`/treasury/recurring-payments/${id}`)
        toast.success('Recurring payment deleted successfully')
        fetchPayments()
      } catch (error) {
        console.error('Failed to delete recurring payment:', error)
        toast.error('Failed to delete recurring payment')
      }
    }
  }

  const handlePause = async (id) => {
    try {
      await api.post(`/treasury/recurring-payments/${id}/pause`)
      toast.success('Recurring payment paused successfully')
      fetchPayments()
    } catch (error) {
      console.error('Failed to pause recurring payment:', error)
      toast.error('Failed to pause recurring payment')
    }
  }

  const handleActivate = async (id) => {
    try {
      await api.post(`/treasury/recurring-payments/${id}/activate`)
      toast.success('Recurring payment activated successfully')
      fetchPayments()
    } catch (error) {
      console.error('Failed to activate recurring payment:', error)
      toast.error('Failed to activate recurring payment')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'paused': return 'bg-yellow-100 text-yellow-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]'
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading recurring payments..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">Recurring Payments</h1>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            Manage automated recurring payments
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Payment</span>
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={fetchPayments}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Payments List */}
      <Card>
        {filteredPayments.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="p-4 hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-purple-100 bg-purple-900/20 rounded-lg">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text)] text-white">
                        {payment.payment_number}
                      </p>
                      <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                        {payment.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                        <span className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                          {payment.frequency}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Amount</p>
                      <p className="font-semibold text-[var(--color-text)] text-white">
                        KES {parseFloat(payment?.amount ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Next Date</p>
                      <p className="text-sm text-[var(--color-text)] text-white">
                        {payment.next_payment_date || '-'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {payment.status === 'active' && (
                        <button
                          onClick={() => handlePause(payment.id)}
                          className="p-2 text-yellow-600 hover:text-yellow-700"
                          title="Pause"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      )}
                      {payment.status === 'paused' && (
                        <button
                          onClick={() => handleActivate(payment.id)}
                          className="p-2 text-green-600 hover:text-green-700"
                          title="Activate"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(payment)}
                        className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-400 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="p-2 text-[var(--color-textSecondary)] hover:text-red-600 text-[var(--color-textSecondary)] hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="No recurring payments found"
            description="Create your first recurring payment to automate regular transactions."
          />
        )}
      </Card>

      {/* Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)] text-white mb-4">
                {editingPayment ? 'Edit Recurring Payment' : 'Add Recurring Payment'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Payment Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.payment_number}
                    onChange={(e) => setFormData({ ...formData, payment_number: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Frequency
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingPayment(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                  >
                    {editingPayment ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecurringPayments
