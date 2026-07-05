/**
 * Department API Module
 * Department-related API calls
 */

import { api } from '../../../core/api/client';

/**
 * Departments API
 */
export const departmentApi = {
  getAll: (params = {}) => api.get('/departments', { params }),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
  getMembers: (id) => api.get(`/departments/${id}/members`),
  addMember: (id, userId) => api.post(`/departments/${id}/members`, { user_id: userId }),
  removeMember: (id, userId) => api.delete(`/departments/${id}/members/${userId}`),
  updateMemberRole: (id, userId, role) => api.put(`/departments/${id}/members/${userId}/role`, { role })
};

/**
 * My Departments API
 */
export const myDepartmentsApi = {
  getAll: () => api.get('/department/my-departments'),
  getDashboard: (id) => api.get(`/department/${id}/dashboard`),
  getAnnouncements: (id) => api.get(`/department/${id}/announcements`),
  createAnnouncement: (id, data) => api.post(`/department/${id}/announcements`, data),
  getMembers: (id) => api.get(`/department/${id}/members`),
  getStats: (id) => api.get(`/department/${id}/stats`)
};

// Export all department APIs
export default {
  departments: departmentApi,
  myDepartments: myDepartmentsApi
};
