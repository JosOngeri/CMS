# KMainCMS Comprehensive Upgrade Plan

**Date:** 2026-06-22  
**Target System:** KMainCMS (Kiserian Main SDA Church Management System)  
**Reference Material:** `D:\VIbeCode\ChurchApp\handoff` architecture blueprints  
**Objective:** Modernize KMainCMS into a lightweight, multi-tenant, scalable church management platform.

---

## Executive Summary

This plan covers **all** major ChurchApp handoff functionalities and architectural standards. It is organized into **15 phases** by dependency order: foundation first, then data standardization, then security/tenancy, then feature modules, and finally mobile/offline/AI capabilities.

**Key upgrades include:**
- Monorepo / npm workspaces
- Semantic theming & CSS variables
- Repository layer abstraction
- IdentityGuard / standardized `req.user`
- 100% UUID database standardization
- Multi-tenancy with PostgreSQL RLS
- Single-process backend-frontend serving
- Dynamic departments via functional building blocks
- API Hub with hybrid SMS (JOSms + Blessed Texts)
- Real-time chat with slash commands
- Gallery MTProto sync with Redis caching
- M-Pesa/STK Push and financial reconciliation
- Offline-first mobile sync
- AI assistant integration
- Comprehensive E2E visual verification

---

## Critical Finding from Codebase Review

KMainCMS currently has **mixed primary key types**:
- **UUID** tables: `users`, `roles`, `members` (from `001_auth_schema.sql`, `003_members_schema.sql`)
- **INTEGER/SERIAL** tables: `departments`, `treasury` tables, `payments` (from `departments_schema.sql`, `treasury_schema.sql`, `payments_schema.sql`)

This is the primary blocker for multi-tenancy, zero-join queries, and clean repository abstraction. The upgrade must standardize on **UUID** before implementing tenant isolation.

---

## Phase 1: Monorepo & Workspace Setup (Week 1)

**Goal:** Consolidate frontend/backend dependencies and prepare clean-room architecture.

### Implementation Steps
1. Create root `package.json` with workspaces:
   ```json
   "workspaces": ["frontend", "backend", "shared"]
   ```
2. Move common dependencies to root (`axios`, `lucide-react`, etc.)
3. Create `shared/` directory for constants, validators, and utility functions
4. Add `API_ENDPOINTS` constants in `shared/constants.js`
5. Create root-level scripts:
   - `npm run dev`
   - `npm run build`
   - `npm run test`
   - `npm run test:infra`

### Files to Create/Modify
- `package.json` (root) — new
- `shared/constants.js` — new
- `shared/validators.js` — new
- `frontend/package.json` — reduce duplicated deps
- `backend/package.json` — reduce duplicated deps

### Verification
- [ ] `npm install` creates single root `node_modules`
- [ ] `npm run test:infra` passes workspace structure tests
- [ ] No duplicate binary conflicts in `frontend/node_modules` or `backend/node_modules`

---

## Phase 2: Lightweight Operations & Resource Efficiency (Weeks 2–3)

**Goal:** Run leaner on <2GB RAM servers.

### Implementation Steps
1. Install and configure `compression` middleware
2. Replace `winston` with `pino` + `pino-http`
3. Add log rotation (7-day retention)
4. Add `Cache-Control` headers for public static content
5. Create `summaries` pre-aggregation table
6. Add database triggers to update counters
7. Refactor `dashboard.controller.js` to read from `summaries`
8. Add bulk insert helper for roles, tags, categories

### Files to Create/Modify
- `backend/server.js`
- `backend/app.js`
- `backend/config/logging.js`
- `backend/controllers/dashboard.controller.js`
- `backend/utils/bulkInsert.js` — new
- `database/migrations/add_summaries_table.sql` — new
- `database/migrations/add_performance_triggers.sql` — new

### Verification
- [ ] All responses > 1KB gzipped
- [ ] Dashboard loads < 100ms (cached), < 300ms (DB)
- [ ] No `COUNT(*)` or `SUM()` on primary dashboard
- [ ] Logs structured as JSON and rotate after 7 days
- [ ] Bulk insert utility works for roles and categories

---

## Phase 3: Semantic Theming & CSS Variables (Weeks 4–5)

**Goal:** Eliminate hardcoded colors and enable dark mode via palette swapping.

