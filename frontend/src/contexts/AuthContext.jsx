/**
 * WHAT THIS FILE DOES
 * -------------------
 * This is the app's identity layer. It remembers who is logged in, gives every
 * component access to the logged-in user, and provides an axios instance that
 * automatically sends credentials and CSRF tokens to the backend.
 *
 * It also handles safe defaults: missing `roles` or `permissions` arrays become
 * empty arrays so every permission check downstream works without crashing.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend/controllers/auth.controller.js → login/logout/profile endpoints
 * - hooks/usePermission.js → reads user.permissions for guards
 * - utils/cache.js → caches profile for 5 minutes
 * - All pages → consume user / api through useAuth()
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import requestCache from '../utils/cache';

const AuthContext = createContext(null);

// Stable hash for cache keys. djb2 is fast and good enough for short strings.
const djb2Hash = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Ref, not state — the api instance reads it per-request so the instance never
  // has to be rebuilt when the token arrives after mount.
  const csrfTokenRef = useRef(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const profileFetched = useRef(false);
  const csrfFetched = useRef(false);
  const inactivityTimerRef = useRef(null);
  const inFlightRequests = useRef(new Map());
  const offlineQueue = useRef([]);

  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Fetch CSRF token once on mount so state-changing requests can send it.
  useEffect(() => {
    if (csrfFetched.current) return;
    csrfFetched.current = true;
    axios.get('/api/csrf-token', { withCredentials: true })
      .then(res => { csrfTokenRef.current = res.data.csrfToken; })
      .catch(() => {});
  }, []);

  // Shared axios instance. The backend is reached through the Vite proxy at /api.
  // Every request carries cookies; non-state-changing requests are cached briefly.
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: '',
      withCredentials: true,
      timeout: 30000,
    });

    instance.interceptors.request.use(
      (config) => {
        resetInactivityTimer();

        // Auto-prefix with /api when the caller did not include it.
        if (config.url && !config.url.startsWith('/api') && !config.url.startsWith('http')) {
          config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
        }

        // Attach CSRF token to writes.
        if (['post', 'put', 'patch', 'delete'].includes(config.method) && csrfTokenRef.current) {
          config.headers['x-csrf-token'] = csrfTokenRef.current;
        }

        // Deduplicate in-flight GET requests.
        if (config.method === 'get') {
          const keyString = JSON.stringify({
            method: config.method,
            url: config.url,
            params: config.params || {},
            data: config.data,
          });
          config.cacheKey = `cache_${djb2Hash(keyString)}`;

          const requestKey = `${config.method}_${config.url}_${JSON.stringify(config.params || {})}`;
          if (inFlightRequests.current.has(requestKey)) {
            config.cancelToken = new axios.CancelToken((cancel) => cancel('Request deduplicated'));
          } else {
            config.__requestKey = requestKey;
            inFlightRequests.current.set(requestKey, true);
          }
        }

        // Queue requests when offline; they flush when connection returns.
        if (!navigator.onLine) {
          return new Promise((resolve, reject) => {
            offlineQueue.current.push({ config, resolve, reject });
          });
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    instance.interceptors.response.use(
      (response) => {
        if (response.config.__requestKey) {
          inFlightRequests.current.delete(response.config.__requestKey);
        }
        if (response.config.method === 'get' && response.config.cacheKey) {
          requestCache.set(response.config.cacheKey, response.data, 2 * 60 * 1000);
        }
        return response;
      },
      (error) => {
        if (error.config?.__requestKey) {
          inFlightRequests.current.delete(error.config.__requestKey);
        }

        const status = error.response?.status;
        // 401/403 means the session is gone. Clear state and let ProtectedRoute redirect.
        if (status === 401 || status === 403) {
          setUser(null);
          requestCache.clear();
        }
        return Promise.reject(error);
      }
    );

    return instance;
    // csrfTokenRef is a ref — intentionally absent so the instance is created
    // once and stays stable for the lifetime of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, []);

  // Fetch profile once at startup (unless already on an auth page).
  const fetchProfile = useCallback(async () => {
    if (profileFetched.current) return;
    profileFetched.current = true;

    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth')) {
      setLoading(false);
      return;
    }

    const cached = requestCache.get('auth_profile');
    if (cached) {
      setUser(normalizeUser(cached));
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/auth/profile');
      const userData = response.data.data;
      requestCache.set('auth_profile', userData, 5 * 60 * 1000);
      setUser(normalizeUser(userData));
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        console.log('[Auth] No active session');
      } else {
        console.error('[Auth] Profile fetch failed:', error.message);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Guard against missing fields from the backend.
  const normalizeUser = (data) => {
    // 'Admin' is the seeded church-administrator role but gate lists across the
    // app are written for 'Super Admin'. Keep 'Admin' in the array (labels show
    // "Church Admin") and add 'Super Admin' so role checks pass — mirrors the
    // same alias in backend middleware/auth.js requireRole.
    const roles = data.roles || [];
    const expandedRoles = roles.includes('Admin') && !roles.includes('Super Admin')
      ? [...roles, 'Super Admin']
      : roles;

    return {
      ...data,
      // Login returns camelCase; /profile returns snake_case — expose both
      first_name: data.first_name ?? data.firstName ?? null,
      last_name: data.last_name ?? data.lastName ?? null,
      church_id: data.church_id ?? data.churchId ?? null,
      church_slug: data.church_slug ?? data.churchSlug ?? null,
      avatar_url: data.avatar_url ?? data.avatarUrl ?? null,
      roles: expandedRoles,
      permissions: data.permissions || [],
    };
  };

  useEffect(() => {
    fetchProfile();
    resetInactivityTimer();

    const handleOnline = () => {
      setIsOnline(true);
      while (offlineQueue.current.length > 0) {
        const request = offlineQueue.current.shift();
        api(request.config).then(request.resolve).catch(request.reject);
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchProfile, api, resetInactivityTimer]);

  const login = useCallback(async (credentials) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      const userData = response.data.data.user;
      // Clear stale GET cache so a different user on this browser never sees
      // the previous session's cached data.
      requestCache.clear();
      setUser(normalizeUser(userData));
      requestCache.set('auth_profile', userData, 5 * 60 * 1000);
      return { success: true };
    } catch (error) {
      const responseData = error.response?.data;
      const message =
        responseData?.errors?.[0]?.msg ||
        responseData?.error ||
        responseData?.message ||
        'Login failed';
      console.error('[Auth] Login failed:', error.response?.status, message);
      return { success: false, error: message };
    }
  }, [api]);

  const register = useCallback(async (data) => {
    try {
      const response = await api.post('/api/auth/register', data);
      return response.data;
    } catch (error) {
      const responseData = error.response?.data;
      const message =
        responseData?.errors?.[0]?.msg ||
        responseData?.error ||
        responseData?.message ||
        'Registration failed';
      console.error('[Auth] Registration failed:', error.response?.status, message);
      return { success: false, error: message };
    }
  }, [api]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // Ignore errors; clear local state regardless.
    }
    setUser(null);
    requestCache.clear();
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    window.location.href = '/';
  }, [api]);

  // Permission checking helpers
  const hasPermission = useCallback((permission) => user?.permissions?.includes(permission) || false, [user?.permissions]);
  const hasAnyPermission = useCallback((permissions) => {
    if (!permissions || permissions.length === 0) return true;
    return permissions.some(p => hasPermission(p));
  }, [hasPermission]);
  const hasAllPermissions = useCallback((permissions) => {
    if (!permissions || permissions.length === 0) return true;
    return permissions.every(p => hasPermission(p));
  }, [hasPermission]);
  const hasRole = useCallback((role) => user?.roles?.includes(role) || false, [user?.roles]);
  const hasAnyRole = useCallback((roles) => {
    if (!roles || roles.length === 0) return true;
    return roles.some(r => hasRole(r));
  }, [hasRole]);

  const value = useMemo(() => ({
    user,
    loading,
    isLoading: loading,
    isAuthenticated: !!user,
    isOnline,
    login,
    register,
    logout,
    api,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  }), [user, loading, isOnline, login, register, logout, api, hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
