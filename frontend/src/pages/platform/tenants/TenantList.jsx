import { useState, useEffect } from 'react'
import {
  Search, Filter, Plus, MoreVertical, Building, Users,
  DollarSign, Activity, CheckCircle, AlertCircle, Clock
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useColorPalette } from '../../../contexts/ColorPaletteContext'
import Card from '../../../components/common/Card'
import { FullPageLoading } from '../../../components/common/Loading'
import { EmptyState } from '../../../components/common/EmptyState'

const TenantList = () => {
  const { api } = useAuth()
  const toast = useToast()
  const { colors } = useColorPalette()
  const navigate = useNavigate()
  
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)

  useEffect(() => {
    const delay = setTimeout(() => fetchTenants(), 250)
    return () => clearTimeout(delay)
  }, [page, searchTerm, statusFilter, tierFilter])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/platform/tenants', {
        params: {
          page,
          limit: 20,
          ...(searchTerm ? { search: searchTerm } : {}),
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(tierFilter !== 'all' ? { tier: tierFilter } : {})
        }
      })
      setTenants(response.data.data?.tenants || [])
      setPagination(response.data.data?.pagination || null)
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const updateFilter = (setter, value) => {
    setter(value)
    setPage(1)
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-600', icon: CheckCircle },
      suspended: { color: 'bg-red-100 text-red-600', icon: AlertCircle },
      pending: { color: 'bg-yellow-100 text-yellow-600', icon: Clock }
    }
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return <FullPageLoading message="Loading tenants..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">
            Church Tenants
          </h1>
          <p className="text-[var(--color-textSecondary)]">
            Manage all church tenants on the platform
          </p>
        </div>
        <button
          onClick={() => navigate('/platform/tenants/create')}
          className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]-600 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Church
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
            <input
              type="text"
              placeholder="Search churches..."
              value={searchTerm}
              onChange={(e) => updateFilter(setSearchTerm, e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-white placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => updateFilter(setStatusFilter, e.target.value)}
              className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={tierFilter}
              onChange={(e) => updateFilter(setTierFilter, e.target.value)}
              className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">All Tiers</option>
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tenant List */}
      {tenants.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4">
          {tenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/platform/tenants/${tenant.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 bg-blue-900 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)] text-white mb-1">
                      {tenant.name}
                    </h3>
                    <p className="text-sm text-[var(--color-textSecondary)] mb-2">
                      {tenant.slug}
                    </p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center text-[var(--color-textSecondary)]">
                        <Users className="h-4 w-4 mr-1" />
                        {tenant.user_count || 0} users
                      </span>
                      <span className="flex items-center text-[var(--color-textSecondary)]">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {tenant.subscription_tier || 'Basic'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(tenant.status)}
                  <Activity className="h-5 w-5 text-[var(--color-textSecondary)]" />
                </div>
              </div>
            </Card>
          ))}
          </div>
          {pagination && pagination.totalPages > 1 && <div className="flex items-center justify-between"><span className="text-sm text-[var(--color-textSecondary)]">Page {pagination.page} of {pagination.totalPages}</span><div className="flex gap-2"><button disabled={!pagination.hasPrev} onClick={() => setPage((current) => current - 1)} className="rounded border border-[var(--color-border)] px-3 py-2 disabled:opacity-50">Previous</button><button disabled={!pagination.hasNext} onClick={() => setPage((current) => current + 1)} className="rounded border border-[var(--color-border)] px-3 py-2 disabled:opacity-50">Next</button></div></div>}
        </div>
      ) : (
        <EmptyState
          icon={Building}
          title="No churches found"
          description={searchTerm || statusFilter !== 'all' || tierFilter !== 'all'
            ? 'Try adjusting your filters'
            : 'Get started by adding your first church tenant'}
          action={searchTerm || statusFilter !== 'all' || tierFilter !== 'all'
            ? null
            : () => navigate('/platform/tenants/create')
          }
          actionLabel="Add New Church"
        />
      )}
    </div>
  )
}

export default TenantList