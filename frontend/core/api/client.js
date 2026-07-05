/**
 * API Client
 * Centralized Axios instance with interceptors and error handling
 * Extracted from AuthContext for better separation of concerns
 */

import axios from 'axios';
import { toast } from 'react-toastify';

// Create axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - adds auth token
apiClient.interceptors.request.use(
  (config) => {
    // Check localStorage first, then sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API requests in development
    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.params || '');
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handles errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`API Response: ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  (error) => {
    const { response, request, message } = error;
    
    // Handle different error types
    if (response) {
      // Server responded with error status
      const { status, data } = response;
      
      switch (status) {
        case 400:
          // Bad request - show validation errors
          if (data?.error) {
            toast.error(data.error);
          } else if (data?.details) {
            data.details.forEach(err => toast.error(err.msg || err.message || err));
          } else {
            toast.error('Invalid request. Please check your input.');
          }
          break;
          
        case 401:
          // Unauthorized - clear auth and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('refreshToken');
          sessionStorage.removeItem('user');
          
          toast.error('Session expired. Please log in again.');
          window.location.href = '/auth/login';
          break;
          
        case 403:
          // Forbidden - insufficient permissions
          toast.error('You do not have permission to perform this action.');
          break;
          
        case 404:
          // Not found
          toast.error(data?.error || 'Resource not found.');
          break;
          
        case 409:
          // Conflict
          toast.error(data?.error || 'Conflict occurred. Resource may already exist.');
          break;
          
        case 422:
          // Unprocessable entity - validation errors
          if (data?.details) {
            data.details.forEach(err => toast.error(err.msg || err.message || err));
          } else {
            toast.error(data?.error || 'Validation failed.');
          }
          break;
          
        case 429:
          // Rate limited
          toast.error('Too many requests. Please try again later.');
          break;
          
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          toast.error('Server error. Please try again later.');
          console.error('Server Error:', data);
          break;
          
        default:
          toast.error(data?.error || 'An error occurred. Please try again.');
      }
    } else if (request) {
      // Request made but no response received
      toast.error('Network error. Please check your connection.');
      console.error('Network Error:', message);
    } else {
      // Error in setting up the request
      toast.error('Request error. Please try again.');
      console.error('Request Error:', message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Generic API request methods
 */
export const api = {
  /**
   * GET request
   */
  get: async (url, config = {}) => {
    const response = await apiClient.get(url, config);
    return response.data;
  },

  /**
   * POST request
   */
  post: async (url, data = {}, config = {}) => {
    const response = await apiClient.post(url, data, config);
    return response.data;
  },

  /**
   * PUT request
   */
  put: async (url, data = {}, config = {}) => {
    const response = await apiClient.put(url, data, config);
    return response.data;
  },

  /**
   * PATCH request
   */
  patch: async (url, data = {}, config = {}) => {
    const response = await apiClient.patch(url, data, config);
    return response.data;
  },

  /**
   * DELETE request
   */
  delete: async (url, config = {}) => {
    const response = await apiClient.delete(url, config);
    return response.data;
  }
};

/**
 * Upload file with multipart/form-data
 */
export const uploadFile = async (url, file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  };
  
  if (onProgress) {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted);
    };
  }
  
  const response = await apiClient.post(url, formData, config);
  return response.data;
};

/**
 * Download file
 */
export const downloadFile = async (url, filename) => {
  const response = await apiClient.get(url, {
    responseType: 'blob'
  });
  
  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return true;
};

export default apiClient;
