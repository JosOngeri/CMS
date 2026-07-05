import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  Building, RefreshCw, Phone, Mail, MapPin
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const Vendors = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [vendors, setVendors] = useState([])
  const [filteredVendors, setFilteredVendors] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    vendor_number: '',
    vendor_name: '',
    contact_person: '',
    phone_number: '',
    email: '',
    address: '',
    tax_id: '',
    payment_terms: '',
    notes: ''
  })

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]

  useEffect(() => {
    fetchVendors()
  }, [])

  useEffect(() => {
    filterVendors()
  }, [searchTerm, filterStatus, vendors])

  const fetchVendors = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/vendors')
      if (response.data) {
        setVendors(response.data.vendors || [])
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
      toast.error('Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  const filterVendors = () => {
    let filtered = [...vendors]

    if (searchTerm) {
      filtered = filtered.filter(vendor =>
        vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.vendor_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(vendor => 
        filterStatus === 'active' ? vendor.is_active : !vendor.is_active
      )
    }

    setFilteredVendors(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingVendor) {
        await api.put(`/treasury/vendors/${editingVendor.id}`, formData)
        toast.success('Vendor updated successfully')
      } else {
        await api.post('/treasury/vendors', formData)
        toast.success('Vendor created successfully')
      }
      setShowForm(false)
      setEditingVendor(null)
      resetForm()
      fetchVendors()
    } catch (error) {
      console.error('Failed to save vendor:', error)
      toast.error('Failed to save vendor')
    }
  }

  const resetForm = () => {
    setFormData({
      vendor_number: '',
      vendor_name: '',
      contact_person: '',
      phone_number: '',
      email: '',
      address: '',
      tax_id: '',
      payment_terms: '',
      notes: ''
    })
  }

  const handleEdit = (vendor) => {
    setEditingVendor(vendor)
    setFormData({
      vendor_number: vendor.vendor_number,
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person || '',
      phone_number: vendor.phone_number || '',
      email: vendor.email || '',
      address: vendor.address || '',
      tax_id: vendor.tax_id || '',
      payment_terms: vendor.payment_terms || '',
      notes: vendor.notes || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      try {
        await api.delete(`/treasury/vendors/${id}`)
        toast.success('Vendor deleted successfully')
        fetchVendors()
      } catch (error) {
        console.error('Failed to delete vendor:', error)
        toast.error('Failed to delete vendor')
      }
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading vendors..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">Vendors</h1>
          <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            Manage vendors and suppliers
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Vendor</span>
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
                  placeholder="Search vendors..."
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
              onClick={fetchVendors}
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

      {/* Vendors List */}
      <Card>
        {filteredVendors.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="p-4 hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-[var(--color-primary)]-100 bg-[var(--color-primary)]-900/20 rounded-lg">
                      <Building className="h-5 w-5 text-[var(--color-primary)]-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text)] text-white">
                        {vendor.vendor_number} - {vendor.vendor_name}
                      </p>
                      {vendor.contact_person && (
                        <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                          Contact: {vendor.contact_person}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-1">
                        {vendor.phone_number && (
                          <span className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {vendor.phone_number}
                          </span>
                        )}
                        {vendor.email && (
                          <span className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {vendor.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      vendor.is_active ? 'bg-green-100 text-green-700' : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                    }`}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleEdit(vendor)}
                      className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-400 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(vendor.id)}
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
            icon={Building}
            title="No vendors found"
            description="Create your first vendor to start tracking suppliers."
          />
        )}
      </Card>

      {/* Vendor Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)] text-white mb-4">
                {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Vendor Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.vendor_number}
                      onChange={(e) => setFormData({ ...formData, vendor_number: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Vendor Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.vendor_name}
                      onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-[var(--color-border)] border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] bg-[var(--color-surface)] text-[var(--color-text)] text-white"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingVendor(null)
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
                    {editingVendor ? 'Update' : 'Create'}
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

export default Vendors
