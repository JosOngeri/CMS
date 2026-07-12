import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  BarChart3, TrendingUp, TrendingDown, AlertTriangle,
  RefreshCw, Calendar, DollarSign
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const Budgets = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState([])
  const [filteredBudgets, setFilteredBudgets] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterYear, setFilterYear] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [funds, setFunds] = useState([])
  const [accounts, setAccounts] = useState([])
  const [formData, setFormData] = useState({
    budget_name: '',
    fiscal_year: new Date().getFullYear(),
    fund_id: '',
    account_id: '',
    budgeted_amount: '',
    period_type: 'annual'
  })

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' }
  ]

  useEffect(() => {
    fetchBudgets()
    fetchFunds()
    fetchAccounts()
  }, [])

  useEffect(() => {
    filterBudgets()
  }, [searchTerm, filterYear, filterStatus, budgets])

  const fetchBudgets = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/budgets')
      if (response.data) {
        setBudgets(response.data.budgets || [])
      }
    } catch (error) {
      console.error('Failed to fetch budgets:', error)
      toast.error('Failed to load budgets')
    } finally {
      setLoading(false)
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

  const filterBudgets = () => {
    let filtered = [...budgets]

    if (searchTerm) {
      filtered = filtered.filter(budget =>
        budget.budget_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterYear !== 'all') {
      filtered = filtered.filter(budget => budget.fiscal_year === parseInt(filterYear))
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(budget => budget.status === filterStatus)
    }

    setFilteredBudgets(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingBudget) {
        await api.put(`/treasury/budgets/${editingBudget.id}`, formData)
        toast.success('Budget updated successfully')
      } else {
        await api.post('/treasury/budgets', formData)
        toast.success('Budget created successfully')
      }
      setShowForm(false)
      setEditingBudget(null)
      resetForm()
      fetchBudgets()
    } catch (error) {
      console.error('Failed to save budget:', error)
      toast.error('Failed to save budget')
    }
  }

  const resetForm = () => {
    setFormData({
      budget_name: '',
      fiscal_year: new Date().getFullYear(),
      fund_id: '',
      account_id: '',
      budgeted_amount: '',
      period_type: 'annual'
    })
  }

  const handleEdit = (budget) => {
    setEditingBudget(budget)
    setFormData({
      budget_name: budget.budget_name,
      fiscal_year: budget.fiscal_year,
      fund_id: budget.fund_id || '',
      account_id: budget.account_id || '',
      budgeted_amount: budget.budgeted_amount,
      period_type: budget.period_type
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      try {
        await api.delete(`/treasury/budgets/${id}`)
        toast.success('Budget deleted successfully')
        fetchBudgets()
      } catch (error) {
        console.error('Failed to delete budget:', error)
        toast.error('Failed to delete budget')
      }
    }
  }

  const getVarianceColor = (variance) => {
    if (variance > 0) return 'text-green-600'
    if (variance < 0) return 'text-red-600'
    return 'text-[var(--color-textSecondary)]'
  }

  const getVarianceIcon = (variance) => {
    if (variance > 0) return TrendingUp
    if (variance < 0) return TrendingDown
    return null
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-700'
      case 'active': return 'bg-green-100 text-green-700'
      case 'closed': return 'bg-[var(--color-surface)] text-[var(--color-text)]'
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]'
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading budgets..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">Budgets</h1>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            Budget planning and variance tracking
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Budget</span>
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
                  placeholder="Search budgets..."
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
              onClick={fetchBudgets}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                  Fiscal Year
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                >
                  <option value="all">All Years</option>
                  {[2024, 2025, 2026, 2027].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
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
            </div>
          )}
        </div>
      </Card>

      {/* Budgets List */}
      <Card>
        {filteredBudgets.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredBudgets.map((budget) => {
              const variance = budget.budgeted_amount - budget.actual_amount
          const variancePercentage = budget.budgeted_amount > 0 
            ? ((variance / budget.budgeted_amount) * 100).toFixed(1)
            : 0
          const VarianceIcon = getVarianceIcon(variance)
          
          return (
            <div
              key={budget.id}
              className="p-4 hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)]/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-purple-100 bg-purple-900/20 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text)] text-white">
                      {budget.budget_name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                        FY {budget.fiscal_year}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(budget.status)}`}>
                        {budget.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Budgeted</p>
                    <p className="font-semibold text-[var(--color-text)] text-white">
                      KES {parseFloat(budget?.budgeted_amount ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Actual</p>
                    <p className="font-semibold text-[var(--color-text)] text-white">
                      KES {parseFloat(budget?.actual_amount ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Variance</p>
                    <div className="flex items-center justify-end space-x-1">
                      {VarianceIcon && <VarianceIcon className={`h-4 w-4 ${getVarianceColor(variance)}`} />}
                      <p className={`font-semibold ${getVarianceColor(variance)}`}>
                        KES {Math.abs(variance ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <p className={`text-xs ${getVarianceColor(variance)}`}>
                      {variancePercentage}%
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-400 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
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
            icon={BarChart3}
            title="No budgets found"
            description="Create your first budget to start tracking expenses."
          />
        )}
      </Card>

      {/* Budget Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)] text-white mb-4">
                {editingBudget ? 'Edit Budget' : 'Add Budget'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Budget Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.budget_name}
                    onChange={(e) => setFormData({ ...formData, budget_name: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Fiscal Year
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.fiscal_year}
                      onChange={(e) => setFormData({ ...formData, fiscal_year: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Period Type
                    </label>
                    <select
                      value={formData.period_type}
                      onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    >
                      <option value="annual">Annual</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
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
                    Account
                  </label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  >
                    <option value="">No Account</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_number} - {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Budgeted Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.budgeted_amount}
                    onChange={(e) => setFormData({ ...formData, budgeted_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingBudget(null)
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
                    {editingBudget ? 'Update' : 'Create'}
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

export default Budgets
