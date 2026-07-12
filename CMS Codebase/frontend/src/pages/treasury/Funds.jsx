import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  Wallet, RefreshCw, Lock, Unlock
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const Funds = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [funds, setFunds] = useState([])
  const [filteredFunds, setFilteredFunds] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingFund, setEditingFund] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    fund_code: '',
    fund_name: '',
    fund_type: 'unrestricted',
    description: '',
    purpose: '',
    start_date: '',
    end_date: ''
  })

  const fundTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'unrestricted', label: 'Unrestricted' },
    { value: 'restricted', label: 'Restricted' },
    { value: 'temporarily_restricted', label: 'Temporarily Restricted' }
  ]

  useEffect(() => {
    fetchFunds()
  }, [])

  useEffect(() => {
    filterFunds()
  }, [searchTerm, filterType, funds])

  const fetchFunds = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/funds')
      if (response.data) {
        setFunds(response.data.funds || [])
      }
    } catch (error) {
      console.error('Failed to fetch funds:', error)
      toast.error('Failed to load funds')
    } finally {
      setLoading(false)
    }
  }

  const filterFunds = () => {
    let filtered = [...funds]

    if (searchTerm) {
      filtered = filtered.filter(fund =>
        fund.fund_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fund.fund_code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(fund => fund.fund_type === filterType)
    }

    setFilteredFunds(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingFund) {
        await api.put(`/treasury/funds/${editingFund.id}`, formData)
        toast.success('Fund updated successfully')
      } else {
        await api.post('/treasury/funds', formData)
        toast.success('Fund created successfully')
      }
      setShowForm(false)
      setEditingFund(null)
      resetForm()
      fetchFunds()
    } catch (error) {
      console.error('Failed to save fund:', error)
      toast.error('Failed to save fund')
    }
  }

  const resetForm = () => {
    setFormData({
      fund_code: '',
      fund_name: '',
      fund_type: 'unrestricted',
      description: '',
      purpose: '',
      start_date: '',
      end_date: ''
    })
  }

  const handleEdit = (fund) => {
    setEditingFund(fund)
    setFormData({
      fund_code: fund.fund_code,
      fund_name: fund.fund_name,
      fund_type: fund.fund_type,
      description: fund.description || '',
      purpose: fund.purpose || '',
      start_date: fund.start_date || '',
      end_date: fund.end_date || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this fund?')) {
      try {
        await api.delete(`/treasury/funds/${id}`)
        toast.success('Fund deleted successfully')
        fetchFunds()
      } catch (error) {
        console.error('Failed to delete fund:', error)
        toast.error('Failed to delete fund')
      }
    }
  }

  const getFundTypeColor = (type) => {
    switch (type) {
      case 'unrestricted': return 'bg-green-100 text-green-700'
      case 'restricted': return 'bg-red-100 text-red-700'
      case 'temporarily_restricted': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]'
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading funds..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">Funds</h1>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            Manage restricted and unrestricted funds
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Fund</span>
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
                  placeholder="Search funds..."
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
              onClick={fetchFunds}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                Fund Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
              >
                {fundTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Funds List */}
      <Card>
        {filteredFunds.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredFunds.map((fund) => (
              <div
                key={fund.id}
                className="p-4 hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-purple-100 bg-purple-900/20 rounded-lg">
                      <Wallet className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text)] text-white">
                        {fund.fund_code} - {fund.fund_name}
                      </p>
                      <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                        {fund.description || 'No description'}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getFundTypeColor(fund.fund_type)}`}>
                          {fund.fund_type}
                        </span>
                        {fund.is_active ? (
                          <span className="text-xs text-green-600 flex items-center">
                            <Unlock className="h-3 w-3 mr-1" /> Active
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-textSecondary)] flex items-center">
                            <Lock className="h-3 w-3 mr-1" /> Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(fund)}
                      className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-400 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(fund.id)}
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
            icon={Wallet}
            title="No funds found"
            description="Create your first fund to start tracking designated resources."
          />
        )}
      </Card>

      {/* Fund Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)] text-white mb-4">
                {editingFund ? 'Edit Fund' : 'Add Fund'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Fund Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fund_code}
                    onChange={(e) => setFormData({ ...formData, fund_code: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Fund Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fund_name}
                    onChange={(e) => setFormData({ ...formData, fund_name: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Fund Type
                  </label>
                  <select
                    required
                    value={formData.fund_type}
                    onChange={(e) => setFormData({ ...formData, fund_type: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  >
                    <option value="unrestricted">Unrestricted</option>
                    <option value="restricted">Restricted</option>
                    <option value="temporarily_restricted">Temporarily Restricted</option>
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
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Purpose
                  </label>
                  <textarea
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
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
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingFund(null)
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
                    {editingFund ? 'Update' : 'Create'}
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

export default Funds
