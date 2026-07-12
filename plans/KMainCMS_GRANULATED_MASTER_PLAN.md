# KMainCMS Granulated Master Upgrade Plan (Neutrino-Fidelity)

**Date:** 2026-06-22  
**Target System:** KMainCMS (Unified Platform)  
**Lead Standard:** Zero-Trust | Modular | Multi-Tenant | Forensic Audit

---

## Executive Summary
This master plan merges the **15-Phase Modernization Roadmap** with the **Neutrino-Level Feature Requirements** from the ChurchApp handoff. It provides granular implementation steps for every file and module while ensuring 100% compliance with high-performance multi-tenant standards.

---

## Phase 1: Monorepo & Workspace Setup
**Goal:** Consolidate dependencies and prepare for shared logic (REQ-DATA-01).

### Implementation Steps
1. Create root `package.json` with workspaces: `["frontend", "backend", "shared"]`.
2. Move common dependencies (`axios`, `lucide-react`) to root.
3. Create `shared/constants.js` for `API_ENDPOINTS` and status codes.
4. Standardize root scripts: `npm run dev`, `npm run build`, `npm run test:infra`.

### Files to Create/Modify
- `package.json` (root)
- `shared/constants.js`
- `shared/validators.js`

### Verification
- [ ] `npm install` creates single root `node_modules`.
- [ ] Workspace tests pass via `npm run test:infra`.

---

## Phase 2: Lightweight Operations & Resource Efficiency
**Goal:** Run on <2GB RAM with O(1) dashboard performance (REQ-PERF-01).

### Implementation Steps
1. Install `compression` and `pino-http` for lightweight logging.
2. Implement **Pre-aggregation**: Create `summaries` table for church stats.
3. Add DB triggers to update `summaries` on every payment/member addition.
4. Refactor `dashboard.controller.js` to read *only* from `summaries`.

### Files to Create/Modify
- `backend/app.js` (compression/pino)
- `database/migrations/add_performance_summaries.sql`
- `backend/controllers/dashboard.controller.js`

### Verification
- [ ] Dashboard load time < 100ms (Cache hit).
- [ ] Production RAM usage < 500MB per instance.

---

## Phase 4: Database UUID Standardization & Repository Layer
**Goal:** Standardize on UUID v4 to unblock Multi-Tenancy (REQ-DATA-01).

### Implementation Steps
1. **Critical Audit**: Identify all INTEGER PKs (Departments, Treasury, Payments).
2. **UUID Migration**:
   - Add `new_id UUID`, backfill with `uuid_generate_v4()`.
   - Update all FKs and drop INTEGER columns.
3. **Repository Layer**: Create `BaseRepository.js` with `findById` and `tenantFilter`.

### Files to Create/Modify
- `backend/repositories/BaseRepository.js`
- `database/migrations/standardize_uuids_all.sql`
- `backend/controllers/*.controller.js` (refactor to repository usage)

### Verification
- [ ] `SELECT id::text FROM users` matches UUID regex.
- [ ] Controllers contain zero raw SQL strings.

---

## Phase 6: Multi-Tenancy & Row-Level Security (Isolation Shield)
**Goal:** Absolute data isolation between church tenants (REQ-NFR-004).

### Implementation Steps
1. **Registry**: Create `churches` table with `slug` and `settings` JSONB.
2. **IdentityGuard (REQ-SEC-01)**:
   - Middleware to standardize `req.user` with `church_id`.
   - Enforce **HttpOnly/Secure/SameSite=Strict** cookies for JWT.
3. **RLS Policy**:
   ```sql
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   CREATE POLICY church_isolation_policy ON users
   USING (church_id = current_setting('app.current_church_id')::uuid);
   ```
4. **TenantResolver**: Extract slug from URL and set the session `church_id`.

### Files to Create/Modify
- `backend/middleware/tenantResolver.js`
- `backend/middleware/identityGuard.js`
- `database/migrations/enable_rls_policies.sql`

### Verification
- [ ] Church A cannot access Church B data via API.
- [ ] `req.user` contains valid `church_id` on all authenticated routes.

---

## Phase 9: API Hub & Hybrid SMS Gateway
**Goal:** Zero-cost local relay with bulk failover (REQ-FR-003).

### Implementation Steps
1. **Threshold Routing**:
   - Recipients < 400: Route to **JOSms Android** (Socket.io).
   - Recipients > 1000: Route to **Blessed Texts API**.
2. **Socket.io Relay**: Build namespace `/relay` on Port 5005.
3. **Health Check**: JOSms reports battery and signal status every 15 mins.

### Files to Create/Modify
- `backend/services/SmsHub.js` (Routing Logic)
- `backend/server.js` (Socket.io Setup)
- `backend/controllers/gateway.controller.js`

### Verification
- [ ] Gateway switches based on recipient count.
- [ ] JOSms status visible on Admin Dashboard.

---

## Phase 12: M-Pesa & Forensic Reconciliation
**Goal:** Immutable "Name-First" financial auditing (REQ-FR-004, REQ-FR-008).

### Implementation Steps
1. **Scraper API**: `POST /api/reconciliation/push` for JOSms data.
2. **Name-First UI**: Compare SMS `sender_name` with `claimed_by_name`.
3. **Audit History**: Add `edit_history` JSONB column to all payment records.
4. **Locking**: Once verified, transactions become immutable; edits trigger "Edited" badges.

### Files to Create/Modify
- `database/migrations/add_reconciliation_audit.sql`
- `backend/controllers/reconciliation.controller.js`
- `frontend/src/pages/treasury/ReconciliationDashboard.jsx`

### Verification
- [ ] Verified transactions cannot be deleted.
- [ ] Every edit is logged with `editor_id` and `timestamp`.

---

## Phase 14: AI Assistant (Gemini Integration)
**Goal:** Gemini-powered content condensation (REQ-FR-005).

### Implementation Steps
1. **Gemini Proxy**: Integrate `google-generative-ai` SDK.
2. **Tone Injection**: Fetch "Spiritual" or "Professional" tone from `churches.settings`.
3. **Feature**: "Condense for SMS" button in the Announcement editor.

### Files to Create/Modify
- `backend/controllers/ai.controller.js`
- `frontend/src/components/ai/AICondenseButton.jsx`

### Verification
- [ ] AI output matches the church's configured tone.
- [ ] Output is consistently < 500 characters for SMS compatibility.

---

## Summary of Neutrino Enhancements
- **Forensic Logs**: Format `dd-mm-yy-HH:mm:ss:ms`.
- **Single-Port**: API and UI served on Port 5005.
- **Delta-Sync**: Incremental updates for mobile using `last_synced_at`.

**Prepared by:** AI Technical Architect (Unified Platform Upgrade)
