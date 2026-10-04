/**
 * WHAT THIS FILE DOES
 * -------------------
 * The shell for the SaaS platform console (/platform/*). It guards the
 * platform session, renders the primary rail + sub-sidebar navigation
 * (same pattern as the church Sidebar), and hosts the lazy-loaded
 * platform pages.
 *
 * Navigation lives in constants/platformNav.js — rail entries whose
 * `sections` open a second panel; every panel section is one of the 13
 * SaaS function areas. Every link resolves to a real page — the
 * PlatformRoadmap placeholder was retired once all areas shipped.
 *
 * FILES IT TALKS TO
 * -----------------
 * - constants/platformNav.js            → rail entries + panel sections
 * - components/common/NestedNav.jsx     → recursive nav inside the panel
 * - pages/platform/*                    → the routed pages below
 * - backend/routes/platform.routes.js   → /api/platform/* session calls
 */
import { Navigate, Route, Routes, useNavigate, useLocation, Link } from 'react-router-dom'
import { Building2, LogOut, Menu, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { useState, useEffect, lazy, Suspense } from 'react'
import { FullPageLoading } from '../components/common/Loading'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import NestedNav from '../components/common/NestedNav'
import buildPlatformNav from '../constants/platformNav'
import PlatformMfaSetup from '../pages/platform/PlatformMfaSetup'

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
const PlatformTenantAdmin = lazy(() => import('../pages/platform/PlatformTenantAdmin'))
const PlatformFleet      = lazy(() => import('../pages/platform/PlatformFleet'))
const PlatformPayments   = lazy(() => import('../pages/platform/PlatformPayments'))
const PlatformSecurity   = lazy(() => import('../pages/platform/PlatformSecurity'))
const PlatformData       = lazy(() => import('../pages/platform/PlatformData'))
const PlatformIncidents  = lazy(() => import('../pages/platform/PlatformIncidents'))
const PlatformBilling    = lazy(() => import('../pages/platform/PlatformBilling'))
const PlatformComms      = lazy(() => import('../pages/platform/PlatformComms'))
const PlatformSupport    = lazy(() => import('../pages/platform/PlatformSupport'))
const PlatformConfig     = lazy(() => import('../pages/platform/PlatformConfig'))

// True when the route is the item itself or any descendant — mirrors the
// helpers inside Sidebar/NestedNav so the rail can highlight the group
// that contains the current page.
const pathActive = (pathname, item) =>
  (item.path && (pathname === item.path || pathname.startsWith(item.path + '/'))) ||
  (item.children?.some((child) => pathActive(pathname, child)) ?? false)

const sectionsContainPath = (sections, pathname) =>
  sections.some((section) => section.items.some((item) => pathActive(pathname, item)))

const PlatformShell = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const { api } = useAuth()
  const toast = useToast()
  // Sidebar starts closed; on lg+ it renders static (always visible), below lg
  // it becomes an overlay drawer toggled by the menu button.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [platformUser, setPlatformUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [activeKey, setActiveKey] = useState(null)

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
  const entries = buildPlatformNav({ isOwner })
    .map((entry) => {
      if (!entry.sections) return entry
      const sections = entry.sections
        .map((section) => ({ ...section, items: section.items.filter((item) => !item.ownerOnly || isOwner) }))
        .filter((section) => section.items.length > 0)
      return sections.length ? { ...entry, sections } : null
    })
    .filter(Boolean)

  const activeEntry = entries.find((e) => e.key === activeKey && e.sections)

  // Keep the panel synced with the route: navigating into a group's page
  // opens that group; navigating to a direct link closes the panel.
  useEffect(() => {
    const match = entries.find(
      (e) => e.sections && sectionsContainPath(e.sections, pathname)
    )
    setActiveKey(match?.key ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  if (checkingSession) {
    return <FullPageLoading message="Checking platform session..." />
  }

  if (!platformUser) {
    return <Navigate to="/platform/login" replace />
  }

  // mfa_required-but-not-enrolled: the middleware already confines the
  // session to setup endpoints — the UI replaces the console entirely.
  if (platformUser.mfa_pending) {
    return (
      <PlatformMfaSetup
        email={platformUser.email}
        onComplete={() => setPlatformUser({ ...platformUser, mfa_pending: false })}
      />
    )
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

      {/* Sidebar — on desktop the primary rail retreats to icons when a
          sub-sidebar is open: w-20 icon rail + w-64 panel = lg:w-[21rem].
          Mobile keeps the full w-64 drawer; the panel covers it anyway. */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] transform transition-[transform,width] duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${activeEntry ? 'lg:w-[21rem]' : 'lg:w-64'}`}>
        <div className="relative flex h-full">
        <div className={`w-64 flex-shrink-0 flex flex-col h-full min-h-0 ${activeEntry ? 'lg:w-20' : 'lg:w-64'}`}>
          {/* Header — icon-only (centered mark) when the rail has retreated */}
          <div className={`flex items-center justify-between p-4 border-b border-[var(--color-border)] ${activeEntry ? 'lg:justify-center lg:px-2' : ''}`}>
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 shrink-0 text-[var(--color-primary)]" />
              <span className={`font-bold text-[var(--color-text)] truncate ${activeEntry ? 'lg:hidden' : ''}`}>Platform Admin</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-[var(--color-surface)] rounded-lg lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-[var(--color-text)]" />
            </button>
          </div>

          {/* Primary rail — top-level entries only. Leaf entries navigate
              directly; group entries open the sub-sidebar panel beside them. */}
          <nav className={`flex-1 min-h-0 p-4 overflow-y-auto overscroll-contain ${activeEntry ? 'lg:px-2' : ''}`}>
            <ul className="space-y-1.5">
              {entries.map((entry) => {
                const Icon = entry.icon
                const isGroup = Boolean(entry.sections)
                const selfActive = Boolean(entry.path) && (pathname === entry.path || pathname.startsWith(entry.path + '/'))
                const descendantActive = isGroup && sectionsContainPath(entry.sections, pathname)
                const classes = selfActive
                  ? 'bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] text-[var(--color-primary)]'
                  : descendantActive || activeKey === entry.key
                    ? 'text-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
                    : 'text-[var(--color-text)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
                const inner = (
                  <>
                    <span className={`p-1.5 rounded-lg ${activeEntry ? 'lg:mx-auto' : 'mr-3'} bg-[var(--color-background)]`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={`flex-1 min-w-0 truncate ${activeEntry ? 'lg:hidden' : ''}`}>{entry.label}</span>
                    {isGroup && (
                      <ChevronRight
                        aria-hidden="true"
                        className={`h-4 w-4 ml-2 transition-transform duration-200 ${
                          activeKey === entry.key ? 'rotate-90' : ''
                        } text-[var(--color-textSecondary)] ${activeEntry ? 'lg:hidden' : ''}`}
                      />
                    )}
                  </>
                )
                const itemClasses = `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 ${classes} ${
                  activeEntry ? 'lg:justify-center lg:px-0' : ''
                }`
                return (
                  <li key={entry.key}>
                    {isGroup ? (
                      <button
                        type="button"
                        // text-left: <button> centers text by default,
                        // which would misalign group labels vs the links.
                        className={`w-full text-left ${itemClasses}`}
                        onClick={() => setActiveKey(activeKey === entry.key ? null : entry.key)}
                        aria-expanded={activeKey === entry.key}
                        aria-label={entry.label}
                        title={entry.label}
                      >
                        {inner}
                      </button>
                    ) : (
                      <Link
                        to={entry.path}
                        className={itemClasses}
                        onClick={() => setSidebarOpen(false)}
                        aria-current={selfActive ? 'page' : undefined}
                        aria-label={entry.label}
                        title={entry.label}
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User info & logout — initials + icon button when collapsed */}
          <div className={`p-4 border-t border-[var(--color-border)] ${activeEntry ? 'lg:p-2' : ''}`}>
            <div className={`mb-4 ${activeEntry ? 'lg:text-center' : ''}`}>
              <p className={`text-sm font-medium text-[var(--color-text)] truncate ${activeEntry ? 'lg:hidden' : ''}`}>{platformUser.name}</p>
              <p className={`text-xs text-[var(--color-textSecondary)] truncate ${activeEntry ? 'lg:hidden' : ''}`}>{platformUser.email}</p>
              <p className={`text-xs text-[var(--color-primary)] capitalize ${activeEntry ? 'lg:text-[0.6rem]' : ''}`}>
                {platformUser.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-2 text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded-lg transition-colors ${activeEntry ? 'lg:px-0' : ''}`}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className={activeEntry ? 'lg:hidden' : ''}>Logout</span>
            </button>
          </div>
        </div>

        {/* Sub-sidebar — the panel a rail group opens. Desktop: flex
            sibling beside the icon rail. Mobile: slides over the drawer. */}
        {activeEntry && (
          <div className="absolute inset-0 z-10 lg:static lg:z-auto flex-1 min-w-0 bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col">
            <div className="flex items-center gap-2 px-4 py-5 border-b border-[var(--color-border)]">
              <button
                onClick={() => setActiveKey(null)}
                className="lg:hidden p-1 -ml-1 text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                aria-label="Back to menu"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <activeEntry.icon className="h-5 w-5 text-[var(--color-primary)]" />
              <h2 className="flex-1 min-w-0 truncate text-sm font-semibold text-[var(--color-text)] uppercase tracking-wider">
                {activeEntry.label}
              </h2>
              <button
                onClick={() => setActiveKey(null)}
                className="hidden lg:block p-1 text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 min-h-0 p-4 overflow-y-auto overscroll-contain">
              <NestedNav sections={activeEntry.sections} dense onNavigate={() => setSidebarOpen(false)} />
            </nav>
          </div>
        )}
        </div>
      </div>

      {/* Main Content — margin widens to match the open panel on desktop */}
      <div className={`transition-all duration-300 ${activeEntry ? 'lg:ml-[21rem]' : 'lg:ml-64'}`}>
        {/* Top Bar — sticky so it stays frozen while page content scrolls */}
        <div className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4">
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
              <Route path="tenant-admin" element={<PlatformTenantAdmin />} />
              <Route path="fleet" element={<PlatformFleet />} />
              <Route path="payments" element={<PlatformPayments />} />
              <Route path="security" element={<PlatformSecurity />} />
              <Route path="data" element={<PlatformData />} />
              <Route path="incidents" element={<PlatformIncidents />} />
              <Route path="billing" element={<PlatformBilling />} />
              <Route path="comms" element={<PlatformComms />} />
              <Route path="support" element={<PlatformSupport />} />
              <Route path="config" element={<PlatformConfig />} />
              <Route path="*" element={<Navigate to="/platform" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default PlatformShell
