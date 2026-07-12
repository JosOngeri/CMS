# KMainCMS - API 404 Fixes and Backend Configuration
**Date**: 2026-06-20
**Session**: Backend API fixes and configuration improvements

## Overview
This session focused on resolving API 404 errors, fixing backend logging issues, and handling missing database columns gracefully. The primary issues were related to frontend-backend communication problems and database schema inconsistencies.

## Issues Fixed

### 1. Frontend API Configuration
**Problem**: Frontend was encountering 404 errors for API endpoints due to incorrect axios baseURL configuration causing double `/api` in URLs.

**Files Modified**:
- `frontend/src/main.jsx` - Changed axios baseURL from `http://localhost:5005` to empty string to use Vite proxy correctly

**Details**:
- The Vite proxy configuration in `vite.config.js` was correct, forwarding `/api` requests to `http://localhost:5005`
- However, axios baseURL was set to `http://localhost:5005`, causing URLs like `http://localhost:5005/api/api/users/directory`
- Fixed by setting baseURL to empty string, allowing the proxy to handle the `/api` prefix

### 2. Backend Logging Configuration
**Problem**: Logger was showing `[object Object]` instead of readable log messages, making debugging difficult.

**Files Modified**:
- `backend/server.js` - Changed logging from object-based to string-based logging

**Details**:
- Before: `logger.info({ method: req.method, url: req.url, ip: req.ip })`
- After: `logger.info(`${req.method} ${req.url} from ${req.ip}`)`
- This change makes logs more readable and easier to debug

### 3. Database Schema Issues
**Problem**: Several database tables were missing columns that the application code expected, causing runtime errors.

#### 3.1 Refresh Tokens Table
**Error**: `column "used" of relation "refresh_tokens" does not exist` during logout

**Files Modified**:
- `backend/controllers/auth.controller.js` - Added graceful fallback for missing column
- Created migration: `backend/migrations/005_fix_missing_columns.sql`
- Created migration script: `backend/scripts/add-missing-columns.js`

**Details**:
- The logout function was trying to mark refresh tokens as used, but the column didn't exist
- Added try-catch logic to handle missing column - if `used` column doesn't exist, delete the token instead
- Created migration file to add the column for future deployments

#### 3.2 Documents Table
**Error**: `column "is_active" does not exist` when fetching documents

**Files Modified**:
- `backend/controllers/documents.controller.js` - Added dynamic column check
- Same migration file handles both fixes

**Details**:
- The getDocuments function was filtering by `is_active = true`, but the column didn't exist
- Added dynamic check to see if column exists before using it in the query
- If column doesn't exist, returns all documents without filtering

### 4. Gallery Management API Endpoint
**Problem**: Gallery management was using wrong endpoint for Telegram auth status

**Files Modified**:
- `frontend/src/pages/gallery/GalleryManagement.jsx` - Changed endpoint from `/api/gallery/telegram/auth/status` to `/api/telegram/auth/status`

**Details**:
- The Telegram routes are defined in `backend/routes/telegram.routes.js`, not gallery routes
- Fixed the endpoint to match the correct route structure

## Backend Server Status
- Backend server successfully running on port 5005
- PostgreSQL database connection working
- OAuth providers (Google, Facebook) showing as not configured (expected for development)
- All API routes properly registered

## Frontend Configuration
- Vite dev server configured on port 5180
- Proxy correctly forwarding `/api` requests to `http://localhost:5005`
- CORS configured to allow requests from localhost:5180

## Migration Files Created
1. `backend/migrations/005_fix_missing_columns.sql` - SQL migration to add missing columns
2. `backend/scripts/add-missing-columns.js` - Node.js script to run the migration
3. `backend/scripts/run-fix-migration.js` - Alternative migration runner

## Next Steps
1. Restart backend server to apply logging changes
2. Start frontend dev server to test API connectivity
3. Optionally run migration script to add missing database columns
4. Test all API endpoints to verify fixes

## Technical Notes
- All fixes are backward compatible - the application works even without running migrations
- Graceful error handling ensures the app doesn't crash if columns are missing
- Logging improvements will help with future debugging
- API proxy configuration is now correct for development environment

## Files Modified Summary
- `backend/server.js` - Logging configuration
- `backend/controllers/auth.controller.js` - Logout graceful fallback
- `backend/controllers/documents.controller.js` - Dynamic column check
- `backend/controllers/telegram.controller.js` - Added missing getAuthStatus method
- `frontend/src/main.jsx` - Axios baseURL configuration
- `frontend/src/pages/gallery/GalleryManagement.jsx` - API endpoint fix
- `backend/migrations/005_fix_missing_columns.sql` - New migration file
- `backend/scripts/add-missing-columns.js` - New migration script

## Additional Fix - Telegram Controller Missing Method
**Problem**: Backend server crashed with `Route.get() requires a callback function but got a [object Undefined]` error

**Root Cause**: The `telegram.routes.js` file referenced `telegramController.getAuthStatus` method that didn't exist in the controller

**Solution**: Added the missing `getAuthStatus` method to check Telegram bot and user API configuration status

**Result**: Backend server now starts successfully without route errors

## Critical Fix - Complete Removal of /api Prefix from Frontend
**Problem**: Double `/api` in URLs causing 404 errors (e.g., `/api/api/departments/adventist-youth-society/dashboard`)

**Root Cause**: Frontend was including `/api` prefix in API calls while Vite proxy was also adding `/api` prefix

**Solution**: Systematically removed all `/api` prefixes from frontend code:

### Files Modified:
1. **AuthContext.jsx** - Changed api baseURL from `/api` to empty string
2. **api.js constants** - Removed `/api` prefix from all endpoint definitions
3. **Component API calls** - Removed `/api` prefix from direct axios calls in:
   - GalleryManagement.jsx
   - SMS.jsx
   - Documents.jsx
   - MemberDirectory.jsx
   - DepartmentDashboard.jsx
   - ContentContext.jsx
   - TelegramSettings.jsx
   - TelegramCacheHealth.jsx
   - TelegramContext.jsx
   - TelegramChannels.jsx
   - EmailVerification.jsx
   - Sessions.jsx
   - MFASetup.jsx
   - ResetPassword.jsx

### Result:
- All API calls now use paths without `/api` prefix (e.g., `/departments` instead of `/api/departments`)
- Vite proxy adds `/api` prefix when forwarding to backend
- Final URLs are correct: `/api/departments` → backend receives `/api/departments`
- No more double `/api` in URLs

## Server Restart
After applying all fixes, both servers were successfully restarted:

### Backend Server
- **Status**: ✅ Running on port 5005
- **Logging**: Now showing readable messages with proper formatting
- **Routes**: All routes properly registered with valid callbacks
- **Database**: Connected and handling missing columns gracefully

### Frontend Server
- **Status**: ✅ Running on port 5180
- **Proxy**: Configured to forward `/api` requests to backend
- **Build**: Vite dev server ready in 2191ms
- **Access**: Available at http://localhost:5180/

### Current Configuration
- Backend: http://localhost:5005
- Frontend: http://localhost:5180
- API Proxy: Frontend calls `/departments` → Vite proxy forwards to `http://localhost:5005/api/departments`
- CORS: Configured to allow localhost:5180

Both servers are now operational and all API routes should work without 404 errors.
