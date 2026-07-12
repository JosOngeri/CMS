/**
 * Payment API Module
 * Payment-related API calls
 */

import { api } from '../../../core/api/client';

/**
 * Payments API
 */
export const paymentApi = {
  getAll: (params = {}) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  getMyPayments: () => api.get('/payments/my-payments'),
  getHistory: () => api.get('/payments/history'),
  getCategories: () => api.get('/payments/categories'),
  initiateMpesa: (data) => api.post('/payments/mpesa', data),
  verifyMpesa: (checkoutRequestId) => api.get(`/payments/mpesa/verify/${checkoutRequestId}`),
  getStatus: (id) => api.get(`/payments/${id}/status`),
  create: (data) => api.post('/payments', data),
  record: (data) => api.post('/payments/record', data)
};

/**
 * Payment Management API (Admin)
 */
export const paymentManagementApi = {
  getAll: (params = {}) => api.get('/payments/manage', { params }),
  getStats: () => api.get('/payments/stats'),
  getSummary: (params) => api.get('/payments/summary', { params }),
  reconcile: (data) => api.post('/payments/reconcile', data),
  export: (params) => api.get('/payments/export', { params, responseType: 'blob' })
};

// Export all payment APIs
export default {
  payments: paymentApi,
  management: paymentManagementApi
};
