import { useState, useEffect } from 'react'
import { Search, Grid, List, Play, X, ChevronLeft, ChevronRight, Upload, Trash2, Calendar, Folder, CheckSquare, Square, Heart, Tag, Plus } from 'lucide-react'
import Card from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import ConfirmDialog from '../common/ConfirmDialog'

const PhotoGallery = ({ 
  photos = [], 
  loading = false, 
  onUpload, 
  onDelete, 
  onSelectPhoto,
  selectedPhotos = new Set(),
  canUpload = false,
  limit = null,
  showViewToggle = true,
  showUploadButton = true,
  showSearch = true,
  enableSelection = false
}) => {
  const toast = useToast()
  const { api, isAuthenticated } = useAuth()
  const [viewMode, setViewMode] = useState('grid') // 'grid', 'list', 'slideshow'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false)
  const [failedImages, setFailedImages] = useState(new Set())
  // Per-member state: local overrides on top of server-annotated photo fields
  const [favOverrides, setFavOverrides] = useState({})
  const [labelOverrides, setLabelOverrides] = useState({})
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // {type:'label'|'photo', photo, label?}
  const [selectedLabel, setSelectedLabel] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const isFav = (photo) => favOverrides[photo.id] ?? photo.is_favorited ?? false
  const photoLabels = (photo) => labelOverrides[photo.id] ?? photo.my_labels ?? []

  const toggleFavorite = async (photo) => {
    const previous = isFav(photo)
    setFavOverrides(prev => ({ ...prev, [photo.id]: !previous }))
    try {
      const res = await api.post(`/gallery/photos/${photo.id}/favorite`)
      const favorited = res.data?.favorited ?? !previous
      setFavOverrides(prev => ({ ...prev, [photo.id]: favorited }))
    } catch {
      setFavOverrides(prev => ({ ...prev, [photo.id]: previous }))
      toast.error('Failed to update favourite')
    }
  }

  const addLabel = async (photo) => {
    const label = newLabel.trim()
    if (!label || photoLabels(photo).includes(label)) return
    try {
      await api.post(`/gallery/photos/${photo.id}/labels`, { label })
      setLabelOverrides(prev => ({ ...prev, [photo.id]: [...photoLabels(photo), label] }))
      setNewLabel('')
      toast.success(`Label "${label}" added`)
    } catch {
      toast.error('Failed to add label')
    }
  }

  const removeLabel = (photo, label) => setPendingAction({ type: 'label', photo, label })

  const confirmPendingAction = async () => {
    const pending = pendingAction
    setPendingAction(null)
    try {
      if (pending.type === 'label') {
        await api.delete(`/gallery/photos/${pending.photo.id}/labels/${encodeURIComponent(pending.label)}`)
        setLabelOverrides(prev => ({ ...prev, [pending.photo.id]: photoLabels(pending.photo).filter(l => l !== pending.label) }))
      } else {
        await api.delete(`/gallery/photos/${pending.photoId}`)
        toast.success('Photo deleted successfully')
        if (onDelete) onDelete(pending.photoId)
      }
    } catch {
      toast.error(pending.type === 'label' ? 'Failed to remove label' : 'Failed to delete photo')
    }
  }

  const myLabels = [...new Set(photos.flatMap(p => photoLabels(p)))]

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories()
    }
  }, [isAuthenticated])

  // Slideshow auto-play
  useEffect(() => {
    if (isSlideshowPlaying && photos.length > 0) {
      const interval = setInterval(() => {
        setSlideshowIndex((prev) => (prev + 1) % photos.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isSlideshowPlaying, photos.length])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/gallery/categories')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = !searchTerm || 
      photo.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || photo.category === selectedCategory
    const matchesFavorites = !favoritesOnly || isFav(photo)
    const matchesLabel = !selectedLabel || photoLabels(photo).includes(selectedLabel)
    return matchesSearch && matchesCategory && matchesFavorites && matchesLabel
  })

  const displayedPhotos = limit ? filteredPhotos.slice(0, limit) : filteredPhotos

  const handlePhotoClick = (photo, index) => {
    if (viewMode === 'slideshow') {
      setSlideshowIndex(index)
    } else {
      setSelectedPhoto(photo)
    }
  }

  const handleDelete = (photoId) => setPendingAction({ type: 'photo', photoId })

  const navigateSlideshow = (direction) => {
    if (direction === 'next') {
      setSlideshowIndex((prev) => (prev + 1) % displayedPhotos.length)
    } else {
      setSlideshowIndex((prev) => (prev - 1 + displayedPhotos.length) % displayedPhotos.length)
    }
  }

  const getTelegramImageUrl = (fileId) => {
    return `/api/gallery/image/${fileId}`
  }

  const handleImageError = (fileId) => {
    setFailedImages(prev => new Set(prev).add(fileId))
  }

  const renderImage = (photo, className, onClick = null) => {
    if (failedImages.has(photo.id)) {
      return (
        <div className={`${className} bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-textSecondary)]`} onClick={onClick}>
          <span className="text-sm">Photo unavailable</span>
        </div>
      )
    }
    return (
      <img
        src={getTelegramImageUrl(photo.id)}
        alt={photo.caption || 'Photo'}
        className={className}
        onClick={onClick}
        onError={() => handleImageError(photo.id)}
        loading="lazy"
      />
    )
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      </Card>
    )
  }

  if (displayedPhotos.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Grid}
          title="No Photos Found"
          description={searchTerm || selectedCategory ? 'Try adjusting your search or filters' : 'No photos have been uploaded yet'}
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      {(showSearch || showViewToggle || showUploadButton) && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {showSearch && (
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
                  aria-label="Search photos"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-primary-500"
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => setFavoritesOnly(v => !v)}
                    className={`flex items-center space-x-1 px-3 py-2 border rounded-lg ${favoritesOnly ? 'bg-primary-100 text-primary-600 border-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'}`}
                    aria-label="Show only favourites"
                    aria-pressed={favoritesOnly}
                  >
                    <Heart className={`h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`} />
                    <span className="text-sm">Favourites</span>
                  </button>
                  {myLabels.length > 0 && (
                    <select
                      value={selectedLabel}
                      onChange={(e) => setSelectedLabel(e.target.value)}
                      className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-primary-500"
                      aria-label="Filter by your labels"
                    >
                      <option value="">My Labels</option>
                      {myLabels.map(label => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          )}
          
          {showViewToggle && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'hover:bg-[var(--color-surface)]'}`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'hover:bg-[var(--color-surface)]'}`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('slideshow')}
                className={`p-2 rounded-lg ${viewMode === 'slideshow' ? 'bg-primary-100 text-primary-600' : 'hover:bg-[var(--color-surface)]'}`}
                aria-label="Slideshow view"
                aria-pressed={viewMode === 'slideshow'}
              >
                <Play className="h-5 w-5" />
              </button>
            </div>
          )}

          {showUploadButton && canUpload && onUpload && (
            <button
              onClick={onUpload}
              className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-[var(--color-on-solid)] px-4 py-2 rounded-lg"
              aria-label="Upload photo"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Photo</span>
            </button>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className={`relative group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow ${selectedPhotos.has(photo.id) ? 'ring-2 ring-[var(--color-success)]' : ''}`}
              onClick={(e) => {
                if (enableSelection) {
                  e.stopPropagation()
                  onSelectPhoto?.(photo.id)
                } else {
                  handlePhotoClick(photo, index)
                }
              }}
            >
              {enableSelection && (
                <div className="absolute top-2 left-2 z-10 bg-[var(--color-surface)] rounded-full p-1 shadow-md">
                  {selectedPhotos.has(photo.id) ? (
                    <CheckSquare className="h-5 w-5 text-[var(--color-success)]" />
                  ) : (
                    <Square className="h-5 w-5 text-[var(--color-textSecondary)]" />
                  )}
                </div>
              )}
              {renderImage(photo, 'w-full h-48 object-cover')}
              <div className="absolute inset-0 bg-[var(--color-overlay-40)] md:bg-transparent group-focus-within:bg-[var(--color-overlay-40)] md:group-hover:bg-[var(--color-overlay-40)] transition-all">
                <div className="absolute bottom-0 left-0 right-0 p-2 text-[var(--color-on-solid)] opacity-100 md:opacity-0 group-focus-within:opacity-100 md:group-hover:opacity-100 transition-opacity">
                  <p className="text-sm font-medium truncate">{photo.caption || 'Untitled'}</p>
                  {photo.category && (
                    <p className="text-xs text-[var(--color-textSecondary)] flex items-center">
                      <Folder className="h-3 w-3 mr-1" />
                      {photo.category}
                    </p>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex space-x-1">
                  {isAuthenticated && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(photo)
                      }}
                      className={`p-2 rounded-full transition-opacity shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center ${isFav(photo) ? 'bg-[var(--color-error)] text-[var(--color-on-solid)] opacity-100' : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] opacity-100 md:opacity-0 group-focus-within:opacity-100 md:group-hover:opacity-100'}`}
                      aria-label={isFav(photo) ? 'Remove from favourites' : 'Add to favourites'}
                      aria-pressed={isFav(photo)}
                    >
                      <Heart className={`h-4 w-4 ${isFav(photo) ? 'fill-current' : ''}`} />
                    </button>
                  )}
                  {canUpload && onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(photo.id)
                      }}
                      className="p-2 bg-[var(--color-error)] hover:opacity-90 text-[var(--color-on-solid)] rounded-full opacity-100 md:opacity-0 group-focus-within:opacity-100 md:group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {displayedPhotos.map((photo, index) => (
            <Card key={photo.id} className="p-4">
              <div className="flex items-start space-x-4">
                {renderImage(photo, 'w-32 h-24 object-cover rounded-lg cursor-pointer', () => handlePhotoClick(photo, index))}
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--color-text)] mb-1">
                    {photo.caption || 'Untitled'}
                  </h3>
                  {photo.description && (
                    <p className="text-sm text-[var(--color-textSecondary)] mb-2 line-clamp-2">
                      {photo.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-[var(--color-textSecondary)]">
                    {photo.category && (
                      <span className="flex items-center">
                        <Folder className="h-3 w-3 mr-1" />
                        {photo.category}
                      </span>
                    )}
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(photo.uploaded_at).toLocaleDateString()}
                    </span>
                    {photo.uploaded_by && (
                      <span>Uploaded by {photo.first_name || photo.username}</span>
                    )}
                  </div>
                  {isAuthenticated && photoLabels(photo).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {photoLabels(photo).map(label => (
                        <span
                          key={label}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-600"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col space-y-1">
                  {isAuthenticated && (
                    <button
                      onClick={() => toggleFavorite(photo)}
                      className={`p-2 rounded-lg ${isFav(photo) ? 'text-[var(--color-error)] bg-[var(--color-error-light)]' : 'text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]'}`}
                      aria-label={isFav(photo) ? 'Remove from favourites' : 'Add to favourites'}
                      aria-pressed={isFav(photo)}
                    >
                      <Heart className={`h-5 w-5 ${isFav(photo) ? 'fill-current' : ''}`} />
                    </button>
                  )}
                  {canUpload && onDelete && (
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded-lg"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Slideshow View */}
      {viewMode === 'slideshow' && (
        <div className="relative">
          <div className="relative aspect-video bg-[var(--color-media)] rounded-lg overflow-hidden">
            {displayedPhotos.length > 0 && renderImage(displayedPhotos[slideshowIndex], 'w-full h-full object-contain')}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--color-media)] to-transparent p-4">
              <h3 className="text-[var(--color-on-solid)] font-semibold">
                {displayedPhotos[slideshowIndex]?.caption || 'Untitled'}
              </h3>
              {displayedPhotos[slideshowIndex]?.description && (
                <p className="text-[var(--color-on-solid)] text-sm opacity-80">
                  {displayedPhotos[slideshowIndex].description}
                </p>
              )}
            </div>
            <button
              onClick={() => navigateSlideshow('prev')}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-[var(--color-overlay)] hover:bg-[var(--color-overlay-75)] text-[var(--color-on-solid)] rounded-full"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => navigateSlideshow('next')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-[var(--color-overlay)] hover:bg-[var(--color-overlay-75)] text-[var(--color-on-solid)] rounded-full"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <button
              onClick={() => setIsSlideshowPlaying(!isSlideshowPlaying)}
              className="absolute top-2 right-2 p-2 bg-[var(--color-overlay)] hover:bg-[var(--color-overlay-75)] text-[var(--color-on-solid)] rounded-full"
              aria-label={isSlideshowPlaying ? 'Pause slideshow' : 'Play slideshow'}
              aria-pressed={isSlideshowPlaying}
            >
              {isSlideshowPlaying ? <X className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex justify-center mt-4 space-x-2" role="navigation" aria-label="Slideshow navigation">
            {displayedPhotos.map((_, index) => (
              <button
                key={index}
                onClick={() => setSlideshowIndex(index)}
                className={`w-2 h-2 rounded-full ${index === slideshowIndex ? 'bg-primary-600' : 'bg-[var(--color-surface)]'}`}
                aria-label={`Go to photo ${index + 1}`}
                aria-current={index === slideshowIndex ? 'true' : 'false'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-[var(--color-overlay-90)] z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
        >
          <div className="relative max-w-4xl max-h-full">
            {renderImage(selectedPhoto, 'max-w-full max-h-[90vh] object-contain')}
            <div className="absolute top-2 right-2 flex space-x-2">
              {isAuthenticated && (
                <button
                  onClick={() => toggleFavorite(selectedPhoto)}
                  className={`p-2 rounded-full ${isFav(selectedPhoto) ? 'bg-[var(--color-error)] text-[var(--color-on-solid)]' : 'bg-[var(--color-surface)] text-[var(--color-text)]'}`}
                  aria-label={isFav(selectedPhoto) ? 'Remove from favourites' : 'Add to favourites'}
                  aria-pressed={isFav(selectedPhoto)}
                >
                  <Heart className={`h-6 w-6 ${isFav(selectedPhoto) ? 'fill-current' : ''}`} />
                </button>
              )}
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface)] text-[var(--color-text)] rounded-full"
                aria-label="Close lightbox"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--color-media)] to-transparent p-4 text-[var(--color-on-solid)]">
              <h3 className="font-semibold text-lg">{selectedPhoto.caption || 'Untitled'}</h3>
              {selectedPhoto.description && (
                <p className="text-sm opacity-80 mt-1">{selectedPhoto.description}</p>
              )}
              {selectedPhoto.category && (
                <p className="text-sm opacity-80 mt-1 flex items-center">
                  <Folder className="h-4 w-4 mr-1" />
                  {selectedPhoto.category}
                </p>
              )}
              {isAuthenticated && (
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  {photoLabels(selectedPhoto).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {photoLabels(selectedPhoto).map(label => (
                        <span
                          key={label}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-600"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {label}
                          <button
                            onClick={() => removeLabel(selectedPhoto, label)}
                            className="ml-1 hover:opacity-70"
                            aria-label={`Remove label ${label}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addLabel(selectedPhoto)}
                      placeholder="Add a private label…"
                      maxLength={100}
                      className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] focus:ring-2 focus:ring-primary-500"
                      aria-label="New private label"
                    />
                    <button
                      onClick={() => addLabel(selectedPhoto)}
                      className="p-1.5 bg-primary-600 hover:bg-primary-700 text-[var(--color-on-solid)] rounded-lg"
                      aria-label="Add label"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs opacity-60 mt-1">Labels are private — only you can see them.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        show={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
        title={pendingAction?.type === 'label' ? 'Remove Label' : 'Delete Photo'}
        message={
          pendingAction?.type === 'label'
            ? `Remove label "${pendingAction.label}" from this photo?`
            : 'Are you sure you want to delete this photo?'
        }
        confirmLabel={pendingAction?.type === 'label' ? 'Remove' : 'Delete'}
      />
    </div>
  )
}

export default PhotoGallery
