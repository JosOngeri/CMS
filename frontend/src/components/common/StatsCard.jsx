import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const StatsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'positive', 
  icon: Icon, 
  iconColor = 'bg-primary-100 text-primary-600',
  linkTo,
  onClick,
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
      <span className="stat-value">{value}</span>
      <span className={`stat-change ${changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-[var(--color-textSecondary)]'}`}>
        {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : ''} {change}
      </span>
    </div>
  )

  if (linkTo) {
    return <Link to={linkTo}>{cardContent}</Link>
  }

  return cardContent
}

export default StatsCard
