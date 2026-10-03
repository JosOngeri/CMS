import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Building, LogOut, Menu, X, LayoutDashboard, BarChart3, HeartPulse, ScrollText, ShieldCheck, Settings } from 'lucide-react'
import { useState, useEffect, lazy, Suspense } from 'react'
import { FullPageLoading } from '../components/common/Loading'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import NestedNav from '../components/common/NestedNav'

// Lazy-loaded platform pages — same pattern as dashboard.routes.jsx
const PlatformDashboard = lazy(() => import('../pages/platform/PlatformDashboard'))
const TenantList        = lazy(() => import('../pages/platform/tenants/TenantList'))
const TenantDetail      = lazy(() => import('../pages/platform/tenants/TenantDetail'))
const TenantCreate      = lazy(() => import('../pages/platform/tenants/TenantCreate'))
const TenantSettings    = lazy(() => import('../pages/platform/tenants/TenantSettings'))
const PlatformAnalytics  = lazy(() => import('../pages/platform/PlatformAnalytics'))
const PlatformMonitoring = lazy(() => import('../pages/platform/PlatformMonitoring'))
const PlatformAuditLog   = lazy(() => import('../pages/platform/PlatformAuditLog'))
const PlatformUsers      = lazy(() => import('../pages/platform/PlatformUsers'))
const PlatformSettings   = lazy(() => import('../pages/platform/PlatformSettings'))

const PlatformShell = () => {
  const navigate = useNavigate()
  const { api } = useAuth()
  const toast = useToast()
  // Sidebar starts closed; on lg+ it renders static (always visible), below lg
  // it becomes an overlay drawer toggled by the menu button.
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  const isOwner = platformUser?.role === 'platform_owner'
  // NestedNav sections — Churches nests its sub-pages (detail/edit routes
  // resolve to the parent via prefix matching).
  const navigation = [
    {
      title: null,
      items: [
        { path: '/platform', icon: LayoutDashboard, label: 'Dashboard' },
      ],
    },
    {
      title: 'Tenants',
      items: [
        {
          path: '/platform/tenants', icon: Building, label: 'Churches',
          children: [
            { path: '/platform/tenants/create', label: 'New Church' },
          ],
        },
      ],
    },
    {
      title: 'Insights',
      items: [
        { path: '/platform/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/platform/monitoring', icon: HeartPulse, label: 'Monitoring' },
        { path: '/platform/audit', icon: ScrollText, label: 'Audit Log' },
      ],
    },
    {
      title: 'System',
      items: [
        ...(isOwner ? [{ path: '/platform/admins', icon: ShieldCheck, label: 'Admins' }] : []),
        { path: '/platform/settings', icon: Settings, label: 'Settings' },
      ],
    },
  ]

  if (checkingSession) {
    return <FullPageLoading message="Checking platform session..." />
  }

  if (!platformUser) {
    return <Navigate to="/platform/login" replace />
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Backdrop for the mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--color-overlay)] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — overlay drawer below lg, static column at lg+ */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center space-x-2">
              <Building className="h-6 w-6 text-[var(--color-primary)]" />
              <span className="font-bold text-[var(--color-text)]">Platform Admin</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-[var(--color-surface)] rounded-lg lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-[var(--color-text)]" />
            </button>
          </div>

          {/* Navigation — nested sub-sidebars, same component as the app sidebar */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NestedNav sections={navigation} dense onNavigate={() => setSidebarOpen(false)} />
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-[var(--color-border)]">
            {platformUser && (
              <div className="mb-4">
                <p className="text-sm font-medium text-[var(--color-text)]">{platformUser.name}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">{platformUser.email}</p>
                <p className="text-xs text-[var(--color-primary)] capitalize">{platformUser.role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content — full width on mobile, offset by sidebar at lg+ */}
      <div className="transition-all duration-300 lg:ml-64">
        {/* Top Bar */}
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[var(--color-surface)] rounded-lg lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-[var(--color-text)]" />
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-[var(--color-textSecondary)]">Platform Admin Dashboard</span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <Suspense fallback={<FullPageLoading message="Loading..." />}>
            <Routes>
              <Route index element={<PlatformDashboard />} />
              <Route path="tenants" element={<TenantList />} />
              <Route path="tenants/create" element={<TenantCreate />} />
              <Route path="tenants/:id" element={<TenantDetail />} />
              <Route path="tenants/:id/edit" element={<TenantSettings />} />
              <Route path="analytics" element={<PlatformAnalytics />} />
              <Route path="monitoring" element={<PlatformMonitoring />} />
              <Route path="audit" element={<PlatformAuditLog />} />
              <Route path="admins" element={<PlatformUsers />} />
              <Route path="settings" element={<PlatformSettings />} />
              <Route path="*" element={<Navigate to="/platform" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default PlatformShell
