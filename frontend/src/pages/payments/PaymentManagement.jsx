/**
 * WHAT THIS FILE DOES
 * -------------------
 * Admin payment records page — list, search, filter, create, edit and
 * delete manual payment entries (cash/check/bank) for church members.
 * Restricted to leadership roles (canManagePayments gate below).
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /payments (GET/POST/PUT/DELETE) → payment records
 * - contexts/AuthContext.jsx → api client (cookie + CSRF)
 */

import { useState, useEffect } from 'react'
import { DollarSign, CreditCard, TrendingUp, Users, Calendar, Search, Filter, Plus, Edit, Trash2, Download, Eye, CheckCircle, XCircle, Clock, AlertCircle, Receipt } from 'lucide-react'
import MobileCard, { CardField } from '../../components/common/MobileCard'
import { useAuth } from '../../contexts/AuthContext'

const PaymentManagement = () => {
  const { user, api } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMethod, setFilterMethod] = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    payment_type: 'tithe',
    payment_method: 'cash',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  const canManagePayments = user?.roles?.some(role => 
    ['Super Admin', 'Pastor', 'First Elder', 'Department Head'].includes(role)
  )

  const paymentTypes = [
    { value: 'tithe', label: 'Tithe', color: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' },
    { value: 'offering', label: 'Offering', color: 'bg-[var(--color-success-light)] text-[var(--color-success)]' },
    { value: 'mission', label: 'Mission', color: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]' },
    { value: 'building', label: 'Building Fund', color: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' },
    { value: 'other', label: 'Other', color: 'bg-[var(--color-surface)] text-[var(--color-text)]' }
  ]

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: DollarSign },
    { value: 'mpesa', label: 'M-Pesa', icon: CreditCard },
    { value: 'bank', label: 'Bank Transfer', icon: TrendingUp },
    { value: 'check', label: 'Check', icon: Receipt }
  ]

  const paymentStatus = [
    { value: 'completed', label: 'Completed', color: 'bg-[var(--color-success-light)] text-[var(--color-success)]', icon: CheckCircle },
    { value: 'pending', label: 'Pending', color: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]', icon: Clock },
    { value: 'failed', label: 'Failed', color: 'bg-[var(--color-error-light)] text-[var(--color-error)]', icon: XCircle }
  ]

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments')
      setPayments(response.data.payments || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const response = editingPayment
        ? await api.put(`/payments/${editingPayment.id}`, formData)
        : await api.post('/payments', formData)
      const result = response.data

      if (editingPayment) {
        setPayments(payments.map(p => p.id === editingPayment.id ? result.payment : p))
      } else {
        setPayments([result.payment, ...payments])
      }

      // Reset form
      setFormData({
        member_id: '',
        amount: '',
        payment_type: 'tithe',
        payment_method: 'cash',
        description: '',
        date: new Date().toISOString().split('T')[0]
      })
      setShowCreateForm(false)
      setEditingPayment(null)
      
    } catch (error) {
      console.error('Error saving payment:', error)
    }
  }

  const handleEdit = (payment) => {
    setEditingPayment(payment)
    setFormData({
      member_id: payment.member_id,
      amount: payment.amount,
      payment_type: payment.payment_type,
      payment_method: payment.payment_method,
      description: payment.description,
      date: payment.date
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (paymentId) => {
    if (!confirm('Are you sure you want to delete this payment record?')) {
      return
    }

    try {
      await api.delete(`/payments/${paymentId}`)
      setPayments(payments.filter(p => p.id !== paymentId))
      
    } catch (error) {
      console.error('Error deleting payment:', error)
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.amount?.toString().includes(searchTerm)
    
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus
    const matchesMethod = filterMethod === 'all' || payment.payment_method === filterMethod
    
    // Filter by period
    let matchesPeriod = true
    if (filterPeriod !== 'all') {
      const paymentDate = new Date(payment.date)
      const now = new Date()
      
      switch (filterPeriod) {
        case 'today':
          matchesPeriod = paymentDate.toDateString() === now.toDateString()
          break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesPeriod = paymentDate >= weekAgo
          break
        case 'month':
          matchesPeriod = paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear()
          break
        case 'year':
          matchesPeriod = paymentDate.getFullYear() === now.getFullYear()
          break
      }
    }

    return matchesSearch && matchesStatus && matchesMethod && matchesPeriod
  })

  const getPaymentTypeColor = (type) => {
    const typeConfig = paymentTypes.find(t => t.value === type)
    return typeConfig?.color || 'bg-[var(--color-surface)] text-[var(--color-text)]'
  }

  const getPaymentStatusIcon = (status) => {
    const statusConfig = paymentStatus.find(s => s.value === status)
    const Icon = statusConfig?.icon || Clock
    return <Icon className="w-4 h-4" />
  }

  const getPaymentStatusColor = (status) => {
    const statusConfig = paymentStatus.find(s => s.value === status)
    return statusConfig?.color || 'bg-[var(--color-surface)] text-[var(--color-text)]'
  }

  const getPaymentMethodIcon = (method) => {
    const methodConfig = paymentMethods.find(m => m.value === method)
    const Icon = methodConfig?.icon || DollarSign
    return <Icon className="w-4 h-4" />
  }

  const getTotalAmount = () => {
    return filteredPayments
      .filter(p => p.status === 'completed')
      .reduce((total, payment) => total + parseFloat(payment.amount || 0), 0)
  }

  const getStats = () => {
    const completed = filteredPayments.filter(p => p.status === 'completed').length
    const pending = filteredPayments.filter(p => p.status === 'pending').length
    const failed = filteredPayments.filter(p => p.status === 'failed').length
    
    return { completed, pending, failed }
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Payment Management</h1>
          <p className="page-subtitle">Manage church payments and financial records</p>
        </div>
        {canManagePayments && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-primary)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Total Revenue</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">
                KES {(getTotalAmount() ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-[var(--color-success-light)] rounded-lg">
              <DollarSign className="h-6 w-6 text-[var(--color-success)]" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Completed</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{stats.completed}</p>
            </div>
            <div className="p-3 bg-[var(--color-primary-light)] rounded-lg">
              <CheckCircle className="h-6 w-6 text-[var(--color-primary)]" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Pending</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{stats.pending}</p>
            </div>
            <div className="p-3 bg-[var(--color-warning-light)] rounded-lg">
              <Clock className="h-6 w-6 text-[var(--color-warning)]" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Failed</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{stats.failed}</p>
            </div>
            <div className="p-3 bg-[var(--color-error-light)] rounded-lg">
              <XCircle className="h-6 w-6 text-[var(--color-error)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Payment Form */}
      {showCreateForm && (
        <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            {editingPayment ? 'Edit Payment' : 'Record New Payment'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Member Name
                </label>
                <input
                  type="text"
                  value={formData.member_id}
                  onChange={(e) => setFormData({...formData, member_id: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  placeholder="Enter member name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Payment Type
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) => setFormData({...formData, payment_type: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  {paymentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                placeholder="Enter payment description or notes"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-primary)] transition-colors"
              >
                {editingPayment ? 'Update Payment' : 'Record Payment'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingPayment(null)
                  setFormData({
                    member_id: '',
                    amount: '',
                    payment_type: 'tithe',
                    payment_method: 'cash',
                    description: '',
                    date: new Date().toISOString().split('T')[0]
                  })
                }}
                className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            <option value="all">All Status</option>
            {paymentStatus.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            <option value="all">All Methods</option>
            {paymentMethods.map(method => (
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="bg-[var(--color-surface)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                  Status
                </th>
                {canManagePayments && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text)]">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-[var(--color-primary)]" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-[var(--color-text)]">
                          {payment.member_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentTypeColor(payment.payment_type)}`}>
                      {paymentTypes.find(t => t.value === payment.payment_type)?.label || payment.payment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-text)]">
                    KES {parseFloat(payment?.amount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(payment.payment_method)}
                      <span className="text-sm text-[var(--color-text)]">
                        {paymentMethods.find(m => m.value === payment.payment_method)?.label || payment.payment_method}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                      {getPaymentStatusIcon(payment.status)}
                      <span className="ml-1">
                        {paymentStatus.find(s => s.value === payment.status)?.label || payment.status}
                      </span>
                    </span>
                  </td>
                  {canManagePayments && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPayment(payment)}
                          className="text-[var(--color-primary)] hover:text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(payment)}
                          className="text-[var(--color-primary)] hover:text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="text-[var(--color-error)] hover:opacity-80 hover:text-[var(--color-error)]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payments card list (mobile) */}
        <div className="md:hidden p-3 space-y-3">
          {filteredPayments.map((payment) => (
            <MobileCard
              key={payment.id}
              icon={Users}
              title={payment.member_name}
              subtitle={`${paymentTypes.find(t => t.value === payment.payment_type)?.label || payment.payment_type} · ${new Date(payment.date).toLocaleDateString()}`}
              badge={
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getPaymentStatusColor(payment.status)}`}>
                  {paymentStatus.find(s => s.value === payment.status)?.label || payment.status}
                </span>
              }
              onClick={() => setSelectedPayment(payment)}
              actions={canManagePayments ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(payment); }} className="flex items-center gap-1 text-sm text-[var(--color-primary)] font-medium min-h-[44px] px-2">
                    <Edit className="w-4 h-4" /><span>Edit</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(payment.id); }} className="flex items-center gap-1 text-sm text-[var(--color-error)] font-medium min-h-[44px] px-2">
                    <Trash2 className="w-4 h-4" /><span>Delete</span>
                  </button>
                </>
              ) : null}
            >
              <CardField label="Amount" value={`KES ${parseFloat(payment?.amount ?? 0).toLocaleString()}`} />
              <CardField label="Method" value={paymentMethods.find(m => m.value === payment.payment_method)?.label || payment.payment_method} />
            </MobileCard>
          ))}
        </div>
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">No payments found</h3>
          <p className="text-[var(--color-textSecondary)]">
            {searchTerm || filterStatus !== 'all' || filterMethod !== 'all' || filterPeriod !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No payments have been recorded yet'
            }
          </p>
        </div>
      )}

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">Payment Details</h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Date</p>
                <p className="text-[var(--color-text)]">
                  {new Date(selectedPayment.date).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Member</p>
                <p className="text-[var(--color-text)]">{selectedPayment.member_name}</p>
              </div>
              
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Amount</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  KES {parseFloat(selectedPayment?.amount ?? 0).toLocaleString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Type</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentTypeColor(selectedPayment.payment_type)}`}>
                  {paymentTypes.find(t => t.value === selectedPayment.payment_type)?.label || selectedPayment.payment_type}
                </span>
              </div>
              
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Method</p>
                <div className="flex items-center gap-2">
                  {getPaymentMethodIcon(selectedPayment.payment_method)}
                  <span className="text-[var(--color-text)]">
                    {paymentMethods.find(m => m.value === selectedPayment.payment_method)?.label || selectedPayment.payment_method}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedPayment.status)}`}>
                  {getPaymentStatusIcon(selectedPayment.status)}
                  <span className="ml-1">
                    {paymentStatus.find(s => s.value === selectedPayment.status)?.label || selectedPayment.status}
                  </span>
                </span>
              </div>
              
              {selectedPayment.description && (
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Description</p>
                  <p className="text-[var(--color-text)]">{selectedPayment.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentManagement
