import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  DollarSign, CheckCircle, XCircle, Clock, RefreshCw,
  Eye, Check, X
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const Expenses = () => {
  const { api, user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [filteredExpenses, setFilteredExpenses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [funds, setFunds] = useState([])
  const [vendors, setVendors] = useState([])
  const [departments, setDepartments] = useState([])
  const [formData, setFormData] = useState({
    expense_number: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    account_id: '',
    fund_id: '',
    department_id: '',
    vendor_id: '',
    payment_method: 'mpesa'
  })

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'paid', label: 'Paid' }
  ]

  const canApprove = user?.roles?.some(role => 
    ['Super Admin', 'Pastor', 'First Elder', 'Treasurer'].includes(role)
  )

  useEffect(() => {
    fetchExpenses()
    fetchAccounts()
    fetchFunds()
    fetchVendors()
    fetchDepartments()
  }, [])

  useEffect(() => {
    filterExpenses()
  }, [searchTerm, filterStatus, expenses])

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/expenses')
      if (response.data) {
        setExpenses(response.data.expenses || [])
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/treasury/accounts')
      if (response.data) {
        setAccounts(response.data.accounts || [])
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }

  const fetchFunds = async () => {
    try {
      const response = await api.get('/treasury/funds')
      if (response.data) {
        setFunds(response.data.funds || [])
      }
    } catch (error) {
      console.error('Failed to fetch funds:', error)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await api.get('/treasury/vendors')
      if (response.data) {
        setVendors(response.data.vendors || [])
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments')
      if (response.data) {
        setDepartments(response.data.departments || [])
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const filterExpenses = () => {
    let filtered = [...expenses]

    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.expense_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(expense => expense.status === filterStatus)
    }

    setFilteredExpenses(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingExpense) {
        await api.put(`/treasury/expenses/${editingExpense.id}`, formData)
        toast.success('Expense updated successfully')
      } else {
        await api.post('/treasury/expenses', formData)
        toast.success('Expense created successfully')
      }
      setShowForm(false)
      setEditingExpense(null)
      resetForm()
      fetchExpenses()
    } catch (error) {
      console.error('Failed to save expense:', error)
      toast.error('Failed to save expense')
    }
  }

  const resetForm = () => {
    setFormData({
      expense_number: '',
      expense_date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      account_id: '',
      fund_id: '',
      department_id: '',
      vendor_id: '',
      payment_method: 'mpesa'
    })
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setFormData({
      expense_number: expense.expense_number,
      expense_date: expense.expense_date,
      description: expense.description,
      amount: expense.amount,
      account_id: expense.account_id || '',
      fund_id: expense.fund_id || '',
      department_id: expense.department_id || '',
      vendor_id: expense.vendor_id || '',
      payment_method: expense.payment_method || 'mpesa'
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await api.delete(`/treasury/expenses/${id}`)
        toast.success('Expense deleted successfully')
        fetchExpenses()
      } catch (error) {
        console.error('Failed to delete expense:', error)
        toast.error('Failed to delete expense')
      }
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.post(`/treasury/expenses/${id}/approve`)
      toast.success('Expense approved successfully')
      fetchExpenses()
    } catch (error) {
      console.error('Failed to approve expense:', error)
      toast.error('Failed to approve expense')
    }
  }

  const handleReject = async (id) => {
    try {
      await api.post(`/treasury/expenses/${id}/reject`)
      toast.success('Expense rejected successfully')
      fetchExpenses()
    } catch (error) {
      console.error('Failed to reject expense:', error)
      toast.error('Failed to reject expense')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'approved': return 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'paid': return 'bg-green-100 text-green-700'
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock
      case 'approved': return CheckCircle
      case 'rejected': return XCircle
      case 'paid': return CheckCircle
      default: return Clock
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading expenses..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">Expenses</h1>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            Expense management and approval workflow
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Expense</span>
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
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={fetchExpenses}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
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
                className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
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

      {/* Expenses List */}
      <Card>
        {filteredExpenses.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredExpenses.map((expense) => {
              const StatusIcon = getStatusIcon(expense.status)
              return (
                <div
                  key={expense.id}
                  className="p-4 hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-orange-100 bg-orange-900/20 rounded-lg">
                        <DollarSign className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)] text-white">
                          {expense.expense_number}
                        </p>
                        <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                          {expense.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                            {expense.expense_date}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(expense.status)}`}>
                            {expense.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-semibold text-[var(--color-text)] text-white">
                          KES {parseFloat(expense?.amount ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                          {expense.payment_method}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {canApprove && expense.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(expense.id)}
                              className="p-2 text-green-600 hover:text-green-700"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReject(expense.id)}
                              className="p-2 text-red-600 hover:text-red-700"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-400 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-red-600 text-[var(--color-textSecondary)] hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={DollarSign}
            title="No expenses found"
            description="Create your first expense to start tracking spending."
          />
        )}
      </Card>

      {/* Expense Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)] text-white mb-4">
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Expense Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.expense_number}
                      onChange={(e) => setFormData({ ...formData, expense_number: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Expense Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.expense_date}
                      onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
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
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
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
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Payment Method
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    >
                      <option value="mpesa">M-Pesa</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Account
                  </label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  >
                    <option value="">Select Account</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_number} - {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Fund
                  </label>
                  <select
                    value={formData.fund_id}
                    onChange={(e) => setFormData({ ...formData, fund_id: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  >
                    <option value="">No Fund</option>
                    {funds.map(fund => (
                      <option key={fund.id} value={fund.id}>
                        {fund.fund_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  >
                    <option value="">No Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Vendor
                  </label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  >
                    <option value="">No Vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingExpense(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                  >
                    {editingExpense ? 'Update' : 'Create'}
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

export default Expenses
