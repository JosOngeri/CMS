# KMainCMS Todo List — File Index
**Master source:** `MASTER_TODO_LIST.md` (root of repo)
**Total files:** 42 (20 phase files + 4 appendix files + 7 cluster files + this index)
**Total tasks:** 607 checkboxes across all files
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

## How to use this folder

- **Phase files (01–31):** Work through these in order — Phase 1 tasks must be done before Phase 2, etc.
- **Appendix files (32–35):** Reference material — quick-win lists and summary tables.
- **Cluster files (36–42):** If you are working on one subsystem (e.g. all treasury code), use the matching cluster file — it collects every task that touches that subsystem from across all phases.

---

## Phase Files — Work In Order

| File | Title | Sections | What's in it |
|------|-------|----------|--------------|
| `01_PHASE1_runtime_crashes.md` | Phase 1: Critical Runtime Crashes | 1.1–1.8 | auth.js missing import, reconciliationService wrong variable, IdentityService require-inside-function, tenantResolver SQL injection, passport.js null crashes, database.js SSL, logging.js pino-pretty, env-validation wrong var name |
| `02_PHASE2_multitenancy_base_search.md` | Phase 2: Multi-Tenancy — Base & Search Repos | 2.1–2.2 | BaseRepository column-name SQL injection, SearchRepository missing church_id on all 15 functions |
| `03_PHASE2_multitenancy_user_repos.md` | Phase 2: Multi-Tenancy — User Repositories | 2.3–2.4 | UserRepository all finder methods missing church_id, UsersRepository N+1 and wrong column name |
| `04_PHASE2_multitenancy_treasury_dashboard.md` | Phase 2: Multi-Tenancy — Treasury & Dashboard | 2.5–2.6 | TreasuryRepository optional/missing church_id, DashboardRepository all 17 methods optional church_id |
| `05_PHASE2_multitenancy_taxstatement_security.md` | Phase 2: Multi-Tenancy — TaxStatement & Security | 2.7–2.8 | TaxStatementRepository all methods missing church_id + variable name bug, SecurityRepository all global (no church scope) |
| `06_PHASE2_multitenancy_approvals_reconciliation_model.md` | Phase 2: Multi-Tenancy — Approvals, Reconciliation & User Model | 2.9–2.11 | ApprovalsRepository SQL injection + missing church_id, ReconciliationRepository, User.js model zero church_id filtering |
| `07_PHASE3_controllers_security_notifications.md` | Phase 3: Controller Auth — Security & Notifications | 3.1–3.2 | security.controller no auth on any endpoint, notifications.controller anyone can create |
| `08_PHASE3_controllers_approvals_payments.md` | Phase 3: Controller Auth — Approvals & Payments | 3.3–3.4 | approvals delegation stub + no auth, payments no role on creation |
| `09_PHASE3_controllers_members_users.md` | Phase 3: Controller Auth — Members & Users | 3.5–3.6 | members no auth on delete, users inconsistent repository + no auth |
| `10_PHASE3_controllers_search_auth_dashboard_treasury.md` | Phase 3: Controller Auth — Search, Auth, Dashboard & Treasury | 3.7–3.10 | search SQL injection + no church_id, auth missing password validation + no lockout, dashboard stubs + spliced array, treasury no authorization |
| `11_PHASE4_routes_app_payments_auth.md` | Phase 4: Route Security — app.js, Payments & Auth Routes | 4.1–4.3 | 9 routes missing identityGuard in app.js, payments POST with no role, auth registration without church context |
| `12_PHASE4_routes_middleware_security.md` | Phase 4: Route Security — Middleware | 4.4–4.10 | identityGuard property mismatch, treasurySecurity deprecated API + memory rate limiter, rateLimiter in-memory only, csrf not session-bound, roleGuard no audit, pagination DoS, validation incomplete |
| `13_PHASE5_database_schema.md` | Phase 5: Database Schema Fixes | 5.1–5.5 | UUID vs SERIAL inconsistency across migrations, settings table global not per-church, orphaned documents table, gallery foreign keys, complete_schema verification |
| `14_PHASE6_backend_services.md` | Phase 6: Backend Service Bugs | 6.1–6.4 | aiContentService no API key validation, notificationService memory leak + crash, IdentityService cache, server.js global.io anti-pattern |
| `15_PHASE7_frontend_hooks.md` | Phase 7: Frontend Hook Fixes | 7.1–7.4 | useActivityFeed empty useEffects (completely non-functional), useDataFetch memory leak, useFieldPermissions missing useCallback, usePermission hardcoded roles |
| `16_PHASE8_frontend_contexts.md` | Phase 8: Frontend Context Fixes | 8.1–8.4 | AuthContext no token refresh, ContentContext plain axios (no CSRF), TelegramContext plain axios, ToastContext hardcoded timeout |
| `17_PHASE9_frontend_components.md` | Phase 9: Frontend Component Fixes | 9.1–9.6 | DataTable broken index-based selection + stubbed export, ErrorBoundary no reporting, ProtectedRoute console.logs in prod, ProtectedComponent stubbed access request, Loading hardcoded columns, StatsCard no loading state |
| `18_PHASE10_dashboard_pages.md` | Phase 10: Dashboard Pages | 10.1–10.5 | Pastor, Treasury, SuperAdmin, Member, DepartmentHead — all missing tab content and real API calls |
| `19_PHASE11_seo_telegram_websocket.md` | Phase 11: SEO, Telegram & WebSocket | 11.1–11.4 | SEO.jsx complete stub, Telegram.jsx complete stub, WebSocketManager completely simulated, RealTimeActivityFeed API prefix fix |
| `20_PHASE12_mpesa_payments.md` | Phase 12: M-Pesa & Payment Integration | 12.1–12.2 | M-Pesa webhook signature verification, idempotency, payment analytics endpoints |
| `21_PHASE13_reports_analytics.md` | Phase 13: Reports & Analytics | 13.1–13.3 | Treasury reports (trial balance, income statement, etc.), member reports, analytics dashboard |
| `22_PHASE14_sms_integration.md` | Phase 14: SMS Integration | 14.1–14.2 | SMS controller validation + opt-out support, SMS hub provider fallback |
| `23_PHASE15_document_management.md` | Phase 15: Document Management | 15.1 | Upload file type/size validation, church_id scoping, versioning |
| `24_PHASE16_audit_logging.md` | Phase 16: Audit Logging | 16.1–16.2 | Create auditService.js, wire into all write-operation controllers |
| `25_PHASE17_testing.md` | Phase 17: Testing | 17.1–17.3 | Backend unit tests, backend integration tests, frontend unit tests |
| `26_PHASE18_environment_deployment.md` | Phase 18: Environment & Deployment | 18.1–18.3 | .env.example additions, Docker health check, migration runner in CI |
| `27_PHASE19_code_quality.md` | Phase 19: Code Quality & Tech Debt | 19.1–19.4 | console.log cleanup, hardcoded role strings, error message standardization, dead code |
| `28_PHASE20_final_verification.md` | Phase 20: Final Verification Checklist | 20.1–20.3 | Security verification, data integrity queries, frontend verification |
| `29_PHASE21_dashboard_concrete_fixes_part1.md` | Phase 21: Dashboard Fixes (Part 1) | 21.1–21.5 | DepartmentHead 2 missing backend endpoints, TreasuryDashboard hardcoded mock data, TreasurerDashboard all-zero backend, PastorDashboard hardcoded health indicator, SuperAdminDashboard system health always "healthy" |
| `30_PHASE21_dashboard_concrete_fixes_part2.md` | Phase 21: Dashboard Fixes (Part 2) | 21.6–21.11 | AdminDashboard API prefix bug, MemberDashboard tab content, SEO.jsx stub, Telegram.jsx complete rewrite, WebSocketManager real socket, RealTimeActivityFeed API prefix |
| `31_PHASE22_additional_concrete_fixes.md` | Phase 22: Additional Concrete Fixes | 22.1–22.5 | Dashboard controller stub implementations, DashboardRepository missing methods, routing verification, health indicator calculations, quick-action permission enforcement |

