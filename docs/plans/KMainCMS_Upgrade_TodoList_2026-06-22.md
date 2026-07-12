# KMainCMS Upgrade Todo List

**Date:** 2026-06-22  
**Reference:** `KMainCMS_Upgrade_Plan_2026-06-22.md`  
**Total Phases:** 15  
**Estimated Duration:** 34 weeks
**Overall Status:** ~90% Complete (Foundational Hierarchy Fully Implemented)

---

## Phase 1: Monorepo & Workspace Setup (Week 1) [100%]

- [x] Create root `package.json` with workspaces configuration
- [x] Move common dependencies to root (axios, lucide-react, etc.)
- [x] Create `shared/` directory structure
- [x] Create `shared/constants.js` with API_ENDPOINTS
- [x] Create `shared/validators.js` with common validation functions
- [x] Update `frontend/package.json` to remove duplicated dependencies
- [x] Update `backend/package.json` to remove duplicated dependencies
- [x] Add root scripts: `npm run dev`, `npm run build`, `npm run test`, `npm run test:infra`
- [x] Test: `npm install` creates single root `node_modules`
- [x] Test: `npm run test:infra` passes workspace structure tests

---

## Phase 2: Lightweight Operations & Resource Efficiency (Weeks 2–3) [100%]

- [x] Install `compression` package
- [x] Add compression middleware to `backend/app.js`
- [x] Install `pino` and `pino-http` packages
- [x] Refactor `backend/config/logging.js` to use Pino with daily rotation
- [x] Add Cache-Control headers for static files in `app.js`
- [x] Create `database/migrations/add_performance_summaries.sql` (combined table and triggers)
- [x] Refactor `dashboard.controller.js` to read from summaries
- [x] Create `backend/utils/bulkInsert.js` helper

---

## Phase 3: Semantic Theming & CSS Variables (Weeks 4–5) [95%]

- [x] Define 11 semantic CSS tokens in `frontend/src/index.css`
- [x] Create `frontend/src/styles/palettes.js` with light/dark palettes
- [x] Implement palette swapping (no dark class) via data-theme
- [x] Scrub `bg-white` and hardcoded colors from Sidebar and Header
- [x] Replace inline styles with CSS variables in key layouts
- [x] Create `frontend/src/components/theme/ThemeToggle.jsx`
- [x] Update `ColorPaletteContext.jsx` to be the primary theme engine

---

## Phase 4: Database UUID Standardization & Repository Layer (Weeks 6–8) [85%]

- [x] Audit all tables for mixed PK types
- [x] Create `database/migrations/standardize_uuids_departments.sql`
- [x] Create `database/migrations/standardize_uuids_treasury.sql`
- [x] Create `backend/repositories/BaseRepository.js`
- [x] Create `backend/repositories/UserRepository.js`
- [x] Create `backend/repositories/DepartmentRepository.js`
- [x] Create `backend/repositories/TreasuryRepository.js`
- [x] Refactor key controllers (Auth, Department, Dashboard) to use repositories

---

## Phase 5: IdentityGuard & Standardized Security (Weeks 9–10) [90%]

- [x] Create `backend/services/IdentityService.js`
- [x] Define standardized `req.user` shape
- [x] Create `backend/middleware/identityGuard.js`
- [x] Create `backend/middleware/roleGuard.js`
- [x] Enforce MFA logic placeholder in security helpers
- [x] Migrate JWT to HttpOnly/Secure/SameSite=Strict cookies
- [x] Standardize all API responses via `ResponseHandler.js`

---

## Phase 6: Multi-Tenancy & Row-Level Security (Weeks 11–13) [90%]

- [x] Create `churches` table with UUID
- [x] Add `church_id` to all data tables via migration
- [x] Create `database/migrations/enable_rls_policies.sql`
- [x] Enable RLS on all tenant-aware tables
- [x] Create `backend/middleware/tenantResolver.js` (header & query support)
- [x] Bind DB session to church_id (SET LOCAL app.current_church_id)
- [x] Update `backend/app.js` with global tenantResolver

---

## Phase 7: Single-Process Serving & Infrastructure (Weeks 14–15) [95%]

- [x] Add static fallthrough for non-API routes in `app.js`
- [x] Create `backend/ecosystem.config.cjs` for PM2 cluster
- [x] Create `Dockerfile` (Multi-stage build)
- [x] Create `docker-compose.yml` (App, DB, Redis)
- [x] Add graceful shutdown handlers to `server.js`
- [x] Create `backend/utils/killPort.js`

---

## Phase 8: Dynamic Departments & Feature Allocation (Weeks 16–17) [90%]

- [x] Create `department_features` registry and `feature_allocations` table
- [x] Seed default features (MEMBERSHIP, TREASURY, etc.)
- [x] Create `backend/controllers/departmentFeatures.controller.js`
- [x] Build feature allocation and retrieval API endpoints
- [x] Create `frontend/src/components/dynamic/SidebarLoader.jsx`

---

## Phase 9: API Hub & Hybrid SMS (Weeks 18–20) [90%]

- [x] Create `backend/services/SmsHub.js` with threshold logic
- [x] Add Socket.io server logic to `server.js`
- [x] Create `backend/controllers/gateway.controller.js` for device status
- [x] Implement device registration API

---

## Phase 10: Chat & Real-Time Notifications (Weeks 21–22) [90%]

- [x] Create `chat_messages` and `chat_rooms` tables
- [x] Create `backend/services/chatService.js` with slash command parser
- [x] Add join_room logic to Socket.io
- [x] Create `backend/controllers/chat.controller.js`

---

## Phase 11-14: Advanced Logic (Sync, AI, Recon) [85%]

- [x] Create `gallerySync.js` (MTProto skeleton)
- [x] Create `MpesaService.js` and `nameMatcher.js` (Forensic logic)
- [x] Implement 3-tier sync strategy in `SyncController.js`
- [x] Implement AI condensation in `ai.controller.js` via Gemini

---

## Phase 15: Final QA (Weeks 33–34) [50%]

- [x] Create `frontend/playwright.config.js`
- [ ] Capture E2E screenshots (Requires build/run)
- [ ] Run final security audit

---

**Last Updated:** 2026-06-22
**Status**: Foundational Hierarchy Complete. Ready for Data Ingestion and Visual Integration.
