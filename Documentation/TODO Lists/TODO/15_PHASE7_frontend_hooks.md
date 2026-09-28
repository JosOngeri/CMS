# Phase 7 — Frontend Hooks Fixes
**Part of:** Msabato CMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

## PHASE 7 — FRONTEND HOOKS FIXES

### 7.1 `frontend/src/hooks/useActivityFeed.js` — Empty useEffects (Completely Non-Functional)

- [ ] 🔴 Implement lines 92–96 (empty `autoFetch` useEffect): call `fetchActivities(api)` inside the effect when `autoFetch && departmentId` — without this the hook never loads data automatically
- [ ] 🔴 Implement lines 99–107 (empty polling useEffect): call `setInterval(() => fetchActivities(api), pollInterval)` inside and return a cleanup `clearInterval`
- [ ] 🔴 Get `api` from `useAuth()` inside the hook itself instead of requiring callers to pass it as a parameter — prevents callers from forgetting
- [ ] 🟠 Add error retry logic in `fetchActivities`: on failure, retry up to 2 times with a 1-second delay before setting the error state
- [ ] 🟡 Add optimistic update: immediately append a new activity to the local state before the server confirms, then revert on error

### 7.2 `frontend/src/hooks/useDataFetch.js` — Memory Leak

- [ ] 🟠 Add `AbortController` to `fetchData`: create `const controller = new AbortController()` before the fetch, pass `signal: controller.signal`, and return `() => controller.abort()` from the `useEffect` cleanup — without this, unmounted components still process responses
- [ ] 🟠 Fix URL construction bug on line 73: the current `${url}${url.includes('?') ? '&' : '?'}page=${page}` fails if the URL already has a `?page=` param — parse the URL properly or use `URLSearchParams`
- [ ] 🟡 Add retry logic with exponential backoff for network errors (not 4xx)
- [ ] 🟡 Add request deduplication: if an identical URL is already in-flight, return the same promise rather than firing a second request

### 7.3 `frontend/src/hooks/useFieldPermissions.js` — Dependency Array Bug

- [ ] 🟠 Wrap `fetchPermissions` in `useCallback([module, api])` so it has a stable reference
- [ ] 🟠 Add `fetchPermissions` to the `useEffect` dependency array (line 12) — the current empty-ish deps causes ESLint exhaustive-deps warning and can miss updates
- [ ] 🟡 Add a fallback: if the API call fails, return an empty permissions object with all fields readable but none writable
- [ ] 🟡 Add permissions cache with 5-minute TTL per `module` key to avoid fetching on every render

### 7.4 `frontend/src/hooks/usePermission.js` — Hardcoded Admin Roles

- [ ] 🟡 Move hardcoded `['Super Admin', 'Pastor', 'First Elder']` list (lines 59–61) to a constant in a shared config file `frontend/src/config/roles.js` so it's changed in one place
- [ ] 🟡 Add permission hierarchy: if user `hasPermission('manage_members')`, automatically also satisfy `hasPermission('view_members')` without needing explicit permission assignment
- [ ] 🟢 Add `useMemo` around expensive permission-check results that get called in render functions
