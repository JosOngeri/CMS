/**
 * Users API Module
 * User-related API calls
 */

import { api } from '../../../core/api/client';

/**
 * Member Directory API
 */
export const memberDirectoryApi = {
  getAll: (params = {}) => api.get('/members', { params }),
  getById: (id) => api.get(`/members/${id}`),
  search: (query) => api.get('/members/search', { params: { q: query } }),
  getDepartments: (id) => api.get(`/members/${id}/departments`),
  getContact: (id) => api.get(`/members/${id}/contact`)
};

// Export member directory API
export default memberDirectoryApi;
