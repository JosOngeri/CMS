# CLUSTER — Integrations
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

> Collected from ALL phases. Every task that touches: Telegram integration (frontend page, context, backend routes/controller), SEO/SEOManager, SMS/SMS-hub, M-Pesa callbacks, AI content service (Gemini), notification service, WebSocket server (server.js).

---

## From PHASE 4 — CRITICAL SECURITY: ROUTE-LEVEL GAPS

### Phase 4.1 — `backend/app.js` — Routes Missing identityGuard

- [x] 🔴 Add `identityGuard` to `/api/mpesa` route — M-Pesa callbacks need to be validated (add signature check instead of identity guard for webhooks)

---

## From PHASE 6 — BACKEND SERVICES FIXES

### Phase 6.1 — `backend/services/aiContentService.js` — No API Key Validation

- [x] 🟠 Add startup validation: if `process.env.GEMINI_API_KEY` is not set, throw `new Error('GEMINI_API_KEY is required')` in the constructor instead of crashing at first use
- [x] 🟠 Add null check on line 39: `Array.isArray(keyPoints) ? keyPoints.map(...) : []` before calling `.map()` to prevent crash on null/undefined input
- [x] 🟠 Add prompt injection sanitization: before sending user content to Gemini, strip `ignore previous instructions`, `system:`, and other injection patterns
- [x] 🟡 Add response caching: for identical inputs (`hash(prompt)`), return the cached response for 10 minutes to reduce API costs
- [x] 🟡 Add retry with exponential backoff: wrap the Gemini API call in up to 3 retries with 1s, 2s, 4s delays on `429 Too Many Requests`
- [x] 🟡 Add per-church API usage tracking: increment a counter in Redis for `gemini_usage:{church_id}:{date}` and reject if over a configurable daily limit
- [x] 🟢 Add content moderation step: after receiving Gemini response, check for prohibited content categories before returning to the caller

### Phase 6.2 — `backend/services/notificationService.js` — Memory Leak and Crash

- [x] 🔴 Fix line 210: add empty array guard before accessing `notifications[0].church_id` — `if (!notifications || notifications.length === 0) return;`
- [x] 🟠 Fix line 178 `setInterval` without cleanup: store the interval reference and add a `cleanup()` method that calls `clearInterval(this.batchTimer)` — without this, restarting the service spawns multiple intervals
- [x] 🟠 Add notification content length validation: reject `title` > 255 chars and `message` > 2000 chars to prevent DB errors
- [ ] 🟡 Add notification preferences check: before creating a notification, query `user_notification_preferences` and skip if the user has disabled that notification type
- [ ] 🟡 Add notification grouping: if the same `type_id` notification already exists unread for the user, increment a counter instead of creating a new row
- [ ] 🟢 Add notification expiration: auto-delete notifications older than 90 days via a scheduled job

### Phase 6.4 — `backend/server.js` — Global Variable Anti-Pattern

- [x] 🟠 Remove `global.io = io;` (line 96) and instead export `io` via `module.exports.io = io;` — global variables cause issues in tests and multi-instance deployments
- [x] 🟠 Update all files that reference `global.io` to instead `require('../server').io`
- [x] 🟠 Add file existence check before serving `index.html` SPA fallback (lines 68–73): `if (fs.existsSync(indexPath)) res.sendFile(indexPath); else res.status(503).json({ success: false, error: 'Frontend not built' })`
- [ ] 🟡 Add WebSocket connection authentication: on `connection` event, verify the socket's handshake auth token before allowing it to join rooms
- [ ] 🟡 Add WebSocket rate limiting: use `socket.io-redis-adapter` to track message rates per socket and disconnect abusive clients

---

## From PHASE 11 — SEO AND TELEGRAM INTEGRATION

### Phase 11.1 — SEO Component / Page

- [ ] 🟠 Locate `SEO.jsx` or `SEOManager.jsx` and verify `react-helmet-async` is properly configured — confirm `<HelmetProvider>` wraps `<App>` in `main.jsx`
- [ ] 🟠 Ensure SEO meta tags are dynamically populated from `ContentContext.websiteSettings` for title, description, OG image
- [ ] 🟡 Add JSON-LD structured data for church events using `schema.org/Event`
- [ ] 🟡 Add canonical URL tag to prevent duplicate content indexing
- [ ] 🟢 Add automatic `og:image` dimension check (should be at least 1200×630px) and warn in dev mode if not met

### Phase 11.2 — Telegram Integration

