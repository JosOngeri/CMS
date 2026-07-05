import { useState, useEffect } from 'react'
import { Users, Settings, Megaphone, DollarSign, BarChart, Shield, Database, Image } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import { FullPageLoading } from '../../components/common/Loading'

const AdminDashboard = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPayments: 0,
    totalDepartments: 0,
    totalAnnouncements: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminStats()
  }, [])

  const fetchAdminStats = async () => {
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data.stats || {
        totalUsers: 0,
        totalPayments: 0,
        totalDepartments: 0,
        totalAnnouncements: 0
      })
    } catch (error) {
      console.error('Failed to fetch admin stats:', error)
      toast.error('Failed to load admin statistics')
    } finally {
      setLoading(false)
    }
  }

  const adminModules = [
    {
      title: 'User Management',
      description: 'Manage church members and roles',
      icon: Users,
      color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600',
      link: '/dashboard/users',
      permissions: ['Super Admin', 'Pastor', 'First Elder']
    },
    {
      title: 'Department Management',
      description: 'Create and manage church departments',
      icon: Settings,
      color: 'bg-green-100 text-green-600',
      link: '/dashboard/departments',
      permissions: ['Super Admin', 'Pastor', 'First Elder']
    },
    {
      title: 'Announcement Management',
      description: 'Manage all church announcements',
      icon: Megaphone,
      color: 'bg-purple-100 text-purple-600',
      link: '/dashboard/announcements',
      permissions: ['Super Admin', 'Pastor', 'First Elder', 'Department Head']
    },
    {
      title: 'Payment Management',
      description: 'View and manage all payments',
      icon: DollarSign,
      color: 'bg-yellow-100 text-yellow-600',
      link: '/dashboard/payment-management',
      permissions: ['Super Admin', 'Pastor', 'First Elder']
    },
    {
      title: 'Gallery Management',
      description: 'Manage photo gallery and uploads',
      icon: Image,
      color: 'bg-pink-100 text-pink-600',
      link: '/dashboard/gallery',
      permissions: ['Super Admin', 'Pastor', 'First Elder', 'Department Head']
    },
    {
      title: 'SMS Management',
      description: 'Send bulk SMS and manage templates',
      icon: BarChart,
      color: 'bg-red-100 text-red-600',
      link: '/dashboard/sms',
      permissions: ['Super Admin', 'Pastor', 'First Elder', 'Department Head']
    },
    {
      title: 'System Settings',
      description: 'Configure system settings',
      icon: Shield,
      color: 'bg-indigo-100 text-indigo-600',
      link: '/dashboard/profile-management',
      permissions: ['Super Admin']
    },
    {
      title: 'Database Management',
      description: 'Database backup and maintenance',
      icon: Database,
      color: 'bg-[var(--color-surface)] text-[var(--color-textSecondary)]',
      link: '/dashboard/admin/database',
      permissions: ['Super Admin']
    }
  ]

  const hasPermission = (permissions) => {
    if (!permissions) return true
    return user?.roles?.some(role => permissions.includes(role))
  }

  if (loading) {
    return <FullPageLoading message="Loading admin dashboard..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] text-white">
          Admin Dashboard
        </h1>
        <p className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
          System administration and management
        </p>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Total Users</p>
              <p className="text-2xl font-bold text-[var(--color-text)] text-white">
                {(stats?.totalUsers ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-[var(--color-primary)]-100 bg-[var(--color-primary)]-900 rounded-lg">
              <Users className="h-6 w-6 text-[var(--color-primary)]-600 text-[var(--color-primary)]-400" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Total Payments</p>
              <p className="text-2xl font-bold text-[var(--color-text)] text-white">
                KES {((stats?.totalPayments ?? 0) / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="p-3 bg-green-100 bg-green-900 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Departments</p>
              <p className="text-2xl font-bold text-[var(--color-text)] text-white">
                {stats.totalDepartments}
              </p>
            </div>
            <div className="p-3 bg-purple-100 bg-purple-900 rounded-lg">
              <Settings className="h-6 w-6 text-purple-600 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Announcements</p>
              <p className="text-2xl font-bold text-[var(--color-text)] text-white">
                {stats.totalAnnouncements}
              </p>
            </div>
            <div className="p-3 bg-orange-100 bg-orange-900 rounded-lg">
              <Megaphone className="h-6 w-6 text-orange-600 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Modules */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">Administration Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules
            .filter(module => hasPermission(module.permissions))
            .map((module, index) => {
              const Icon = module.icon
              return (
                <div
                  key={index}
                  className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(module.link)}
                >
                  <div className={`inline-flex p-3 rounded-lg ${module.color} mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-[var(--color-text)] text-white mb-2 group-hover:text-primary-600">
                    {module.title}
                  </h3>
                  <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                    {module.description}
                  </p>
                </div>
              )
            })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">Recent System Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-[var(--color-background)] bg-[var(--color-surface)] rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-text)] text-white">
                New user registration
              </p>
              <p className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                John Doe registered 2 hours ago
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-[var(--color-background)] bg-[var(--color-surface)] rounded-lg">
            <div className="w-2 h-2 bg-[var(--color-primary)]-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-text)] text-white">
                Payment received
              </p>
              <p className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                KES 5,000 from Jane Smith 4 hours ago
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-[var(--color-background)] bg-[var(--color-surface)] rounded-lg">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-text)] text-white">
                New announcement posted
              </p>
              <p className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                Sabbath School updates 6 hours ago
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
