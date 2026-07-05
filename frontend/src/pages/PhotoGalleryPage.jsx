import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Megaphone, ArrowRight, Search, Filter, LayoutGrid, List, SlidersHorizontal, Smartphone } from 'lucide-react'
import Card from '../components/common/Card'
import GalleryNavigation from '../components/gallery/GalleryNavigation'
import ApplePhotoGrid from '../components/gallery/ApplePhotoGrid'
import PhotoLightbox from '../components/gallery/PhotoLightbox'
import TelegramAuthModal from '../components/gallery/TelegramAuthModal'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { getPhotosByPeriod } from '../utils/dateGrouping'

const PhotoGalleryPage = () => {
  const toast = useToast()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Telegram auth modal state
  const [showTelegramAuth, setShowTelegramAuth] = useState(false)
  
  // State
  const [photos, setPhotos] = useState([])
  const [filteredPhotos, setFilteredPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [currentView, setCurrentView] = useState(searchParams.get('view') || 'library')
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [favorites, setFavorites] = useState(new Set())
  
  // Pagination
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  
  // Check if user is admin
  const isAdmin = user?.roles?.some(role => 
    ['Super Admin', 'Pastor', 'Department Head'].includes(role)
  )

  // Fetch photos based on current view
  useEffect(() => {
    fetchPhotos()
  }, [currentView, page, selectedCategory, searchTerm])

  // Fetch categories
  useEffect(() => {
    fetchCategories()
    loadFavorites()
  }, [])

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (currentView !== 'library') params.set('view', currentView)
    if (searchTerm) params.set('search', searchTerm)
    if (selectedCategory) params.set('category', selectedCategory)
    setSearchParams(params)
  }, [currentView, searchTerm, selectedCategory])

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      
      let url
      let response
      
      // Use search endpoint if there's a search term
      if (searchTerm) {
        url = `/api/gallery/photos/search?search=${encodeURIComponent(searchTerm)}&limit=50&offset=${(page - 1) * 50}`
        response = await fetch(url)
        const data = await response.json()
        
        if (data.success && data.data) {
          if (page === 1) {
            setPhotos(data.data)
          } else {
            setPhotos(prev => [...prev, ...data.data])
          }
          setFilteredPhotos(data.data)
          setTotalCount(data.data.length)
          setHasMore(data.data.length === 50)
        }
      } else {
        // Regular photos endpoint
        url = `/api/gallery/photos?page=${page}&limit=50`
        
        // Add filters based on view
        if (currentView.startsWith('category-')) {
          const category = currentView.replace('category-', '')
          url += `&category=${encodeURIComponent(category)}`
        } else if (selectedCategory) {
          url += `&category=${encodeURIComponent(selectedCategory)}`
        }

        response = await fetch(url)
        const data = await response.json()
        
        if (data.photos) {
          if (page === 1) {
            setPhotos(data.photos)
          } else {
            setPhotos(prev => [...prev, ...data.photos])
          }
          
          // Filter based on view type
          let filtered = data.photos
          switch (currentView) {
            case 'recents':
              filtered = getPhotosByPeriod(data.photos, 'week')
              break
            case 'favorites':
              filtered = data.photos.filter(p => favorites.has(p.id))
              break
            case 'albums':
              // Show all for now, albums view would need album data
              break
            default:
              // library and category views - already filtered by API
              break
          }
          
          setFilteredPhotos(filtered)
          setTotalCount(data.pagination?.total || 0)
          setHasMore(data.photos.length === 50 && data.pagination?.page < data.pagination?.totalPages)
        }
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error)
      toast.error('Failed to load photos')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/gallery/categories')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const loadFavorites = () => {
    const saved = localStorage.getItem('gallery_favorites')
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)))
    }
  }

  const saveFavorites = (newFavorites) => {
    localStorage.setItem('gallery_favorites', JSON.stringify([...newFavorites]))
    setFavorites(newFavorites)
  }

  const handleFavoriteToggle = useCallback((photoId) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(photoId)) {
      newFavorites.delete(photoId)
      toast.success('Removed from favorites')
    } else {
      newFavorites.add(photoId)
      toast.success('Added to favorites')
    }
    saveFavorites(newFavorites)
  }, [favorites, toast])

  const handlePhotoClick = useCallback((photo, index) => {
    // Find the actual index in the full photos array
    const photoIndex = photos.findIndex(p => p.id === photo.id)
    setCurrentPhotoIndex(photoIndex >= 0 ? photoIndex : 0)
    setLightboxOpen(true)
  }, [photos])

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1)
    }
  }

  const handleViewChange = (view) => {
    setCurrentView(view)
    setPage(1)
    setPhotos([])
    setFilteredPhotos([])
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setPage(1)
    setPhotos([])
    setFilteredPhotos([])
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    setPhotos([])
    setFilteredPhotos([])
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setCurrentView('library')
    setPage(1)
  }

  // Get display photos based on current view
  const displayPhotos = currentView === 'favorites' 
    ? photos.filter(p => favorites.has(p.id))
    : currentView === 'recents'
    ? getPhotosByPeriod(photos, 'week')
    : photos

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Page Header */}
      <section className="church-gradient text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Photo Gallery
            </h1>
            <p className="text-lg text-[var(--color-primary)]-100 mb-6">
              Browse photos from our church events, sermons, and activities
            </p>
            <div className="flex items-center space-x-4">
              <Link
                to="/auth/login"
                className="inline-flex items-center space-x-2 bg-[var(--color-surface)] text-primary-600 hover:bg-[var(--color-surface)] px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                <span>Join Our Community</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-[var(--color-primary)]-200">
                {totalCount.toLocaleString()} photos
              </span>
              {isAdmin && (
                <button
                  onClick={() => setShowTelegramAuth(true)}
                  className="inline-flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 px-4 py-2.5 rounded-lg font-medium transition-colors border border-blue-400/30"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Configure Telegram</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <div className="hidden lg:block flex-shrink-0">
              <div className="sticky top-20">
                <GalleryNavigation
                  photoCount={totalCount}
                  albumCount={0}
                  categories={categories}
                  currentView={currentView}
                  onViewChange={handleViewChange}
                  canUpload={false}
                />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="bg-[var(--color-surface)]  rounded-xl shadow-sm border border-[var(--color-border)]  p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Search */}
                  <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-textSecondary)]" />
                    <input
                      type="text"
                      placeholder="Search photos..."
                      value={searchTerm}
                      onChange={handleSearch}
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-background)]  border border-[var(--color-border)]  rounded-lg text-[var(--color-text)]  placeholder-[var(--color-textSecondary)] focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </form>

                  {/* Filters */}
                  <div className="flex items-center space-x-2">
                    {/* Category Filter */}
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value)
                        setPage(1)
                      }}
                      className="px-3 py-2.5 bg-[var(--color-background)]  border border-[var(--color-border)]  rounded-lg text-[var(--color-text)]  text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    {/* Clear Filters */}
                    {(searchTerm || selectedCategory || currentView !== 'library') && (
                      <button
                        onClick={clearFilters}
                        className="px-3 py-2.5 text-sm text-[var(--color-textSecondary)]  hover:text-[var(--color-text)] transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* View Title & Count */}
                <div className="mt-4 pt-4 border-t border-[var(--color-border)] ">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[var(--color-text)] ">
                      {currentView === 'library' && 'All Photos'}
                      {currentView === 'recents' && 'Recent Photos'}
                      {currentView === 'favorites' && 'Favorite Photos'}
                      {currentView === 'albums' && 'Albums'}
                      {currentView.startsWith('category-') && categories.find(c => c === currentView.replace('category-', ''))}
                    </h2>
                    <span className="text-sm text-[var(--color-textSecondary)] ">
                      {displayPhotos.length} photo{displayPhotos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Photo Grid */}
              <Card className="p-4">
                <ApplePhotoGrid
                  photos={displayPhotos}
                  onPhotoClick={handlePhotoClick}
                  enableFavorites={true}
                  onFavoriteToggle={handleFavoriteToggle}
                  favorites={favorites}
                  loading={loading && page === 1}
                  gridColumns={{ mobile: 2, tablet: 3, desktop: 4, large: 5 }}
                />

                {/* Load More */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-[var(--color-surface)] text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Loading...</span>
                        </>
                      ) : (
                        <span>Load More Photos</span>
                      )}
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!loading && displayPhotos.length === 0 && (
                  <div className="text-center py-16">
                    <LayoutGrid className="h-16 w-16 mx-auto text-[var(--color-textSecondary)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--color-text)]  mb-2">
                      No photos found
                    </h3>
                    <p className="text-[var(--color-textSecondary)]  mb-4">
                      {searchTerm || selectedCategory
                        ? 'Try adjusting your search or filters'
                        : currentView === 'favorites'
                        ? 'You haven\'t favorited any photos yet'
                        : 'No photos have been uploaded yet'}
                    </p>
                    {(searchTerm || selectedCategory) && (
                      <button
                        onClick={clearFilters}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)]  border-t border-[var(--color-border)]  p-2 z-40">
        <div className="flex justify-around">
          {[
            { id: 'library', label: 'Library', icon: LayoutGrid },
            { id: 'recents', label: 'Recent', icon: LayoutGrid },
            { id: 'favorites', label: 'Favorites', icon: LayoutGrid },
            { id: 'albums', label: 'Albums', icon: LayoutGrid }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleViewChange(id)}
              className={`flex flex-col items-center p-2 rounded-lg ${
                currentView === id
                  ? 'text-primary-600'
                  : 'text-[var(--color-textSecondary)] '
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Photo Lightbox */}
      <PhotoLightbox
        photos={photos}
        currentIndex={currentPhotoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setCurrentPhotoIndex}
        onFavoriteToggle={handleFavoriteToggle}
        favorites={favorites}
        canDownload={true}
        showInfo={true}
        onDownload={(photo) => {
          const link = document.createElement('a')
          link.href = `/api/gallery/image/${photo.id}?download=true`
          link.download = photo.caption || `photo-${photo.id}.jpg`
          link.click()
          toast.success('Download started')
        }}
      />

      {/* Telegram Auth Modal */}
      <TelegramAuthModal
        isOpen={showTelegramAuth}
        onClose={() => setShowTelegramAuth(false)}
      />
    </div>
  )
}

export default PhotoGalleryPage