- [ ] 🟠 Verify `backend/routes/telegram.routes.js` and `backend/controllers/telegram.controller.js` exist and are fully implemented
- [ ] 🟠 Implement `POST /channels/:id/post` to send a message via the Telegram Bot API using `process.env.TELEGRAM_BOT_TOKEN`
- [ ] 🟠 Implement `POST /channels/:id/sync` to fetch recent channel messages and store in `gallery_photos` or a `telegram_messages` table
- [ ] 🟠 Implement the Telegram webhook handler: verify `X-Telegram-Bot-Api-Secret-Token` header before processing incoming updates
- [ ] 🟡 Add photo upload to Telegram: when a gallery photo is marked `share_to_telegram: true`, use `sendPhoto` Telegram API method
- [ ] 🟡 Add scheduled post support: allow a `scheduled_at` datetime on channel posts and use a job scheduler (e.g., `node-cron`) to fire them

### Phase 11.3 — `frontend/src/components/WebSocketManager.jsx`

- [ ] 🟠 Add authentication to WebSocket connection: pass `auth: { token: csrfToken }` in the `socket.io-client` connect options
- [ ] 🟠 Add reconnection logic with exponential backoff: configure `reconnectionDelay: 1000`, `reconnectionDelayMax: 10000`, `reconnectionAttempts: 5`
- [ ] 🟠 Join church-specific rooms on connection: `socket.emit('join-church', { church_id: user.church_id })` so broadcasts are scoped
- [ ] 🟡 Add connection status indicator: expose `isConnected` boolean to the parent so UI can show a red/green dot
- [ ] 🟡 Add message queue: buffer outgoing messages while disconnected and flush on reconnect

### Phase 11.4 — `frontend/src/components/RealTimeActivityFeed.jsx`

- [ ] 🟠 Connect to WebSocket `activity` event: listen for `socket.on('new-activity', callback)` and prepend to the feed array
- [ ] 🟠 Add church_id room filtering: only process activities that match `activity.church_id === user.church_id`
- [ ] 🟡 Add virtual scrolling for long feeds using `react-window` or `react-virtual` to prevent DOM bloat
- [ ] 🟡 Add "X new activities" banner that appears when new items arrive while the user is scrolled down

---

## From PHASE 12 — M-PESA AND PAYMENT INTEGRATION

### Phase 12.1 — M-Pesa Webhook Security

- [x] 🔴 Add signature verification to `POST /api/mpesa/callback`: verify `X-Safaricom-Signature` header using Safaricom's public key before processing any callback data
- [x] 🔴 Add `identityGuard` or IP whitelist to M-Pesa callback endpoint — only Safaricom IPs should be able to hit this endpoint
- [ ] 🟠 Store raw callback payload in `mpesa_raw_logs` table before processing so failed processing can be retried
- [ ] 🟠 Add idempotency: check `merchant_request_id` against existing records before inserting to prevent duplicate processing
- [ ] 🟡 Add M-Pesa STK push result handler: update payment status when push succeeds or fails

---

## From PHASE 14 — SMS INTEGRATION

### Phase 14.1 — SMS Controller and Service

- [ ] 🟠 Verify `backend/controllers/sms.controller.js` exists and is fully implemented (not stubbed)
- [ ] 🟠 Verify `POST /api/sms/send` validates `recipients` (array of phone numbers, E.164 format), `message` (1–160 chars for single SMS), `church_id`
- [ ] 🟠 Add SMS delivery status tracking: after sending, poll the SMS gateway for delivery receipts and update `sms_messages.status`
- [ ] 🟠 Add SMS opt-out support: check `members.sms_opt_out = true` before sending and skip those recipients
- [ ] 🟡 Add bulk SMS batching: split large recipient lists into batches of 100 to avoid gateway timeouts
- [ ] 🟡 Add SMS templates: `GET /api/sms/templates` and `POST /api/sms/send-template` endpoints

### Phase 14.2 — SMS Hub

