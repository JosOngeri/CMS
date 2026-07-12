import React, { useState } from 'react';
import { FileText, Plus, Edit, Trash2, Eye, Save, X, Calendar, Tag, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PermissionButton from '../../components/common/PermissionButton';
import { PERMISSIONS } from '../../constants/permissions';

const Content = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    content_type: 'article',
    category: '',
    tags: [],
    status: 'draft'
  });

  const fetchContent = async () => {
    try {
      const response = await api.get('/content');
      setContent(response.data.content || []);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        slug: item.slug,
        content: item.content,
        content_type: item.content_type,
        category: item.category,
        tags: item.tags || [],
        status: item.status
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        slug: '',
        content: '',
        content_type: 'article',
        category: '',
        tags: [],
        status: 'draft'
      });
    }
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingItem(null);
  };

  const saveContent = async () => {
    try {
      toast.loading('Saving content...');
      if (editingItem) {
        await api.put(`/content/${editingItem.id}`, formData);
        toast.success('Content updated successfully');
      } else {
        await api.post('/content', formData);
        toast.success('Content created successfully');
      }
      closeEditor();
      fetchContent();
    } catch (error) {
      toast.error('Failed to save content');
    }
  };

  const publishContent = async (id) => {
    try {
      toast.loading('Publishing content...');
      await api.put(`/content/${id}/publish`);
      toast.success('Content published successfully');
      fetchContent();
    } catch (error) {
      toast.error('Failed to publish content');
    }
  };

  const deleteContent = async (id) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    
    try {
      toast.loading('Deleting content...');
      await api.delete(`/content/${id}`);
      toast.success('Content deleted successfully');
      fetchContent();
    } catch (error) {
      toast.error('Failed to delete content');
    }
  };

  const handleTagInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      setFormData({ ...formData, tags: [...formData.tags, e.target.value.trim()] });
      e.target.value = '';
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };

  const filteredContent = content.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'published') return item.status === 'published';
    if (filter === 'draft') return item.status === 'draft';
    return item.content_type === filter;
  });

  React.useEffect(() => {
    fetchContent();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading content...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Content Management</h1>
        <PermissionButton
          permission={PERMISSIONS.CONTENT_CREATE}
          buttonProps={{
            onClick: () => openEditor(),
            className: "px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700",
          }}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          New Content
        </PermissionButton>
      </div>

      <div className="flex gap-4 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Content</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="article">Articles</option>
          <option value="page">Pages</option>
          <option value="post">Posts</option>
        </select>
      </div>

      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)]  rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingItem ? 'Edit Content' : 'New Content'}
              </h2>
              <button onClick={closeEditor} className="p-2 hover:bg-[var(--color-surface)] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter content title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="url-friendly-slug"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Content Type</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="article">Article</option>
                    <option value="page">Page</option>
                    <option value="post">Post</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Category"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-[var(--color-primary)]-100 text-[var(--color-primary)]-800 rounded-full text-sm flex items-center gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-[var(--color-primary)]-600">×</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  onKeyDown={handleTagInput}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Add tags (press Enter)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg h-64"
                  placeholder="Write your content here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button
                onClick={closeEditor}
                className="px-4 py-2 border rounded-lg hover:bg-[var(--color-background)]"
              >
                Cancel
              </button>
              <button
                onClick={saveContent}
                className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[var(--color-surface)]  rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Content Items ({filteredContent.length})</h2>
        </div>
        <div className="p-4">
          {filteredContent.length === 0 ? (
            <p className="text-[var(--color-textSecondary)] text-center py-8">No content items yet</p>
          ) : (
            <div className="space-y-2">
              {filteredContent.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--color-background)] bg-[var(--color-surface)] rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-textSecondary)]">{item.content_type} • {item.category}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-textSecondary)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      {item.tags && item.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {item.tags.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {item.status === 'draft' && (
                      <PermissionButton
                        permission={PERMISSIONS.CONTENT_PUBLISH}
                        buttonProps={{
                          onClick: () => publishContent(item.id),
                          className: "p-2 text-green-600 hover:bg-green-50 rounded",
                          title: "Publish",
                        }}
                      >
                        <BookOpen className="w-4 h-4" />
                      </PermissionButton>
                    )}
                    <PermissionButton
                      permission={PERMISSIONS.CONTENT_EDIT}
                      buttonProps={{
                        onClick: () => openEditor(item),
                        className: "p-2 text-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-50 rounded",
                        title: "Edit",
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </PermissionButton>
                    <PermissionButton
                      permission={PERMISSIONS.CONTENT_DELETE}
                      buttonProps={{
                        onClick: () => deleteContent(item.id),
                        className: "p-2 text-red-600 hover:bg-red-50 rounded",
                        title: "Delete",
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </PermissionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Content;
