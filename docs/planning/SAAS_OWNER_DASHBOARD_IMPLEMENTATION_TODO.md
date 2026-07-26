# SaaS Owner Dashboard Implementation To-Do List

## Current baseline

The project already contains an initial platform dashboard, tenant list/detail pages, platform authentication endpoints, and read-only platform/tenant API endpoints. This checklist completes the SaaS Owner Dashboard described in `SAAS_OWNER_DASHBOARD_PLAN.md` while preserving module isolation.

- **Existing backend:** `backend/controllers/platform.controller.js`, `backend/controllers/platformAuth.controller.js`, and `backend/routes/platform.routes.js`
- **Existing frontend:** `frontend/src/pages/platform/PlatformDashboard.jsx` and `frontend/src/pages/platform/tenants/`
- **Existing routes:** platform dashboard, tenant list, and tenant detail
- **Not yet verified in database migrations:** platform statistics, health, users, alerts, and audit-log tables

---

## Phase 1: Secure and stabilize the platform foundation

- [ ] **1.1 Define platform authorization roles and permissions**
  - [ ] Define permissions for platform owner, platform administrator, and support user.
  - [ ] Add a platform authorization middleware that checks the permission required by each endpoint.
  - [ ] Keep platform roles separate from church-tenant roles.
  - [ ] Verify: a support user can view permitted data but cannot suspend a tenant, change subscriptions, or manage platform users.

- [ ] **1.2 Replace insecure platform authentication**
  - [ ] Remove the hard-coded password check in `backend/controllers/platformAuth.controller.js`.
  - [ ] Store a password hash per platform user and use bcrypt comparison.
  - [ ] Require `JWT_SECRET` from environment configuration; do not use a fallback secret in production.
  - [ ] Add rate limiting, account lockout/backoff, secure logout, and token-expiry handling.
  - [ ] Verify: valid credentials work, invalid credentials fail safely, and production startup fails if required secrets are missing.

- [ ] **1.3 Create verified platform database migrations**
  - [ ] Create migration files for platform users, roles/permissions, statistics, health checks, alerts, and audit logs.
  - [ ] Add indexes for platform-user email, audit-log timestamps, tenant status, and date-based reporting.
  - [ ] Use constraints for allowed statuses, alert severities, and subscription tiers.
  - [ ] Verify: migrations apply cleanly to an empty database and can be rolled back or recreated according to the project's migration process.

- [ ] **1.4 Enforce the module boundary**
  - [ ] Refactor `backend/controllers/platform.controller.js` so it does not directly query tenant-owned tables such as users, members, payments, or departments.
  - [ ] Replace cross-module database access with documented service/API contracts that return the needed aggregated metrics.
  - [ ] Preserve the response format `{ success, data/error, message }` for every platform endpoint.
  - [ ] Verify: platform data calls work with no direct cross-module SQL joins or table reads.

---

## Phase 2: Complete tenant administration

- [ ] **2.1 Finish the tenant API contract**
  - [ ] Add validated, permission-protected endpoints for create, update, subscription change, and safe deletion/archival.
  - [ ] Add server-side pagination, filtering, and sorting to the tenant-list endpoint.
  - [ ] Define a tenant detail response containing only approved aggregate metrics, subscription data, support context, and activity history.
  - [ ] Verify: list responses remain fast with realistic tenant volumes and invalid filter values return clear validation errors.

- [ ] **2.2 Implement the tenant onboarding workflow**
  - [ ] Create `frontend/src/pages/platform/tenants/TenantCreate.jsx` as a multi-step onboarding page.
  - [ ] Collect church identity, primary contact, initial subscription plan, and setup preferences.
  - [ ] Show a review step before creation and a clear completion result.
  - [ ] Verify: a permitted platform owner can create a tenant and the new tenant appears in the list without exposing setup secrets.

- [ ] **2.3 Complete tenant management screens**
  - [ ] Complete `TenantDetail.jsx` with approved subscription, usage, activity, and support information.
  - [ ] Create `TenantSettings.jsx` for editable tenant metadata and controlled subscription changes.
  - [ ] Add suspension/reactivation confirmation dialogs that require a reason and create an audit-log event.
  - [ ] Implement archival instead of irreversible deletion unless retention requirements explicitly allow deletion.
  - [ ] Verify: every mutating action requires permission, confirmation, and creates a traceable audit record.

- [ ] **2.4 Update platform navigation and route protection**
  - [ ] Add routes for tenant creation, settings, analytics, monitoring, platform users, and support pages.
  - [ ] Ensure every `/platform/*` route checks platform authentication and permission requirements before rendering.
  - [ ] Remove or disable dashboard quick-action links until their destination pages exist.
  - [ ] Verify: direct navigation to an unauthorized platform route is denied and valid routes load in the platform shell.

---

## Phase 3: Deliver trustworthy platform metrics

- [ ] **3.1 Define the metrics data source and schedule**
  - [ ] Define exact formulas for MRR, ARPC, churn, active churches, growth, and platform-health score.
  - [ ] Choose whether metrics are calculated on request or stored as date-stamped snapshots.
  - [ ] Implement a scheduled, observable metric-collection job if snapshots are used.
  - [ ] Verify: each metric has a documented formula, data source, timezone, and test fixture.

