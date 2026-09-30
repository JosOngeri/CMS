/**
 * WHAT THIS FILE DOES
 * -------------------
 * The Documents library. Members see the church's uploaded files (policies,
 * minutes, forms). Super Admin, Pastor, and Department Head can upload and
 * edit metadata; Super Admin and Pastor can delete.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend GET    /api/documents            → list / search
 * - backend POST   /api/documents/upload     → upload files (multipart)
 * - backend PUT    /api/documents/{id}       → update name/category/tags/description
 * - backend DELETE /api/documents/{id}       → soft delete
 * - backend GET    /api/documents/{id}/download → file download
 * - components/common/PageInfoPanel.jsx      → collapsible "how to use" guide
 */

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, FileText, Download, Upload } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FullPageLoading } from '../../components/common/Loading'
import PageInfoPanel from '../../components/common/PageInfoPanel'

const emptyForm = { name: '', category: '', tags: '', description: '' }

const Documents = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [documents, setDocuments] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [files, setFiles] = useState([])

  const canManage = user?.roles?.some(role =>
    ['Super Admin', 'Pastor', 'Department Head'].includes(role)
  )
  const canDelete = user?.roles?.some(role =>
    ['Super Admin', 'Pastor'].includes(role)
  )

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async (searchTerm = '') => {
    try {
      setLoading(true)
      const response = await api.get('/documents', {
        params: searchTerm ? { search: searchTerm } : {}
      })
      const payload = response.data?.data ?? response.data
      setDocuments(payload?.documents || payload || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingDocument(null)
    setFormData(emptyForm)
    setFiles([])
    setShowModal(true)
  }

  const handleEdit = (doc) => {
    setEditingDocument(doc)
    setFormData({
      name: doc.name || doc.title || '',
      category: doc.category || '',
      tags: Array.isArray(doc.tags) ? doc.tags.join(', ') : (doc.tags || ''),
      description: doc.description || ''
    })
    setFiles([])
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      await api.delete(`/documents/${id}`)
      toast.success('Document deleted')
      fetchDocuments(search)
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    }
  }

  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = doc.file_name || doc.name || 'document'
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (editingDocument) {
        await api.put(`/documents/${editingDocument.id}`, {
          name: formData.name,
          category: formData.category,
          tags: formData.tags,
          description: formData.description
        })
        toast.success('Document updated')
      } else {
        if (!files.length) {
          toast.error('Please choose at least one file to upload')
          return
        }
        const data = new FormData()
        files.forEach((file) => data.append('files', file))
        data.append('category', formData.category)
        data.append('tags', formData.tags)
        data.append('description', formData.description)
        await api.post('/documents/upload', data)
        toast.success('Document uploaded')
      }
      setShowModal(false)
      fetchDocuments(search)
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error(error.response?.data?.message || 'Failed to save document')
    } finally {
      setSaving(false)
    }
  }

  const formatSize = (bytes) => {
    const n = Number(bytes)
    if (!n) return ''
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading && !documents.length) return <FullPageLoading />

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Documents</h1>
          <p className="text-[var(--color-textSecondary)]">Church document library</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDocuments(search)}
            placeholder="Search documents..."
            className="px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <button
            onClick={() => fetchDocuments(search)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-md text-[var(--color-text)] hover:bg-[var(--color-background)]"
          >
            Search
          </button>
          {canManage && (
            <button
              onClick={handleCreate}
              className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Document table */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow overflow-hidden overflow-x-auto border border-[var(--color-border)]">
        <table className="min-w-full divide-y divide-[var(--color-border)]">
          <thead className="bg-[var(--color-background)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Uploaded By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--color-textSecondary)]">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-[var(--color-textSecondary)]" />
                  No documents yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-[var(--color-background)]">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[var(--color-text)]">{doc.name || doc.title || doc.file_name}</div>
                    {doc.description && (
                      <div className="text-sm text-[var(--color-textSecondary)] truncate max-w-xs">{doc.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)]">
                    {doc.category || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)]">
                    {formatSize(doc.size || doc.file_size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)]">
                    {doc.uploaded_by_name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)]">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {canManage && (
                        <button
                          onClick={() => handleEdit(doc)}
                          className="text-[var(--color-primary)]"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-[var(--color-error)] hover:opacity-80"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Upload/edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-end sm:items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)]">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">
                {editingDocument ? 'Edit Document' : 'Upload Documents'}
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
              {!editingDocument && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Files *</label>
                  <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-[var(--color-border)] rounded-md cursor-pointer hover:bg-[var(--color-background)]">
                    <Upload className="w-5 h-5 text-[var(--color-textSecondary)]" />
                    <span className="text-sm text-[var(--color-textSecondary)]">
                      {files.length ? `${files.length} file(s) selected` : 'Click to choose files (up to 10)'}
                    </span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 10))}
                    />
                  </label>
                </div>
              )}

              {editingDocument && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="e.g., Minutes, Policies, Forms"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Comma-separated tags"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Brief description of the document"
                />
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
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-md disabled:opacity-60"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : editingDocument ? 'Update' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PageInfoPanel
        title="Documents"
        description="How to manage the church document library"
        steps={[
          "Click 'Upload' to add one or more files",
          "Add a category and tags so members can find documents easily",
          "Use the download icon to save a copy",
          "Edit lets you rename or re-categorize a document"
        ]}
        faqs={[
          {
            question: "Who can see uploaded documents?",
            answer: "All members of your church can view and download documents. Only leaders can upload, edit, or delete them."
          },
          {
            question: "What file types can I upload?",
            answer: "Common document types such as PDFs, Word files, and spreadsheets. Up to 10 files per upload."
          }
        ]}
        defaultOpen={false}
      />
    </div>
  )
}

export default Documents
