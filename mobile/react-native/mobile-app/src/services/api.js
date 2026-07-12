import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  announcementsDB,
  eventsDB,
  membersDB,
  paymentsDB
} from './localDatabase';
import networkService from './networkService';
import offlineQueueService from './offlineQueueService';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5080/api',
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting token from storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh-token', { refreshToken });
          const { accessToken } = response.data;
          
          await AsyncStorage.setItem('token', accessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');
        // Navigation will be handled by the auth context
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    // Store both tokens
    if (response.data.accessToken) {
      await AsyncStorage.setItem('token', response.data.accessToken);
    }
    if (response.data.refreshToken) {
      await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
    }
    if (response.data.user) {
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  requestPasswordReset: async (email) => {
    const response = await api.post('/auth/request-password-reset', { email });
    return response.data;
  },
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },
  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
  },
  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const user = await AsyncStorage.getItem('user');
      if (token && user) {
        return {
          token,
          refreshToken,
          user: JSON.parse(user),
          isAuthenticated: true,
          isLoading: false
        };
      }
      return {
        token: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false
      };
    } catch (error) {
      return {
        token: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false
      };
    }
  }
};

export const paymentsAPI = {
  getPaymentHistory: async () => {
    // Try local first
    try {
      const localData = await paymentsDB.getAll();
      if (localData.length > 0) {
        return { success: true, data: localData, source: 'local' };
      }
    } catch (error) {
      console.error('Error reading from local database:', error);
    }

    // If online, try remote
    if (networkService.isOnline()) {
      try {
        const response = await api.get('/payments/my-payments');
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          await paymentsDB.clearAll();
          for (const item of data.data) {
            await paymentsDB.insert({
              ...item,
              sync_status: 'synced',
              synced_at: new Date().toISOString()
            });
          }
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error fetching from remote:', error);
        return { success: false, error: error.message, source: 'remote' };
      }
    }

    return { success: true, data: [], source: 'local' };
  },
  makePayment: async (paymentData) => {
    // If online, try to make payment immediately
    if (networkService.isOnline()) {
      try {
        const response = await api.post('/payments', paymentData);
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          await paymentsDB.insert({
            ...data.data,
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error making payment:', error);
        // Queue for later if it fails
        await offlineQueueService.queuePost('/payments', paymentData);
        return { success: false, error: error.message, queued: true };
      }
    } else {
      // If offline, queue the payment
      await offlineQueueService.queuePost('/payments', paymentData);
      return { success: false, error: 'Offline - payment queued', queued: true };
    }
  },
  getPaymentCategories: async () => {
    // Payment categories should be fetched from remote only
    if (networkService.isOnline()) {
      try {
        const response = await api.get('/payments/categories');
        return response.data;
      } catch (error) {
        console.error('Error fetching payment categories:', error);
        return { success: false, error: error.message };
      }
    }
    
    return { success: false, error: 'Offline - categories not available' };
  },
  getPaymentStatus: async (transactionId) => {
    // Try local first
    try {
      const localData = await paymentsDB.getById(transactionId);
      if (localData) {
        return { success: true, data: localData, source: 'local' };
      }
    } catch (error) {
      console.error('Error reading from local database:', error);
    }

    // If online, try remote
    if (networkService.isOnline()) {
      try {
        const response = await api.get(`/payments/status/${transactionId}`);
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          await paymentsDB.insert({
            ...data.data,
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error fetching payment status:', error);
        return { success: false, error: error.message, source: 'remote' };
      }
    }

    return { success: false, error: 'Not found offline', source: 'local' };
  }
};

export const announcementsAPI = {
  getAnnouncements: async () => {
    // Try local first
    try {
      const localData = await announcementsDB.getAll();
      if (localData.length > 0) {
        return { success: true, data: localData, source: 'local' };
      }
    } catch (error) {
      console.error('Error reading from local database:', error);
    }

    // If online, try remote
    if (networkService.isOnline()) {
      try {
        const response = await api.get('/announcements');
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          await announcementsDB.clearAll();
          for (const item of data.data) {
            await announcementsDB.insert({
              ...item,
              sync_status: 'synced',
              synced_at: new Date().toISOString()
            });
          }
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error fetching from remote:', error);
        return { success: false, error: error.message, source: 'remote' };
      }
    }

    // Return empty if offline and no local data
    return { success: true, data: [], source: 'local' };
  },
  getAnnouncementById: async (id) => {
    // Try local first
    try {
      const localData = await announcementsDB.getById(id);
      if (localData) {
        return { success: true, data: localData, source: 'local' };
      }
    } catch (error) {
      console.error('Error reading from local database:', error);
    }

    // If online, try remote
    if (networkService.isOnline()) {
      try {
        const response = await api.get(`/announcements/${id}`);
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          await announcementsDB.insert({
            ...data.data,
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error fetching from remote:', error);
        return { success: false, error: error.message, source: 'remote' };
      }
    }

    return { success: false, error: 'Not found offline', source: 'local' };
  },
  getPublicAnnouncements: async () => {
    // Try local first
    try {
      const localData = await announcementsDB.getAll();
      const publicData = localData.filter(item => item.is_published);
      if (publicData.length > 0) {
        return { success: true, data: publicData, source: 'local' };
      }
    } catch (error) {
      console.error('Error reading from local database:', error);
    }

    // If online, try remote
    if (networkService.isOnline()) {
      try {
        const response = await api.get('/announcements/public');
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          for (const item of data.data) {
            await announcementsDB.insert({
              ...item,
              sync_status: 'synced',
              synced_at: new Date().toISOString()
            });
          }
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error fetching from remote:', error);
        return { success: false, error: error.message, source: 'remote' };
      }
    }

    return { success: true, data: [], source: 'local' };
  }
};

export const eventsAPI = {
  getEvents: async () => {
    // Try local first
    try {
      const localData = await eventsDB.getAll();
      if (localData.length > 0) {
        return { success: true, data: localData, source: 'local' };
      }
    } catch (error) {
      console.error('Error reading from local database:', error);
    }

    // If online, try remote
    if (networkService.isOnline()) {
      try {
        const response = await api.get('/events');
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          await eventsDB.clearAll();
          for (const item of data.data) {
            await eventsDB.insert({
              ...item,
              sync_status: 'synced',
              synced_at: new Date().toISOString()
            });
          }
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error fetching from remote:', error);
        return { success: false, error: error.message, source: 'remote' };
      }
    }

    return { success: true, data: [], source: 'local' };
  },
  getEventById: async (id) => {
    // Try local first
    try {
      const localData = await eventsDB.getById(id);
      if (localData) {
        return { success: true, data: localData, source: 'local' };
      }
    } catch (error) {
      console.error('Error reading from local database:', error);
    }

    // If online, try remote
    if (networkService.isOnline()) {
      try {
        const response = await api.get(`/events/${id}`);
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          await eventsDB.insert({
            ...data.data,
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error fetching from remote:', error);
        return { success: false, error: error.message, source: 'remote' };
      }
    }

    return { success: false, error: 'Not found offline', source: 'local' };
  },
  getPublicEvents: async () => {
    // Try local first
    try {
      const localData = await eventsDB.getAll();
      const publicData = localData.filter(item => item.is_public);
      if (publicData.length > 0) {
        return { success: true, data: publicData, source: 'local' };
      }
    } catch (error) {
      console.error('Error reading from local database:', error);
    }

    // If online, try remote
    if (networkService.isOnline()) {
      try {
        const response = await api.get('/events?is_public=true');
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          for (const item of data.data) {
            await eventsDB.insert({
              ...item,
              sync_status: 'synced',
              synced_at: new Date().toISOString()
            });
          }
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error fetching from remote:', error);
        return { success: false, error: error.message, source: 'remote' };
      }
    }

    return { success: true, data: [], source: 'local' };
  }
};

export const membersAPI = {
  getMembers: async () => {
    // Try local first
    try {
      const localData = await membersDB.getAll();
      if (localData.length > 0) {
        return { success: true, data: localData, source: 'local' };
      }
    } catch (error) {
      console.error('Error reading from local database:', error);
    }

    // If online, try remote
    if (networkService.isOnline()) {
      try {
        const response = await api.get('/auth/users');
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          await membersDB.clearAll();
          for (const item of data.data) {
            await membersDB.insert({
              ...item,
              sync_status: 'synced',
              synced_at: new Date().toISOString()
            });
          }
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error fetching from remote:', error);
        return { success: false, error: error.message, source: 'remote' };
      }
    }

    return { success: true, data: [], source: 'local' };
  },
  getMemberById: async (id) => {
    // Try local first
    try {
      const localData = await membersDB.getById(id);
      if (localData) {
        return { success: true, data: localData, source: 'local' };
      }
    } catch (error) {
      console.error('Error reading from local database:', error);
    }

    // If online, try remote
    if (networkService.isOnline()) {
      try {
        const response = await api.get(`/auth/users/${id}`);
        const data = response.data;
        
        // Cache to local
        if (data.success && data.data) {
          await membersDB.insert({
            ...data.data,
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });
        }
        
        return { ...data, source: 'remote' };
      } catch (error) {
        console.error('Error fetching from remote:', error);
        return { success: false, error: error.message, source: 'remote' };
      }
    }

    return { success: false, error: 'Not found offline', source: 'local' };
  }
};

export const profileAPI = {
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  }
};

export const departmentsAPI = {
  getDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },
  getDepartmentById: async (id) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },
  getMyDepartments: async () => {
    const response = await api.get('/departments/my-departments');
    return response.data;
  }
};

export const smsAPI = {
  sendSMS: async (data) => {
    const response = await api.post('/sms/send', data);
    return response.data;
  },
  getSMSTemplates: async () => {
    const response = await api.get('/sms/templates');
    return response.data;
  },
  createSMSTemplate: async (data) => {
    const response = await api.post('/sms/templates', data);
    return response.data;
  }
};

export const dashboardAPI = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
  getRecentActivity: async () => {
    const response = await api.get('/dashboard/activity');
    return response.data;
  }
};

// Context provider for API
export const APIProvider = ({ children }) => {
  return (
    // This will be expanded to include auth context logic
    <>{children}</>
  );
};
