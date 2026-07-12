import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  Heart, RefreshCw, CheckCircle, Clock, DollarSign
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const Pledges = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [pledges, setPledges] = useState([])
  const [filteredPledges, setFilteredPledges] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingPledge, setEditingPledge] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [members, setMembers] = useState([])
  const [formData, setFormData] = useState({
    pledge_number: '',
    member_id: '',
    campaign_id: '',
    pledge_amount: '',
    pledge_date: '',
    end_date: '',
    payment_frequency: 'monthly'
  })

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  useEffect(() => {
    fetchPledges()
    fetchCampaigns()
    fetchMembers()
  }, [])

  useEffect(() => {
    filterPledges()
  }, [searchTerm, filterStatus, pledges])

  const fetchPledges = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/pledges')
      if (response.data) {
        setPledges(response.data.pledges || [])
      }
    } catch (error) {
      console.error('Failed to fetch pledges:', error)
      toast.error('Failed to load pledges')
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/treasury/campaigns')
      if (response.data) {
        setCampaigns(response.data.campaigns || [])
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    }
  }

  const fetchMembers = async () => {
    try {
      const response = await api.get('/users/directory')
      if (response.data) {
        setMembers(response.data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    }
  }

  const filterPledges = () => {
    let filtered = [...pledges]

    if (searchTerm) {
      filtered = filtered.filter(pledge =>
        pledge.pledge_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pledge.member_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(pledge => pledge.status === filterStatus)
    }

    setFilteredPledges(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingPledge) {
        await api.put(`/treasury/pledges/${editingPledge.id}`, formData)
        toast.success('Pledge updated successfully')
      } else {
        await api.post('/treasury/pledges', formData)
        toast.success('Pledge created successfully')
      }
      setShowForm(false)
      setEditingPledge(null)
      resetForm()
      fetchPledges()
    } catch (error) {
      console.error('Failed to save pledge:', error)
      toast.error('Failed to save pledge')
    }
  }

  const resetForm = () => {
    setFormData({
      pledge_number: '',
      member_id: '',
      campaign_id: '',
      pledge_amount: '',
      pledge_date: '',
      end_date: '',
      payment_frequency: 'monthly'
    })
  }

  const handleEdit = (pledge) => {
    setEditingPledge(pledge)
    setFormData({
      pledge_number: pledge.pledge_number,
      member_id: pledge.member_id || '',
      campaign_id: pledge.campaign_id || '',
      pledge_amount: pledge.pledge_amount || '',
      pledge_date: pledge.pledge_date || '',
      end_date: pledge.end_date || '',
      payment_frequency: pledge.payment_frequency || 'monthly'
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this pledge?')) {
      try {
        await api.delete(`/treasury/pledges/${id}`)
        toast.success('Pledge deleted successfully')
        fetchPledges()
      } catch (error) {
        console.error('Failed to delete pledge:', error)
        toast.error('Failed to delete pledge')
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'completed': return 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return Clock
      case 'completed': return CheckCircle
      default: return Clock
    }
  }

  const calculateProgress = (pledge) => {
    if (!pledge.pledge_amount || pledge.pledge_amount === 0) return 0
    return ((pledge.amount_paid || 0) / parseFloat(pledge.pledge_amount)) * 100
  }

  if (loading) {
    return <FullPageLoading message="Loading pledges..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] ">Pledges</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Track member pledges and payment commitments
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Pledge</span>
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
                  placeholder="Search pledges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={fetchPledges}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
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

      {/* Pledges List */}
      <Card>
        {filteredPledges.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)] ">
            {filteredPledges.map((pledge) => {
              const StatusIcon = getStatusIcon(pledge.status)
              const progress = calculateProgress(pledge)
              return (
                <div
                  key={pledge.id}
                  className="p-4 hover:bg-[var(--color-background)] /50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <Heart className="h-5 w-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)] ">
                          {pledge.pledge_number}
                        </p>
                        <p className="text-sm text-[var(--color-textSecondary)]">
                          {pledge.member_name}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(pledge.status)}`}>
                            {pledge.status}
                          </span>
                          {pledge.campaign_name && (
                            <span className="text-xs text-[var(--color-textSecondary)]">
                              {pledge.campaign_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-[var(--color-textSecondary)]">Pledged</p>
                        <p className="font-semibold text-[var(--color-text)] ">
                          KES {parseFloat(pledge?.pledge_amount ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[var(--color-textSecondary)]">Paid</p>
                        <p className="font-semibold text-[var(--color-text)] ">
                          KES {parseFloat(pledge?.amount_paid ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[var(--color-textSecondary)]">Progress</span>
                          <span className="font-semibold text-[var(--color-text)] ">
                            {(progress ?? 0).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-[var(--color-surface)]  rounded-full h-2">
                          <div
                            className="bg-[var(--color-primary)]-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(pledge)}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pledge.id)}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-red-600 transition-colors"
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
            icon={Heart}
            title="No pledges found"
            description="Create your first pledge to start tracking member commitments."
          />
        )}
      </Card>

      {/* Pledge Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)]  mb-4">
                {editingPledge ? 'Edit Pledge' : 'Add Pledge'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                    Pledge Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pledge_number}
                    onChange={(e) => setFormData({ ...formData, pledge_number: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                    Member
                  </label>
                  <select
                    required
                    value={formData.member_id}
                    onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  >
                    <option value="">Select Member</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                    Campaign
                  </label>
                  <select
                    value={formData.campaign_id}
                    onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  >
                    <option value="">No Campaign</option>
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.campaign_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                      Pledge Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.pledge_amount}
                      onChange={(e) => setFormData({ ...formData, pledge_amount: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                      Payment Frequency
                    </label>
                    <select
                      value={formData.payment_frequency}
                      onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                      <option value="one_time">One Time</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.pledge_date}
                      onChange={(e) => setFormData({ ...formData, pledge_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingPledge(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                  >
                    {editingPledge ? 'Update' : 'Create'}
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

export default Pledges
