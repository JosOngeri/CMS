# KMainCMS Session Log - 2026-06-23 (Startup & Bug Fixes)

## Session Overview
**Date:** 2026-06-23  
**Project:** KMainCMS (Kiserian Main SDA Church Management System)  
**Focus:** Application startup with PM2, fixing startup errors, and resolving frontend glitching

---

## Work Completed

### 1. PM2 Backend Startup

**Status:** ✅ Done  
- Started backend using `pm2 start ecosystem.config.cjs`
- Backend running on **http://localhost:5005**

---

### 2. Backend Syntax Error Fixes

**Status:** ✅ Fixed

**Issue 1 — `UserRepository.js` (line 379): SyntaxError "Unexpected identifier 'updateProfile'"**
- Root cause: Duplicate `getUserById` method existed at line 366 and the code had a broken structure before `updateProfile`.
- Fix: Removed the duplicate `getUserById` that appeared between `softDeleteUser` and `updateProfile`, leaving one clean version after `updateProfile`.

**File:** `backend/repositories/UserRepository.js`

---

**Issue 2 — `payment.controller.js` (line 76): SyntaxError "Unexpected token ']'"**
- Root cause: This was a stale error from a previous crash cycle. Once `UserRepository.js` was fixed, PM2 could successfully load the app.
- No direct code change needed to `payment.controller.js` — fixed as a side effect.

**File:** `backend/controllers/payment.controller.js`

---

### 3. Frontend Dev Server Started

**Status:** ✅ Running  
- Started Vite dev server: `npm run dev` in `frontend/`
- Frontend running on **http://localhost:5180**

---

### 4. Playwright Config Fixed

**Status:** ✅ Fixed  
- `playwright.config.js` pointed to `./tests/e2e` which didn't exist.
- Updated `testDir` to `./e2e` (matches existing test files).
- Updated `baseURL` to `http://localhost:5180`.
- Added `screenshot: 'only-on-failure'`.

**File:** `frontend/playwright.config.js`

---

### 5. E2E Test File Created

**Status:** ✅ Created  
- Created `frontend/e2e/basic-visual-test.spec.js` with 5 basic visual tests:
  - Homepage loads
  - Login page loads
  - Register page loads
  - Login form elements are visible
  - Can fill login form

---

### 6. Frontend Infinite Refresh Loop — Fixed

**Status:** ✅ Fixed

**Root cause:** On every page load, `AuthContext` calls `fetchProfile()` to check if the user is logged in. When no cookie is present, the backend returns `429 Too Many Requests` (rate-limited) or `401 Unauthorized`. The error handler in `AuthContext` was calling `logout()`, which did `window.location.href = '/'` — causing a redirect that reloaded the page, which triggered `fetchProfile()` again, creating an infinite loop.

**Fixes applied:**
1. **`AuthContext.jsx`** — Changed `fetchProfile` error handler from `logout()` to `setUser(null)` (no redirect).
2. **`AuthContext.jsx`** — Removed the 401/403 redirect from the Axios response interceptor (let `ProtectedRoute` handle dashboard redirects).
3. **`main.jsx`** — Removed the global Axios 401/403 auto-redirect entirely (was conflicting with AuthContext).

---

### 7. React Context Re-render Optimisation

**Status:** ✅ Applied (in progress at session end)

**Problem:** `ColorPaletteContext` and `AuthContext` were creating new object/function references on every render, causing children to re-render unnecessarily (also contributing to the glitch).

**Fixes applied:**
- **`ColorPaletteContext.jsx`**: Wrapped `toggleDarkMode` in `useCallback`, `colors` in `useMemo`, and the context value in `useMemo`. Separated color DOM application into a one-time `useEffect` on mount. Added `colors` object to context value (was missing, causing components using `useColorPalette().colors` to get `undefined`).
- **`AuthContext.jsx`**: Refactored to use `useMemo` for the axios instance, `useCallback` for all functions, `useRef` to prevent double-fetch, and `useMemo` for the context value.

---

## Current State

| Service   | URL                        | Status  |
|-----------|----------------------------|---------|
| Backend   | http://localhost:5005       | ✅ Running (PM2) |
| Frontend  | http://localhost:5180       | ✅ Running (Vite dev) |

**Demo credentials (from Login page):**
- Admin: `admin@sda.org` / `admin123`
- Pastor: `pastor@sda.org` / `pastor123`
- Member: `member@sda.org` / `member123`

---

## Known Issues / Notes

- Redis is not running locally — backend logs Redis reconnection warnings but continues operating without it (non-fatal).
- Auth rate limiter (`authLimiter`: 10 requests per 15 min) may throttle `/auth/profile` calls during rapid browser refreshes during development. Consider raising `max` in dev mode.
- `SettingsContext` still recreates its value on every render — partial refactor started but cancelled; can be optimised next session.
- `useColorPalette` was importing unused `useSettings`, `getPalette`, `defaultPalette` — these should be cleaned up if they're not used.

---

## Next Suggested Actions

1. **Test the login flow** — go to http://localhost:5180/auth/login and log in with `admin@sda.org / admin123`
2. **Run Playwright E2E tests** — `cd frontend && npx playwright test basic-visual-test.spec.js --headed`
3. **Fix auth rate limiter for dev** — bump `authLimiter max` to 50 in development mode so profile checks don't get throttled
