import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import requestCache from '../utils/cache';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState(null);
  const profileFetched = useRef(false);
  const csrfFetched = useRef(false);

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
      withCredentials: true // Phase 5: Enable HttpOnly cookies for all requests
    });

    // Add request interceptor for CSRF, caching and URL prefixing
    instance.interceptors.request.use(
      (config) => {
        // Phase 5: Automatically prefix /api if missing
        if (config.url && !config.url.startsWith('/api') && !config.url.startsWith('http')) {
          config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
        }

        // Add CSRF token header for state-changing requests
        const stateMethods = ['post', 'put', 'patch', 'delete'];
        if (stateMethods.includes(config.method) && csrfToken) {
          config.headers['x-csrf-token'] = csrfToken;
        }

        // Add cache key for GET requests
        if (config.method === 'get') {
          config.cacheKey = `${config.method}_${config.url}_${JSON.stringify(config.params || {})}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for caching GET requests and handling auth errors
    instance.interceptors.response.use(
      (response) => {
        // Cache successful GET responses
        if (response.config.method === 'get' && response.config.cacheKey) {
          requestCache.set(response.config.cacheKey, response.data, 2 * 60 * 1000); // 2 minutes cache
        }
        return response;
      },
      (error) => {
        const status = error.response?.status;
        // Handle authentication errors: only clear user state; let ProtectedRoute handle redirects
        if (status === 401 || status === 403) {
          console.log('[Auth] Session expired or invalid');
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
      console.error('[Auth] Profile fetch failed, not logged in:', error.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    // Phase 5: HttpOnly cookies - check session by fetching profile (only once)
    fetchProfile();
  }, [fetchProfile]);

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
    const response = await api.post('/api/auth/register', data);
    return response.data;
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
    // Redirect to landing page after logout
    window.location.href = '/';
  }, [api]);

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
    login,
    register,
    logout,
    api,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  }), [user, loading, login, register, logout, api, hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
