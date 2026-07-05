import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, User } from 'lucide-react'

const PublicAnnouncementDetail = () => {
  const { announcementId } = useParams()
  const [announcement, setAnnouncement] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/announcements/public/${announcementId}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || 'Could not load announcement')
        }
        setAnnouncement(data.announcement)
      } catch (e) {
        setError(e.message)
        setAnnouncement(null)
      } finally {
        setLoading(false)
      }
    }
    if (announcementId) load()
  }, [announcementId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="loading-spinner mx-auto" />
      </div>
    )
  }

  if (error || !announcement) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <p className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] mb-6">{error || 'Announcement not found.'}</p>
        <Link to="/announcements" className="text-primary-600 font-medium hover:underline">
          ← Back to announcements
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Link
        to="/announcements"
        className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        All announcements
      </Link>

      <article className="bg-[var(--color-surface)] bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] border-[var(--color-border)] p-8">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] mb-4">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              announcement.priority === 'urgent'
                ? 'bg-red-100 text-red-800'
                : announcement.priority === 'high'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-[var(--color-surface)] text-[var(--color-text)]'
            }`}
          >
            {announcement.priority || 'normal'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {announcement.created_at
              ? new Date(announcement.created_at).toLocaleString()
              : ''}
          </span>
          {(announcement.first_name || announcement.last_name) && (
            <span className="inline-flex items-center gap-1">
              <User className="w-4 h-4" />
              {announcement.first_name} {announcement.last_name}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-[var(--color-text)] text-white mb-4">{announcement.title}</h1>
        {announcement.department_name && (
          <p className="text-sm text-[var(--color-textSecondary)] mb-6">Department: {announcement.department_name}</p>
        )}
        <div className="prose prose-invert max-w-none text-[var(--color-text)] text-[var(--color-textSecondary)] whitespace-pre-wrap">
          {announcement.content}
        </div>
      </article>
    </div>
  )
}

export default PublicAnnouncementDetail
