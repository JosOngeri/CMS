/**
 * Events API Module
 * Event-related API calls
 */

import { api } from '../../../core/api/client';

/**
 * Events API
 */
export const eventApi = {
  getAll: (params = {}) => api.get('/events', { params }),
  getById: (id) => api.get(`/events/${id}`),
  getUpcoming: (params = {}) => api.get('/events/upcoming', { params }),
  getPublic: (params = {}) => api.get('/events/public', { params }),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  register: (id) => api.post(`/events/${id}/register`),
  unregister: (id) => api.post(`/events/${id}/unregister`),
  getAttendees: (id) => api.get(`/events/${id}/attendees`),
  addAttendee: (id, userId) => api.post(`/events/${id}/attendees`, { user_id: userId }),
  removeAttendee: (id, userId) => api.delete(`/events/${id}/attendees/${userId}`),
  getCategories: () => api.get('/events/categories')
};

// Export events API
export default eventApi;
