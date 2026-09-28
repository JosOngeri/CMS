# Phase 21 — DASHBOARD PAGES: CONCRETE FIXES FROM LIVE CODE AUDIT
**Part of:** Msabato CMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

### 21.6 `AdminDashboard.jsx` — API Path Missing `/api/` Prefix

- [ ] 🔴 Fix line 26 in `AdminDashboard.jsx`: change `GET /dashboard/stats` → `GET /api/dashboard/stats` — the missing `/api/` prefix will cause a 404 against the Express router
- [ ] 🟠 Replace hardcoded recent activity placeholder section (lines 220–261) with a real `GET /api/dashboard/activity?limit=10` call and render the returned items
- [ ] 🟡 Fix duplicate Tailwind class conflict on lines 120–124: `text-[var(--color-text)] text-white` — pick one; `text-white` overrides the CSS variable class

### 21.7 `MemberDashboard.jsx` — Mostly Real but Tab Content Missing

- [ ] 🟠 Fix hardcoded `85%` personal status indicator on line 165 — calculate from real `personalStatus` API response: `Math.round((attendanceRate + contributionRate + activityLevel) / 3)`
- [ ] 🟠 Implement `events` tab content — fetch from `GET /api/events?registered=me` and render upcoming events the member has joined
- [ ] 🟠 Implement `approvals` tab content — fetch from `GET /api/approvals?requester=me` and render the member's own approval requests with status
- [ ] 🟠 Implement `profile` tab content — render member's profile form using `GET /api/auth/profile` and allow editing name, phone, photo
- [ ] 🟡 Fix quick-action link `/approvals/submit` (verify route exists) and `/payments/my` (verify route exists)

### 21.8 `SEO.jsx` — Completely Stubbed, Needs Integration

- [ ] 🔴 Replace the stub placeholder in `frontend/src/pages/seo/SEO.jsx` with the actual `<SEOManager />` component from `frontend/src/components/seo/SEOManager.jsx` — the manager component is fully built but not connected to the page
- [ ] 🟠 Fix API prefix in `SEOManager.jsx`: confirm `GET /seo/settings`, `POST /seo/analyze`, `PUT /seo/settings` are mounted under `/api/seo/` in `app.js`; if not, update the URL strings

### 21.9 `Telegram.jsx` (frontend page) — Completely Stubbed Despite Full Backend

- [ ] 🔴 Rewrite `frontend/src/pages/telegram/Telegram.jsx` to use the existing `TelegramContext` — the backend has full Telegram endpoints but the frontend page just shows placeholder text for all tabs
- [ ] 🔴 Implement `campaigns` tab: fetch from `GET /api/telegram/channels` and render channel list with `Post to Channel` button per channel
- [ ] 🔴 Implement `templates` tab: fetch from `GET /api/sms/templates` (or a Telegram-specific endpoint) and render editable message templates
- [ ] 🟠 Implement `history` tab: fetch from `GET /api/telegram/channels/:id/history` (create if needed) and render message history per channel
- [ ] 🟠 Implement `analytics` tab: fetch from `GET /api/telegram/channels/:id/analytics` (create if needed) and render subscriber count, message open rate, reach

### 21.10 `WebSocketManager.jsx` — Completely Simulated

- [ ] 🔴 Replace the simulated connection (lines 12–16) in `WebSocketManager.jsx` with a real `socket.io-client` connection: `const socket = io(process.env.REACT_APP_API_URL, { auth: { token: csrfToken } })`
- [ ] 🔴 Replace the random `activeUsers` count (line 15) with a real value from the WebSocket server: listen for `server:active-users` event emitted by the backend
- [ ] 🟠 Implement room join on connect: `socket.emit('join-church', { church_id: user.church_id })` so the component only receives events for the correct church
- [ ] 🟠 Handle disconnect and reconnect: show a `Connection lost — reconnecting...` banner when `socket.on('disconnect')` fires
- [ ] 🟡 Expose `isConnected` boolean to parent components via the context or a returned value
- [ ] 🟡 Add connection status indicator dot (green = connected, red = disconnected, yellow = reconnecting) in the component UI

### 21.11 `RealTimeActivityFeed.jsx` — Fix API Prefix

- [ ] 🟠 Fix API path on line 24: change `GET /dashboard/activity` → `GET /api/dashboard/activity` — missing prefix causes 404
- [ ] 🟡 Replace `setInterval` auto-refresh (lines 16–19) with a WebSocket `socket.on('new-activity', ...)` listener once `WebSocketManager` is real — polling is less efficient than push
- [ ] 🟡 Add "X new items since last refresh" banner instead of silently replacing the feed when new data arrives
