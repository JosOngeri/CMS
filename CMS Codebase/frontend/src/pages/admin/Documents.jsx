import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X, FileText, Layout } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FullPageLoading } from '../../components/common/Loading'
import PageInfoPanel from '../../components/common/PageInfoPanel'
import { Link } from 'react-router-dom'

const Documents = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('documents')
  const [documents, setDocuments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searchFilters, setSearchFilters] = useState(null)
  const [documentPermissions, setDocumentPermissions] = useState([])
  const [versionHistory, setVersionHistory] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    description: '',
    is_published: true
  })
  const [searchForm, setSearchForm] = useState({
    query: '',
    category: '',
    author: '',
    date_from: '',
    date_to: ''
  })

  const tabs = [
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'content', label: 'Content Management', icon: Layout },
  ]

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
    setFormData({
      title: '',
      slug: '',
      content: '',
      description: '',
      is_published: true
    })
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
      toast.success('Document deleted successfully')
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

  const handleAdvancedSearch = async (e) => {
    e.preventDefault()
    try {
      const response = await api.get('/documents/search', {
        params: searchForm
      })
      setSearchResults(response.data.data || [])
      setShowSearch(true)
    } catch (error) {
      console.error('Error searching documents:', error)
      toast.error('Failed to search documents')
    }
  }

  const handleFullTextSearch = async (query) => {
    try {
      const response = await api.get('/documents/full-text', {
        params: { query }
      })
      setSearchResults(response.data.data || [])
      setShowSearch(true)
    } catch (error) {
      console.error('Error performing full-text search:', error)
      toast.error('Failed to search documents')
    }
  }

  const handleGetSearchFilters = async () => {
    try {
      const response = await api.get('/documents/search/filters')
      setSearchFilters(response.data.data)
    } catch (error) {
      console.error('Error fetching search filters:', error)
    }
  }

  const handleDownloadDocument = async (id) => {
    try {
      const response = await api.get(`/documents/${id}/download`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `document_${id}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document')
    }
  }

  const handleUploadToCloud = async (file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/documents/cloud-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Document uploaded to cloud successfully')
    } catch (error) {
      console.error('Error uploading to cloud:', error)
      toast.error('Failed to upload to cloud')
    }
  }

  const handleGetPermissions = async (documentId) => {
    setSelectedDocument(documents.find(d => d.id === documentId))
    try {
      const response = await api.get(`/documents/${documentId}/permissions`)
      setDocumentPermissions(response.data.data || [])
      setShowPermissions(true)
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast.error('Failed to fetch permissions')
    }
  }

  const handleSetPermission = async (documentId, permissionData) => {
    try {
      await api.post(`/documents/${documentId}/permissions`, permissionData)
      toast.success('Permission updated successfully')
      handleGetPermissions(documentId)
    } catch (error) {
      console.error('Error setting permission:', error)
      toast.error('Failed to update permission')
    }
  }

  const handleGetVersionHistory = async (documentId) => {
    setSelectedDocument(documents.find(d => d.id === documentId))
    try {
      const response = await api.get(`/documents/${documentId}/versions`)
      setVersionHistory(response.data.data || [])
      setShowVersions(true)
    } catch (error) {
      console.error('Error fetching version history:', error)
      toast.error('Failed to fetch version history')
    }
  }

  const handleRollbackToVersion = async (documentId, versionId) => {
    if (!confirm('Are you sure you want to rollback to this version?')) return
    try {
      await api.post(`/documents/${documentId}/rollback/${versionId}`)
      toast.success('Document rolled back successfully')
      fetchDocuments()
      setShowVersions(false)
    } catch (error) {
      console.error('Error rolling back version:', error)
      toast.error('Failed to rollback document')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingDocument) {
        await api.put(`/documents/${editingDocument.id}`, formData)
        toast.success('Document updated successfully')
      } else {
        await api.post('/documents', formData)
        toast.success('Document created successfully')
      }
      setShowModal(false)
      fetchDocuments()
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error(error.response?.data?.message || 'Failed to save document')
    }
  }

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleTitleChange = (e) => {
    const title = e.target.value
    setFormData(prev => ({
      ...prev,
      title,
      slug: editingDocument ? prev.slug : generateSlug(title)
    }))
  }

  if (loading) {
    return <FullPageLoading />
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'documents':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Documents</h1>
                <p className="text-[var(--color-textSecondary)]">Manage editable pages and content</p>
              </div>
              {canManageDocuments && (
                <button
                  onClick={handleCreate}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Document
                </button>
              )}
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-[var(--color-border)]">
                <thead className="bg-[var(--color-background)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-[var(--color-textSecondary)]">
                        No documents found. Create your first document to get started.
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
                            doc.is_published 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                          }`}>
                            {doc.is_published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)]">
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {canManageDocuments && (
                              <>
                                <button
                                  onClick={() => handleTogglePublish(doc.id)}
                                  className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                                  title={doc.is_published ? 'Unpublish' : 'Publish'}
                                >
                                  {doc.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleEdit(doc)}
                                  className="text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-900"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(doc.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )

      case 'content':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Content Management</h1>
              <p className="text-[var(--color-textSecondary)]">Manage website content and pages</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/dashboard/content"
                className="flex items-center gap-4 p-6 bg-[var(--color-surface)] rounded-lg shadow hover:shadow-md transition-shadow border border-[var(--color-border)]"
              >
                <div className="p-3 bg-[var(--color-primary)]-100 rounded-lg">
                  <Layout className="h-6 w-6 text-[var(--color-primary)]-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--color-text)]">Content Management</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">Manage website content</p>
                </div>
              </Link>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)] mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)]-500 text-[var(--color-primary)]-600'
                  : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingDocument ? 'Edit Document' : 'New Document'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  URL-friendly identifier (e.g., "about-us")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                  required
                  placeholder="<h1>Your Title</h1>\n<p>Your content here...</p>"
                />
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  You can use HTML tags for formatting (e.g., &lt;h1&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;)
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="w-4 h-4 text-green-600 border-[var(--color-border)] rounded focus:ring-green-500"
                />
                <label htmlFor="is_published" className="ml-2 text-sm text-[var(--color-text)]">
                  Published (visible to public)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-md hover:bg-[var(--color-background)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingDocument ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Info Panel */}
      <PageInfoPanel
        title="Documents Management"
        description="How to manage editable pages and content"
        steps={[
          "Click 'New Document' to create a new editable page",
          "Enter a title and the system will auto-generate a URL-friendly slug",
          "Write your content using HTML tags for formatting (e.g., <h1>, <p>, <ul>)",
          "Add an optional description to help identify the document",
          "Toggle 'Published' to make the document visible to public users",
          "Click 'Create' to save your new document",
          "Use the edit or delete buttons to manage existing documents"
        ]}
        faqs={[
          {
            question: "What HTML tags can I use?",
            answer: "You can use standard HTML tags like <h1> through <h6> for headings, <p> for paragraphs, <ul> and <li> for lists, <strong> for bold, <em> for italic, and more."
          },
          {
            question: "What is the slug used for?",
            answer: "The slug creates a clean, URL-friendly identifier for your document (e.g., 'about-us'). It's used in the URL to access the document."
          },
          {
            question: "What's the difference between published and draft?",
            answer: "Published documents are visible to all users on the public site. Draft documents are only visible to administrators in the Documents management page."
          },
          {
            question: "Can I edit documents after publishing?",
            answer: "Yes, you can edit documents at any time. Changes take effect immediately after you save them."
          }
        ]}
        defaultOpen={false}
      />
    </div>
  )
}

export default Documents
