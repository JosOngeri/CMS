import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, FileText, Calendar, Tag, Filter, Search, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useContent } from '../../contexts/ContentContext';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const ContentManagement = () => {
  const navigate = useNavigate();
  const { content, categories, tags, isLoading, fetchContent, deleteContent, publishContent } = useContent();
  const toast = useToast();
  const { colors } = useColorPalette();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      await deleteContent(id);
      toast.success('Content deleted successfully');
    } catch (err) {
      // Error handled in context
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishContent(id);
      toast.success('Content published successfully');
    } catch (err) {
      // Error handled in context
    }
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category_id === parseInt(categoryFilter);
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'var(--color-success)';
      case 'draft':
        return 'var(--color-warning)';
      case 'archived':
        return 'var(--color-textSecondary)';
      default:
        return 'var(--color-textSecondary)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'archived':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
              Content Management
            </h1>
            <p className="mt-2" style={{ color: colors.textSecondary }}>
              Manage pages, posts, sermons, and announcements
            </p>
          </div>
          <button
            onClick={() => navigate('/content/create')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus className="h-4 w-4" />
            Create Content
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: colors.textSecondary }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search content..."
              className="w-full pl-10 pr-4 py-2 rounded-lg"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.surface, color: colors.text }}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="space-y-4">
          {filteredContent.length === 0 ? (
            <div className="text-center py-12 rounded-lg" style={{ backgroundColor: colors.surface }}>
              <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: colors.textSecondary }} />
              <p className="text-lg font-medium" style={{ color: colors.text }}>
                No content found
              </p>
              <p className="mt-2" style={{ color: colors.textSecondary }}>
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first content item'}
                }
              </p>
            </div>
          ) : (
            filteredContent.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-lg shadow-sm"
                style={{ backgroundColor: colors.surface }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium" style={{ color: colors.text }}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                          style={{ backgroundColor: getStatusColor(item.status) + '20', color: getStatusColor(item.status) }}
                        >
                          {getStatusIcon(item.status)}
                          {item.status}
                        </span>
                        {item.priority > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}>
                            Priority {item.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-2" style={{ color: colors.textSecondary }}>
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {item.category_name || 'Uncategorized'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div
                      className="text-sm line-clamp-2"
                      style={{ color: colors.textSecondary }}
                    >
                      {item.content?.substring(0, 200) || 'No content preview'}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => navigate(`/content/${item.id}`)}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                      style={{ color: colors.text }}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/content/${item.id}/edit`)}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                      style={{ color: colors.text }}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {item.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(item.id)}
                        className="p-2 rounded-lg hover:bg-green-100 transition-colors"
                        style={{ color: 'var(--color-success)' }}
                        title="Publish"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                      style={{ color: 'var(--color-error)' }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentManagement;