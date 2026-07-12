import { Loader2 } from 'lucide-react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

/**
 * FullPageLoading - A full-page loading spinner
 */
export const FullPageLoading = ({ message = 'Loading...', progress = null }) => {
  const { colors } = useColorPalette()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: colors.primary }} aria-hidden="true" />
      <p style={{ color: colors.textSecondary }}>{message}</p>
      {progress !== null && (
        <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
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
  const { colors } = useColorPalette()
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} style={{ color: colors.primary }} aria-hidden="true" />
  )
}

/**
 * CardLoading - A skeleton loading state for cards
 */
export const CardLoading = () => {
  const { colors } = useColorPalette()

  return (
    <div className="rounded-lg shadow-sm p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: '1px', borderStyle: 'solid' }}>
      <div className="animate-pulse space-y-4">
        <div className="h-4 rounded w-3/4" style={{ backgroundColor: colors.border }}></div>
        <div className="h-4 rounded w-1/2" style={{ backgroundColor: colors.border }}></div>
        <div className="h-4 rounded w-5/6" style={{ backgroundColor: colors.border }}></div>
      </div>
    </div>
  )
}

/**
 * TableLoading - A skeleton loading state for table rows
 */
export const TableLoading = ({ rows = 5, columns = 5 }) => {
  const { colors } = useColorPalette()

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <div
                className="h-4 rounded"
                style={{
                  backgroundColor: colors.border,
                  width: `${Math.random() * 50 + 25}%`
                }}
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
  return ({ loading, ...props }) => {
    if (loading) {
      return <LoadingComponent />
    }
    return <Component {...props} />
  }
}
