import { useState, useCallback, useRef, useEffect } from 'react'
import { Calendar, ChevronRight, Clock, Heart, LayoutGrid } from 'lucide-react'
import { groupPhotosByDate, formatDateHeader, DATE_GROUPS } from '../../utils/dateGrouping'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const ApplePhotoGrid = ({
  photos = [],
  onPhotoClick,
  selectedPhotos = new Set(),
  onPhotoSelect,
  enableSelection = false,
  enableFavorites = false,
  onFavoriteToggle,
  favorites = new Set(),
  gridColumns = { mobile: 3, tablet: 4, desktop: 5, large: 6 },
  aspectRatio = 'square', // 'square', 'photo', 'video'
  gap = 4,
  loading = false
}) => {
  const { colors } = useColorPalette()
  const [hoveredPhoto, setHoveredPhoto] = useState(null)
  const [failedImages, setFailedImages] = useState(new Set())
  const [scrolledGroups, setScrolledGroups] = useState(new Set())
  const gridRef = useRef(null)

  // Group photos by date
  const groupedItems = groupPhotosByDate(photos)

  // Get responsive grid columns
  const getGridCols = () => {
    if (typeof window === 'undefined') return gridColumns.mobile
    const width = window.innerWidth
    if (width >= 1536) return gridColumns.large
    if (width >= 1280) return gridColumns.desktop
    if (width >= 768) return gridColumns.tablet
    return gridColumns.mobile
  }

  const [currentCols, setCurrentCols] = useState(getGridCols())

  useEffect(() => {
    const handleResize = () => setCurrentCols(getGridCols())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getTelegramImageUrl = (photo) => {
    // Use the photo's ID to fetch the image through the backend proxy
    return `/api/gallery/image/${photo.id}`
  }

  const handleImageError = useCallback((fileId) => {
    setFailedImages(prev => new Set(prev).add(fileId))
  }, [])

  const handlePhotoClick = useCallback((photo, index, e) => {
    if (enableSelection && e) {
      // Check if clicking on selection area or favorite button
      const target = e.target
      if (target.closest('.select-area') || target.closest('.favorite-btn')) {
        return
      }
    }
    onPhotoClick?.(photo, index)
  }, [enableSelection, onPhotoClick])

  const handleSelectToggle = useCallback((e, photoId) => {
    e.stopPropagation()
    onPhotoSelect?.(photoId)
  }, [onPhotoSelect])

  const handleFavoriteToggle = useCallback((e, photoId) => {
    e.stopPropagation()
    onFavoriteToggle?.(photoId)
  }, [onFavoriteToggle])

  // Render section header
  const renderSectionHeader = (item, index) => {
    const isSticky = scrolledGroups.has(item.title)

    return (
      <div
        key={`header-${index}`}
        className={`col-span-full py-3 px-2 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm transition-all ${
          isSticky ? 'shadow-sm' : ''
        }`}
        style={{ backgroundColor: colors.surface + 'F2' }}
        data-group={item.title}
      >
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
            {item.title}
          </h3>
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {item.count} {item.count === 1 ? 'photo' : 'photos'}
          </span>
        </div>
        <button
          className="text-sm flex items-center space-x-1 transition-colors"
          style={{ color: colors.primary }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8' }
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1' }
          onClick={() => onPhotoClick?.(item.data, 0, { viewAll: true, group: item.title })}
          aria-label={`View all ${item.count} ${item.count === 1 ? 'photo' : 'photos'} in ${item.title}`}
        >
          <span>See All</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    )
  }

  // Render individual photo
  const renderPhoto = (photo, index) => {
    const isSelected = selectedPhotos.has(photo.id)
    const isFavorite = favorites.has(photo.id)
    const isHovered = hoveredPhoto === photo.id
    const hasFailed = failedImages.has(photo.id)

    const getAspectRatioClass = () => {
      switch (aspectRatio) {
        case 'photo':
          return 'aspect-[4/3]'
        case 'video':
          return 'aspect-video'
        case 'square':
        default:
          return 'aspect-square'
      }
    }

    return (
      <div
        key={photo.id}
        className={`relative cursor-pointer overflow-hidden rounded-lg ${getAspectRatioClass()} group ${
          isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : ''
        }`}
        onMouseEnter={() => setHoveredPhoto(photo.id)}
        onMouseLeave={() => setHoveredPhoto(null)}
        onClick={(e) => handlePhotoClick(photo, index, e)}
      >
        {/* Image */}
        {hasFailed ? (
          <div className="w-full h-full bg-[var(--color-surface)] flex items-center justify-center">
            <LayoutGrid className="h-8 w-8 text-[var(--color-textSecondary)]" />
          </div>
        ) : (
          <img
            src={getTelegramImageUrl(photo)}
            alt={photo.caption || 'Photo'}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isHovered ? 'scale-105' : ''
            }`}
            loading="lazy"
            onError={() => handleImageError(photo.id)}
          />
        )}

        {/* Overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-200 ${
          isHovered || isSelected ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Selection checkbox */}
          {enableSelection && (
            <div className="select-area absolute top-2 left-2">
              <button
                onClick={(e) => handleSelectToggle(e, photo.id)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  isSelected 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-[var(--color-surface)]/80 text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]'
                }`}
                aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
                aria-pressed={isSelected}
              >
                {isSelected ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <div className="w-4 h-4 border-2 border-[var(--color-border)] rounded-full" aria-hidden="true" />
                )}
              </button>
            </div>
          )}

          {/* Favorite button */}
          {enableFavorites && (
            <button
              onClick={(e) => handleFavoriteToggle(e, photo.id)}
              className={`favorite-btn absolute top-2 right-2 p-1.5 rounded-full transition-colors ${
                isFavorite 
                  ? 'bg-red-500 text-white' 
                  : 'bg-[var(--color-surface)]/80 text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)] hover:text-red-500'
              }`}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isFavorite}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
            </button>
          )}

          {/* Photo info on hover */}
          {photo.caption && (
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-white text-sm font-medium truncate">
                {photo.caption}
              </p>
              <p className="text-white/80 text-xs">
                {formatDateHeader(photo.uploaded_at, DATE_GROUPS.TODAY)}
              </p>
            </div>
          )}
        </div>

        {/* Video indicator */}
        {photo.isVideo && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white p-1.5 rounded">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </div>
        )}
      </div>
    )
  }

  // Track scroll for sticky headers
  useEffect(() => {
    const handleScroll = () => {
      if (!gridRef.current) return
      
      const headers = gridRef.current.querySelectorAll('[data-group]')
      const newScrolledGroups = new Set()
      
      headers.forEach(header => {
        const rect = header.getBoundingClientRect()
        if (rect.top <= 60) { // Account for any fixed header
          newScrolledGroups.add(header.dataset.group)
        }
      })
      
      setScrolledGroups(newScrolledGroups)
    }

    const container = gridRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square bg-[var(--color-surface)] animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (groupedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <LayoutGrid className="h-16 w-16 text-[var(--color-textSecondary)] mb-4" />
        <p className="text-[var(--color-textSecondary)]  text-lg">No photos found</p>
      </div>
    )
  }

  return (
    <div 
      ref={gridRef}
      className={`grid gap-${gap}`}
      style={{ 
        gridTemplateColumns: `repeat(${currentCols}, minmax(0, 1fr))`,
        gridAutoFlow: 'dense'
      }}
    >
      {groupedItems.map((item, index) => {
        if (item.type === 'header') {
          return renderSectionHeader(item, index)
        }
        return renderPhoto(item.data, index)
      })}
    </div>
  )
}

export default ApplePhotoGrid
