# Comprehensive Feature Import Plan: KMainCMS Unified Platform v2.0

This document provides a deep-dive technical roadmap for migrating and implementing the "Neutrino-Level" features specified in the Phase 2.7 Requirements.

## 1. Multi-Tenant Core Architecture (Isolation Shield)
*Rationale: To transform KMainCMS from a single-church app to a scalable "Church-as-a-Service" platform (REQ-NFR-004).*

### 1.1 Database Evolution (Postgres RLS)
*   **Tenant Registry**: Finalize the `churches` table with `slug` (unique) and `api_config` (JSONB).
*   **Global Foreign Keys**: Add `church_id UUID` to every functional table (Users, Members, Payments, SMS Logs, Gallery).
*   **Row-Level Security (RLS)**:
    ```sql
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY church_isolation_policy ON payments
    USING (church_id = current_setting('app.current_church_id')::uuid);
    ```

### 1.2 Identity & Session Management (IdentityGuard)
*   **JWT Payload**: Expand to include `church_id` and `church_slug`.
*   **TenantResolver Middleware**: 
    *   Extract slug from `/:tenant_slug/` URL param or `X-Tenant-Slug` header.
    *   Initialize a transaction-local variable `app.current_church_id` for RLS.
*   **Standardized Session**: Ensure `req.user` always contains `church_id` to prevent cross-tenant data leakage (REQ-SEC-01).

---

## 2. Hybrid SMS Gateway (Zero-Cost Local Relay)
*Rationale: Optimize cost by utilizing JOSms Android devices for small batches and Blessed Texts for scale (REQ-FR-003).*

### 2.1 Routing Engine
*   **Threshold Logic**:
    *   `< 400 Recipients`: Push to `SMS_QUEUE` -> Emit Socket.io event to connected JOSms device.
    *   `> 1000 Recipients`: Direct API call to Blessed Texts.
    *   `Failover`: If JOSms is offline > 5 mins, auto-reroute urgent alerts to Blessed Texts.
### 2.2 Android Relay Bridge (Socket.io)
*   Implement a dedicated Socket namespace `/relay`.
*   **Events**:
    *   `device_online`: JOSms reports battery, signal, and available SMS balance.
    *   `process_bulk`: CMS pushes batch of personalized messages.
    *   `message_status`: JOSms reports `delivered` or `failed` back to CMS.

---

## 3. Universal Financial Reconciliation (M-Pesa/Bank)
*Rationale: Immutable forensic reconciliation for church treasurers (REQ-FR-004, REQ-FR-008).*

### 3.1 Data Acquisition (Scraper API)
*   `POST /api/reconciliation/push`: High-security endpoint for JOSms to upload parsed SMS data.
*   **Schema**: `transaction_code` (Unique), `sender_name`, `amount`, `source` (M-Pesa/KCB/Equity).
### 3.2 Treasurer Dashboard (Name-First UI)
*   **Logic**: Auto-match `sender_name` from SMS against `claimed_by_name` from member contribution claims.
*   **Audit Trail**: Implement the `edit_history` JSONB column to track every human modification to a verified payment.
*   **UI Hint**: Use **Bold Names** and "Edited" badges for high-visibility forensic auditing.

---

## 4. AI Content Assistant (Gemini Integration)
*Rationale: Speed up communications for church administrators (REQ-FR-005).*

### 4.1 Zero-Load Proxy
*   Integrate `google-generative-ai` SDK.
*   **Feature**: "Condense for SMS" button in the Announcement Editor.
*   **Contextual Prompting**: System automatically injects the church's "Spiritual Tone" settings from the `churches.settings` JSONB field.

---

## 5. Dynamic Functional Building Blocks (Modular Depts)
*Rationale: Per-church module allocation (REQ-FR-006).*

### 5.1 Feature Toggle System
*   **Table**: `feature_allocations` (church_id, feature_slug, is_enabled).
*   **Frontend**: 
    *   The Sidebar component fetches `/api/settings/modules`.
    *   Modules (Gallery, Treasury, SMS, Chat) are hidden/shown based on the tenant's allocation.
### 5.2 Department Mapping
*   Map specific features to specific department roles (e.g., Only "Treasury" dept sees the Reconciliation Dashboard).

---

## 6. Performance Standards (The Neutrino Benchmark)
*   **O(1) Dashboard Stats**: Use database triggers to pre-aggregate totals into a `church_stats` cache table.
*   **Latency**: All DB reads must be < 100ms for cache hits and < 300ms for raw queries.
*   **Logging**: Use millisecond-precision logs `dd-mm-yy-HH:mm:ss:ms` for all financial and security events.

---

## Implementation Phases

| Phase | Milestone | Deliverable |
| :--- | :--- | :--- |
| **P1** | **Multi-Tenancy Foundation** | RLS Policies + TenantResolver Middleware |
| **P2** | **Relay Bridge** | Socket.io Server + SMS Routing Logic |
| **P3** | **Financial Core** | Reconciliation API + Treasurer Dashboard |
| **P4** | **AI & UX** | Gemini Integration + Modular Sidebar |
