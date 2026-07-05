/**
 * SMS API Module
 * SMS-related API calls
 */

import { api } from '../../../core/api/client';

/**
 * SMS API
 */
export const smsApi = {
  // Send SMS
  send: (data) => api.post('/sms/send', data),
  sendBulk: (data) => api.post('/sms/send-bulk', data),
  
  // Templates
  getTemplates: () => api.get('/sms/templates'),
  getTemplateById: (id) => api.get(`/sms/templates/${id}`),
  createTemplate: (data) => api.post('/sms/templates', data),
  updateTemplate: (id, data) => api.put(`/sms/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/sms/templates/${id}`),
  
  // History and logs
  getHistory: (params = {}) => api.get('/sms/history', { params }),
  getLogs: (params = {}) => api.get('/sms/logs', { params }),
  getStats: (params = {}) => api.get('/sms/stats', { params }),
  
  // Recipients
  getRecipients: () => api.get('/sms/recipients'),
  getGroups: () => api.get('/sms/groups'),
  createGroup: (data) => api.post('/sms/groups', data),
  updateGroup: (id, data) => api.put(`/sms/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/sms/groups/${id}`)
};

// Export SMS API
export default smsApi;