### Implementation Steps
1. Define 11 semantic CSS tokens in `frontend/src/index.css`:
   ```css
   :root {
     --color-primary: #2563eb;
     --color-surface: #ffffff;
     --color-background: #f8fafc;
     --color-text: #0f172a;
     --color-textSecondary: #64748b;
     --color-success: #10b981;
     --color-warning: #f59e0b;
     --color-error: #ef4444;
     --color-border: #e2e8f0;
     --color-overlay: rgba(0,0,0,0.5);
     --color-accent: #8b5cf6;
   }
   ```
2. Create dark palette by swapping variable values (no `dark` class)
3. Scrub all `bg-white`, `text-gray-900`, hex codes from components
4. Replace inline styles with CSS variables
5. Add ESLint rule to prevent hardcoded hex colors in `.jsx` files
6. Add theme toggle component

### Files to Create/Modify
- `frontend/src/index.css`
- `frontend/src/styles/palettes.js` — new
- `frontend/src/components/theme/ThemeToggle.jsx` — new
- `frontend/src/layouts/AuthLayout.jsx`
- `frontend/src/layouts/DashboardLayout.jsx`
- All `.jsx` files with hardcoded colors
- `.eslintrc.cjs` or `frontend/.eslintrc.cjs`

### Verification
- [ ] `grep -r "#[0-9a-fA-F]{6}" frontend/src` returns only palette config files
- [ ] Light and dark palettes render correctly
- [ ] No `dark` class used in HTML/body
- [ ] Playwright screenshot captures both themes

---

## Phase 4: Database UUID Standardization & Repository Layer (Weeks 6–8)

**Goal:** Convert all INTEGER/SERIAL PKs to UUID and establish a clean data access layer.

### Implementation Steps
1. Audit all tables for mixed PK types
2. Create migration scripts for each affected module:
   - `database/migrations/standardize_uuids_departments.sql`
   - `database/migrations/standardize_uuids_treasury.sql`
   - `database/migrations/standardize_uuids_payments.sql`
   - `database/migrations/standardize_uuids_events.sql`
   - `database/migrations/standardize_uuids_gallery.sql`
3. Each script:
   - Adds `new_id UUID`
   - Backfills with `uuid_generate_v4()`
   - Updates all foreign key references
   - Drops old INTEGER columns
   - Renames `new_id` -> `id`
4. Create `BaseRepository` class:
   - `findById`, `findAll`, `create`, `update`, `delete`
   - UUID casting and pagination
   - Tenant filtering support
5. Refactor controllers to use repositories instead of raw SQL
6. Update seed files and test fixtures

### Files to Create/Modify
- `backend/repositories/BaseRepository.js` — new
- `backend/repositories/UserRepository.js` — new
- `backend/repositories/DepartmentRepository.js` — new
- `backend/repositories/TreasuryRepository.js` — new
- `backend/controllers/*.controller.js` — refactor to use repositories
- All `database/migrations/standardize_uuids_*.sql` — new
- `database/complete_seed.sql`
- `database/seed_church_workers.sql`

### Verification
- [ ] All tables have UUID primary keys
- [ ] `SELECT id::text FROM users` matches UUID regex
- [ ] All foreign key references match UUID types
- [ ] Controllers use repositories; no raw SQL strings
- [ ] Migration has rollback script
- [ ] Full seed passes

---

## Phase 5: IdentityGuard & Standardized Security (Weeks 9–10)

**Goal:** Implement zero-trust authentication with standardized session objects.

### Implementation Steps
1. Create `IdentityService` to standardize `req.user` shape:
   ```javascript
   {
     id: UUID,
     email: string,
     churchId: UUID,
     churchSlug: string,
     roles: string[],
     permissions: string[],
     mfaVerified: boolean
   }
   ```
2. Build `IdentityGuard` middleware
3. Add role guard middleware (`hasRole`, `hasPermission`)
4. Implement MFA enforcement for admin roles
5. Migrate JWT from `localStorage` to **HttpOnly/Secure/SameSite=Strict** cookies
6. Add `authLimiter` and `strictLimiter` where missing
7. Standardize all API responses to:
   ```json
   { "success": true, "data": {}, "error": null }
   ```

### Files to Create/Modify
- `backend/services/IdentityService.js` — new
- `backend/middleware/identityGuard.js` — new
- `backend/middleware/roleGuard.js` — new
- `backend/controllers/auth.controller.js`
- `backend/routes/auth.routes.js`
- `frontend/src/contexts/AuthContext.jsx`
- `frontend/src/services/api.js`

