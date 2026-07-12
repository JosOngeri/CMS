/**
 * Auth API Module
 * Authentication-related API calls
 */

import { api } from '../../../core/api/client';

/**
 * Authentication API
 */
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  changePassword: (data) => api.post('/auth/change-password', data),
  refreshToken: (token) => api.post('/auth/refresh-token', { refreshToken: token }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email })
};

/**
 * User Profile API
 */
export const profileApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  updateAvatar: (formData) => api.post('/users/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPreferences: () => api.get('/users/preferences'),
  updatePreferences: (data) => api.put('/users/preferences', data)
};

/**
 * User Management API (Admin)
 */
export const userManagementApi = {
  getAll: (params = {}) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateRoles: (id, roles) => api.put(`/users/${id}/roles`, { roles }),
  updateDepartment: (id, departmentId) => api.put(`/users/${id}/department`, { department_id: departmentId }),
  activate: (id) => api.post(`/users/${id}/activate`),
  deactivate: (id) => api.post(`/users/${id}/deactivate`)
};

// Export all auth APIs
export default {
  auth: authApi,
  profile: profileApi,
  users: userManagementApi
};
