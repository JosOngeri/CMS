import { Link } from 'react-router-dom'
import { ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const StatsCard = ({
  title,
  value,
  change,
  changeType = 'positive',
  trendPeriod,
  icon: Icon,
  iconColor = 'bg-primary-100 text-primary-600',
  linkTo,
  onClick,
  isLoading = false,
  error = null,
  onRetry,
  subtitle,
  className = ''
}) => {
  const { colors } = useColorPalette()

  const cardContent = (
    <div
      className={`stat-card ${onClick || linkTo ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${value}. ${change}. Click to view details.`}
    >
      <div className={`stat-icon ${iconColor}`}>
        {Icon && <Icon size={28} />}
      </div>
      <span className="stat-label">{title}</span>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-[var(--color-border)] rounded w-3/4"></div>
          <div className="h-4 bg-[var(--color-border)] rounded w-1/2"></div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <span className="text-sm text-red-600">Error loading data</span>
          {onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRetry()
              }}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          )}
        </div>
      ) : (
        <>
          <span className="stat-value">{value}</span>
          {subtitle && <span className="stat-subtitle">{subtitle}</span>}
          <span className={`stat-change ${changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-[var(--color-textSecondary)]'}`}>
            {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : ''} {change}
            {trendPeriod && <span className="ml-1 text-xs text-[var(--color-textSecondary)]">{trendPeriod}</span>}
          </span>
        </>
      )}
    </div>
  )

  if (linkTo) {
    return <Link to={linkTo}>{cardContent}</Link>
  }

  return cardContent
}

export default StatsCard
