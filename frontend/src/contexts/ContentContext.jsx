import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
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
  const [content, setContent] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [websiteSettings, setWebsiteSettings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const fetchContent = async (filters = {}) => {
    try {
      const response = await axios.get('/api/content', { params: filters });
      setContent(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch content');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/content/categories');
      setCategories(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch categories');
    }
  };

  const fetchTags = async () => {
    try {
      const response = await axios.get('/api/content/tags');
      setTags(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch tags');
    }
  };

  const fetchWebsiteSettings = async () => {
    try {
      const response = await axios.get('/api/content/website-settings');
      setWebsiteSettings(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch website settings');
    }
  };

  const createContent = async (contentData) => {
    try {
      const response = await axios.post('/api/content', contentData);
      await fetchContent();
      return response.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create content');
      throw err;
    }
  };

  const updateContent = async (id, contentData) => {
    try {
      const response = await axios.put(`/api/content/${id}`, contentData);
      await fetchContent();
      return response.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update content');
      throw err;
    }
  };

  const deleteContent = async (id) => {
    try {
      await axios.delete(`/api/content/${id}`);
      await fetchContent();
    } catch (err) {
      toast.error('Failed to delete content');
      throw err;
    }
  };

  const publishContent = async (id) => {
    try {
      const response = await axios.post(`/api/content/${id}/publish`);
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
  }, []);

  const value = {
    content,
    categories,
    tags,
    websiteSettings,
    isLoading,
    fetchContent,
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