### Verification
- [ ] `curl /api/auth/profile` returns `church_id`
- [ ] `req.user` shape passes validation test
- [ ] Tokens stored in HttpOnly cookies
- [ ] MFA prompt appears for admin login
- [ ] XSS cannot steal tokens
- [ ] Standardized response format on all endpoints

---

## Phase 6: Multi-Tenancy & Row-Level Security (Weeks 11–13)

**Goal:** Enable multiple churches on a single KMainCMS instance.

### Implementation Steps
1. Create `churches` table:
   ```sql
   CREATE TABLE churches (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name VARCHAR(100) NOT NULL,
     slug VARCHAR(50) UNIQUE NOT NULL,
     settings JSONB DEFAULT '{}',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. Insert default church: `Kiserian Main SDA` / `kiserian-main-sda`
3. Add `church_id` and `church_slug` to all data tables
4. Backfill existing data with default church
5. Create `TenantResolver` middleware
6. Create `ChurchContext` middleware to bind DB session
7. Enable RLS policies on all tenant-aware tables
8. Add tenant-aware CORS configuration
9. Add church admin endpoints
10. Add `church_slug` redundant keys for zero-join queries

### Files to Create/Modify
- `database/migrations/add_tenancy_core.sql` — new
- `database/migrations/add_tenant_columns.sql` — new
- `database/migrations/enable_rls_policies.sql` — new
- `backend/middleware/tenantResolver.js` — new
- `backend/middleware/churchContext.js` — new
- `backend/controllers/church.controller.js` — new
- `backend/routes/church.routes.js` — new
- `backend/server.js`
- `backend/app.js`

### Verification
- [ ] `kiserian.kmaincms.org` resolves to correct church
- [ ] RLS prevents Church A from seeing Church B data
- [ ] `SET LOCAL app.current_church_id` isolates queries
- [ ] Zero-join queries using `church_slug` work
- [ ] Cross-tenant access attempts are blocked and logged

---

## Phase 7: Single-Process Serving & Infrastructure (Weeks 14–15)

**Goal:** Serve frontend and backend from a single port to reduce complexity and CORS issues.

### Implementation Steps
1. Modify `backend/server.js` to serve `frontend/dist/` as static files for non-API routes
2. Add `ecosystem.config.cjs` for PM2 cluster mode
3. Create Docker multi-stage build:
   - `Dockerfile` (backend)
   - `frontend/Dockerfile` (Nginx static)
   - `docker-compose.yml`
4. Add graceful shutdown handlers
5. Add health check endpoints:
   - `/api/health`
   - `/api/health/db`
   - `/api/health/redis`
6. Add zombie port cleanup utility
7. Set memory limits: 500MB per instance, 1GB max

### Files to Create/Modify
- `backend/server.js` — static fallthrough
- `backend/ecosystem.config.cjs` — new
- `Dockerfile` — new
- `frontend/Dockerfile` — new
- `docker-compose.yml` — new
- `backend/utils/killPort.js` — new
- `backend/routes/health.js` — enhance

### Verification
- [ ] `curl http://localhost:5005` returns React `index.html`
- [ ] React routes refresh correctly (no 404)
- [ ] `pm2 start` launches one process
- [ ] Docker build completes
- [ ] Memory stays under 500MB per instance
- [ ] Graceful shutdown closes DB pool and WebSockets

---

## Phase 8: Dynamic Departments & Feature Allocation (Weeks 16–17)

**Goal:** Replace static department definitions with functional building blocks.

### Implementation Steps
1. Create `department_features` registry:
   ```sql
   CREATE TABLE department_features (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     slug VARCHAR(50) UNIQUE,
     name VARCHAR(100),
     component_name VARCHAR(100),
     icon_name VARCHAR(50)
   );
   ```
2. Create `department_feature_settings` allocation table with JSONB config
3. Seed default features:
   - `MEMBERSHIP_MANAGEMENT`
   - `TELEGRAM_SYNC`
   - `SMS_NOTIFICATIONS`
   - `FINANCIAL_TRACKING`
   - `EVENT_LOGISTICS`
   - `AI_ANNOUNCEMENT_DRAFTING`
   - `ATTENDANCE_TRACKING`
4. Build feature allocation API
5. Build dynamic sidebar loader
6. Create `frontend/src/modules/shared/` structure
7. Migrate existing departments to use feature allocations

