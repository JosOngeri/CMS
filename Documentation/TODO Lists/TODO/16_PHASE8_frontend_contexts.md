# Phase 8 — Frontend Context Fixes
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

## PHASE 8 — FRONTEND CONTEXT FIXES

### 8.1 `frontend/src/contexts/AuthContext.jsx` — No Token Refresh

- [ ] 🟠 Add token refresh logic: when the `api` interceptor receives a 401, call `POST /api/auth/refresh-token` with the refresh token cookie before clearing the user — currently a 401 immediately logs out the user even if the refresh token is valid
- [ ] 🟠 Add inactivity timeout: start a 30-minute timer on each API request; if it expires, call `logout()` and redirect to login
- [ ] 🟠 Improve cache key generation on line 46: use `JSON.stringify({method, url, params, data})` and hash it with a simple `djb2` function to prevent key collisions from URL/param ambiguity
- [ ] 🟡 Add request deduplication: if `api.get('/dashboard/stats')` is in-flight and another component calls the same endpoint, return the same promise rather than a second request
- [ ] 🟡 Add offline detection using `navigator.onLine` and a `window 'online'/'offline'` event listener — queue requests while offline and flush when connection resumes
- [ ] 🟢 Add request timeout: configure `axios` `timeout: 30000` (30 seconds) so hung requests don't block the UI forever

### 8.2 `frontend/src/contexts/ContentContext.jsx` — Uses Plain Axios

- [ ] 🟠 Replace all `axios.get`, `axios.post`, `axios.put`, `axios.delete` calls with `const { api } = useAuth()` and use `api.get`, `api.post`, etc. — plain axios bypasses CSRF token injection, auth headers, and the response cache
- [ ] 🟠 Add per-operation loading states: `isCreating`, `isUpdating`, `isDeleting` booleans in addition to the global `isLoading`
- [ ] 🟡 Add optimistic updates for `deleteContent`: immediately remove from local `content` state, then revert if the API call fails
- [ ] 🟡 Add pagination support: add `page`, `limit`, `totalCount` state and a `fetchPage(page)` function
- [ ] 🟡 Add content draft support: allow saving with `status: 'draft'` and separate draft list from published list

### 8.3 `frontend/src/contexts/TelegramContext.jsx` — Uses Plain Axios

- [ ] 🟠 Replace all plain `axios.*` calls with the AuthContext `api` instance (same fix as ContentContext)
- [ ] 🟠 Add per-operation loading states: `isPosting`, `isSyncing`, `isUpdating` per channel
- [ ] 🟡 Add message history state and a `fetchChannelHistory(channelId, limit)` function
- [ ] 🟡 Add channel analytics state and a `fetchChannelAnalytics(channelId)` function
- [ ] 🟡 Add webhook management: `createWebhook(channelId, url)` and `deleteWebhook(channelId)` functions

### 8.4 `frontend/src/contexts/ToastContext.jsx` — Hardcoded Timeout

- [ ] 🟡 Make timeout configurable per toast: `showToast(message, type, { duration: 5000 })` instead of always 3000ms
- [ ] 🟡 Add toast position configuration: accept `position: 'top-right' | 'bottom-center' | 'top-center'` and apply Tailwind class accordingly
- [ ] 🟡 Add stacking limit: automatically dismiss the oldest toast when more than 5 are queued
- [ ] 🟡 Add toast deduplication: if the same message is already visible, don't show it again
- [ ] 🟢 Replace inline styles (lines 36–58) with Tailwind CSS classes for consistency with the rest of the app
- [ ] 🟢 Add enter/exit CSS transition animations using Tailwind `transition`, `opacity`, `translate-y`