---

## Appendix Files — Reference

| File | Title | What's in it |
|------|-------|--------------|
| `32_APPENDIX_A_quickwins.md` | Quick-Win Tasks (< 10 min each) | 25 one-line fixes — start here for immediate impact |
| `33_APPENDIX_B_phase_order.md` | Phase Order Summary | Table of all 20 phases with focus area and risk-if-skipped |
| `34_APPENDIX_C_stub_inventory.md` | Complete Stub Inventory | Table of all 14 files/features confirmed as stubs or placeholders |
| `35_APPENDIX_D_quickwins_dashboard.md` | Dashboard Quick-Wins | 10 quick-win fixes specific to dashboard pages from the live audit |

---

## Cluster Files — Work by Subsystem

Use these if you are fixing one area of the codebase at a time. Each cluster file collects every task that touches that subsystem from across all 22 phases.

| File | Subsystem | What's collected |
|------|-----------|-----------------|
| `36_CLUSTER_auth_and_identity.md` | Auth & Identity | auth.js middleware, IdentityService.js, passport.js, AuthContext.jsx, usePermission.js, ProtectedRoute.jsx, ProtectedComponent.jsx, login/logout/register, MFA, JWT, CSRF, sessions |
| `37_CLUSTER_treasury_and_payments.md` | Treasury & Payments | TreasuryRepository, TreasuryDashboard, TreasurerDashboard, treasury.controller.js, treasury.routes.js, payments.controller.js, payments.routes.js, M-Pesa, reconciliation, tax statements, budgets, funds, campaigns |
| `38_CLUSTER_repositories_and_database.md` | Repositories & Database | BaseRepository, all 9 child repositories, migrations 004–010, complete_schema.sql, reset-db.js, database.js config, User.js model |
| `39_CLUSTER_frontend_components_and_hooks.md` | Frontend Components & Hooks | DataTable, Loading, StatsCard, ErrorBoundary, WebSocketManager, RealTimeActivityFeed, useDataFetch, useActivityFeed, useFieldPermissions, usePermission, ToastContext, ContentContext, TelegramContext |
| `40_CLUSTER_dashboard_pages.md` | Dashboard Pages | All 6 role dashboards (Pastor, Treasury, Treasurer, SuperAdmin, Admin, DepartmentHead, Member), dashboard.controller.js, DashboardRepository, dashboard.routes.js |
| `41_CLUSTER_integrations.md` | Integrations | Telegram (frontend page + context + backend), SEO/SEOManager, SMS/SMS-hub, M-Pesa callbacks, Gemini AI content service, notification service, WebSocket server (server.js) |
| `42_CLUSTER_security_and_middleware.md` | Security & Middleware | tenantResolver, rateLimiter, roleGuard, identityGuard, treasurySecurity, validation.js, pagination.js, errorHandler, csrf.js, security.controller.js, SecurityRepository, audit logging, app.js route guards, env-validation |

---

## Suggested Starting Points

**If you have 15 minutes:** Open `32_APPENDIX_A_quickwins.md` — 25 one-line fixes, the worst crashes fixed first.

**If you are fixing security:** Start with `01_PHASE1_runtime_crashes.md` then `02–06` (Phase 2 multi-tenancy), then `11_PHASE4_routes_app_payments_auth.md`.

**If you are working on the treasury module:** Open `37_CLUSTER_treasury_and_payments.md` — every treasury task in one file.

**If you are fixing dashboards:** Open `40_CLUSTER_dashboard_pages.md` or `29_PHASE21_dashboard_concrete_fixes_part1.md`.

**If you are fixing the frontend:** Open `39_CLUSTER_frontend_components_and_hooks.md` for hooks/components, or `16–19` for contexts and pages.
