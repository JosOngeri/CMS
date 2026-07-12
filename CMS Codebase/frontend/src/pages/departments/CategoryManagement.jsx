import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { Tag, Plus, Edit, Trash2, Save, X } from 'lucide-react';

const CategoryManagement = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'var(--color-primary)'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/department-categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/department-categories/${editingCategory.id}`, formData);
        toast.success('Category updated successfully');
      } else {
        await api.post('/department-categories', formData);
        toast.success('Category created successfully');
      }
      setFormData({ name: '', description: '', color: 'var(--color-primary)' });
      setShowForm(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || 'var(--color-primary)'
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await api.delete(`/department-categories/${categoryId}`);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.error || 'Failed to delete category');
    }
  };

  const colorOptions = [
    'var(--color-accent)', // Purple/accent
    'var(--color-primary)', // Blue
    'var(--color-success)', // Green
    'var(--color-warning)', // Orange
    'var(--color-textSecondary)', // Gray
    'var(--color-error)', // Red
    'var(--color-primary)', // Teal (using primary)
  ];

  if (loading) {
    return <FullPageLoading message="Loading categories..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Department Categories</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">Manage department categories for organization</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      {showForm && (
        <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Category Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({...formData, color})}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      formData.color === color ? 'border-[var(--color-border)] scale-110' : 'border-[var(--color-border)]'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
              >
                <Save className="w-4 h-4 inline mr-2" />
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', color: 'var(--color-primary)' });
                }}
                className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface)] transition-colors"
              >
                <X className="w-4 h-4 inline mr-2" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)]">
        <div className="divide-y divide-[var(--color-border)]">
          {categories.map((category) => (
            <div key={category.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: category.color + '20' }}
                >
                  <Tag className="w-6 h-6" style={{ color: category.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-text)]">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-[var(--color-textSecondary)]">{category.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 text-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-50 rounded-lg transition-colors"
                  title="Edit Category"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="p-12 text-center">
            <Tag className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No categories found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;
