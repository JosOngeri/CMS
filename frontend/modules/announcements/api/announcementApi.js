/**
 * Announcement API Module
 * Announcement-related API calls
 */

import { api } from '../../../core/api/client';

/**
 * Announcements API
 */
export const announcementApi = {
  getAll: (params = {}) => api.get('/announcements', { params }),
  getById: (id) => api.get(`/announcements/${id}`),
  getPublic: (params = {}) => api.get('/announcements/public', { params }),
  getFeatured: () => api.get('/announcements/featured'),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  publish: (id) => api.post(`/announcements/${id}/publish`),
  unpublish: (id) => api.post(`/announcements/${id}/unpublish`),
  getCategories: () => api.get('/announcements/categories')
};

// Export announcement API
export default announcementApi;
