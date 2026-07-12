import { useState, useEffect } from 'react';
import { Book, FileText, Search, Plus, Edit, Trash2, Download, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import axios from 'axios';

const DocumentationManager = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create local api instance with correct baseURL
  const docApi = axios.create({
    baseURL: '' // Empty to use Vite proxy
  });

  // Add auth token interceptor
  docApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await docApi.get('/documentation');
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (doc) => {
    try {
      if (doc.id) {
        await docApi.put(`/documentation/${doc.id}`, doc);
        toast.success('Document updated');
      } else {
        await docApi.post('/documentation', doc);
        toast.success('Document created');
      }
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to save document');
    }
  };

  const handleDelete = async (id) => {
    try {
      await docApi.delete(`/documentation/${id}`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
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
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
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
                selectedDoc?.id === doc.id ? 'bg-[var(--color-primary)]-50 border-[var(--color-primary)]-500' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Book size={16} className="text-[var(--color-primary)]-600" />
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
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
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
                className="w-full py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
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

      {/* Export/Import */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-4">
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]">
            <Download size={16} />
            Export All
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]">
            <Upload size={16} />
            Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentationManager;
