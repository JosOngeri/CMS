import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermission } from '../hooks/usePermission'
import { Loader2 } from 'lucide-react'

const ProtectedRoute = ({ children, permission, permissions = [], requireAll = false }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const { can, canAny, canAll } = usePermission()

  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading)

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
    console.log('Not authenticated, redirecting to landing page')
    return <Navigate to="/" replace />
  }

  // Check permissions if specified
  if (permission || permissions.length > 0) {
    const hasPermission = permission 
      ? can(permission) 
      : requireAll 
        ? canAll(permissions) 
        : canAny(permissions)

    if (!hasPermission) {
      console.log('Not authorized, redirecting to dashboard')
      return <Navigate to="/dashboard/overview" replace />
    }
  }

  console.log('Authenticated and authorized, rendering children')
  return children
}

export default ProtectedRoute
