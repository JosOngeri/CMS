import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermission } from '../hooks/usePermission'
import { Loader2 } from 'lucide-react'

const ProtectedRoute = ({
  children,
  permission,
  permissions = [],
  requireAll = false,
  redirectTo = '/login',
  requiredRoles = []
}) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { can, canAny, canAll, hasRole } = usePermission()
  const location = useLocation()

  import.meta.env.DEV && console.log('ProtectedRoute - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    import.meta.env.DEV && console.log('Not authenticated, redirecting to login')
    const redirectPath = `${redirectTo}?redirect=${encodeURIComponent(location.pathname + location.search)}`
    return <Navigate to={redirectPath} replace />
  }

  // Check roles if specified
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role))
    if (!hasRequiredRole) {
      import.meta.env.DEV && console.log('Not authorized by role, redirecting to dashboard')
      return <Navigate to="/dashboard/overview" replace />
    }
  }

  // Check permissions if specified
  if (permission || permissions.length > 0) {
    const hasPermission = permission
      ? can(permission)
      : requireAll
        ? canAll(permissions)
        : canAny(permissions)

    if (!hasPermission) {
      import.meta.env.DEV && console.log('Not authorized by permission, redirecting to dashboard')
      return <Navigate to="/dashboard/overview" replace />
    }
  }

  import.meta.env.DEV && console.log('Authenticated and authorized, rendering children')
  return children
}

export default ProtectedRoute
