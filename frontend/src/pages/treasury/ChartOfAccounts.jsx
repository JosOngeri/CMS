import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  FolderOpen, ArrowRight, Download, RefreshCw
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const ChartOfAccounts = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [filteredAccounts, setFilteredAccounts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterFund, setFilterFund] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [funds, setFunds] = useState([])
  const [formData, setFormData] = useState({
    account_number: '',
    account_name: '',
    account_type: 'asset',
    sub_type: '',
    parent_account_id: '',
    fund_id: '',
    description: ''
  })

  const accountTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'asset', label: 'Asset' },
    { value: 'liability', label: 'Liability' },
    { value: 'equity', label: 'Equity' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' }
  ]

  useEffect(() => {
    fetchAccounts()
    fetchFunds()
  }, [])

  useEffect(() => {
    filterAccounts()
  }, [searchTerm, filterType, filterFund, accounts])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/accounts')
      if (response.data) {
        setAccounts(response.data.accounts || [])
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      toast.error('Failed to load accounts')
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

  const filterAccounts = () => {
    let filtered = [...accounts]

    if (searchTerm) {
      filtered = filtered.filter(account =>
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(account => account.account_type === filterType)
    }

    if (filterFund !== 'all') {
      filtered = filtered.filter(account => account.fund_id === filterFund)
    }

    setFilteredAccounts(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAccount) {
        await api.put(`/treasury/accounts/${editingAccount.id}`, formData)
        toast.success('Account updated successfully')
      } else {
        await api.post('/treasury/accounts', formData)
        toast.success('Account created successfully')
      }
      setShowForm(false)
      setEditingAccount(null)
      setFormData({
        account_number: '',
        account_name: '',
        account_type: 'asset',
        sub_type: '',
        parent_account_id: '',
        fund_id: '',
        description: ''
      })
      fetchAccounts()
    } catch (error) {
      console.error('Failed to save account:', error)
      toast.error('Failed to save account')
    }
  }

  const handleEdit = (account) => {
    setEditingAccount(account)
    setFormData({
      account_number: account.account_number,
      account_name: account.account_name,
      account_type: account.account_type,
      sub_type: account.sub_type || '',
      parent_account_id: account.parent_account_id || '',
      fund_id: account.fund_id || '',
      description: account.description || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await api.delete(`/treasury/accounts/${id}`)
        toast.success('Account deleted successfully')
        fetchAccounts()
      } catch (error) {
        console.error('Failed to delete account:', error)
        toast.error('Failed to delete account')
      }
    }
  }

  const getAccountTypeColor = (type) => {
    switch (type) {
      case 'asset': return 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700'
      case 'liability': return 'bg-red-100 text-red-700'
      case 'equity': return 'bg-purple-100 text-purple-700'
      case 'income': return 'bg-green-100 text-green-700'
      case 'expense': return 'bg-orange-100 text-orange-700'
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]'
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading chart of accounts..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">Chart of Accounts</h1>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            Manage all financial accounts
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Account</span>
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
                  placeholder="Search accounts..."
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
              onClick={fetchAccounts}
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
                  Account Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                >
                  {accountTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                  Fund
                </label>
                <select
                  value={filterFund}
                  onChange={(e) => setFilterFund(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                >
                  <option value="all">All Funds</option>
                  {funds.map(fund => (
                    <option key={fund.id} value={fund.id}>
                      {fund.fund_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Accounts List */}
      <Card>
        {filteredAccounts.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredAccounts.map((account) => (
              <div
                key={account.id}
                className="p-4 hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${getAccountTypeColor(account.account_type)}`}>
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text)] text-white">
                        {account.account_number} - {account.account_name}
                      </p>
                      <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                        {account.description || 'No description'}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getAccountTypeColor(account.account_type)}`}>
                          {account.account_type}
                        </span>
                        {account.sub_type && (
                          <span className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                            {account.sub_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-400 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-2 text-[var(--color-textSecondary)] hover:text-red-600 text-[var(--color-textSecondary)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="No accounts found"
            description="Create your first account to get started."
          />
        )}
      </Card>

      {/* Account Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)] text-white mb-4">
                {editingAccount ? 'Edit Account' : 'Add Account'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Account Type
                  </label>
                  <select
                    required
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Sub Type
                  </label>
                  <input
                    type="text"
                    value={formData.sub_type}
                    onChange={(e) => setFormData({ ...formData, sub_type: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
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
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingAccount(null)
                      setFormData({
                        account_number: '',
                        account_name: '',
                        account_type: 'asset',
                        sub_type: '',
                        parent_account_id: '',
                        fund_id: '',
                        description: ''
                      })
                    }}
                    className="px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                  >
                    {editingAccount ? 'Update' : 'Create'}
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

export default ChartOfAccounts