### Files to Create/Modify
- `database/migrations/add_dynamic_departments.sql` — new
- `backend/controllers/departmentFeatures.controller.js` — new
- `backend/routes/departmentFeatures.routes.js` — new
- `frontend/src/components/dynamic/SidebarLoader.jsx` — new
- `frontend/src/modules/shared/` — new directory
- `frontend/src/pages/departments/DepartmentDashboard.jsx`

### Verification
- [ ] IT department can have only Telegram feature, no membership
- [ ] Sidebar updates based on allocated features
- [ ] Feature config JSONB not leaked to frontend
- [ ] New features can be added via database row + React component

---

## Phase 9: API Hub & Hybrid SMS (Weeks 18–20)

**Goal:** Centralize SMS orchestration with local SIM relay and bulk provider fallback.

### Implementation Steps
1. Create `sms_queue` table with gateway tagging
2. Build `SmsHub` service:
   - Queue messages
   - Select gateway (JOSms for <400, Blessed Texts for >1000)
   - Track status
3. Add Socket.io server for JOSms Android gateway
4. Create gateway endpoints:
   - `POST /api/gateway/auth`
   - `GET /api/gateway/sync`
   - `GET /api/sms/pending`
   - `PATCH /api/sms/status/:id`
5. Emit `NEW_SMS_REQUEST` event to connected gateways
6. Refactor `sms.controller.js` to use queue
7. Add `GATEWAY_MODE=local|bulk` environment variable

### Files to Create/Modify
- `database/migrations/add_sms_queue.sql` — new
- `backend/services/SmsHub.js` — new
- `backend/controllers/sms.controller.js`
- `backend/controllers/gateway.controller.js` — new
- `backend/routes/gateway.routes.js` — new
- `backend/server.js` — Socket.io setup
- `backend/.env.example`

### Verification
- [ ] `POST /api/sms/send` stores message in queue
- [ ] JOSms receives `NEW_SMS_REQUEST` event
- [ ] Fallback polling works when Socket.io disconnected
- [ ] Status updates flow back to dashboard
- [ ] Gateway switches based on recipient count

---

## Phase 10: Chat & Real-Time Notifications (Weeks 21–22)

**Goal:** Add in-app messaging with slash commands and real-time notification dispatch.

### Implementation Steps
1. Create `chat_messages` table
2. Create `chat_rooms` table for department/group chats
3. Add Socket.io chat rooms
4. Implement slash command parser:
   - `/pay 500 Tithe` -> opens payment modal
   - `/event title date` -> opens event creation modal
   - `/sms message` -> opens SMS composer
5. Build chat UI component
6. Refactor notification system to use real-time dispatch
7. Add `notifications` table with UUID recipient_id
8. Trigger welcome notification on user registration

### Files to Create/Modify
- `database/migrations/add_chat_tables.sql` — new
- `database/migrations/add_notifications_uuid.sql` — new
- `backend/services/chatService.js` — new
- `backend/controllers/chat.controller.js` — new
- `backend/controllers/notifications.controller.js`
- `backend/routes/chat.routes.js` — new
- `frontend/src/components/chat/ChatPanel.jsx` — new
- `frontend/src/components/chat/SlashCommandWidget.jsx` — new

### Verification
- [ ] Typing `/pay 500 Tithe` opens payment modal with pre-filled values
- [ ] Chat messages persist in database
- [ ] Real-time notifications appear instantly
- [ ] Welcome notification sent on registration
- [ ] Notification recipient_id maps to UUID users

---

## Phase 11: Gallery MTProto Sync & Redis Caching (Weeks 23–24)

**Goal:** Modernize gallery with UUID-based media and Redis caching.

### Implementation Steps
1. Convert `gallery_photos` to UUID primary keys
2. Add MTProto/Telegram sync for gallery history
3. Add Redis caching layer for public feeds
4. Implement cursor-based infinite scroll for gallery and announcements
5. Add tagged media support
6. Add progressive thumbnails for mobile
7. Serve images via object storage or Telegram proxy

### Files to Create/Modify
- `database/migrations/standardize_uuids_gallery.sql` — new
- `database/migrations/add_gallery_tags.sql` — new
- `backend/services/gallerySync.js` — new
- `backend/controllers/gallery.controller.js`
- `backend/services/redisCache.js` — new
- `frontend/src/pages/gallery/GalleryPage.jsx`
- `frontend/src/components/gallery/InfiniteGallery.jsx` — new

