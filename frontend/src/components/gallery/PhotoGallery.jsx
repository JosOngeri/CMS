import { useState, useEffect } from 'react'
import { Search, Grid, List, Play, X, ChevronLeft, ChevronRight, Upload, Trash2, Calendar, Folder, CheckSquare, Square } from 'lucide-react'
import Card from '../common/Card'
import { EmptyState } from '../common/EmptyState'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'

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
    return matchesSearch && matchesCategory
  })

  const displayedPhotos = limit ? filteredPhotos.slice(0, limit) : filteredPhotos

  const handlePhotoClick = (photo, index) => {
    if (viewMode === 'slideshow') {
      setSlideshowIndex(index)
    } else {
      setSelectedPhoto(photo)
    }
  }

  const handleDelete = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return
    
    try {
      const response = await fetch(`/api/gallery/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        toast.success('Photo deleted successfully')
        if (onDelete) onDelete(photoId)
      } else {
        toast.error('Failed to delete photo')
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
      toast.error('Failed to delete photo')
    }
  }

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
              className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
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
              className={`relative group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow ${selectedPhotos.has(photo.id) ? 'ring-2 ring-green-500' : ''}`}
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
                    <CheckSquare className="h-5 w-5 text-green-600" />
                  ) : (
                    <Square className="h-5 w-5 text-[var(--color-textSecondary)]" />
                  )}
                </div>
              )}
              {renderImage(photo, 'w-full h-48 object-cover')}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all">
                <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-sm font-medium truncate">{photo.caption || 'Untitled'}</p>
                  {photo.category && (
                    <p className="text-xs text-[var(--color-textSecondary)] flex items-center">
                      <Folder className="h-3 w-3 mr-1" />
                      {photo.category}
                    </p>
                  )}
                </div>
                {canUpload && onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(photo.id)
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete photo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
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
                </div>
                {canUpload && onDelete && (
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    aria-label="Delete photo"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Slideshow View */}
      {viewMode === 'slideshow' && (
        <div className="relative">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {displayedPhotos.length > 0 && renderImage(displayedPhotos[slideshowIndex], 'w-full h-full object-contain')}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              <h3 className="text-white font-semibold">
                {displayedPhotos[slideshowIndex]?.caption || 'Untitled'}
              </h3>
              {displayedPhotos[slideshowIndex]?.description && (
                <p className="text-white text-sm opacity-80">
                  {displayedPhotos[slideshowIndex].description}
                </p>
              )}
            </div>
            <button
              onClick={() => navigateSlideshow('prev')}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => navigateSlideshow('next')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <button
              onClick={() => setIsSlideshowPlaying(!isSlideshowPlaying)}
              className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full"
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
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
        >
          <div className="relative max-w-4xl max-h-full">
            {renderImage(selectedPhoto, 'max-w-full max-h-[90vh] object-contain')}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 p-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface)] text-[var(--color-text)] rounded-full"
              aria-label="Close lightbox"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 text-white">
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoGallery
