import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Building, Users, LogOut, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import PlatformDashboard from '../pages/platform/PlatformDashboard'
import TenantList from '../pages/platform/tenants/TenantList'
import TenantDetail from '../pages/platform/tenants/TenantDetail'
import TenantCreate from '../pages/platform/tenants/TenantCreate'
import TenantSettings from '../pages/platform/tenants/TenantSettings'
import { FullPageLoading } from '../components/common/Loading'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const PlatformShell = () => {
  const navigate = useNavigate()
  const { api } = useAuth()
  const toast = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [platformUser, setPlatformUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const loadPlatformSession = async () => {
      try {
        const response = await api.get('/api/platform/auth/me')
        setPlatformUser(response.data.data)
      } catch {
        navigate('/platform/login', { replace: true })
      } finally {
        setCheckingSession(false)
      }
    }
    loadPlatformSession()
  }, [navigate, api])

  const handleLogout = async () => {
    try {
      await api.post('/api/platform/auth/logout')
    } catch {
      toast.error('Unable to end the platform session')
      return
    }
    toast.success('Logged out successfully')
    navigate('/platform/login', { replace: true })
  }

  const navigation = [
    { name: 'Dashboard', href: '/platform', icon: Building },
    { name: 'Tenants', href: '/platform/tenants', icon: Users },
  ]

  if (checkingSession) {
    return <FullPageLoading message="Checking platform session..." />
  }

  if (!platformUser) {
    return <Navigate to="/platform/login" replace />
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center space-x-2">
              <Building className="h-6 w-6 text-[var(--color-primary)]-600 text-[var(--color-primary)]-400" />
              <span className="font-bold text-[var(--color-text)] text-white">Platform Admin</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-[var(--color-surface)] rounded-lg"
            >
              <Menu className="h-5 w-5 text-[var(--color-text)] text-white" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-[var(--color-text)] text-white rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-[var(--color-border)]">
            {platformUser && (
              <div className="mb-4">
                <p className="text-sm font-medium text-[var(--color-text)] text-white">{platformUser.name}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">{platformUser.email}</p>
                <p className="text-xs text-[var(--color-primary)]-600 text-[var(--color-primary)]-400 capitalize">{platformUser.role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Bar */}
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[var(--color-surface)] rounded-lg"
            >
              <Menu className="h-5 w-5 text-[var(--color-text)] text-white" />
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-[var(--color-textSecondary)]">Platform Admin Dashboard</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Routes>
            <Route index element={<PlatformDashboard />} />
            <Route path="tenants" element={<TenantList />} />
            <Route path="tenants/create" element={<TenantCreate />} />
            <Route path="tenants/:id" element={<TenantDetail />} />
            <Route path="tenants/:id/edit" element={<TenantSettings />} />
            <Route path="*" element={<Navigate to="/platform" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default PlatformShell