### Verification
- [ ] Gallery records use UUID
- [ ] Telegram history sync creates UUID records
- [ ] Redis cache hits return < 100ms
- [ ] Infinite scroll uses cursor pagination
- [ ] Thumbnails load progressively on mobile

---

## Phase 12: M-Pesa & Financial Reconciliation (Weeks 25–27)

**Goal:** Add payment processing and name-first verification.

### Implementation Steps
1. Port `MpesaService` and STK Push handlers
2. Add M-Pesa callback endpoint with signature verification
3. Create `reconciliation_queue` table:
   ```sql
   CREATE TABLE reconciliation_queue (
     id UUID PRIMARY KEY,
     church_id UUID,
     transaction_code VARCHAR(50),
     sender_name VARCHAR(100),
     claimed_by_name VARCHAR(100),
     amount NUMERIC,
     status VARCHAR(20),
     confidence_score NUMERIC,
     edit_history JSONB
   );
   ```
4. Add name-first treasurer UI
5. Implement fuzzy matching service
6. Add financial immutability triggers
7. Add cash/manual portal with virtual receipts

### Files to Create/Modify
- `database/migrations/add_reconciliation_queue.sql` — new
- `database/migrations/add_financial_immutability_triggers.sql` — new
- `backend/services/MpesaService.js` — new
- `backend/services/nameMatcher.js` — new
- `backend/controllers/reconciliation.controller.js` — new
- `backend/controllers/payments.controller.js`
- `backend/routes/mpesa.routes.js` — new
- `frontend/src/pages/treasury/ReconciliationDashboard.jsx` — new

### Verification
- [ ] M-Pesa callback updates payment record
- [ ] Fuzzy matching returns confidence score
- [ ] Verified payments locked by trigger
- [ ] Edits append to `edit_history`
- [ ] UI shows "Edited" badge
- [ ] Cash portal generates valid receipts

---

## Phase 13: Offline-First Mobile Sync (Weeks 28–30)

**Goal:** Enable mobile app to work offline with delta sync.

### Implementation Steps
1. Add `/api/sync/delta` endpoint
2. Add `sync_anchors` table for per-user/per-device tracking
3. Implement 3-tier sync:
   - Wave 1: User profile, departments, last 20 notifications
   - Wave 2: Last 30 days payments and announcements
   - Wave 3: Full history and thumbnails
4. Update mobile app with SQLite storage
5. Add client-side UUID generation
6. Add outbox pattern for offline actions
7. Encrypt local storage (SQLCipher/AES-256)

### Files to Create/Modify
- `database/migrations/add_sync_tracking.sql` — new
- `backend/controllers/sync.controller.js` — new
- `backend/routes/sync.routes.js` — new
- `mobile/flutter/flutter-mobile/lib/services/sync_service.dart` — new
- `mobile/react-native/mobile-app/src/services/syncService.js` — new

### Verification
- [ ] Delta sync returns only changed rows
- [ ] Mobile app works offline for 24 hours
- [ ] Offline actions sync when online
- [ ] No UUID collisions
- [ ] Local storage encrypted

---

## Phase 14: AI Assistant & ResponseHandler (Weeks 31–32)

**Goal:** Add AI drafting and standardized response masking.

### Implementation Steps
1. Create `ResponseHandler` utility for standardized API responses
2. Add PII masking at response level
3. Add Gemini proxy endpoint `POST /api/ai/condense`
4. Add per-church AI tone settings
5. Integrate AI button into announcement editor
6. Add rate limiting per church
7. Add AI usage audit logging

### Files to Create/Modify
- `backend/utils/ResponseHandler.js` — new
- `backend/controllers/ai.controller.js` — new
- `backend/routes/ai.routes.js` — new
- `database/migrations/add_ai_tone_settings.sql` — new
- `frontend/src/components/ai/AICondenseButton.jsx` — new
- `frontend/src/pages/announcements/AnnouncementEditor.jsx`

### Verification
- [ ] All API responses use `{success, data, error}` format
- [ ] PII masked in responses
- [ ] Gemini condenses text to < 500 chars
- [ ] Tone matches church setting
- [ ] AI usage logged and rate-limited

---

## Phase 15: E2E Visual Verification & Final QA (Weeks 33–34)

**Goal:** Ensure all upgrades work together and capture stakeholder-ready screenshots.

