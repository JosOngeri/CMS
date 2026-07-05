import { useState, useEffect } from 'react'
import { Calendar, Plus, Edit, Trash2, Clock, MapPin, Users, Filter, User, ChevronDown, ChevronRight, CheckCircle, XCircle, CalendarCheck } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EventsEmptyState } from '../../components/common/EmptyState'
import PermissionButton from '../../components/common/PermissionButton'
import { API_ENDPOINTS } from '../../constants/api'
import { SUCCESS_MESSAGES } from '../../constants/validation'
import { groupEventsByDate, createInfiniteEventLoop, EVENT_DATE_GROUPS } from '../../utils/dateGrouping'
import { PERMISSIONS } from '../../constants/permissions'

const Events = () => {
  const toast = useToast()
  const { api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])

  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [infiniteLoopMode, setInfiniteLoopMode] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [rsvps, setRsvps] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    organizer: '',
    category: 'service',
    poster: null
  })

  const categories = [
    { value: 'all', label: 'All Events' },
    { value: 'service', label: 'Services' },
    { value: 'prayer', label: 'Prayer' },
    { value: 'music', label: 'Music' },
    { value: 'youth', label: 'Youth' },
    { value: 'fellowship', label: 'Fellowship' },
    { value: 'outreach', label: 'Outreach' }
  ]

  useEffect(() => {
    fetchEvents()
    fetchRsvps()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await api.get('/events')
      setEvents(response.data.events || [])
    } catch (error) {
      console.error('Failed to fetch events:', error)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const fetchRsvps = async () => {
    try {
      const response = await api.get('/events/rsvps')
      setRsvps(response.data.rsvps || [])
    } catch (error) {
      console.error('Failed to fetch RSVPs:', error)
    }
  }

  const handleRsvp = async (eventId, status) => {
    try {
      await api.post(`/events/${eventId}/rsvp`, { status })
      toast.success(`RSVP ${status} successfully`)
      fetchRsvps()
    } catch (error) {
      console.error('Failed to RSVP:', error)
      toast.error('Failed to RSVP')
    }
  }

  const getRsvpStatus = (eventId) => {
    const rsvp = rsvps.find(r => r.event_id === eventId)
    return rsvp ? rsvp.status : null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const formDataToSend = new FormData()
      Object.keys(formData).forEach(key => {
        if (key !== 'poster' && formData[key]) {
          formDataToSend.append(key, formData[key])
        }
      })

      if (formData.poster) {
        formDataToSend.append('poster', formData.poster)
      }

      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toast.success(SUCCESS_MESSAGES.EVENT_UPDATED)
      } else {
        await api.post('/events', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toast.success(SUCCESS_MESSAGES.EVENT_CREATED)
      }
      setFormData({ title: '', description: '', date: '', time: '', location: '', organizer: '', category: 'service', poster: null })
      setShowForm(false)
      setEditingEvent(null)
      fetchEvents()
    } catch (error) {
      console.error('Failed to save event:', error)
      toast.error('Failed to save event')
    }
  }

  const handleEdit = (event) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      organizer: event.organizer,
      category: event.category,
      poster: null
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await api.delete(`/events/${id}`)
        toast.success(SUCCESS_MESSAGES.EVENT_DELETED)
        fetchEvents()
      } catch (error) {
        console.error('Failed to delete event:', error)
        toast.error('Failed to delete event')
      }
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'service': return 'text-[var(--color-primary)]-600 bg-[var(--color-primary)]-50 bg-[var(--color-primary)]-900/20'
      case 'prayer': return 'text-purple-600 bg-purple-50 bg-purple-900/20'
      case 'music': return 'text-green-600 bg-green-50 bg-green-900/20'
      case 'youth': return 'text-orange-600 bg-orange-50 bg-orange-900/20'
      case 'fellowship': return 'text-pink-600 bg-pink-50 bg-pink-900/20'
      case 'outreach': return 'text-indigo-600 bg-indigo-50 bg-indigo-900/20'
      default: return 'text-[var(--color-textSecondary)] bg-[var(--color-background)]'
    }
  }

  const filteredEvents = filterCategory === 'all'
    ? events
    : events.filter(event => event.category === filterCategory)

  const displayEvents = infiniteLoopMode
    ? createInfiniteEventLoop(filteredEvents, 3)
    : filteredEvents

  const groupedEvents = groupEventsByDate(displayEvents)

  const toggleGroup = (groupTitle) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }))
  }

  const sortedEvents = [...filteredEvents].sort((a, b) =>
    new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time)
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isUpcoming = (dateString) => {
    return new Date(dateString) > new Date()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Church Events</h1>
        <p className="page-subtitle">Stay informed about upcoming church activities and events</p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[var(--color-textSecondary)]" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={infiniteLoopMode}
                onChange={(e) => setInfiniteLoopMode(e.target.checked)}
                className="w-4 h-4 text-[var(--color-primary)]-600 rounded focus:ring-[var(--color-primary)]-500"
              />
              <span className="text-sm text-[var(--color-text)] ">Infinite Loop (Yearly Plans)</span>
            </label>
          </div>
        </div>

        <PermissionButton
          permission={PERMISSIONS.EVENTS_CREATE}
          buttonProps={{
            onClick: () => setShowForm(true),
            className: "flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors",
          }}
        >
          <Plus size={16} />
          New Event
        </PermissionButton>
      </div>

      {/* Event Form */}
      {showForm && (
        <Card>
          <h3 className="text-lg font-bold text-[var(--color-text)] mb-4">
            {editingEvent ? 'Edit Event' : 'New Event'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Event Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                >
                  {categories.filter(cat => cat.value !== 'all').map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Organizer
                </label>
                <input
                  type="text"
                  value={formData.organizer}
                  onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                Event Poster (Optional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => setFormData({...formData, poster: e.target.files[0]})}
                className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
              />
              <p className="text-xs text-[var(--color-textSecondary)]  mt-1">
                Upload an image for the event poster (JPEG, PNG, WebP, max 10MB)
              </p>
              {editingEvent?.poster_url && !formData.poster && (
                <div className="mt-2">
                  <p className="text-sm text-[var(--color-textSecondary)]  mb-1">Current poster:</p>
                  <img
                    src={editingEvent.poster_url}
                    alt="Current event poster"
                    className="h-32 w-auto rounded border border-[var(--color-border)] "
                    loading="lazy"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
              >
                {editingEvent ? 'Update' : 'Create'} Event
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingEvent(null)
                  setFormData({
                    title: '',
                    description: '',
                    date: '',
                    time: '',
                    location: '',
                    organizer: '',
                    category: 'service',
                    poster: null
                  })
                }}
                className="px-4 py-2 border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Events List */}
      {groupedEvents && Object.keys(groupedEvents).length > 0 ? (
        Object.entries(groupedEvents).map(([groupTitle, groupEvents]) => (
          <div key={groupTitle} className="space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer p-3 bg-[var(--color-background)]  rounded-lg"
              onClick={() => toggleGroup(groupTitle)}
            >
              <h3 className="text-lg font-semibold text-[var(--color-text)] ">{groupTitle}</h3>
              {expandedGroups[groupTitle] ? <ChevronDown /> : <ChevronRight />}
            </div>

            {expandedGroups[groupTitle] && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupEvents.map((event) => (
                  <Card key={event.id} className="hover:shadow-lg transition-shadow">
                    {event.poster_url && (
                      <img
                        src={event.poster_url}
                        alt={event.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                        loading="lazy"
                      />
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(event.category)}`}>
                          {categories.find(c => c.value === event.category)?.label || event.category}
                        </span>
                        {isUpcoming(event.date) && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 bg-green-900/20 text-green-400">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-[var(--color-text)]  mb-2">{event.title}</h4>
                      <p className="text-sm text-[var(--color-textSecondary)]  mb-3 line-clamp-2">{event.description}</p>
                      <div className="space-y-2 text-sm text-[var(--color-textSecondary)] ">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={16} />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User size={16} />
                          <span>{event.organizer}</span>
                        </div>
                        {getRsvpStatus(event.id) && (
                          <div className="flex items-center gap-2">
                            <CalendarCheck size={16} />
                            <span className={`font-medium ${getRsvpStatus(event.id) === 'attending' ? 'text-green-600' : 'text-red-600'}`}>
                              RSVP: {getRsvpStatus(event.id)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        {isUpcoming(event.date) && (
                          <>
                            {getRsvpStatus(event.id) === 'attending' ? (
                              <button
                                onClick={() => handleRsvp(event.id, 'declined')}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                              >
                                <XCircle size={14} />
                                Decline
                              </button>
                            ) : getRsvpStatus(event.id) === 'declined' ? (
                              <button
                                onClick={() => handleRsvp(event.id, 'attending')}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                              >
                                <CheckCircle size={14} />
                                Accept
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRsvp(event.id, 'attending')}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                  <CheckCircle size={14} />
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRsvp(event.id, 'declined')}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                >
                                  <XCircle size={14} />
                                  Decline
                                </button>
                              </>
                            )}
                          </>
                        )}
                        <PermissionButton
                          permission={PERMISSIONS.EVENTS_EDIT}
                          buttonProps={{
                            onClick: () => handleEdit(event),
                            className: "flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm",
                          }}
                        >
                          <Edit size={14} />
                          Edit
                        </PermissionButton>
                        <PermissionButton
                          permission={PERMISSIONS.EVENTS_DELETE}
                          buttonProps={{
                            onClick: () => handleDelete(event.id),
                            className: "flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm",
                          }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </PermissionButton>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        <EventsEmptyState />
      )}
    </div>
  )
}

export default Events
