import { useState, useEffect, useCallback } from 'react'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Share2, 
  Trash2, 
  Heart,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Calendar,
  MapPin,
  Tag,
  User,
  Check
} from 'lucide-react'

const PhotoLightbox = ({
  photos = [],
  currentIndex = 0,
  isOpen = false,
  onClose,
  onNavigate,
  onDelete,
  onDownload,
  onShare,
  onFavoriteToggle,
  favorites = new Set(),
  canDelete = false,
  canDownload = true,
  showInfo = true
}) => {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [failedImage, setFailedImage] = useState(false)

  const currentPhoto = photos[currentIndex]
  const isFavorite = currentPhoto ? favorites.has(currentPhoto.id) : false

  // Reset zoom and position when photo changes
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setImageLoaded(false)
    setFailedImage(false)
  }, [currentIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          if (scale > 1) {
            setScale(1)
            setPosition({ x: 0, y: 0 })
          } else {
            onClose?.()
          }
          break
        case 'ArrowLeft':
          navigate('prev')
          break
        case 'ArrowRight':
          navigate('next')
          break
        case ' ':
          e.preventDefault()
          onFavoriteToggle?.(currentPhoto?.id)
          break
        case 'i':
          setShowInfoPanel(prev => !prev)
          break
        case 'f':
          toggleFullscreen()
          break
        case '+':
        case '=':
          zoomIn()
          break
        case '-':
          zoomOut()
          break
        case '0':
          resetZoom()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, scale, photos.length])

  const navigate = useCallback((direction) => {
    if (photos.length <= 1) return
    
    let newIndex
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % photos.length
    } else {
      newIndex = (currentIndex - 1 + photos.length) % photos.length
    }
    
    onNavigate?.(newIndex)
  }, [currentIndex, photos.length, onNavigate])

  const zoomIn = () => setScale(prev => Math.min(prev * 1.25, 5))
  const zoomOut = () => setScale(prev => Math.max(prev / 1.25, 0.5))
  const resetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // Drag to pan when zoomed
  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Swipe gestures for mobile
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    setDragStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchMove = (e) => {
    if (scale > 1) return // Don't swipe when zoomed
    
    const touch = e.touches[0]
    const diffX = dragStart.x - touch.clientX
    const diffY = dragStart.y - touch.clientY
    
    // Horizontal swipe threshold
    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e) => {
    if (scale > 1) return
    
    const touch = e.changedTouches[0]
    const diffX = dragStart.x - touch.clientX
    const diffY = dragStart.y - touch.clientY
    
    // Horizontal swipe
    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
      if (diffX > 0) {
        navigate('next')
      } else {
        navigate('prev')
      }
    }
    
    // Vertical swipe down to close
    if (diffY < -100 && Math.abs(diffX) < 50) {
      onClose?.()
    }
  }

  const getTelegramImageUrl = (fileId) => {
    return `/api/gallery/image/${fileId}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (!isOpen || !currentPhoto) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex">
      {/* Main Image Area */}
      <div 
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.()
        }}
      >
        {/* Top Toolbar */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center space-x-2">
            {/* Photo Counter */}
            <span className="text-white/80 text-sm font-medium bg-black/30 px-3 py-1 rounded-full">
              {currentIndex + 1} / {photos.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Info Toggle */}
            {showInfo && (
              <button
                onClick={() => setShowInfoPanel(!showInfoPanel)}
                className={`p-2 rounded-full transition-colors ${
                  showInfoPanel ? 'bg-[var(--color-surface)]/20 text-white' : 'text-white/80 hover:text-white hover:bg-[var(--color-surface)]/10'
                }`}
                aria-label={showInfoPanel ? 'Hide photo info' : 'Show photo info'}
                aria-pressed={showInfoPanel}
              >
                <Info className="h-5 w-5" aria-hidden="true" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/80 hover:text-white hover:bg-[var(--color-surface)]/10 rounded-full transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-pressed={isFullscreen}
            >
              <Maximize2 className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-[var(--color-surface)]/10 rounded-full transition-colors"
              aria-label="Close lightbox"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div
          className="relative max-w-full max-h-full cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {failedImage ? (
            <div className="w-96 h-96 bg-[var(--color-surface)] flex items-center justify-center rounded-lg">
              <span className="text-[var(--color-textSecondary)]">Image failed to load</span>
            </div>
          ) : (
            <img
              src={getTelegramImageUrl(currentPhoto.id)}
              alt={currentPhoto.caption || 'Photo'}
              className="max-w-full max-h-[85vh] object-contain select-none"
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setFailedImage(true)}
              draggable={false}
            />
          )}
          
          {!imageLoaded && !failedImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="loading-spinner w-8 h-8" />
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => navigate('prev')}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white hover:bg-[var(--color-surface)]/10 rounded-full transition-all"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-8 w-8" aria-hidden="true" />
            </button>
            <button
              onClick={() => navigate('next')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white hover:bg-[var(--color-surface)]/10 rounded-full transition-all"
              aria-label="Next photo"
            >
              <ChevronRight className="h-8 w-8" aria-hidden="true" />
            </button>
          </>
        )}

        {/* Zoom Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2">
          <button
            onClick={zoomOut}
            className="p-1.5 text-white/70 hover:text-white transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="text-white/70 text-sm min-w-[3rem] text-center" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1.5 text-white/70 hover:text-white transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5" aria-hidden="true" />
          </button>
          {scale !== 1 && (
            <button
              onClick={resetZoom}
              className="p-1.5 text-white/70 hover:text-white transition-colors ml-1"
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
          {/* Favorite */}
          <button
            onClick={() => onFavoriteToggle?.(currentPhoto.id)}
            className={`p-3 rounded-full transition-colors ${
              isFavorite 
                ? 'bg-red-500 text-white' 
                : 'bg-[var(--color-surface)]/10 text-white/80 hover:bg-[var(--color-surface)]/20 hover:text-white'
            }`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isFavorite}
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>

          {/* Share */}
          {onShare && (
            <button
              onClick={() => onShare?.(currentPhoto)}
              className="p-3 bg-[var(--color-surface)]/10 text-white/80 hover:bg-[var(--color-surface)]/20 hover:text-white rounded-full transition-colors"
              aria-label="Share photo"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          {/* Download */}
          {canDownload && (
            <button
              onClick={() => onDownload?.(currentPhoto)}
              className="p-3 bg-[var(--color-surface)]/10 text-white/80 hover:bg-[var(--color-surface)]/20 hover:text-white rounded-full transition-colors"
              aria-label="Download photo"
            >
              <Download className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          {/* Delete */}
          {canDelete && (
            <button
              onClick={() => onDelete?.(currentPhoto.id)}
              className="p-3 bg-red-500/80 text-white hover:bg-red-500 rounded-full transition-colors"
              aria-label="Delete photo"
            >
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Caption Overlay (when info panel is closed) */}
        {!showInfoPanel && currentPhoto.caption && (
          <div className="absolute bottom-20 left-4 right-4 text-center">
            <p className="text-white text-lg font-medium bg-black/30 inline-block px-4 py-2 rounded-lg backdrop-blur-sm">
              {currentPhoto.caption}
            </p>
          </div>
        )}
      </div>

      {/* Info Sidebar */}
      {showInfoPanel && (
        <div className="w-80 bg-[var(--color-surface)] border-l border-[var(--color-border)] p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Photo Preview */}
            <div className="aspect-square rounded-lg overflow-hidden bg-[var(--color-surface)]">
              <img
                src={getTelegramImageUrl(currentPhoto.id)}
                alt={currentPhoto.caption || 'Photo'}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpath d="M21 15l-5-5L5 21"/%3E%3C/svg%3E'
                }}
              />
            </div>

            {/* Caption */}
            {currentPhoto.caption && (
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  {currentPhoto.caption}
                </h3>
              </div>
            )}

            {/* Description */}
            {currentPhoto.description && (
              <div>
                <p className="text-[var(--color-textSecondary)] text-sm leading-relaxed">
                  {currentPhoto.description}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
              {/* Date */}
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-[var(--color-textSecondary)] mt-0.5" />
                <div>
                  <p className="text-[var(--color-textSecondary)] text-xs uppercase tracking-wider">Date</p>
                  <p className="text-white text-sm">{formatDate(currentPhoto.uploaded_at || currentPhoto.created_at)}</p>
                </div>
              </div>

              {/* Category */}
              {currentPhoto.category && (
                <div className="flex items-start space-x-3">
                  <Tag className="h-5 w-5 text-[var(--color-textSecondary)] mt-0.5" />
                  <div>
                    <p className="text-[var(--color-textSecondary)] text-xs uppercase tracking-wider">Category</p>
                    <p className="text-white text-sm">{currentPhoto.category}</p>
                  </div>
                </div>
              )}

              {/* Location */}
              {currentPhoto.location && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-[var(--color-textSecondary)] mt-0.5" />
                  <div>
                    <p className="text-[var(--color-textSecondary)] text-xs uppercase tracking-wider">Location</p>
                    <p className="text-white text-sm">{currentPhoto.location}</p>
                  </div>
                </div>
              )}

              {/* Uploaded By */}
              {(currentPhoto.first_name || currentPhoto.username) && (
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-[var(--color-textSecondary)] mt-0.5" />
                  <div>
                    <p className="text-[var(--color-textSecondary)] text-xs uppercase tracking-wider">Uploaded By</p>
                    <p className="text-white text-sm">
                      {currentPhoto.first_name} {currentPhoto.last_name}
                      {currentPhoto.username && (
                        <span className="text-[var(--color-textSecondary)]"> (@{currentPhoto.username})</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoLightbox
