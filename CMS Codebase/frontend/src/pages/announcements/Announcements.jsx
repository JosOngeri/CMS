import { useState, useEffect } from 'react'
import { Megaphone, Plus, Edit, Trash2, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import GmailMessageList from '../../components/common/GmailMessageList'
import Breadcrumb from '../../components/common/Breadcrumb'
import PermissionButton from '../../components/common/PermissionButton'
import { API_ENDPOINTS } from '../../constants/api'
import { SUCCESS_MESSAGES } from '../../constants/validation'
import { PERMISSIONS } from '../../constants/permissions'

const Announcements = () => {
  const { user } = useAuth()
  const toast = useToast()
  const { api } = useAuth()
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState([])
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [activeTab, setActiveTab] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium'
  })

  const canCreateAnnouncement = user?.permissions?.includes(PERMISSIONS.ANNOUNCEMENTS_CREATE)

  const handleCompose = () => {
    if (canCreateAnnouncement) {
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
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      try {
        await api.delete(`/announcements/${id}`)
        toast.success(SUCCESS_MESSAGES.ANNOUNCEMENT_DELETED)
        fetchAnnouncements()
      } catch (error) {
        console.error('Failed to delete announcement:', error)
        toast.error('Failed to delete announcement')
      }
    }
  }

  const handleBulkAction = async (action) => {
    try {
      if (action === 'delete') {
        if (confirm(`Are you sure you want to delete ${selectedItems.size} announcements?`)) {
          for (const id of selectedItems) {
            await api.delete(`/announcements/${id}`)
          }
          toast.success(`${selectedItems.size} announcements deleted`)
        }
      } else if (action === 'archive') {
        toast.success('Announcements archived')
      } else if (action === 'markRead') {
        toast.success('Announcements marked as read')
      }
      setSelectedItems(new Set())
      fetchAnnouncements()
    } catch (error) {
      console.error('Failed to perform bulk action:', error)
      toast.error('Failed to perform action')
    }
  }

  const handleRowAction = (action, item) => {
    if (action === 'delete') {
      handleDelete(item.id)
    } else if (action === 'edit') {
      handleEdit(item)
    } else if (action === 'star') {
      toast.success('Announcement starred')
    } else if (action === 'archive') {
      toast.success('Announcement archived')
    } else if (action === 'markRead') {
      toast.success('Announcement marked as read')
    } else if (action === 'snooze') {
      toast.success('Announcement snoozed')
    } else if (action === 'view') {
      handleEdit(item)
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
    sender: announcement.author || 'Admin',
    subject: announcement.title,
    content: announcement.content,
    type: 'Announcement',
    priority: announcement.priority,
    read: true,
    starred: false,
    created_at: announcement.created_at
  }))

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Church Announcements</h1>
        <p className="page-subtitle">Stay updated with the latest church news and events</p>
      </div>

      {/* Announcement Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] ">
              <h2 className="text-lg font-semibold text-[var(--color-text)] ">
                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingAnnouncement(null)
                  setFormData({ title: '', content: '', priority: 'medium' })
                }}
                className="p-2 hover:bg-[var(--color-surface)]  rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-textSecondary)]" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                >
                  {editingAnnouncement ? 'Update' : 'Create'} Announcement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingAnnouncement(null)
                    setFormData({ title: '', content: '', priority: 'medium' })
                  }}
                  className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gmail-style List */}
      <GmailMessageList
        items={filteredAnnouncements}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCompose={handleCompose}
        onRefresh={fetchAnnouncements}
        onSelectAll={handleToggleSelectAll}
        selectedItems={selectedItems}
        onToggleSelect={handleToggleSelect}
        onBulkAction={handleBulkAction}
        onRowAction={handleRowAction}
        emptyMessage="No announcements found"
        loading={loading}
      />
    </div>
  )
}

export default Announcements
