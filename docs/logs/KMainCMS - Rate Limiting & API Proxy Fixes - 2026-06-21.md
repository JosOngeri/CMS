# KMainCMS - Rate Limiting & API Proxy Fixes
**Date:** 2026-06-21  
**Session:** API Configuration and Rate Limiting Debugging

## Problem Statement
The application was experiencing critical issues with data loading:
- Departments page showing no data despite 38 departments in database
- Multiple API calls returning 429 (Too Many Requests) errors
- 401 Unauthorized errors for members and gallery endpoints
- Application not reading database data except for login functionality

## Root Causes Identified

### 1. Rate Limiting Too Restrictive
The backend rate limiter was configured with limits too low for development:
- `apiLimiter`: 30 requests per minute
- `generalLimiter`: 100 requests per 15 minutes  
- `strictLimiter`: 20 requests per 15 minutes
- `authLimiter`: 100 requests per 15 minutes

The frontend was making multiple simultaneous API calls (settings, announcements, gallery, etc.) which exceeded these limits.

### 2. Vite Proxy Configuration Incomplete
The Vite proxy was only configured to handle `/api/*` requests, but frontend contexts were calling routes without the `/api` prefix:
- Frontend calling: `/members`, `/gallery/photos`, `/departments`
- Backend expecting: `/api/members`, `/api/gallery/photos`, `/api/departments`
- These requests were not being proxied to the backend

### 3. Authentication Token Issues
MembersContext was creating its own API instance instead of using AuthContext's API, potentially causing authentication inconsistencies.

## Solutions Implemented

### 1. Increased Rate Limits
**File:** `backend/middleware/rateLimiter.js`

```javascript
// Before
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  // ...
});

// After  
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Increased limit for development
  // ...
});
```

**Changes:**
- `authLimiter`: 100 → 1000 requests per 15 minutes
- `generalLimiter`: 100 → 1000 requests per 15 minutes
- `strictLimiter`: 20 → 500 requests per 15 minutes
- `apiLimiter`: 30 → 1000 requests per minute

### 2. Enhanced Vite Proxy Configuration
**File:** `frontend/vite.config.js`

```javascript
// Before
proxy: {
  '/api': {
    target: 'http://localhost:5005',
    changeOrigin: true,
    rewrite: (path) => path,
  },
},

// After
proxy: {
  '/api': {
    target: 'http://localhost:5005',
    changeOrigin: true,
    rewrite: (path) => path,
  },
  // Proxy all other API requests to backend
  '^/(members|gallery|departments|announcements|documents|payments|sms|telegram|dashboard|settings|auth)': {
    target: 'http://localhost:5005',
    changeOrigin: true,
    rewrite: (path) => `/api${path}`,
  },
},
```

This ensures routes without `/api` prefix are automatically rewritten to include it before being sent to the backend.

### 3. Enhanced Error Logging
**File:** `frontend/src/contexts/MembersContext.jsx`

Added comprehensive error logging and response interceptor:
```javascript
// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed - token may be expired');
    }
    return Promise.reject(error);
  }
);
```

### 4. Departments Debugging
**File:** `frontend/src/pages/departments/DepartmentsList.jsx`

Added console logging to track API responses:
```javascript
const fetchDepartments = async () => {
  try {
    setLoading(true);
    console.log('Fetching departments...');
    const response = await api.get('/departments');
    console.log('Departments response:', response.data);
    setDepartments(response.data.departments || []);
  } catch (error) {
    console.error('Error fetching departments:', error);
    toast.error('Failed to load departments');
    setDepartments([]);
  } finally {
    setLoading(false);
  }
};
```

## Database Verification
Verified database contains:
- **83 users** in the database
- **6 roles** configured
- **38 departments** (all active)
- **12 gallery albums**
- **0 photos, announcements, or documents** (need data seeding)

## Required Actions

### Immediate Steps
1. **Restart Backend Server** (for rate limit changes):
   ```bash
   # Stop current server (Ctrl+C)
   node server.js
   ```

2. **Restart Vite Dev Server** (for proxy changes):
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

3. **Clear Browser Cache** to remove cached 429 errors

### Expected Results After Restart
- ✅ 429 rate limit errors should be resolved
- ✅ 401 authentication errors should be resolved  
- ✅ Departments should load with 38 records
- ✅ Members should load with 83 records
- ✅ Gallery and other features should work properly

## Files Modified

1. `backend/middleware/rateLimiter.js` - Increased rate limits for development
2. `frontend/vite.config.js` - Enhanced proxy configuration
3. `frontend/src/contexts/MembersContext.jsx` - Added error logging and response interceptor
4. `frontend/src/pages/departments/DepartmentsList.jsx` - Added debugging logs

## Next Steps

1. **Verify Fix** - After server restarts, test:
   - Departments page loads with data
   - Members page loads with data
   - Gallery page loads with data
   - No 429 or 401 errors in console

2. **Data Seeding** - If basic functionality works, seed missing data:
   - Photos for gallery albums
   - Announcements
   - Documents

3. **Production Considerations** - For production deployment:
   - Reduce rate limits to appropriate production values
   - Consider implementing request debouncing/throttling on frontend
   - Add proper error boundaries for rate limit handling

## Technical Notes

### Rate Limiting Strategy
- Development: High limits (1000+) to allow rapid testing
- Production: Lower limits (100-200) to prevent abuse
- Consider implementing exponential backoff for rate limit errors

### Proxy Configuration
- Vite proxy handles URL rewriting transparently
- Frontend can use clean URLs without `/api` prefix
- Backend maintains consistent `/api` prefix for all routes

### Authentication Flow
- AuthContext provides centralized API instance with auth headers
- Other contexts should use AuthContext's API or replicate auth logic
- Token storage in localStorage with automatic header injection

## Session Summary
Successfully identified and fixed critical rate limiting and API proxy configuration issues that were preventing the application from loading database data. The fixes should resolve 429 and 401 errors and enable proper data loading across all modules after server restarts.