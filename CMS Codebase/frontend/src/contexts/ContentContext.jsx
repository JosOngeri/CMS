import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const ContentContext = createContext();

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};

export const ContentProvider = ({ children }) => {
  const { api } = useAuth();
  const [content, setContent] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [websiteSettings, setWebsiteSettings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const toast = useToast();

  const fetchContent = async (filters = {}) => {
    try {
      const response = await api.get('/content', { params: { ...filters, page, limit, status: 'published' } });
      setContent(response.data.data);
      setTotalCount(response.data.total || response.data.data.length);
    } catch (err) {
      toast.error('Failed to fetch content');
    }
  };

  const fetchDrafts = async (filters = {}) => {
    try {
      const response = await api.get('/content', { params: { ...filters, status: 'draft' } });
      setDrafts(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch drafts');
    }
  };

  const fetchPage = async (newPage) => {
    setPage(newPage);
    try {
      const response = await api.get('/content', { params: { page: newPage, limit, status: 'published' } });
      setContent(response.data.data);
      setTotalCount(response.data.total || response.data.data.length);
    } catch (err) {
      toast.error('Failed to fetch page');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/content/categories');
      setCategories(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch categories');
    }
  };

  const fetchTags = async () => {
    try {
      const response = await api.get('/content/tags');
      setTags(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch tags');
    }
  };

  const fetchWebsiteSettings = async () => {
    try {
      const response = await api.get('/content/website-settings');
      setWebsiteSettings(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch website settings');
    }
  };

  const createContent = async (contentData) => {
    try {
      setIsCreating(true);
      const response = await api.post('/content', contentData);
      // Fetch appropriate list based on status
      if (contentData.status === 'draft') {
        await fetchDrafts();
      } else {
        await fetchContent();
      }
      return response.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create content');
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const updateContent = async (id, contentData) => {
    try {
      setIsUpdating(true);
      const response = await api.put(`/content/${id}`, contentData);
      await fetchContent();
      return response.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update content');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteContent = async (id) => {
    try {
      setIsDeleting(true);
      // Optimistic update: immediately remove from local state
      const previousContent = [...content];
      setContent(content.filter(item => item.id !== id));

      await api.delete(`/content/${id}`);
      await fetchContent();
    } catch (err) {
      // Revert on error
      await fetchContent();
      toast.error('Failed to delete content');
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const publishContent = async (id) => {
    try {
      const response = await api.post(`/content/${id}/publish`);
      await fetchContent();
      return response.data;
    } catch (err) {
      toast.error('Failed to publish content');
      throw err;
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchTags();
    fetchWebsiteSettings();
    fetchDrafts();
  }, []);

  const value = {
    content,
    drafts,
    categories,
    tags,
    websiteSettings,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    page,
    limit,
    totalCount,
    fetchContent,
    fetchDrafts,
    fetchPage,
    fetchCategories,
    fetchTags,
    fetchWebsiteSettings,
    createContent,
    updateContent,
    deleteContent,
    publishContent,
  };

  return <ContentContext.Provider value={value}>{children}</Content.Provider>;
};