- [ ] 🟡 Verify `backend/routes/sms-hub.routes.js` aggregates multiple SMS providers (Africa's Talking, Twilio, etc.) behind a single interface
- [ ] 🟡 Add provider fallback: if primary SMS provider fails, automatically retry via secondary provider

---

## From PHASE 7 (Second Pass — lines 1545+) — Backend Services Cleanup

### Phase 7.2 — backend/services/aiContentService.js

- [x] 🔴 Add maskPII(text) function before sending to Gemini API
- [x] 🔴 Mask: email addresses, phone numbers, national IDs, proper names in sensitive context
- [ ] 🟠 Add rate limiting (track usage per church per day)
- [ ] 🟠 Add logging of API calls (masked content only)
- [ ] 🟡 Add fallback if Gemini API is unavailable

### Phase 7.4 — Telegram Service Consolidation

- [ ] 🟠 Identify all functionality in backend/services/telegramClient.js
- [ ] 🟠 Identify all functionality in backend/services/telegramMTProto.js
- [ ] 🟠 Merge into single backend/services/TelegramService.js
- [ ] 🟠 Update all controllers and routes to use the consolidated service
- [ ] 🟡 Document which Telegram API (Bot vs MTProto) is used for each feature

### Phase 7.5 — New Services to Create

- [ ] 🟠 Create backend/services/ActivityFeedService.js — WebSocket broadcasting logic from activityFeed.controller
- [ ] 🟠 Create backend/services/ContentService.js — slug generation, revision numbering, lock expiration
- [ ] 🟠 Create backend/services/SEOService.js — SEO analysis logic from seo.controller
- [ ] 🟡 Create backend/services/SmsAutomationService.js — template interpolation

---

## From PHASE 15 (Second Pass — lines 1800+) — Frontend Media & Comms Pages

### Phase 15.1 — frontend/src/pages/telegram/Telegram.jsx

- [ ] 🔴 IMPLEMENT — currently a non-functional stub
- [ ] 🔴 Add channel management UI
- [ ] 🔴 Connect to GET /api/telegram/channels
- [ ] 🟠 Add message composer with preview
- [ ] 🟠 Add message history view
- [ ] 🟠 Add channel subscriber count display
- [ ] 🟡 Add scheduled message feature
- [ ] 🟡 Add media attachment support

### Phase 15.2 — frontend/src/pages/seo/SEO.jsx

- [ ] 🔴 IMPLEMENT — currently a non-functional stub
- [ ] 🔴 Add meta title editor per page
- [ ] 🔴 Add meta description editor per page
- [ ] 🟠 Add Open Graph tag editor (og:title, og:description, og:image)
- [ ] 🟠 Add Twitter Card editor
- [ ] 🟡 Add sitemap.xml generator
- [ ] 🟡 Add robots.txt editor
- [ ] 🟡 Add SEO score preview (character count indicators)

### Phase 15.5 — frontend/src/pages/sms/SMSCampaignManager.jsx

- [ ] 🔴 IMPLEMENT — currently empty file
- [ ] 🔴 Add campaign creation form
- [ ] 🔴 Add recipient list selector
- [ ] 🟠 Add message template selector
- [ ] 🟠 Add campaign scheduling
- [ ] 🟡 Add delivery status dashboard
- [ ] 🟡 Add campaign analytics (open rate, response rate)

---

## From PHASE 18 — ENVIRONMENT AND DEPLOYMENT

### Phase 18.1 — Environment Variables

- [ ] 🟠 Add `TELEGRAM_BOT_TOKEN` to `.env.example`
- [ ] 🟠 Add `TELEGRAM_WEBHOOK_SECRET` to `.env.example`
- [ ] 🟠 Add `GEMINI_API_KEY` to `.env.example`

---

## From PHASE 24 — BACKEND API HARDENING

### Phase 24.3 — Rate Limiting (Integrations)

- [ ] 🟠 backend/routes/sms.routes.js — Apply rate limit: 100 SMS per hour per church
- [ ] 🟠 backend/routes/ai.routes.js — Apply rate limit: 50 AI requests per hour per church

---

## From PHASE 1 (Second Pass — lines 1210+) — PII Exposure

- [x] 🔴 backend/services/aiContentService.js — Add PII masking before sending data to Gemini API
- [x] 🔴 backend/services/aiContentService.js — Create maskPII(text) helper that replaces names, emails, phone numbers with [REDACTED]
- [x] 🔴 backend/services/aiContentService.js — Log masked version, not original, to any logs

---

## From APPENDIX A — QUICK-WIN TASKS

- [ ] 🟠 `server.js` line 96: change `global.io = io` → `module.exports.io = io`
- [ ] 🟠 `notificationService.js` line 210: add `if (!notifications?.length) return;` guard

## From APPENDIX D — UPDATED QUICK-WIN LIST

- [x] 🔴 Replace `SEO.jsx` placeholder body with `<SEOManager />` component
- [x] 🔴 `RealTimeActivityFeed.jsx` line 24: change `/dashboard/activity` → `/api/dashboard/activity`
