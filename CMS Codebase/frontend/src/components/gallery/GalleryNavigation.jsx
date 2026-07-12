import { NavLink } from 'react-router-dom'
import {
  Image,
  Calendar,
  Clock,
  Heart,
  FolderOpen,
  Tag,
  MapPin,
  Trash2,
  Upload
} from 'lucide-react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const GalleryNavigation = ({
  photoCount = 0,
  albumCount = 0,
  categories = [],
  currentView = 'library',
  onViewChange,
  canUpload = false,
  onUploadClick
}) => {
  const { colors } = useColorPalette()

  const navItems = [
    {
      id: 'library',
      label: 'Library',
      icon: Image,
      count: photoCount,
      description: 'All your photos'
    },
    {
      id: 'recents',
      label: 'Recents',
      icon: Clock,
      description: 'Recently added photos'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Heart,
      description: 'Your favorite photos'
    },
    {
      id: 'albums',
      label: 'Albums',
      icon: FolderOpen,
      count: albumCount,
      description: 'Organized collections'
    }
  ]

  const categoryItems = categories.map(cat => ({
    id: `category-${cat}`,
    label: cat,
    icon: Tag,
    type: 'category'
  }))

  return (
    <nav className="w-64 h-full overflow-y-auto" style={{ backgroundColor: colors.surface, borderRight: `1px solid ${colors.border}` }}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
            Gallery
          </h2>
          {canUpload && (
            <button
              onClick={onUploadClick}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: colors.primary, color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary + 'CC' }
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary }
              aria-label="Upload photos"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Main Navigation */}
        <div className="space-y-1 mb-6" role="navigation" aria-label="Gallery views">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              aria-label={item.label}
              aria-current={currentView === item.id ? 'true' : 'false'}
              style={{
                backgroundColor: currentView === item.id ? colors.primary + '20' : 'transparent',
                color: currentView === item.id ? colors.primary : colors.text
              }}
              onMouseEnter={(e) => {
                if (currentView !== item.id) {
                  e.currentTarget.style.backgroundColor = colors.background
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" style={{ color: currentView === item.id ? colors.primary : colors.textSecondary }} aria-hidden="true" />
                <span>{item.label}</span>
              </div>
              {item.count > 0 && (
                <span className="text-xs" style={{ color: currentView === item.id ? colors.primary : colors.textSecondary }} aria-label={`${item.count} ${item.label}`}>
                  {item.count.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="my-4" style={{ borderTop: `1px solid ${colors.border}` }} />

        {/* Categories Section */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-3" style={{ color: colors.textSecondary }}>
            Categories
          </h3>
          <div className="space-y-1" role="navigation" aria-label="Photo categories">
            {categoryItems.length > 0 ? (
              categoryItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors"
                  aria-label={item.label}
                  aria-current={currentView === item.id ? 'true' : 'false'}
                  style={{
                    backgroundColor: currentView === item.id ? colors.primary + '20' : 'transparent',
                    color: currentView === item.id ? colors.primary : colors.text
                  }}
                  onMouseEnter={(e) => {
                    if (currentView !== item.id) {
                      e.currentTarget.style.backgroundColor = colors.background
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentView !== item.id) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <Tag className="h-4 w-4" style={{ color: currentView === item.id ? colors.primary : colors.textSecondary }} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))
            ) : (
              <p className="px-3 text-sm italic" style={{ color: colors.textSecondary }}>
                No categories yet
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="my-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-3" style={{ color: colors.textSecondary }}>
            Quick Actions
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => onViewChange('trash')}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors"
              aria-label="View recently deleted photos"
              aria-current={currentView === 'trash' ? 'true' : 'false'}
              style={{
                backgroundColor: currentView === 'trash' ? colors.error + '20' : 'transparent',
                color: currentView === 'trash' ? colors.error : colors.text
              }}
              onMouseEnter={(e) => {
                if (currentView !== 'trash') {
                  e.currentTarget.style.backgroundColor = colors.background
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== 'trash') {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <Trash2 className="h-4 w-4" style={{ color: currentView === 'trash' ? colors.error : colors.textSecondary }} aria-hidden="true" />
              <span>Recently Deleted</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default GalleryNavigation