### Implementation Steps
1. Build comprehensive Playwright E2E suite
2. Add visual regression tests
3. Capture screenshots for each major feature:
   - Login
   - Dashboard
   - Departments
   - Treasury reconciliation
   - SMS queue
   - Gallery
   - Chat
   - Dark mode
4. Run performance benchmarks
5. Run security audit
6. Run load tests
7. Generate final implementation report

### Files to Create/Modify
- `frontend/playwright.config.js` — enhance
- `frontend/tests/e2e/*.spec.js` — new
- `frontend/tests/visual/*.spec.js` — new
- `docs/reports/UPGRADE_COMPLETION_REPORT.md` — new

### Verification
- [ ] All Playwright tests pass
- [ ] Screenshots saved to `handoff/screenshots/`
- [ ] Performance benchmarks meet targets
- [ ] Security audit passes
- [ ] Load test handles 100k users
- [ ] Final report approved

---

## Dependency Map

```
Phase 1 (Monorepo)
  |
  v
Phase 2 (Lightweight Ops)
  |
  v
Phase 3 (Theming)
  |
  v
Phase 4 (UUID + Repository) --+--> Phase 5 (IdentityGuard)
  |                           |
  v                           v
Phase 6 (Multi-Tenancy) <-----+
  |
  v
Phase 7 (Infrastructure)
  |
  v
Phase 8 (Dynamic Departments)
  |
  v
Phase 9 (API Hub & SMS)
  |
  v
Phase 10 (Chat & Notifications)
  |
  v
Phase 11 (Gallery & Redis)
  |
  v
Phase 12 (M-Pesa & Reconciliation)
  |
  v
Phase 13 (Offline Mobile)
  |
  v
Phase 14 (AI & ResponseHandler)
  |
  v
Phase 15 (Final QA)
```

---

## Expanded Verification & Testing Strategy

| Test Type | Coverage | Tools |
|-----------|----------|-------|
| **Unit Tests** | >90% coverage for services, middleware, repositories | Jest |
| **Integration Tests** | API endpoints, RLS, tenant isolation, auth flow | Supertest + Jest |
| **E2E Tests** | Full user workflows across all modules | Playwright |
| **Visual Tests** | Screenshots for stakeholder sign-off | Playwright |
| **Performance Tests** | Response times, memory footprint, load | Artillery/k6 |
| **Security Tests** | RLS bypass, cookie flags, CORS, secret leakage | Custom scripts + OWASP |
| **Migration Tests** | Forward/backward migrations, data integrity | Custom SQL scripts |
| **Lint/Style Tests** | No hardcoded colors, no raw SQL in controllers | ESLint + custom rules |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| UUID migration breaks data | High | Critical | Full backup + staged rollout + rollback scripts |
| RLS performance degradation | Medium | High | Index review + query optimization |
| Frontend theming breaks UI | Medium | High | Visual regression tests + gradual rollout |
| SMS gateway integration fails | Medium | Medium | Keep existing SMS provider as fallback |
| Mobile sync conflicts | Medium | High | Client UUIDs + server conflict resolution |
| Redis adds complexity | Low | Medium | Optional caching layer with DB fallback |

---

## Success Metrics

- **Performance**: Dashboard < 100ms cached, API < 300ms DB, 99.9% uptime
- **Resource**: < 2GB RAM production, < 500MB dev
- **Scalability**: 100k+ users, 2k+ admins, multi-tenant ready
- **Security**: 100% RLS isolation, HttpOnly cookies, MFA for admins
- **Quality**: >90% test coverage, zero hardcoded colors, all UUIDs
- **Mobile**: Full offline capability, 25MB cache

---

## Recommended Implementation Order

1. **Phase 1** (Monorepo) — enables everything else
2. **Phase 2** (Lightweight Ops) — fast ROI, low risk
3. **Phase 4** (UUID Standardization) — unblocks multi-tenancy
4. **Phase 5** (IdentityGuard) — unblocks security hardening
5. **Phase 6** (Multi-Tenancy) — unlocks SaaS scalability
6. **Phases 7–15** — feature modules in dependency order

---

**Prepared by:** Senior Developer Recommendation  
**Source Reference:** `D:\VIbeCode\ChurchApp\handoff`  
**Saved to:** `D:\Kiserian Main SDA Communications Department\KMainCMS\plans\KMainCMS_Upgrade_Plan_2026-06-22.md`
