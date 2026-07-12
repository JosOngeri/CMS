# Phase 6 — Backend Services Fixes
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

## PHASE 6 — BACKEND SERVICES FIXES

### 6.1 `backend/services/aiContentService.js` — No API Key Validation

- [ ] 🟠 Add startup validation: if `process.env.GEMINI_API_KEY` is not set, throw `new Error('GEMINI_API_KEY is required')` in the constructor instead of crashing at first use
- [ ] 🟠 Add null check on line 39: `Array.isArray(keyPoints) ? keyPoints.map(...) : []` before calling `.map()` to prevent crash on null/undefined input
- [ ] 🟠 Add prompt injection sanitization: before sending user content to Gemini, strip `ignore previous instructions`, `system:`, and other injection patterns
- [ ] 🟡 Add response caching: for identical inputs (`hash(prompt)`), return the cached response for 10 minutes to reduce API costs
- [ ] 🟡 Add retry with exponential backoff: wrap the Gemini API call in up to 3 retries with 1s, 2s, 4s delays on `429 Too Many Requests`
- [ ] 🟡 Add per-church API usage tracking: increment a counter in Redis for `gemini_usage:{church_id}:{date}` and reject if over a configurable daily limit
- [ ] 🟢 Add content moderation step: after receiving Gemini response, check for prohibited content categories before returning to the caller

### 6.2 `backend/services/notificationService.js` — Memory Leak and Crash

- [ ] 🔴 Fix line 210: add empty array guard before accessing `notifications[0].church_id` — `if (!notifications || notifications.length === 0) return;`
- [ ] 🟠 Fix line 178 `setInterval` without cleanup: store the interval reference and add a `cleanup()` method that calls `clearInterval(this.batchTimer)` — without this, restarting the service spawns multiple intervals
- [ ] 🟠 Add notification content length validation: reject `title` > 255 chars and `message` > 2000 chars to prevent DB errors
- [ ] 🟡 Add notification preferences check: before creating a notification, query `user_notification_preferences` and skip if the user has disabled that notification type
- [ ] 🟡 Add notification grouping: if the same `type_id` notification already exists unread for the user, increment a counter instead of creating a new row
- [ ] 🟢 Add notification expiration: auto-delete notifications older than 90 days via a scheduled job

### 6.3 `backend/services/IdentityService.js` — Cache and Session Issues

- [ ] 🟠 Add `updateLastActivity(userId, ip, userAgent)` method that upserts into a `user_sessions` table — needed by identityGuard
- [ ] 🟡 Add an in-process cache to `getIdentity()` with 60-second TTL to avoid querying the DB on every authenticated request
- [ ] 🟡 Add `invalidateIdentityCache(userId)` method and call it when user roles or permissions change

### 6.4 `backend/server.js` — Global Variable Anti-Pattern

- [ ] 🟠 Remove `global.io = io;` (line 96) and instead export `io` via `module.exports.io = io;` — global variables cause issues in tests and multi-instance deployments
- [ ] 🟠 Update all files that reference `global.io` to instead `require('../server').io`
- [ ] 🟠 Add file existence check before serving `index.html` SPA fallback (lines 68–73): `if (fs.existsSync(indexPath)) res.sendFile(indexPath); else res.status(503).json({ success: false, error: 'Frontend not built' })`
- [ ] 🟡 Add WebSocket connection authentication: on `connection` event, verify the socket's handshake auth token before allowing it to join rooms
- [ ] 🟡 Add WebSocket rate limiting: use `socket.io-redis-adapter` to track message rates per socket and disconnect abusive clients
