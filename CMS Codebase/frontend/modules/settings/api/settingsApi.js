/**
 * Settings API Module
 * Settings-related API calls
 */

import { api } from '../../../core/api/client';

/**
 * Site Settings API
 */
export const settingsApi = {
  getAll: () => api.get('/settings'),
  getByCategory: (category) => api.get(`/settings/${category}`),
  update: (data) => api.put('/settings', data),
  updateCategory: (category, data) => api.put(`/settings/${category}`, data),
  
  // Church info
  getChurchInfo: () => api.get('/settings/church'),
  updateChurchInfo: (data) => api.put('/settings/church', data),
  
  // Service times
  getServiceTimes: () => api.get('/settings/service-times'),
  updateServiceTimes: (data) => api.put('/settings/service-times', data),
  
  // Contact info
  getContactInfo: () => api.get('/settings/contact'),
  updateContactInfo: (data) => api.put('/settings/contact', data),
  
  // Social links
  getSocialLinks: () => api.get('/settings/social'),
  updateSocialLinks: (data) => api.put('/settings/social', data),
  
  // Color palette
  getPalette: () => api.get('/settings/palette'),
  updatePalette: (data) => api.put('/settings/palette', data),
  resetPalette: () => api.post('/settings/palette/reset')
};

// Export settings API
export default settingsApi;
