import { useState, useEffect } from 'react';
import { Book, FileText, Search, Plus, Trash2, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../common/ConfirmDialog';

const DocumentationManager = () => {
  // Shared instance from AuthContext — cookie auth + CSRF + /api prefix built in.
  const { api } = useAuth();
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  // The documents table uses name/description; this editor works in
  // title/content terms, so normalize on the way in and out.
  const normalize = (doc) => ({
    ...doc,
    title: doc.title || doc.name || '',
    content: doc.content ?? doc.description ?? ''
  });

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments((response.data.documents || response.data.data || []).map(normalize));
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (doc) => {
    try {
      const payload = { name: doc.title, description: doc.content, category: doc.category };
      if (doc.id) {
        await api.put(`/documents/${doc.id}`, payload);
        toast.success('Document updated');
      } else {
        await api.post('/documents', payload);
        toast.success('Document created');
      }
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to save document');
    }
  };

  const handleDelete = (id) => setDeleteTarget(id);

  const confirmDelete = async () => {
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const term = searchTerm.toLowerCase();
  const filteredDocs = documents.filter(doc =>
    (doc.title || '').toLowerCase().includes(term) ||
    (doc.category || '').toLowerCase().includes(term)
  );

  if (loading) {
    return <div className="text-center py-8">Loading documentation...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Documentation Manager</h2>
        <button
          onClick={() => setSelectedDoc({ title: '', content: '', category: 'user-guide' })}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:bg-[var(--color-primary)]"
        >
          <Plus size={16} />
          New Document
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]" size={20} />
        <input
          type="text"
          placeholder="Search documentation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Document List */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="font-semibold">Documents</h3>
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`p-3 border rounded-lg cursor-pointer hover:bg-[var(--color-background)] ${
                selectedDoc?.id === doc.id ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)]' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Book size={16} className="text-[var(--color-primary)]" />
                <div className="font-medium">{doc.title}</div>
              </div>
              <div className="text-sm text-[var(--color-textSecondary)] mt-1">{doc.category}</div>
            </div>
          ))}
        </div>

        {/* Document Editor */}
        <div className="md:col-span-2">
          {selectedDoc ? (
            <div className="bg-[var(--color-surface)] border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Edit Document</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(selectedDoc.id)}
                    className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={selectedDoc.title}
                  onChange={(e) => setSelectedDoc({ ...selectedDoc, title: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={selectedDoc.category}
                  onChange={(e) => setSelectedDoc({ ...selectedDoc, category: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="user-guide">User Guide</option>
                  <option value="api-docs">API Documentation</option>
                  <option value="developer-guide">Developer Guide</option>
                  <option value="troubleshooting">Troubleshooting</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <textarea
                  value={selectedDoc.content}
                  onChange={(e) => setSelectedDoc({ ...selectedDoc, content: e.target.value })}
                  className="w-full p-2 border rounded-lg h-64 resize-none"
                />
              </div>
              <button
                onClick={() => handleSave(selectedDoc)}
                className="w-full py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:bg-[var(--color-primary)]"
              >
                Save Document
              </button>
            </div>
          ) : (
            <div className="bg-[var(--color-surface)] border rounded-lg p-6 text-center text-[var(--color-textSecondary)]">
              <FileText size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)]" />
              <p>Select a document to edit or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Export — serializes the loaded docs as a JSON download. No import
          endpoint exists server-side, so no Import button is shown. */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-4">
        <div className="flex gap-4">
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(documents, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'documentation-export.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-background)]"
          >
            <Download size={16} />
            Export All
          </button>
        </div>
      </div>

      <ConfirmDialog
        show={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Document"
        message="Delete this document? This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
};

export default DocumentationManager;
