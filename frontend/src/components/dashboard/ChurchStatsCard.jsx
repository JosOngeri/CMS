import { Link } from 'react-router-dom'
import { ArrowRight, RefreshCw, AlertCircle, Users, DollarSign, Calendar, Heart, Building, TrendingUp } from 'lucide-react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const ChurchStatsCard = ({
  title,
  value,
  change,
  changeType = 'positive',
  trendPeriod,
  icon: Icon,
  statType = 'default',
  linkTo,
  onClick,
  isLoading = false,
  error = null,
  onRetry,
  subtitle,
  className = ''
}) => {
  const { colors } = useColorPalette()

  // Church-specific visual metaphors for each stat type
  const getStatTypeStyles = (type) => {
    const styles = {
      // Member count - community/gathering metaphor
      members: {
        iconBg: 'bg-[var(--color-secondary)]-10',
        iconColor: 'text-[var(--color-secondary)]',
        cardBorder: 'border-[var(--color-secondary)]-20',
        hoverShadow: 'hover:shadow-[var(--color-secondary)]-20'
      },
      // Financial metrics - stewardship/growth metaphor
      financial: {
        iconBg: 'bg-[var(--color-success)]-10',
        iconColor: 'text-[var(--color-success)]',
        cardBorder: 'border-[var(--color-success)]-20',
        hoverShadow: 'hover:shadow-[var(--color-success)]-20'
      },
      // Event attendance - spiritual journey metaphor
      events: {
        iconBg: 'bg-[var(--color-primary)]-10',
        iconColor: 'text-[var(--color-primary)]',
        cardBorder: 'border-[var(--color-primary)]-20',
        hoverShadow: 'hover:shadow-[var(--color-primary)]-20'
      },
      // Engagement metrics - growth/illumination metaphor
      engagement: {
        iconBg: 'bg-[var(--color-accent)]-10',
        iconColor: 'text-[var(--color-accent)]',
        cardBorder: 'border-[var(--color-accent)]-20',
        hoverShadow: 'hover:shadow-[var(--color-accent)]-20'
      },
      // Default style
      default: {
        iconBg: 'bg-[var(--color-primary)]-10',
        iconColor: 'text-[var(--color-primary)]',
        cardBorder: 'border-[var(--color-border)]',
        hoverShadow: 'hover:shadow-lg'
      }
    }
    return styles[type] || styles.default
  }

  const statStyles = getStatTypeStyles(statType)
  const defaultIcon = Icon || (statType === 'members' ? Users : statType === 'financial' ? DollarSign : statType === 'events' ? Calendar : statType === 'engagement' ? Heart : TrendingUp)

  const cardContent = (
    <div
      className={`church-stats-card p-6 rounded-2xl border transition-all duration-300 ${statStyles.cardBorder} ${statStyles.hoverShadow} ${onClick || linkTo ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (onClick) onClick()
          else if (linkTo) window.location.href = linkTo
        }
      }}
      aria-label={`${title}: ${value}. ${change ? `${changeType === 'positive' ? 'increased by' : 'decreased by'} ${change}` : ''}. ${linkTo || onClick ? 'Click to view details.' : ''}`}
    >
      {/* Icon with church-specific treatment */}
      <div className={`flex items-start justify-between mb-4`}>
        <div className={`p-3 rounded-xl ${statStyles.iconBg} ${statStyles.iconColor}`}>
          {defaultIcon && <defaultIcon size={24} aria-hidden="true" />}
        </div>
        {linkTo && (
          <ArrowRight className="text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors" size={20} aria-hidden="true" />
        )}
      </div>

      {/* Label */}
      <span className="text-sm font-medium text-[var(--color-textSecondary)] mb-1 block">
        {title}
      </span>

      {/* Content */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-[var(--color-border)] rounded w-3/4"></div>
          <div className="h-4 bg-[var(--color-border)] rounded w-1/2"></div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <AlertCircle className="h-8 w-8 text-[var(--color-error)]" aria-hidden="true" />
          <span className="text-sm text-[var(--color-error)]">Error loading data</span>
          {onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRetry()
              }}
              className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]-700 flex items-center gap-1 mt-2"
              aria-label="Retry loading data"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Value */}
          <span className="text-3xl font-bold text-[var(--color-text)] mb-1 block">
            {value}
          </span>
          
          {/* Subtitle */}
          {subtitle && (
            <span className="text-sm text-[var(--color-textSecondary)] mb-2 block">
              {subtitle}
            </span>
          )}
          
          {/* Change indicator */}
          {change && (
            <span className={`flex items-center gap-1 text-sm font-medium ${
              changeType === 'positive' ? 'text-[var(--color-success)]' : 
              changeType === 'negative' ? 'text-[var(--color-error)]' : 
              'text-[var(--color-textSecondary)]'
            }`}>
              {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '→'}
              {change}
              {trendPeriod && (
                <span className="text-xs text-[var(--color-textSecondary)] ml-1">
                  {trendPeriod}
                </span>
              )}
            </span>
          )}
        </>
      )}
    </div>
  )

  if (linkTo) {
    return <Link to={linkTo}>{cardContent}</Link>
  }

  return cardContent
}

export default ChurchStatsCard