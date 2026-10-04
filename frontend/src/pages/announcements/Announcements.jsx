/**
 * WHAT THIS FILE DOES
 * -------------------
 * The church announcements page. Members click a row to read the full
 * announcement. People with permission can create, edit, or delete them.
 * A priority filter (All / High / Medium / Low) sits at the top.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /api/announcements            → list / create / update / delete
 * - components/common/GmailMessageList.jsx → the list UI
 * - PermissionButton.jsx                  → shows Compose only to writers
 */

import { useState, useEffect } from 'react'
import { Megaphone, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FullPageLoading } from '../../components/common/Loading'
import GmailMessageList from '../../components/common/GmailMessageList'
import Breadcrumb from '../../components/common/Breadcrumb'
import PermissionButton from '../../components/common/PermissionButton'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import PlatformMessagesCard from '../../components/announcements/PlatformMessagesCard'
import { SUCCESS_MESSAGES } from '../../constants/validation'
import { PERMISSIONS } from '../../constants/permissions'

const Announcements = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState([])
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [activeTab, setActiveTab] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null) // {type:'single'|'bulk', id?}
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium'
  })

  const canManage = user?.permissions?.includes(PERMISSIONS.ANNOUNCEMENTS_CREATE)

  const handleCompose = () => {
    if (canManage) {
      setEditingAnnouncement(null)
      setFormData({ title: '', content: '', priority: 'medium' })
      setShowForm(true)
    }
  }

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'high', label: 'High' },
    { id: 'medium', label: 'Medium' },
    { id: 'low', label: 'Low' },
  ]

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await api.get('/announcements')
      setAnnouncements(response.data.announcements || [])
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingAnnouncement) {
        await api.put(`/announcements/${editingAnnouncement.id}`, formData)
        toast.success(SUCCESS_MESSAGES.ANNOUNCEMENT_UPDATED)
      } else {
        await api.post('/announcements', formData)
        toast.success(SUCCESS_MESSAGES.ANNOUNCEMENT_CREATED)
      }
      setFormData({ title: '', content: '', priority: 'medium' })
      setShowForm(false)
      setEditingAnnouncement(null)
      fetchAnnouncements()
    } catch (error) {
      console.error('Failed to save announcement:', error)
      toast.error('Failed to save announcement')
    }
  }

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement)
    setViewingAnnouncement(null)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority
    })
    setShowForm(true)
  }

  const handleDelete = (id) => setPendingDelete({ type: 'single', id })

  const handleBulkAction = (action) => {
    if (action !== 'delete' || !canManage || selectedItems.size === 0) return
    setPendingDelete({ type: 'bulk' })
  }

  const confirmPendingDelete = async () => {
    const pending = pendingDelete
    setPendingDelete(null)
    try {
      if (pending.type === 'single') {
        await api.delete(`/announcements/${pending.id}`)
        toast.success(SUCCESS_MESSAGES.ANNOUNCEMENT_DELETED)
        setViewingAnnouncement(null)
      } else {
        for (const id of selectedItems) {
          await api.delete(`/announcements/${id}`)
        }
        toast.success(`${selectedItems.size} announcement${selectedItems.size === 1 ? '' : 's'} deleted`)
        setSelectedItems(new Set())
      }
      fetchAnnouncements()
    } catch (error) {
      console.error('Failed to delete announcement:', error)
      toast.error('Failed to delete announcement')
    }
  }

  const handleRowAction = (action, item) => {
    if (action === 'delete' && canManage) {
      handleDelete(item.id)
    } else if (action === 'view') {
      setViewingAnnouncement(item)
    }
  }

  const handleToggleSelect = (id) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handleToggleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(new Set(filteredAnnouncements.map(a => a.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const filteredAnnouncements = announcements.filter(announcement => {
    if (activeTab === 'all') return true
    return announcement.priority === activeTab
  }).map(announcement => ({
    ...announcement,
    sender: announcement.author || 'Church Office',
    priority: announcement.priority,
    created_at: announcement.created_at
  }))

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="page-header">
        <h1 className="page-title">Church Announcements</h1>
        <p className="page-subtitle">Stay updated with the latest church news</p>
      </div>

      {/* Direct thread with the SaaS platform team (admin roles only) */}
      <PlatformMessagesCard />

      {/* View announcement modal — read-only for everyone */}
      {viewingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-overlay)]" onClick={() => setViewingAnnouncement(null)}>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                {viewingAnnouncement.title}
              </h2>
              <button
                onClick={() => setViewingAnnouncement(null)}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-[var(--color-textSecondary)]" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-[var(--color-textSecondary)] mb-4 capitalize">
                Priority: {viewingAnnouncement.priority} · {new Date(viewingAnnouncement.created_at).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[var(--color-text)] whitespace-pre-wrap">{viewingAnnouncement.content}</p>
              {canManage && (
                <div className="flex gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => handleEdit(viewingAnnouncement)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(viewingAnnouncement.id)}
                    className="px-4 py-2 bg-[var(--color-error)] text-[var(--color-on-solid)] rounded-lg text-sm"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[var(--color-overlay)]">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingAnnouncement(null)
                  setFormData({ title: '', content: '', priority: 'medium' })
                }}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-[var(--color-textSecondary)]" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="announcement-title" className="block text-sm font-medium text-[var(--color-text)] mb-1">Title</label>
                <input
                  id="announcement-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
              </div>
              <div>
                <label htmlFor="announcement-content" className="block text-sm font-medium text-[var(--color-text)] mb-1">Content</label>
                <textarea
                  id="announcement-content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="announcement-priority" className="block text-sm font-medium text-[var(--color-text)] mb-1">Priority</label>
                <select
                  id="announcement-priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="high">High — urgent news</option>
                  <option value="medium">Medium — normal news</option>
                  <option value="low">Low — for your information</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg"
                >
                  {editingAnnouncement ? 'Update' : 'Post'} Announcement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingAnnouncement(null)
                    setFormData({ title: '', content: '', priority: 'medium' })
                  }}
                  className="px-4 py-2 bg-[var(--color-background)] text-[var(--color-text)] rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gmail-style list */}
      <GmailMessageList
        items={filteredAnnouncements}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCompose={canManage ? handleCompose : undefined}
        onRefresh={fetchAnnouncements}
        onSelectAll={handleToggleSelectAll}
        selectedItems={selectedItems}
        onToggleSelect={handleToggleSelect}
        onBulkAction={handleBulkAction}
        onRowAction={handleRowAction}
        emptyMessage="No announcements found"
        loading={loading}
      />

      <ConfirmDialog
        show={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmPendingDelete}
        title="Delete Announcement"
        message={
          pendingDelete?.type === 'bulk'
            ? `Are you sure you want to delete ${selectedItems.size} announcements?`
            : 'Are you sure you want to delete this announcement?'
        }
        confirmLabel="Delete"
      />
    </div>
  )
}

export default Announcements
