import { Link } from 'react-router-dom'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const SidebarMenuItem = ({ to, icon: Icon, label, badge, isActive, onClick, children }) => {
  const { colors } = useColorPalette()

  return (
    <Link
      to={to}
      className="flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200"
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      style={{
        backgroundColor: isActive ? colors.primary + '20' : 'transparent',
        color: isActive ? colors.primary : colors.text
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = colors.border
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
    >
      {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
      <span className="font-medium">{label}</span>
      {badge > 0 && (
        <span className="ml-auto text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.error }} aria-label={`${badge} notifications`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {children}
    </Link>
  )
}

export default SidebarMenuItem
