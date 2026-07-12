import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import requestCache from '../utils/cache';

const AuthContext = createContext(null);

// Simple djb2 hash function for cache key generation
const djb2Hash = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const profileFetched = useRef(false);
  const csrfFetched = useRef(false);
  const inactivityTimerRef = useRef(null);
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Request deduplication cache
  const inFlightRequests = useRef(new Map());
  const offlineQueue = useRef([]);

  // Fetch CSRF token on mount
  useEffect(() => {
    if (csrfFetched.current) return;
    csrfFetched.current = true;
    axios.get('/api/csrf-token', { withCredentials: true })
      .then(res => setCsrfToken(res.data.csrfToken))
      .catch(() => {});
  }, []);

  // Create stable API instance with auth headers (only once)
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: '', // Empty to use Vite proxy which handles /api prefix
      withCredentials: true, // Phase 5: Enable HttpOnly cookies for all requests
      timeout: 30000 // 30 second timeout for all requests
    });

    // Add request interceptor for CSRF, caching and URL prefixing
    instance.interceptors.request.use(
      (config) => {
        // Reset inactivity timer on each API request
        resetInactivityTimer();

        // Phase 5: Automatically prefix /api if missing
        if (config.url && !config.url.startsWith('/api') && !config.url.startsWith('http')) {
          config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
        }

        // Add CSRF token header for state-changing requests
        const stateMethods = ['post', 'put', 'patch', 'delete'];
        if (stateMethods.includes(config.method) && csrfToken) {
          config.headers['x-csrf-token'] = csrfToken;
        }

        // Add cache key for GET requests with improved hash to prevent key collisions
        if (config.method === 'get') {
          const keyString = JSON.stringify({ method: config.method, url: config.url, params: config.params || {}, data: config.data });
          config.cacheKey = `cache_${djb2Hash(keyString)}`;
        }

        // Request deduplication for GET requests
        if (config.method === 'get') {
          const requestKey = `${config.method}_${config.url}_${JSON.stringify(config.params || {})}`;
          if (inFlightRequests.current.has(requestKey)) {
            // Cancel this request and return the in-flight promise
            config.cancelToken = new axios.CancelToken((cancel) => {
              cancel('Request deduplicated');
            });
          } else {
            // Track this request
            config.__requestKey = requestKey;
          }
        }

        // Queue requests when offline
        if (!navigator.onLine) {
          return new Promise((resolve, reject) => {
            offlineQueue.current.push({ config, resolve, reject });
          });
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for caching GET requests and handling auth errors
    instance.interceptors.response.use(
      (response) => {
        // Remove from in-flight requests
        if (response.config.__requestKey) {
          inFlightRequests.current.delete(response.config.__requestKey);
        }

        // Cache successful GET responses
        if (response.config.method === 'get' && response.config.cacheKey) {
          requestCache.set(response.config.cacheKey, response.data, 2 * 60 * 1000); // 2 minutes cache
        }
        return response;
      },
      (error) => {
        // Remove from in-flight requests on error
        if (error.config?.__requestKey) {
          inFlightRequests.current.delete(error.config.__requestKey);
        }

        const status = error.response?.status;
        // Handle authentication errors: only clear user state; let ProtectedRoute handle redirects
        if (status === 401 || status === 403) {
          console.debug('[Auth] Session expired or invalid');
          setUser(null);
          requestCache.clear();
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [csrfToken]);

  const fetchProfile = useCallback(async () => {
    if (profileFetched.current) return;
    profileFetched.current = true;

    // Skip session check on auth pages (login/register) to avoid the expected
    // 403 from the backend when no user is logged in yet.
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth')) {
      setLoading(false);
      return;
    }

    try {
      const cacheKey = 'auth_profile';
      const cachedData = requestCache.get(cacheKey);

      if (cachedData) {
        setUser({
          ...cachedData,
          roles: cachedData.roles || [],
          permissions: cachedData.permissions || [],
        });
        setLoading(false);
        return;
      }

      const response = await api.get('/api/auth/profile');
      const userData = response.data.data;

      // Cache the profile data for 5 minutes
      requestCache.set(cacheKey, userData, 5 * 60 * 1000);

      setUser({
        ...userData,
        roles: userData.roles || [],
        permissions: userData.permissions || [],
      });
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        console.log('[Auth] No active session or token expired');
      } else {
        console.error('[Auth] Profile fetch failed:', error.message);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    // Phase 5: HttpOnly cookies - check session by fetching profile (only once)
    fetchProfile();

    // Start inactivity timer on mount
    resetInactivityTimer();

    // Online/offline detection
    const handleOnline = () => {
      console.log('[Auth] Connection restored');
      setIsOnline(true);
      // Flush offline queue
      while (offlineQueue.current.length > 0) {
        const request = offlineQueue.current.shift();
        api(request.config).then(request.resolve).catch(request.reject);
      }
    };

    const handleOffline = () => {
      console.log('[Auth] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup inactivity timer and event listeners on unmount
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchProfile, api]);

  const login = useCallback(async (credentials) => {
    const { email, password } = credentials;
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { user: userData } = response.data.data;
      // Phase 5: Tokens are stored in HttpOnly cookies, not localStorage
      setUser({
        ...userData,
        roles: userData.roles || [],
        permissions: userData.permissions || [],
      });
      // Refresh profile cache on login
      requestCache.set('auth_profile', userData, 5 * 60 * 1000);
      return { success: true };
    } catch (error) {
      const responseData = error.response?.data;
      const message =
        responseData?.errors?.[0]?.msg ||
        responseData?.error ||
        responseData?.message ||
        'Login failed';
      console.error('[Auth] Login failed:', { status: error.response?.status, data: responseData, error: error.message });
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
      console.error('[Auth] Registration failed:', { status: error.response?.status, data: responseData, error: error.message });
      return { success: false, error: message };
    }
  }, [api]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch (error) {
      // silence logout errors
    }
    // Phase 5: No localStorage cleanup needed - cookies are handled by server
    setUser(null);
    // Clear cached data on logout
    requestCache.clear();
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Redirect to landing page after logout
    window.location.href = '/';
  }, [api]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      console.log('[Auth] Inactivity timeout - logging out');
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [logout]);

  // Permission checking helpers
  const hasPermission = useCallback((permission) => {
    return user?.permissions?.includes(permission) || false;
  }, [user?.permissions]);

  const hasAnyPermission = useCallback((permissions) => {
    if (!permissions || permissions.length === 0) return true;
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissions) => {
    if (!permissions || permissions.length === 0) return true;
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  const hasRole = useCallback((role) => {
    return user?.roles?.includes(role) || false;
  }, [user?.roles]);

  const hasAnyRole = useCallback((roles) => {
    if (!roles || roles.length === 0) return true;
    return roles.some(role => hasRole(role));
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
