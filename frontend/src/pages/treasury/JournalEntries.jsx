import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  FileText, Download, RefreshCw, ArrowRight, X
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const JournalEntries = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [filteredEntries, setFilteredEntries] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [formData, setFormData] = useState({
    entry_number: '',
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference_type: '',
    reference_id: '',
    lines: [{ account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]
  })

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'posted', label: 'Posted' },
    { value: 'reversed', label: 'Reversed' }
  ]

  useEffect(() => {
    fetchEntries()
    fetchAccounts()
  }, [])

  useEffect(() => {
    filterEntries()
  }, [searchTerm, filterStatus, filterDateFrom, filterDateTo, entries])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/journal-entries')
      if (response.data) {
        setEntries(response.data.entries || [])
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error)
      toast.error('Failed to load journal entries')
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

  const filterEntries = () => {
    let filtered = [...entries]

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(entry => entry.status === filterStatus)
    }

    if (filterDateFrom) {
      filtered = filtered.filter(entry => entry.entry_date >= filterDateFrom)
    }

    if (filterDateTo) {
      filtered = filtered.filter(entry => entry.entry_date <= filterDateTo)
    }

    setFilteredEntries(filtered)
  }

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]
    })
  }

  const removeLine = (index) => {
    if (formData.lines.length > 2) {
      const newLines = formData.lines.filter((_, i) => i !== index)
      setFormData({ ...formData, lines: newLines })
    }
  }

  const updateLine = (index, field, value) => {
    const newLines = [...formData.lines]
    newLines[index][field] = value
    setFormData({ ...formData, lines: newLines })
  }

  const validateEntries = () => {
    const totalDebit = formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0)
    const totalCredit = formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0)
    return Math.abs(totalDebit - totalCredit) < 0.01
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateEntries()) {
      toast.error('Debits and credits must be equal')
      return
    }

    try {
      if (editingEntry) {
        await api.put(`/treasury/journal-entries/${editingEntry.id}`, formData)
        toast.success('Journal entry updated successfully')
      } else {
        await api.post('/treasury/journal-entries', formData)
        toast.success('Journal entry created successfully')
      }
      setShowForm(false)
      setEditingEntry(null)
      resetForm()
      fetchEntries()
    } catch (error) {
      console.error('Failed to save entry:', error)
      toast.error('Failed to save journal entry')
    }
  }

  const resetForm = () => {
    setFormData({
      entry_number: '',
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
      reference_type: '',
      reference_id: '',
      lines: [{ account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]
    })
  }

  const handleEdit = (entry) => {
    setEditingEntry(entry)
    setFormData({
      entry_number: entry.entry_number,
      entry_date: entry.entry_date,
      description: entry.description,
      reference_type: entry.reference_type || '',
      reference_id: entry.reference_id || '',
      lines: entry.lines || [{ account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this journal entry?')) {
      try {
        await api.delete(`/treasury/journal-entries/${id}`)
        toast.success('Journal entry deleted successfully')
        fetchEntries()
      } catch (error) {
        console.error('Failed to delete entry:', error)
        toast.error('Failed to delete journal entry')
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-700'
      case 'posted': return 'bg-green-100 text-green-700'
      case 'reversed': return 'bg-red-100 text-red-700'
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]'
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading journal entries..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">Journal Entries</h1>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            Double-entry bookkeeping transactions
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Entry</span>
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
                  placeholder="Search entries..."
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
              onClick={fetchEntries}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
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
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Entries List */}
      <Card>
        {filteredEntries.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-[var(--color-primary)]-100 bg-[var(--color-primary)]-900/20 rounded-lg">
                      <FileText className="h-5 w-5 text-[var(--color-primary)]-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text)] text-white">
                        {entry.entry_number}
                      </p>
                      <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                        {entry.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                          {entry.entry_date}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(entry.status)}`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Debit</p>
                      <p className="font-semibold text-[var(--color-text)] text-white">
                        KES {(entry?.total_debit ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Credit</p>
                      <p className="font-semibold text-[var(--color-text)] text-white">
                        KES {(entry?.total_credit ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-400 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
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
            icon={FileText}
            title="No journal entries found"
            description="Create your first journal entry to get started."
          />
        )}
      </Card>

      {/* Journal Entry Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-text)] text-white">
                  {editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingEntry(null)
                    resetForm()
                  }}
                  className="p-2 hover:bg-[var(--color-surface)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Entry Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.entry_number}
                      onChange={(e) => setFormData({ ...formData, entry_number: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Entry Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.entry_date}
                      onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
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
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Reference Type
                    </label>
                    <input
                      type="text"
                      value={formData.reference_type}
                      onChange={(e) => setFormData({ ...formData, reference_type: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Reference ID
                    </label>
                    <input
                      type="text"
                      value={formData.reference_id}
                      onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>

                {/* Journal Entry Lines */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)]">
                      Entry Lines
                    </label>
                    <button
                      type="button"
                      onClick={addLine}
                      className="flex items-center space-x-1 text-sm text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Line</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.lines.map((line, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 bg-[var(--color-background)] bg-[var(--color-surface)]/50 rounded-lg">
                        <div className="flex-1">
                          <select
                            required
                            value={line.account_id}
                            onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white text-sm"
                          >
                            <option value="">Select Account</option>
                            {accounts.map(account => (
                              <option key={account.id} value={account.id}>
                                {account.account_number} - {account.account_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Debit"
                            value={line.debit_amount}
                            onChange={(e) => updateLine(index, 'debit_amount', e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white text-sm"
                          />
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Credit"
                            value={line.credit_amount}
                            onChange={(e) => updateLine(index, 'credit_amount', e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white text-sm"
                          />
                        </div>
                        {formData.lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingEntry(null)
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
                    {editingEntry ? 'Update' : 'Create'}
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

export default JournalEntries
