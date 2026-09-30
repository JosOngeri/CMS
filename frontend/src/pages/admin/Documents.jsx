/**
 * WHAT THIS FILE DOES
 * -------------------
 * The Documents library. Every member sees published documents (policies,
 * minutes, forms). Super Admin, Pastor, and First Elder can also create,
 * edit, publish/unpublish, and delete them.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /api/documents              → list / create / update / delete
 * - backend /api/documents/{id}/toggle-publish → publish switch
 * - components/common/PageInfoPanel.jsx → collapsible "how to use" guide
 */

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X, FileText, ExternalLink } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FullPageLoading } from '../../components/common/Loading'
import PageInfoPanel from '../../components/common/PageInfoPanel'
import { Link } from 'react-router-dom'

const Documents = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    description: '',
    is_published: true
  })

  const canManageDocuments = user?.roles?.some(role =>
    ['Super Admin', 'Pastor', 'First Elder'].includes(role)
  )

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/documents')
      setDocuments(response.data.data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingDocument(null)
    setFormData({ title: '', slug: '', content: '', description: '', is_published: true })
    setShowModal(true)
  }

  const handleEdit = (doc) => {
    setEditingDocument(doc)
    setFormData({
      title: doc.title,
      slug: doc.slug,
      content: doc.content,
      description: doc.description || '',
      is_published: doc.is_published
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      await api.delete(`/documents/${id}`)
      toast.success('Document deleted')
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    }
  }

  const handleTogglePublish = async (id) => {
    try {
      await api.patch(`/documents/${id}/toggle-publish`)
      toast.success('Document status updated')
      fetchDocuments()
    } catch (error) {
      console.error('Error toggling publish status:', error)
      toast.error('Failed to update document status')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingDocument) {
        await api.put(`/documents/${editingDocument.id}`, formData)
        toast.success('Document updated')
      } else {
        await api.post('/documents', formData)
        toast.success('Document created')
      }
      setShowModal(false)
      fetchDocuments()
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error(error.response?.data?.message || 'Failed to save document')
    }
  }

  const generateSlug = (title) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleTitleChange = (e) => {
    const title = e.target.value
    setFormData(prev => ({
      ...prev,
      title,
      slug: editingDocument ? prev.slug : generateSlug(title)
    }))
  }

  if (loading) return <FullPageLoading />

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Documents</h1>
          <p className="text-[var(--color-textSecondary)]">Church documents and editable pages</p>
        </div>
        {canManageDocuments && (
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </button>
        )}
      </div>

      {/* Document table */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow overflow-hidden overflow-x-auto border border-[var(--color-border)]">
        <table className="min-w-full divide-y divide-[var(--color-border)]">
          <thead className="bg-[var(--color-background)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Link</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Last Updated</th>
              {canManageDocuments && (
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={canManageDocuments ? 5 : 4} className="px-6 py-12 text-center text-[var(--color-textSecondary)]">
                  No documents yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-[var(--color-background)]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--color-text)]">{doc.title}</div>
                    {doc.description && (
                      <div className="text-sm text-[var(--color-textSecondary)] truncate max-w-xs">{doc.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--color-textSecondary)]">/{doc.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      doc.is_published ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-background)] text-[var(--color-text)]'
                    }`}>
                      {doc.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)]">
                    {new Date(doc.updated_at).toLocaleDateString()}
                  </td>
                  {canManageDocuments && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleTogglePublish(doc.id)}
                          className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                          title={doc.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {doc.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(doc)}
                          className="text-[var(--color-primary)]"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-[var(--color-error)] hover:opacity-80"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-end sm:items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)]">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">
                {editingDocument ? 'Edit Document' : 'New Document'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--color-textSecondary)]"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  URL-friendly name (e.g., "about-us")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Brief description of the document"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  Content * (HTML supported)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={15}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono text-sm"
                  required
                  placeholder="<h1>Your Title</h1>&#10;<p>Your content here...</p>"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="w-4 h-4 border-[var(--color-border)] rounded"
                />
                <label htmlFor="is_published" className="ml-2 text-sm text-[var(--color-text)]">
                  Published (visible to members)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-md text-[var(--color-text)] hover:bg-[var(--color-background)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-md"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingDocument ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PageInfoPanel
        title="Documents"
        description="How to manage editable pages and content"
        steps={[
          "Click 'New Document' to create a page",
          "Enter a title — the URL slug is generated automatically",
          "Write content using HTML tags for formatting",
          "Toggle 'Published' to make it visible to members"
        ]}
        faqs={[
          {
            question: "What is the slug used for?",
            answer: "The slug creates a clean, URL-friendly address for the document (e.g., 'about-us')."
          },
          {
            question: "What's the difference between published and draft?",
            answer: "Published documents are visible to members. Drafts are only visible to administrators."
          }
        ]}
        defaultOpen={false}
      />
    </div>
  )
}

export default Documents
