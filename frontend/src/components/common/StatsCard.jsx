import { Link } from 'react-router-dom'
import { RefreshCw, AlertCircle } from 'lucide-react'

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
  const cardContent = (
    <div
      className={`stat-card ${onClick || linkTo ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick(e)
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${title}: ${value}${change ? `. ${change}` : ''}`}
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
          <AlertCircle className="h-8 w-8 text-[var(--color-error)]" />
          <span className="text-sm text-[var(--color-error)]">Error loading data</span>
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
          <span className={`stat-change ${changeType === 'positive' ? 'text-[var(--color-success)]' : changeType === 'negative' ? 'text-[var(--color-error)]' : 'text-[var(--color-textSecondary)]'}`}>
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
