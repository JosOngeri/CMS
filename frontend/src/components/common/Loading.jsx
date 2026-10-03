/**
 * @audit Loading spinners/skeletons.
 * @fixed InlineLoading no longer calls useColorPalette() — it was never imported
 *        (ReferenceError on render) and `colors` was unused.
 */
import { Loader2 } from 'lucide-react'

/**
 * FullPageLoading - A full-page loading spinner
 */
export const FullPageLoading = ({ message = 'Loading...', progress = null }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="w-12 h-12 animate-spin mb-4 text-[var(--color-primary)]" aria-hidden="true" />
      <p className="text-[var(--color-textSecondary)]">{message}</p>
      {progress !== null && (
        <p className="mt-2 text-sm text-[var(--color-textSecondary)]">
          {Math.round(progress)}%
        </p>
      )}
    </div>
  )
}

/**
 * InlineLoading - A smaller inline loading spinner
 */
export const InlineLoading = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <Loader2 className={`animate-spin text-[var(--color-primary)] ${sizeClasses[size]} ${className}`} aria-hidden="true" />
  )
}

/**
 * CardLoading - A skeleton loading state for cards
 */
export const CardLoading = () => {
  return (
    <div className="rounded-lg shadow-sm p-6 bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="animate-pulse space-y-4">
        <div className="h-4 rounded w-3/4 bg-[var(--color-border)]"></div>
        <div className="h-4 rounded w-1/2 bg-[var(--color-border)]"></div>
        <div className="h-4 rounded w-5/6 bg-[var(--color-border)]"></div>
      </div>
    </div>
  )
}

/**
 * TableLoading - A skeleton loading state for table rows
 */
export const TableLoading = ({ rows = 5, columns = 5 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <div
                className="h-4 rounded bg-[var(--color-border)]"
                style={{ width: `${Math.random() * 50 + 25}%` }}
              ></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * ButtonLoading - A loading state for buttons
 */
export const ButtonLoading = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]}`} aria-hidden="true" />
  )
}

/**
 * withLoading - HOC to add loading state to components
 */
export const withLoading = (Component, LoadingComponent = FullPageLoading) => {
  const WithLoading = ({ loading, ...props }) => {
    if (loading) {
      return <LoadingComponent />
    }
    return <Component {...props} />
  }
  WithLoading.displayName = `withLoading(${Component.displayName || Component.name || 'Component'})`
  return WithLoading
}
