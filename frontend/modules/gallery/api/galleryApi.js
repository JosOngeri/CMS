/**
 * Gallery API Module
 * Gallery-related API calls
 */

import { api, uploadFile } from '../../../core/api/client';

/**
 * Gallery API
 */
export const galleryApi = {
  getAll: (params = {}) => api.get('/gallery', { params }),
  getById: (id) => api.get(`/gallery/${id}`),
  getPublic: (params = {}) => api.get('/gallery/public', { params }),
  getFeatured: () => api.get('/gallery/featured'),
  getCategories: () => api.get('/gallery/categories'),
  getAlbums: () => api.get('/gallery/albums'),
  createAlbum: (data) => api.post('/gallery/albums', data),
  updateAlbum: (id, data) => api.put(`/gallery/albums/${id}`, data),
  deleteAlbum: (id) => api.delete(`/gallery/albums/${id}`),
  
  // Photo operations
  getPhotos: (params = {}) => api.get('/gallery/photos', { params }),
  getPhotoById: (id) => api.get(`/gallery/photos/${id}`),
  uploadPhoto: (file, albumId, onProgress) => 
    uploadFile(`/gallery/photos/upload?album_id=${albumId}`, file, onProgress),
  updatePhoto: (id, data) => api.put(`/gallery/photos/${id}`, data),
  deletePhoto: (id) => api.delete(`/gallery/photos/${id}`),
  setFeatured: (id) => api.post(`/gallery/photos/${id}/featured`),
  reorderPhotos: (albumId, photoIds) => api.put(`/gallery/albums/${albumId}/reorder`, { photo_ids: photoIds })
};

// Export gallery API
export default galleryApi;
