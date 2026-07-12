import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, User, Tag, ArrowLeft, Search, Filter, AlertCircle, CheckCircle, Info } from 'lucide-react'

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchAnnouncements()
  }, [currentPage, priorityFilter])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      let url = `${import.meta.env.VITE_API_URL}/announcements?page=${currentPage}&limit=12`
      if (priorityFilter) {
        url += `&priority=${priorityFilter}`
      }

      const response = await fetch(url)
      const data = await response.json()
      
      setAnnouncements(data.announcements || [])
      setTotalPages(data.pagination?.pages || 1)
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'urgent': 
        return { 
          icon: AlertCircle, 
          bg: 'bg-red-50', 
          text: 'text-red-700', 
          border: 'border-red-200',
          label: 'Urgent'
        };
      case 'high': 
        return { 
          icon: AlertCircle, 
          bg: 'bg-orange-50', 
          text: 'text-orange-700', 
          border: 'border-orange-200',
          label: 'High'
        };
      case 'low': 
        return { 
          icon: Info, 
          bg: 'bg-[var(--color-background)]', 
          text: 'text-[var(--color-text)]', 
          border: 'border-[var(--color-border)]',
          label: 'Info'
        };
      default: 
        return { 
          icon: CheckCircle, 
          bg: 'bg-[var(--color-primary)]-50', 
          text: 'text-[var(--color-primary)]-700', 
          border: 'border-[var(--color-primary)]-200',
          label: 'Normal'
        };
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="church-gradient text-white py-16">
        <div className="container mx-auto px-4">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Church Announcements</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Stay updated with the latest news, events, and important information from our church community
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Filters */}
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-textSecondary)]" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-12"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-textSecondary)]" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="input pl-12 appearance-none"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="text-sm text-[var(--color-textSecondary)] self-center font-medium">
              {filteredAnnouncements.length} announcement{filteredAnnouncements.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {/* Announcements Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-4 text-[var(--color-textSecondary)]">Loading announcements...</p>
          </div>
        ) : filteredAnnouncements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAnnouncements.map((announcement) => {
              const config = getPriorityConfig(announcement.priority)
              const Icon = config.icon
              return (
                <div 
                  key={announcement.id} 
                  className="bg-[var(--color-surface)] rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
                >
                  {/* Priority Badge */}
                  <div className={`px-6 py-4 flex items-center justify-between ${config.bg} ${config.border} border-b`}>
                    <div className={`flex items-center gap-2 ${config.text}`}>
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-semibold">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)]">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(announcement.created_at)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-bold text-xl text-[var(--color-text)] mb-3 group-hover:text-[var(--color-primary)]-800 transition-colors line-clamp-2">
                      {announcement.title}
                    </h3>
                    <p className="text-[var(--color-textSecondary)] mb-4 line-clamp-3">
                      {announcement.content}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                      <div className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)]">
                        <User className="h-4 w-4" />
                        <span>
                          {announcement.first_name} {announcement.last_name}
                        </span>
                      </div>
                      
                      {announcement.department_name && (
                        <div className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)]">
                          <Tag className="h-4 w-4" />
                          <span>{announcement.department_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-[var(--color-textSecondary)] mb-6">
              <Calendar className="h-20 w-20 mx-auto" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              No announcements found
            </h3>
            <p className="text-[var(--color-textSecondary)]">
              {searchTerm || priorityFilter 
                ? 'Try adjusting your filters or search terms'
                : 'Check back later for new announcements'
              }
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-12 space-x-4">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <span className="px-6 py-3 text-sm text-[var(--color-textSecondary)] font-medium">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Announcements
