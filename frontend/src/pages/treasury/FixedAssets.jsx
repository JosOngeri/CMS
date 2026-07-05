import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  Building2, RefreshCw, TrendingDown, Calendar
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const FixedAssets = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState([])
  const [filteredAssets, setFilteredAssets] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    asset_number: '',
    asset_name: '',
    asset_type: '',
    description: '',
    purchase_date: '',
    purchase_cost: '',
    salvage_value: '',
    useful_life: '',
    depreciation_method: 'straight_line'
  })

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'disposed', label: 'Disposed' }
  ]

  useEffect(() => {
    fetchAssets()
  }, [])

  useEffect(() => {
    filterAssets()
  }, [searchTerm, filterStatus, assets])

  const fetchAssets = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/fixed-assets')
      if (response.data) {
        setAssets(response.data.assets || [])
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error)
      toast.error('Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  const filterAssets = () => {
    let filtered = [...assets]

    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.asset_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(asset => asset.status === filterStatus)
    }

    setFilteredAssets(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAsset) {
        await api.put(`/treasury/fixed-assets/${editingAsset.id}`, formData)
        toast.success('Asset updated successfully')
      } else {
        await api.post('/treasury/fixed-assets', formData)
        toast.success('Asset created successfully')
      }
      setShowForm(false)
      setEditingAsset(null)
      resetForm()
      fetchAssets()
    } catch (error) {
      console.error('Failed to save asset:', error)
      toast.error('Failed to save asset')
    }
  }

  const resetForm = () => {
    setFormData({
      asset_number: '',
      asset_name: '',
      asset_type: '',
      description: '',
      purchase_date: '',
      purchase_cost: '',
      salvage_value: '',
      useful_life: '',
      depreciation_method: 'straight_line'
    })
  }

  const handleEdit = (asset) => {
    setEditingAsset(asset)
    setFormData({
      asset_number: asset.asset_number,
      asset_name: asset.asset_name,
      asset_type: asset.asset_type || '',
      description: asset.description || '',
      purchase_date: asset.purchase_date || '',
      purchase_cost: asset.purchase_cost || '',
      salvage_value: asset.salvage_value || '',
      useful_life: asset.useful_life || '',
      depreciation_method: asset.depreciation_method || 'straight_line'
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      try {
        await api.delete(`/treasury/fixed-assets/${id}`)
        toast.success('Asset deleted successfully')
        fetchAssets()
      } catch (error) {
        console.error('Failed to delete asset:', error)
        toast.error('Failed to delete asset')
      }
    }
  }

  const calculateDepreciation = (asset) => {
    if (!asset.purchase_cost || !asset.salvage_value || !asset.useful_life) return 0
    
    const cost = parseFloat(asset.purchase_cost)
    const salvage = parseFloat(asset.salvage_value)
    const life = parseFloat(asset.useful_life)
    
    if (asset.depreciation_method === 'straight_line') {
      return (cost - salvage) / life
    }
    return 0
  }

  const calculateBookValue = (asset) => {
    const accumulatedDepreciation = asset.accumulated_depreciation || 0
    return parseFloat(asset.purchase_cost || 0) - accumulatedDepreciation
  }

  if (loading) {
    return <FullPageLoading message="Loading fixed assets..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">Fixed Assets</h1>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            Asset register and depreciation tracking
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Asset</span>
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
                  placeholder="Search assets..."
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
              onClick={fetchAssets}
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

      {/* Assets List */}
      <Card>
        {filteredAssets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text)] text-white">Asset</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text)] text-white">Type</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--color-text)] text-white">Purchase Cost</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--color-text)] text-white">Acc. Depreciation</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--color-text)] text-white">Book Value</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text)] text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-b border-[var(--color-border)] border-[var(--color-border)]">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-[var(--color-text)] text-white">
                          {asset.asset_number} - {asset.asset_name}
                        </p>
                        {asset.purchase_date && (
                          <p className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                            Purchased: {asset.purchase_date}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                      {asset.asset_type || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-[var(--color-text)] text-white">
                      KES {parseFloat(asset?.purchase_cost ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-[var(--color-text)] text-white">
                      KES {parseFloat(asset?.accumulated_depreciation ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-[var(--color-text)] text-white">
                      KES {(calculateBookValue(asset) ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(asset)}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-400 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-red-600 text-[var(--color-textSecondary)] hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No assets found"
            description="Create your first fixed asset to start tracking depreciation."
          />
        )}
      </Card>

      {/* Asset Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)] text-white mb-4">
                {editingAsset ? 'Edit Asset' : 'Add Asset'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Asset Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.asset_number}
                      onChange={(e) => setFormData({ ...formData, asset_number: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Asset Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.asset_name}
                      onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Asset Type
                  </label>
                  <input
                    type="text"
                    value={formData.asset_type}
                    onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Purchase Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.purchase_cost}
                      onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Salvage Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.salvage_value}
                      onChange={(e) => setFormData({ ...formData, salvage_value: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Useful Life (years)
                    </label>
                    <input
                      type="number"
                      value={formData.useful_life}
                      onChange={(e) => setFormData({ ...formData, useful_life: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Depreciation Method
                  </label>
                  <select
                    value={formData.depreciation_method}
                    onChange={(e) => setFormData({ ...formData, depreciation_method: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  >
                    <option value="straight_line">Straight Line</option>
                    <option value="declining_balance">Declining Balance</option>
                    <option value="units_of_production">Units of Production</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingAsset(null)
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
                    {editingAsset ? 'Update' : 'Create'}
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

export default FixedAssets
