# KMainCMS Unified Master Upgrade Plan: Phase 2.0 (Neutrino-Fidelity)

**Date:** 2026-06-22  
**Version:** 2.0 (Combined & Unified)  
**Reference:** `D:\VIbeCode\ChurchApp\handoff` & `FEATURE_IMPORT_PLAN.md`  
**Standard:** Zero-Trust | Modular | Multi-Tenant | High-Performance

---

## 1. Executive Summary
This document integrates the **15-Phase Modernization Roadmap** with the **Neutrino-Level Feature Requirements**. It transitions KMainCMS from a single-church application into a high-concurrency "Church-as-a-Service" platform capable of supporting 100k+ users and 2k+ admins with absolute tenant isolation.

### Key Strategic Pillars:
1.  **Isolation Shield**: Multi-tenancy via PostgreSQL Row-Level Security (RLS).
2.  **Hybrid SMS Gateway**: Automated routing between JOSms (Android) and Blessed Texts.
3.  **Forensic Reconciliation**: Immutable "Name-First" financial auditing with M-Pesa scraping.
4.  **Lightweight Infrastructure**: Single-port orchestration (5005) running on <2GB RAM.
5.  **AI Assistant**: Gemini-powered content condensation with church-specific "Tone" settings.

---

## 2. Infrastructure & Foundation (Phases 1-4)

### 2.1 Monorepo & Workspace Setup
*   **Action**: Consolidate frontend/backend into `npm workspaces`.
*   **Impact**: Single `node_modules` root; shared validators/constants between mobile and web.

### 2.2 Resource Efficiency (The 500MB Standard)
*   **Performance**: Replace `winston` with `pino`; implement Gzip compression; add `summaries` pre-aggregation tables for O(1) dashboard loads.
*   **Benchmark**: < 100ms for dashboard cache hits; < 300ms for raw DB queries.

### 2.3 Semantic Theming (Zero Hardcoded Colors)
*   **Action**: Implement 11 CSS variables (e.g., `--color-primary`) in `frontend/src/index.css`.
*   **Dark Mode**: Enable palette swapping without using the `dark` class.

### 2.4 Database UUID Standardization (The Primary Blocker)
*   **Critical Task**: Convert all INTEGER/SERIAL PKs to UUID v4.
*   **Repository Layer**: Implement `BaseRepository.js` to handle all DB interactions, eliminating raw SQL in controllers.

---

## 3. Security & Multi-Tenancy (Phases 5-6)

### 3.1 IdentityGuard (Standardized Sessions)
*   **REQ-SEC-01**: Standardize `req.user` to include `church_id`, `church_slug`, and `roles`.
*   **Cookies**: Move JWT to **HttpOnly/Secure/SameSite=Strict** cookies.
*   **MFA**: Mandatory MFA for all Admin/Super-Admin roles.

### 3.2 Tenant Isolation (Isolation Shield)
*   **Architecture**: Add `church_id` and `church_slug` to all functional tables.
*   **RLS Policies**: Enable Postgres Row-Level Security to prevent Church A from accessing Church B's data.
*   **TenantResolver Middleware**: Extracts slug from URL and sets `app.current_church_id` per request.

---

## 4. Integrated Functional Spoke Designs (Phases 8-14)

### 4.1 Hybrid SMS Gateway (Zero-Cost Local Relay)
*   **Logic**: 
    *   `< 400 recipients`: Route via **JOSms Android App** (Socket.io bridge).
    *   `> 1000 recipients`: Route via **Blessed Texts API**.
*   **Relay Bridge**: Implement Socket.io server on Port 5005 for real-time device health and message status reporting.

### 4.2 Universal Financial Reconciliation (M-Pesa/Bank)
*   **Data Scraper**: Android App (JOSms) parses transaction SMS and pushes to `POST /api/reconciliation/push`.
*   **Treasurer Dashboard**: "Name-First" verification comparing `sender_name` (from SMS) with `claimed_by_name` (from User).
*   **Immutability**: Every edit triggers an entry in `edit_history` (JSONB) and displays an "Edited" badge.

### 4.3 AI Assistant (Google Gemini Integration)
*   **Feature**: "Condense for SMS" button in the announcement editor.
*   **Church Tone**: Automatically injects "Spiritual", "Urgent", or "Professional" tone settings from the tenant registry.

### 4.4 Dynamic Functional Building Blocks (Depts)
*   **Feature Registry**: `feature_allocations` table to enable/disable modules (Gallery, Treasury, Chat) per church.
*   **Dynamic Sidebar**: Re-renders based on allocated functional building blocks for the logged-in user.

---

## 5. Mobile & Offline-First (Phase 13)
*   **Delta-Sync**: Implement incremental synchronization using `last_synced_at` timestamps.
*   **Local Security**: Encrypt local SQLite storage using SQLCipher/AES-256.
*   **Handshake**: Mobile app auto-authenticates against the tenant slug via the `X-Tenant-Slug` header.

---

## 6. Implementation Timeline & Priority

| Phase | Milestone | Priority | Focus |
| :--- | :--- | :--- | :--- |
| **P1-P4** | **Foundation** | **CRITICAL** | UUID Standardization & Monorepo |
| **P5-P6** | **Security** | **HIGH** | IdentityGuard & Tenant RLS Isolation |
| **P9+P12** | **Relay & Money** | **HIGH** | SMS Gateway & M-Pesa Reconciliation |
| **P8+P14** | **AI & Modular** | **MEDIUM** | Dynamic Depts & Gemini Content |
| **P13+P15** | **Sync & QA** | **MEDIUM** | Offline-First Mobile & Final Verification |

---

## 7. Success Metrics (The 100k Standard)
*   **Isolation**: 100% data shielding between tenants.
*   **Efficiency**: Production RAM usage < 2GB.
*   **Verification**: 100% Green on Playwright E2E visual verification suite.
*   **Mobile**: 24-hour offline operational capability.

---
**Approved By**: Lead Technical Architect  
**Documentation Link**: [KMainCMS_Unified_Master_Upgrade_Plan.md](file:///D:/Kiserian%20Main%20SDA%20Communications%20Department/KMainCMS/plans/KMainCMS_Unified_Master_Upgrade_Plan.md)
