import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  RefreshCw, CheckCircle, Clock, Banknote, CreditCard
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const BankReconciliations = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [reconciliations, setReconciliations] = useState([])
  const [filteredReconciliations, setFilteredReconciliations] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingReconciliation, setEditingReconciliation] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    reconciliation_number: '',
    bank_account: '',
    statement_date: '',
    statement_balance: '',
    book_balance: '',
    reconciliation_date: ''
  })

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'out_of_balance', label: 'Out of Balance' }
  ]

  useEffect(() => {
    fetchReconciliations()
  }, [])

  useEffect(() => {
    filterReconciliations()
  }, [searchTerm, filterStatus, reconciliations])

  const fetchReconciliations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/bank-reconciliations')
      if (response.data) {
        setReconciliations(response.data.reconciliations || [])
      }
    } catch (error) {
      console.error('Failed to fetch reconciliations:', error)
      toast.error('Failed to load reconciliations')
    } finally {
      setLoading(false)
    }
  }

  const filterReconciliations = () => {
    let filtered = [...reconciliations]

    if (searchTerm) {
      filtered = filtered.filter(reconciliation =>
        reconciliation.reconciliation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reconciliation.bank_account?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(reconciliation => reconciliation.status === filterStatus)
    }

    setFilteredReconciliations(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingReconciliation) {
        await api.put(`/treasury/bank-reconciliations/${editingReconciliation.id}`, formData)
        toast.success('Reconciliation updated successfully')
      } else {
        await api.post('/treasury/bank-reconciliations', formData)
        toast.success('Reconciliation created successfully')
      }
      setShowForm(false)
      setEditingReconciliation(null)
      resetForm()
      fetchReconciliations()
    } catch (error) {
      console.error('Failed to save reconciliation:', error)
      toast.error('Failed to save reconciliation')
    }
  }

  const resetForm = () => {
    setFormData({
      reconciliation_number: '',
      bank_account: '',
      statement_date: '',
      statement_balance: '',
      book_balance: '',
      reconciliation_date: ''
    })
  }

  const handleEdit = (reconciliation) => {
    setEditingReconciliation(reconciliation)
    setFormData({
      reconciliation_number: reconciliation.reconciliation_number,
      bank_account: reconciliation.bank_account,
      statement_date: reconciliation.statement_date,
      statement_balance: reconciliation.statement_balance,
      book_balance: reconciliation.book_balance,
      reconciliation_date: reconciliation.reconciliation_date
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this reconciliation?')) {
      try {
        await api.delete(`/treasury/bank-reconciliations/${id}`)
        toast.success('Reconciliation deleted successfully')
        fetchReconciliations()
      } catch (error) {
        console.error('Failed to delete reconciliation:', error)
        toast.error('Failed to delete reconciliation')
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'out_of_balance': return 'bg-red-100 text-red-700'
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]'
    }
  }

  const calculateDifference = (statementBalance, bookBalance) => {
    return parseFloat(statementBalance || 0) - parseFloat(bookBalance || 0)
  }

  if (loading) {
    return <FullPageLoading message="Loading reconciliations..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">Bank Reconciliations</h1>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            Bank statement reconciliation process
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Reconciliation</span>
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
                  placeholder="Search reconciliations..."
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
              onClick={fetchReconciliations}
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

      {/* Reconciliations List */}
      <Card>
        {filteredReconciliations.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredReconciliations.map((reconciliation) => {
              const difference = calculateDifference(reconciliation.statement_balance, reconciliation.book_balance)
              const isBalanced = Math.abs(difference) < 0.01
              return (
                <div
                  key={reconciliation.id}
                  className="p-4 hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 ${isBalanced ? 'bg-green-100 bg-green-900/20' : 'bg-red-100 bg-red-900/20'} rounded-lg`}>
                        <Banknote className={`h-5 w-5 ${isBalanced ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)] text-white">
                          {reconciliation.reconciliation_number}
                        </p>
                        <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                          {reconciliation.bank_account}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(reconciliation.status)}`}>
                            {reconciliation.status}
                          </span>
                          <span className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                            Statement: {reconciliation.statement_date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Statement</p>
                        <p className="font-semibold text-[var(--color-text)] text-white">
                          KES {parseFloat(reconciliation?.statement_balance ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Book</p>
                        <p className="font-semibold text-[var(--color-text)] text-white">
                          KES {parseFloat(reconciliation?.book_balance ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className={`text-right ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Difference</p>
                        <p className="font-semibold">
                          KES {Math.abs(difference ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(reconciliation)}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-400 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(reconciliation.id)}
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
            icon={Banknote}
            title="No reconciliations found"
            description="Create your first bank reconciliation to start tracking account balances."
          />
        )}
      </Card>

      {/* Reconciliation Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)] text-white mb-4">
                {editingReconciliation ? 'Edit Reconciliation' : 'New Reconciliation'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Reconciliation Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.reconciliation_number}
                    onChange={(e) => setFormData({ ...formData, reconciliation_number: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Bank Account
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Statement Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.statement_date}
                      onChange={(e) => setFormData({ ...formData, statement_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Reconciliation Date
                    </label>
                    <input
                      type="date"
                      value={formData.reconciliation_date}
                      onChange={(e) => setFormData({ ...formData, reconciliation_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Statement Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.statement_balance}
                      onChange={(e) => setFormData({ ...formData, statement_balance: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Book Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.book_balance}
                      onChange={(e) => setFormData({ ...formData, book_balance: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingReconciliation(null)
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
                    {editingReconciliation ? 'Update' : 'Create'}
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

export default BankReconciliations
