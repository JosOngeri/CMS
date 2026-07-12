/**
 * useAuth Hook
 * Authentication and user data hook
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../core/api/client';
import authApi from '../api/authApi';

/**
 * Hook for authentication state and operations
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (e) {
        logout();
      }
    }
    
    setIsLoading(false);
  };

  const login = useCallback(async (credentials, remember = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authApi.auth.login(credentials);
      const { user, token, refreshToken } = response;
      
      // Store tokens
      if (remember) {
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('user', JSON.stringify(user));
      }
      
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true, user };
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authApi.auth.register(data);
      return { success: true, data: response };
    } catch (err) {
      setError(err.message || 'Registration failed');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/auth/login';
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateUser,
    hasRole: (role) => user?.roles?.includes(role),
    hasAnyRole: (roles) => user?.roles?.some(r => roles.includes(r))
  };
};

/**
 * Hook for user profile
 */
export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authApi.profile.getProfile();
      setProfile(response);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await authApi.profile.updateProfile(data);
      setProfile(response);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile
  };
};

export default useAuth;
