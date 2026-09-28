# Phase 11 — SEO and Telegram Integration
**Part of:** Msabato CMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

## PHASE 11 — SEO AND TELEGRAM INTEGRATION

### 11.1 SEO Component / Page

- [ ] 🟠 Locate `SEO.jsx` or `SEOManager.jsx` and verify `react-helmet-async` is properly configured — confirm `<HelmetProvider>` wraps `<App>` in `main.jsx`
- [ ] 🟠 Ensure SEO meta tags are dynamically populated from `ContentContext.websiteSettings` for title, description, OG image
- [ ] 🟡 Add JSON-LD structured data for church events using `schema.org/Event`
- [ ] 🟡 Add canonical URL tag to prevent duplicate content indexing
- [ ] 🟢 Add automatic `og:image` dimension check (should be at least 1200×630px) and warn in dev mode if not met

### 11.2 Telegram Integration

- [ ] 🟠 Verify `backend/routes/telegram.routes.js` and `backend/controllers/telegram.controller.js` exist and are fully implemented
- [ ] 🟠 Implement `POST /channels/:id/post` to send a message via the Telegram Bot API using `process.env.TELEGRAM_BOT_TOKEN`
- [ ] 🟠 Implement `POST /channels/:id/sync` to fetch recent channel messages and store in `gallery_photos` or a `telegram_messages` table
- [ ] 🟠 Implement the Telegram webhook handler: verify `X-Telegram-Bot-Api-Secret-Token` header before processing incoming updates
- [ ] 🟡 Add photo upload to Telegram: when a gallery photo is marked `share_to_telegram: true`, use `sendPhoto` Telegram API method
- [ ] 🟡 Add scheduled post support: allow a `scheduled_at` datetime on channel posts and use a job scheduler (e.g., `node-cron`) to fire them

### 11.3 `frontend/src/components/WebSocketManager.jsx`

- [ ] 🟠 Add authentication to WebSocket connection: pass `auth: { token: csrfToken }` in the `socket.io-client` connect options
- [ ] 🟠 Add reconnection logic with exponential backoff: configure `reconnectionDelay: 1000`, `reconnectionDelayMax: 10000`, `reconnectionAttempts: 5`
- [ ] 🟠 Join church-specific rooms on connection: `socket.emit('join-church', { church_id: user.church_id })` so broadcasts are scoped
- [ ] 🟡 Add connection status indicator: expose `isConnected` boolean to the parent so UI can show a red/green dot
- [ ] 🟡 Add message queue: buffer outgoing messages while disconnected and flush on reconnect

### 11.4 `frontend/src/components/RealTimeActivityFeed.jsx`

- [ ] 🟠 Connect to WebSocket `activity` event: listen for `socket.on('new-activity', callback)` and prepend to the feed array
- [ ] 🟠 Add church_id room filtering: only process activities that match `activity.church_id === user.church_id`
- [ ] 🟡 Add virtual scrolling for long feeds using `react-window` or `react-virtual` to prevent DOM bloat
- [ ] 🟡 Add "X new activities" banner that appears when new items arrive while the user is scrolled down
