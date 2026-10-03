import {
  Image,
  Clock,
  Heart,
  FolderOpen,
  Tag,
  Trash2,
  Upload,
  X
} from 'lucide-react'

const GalleryNavigation = ({
  photoCount = 0,
  albumCount = 0,
  categories = [],
  currentView = 'library',
  onViewChange,
  canUpload = false,
  onUploadClick,
  mobileOpen = false,
  onMobileClose
}) => {
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

  const selectView = (id) => {
    onViewChange?.(id)
    onMobileClose?.()
  }

  const content = (
    <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Gallery
          </h2>
          <div className="flex items-center gap-2">
            {canUpload && (
              <button
                onClick={onUploadClick}
                className="p-2 rounded-lg transition-colors bg-[var(--color-primary)] text-[var(--color-on-solid)] hover:bg-[var(--color-primary-600)]"
                aria-label="Upload photos"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {onMobileClose && (
              <button
                onClick={onMobileClose}
                className="lg:hidden p-2 rounded-lg text-[var(--color-textSecondary)] hover:bg-[var(--color-background)]"
                aria-label="Close gallery menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <div className="space-y-1 mb-6" role="navigation" aria-label="Gallery views">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => selectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-background)]'
              }`}
              aria-label={item.label}
              aria-current={currentView === item.id ? 'true' : 'false'}
            >
              <div className="flex items-center space-x-3">
                <item.icon className={`h-5 w-5 ${currentView === item.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-textSecondary)]'}`} aria-hidden="true" />
                <span>{item.label}</span>
              </div>
              {item.count > 0 && (
                <span className={`text-xs ${currentView === item.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-textSecondary)]'}`} aria-label={`${item.count} ${item.label}`}>
                  {item.count.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-[var(--color-border)]" />

        {/* Categories Section */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-3 text-[var(--color-textSecondary)]">
            Categories
          </h3>
          <div className="space-y-1" role="navigation" aria-label="Photo categories">
            {categoryItems.length > 0 ? (
              categoryItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectView(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentView === item.id
                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-background)]'
                  }`}
                  aria-label={item.label}
                  aria-current={currentView === item.id ? 'true' : 'false'}
                >
                  <Tag className={`h-4 w-4 ${currentView === item.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-textSecondary)]'}`} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))
            ) : (
              <p className="px-3 text-sm italic text-[var(--color-textSecondary)]">
                No categories yet
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="my-4 pt-4 border-t border-[var(--color-border)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-3 text-[var(--color-textSecondary)]">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => selectView('trash')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                currentView === 'trash'
                  ? 'bg-[var(--color-error-light)] text-[var(--color-error)]'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-background)]'
              }`}
              aria-label="View recently deleted photos"
              aria-current={currentView === 'trash' ? 'true' : 'false'}
            >
              <Trash2 className={`h-4 w-4 ${currentView === 'trash' ? 'text-[var(--color-error)]' : 'text-[var(--color-textSecondary)]'}`} aria-hidden="true" />
              <span>Recently Deleted</span>
            </button>
          </div>
        </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:block w-64 h-full overflow-y-auto bg-[var(--color-surface)] border-r border-[var(--color-border)]">
        {content}
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-[var(--color-overlay-50)]"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <nav className="absolute left-0 top-0 bottom-0 w-72 overflow-y-auto bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-xl">
            {content}
          </nav>
        </div>
      )}
    </>
  )
}

export default GalleryNavigation
