/**
 * Dashboard API Module
 * Dashboard-related API calls
 */

import { api } from '../../../core/api/client';

/**
 * Dashboard API
 */
export const dashboardApi = {
  // Main dashboard
  getStats: () => api.get('/dashboard/stats'),
  getSummary: () => api.get('/dashboard/summary'),
  getRecentActivity: () => api.get('/dashboard/activity'),
  getNotifications: () => api.get('/dashboard/notifications'),
  markNotificationRead: (id) => api.put(`/dashboard/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/dashboard/notifications/read-all'),
  
  // Admin dashboard
  getAdminStats: () => api.get('/dashboard/admin/stats'),
  getUserStats: () => api.get('/dashboard/admin/users'),
  getPaymentStats: () => api.get('/dashboard/admin/payments'),
  getSystemHealth: () => api.get('/dashboard/admin/health'),
  
  // Charts and analytics
  getCharts: (params = {}) => api.get('/dashboard/charts', { params }),
  getReports: (params = {}) => api.get('/dashboard/reports', { params })
};

// Export dashboard API
export default dashboardApi;
