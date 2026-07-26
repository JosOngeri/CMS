import { useState, useEffect } from 'react'
import {
  ArrowLeft, Building, Users, DollarSign, Activity, Calendar,
  Settings, MoreVertical, CheckCircle, AlertCircle, Clock, Edit, Trash2
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useColorPalette } from '../../../contexts/ColorPaletteContext'
import Card from '../../../components/common/Card'
import StatsCard from '../../../components/common/StatsCard'
import { FullPageLoading } from '../../../components/common/Loading'

const TenantDetail = () => {
  const { api } = useAuth()
  const toast = useToast()
  const { colors } = useColorPalette()
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [tenant, setTenant] = useState(null)
  const [stats, setStats] = useState({
    userCount: 0,
    memberCount: 0,
    paymentCount: 0,
    departmentCount: 0
  })
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [showActions, setShowActions] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [actionReason, setActionReason] = useState('')

  useEffect(() => {
    fetchTenantDetail()
  }, [id])

  const fetchTenantDetail = async () => {
    try {
      setLoading(true)
      
      // Fetch tenant details
      const tenantResponse = await api.get(`/api/platform/tenants/${id}`)
      setTenant(tenantResponse.data.data)

      // Fetch tenant statistics
      const statsResponse = await api.get(`/api/platform/tenants/${id}/stats`)
      setStats(statsResponse.data.data || {
        userCount: 0,
        memberCount: 0,
        paymentCount: 0,
        departmentCount: 0
      })

      // Fetch tenant activity
      const activityResponse = await api.get(`/api/platform/tenants/${id}/activity`)
      setActivity(activityResponse.data.data || [])
    } catch (error) {
      console.error('Failed to fetch tenant detail:', error)
      toast.error('Failed to load tenant details')
    } finally {
      setLoading(false)
    }
  }

  const performAction = async () => {
    if (!actionReason.trim()) {
      toast.error('A reason is required')
      return
    }
    try {
      if (pendingAction === 'suspend') {
        await api.post(`/api/platform/tenants/${id}/suspend`, { reason: actionReason })
        toast.success('Church suspended successfully')
      } else if (pendingAction === 'activate') {
        await api.post(`/api/platform/tenants/${id}/activate`, { reason: actionReason })
        toast.success('Church activated successfully')
      } else if (pendingAction === 'archive') {
        await api.post(`/api/platform/tenants/${id}/archive`, { reason: actionReason })
        toast.success('Church archived successfully')
        navigate('/platform/tenants')
      }
      setPendingAction(null)
      setActionReason('')
      fetchTenantDetail()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update church status')
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading tenant details..." />
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-textSecondary)]">Church not found</p>
      </div>
    )
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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/platform/tenants')}
            className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--color-text)] text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">
              {tenant.name}
            </h1>
            <p className="text-[var(--color-textSecondary)]">
              {tenant.slug}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {getStatusBadge(tenant.status)}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-[var(--color-text)] text-white" />
            </button>
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-[var(--color-surface)] rounded-lg shadow-lg border border-[var(--color-border)] z-10">
                <button
                  onClick={() => {
                    navigate(`/platform/tenants/${id}/edit`)
                    setShowActions(false)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[var(--color-surface)] flex items-center text-[var(--color-text)] text-white"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                {tenant.status === 'active' ? (
                  <button
                    onClick={() => {
                      setPendingAction('suspend')
                      setShowActions(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-[var(--color-surface)] flex items-center text-[var(--color-text)] text-white"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Suspend
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPendingAction('activate')
                      setShowActions(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-[var(--color-surface)] flex items-center text-[var(--color-text)] text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate
                  </button>
                )}
                <button
                  onClick={() => {
                    setPendingAction('archive')
                    setShowActions(false)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-red-100 hover:text-red-600 flex items-center text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Archive
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tenant Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Users"
          value={stats.userCount}
          icon={Users}
          color="bg-blue-100 text-blue-600"
        />
        <StatsCard
          title="Members"
          value={stats.memberCount}
          icon={Users}
          color="bg-green-100 text-green-600"
        />
        <StatsCard
          title="Payments"
          value={stats.paymentCount}
          icon={DollarSign}
          color="bg-purple-100 text-purple-600"
        />
        <StatsCard
          title="Departments"
          value={stats.departmentCount}
          icon={Building}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Tenant Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">Church Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[var(--color-textSecondary)]">Church Name</label>
              <p className="text-[var(--color-text)] text-white font-medium">{tenant.name}</p>
            </div>
            <div>
              <label className="text-sm text-[var(--color-textSecondary)]">Slug</label>
              <p className="text-[var(--color-text)] text-white font-medium">{tenant.slug}</p>
            </div>
            <div>
              <label className="text-sm text-[var(--color-textSecondary)]">Subscription Tier</label>
              <p className="text-[var(--color-text)] text-white font-medium capitalize">{tenant.subscription_tier || 'Basic'}</p>
            </div>
            <div>
              <label className="text-sm text-[var(--color-textSecondary)]">Created At</label>
              <p className="text-[var(--color-text)] text-white font-medium">
                {new Date(tenant.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">Subscription Details</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[var(--color-textSecondary)]">Plan</label>
              <p className="text-[var(--color-text)] text-white font-medium capitalize">{tenant.subscription_tier || 'Basic'}</p>
            </div>
            <div>
              <label className="text-sm text-[var(--color-textSecondary)]">Billing Cycle</label>
              <p className="text-[var(--color-text)] text-white font-medium capitalize">{tenant.billing_cycle || 'Monthly'}</p>
            </div>
            <div>
              <label className="text-sm text-[var(--color-textSecondary)]">Status</label>
              <div className="mt-1">{getStatusBadge(tenant.status)}</div>
            </div>
            <div>
              <label className="text-sm text-[var(--color-textSecondary)]">Last Payment</label>
              <p className="text-[var(--color-text)] text-white font-medium">
                {tenant.last_payment_date ? new Date(tenant.last_payment_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {pendingAction && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="tenant-action-title">
        <div className="w-full max-w-md space-y-4 rounded-lg bg-[var(--color-surface)] p-6 shadow-xl">
          <h2 id="tenant-action-title" className="text-lg font-semibold text-[var(--color-text)]">Confirm {pendingAction} church</h2>
          <p className="text-sm text-[var(--color-textSecondary)]">Provide a reason. This action is recorded in the platform audit log.</p>
          <textarea value={actionReason} onChange={(event) => setActionReason(event.target.value)} rows="3" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" placeholder="Reason for this action" />
          <div className="flex justify-end gap-3"><button onClick={() => { setPendingAction(null); setActionReason('') }} className="rounded-lg border border-[var(--color-border)] px-4 py-2">Cancel</button><button onClick={performAction} className="rounded-lg bg-red-600 px-4 py-2 text-white">Confirm</button></div>
        </div>
      </div>}

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">Recent Activity</h2>
        {activity.length > 0 ? (
          <div className="space-y-4">
            {activity.map((item, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="p-2 bg-blue-100 bg-blue-900 rounded-lg">
                  <Activity className="h-4 w-4 text-blue-600 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--color-text)] text-white">{item.title}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">{item.description}</p>
                </div>
                <span className="text-sm text-[var(--color-textSecondary)]">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No recent activity</p>
          </div>
        )}
      </Card>
    </div>
  )
}

export default TenantDetail