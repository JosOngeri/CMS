# KMainCMS Session Log — 2026-06-18

## Session Summary
Diagnosed and fixed 4 bugs preventing login and breaking the public home page.

---

## Bugs Found & Fixed

### Bug 1 — Login infinite spinner (FIXED)
**File:** `frontend/src/contexts/AuthContext.jsx`

**Root cause A — Wrong function signature:**
- `AuthContext.login(email, password)` expected two separate strings
- `Login.jsx` called `login(data)` passing a single `{ email, password }` object
- Result: `password` was `undefined` → backend express-validator returned **400 Bad Request**

**Root cause B — No error return shape:**
- On failure, `login()` threw an unhandled Axios error instead of returning `{ success: false, error }`
- `Login.jsx` checks `result.success` — when it threw, `setIsLoading(false)` never ran → spinner froze

**Fix:**
- Changed signature to `login(credentials)`, destructure `{ email, password }` inside
- Wrapped in `try/catch`; success returns `{ success: true }`, failure returns `{ success: false, error: message }`
- Error message extracted from `error.response?.data?.errors?.[0]?.msg` or `error.response?.data?.error`

---

### Bug 2 — Announcements 500 Internal Server Error (FIXED)
**File:** `backend/create-announcements-table.js` *(new file)*

**Root cause:**
- `/api/announcements/public` route exists and has no auth requirement
- The `announcements` table simply did not exist in the database
- `complete_schema.sql` omits it; `schema.sql` defines it but was never run against the active DB

**Fix:**
- Created `backend/create-announcements-table.js` — an idempotent script using `CREATE TABLE IF NOT EXISTS`
- Used `SERIAL PRIMARY KEY` and `INTEGER` FK references to match actual `departments.id` / `users.id` column types (integer, not UUID)
- Ran once: `node create-announcements-table.js` → confirmed `announcements table ready`

---

### Bug 3 — Gallery photos 401 Unauthorized on public home page (FIXED)
**Files:**
- `backend/controllers/gallery.controller.js` — added `getPublicPhotos()` method
- `backend/routes/gallery.routes.js` — registered public route before auth middleware

**Root cause:**
- `FeaturedPhotos.jsx` fetches `/api/gallery/photos?limit=6`
- This route did not exist — all gallery routes sat behind `router.use(authenticateToken)`

**Fix:**
- Added `getPublicPhotos(req, res)` method to `GalleryController` — queries `gallery_photos` joined to `gallery_albums`, respects `?limit=` param (capped at 50), returns `{ success: true, photos: [] }`
- Registered `router.get('/photos', galleryController.getPublicPhotos)` **above** `router.use(authenticateToken)` — critical placement

---

### Bug 4 — React Router v7 future flag warning (FIXED)
**File:** `frontend/src/router.jsx`

**Root cause:**
- React Router v6 warns about upcoming v7 state-transition breaking change

**Fix:**
- Added second argument to `createBrowserRouter(routes, { future: { v7_startTransition: true } })`

---

## Verification Results

| Test | Endpoint / Action | Status |
|------|-------------------|--------|
| 1 | `GET /api/announcements/public?limit=3` | 200 OK (0 rows, no 500) |
| 2 | `GET /api/gallery/photos?limit=6` | 200 OK (0 rows, no 401) |
| 3 | `POST /api/auth/login` wrong password | 401 (correct error, no spin) |
| 4 | `POST /api/auth/login` `admin@sda.org / admin123` | 200 + accessToken returned |
| 5 | Vite proxy `/api/gallery/photos` | 200 OK |
| 6 | Vite proxy `/api/announcements/public` | 200 OK |

---

## Files Changed
| File | Change |
|------|--------|
| `frontend/src/contexts/AuthContext.jsx` | Fixed login signature and error return shape |
| `backend/create-announcements-table.js` | New — idempotent table creation script |
| `backend/controllers/gallery.controller.js` | Added `getPublicPhotos()` method |
| `backend/routes/gallery.routes.js` | Registered `GET /photos` public route |
| `frontend/src/router.jsx` | Added `v7_startTransition` future flag |

---

## Running Services
- Backend: `http://localhost:5005` (nodemon, auto-reload)
- Frontend: `http://localhost:5180` (Vite dev server)
- Login credentials: `admin@sda.org / admin123`
