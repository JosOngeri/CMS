import { useState, useEffect } from 'react';
import { Search, Filter, Folder, FileText, Download, Share, MoreVertical, Grid, List, Tag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const DocumentLibrary = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data.documents || []);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId) => {
    try {
      const response = await api.get(`/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'all' || doc.category === category;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="text-center py-8">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Document Library</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600' : 'bg-[var(--color-surface)]'}`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600' : 'bg-[var(--color-surface)]'}`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]" size={20} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Categories</option>
          <option value="policies">Policies</option>
          <option value="reports">Reports</option>
          <option value="forms">Forms</option>
          <option value="presentations">Presentations</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Documents Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-[var(--color-surface)] border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="text-[var(--color-primary)]-600" size={24} />
                  <span className="font-semibold truncate">{doc.name}</span>
                </div>
                <button className="p-1 hover:bg-[var(--color-surface)] rounded">
                  <MoreVertical size={16} />
                </button>
              </div>
              <p className="text-sm text-[var(--color-textSecondary)] mb-3 line-clamp-2">{doc.description || 'No description'}</p>
              <div className="flex items-center gap-2 mb-3">
                {doc.tags?.slice(0, 2).map((tag, index) => (
                  <span key={index} className="text-xs px-2 py-1 bg-[var(--color-surface)] rounded-full flex items-center gap-1">
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--color-textSecondary)] mb-3">
                <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(doc.id)}
                  className="flex-1 py-2 text-sm bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600 rounded hover:bg-[var(--color-primary)]-200 flex items-center justify-center gap-1"
                >
                  <Download size={14} />
                  Download
                </button>
                <button className="flex-1 py-2 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)] flex items-center justify-center gap-1">
                  <Share size={14} />
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--color-background)]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Size</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Modified</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="border-t hover:bg-[var(--color-background)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="text-[var(--color-primary)]-600" size={16} />
                      <span className="font-medium">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-[var(--color-surface)] rounded text-xs">{doc.category}</span>
                  </td>
                  <td className="px-4 py-3">{(doc.size / 1024 / 1024).toFixed(2)} MB</td>
                  <td className="px-4 py-3">{new Date(doc.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(doc.id)}
                        className="p-2 hover:bg-[var(--color-surface)] rounded"
                      >
                        <Download size={16} />
                      </button>
                      <button className="p-2 hover:bg-[var(--color-surface)] rounded">
                        <Share size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12 text-[var(--color-textSecondary)]">
          <Folder size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)]" />
          <p>No documents found</p>
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;