- [ ] **3.2 Complete the platform overview dashboard**
  - [ ] Ensure `PlatformDashboard.jsx` correctly displays zero, loading, error, and partial-data states.
  - [ ] Prevent invalid calculations when there are zero churches.
  - [ ] Add period selection and data freshness timestamps.
  - [ ] Verify: dashboard totals match seeded tenant and billing data for each selected period.

- [ ] **3.3 Build revenue and subscription analytics**
  - [ ] Create `frontend/src/pages/platform/analytics/RevenueOverview.jsx` and `SubscriptionAnalytics.jsx`.
  - [ ] Add approved backend endpoints for revenue overview, revenue by tier, trends, churn analysis, and subscription distribution.
  - [ ] Add date-range filtering, empty states, and accessible charts/tables.
  - [ ] Define a forecast method and label forecast values clearly as estimates.
  - [ ] Verify: revenue totals reconcile with the authoritative payment/subscription system for a known date range.

- [ ] **3.4 Add financial reports and exports**
  - [ ] Create `FinancialReports.jsx` with monthly and annual report views.
  - [ ] Implement permission-protected CSV export first; add PDF only after a defined report layout and retention policy exist.
  - [ ] Log each export in platform audit logs.
  - [ ] Verify: exported values match on-screen data and only authorized users can generate reports.

---

## Phase 4: Monitoring, alerts, and support

- [ ] **4.1 Implement platform health collection**
  - [ ] Define health checks for API, database, file storage, SMS, payment processing, and other deployed dependencies.
  - [ ] Implement a health collector that records response time, error rate, status, and checked timestamp.
  - [ ] Do not report a service as healthy merely because no health record exists.
  - [ ] Verify: a deliberately failed dependency appears as degraded/down within the documented monitoring interval.

- [ ] **4.2 Build health and alert management pages**
  - [ ] Create `frontend/src/pages/platform/monitoring/SystemHealth.jsx`, `ServiceStatus.jsx`, and `AlertManagement.jsx`.
  - [ ] Add alert thresholds, acknowledgement/resolution actions, and an alert-history view.
  - [ ] Restrict alert configuration to the platform owner or explicitly authorized administrators.
  - [ ] Verify: threshold breach creates an alert, the dashboard shows it, and resolving it records who acted and when.

- [ ] **4.3 Implement support operations**
  - [ ] Confirm whether a support-ticket module already exists; otherwise define its ownership and API boundary before creating it.
  - [ ] Create `frontend/src/pages/platform/support/SupportDashboard.jsx` and `TicketDetail.jsx` only after the ticket API contract is approved.
  - [ ] Add tenant context, assignment, status, priority, and audit-history views.
  - [ ] Do not implement remote tenant impersonation without explicit security design, consent, session isolation, and full audit logging.
  - [ ] Verify: support users only access authorized tenant context and all support actions are traceable.

---

## Phase 5: Platform users, testing, and release

- [ ] **5.1 Build platform user management**
  - [ ] Create `frontend/src/pages/platform/users/PlatformUsers.jsx`, `RoleManagement.jsx`, and `AccessLogs.jsx`.
  - [ ] Add platform-user creation, activation/deactivation, role assignment, password reset, and session revocation flows.
  - [ ] Implement immutable audit logs for platform-user and tenant-administration actions.
  - [ ] Verify: role changes take effect immediately and privileged actions are visible in the audit-log view.

- [ ] **5.2 Add automated tests**
  - [ ] Add unit tests at `backend/__tests__/platform.test.js` for controller/service calculations and authorization rules.
  - [ ] Add integration tests at `backend/__tests__/integration/platform.test.js` for login, permissions, tenant lifecycle, metrics, and health endpoints.
  - [ ] Add frontend tests for dashboard states, tenant filters, confirmation dialogs, and authorization redirects.
  - [ ] Add end-to-end tests at `__tests__/e2e/platform-owner-workflow.test.js` for platform login, tenant onboarding, suspension, and audit logging.
  - [ ] Verify: tests run against isolated data and cover unauthorized as well as successful cases.

- [ ] **5.3 Validate non-functional requirements**
  - [ ] Measure dashboard load time, endpoint latency, and pagination performance with representative data volumes.
  - [ ] Perform security review for authentication, authorization, tenant isolation, rate limiting, input validation, and audit integrity.
  - [ ] Verify accessibility, responsive layouts, error recovery, backups, and monitoring runbooks.
  - [ ] Verify: staging acceptance criteria match the targets documented in `SAAS_OWNER_DASHBOARD_PLAN.md` before production release.

- [ ] **5.4 Release safely**
  - [ ] Deploy database migrations and backend APIs to staging.
  - [ ] Complete stakeholder acceptance tests with platform-owner and support-user accounts.
  - [ ] Create rollback steps for migrations, API deployment, and frontend release.
  - [ ] Enable post-release monitoring and review alerts, errors, latency, and audit events after launch.
  - [ ] Verify: production release has an approved rollback plan and no default credentials or development secrets.

---

## Completion criteria

- [ ] Platform users authenticate securely and have enforced, documented permissions.
- [ ] Tenant data is accessed through module APIs/contracts, not direct cross-module table access.
- [ ] Tenant onboarding, management, suspension/reactivation, and audit history work end to end.
- [ ] Platform overview, revenue analytics, health monitoring, and alerting use verified data.
- [ ] Automated unit, integration, and end-to-end tests pass.
- [ ] Staging acceptance, security review, and release checks are complete.
