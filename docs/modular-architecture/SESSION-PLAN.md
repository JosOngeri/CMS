# KMainCMS — Session Implementation Plan
**Kiserian Main SDA Church Content Management System**
**Document Type:** Development Session Planning & Tracking
**Last Updated:** June 2026
**Scope:** Full build-out of all modules as defined in the modular architecture CSV files

---

## Overview

This document is the master session plan for implementing and completing the KMainCMS system. It maps every item defined in the 16 modular-architecture CSV files against what is currently implemented, what is partially done, and what needs to be built — and organises all of that work into prioritised sessions.

The architecture is divided into three layers:
- **Core Modules** (foundation): AUTH, TELEGRAM
- **Functional Modules** (business logic): CONTENT, DEPT, GALLERY, TREASURY, PAYMENT, SMS, DOC, APPROVAL, NOTIF, SETTINGS, CHURCH
- **Frontend Modules** (presentation): DASHUI, WEBUI, ADMINUI

---

## Current Implementation Status Snapshot

### Backend Controllers (exist on disk)
| File | Module |
|------|--------|
| auth.controller.js | AUTH ✅ |
| department.controller.js | DEPT ✅ |
| gallery.controller.js | GALLERY ✅ |
| members.controller.js | CHURCH ✅ |
| settings.controller.js | SETTINGS ✅ |
| treasury.controller.js | TREASURY ✅ (controller only) |
| payment.controller.js | PAYMENT ✅ (controller only) |
| payments.controller.js | PAYMENT (duplicate?) |
| sms.controller.js | SMS ✅ (controller only) |
| documents.controller.js | DOC ✅ (controller only) |
| announcements.controller.js | CONTENT partial |
| palette.controller.js | SETTINGS/DASHUI |
| activityFeed.controller.js | DEPT |
| collection.controller.js | unknown |
| userSettings.controller.js | AUTH/SETTINGS |

### Backend Routes (exist on disk)
| File | Notes |
|------|-------|
| auth.routes.js | AUTH ✅ |
| department.routes.js | DEPT ✅ |
| departments.routes.js | DEPT (duplicate?) |
| gallery.routes.js | GALLERY ✅ |
| members.routes.js | CHURCH ✅ |
| settings.routes.js | SETTINGS ✅ (bulk fix applied) |
| treasury.routes.js | TREASURY ✅ routes |
| payment.routes.js | PAYMENT ✅ routes |
| payments.routes.js | PAYMENT (duplicate?) |
| sms.routes.js | SMS ✅ routes |
| documents.routes.js | DOC ✅ routes |
| approvals.routes.js | APPROVAL ✅ routes |
| notifications.routes.js | NOTIF ✅ routes |
| announcements.routes.js | CONTENT partial |
| events.routes.js | CONTENT/other |
| dashboard.routes.js | DASHUI |
| users.routes.js | AUTH/ADMINUI |
| audit-logs.routes.js | SETTINGS |
| palette.routes.js | SETTINGS/DASHUI |
| health.js | SETTINGS |
| collections.routes.js | unknown |
| department-categories.routes.js | DEPT |
| userSettings.routes.js | AUTH/SETTINGS |

### Frontend Pages (exist on disk)
| Directory / File | Module | Dark Mode |
|-----------------|--------|-----------|
| pages/auth/ | AUTH ✅ | N/A |
| pages/dashboard/ | DASHUI ✅ | ✅ |
| pages/gallery/ | GALLERY ✅ | ✅ |
| pages/members/ | CHURCH ✅ | ✅ |
| pages/settings/Settings.jsx | SETTINGS ✅ | ✅ |
| pages/departments/ | DEPT ⚠️ partial | ⚠️ in-progress |
| pages/treasury/ | TREASURY ✅ pages | ❌ |
| pages/payments/ | PAYMENT ✅ pages | ❌ |
| pages/approvals/ | APPROVAL ⚠️ stub | ❌ |
| pages/announcements/ | CONTENT ⚠️ partial | ❌ |
| pages/content/ | CONTENT ❌ empty | ❌ |
| pages/documents/ | DOC ❌ empty | ❌ |
| pages/sms/ | SMS ❌ empty | ❌ |
| pages/telegram/ | TELEGRAM ❌ empty | ❌ |
| pages/notifications/ | NOTIF ❌ empty | ❌ |
| pages/public/ | WEBUI ⚠️ stub | N/A |
| pages/admin/ | ADMINUI ⚠️ partial | ❌ |
| pages/events/ | CONTENT/other | ❌ |
| pages/users/ | AUTH/ADMINUI | ❌ |

### Frontend Contexts (exist on disk)
| File | Status |
|------|--------|
| AuthContext.jsx | ✅ |
| ColorPaletteContext.jsx | ✅ |
| GalleryContext.jsx | ✅ |
| MembersContext.jsx | ✅ |
| SettingsContext.jsx | ✅ |
| PaletteContext.jsx | ✅ |
| ToastContext.jsx | ✅ |
| DepartmentContext.jsx | ❌ missing |
| TreasuryContext.jsx | ❌ missing |
| PaymentContext.jsx | ❌ missing |
| SMSContext.jsx | ❌ missing |
| DocumentContext.jsx | ❌ missing |
| ApprovalContext.jsx | ❌ missing |
| NotificationContext.jsx | ❌ missing |

### Database Migrations
| File | Covers |
|------|--------|
| 004_gallery_schema.sql | GALLERY tables |
| (others) | need audit |

---

## Module-by-Module Plan

---

### MODULE: AUTH (Authentication & Security)
**Status: ~80% Complete**
**CSV Source: 03-auth-module.csv**

#### What Is Done
- [x] JWT token generation and validation
- [x] Session management (database storage)
- [x] RBAC: roles, user_roles tables wired
- [x] bcrypt password hashing
- [x] Login / Logout / Refresh endpoints
- [x] Password reset flow (forgot + reset endpoints)
- [x] Auth middleware (backend/middleware/auth.js)
- [x] User profile get/update
- [x] Rate limiting on login attempts
- [x] Login.jsx frontend page

#### What Needs To Be Done
- [ ] **[AUTH-01]** Social auth: Google OAuth and Facebook OAuth integration
- [ ] **[AUTH-02]** Email verification flow (`POST /api/auth/verify-email`)
- [ ] **[AUTH-03]** MFA / TOTP support
- [ ] **[AUTH-04]** Comprehensive auth audit logging (login attempts, role changes, password changes with IP + user agent)
- [ ] **[AUTH-05]** Session list + active session management UI for users
- [ ] **[AUTH-06]** Refresh token rotation enforcement

#### Acceptance Criteria to Verify
- [ ] AC-01: Users can register with valid email/password
- [x] AC-02: Login with email/password works
- [ ] AC-02: Social auth not yet done
- [x] AC-03: Sessions expire after configured timeout
- [x] AC-04: Password reset flow works end-to-end
- [x] AC-05: Login attempts are rate-limited
- [x] AC-06: RBAC enforced

---

### MODULE: TELEGRAM (Telegram Channel Integration)
**Status: ~75% Complete**
**CSV Source: 04-telegram-module.csv**

#### What Is Done
- [x] Bot token configuration
- [x] Channel CRUD (database backed)
- [x] Message posting to channels
- [x] Photo upload to Telegram
- [x] Photo caching system (galleryCache.js + telegram_photos_cache table)
- [x] Gallery module integration (fetch photos from Telegram)
- [x] MTProto authentication for 2FA channels
- [x] Channel history fetching
- [x] Webhook endpoint
- [x] Telegram settings page in Settings.jsx

#### What Needs To Be Done
- [ ] **[TELEGRAM-01]** Content sync: auto-convert Telegram channel posts → announcements
- [ ] **[TELEGRAM-02]** Media attachment handling in content sync
- [ ] **[TELEGRAM-03]** Frontend: pages/telegram/ (channel management UI, post viewer)
- [ ] **[TELEGRAM-04]** Cache health monitor UI

#### Acceptance Criteria to Verify
- [x] AC-01: Bot can connect to Telegram API
- [x] AC-02: Messages can be posted to channels
- [x] AC-03: Photos uploaded and cached
- [x] AC-04: Gallery fetches photos from Telegram
- [ ] AC-05: Channel posts auto-sync to announcements — NOT DONE
- [x] AC-06: Webhook handles updates

---

### MODULE: CONTENT (Website Content Management)
**Status: ~25% Complete**
**CSV Source: 05-content-module.csv**

#### What Is Done
- [x] Announcements controller and routes (partial CRUD)
- [x] Announcements.jsx page exists

#### What Needs To Be Done
- [ ] **[CONTENT-01]** content_items table migration + content.controller.js
- [ ] **[CONTENT-02]** content_categories table + controller
- [ ] **[CONTENT-03]** content_revisions (version history + rollback)
- [ ] **[CONTENT-04]** content_tags table + tagging API
- [ ] **[CONTENT-05]** website_settings table (separate from system settings)
- [ ] **[CONTENT-06]** Scheduled publishing (cron or job queue)
- [ ] **[CONTENT-07]** Expiration dates for announcements
- [ ] **[CONTENT-08]** Priority levels for announcements
- [ ] **[CONTENT-09]** SEO metadata fields (meta title, description, og image)
- [ ] **[CONTENT-10]** Content approval workflow (hooks into APPROVAL module)
- [ ] **[CONTENT-11]** Rich text editor component (frontend)
- [ ] **[CONTENT-12]** pages/content/ full UI (list, create, edit, preview)
- [ ] **[CONTENT-13]** Public API: `GET /api/content/:slug` without auth
- [ ] **[CONTENT-14]** `GET /api/website-settings` public endpoint
- [ ] **[CONTENT-15]** Telegram sync: TELEGRAM → CONTENT pipeline
- [ ] **[CONTENT-16]** Dark mode theming for all content pages

#### API Endpoints to Implement
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | /api/content | ❌ |
| POST | /api/content | ❌ |
| GET | /api/content/:slug | ❌ |
| PUT | /api/content/:id | ❌ |
| DELETE | /api/content/:id | ❌ |
| POST | /api/content/:id/publish | ❌ |
| GET | /api/announcements | ⚠️ partial |
| POST | /api/announcements | ⚠️ partial |
| PUT | /api/announcements/:id | ⚠️ partial |
| DELETE | /api/announcements/:id | ⚠️ partial |
| GET | /api/website-settings | ❌ |

#### Acceptance Criteria to Verify
- [ ] AC-01: Content can be created, edited, and published
- [ ] AC-02: Content has version history and rollback
- [ ] AC-03: Announcements auto-sync from Telegram
- [ ] AC-04: Content approval workflow works
- [ ] AC-05: SEO metadata properly managed
- [ ] AC-06: Content renders correctly on public site

---

### MODULE: DEPT (Departments Management)
**Status: ~60% Complete**
**CSV Source: 06-departments-module.csv**

#### What Is Done
- [x] department.controller.js (full CRUD)
- [x] department.routes.js + departments.routes.js
- [x] department-categories.routes.js
- [x] DepartmentsList.jsx (dark mode in progress)
- [x] DepartmentDashboard.jsx (88k file — tabs: Overview, Members, Communications, Events, Tasks, Resources, Gallery, Settings)
- [x] DepartmentOverview.jsx
- [x] DepartmentActivity.jsx
- [x] DepartmentSettings.jsx
- [x] MyDepartments.jsx
- [x] CategoryManagement.jsx
- [x] DepartmentHeadAllocation.jsx
- [x] components/PermissionManagement.jsx
- [x] components/ComponentAllocation.jsx
- [x] components/DepartmentBranding.jsx
- [x] activityFeed.controller.js

#### What Needs To Be Done
- [ ] **[DEPT-01]** Complete dark mode on DepartmentsList.jsx (Department Groups section ~line 541+)
- [ ] **[DEPT-02]** Apply dark mode to DepartmentDashboard.jsx (all 8 tabs)
- [ ] **[DEPT-03]** Apply dark mode to DepartmentOverview.jsx
- [ ] **[DEPT-04]** Apply dark mode to DepartmentActivity.jsx
- [ ] **[DEPT-05]** Apply dark mode to DepartmentSettings.jsx
- [ ] **[DEPT-06]** Apply dark mode to MyDepartments.jsx
- [ ] **[DEPT-07]** Apply dark mode to CategoryManagement.jsx
- [ ] **[DEPT-08]** Apply dark mode to DepartmentHeadAllocation.jsx
- [ ] **[DEPT-09]** Apply dark mode to PermissionManagement.jsx
- [ ] **[DEPT-10]** Apply dark mode to ComponentAllocation.jsx
- [ ] **[DEPT-11]** Apply dark mode to DepartmentBranding.jsx
- [ ] **[DEPT-12]** Create DepartmentContext.jsx (missing from contexts/)
- [ ] **[DEPT-13]** Granular permission system (department_permissions table wired to UI)
- [ ] **[DEPT-14]** Resource sharing between departments (department_resources table + UI)
- [ ] **[DEPT-15]** Department-level budget tracking (link to TREASURY module)
- [ ] **[DEPT-16]** Department dashboard widgets for main dashboard
- [ ] **[DEPT-17]** Activity feed search and filtering in DepartmentActivity.jsx
- [ ] **[DEPT-18]** Verify all API endpoints from CSV are implemented in controller

#### API Endpoints to Verify
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | /api/departments | ✅ |
| POST | /api/departments | ✅ |
| GET | /api/departments/:id | ✅ |
| PUT | /api/departments/:id | ✅ |
| DELETE | /api/departments/:id | ✅ |
| GET | /api/departments/:id/members | ✅ |
| POST | /api/departments/:id/members | ✅ |
| DELETE | /api/departments/:id/members/:userId | ✅ |
| GET | /api/departments/:id/permissions | ⚠️ verify |
| PUT | /api/departments/:id/permissions | ⚠️ verify |
| GET | /api/departments/:id/activity | ⚠️ verify |
| POST | /api/departments/:id/resources | ⚠️ verify |
| GET | /api/my-departments | ✅ |

#### Acceptance Criteria to Verify
- [x] AC-01: Departments can be created with heads and members
- [x] AC-02: Members can be assigned roles within departments
- [ ] AC-03: Department permissions control access to resources
- [ ] AC-04: Activity feed tracks all department actions
- [ ] AC-05: Resources can be shared between departments
- [ ] AC-06: Department budgets tracked separately

---

### MODULE: GALLERY (Photo Gallery Management)
**Status: ~85% Complete**
**CSV Source: 07-gallery-module.csv**

#### What Is Done
- [x] gallery.controller.js
- [x] gallery.routes.js
- [x] galleryCache.js
- [x] GalleryContext.jsx
- [x] GalleryAlbums.jsx (dark mode ✅)
- [x] Telegram photo fetching and caching
- [x] Album CRUD with cover photos
- [x] Photo upload
- [x] Responsive gallery with lightbox
- [x] Lazy loading
- [x] Dark mode theming

#### What Needs To Be Done
- [ ] **[GALLERY-01]** Photo tagging system (gallery_tags table + tag-based filtering UI)
- [ ] **[GALLERY-02]** Photo comments (gallery_comments table — `GET/POST /api/gallery/photos/:id/comments`)
- [ ] **[GALLERY-03]** Masonry layout (if not already implemented — verify)
- [ ] **[GALLERY-04]** Tag management UI (CRUD for tags)
- [ ] **[GALLERY-05]** Auto-tag suggestions
- [ ] **[GALLERY-06]** Cache health dashboard (expiring Telegram file references)
- [ ] **[GALLERY-07]** Thumbnail optimisation verification
- [ ] **[GALLERY-08]** Approval workflow for photo uploads (hooks into APPROVAL module)

#### API Endpoints to Verify
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | /api/gallery/albums | ✅ |
| POST | /api/gallery/albums | ✅ |
| GET | /api/gallery/albums/:id | ✅ |
| PUT | /api/gallery/albums/:id | ✅ |
| DELETE | /api/gallery/albums/:id | ✅ |
| GET | /api/gallery/photos | ✅ |
| GET | /api/gallery/photos/public | ⚠️ verify |
| POST | /api/gallery/photos | ✅ |
| DELETE | /api/gallery/photos/:id | ✅ |
| GET | /api/gallery/photos/:id/comments | ❌ |
| POST | /api/gallery/photos/:id/comments | ❌ |
| GET | /api/gallery/tags | ❌ |

---

### MODULE: TREASURY (Treasury & Finance)
**Status: ~50% Complete — Controller and pages exist, integration not verified**
**CSV Source: 08-treasury-module.csv**

#### What Is Done
- [x] treasury.controller.js (76k — largest file in project)
- [x] treasury.routes.js
- [x] TreasuryDashboard.jsx
- [x] ChartOfAccounts.jsx
- [x] Funds.jsx
- [x] JournalEntries.jsx
- [x] Expenses.jsx
- [x] Budgets.jsx
- [x] BankReconciliations.jsx
- [x] Vendors.jsx
- [x] Projects.jsx
- [x] FixedAssets.jsx
- [x] Pledges.jsx
- [x] RecurringPayments.jsx
- [x] TreasuryAnalytics.jsx
- [x] Contributions.jsx
- [x] Receipts.jsx
- [x] FinancialReports.jsx

#### What Needs To Be Done
- [ ] **[TREASURY-01]** Database migrations for all 11 treasury tables (accounts, funds, journal_entries, expenses, budgets, bank_reconciliations, vendors, projects, fixed_assets, pledges, recurring_payments)
- [ ] **[TREASURY-02]** Verify double-entry accounting enforcement in journal entries
- [ ] **[TREASURY-03]** Expense approval workflow (hooks into APPROVAL module)
- [ ] **[TREASURY-04]** Budget vs actual variance analysis
- [ ] **[TREASURY-05]** Department-level budget linking (hooks into DEPT module)
- [ ] **[TREASURY-06]** Member giving → Contributions tracking (hooks into CHURCH module)
- [ ] **[TREASURY-07]** Pledge management UI completeness check
- [ ] **[TREASURY-08]** Financial report accuracy verification (trial balance, income statement, balance sheet)
- [ ] **[TREASURY-09]** Tax statement generation for members
- [ ] **[TREASURY-10]** Apply dark mode to ALL treasury pages (16 pages)
- [ ] **[TREASURY-11]** Create TreasuryContext.jsx
- [ ] **[TREASURY-12]** Wire treasury pages into Sidebar navigation
- [ ] **[TREASURY-13]** E2E test: create journal entry, approve expense, check budget

#### API Endpoints to Verify
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | /api/treasury/accounts | ⚠️ verify |
| POST | /api/treasury/accounts | ⚠️ verify |
| GET | /api/treasury/funds | ⚠️ verify |
| POST | /api/treasury/funds | ⚠️ verify |
| GET | /api/treasury/journal-entries | ⚠️ verify |
| POST | /api/treasury/journal-entries | ⚠️ verify |
| GET | /api/treasury/expenses | ⚠️ verify |
| POST | /api/treasury/expenses | ⚠️ verify |
| POST | /api/treasury/expenses/:id/approve | ⚠️ verify |
| GET | /api/treasury/budgets | ⚠️ verify |
| POST | /api/treasury/budgets | ⚠️ verify |
| GET | /api/treasury/reports/trial-balance | ⚠️ verify |
| GET | /api/treasury/reports/income-statement | ⚠️ verify |
| GET | /api/treasury/reports/balance-sheet | ⚠️ verify |
| GET | /api/treasury/member-giving/:id | ⚠️ verify |

#### Acceptance Criteria
- [ ] AC-01: Double-entry accounting enforced
- [ ] AC-02: Expenses require approval workflow
- [ ] AC-03: Budget vs actual tracking works
- [ ] AC-04: Financial reports accurate
- [ ] AC-05: Member giving tracked and reported
- [ ] AC-06: Bank reconciliation supported

---

### MODULE: PAYMENT (Payments — M-Pesa/KopoKopo)
**Status: ~40% Complete — Controller and pages exist, full integration not verified**
**CSV Source: 09-payments-module.csv**

#### What Is Done
- [x] payment.controller.js + payments.controller.js
- [x] payment.routes.js + payments.routes.js
- [x] PaymentManagement.jsx
- [x] PaymentHistory.jsx
- [x] Payments.jsx

#### What Needs To Be Done
- [ ] **[PAYMENT-01]** Database migrations for payments tables (payments, payment_transactions, mpesa_settings, payment_categories, payment_links, refunds)
- [ ] **[PAYMENT-02]** KopoKopo service integration (backend/services/kopokopo.js)
- [ ] **[PAYMENT-03]** STK push implementation and callback handling
- [ ] **[PAYMENT-04]** Payment status polling
- [ ] **[PAYMENT-05]** Shareable payment links with expiry
- [ ] **[PAYMENT-06]** QR code generation for payments
- [ ] **[PAYMENT-07]** Webhook endpoint with signature verification
- [ ] **[PAYMENT-08]** Refund workflow with treasury integration
- [ ] **[PAYMENT-09]** Payment analytics dashboard
- [ ] **[PAYMENT-10]** Apply dark mode to all payment pages
- [ ] **[PAYMENT-11]** Create PaymentContext.jsx
- [ ] **[PAYMENT-12]** Wire payment pages into Sidebar navigation
- [ ] **[PAYMENT-13]** M-Pesa settings in Settings.jsx

#### API Endpoints to Verify/Implement
| Method | Endpoint | Status |
|--------|----------|--------|
| POST | /api/payments/initiate | ⚠️ verify |
| POST | /api/payments/link | ⚠️ verify |
| GET | /api/payments/qrcode | ❌ |
| GET | /api/payments/:id/status | ⚠️ verify |
| GET | /api/payments/history | ⚠️ verify |
| GET | /api/payments/all | ⚠️ verify |
| POST | /api/payments/webhook | ⚠️ verify |
| GET | /api/payments/analytics | ⚠️ verify |
| POST | /api/payments/:id/refund | ❌ |

---

### MODULE: SMS (SMS / BlessedTexts)
**Status: ~35% Complete — Controller exists, frontend empty**
**CSV Source: 10-sms-module.csv**

#### What Is Done
- [x] sms.controller.js
- [x] sms.routes.js (12k — appears thorough)

#### What Needs To Be Done
- [ ] **[SMS-01]** Database migrations for SMS tables (sms_messages, sms_templates, sms_credits, sms_usage_logs)
- [ ] **[SMS-02]** BlessedTexts API service (backend/services/blessedtexts.js)
- [ ] **[SMS-03]** SMS send endpoint wired end-to-end
- [ ] **[SMS-04]** SMS history UI (pages/sms/ — currently empty)
- [ ] **[SMS-05]** SMS template management UI (create, edit, delete, preview)
- [ ] **[SMS-06]** Bulk SMS with batch processing and progress tracking
- [ ] **[SMS-07]** SMS credit balance display
- [ ] **[SMS-08]** Low-balance alerts
- [ ] **[SMS-09]** SMS delivery status tracking
- [ ] **[SMS-10]** Opt-out management
- [ ] **[SMS-11]** SMS analytics dashboard
- [ ] **[SMS-12]** Integration points: trigger SMS from treasury payments, APPROVAL notifications
- [ ] **[SMS-13]** Apply dark mode to all SMS pages
- [ ] **[SMS-14]** Create SMSContext.jsx
- [ ] **[SMS-15]** Wire SMS pages into Sidebar navigation
- [ ] **[SMS-16]** BlessedTexts API credentials in Settings.jsx

#### API Endpoints to Verify
| Method | Endpoint | Status |
|--------|----------|--------|
| POST | /api/sms/send | ⚠️ verify |
| GET | /api/sms/history | ⚠️ verify |
| GET | /api/sms/balance | ⚠️ verify |
| GET | /api/sms/templates | ⚠️ verify |
| POST | /api/sms/templates | ⚠️ verify |
| PUT | /api/sms/templates/:id | ⚠️ verify |
| DELETE | /api/sms/templates/:id | ⚠️ verify |
| POST | /api/sms/bulk | ⚠️ verify |
| GET | /api/sms/analytics | ⚠️ verify |

---

### MODULE: DOC (Documents Management)
**Status: ~30% Complete — Controller exists, frontend empty**
**CSV Source: 11-documents-module.csv**

#### What Is Done
- [x] documents.controller.js
- [x] documents.routes.js

#### What Needs To Be Done
- [ ] **[DOC-01]** Database migrations (documents, document_categories, document_versions, document_permissions)
- [ ] **[DOC-02]** Document upload with cloud/local storage
- [ ] **[DOC-03]** File type validation
- [ ] **[DOC-04]** Automatic version history on every update
- [ ] **[DOC-05]** Rollback to previous version
- [ ] **[DOC-06]** Department-based access control for documents
- [ ] **[DOC-07]** Public/private document settings
- [ ] **[DOC-08]** Full-text search across documents
- [ ] **[DOC-09]** Document preview component
- [ ] **[DOC-10]** Document download with tracking
- [ ] **[DOC-11]** Approval workflow integration for publishing
- [ ] **[DOC-12]** pages/documents/ full UI (list, upload, view, categories)
- [ ] **[DOC-13]** Public document portal
- [ ] **[DOC-14]** Apply dark mode to all document pages
- [ ] **[DOC-15]** Create DocumentContext.jsx
- [ ] **[DOC-16]** Wire documents pages into Sidebar navigation

#### API Endpoints to Verify/Implement
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | /api/documents | ⚠️ verify |
| GET | /api/documents/:slug | ⚠️ verify |
| GET | /api/documents/:id | ⚠️ verify |
| POST | /api/documents | ⚠️ verify |
| PUT | /api/documents/:id | ⚠️ verify |
| DELETE | /api/documents/:id | ⚠️ verify |
| POST | /api/documents/:id/publish | ⚠️ verify |
| GET | /api/document-categories | ⚠️ verify |
| POST | /api/document-categories | ⚠️ verify |

---

### MODULE: APPROVAL (Approvals Workflow)
**Status: ~20% Complete — Routes exist, no controller, UI stub only**
**CSV Source: 12-approvals-module.csv**

#### What Is Done
- [x] approvals.routes.js (13k)
- [x] ApprovalInbox.jsx (stub — 1.6k)

#### What Needs To Be Done
- [ ] **[APPROVAL-01]** Database migrations (approval_requests, approval_history, approval_rules, approval_delegations)
- [ ] **[APPROVAL-02]** approval.controller.js (or approvals.controller.js)
- [ ] **[APPROVAL-03]** Multi-level routing and escalation engine
- [ ] **[APPROVAL-04]** Delegation of approval authority
- [ ] **[APPROVAL-05]** Approval rules engine (configurable by amount, department, type)
- [ ] **[APPROVAL-06]** Auto-execution of approved actions (safe transactions)
- [ ] **[APPROVAL-07]** Comprehensive audit trail
- [ ] **[APPROVAL-08]** ApprovalInbox.jsx full UI (pending, history, rules management)
- [ ] **[APPROVAL-09]** Approval request submission component (reusable for TREASURY, CONTENT, DOC, GALLERY)
- [ ] **[APPROVAL-10]** Apply dark mode to all approval pages
- [ ] **[APPROVAL-11]** Create ApprovalContext.jsx
- [ ] **[APPROVAL-12]** Wire approvals into Sidebar navigation
- [ ] **[APPROVAL-13]** Badge/count for pending approvals in header

#### API Endpoints to Verify/Implement
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | /api/approvals | ⚠️ routes exist |
| GET | /api/approvals/pending-count | ⚠️ routes exist |
| POST | /api/approvals/:id/approve | ⚠️ routes exist |
| POST | /api/approvals/:id/reject | ⚠️ routes exist |
| POST | /api/approvals/:id/delegate | ⚠️ routes exist |
| GET | /api/approvals/history | ⚠️ routes exist |
| GET | /api/approvals/rules | ⚠️ routes exist |
| PUT | /api/approvals/rules | ⚠️ routes exist |

---

### MODULE: NOTIF (Notifications System)
**Status: ~20% Complete — Routes exist, no frontend**
**CSV Source: 13-notifications-module.csv**

#### What Is Done
- [x] notifications.routes.js (4k)

#### What Needs To Be Done
- [ ] **[NOTIF-01]** Database migrations (notifications, notification_templates, notification_preferences, notification_logs)
- [ ] **[NOTIF-02]** notify.js helper (notification engine)
- [ ] **[NOTIF-03]** WebSocket or SSE for real-time delivery
- [ ] **[NOTIF-04]** Notification templates with variable substitution
- [ ] **[NOTIF-05]** User notification preferences UI
- [ ] **[NOTIF-06]** Push notification integration (browser + mobile)
- [ ] **[NOTIF-07]** Notification dropdown in Header.jsx (bell icon + badge + panel)
- [ ] **[NOTIF-08]** Notification centre page
- [ ] **[NOTIF-09]** Wire notifications to triggers: AUTH events, APPROVAL decisions, PAYMENT status, SMS delivery
- [ ] **[NOTIF-10]** Create NotificationContext.jsx
- [ ] **[NOTIF-11]** Unread count real-time update

#### API Endpoints to Verify/Implement
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | /api/notifications | ⚠️ routes exist |
| GET | /api/notifications/unread-count | ⚠️ routes exist |
| PATCH | /api/notifications/:id/read | ⚠️ routes exist |
| PATCH | /api/notifications/read-all | ⚠️ routes exist |
| DELETE | /api/notifications/:id | ⚠️ routes exist |
| GET | /api/notification-preferences | ⚠️ routes exist |
| PUT | /api/notification-preferences | ⚠️ routes exist |

---

### MODULE: SETTINGS (Settings & Configuration)
**Status: ~80% Complete**
**CSV Source: 14-settings-module.csv**

#### What Is Done
- [x] settings.controller.js
- [x] settings.routes.js (bulk 404 fix applied)
- [x] Settings.jsx (dark mode ✅, palette ✅, telegram ✅)
- [x] ColorPaletteContext.jsx
- [x] Dynamic palette system (PaletteSelector.jsx)
- [x] All 6 panels: General, Appearance, Telegram, Email, Security, Advanced
- [x] Bulk settings update (`PUT /api/settings/bulk` — fixed)
- [x] Dark mode toggle and persistence

#### What Needs To Be Done
- [ ] **[SETTINGS-01]** system_logs table and `GET /api/system/logs` endpoint
- [ ] **[SETTINGS-02]** `POST /api/system/backup` endpoint
- [ ] **[SETTINGS-03]** `GET /api/system/status` endpoint
- [ ] **[SETTINGS-04]** backup_logs table
- [ ] **[SETTINGS-05]** maintenance_schedules table and maintenance mode UI
- [ ] **[SETTINGS-06]** Settings import/export (JSON file download/upload)
- [ ] **[SETTINGS-07]** Audit log viewer panel in Settings.jsx
- [ ] **[SETTINGS-08]** M-Pesa / KopoKopo settings panel
- [ ] **[SETTINGS-09]** BlessedTexts SMS settings panel
- [ ] **[SETTINGS-10]** Before/after value tracking on all settings saves

---

### MODULE: CHURCH (Member Management)
**Status: ~65% Complete**
**CSV Source: 01-module-overview.csv (CHURCH row)**

#### What Is Done
- [x] members.controller.js
- [x] members.routes.js
- [x] MembersList.jsx (dark mode ✅)
- [x] MembersContext.jsx

#### What Needs To Be Done
- [ ] **[CHURCH-01]** member_contacts table and contact management UI
- [ ] **[CHURCH-02]** member_groups table (small groups, cells, classes)
- [ ] **[CHURCH-03]** member_attendance table + attendance tracking UI
- [ ] **[CHURCH-04]** Member giving linkage to TREASURY contributions
- [ ] **[CHURCH-05]** Member profile page (full view with giving history, attendance, departments)
- [ ] **[CHURCH-06]** Member import from CSV
- [ ] **[CHURCH-07]** Member directory (public or admin-only)

---

### FRONTEND MODULE: DASHUI (Dashboard Interface)
**Status: ~70% Complete**
**CSV Source: 15-frontend-modules.csv**

#### What Is Done
- [x] DashboardLayout.jsx (dark mode ✅)
- [x] Sidebar.jsx (dark mode ✅)
- [x] Header.jsx (dark mode ✅)
- [x] DashboardHome.jsx (dark mode ✅)
- [x] Responsive sidebar with collapsible sections
- [x] Theme support (light/dark + custom palettes)

#### What Needs To Be Done
- [ ] **[DASHUI-01]** Notification bell with unread count badge in Header
- [ ] **[DASHUI-02]** Department-specific dashboard widgets
- [ ] **[DASHUI-03]** Approval pending count badge in Sidebar
- [ ] **[DASHUI-04]** Customisable widget layout (drag-drop — optional/advanced)
- [ ] **[DASHUI-05]** Quick-action shortcuts on DashboardHome
- [ ] **[DASHUI-06]** Treasury summary widget (income vs expense)
- [ ] **[DASHUI-07]** SMS credit widget
- [ ] **[DASHUI-08]** Recent activity feed widget (cross-module)

---

### FRONTEND MODULE: WEBUI (Public Website)
**Status: ~5% Complete — Stub page only**
**CSV Source: 15-frontend-modules.csv**

#### What Is Done
- [x] PublicHome.jsx (794 bytes — near-empty stub)

#### What Needs To Be Done
- [ ] **[WEBUI-01]** Public layout (header with church name/logo, nav, footer)
- [ ] **[WEBUI-02]** Home page (hero, service times, ministries carousel, announcements, featured photos, newsletter)
- [ ] **[WEBUI-03]** About page
- [ ] **[WEBUI-04]** Announcements public listing page
- [ ] **[WEBUI-05]** Public gallery viewer (albums + photos)
- [ ] **[WEBUI-06]** Contact/directions page
- [ ] **[WEBUI-07]** Documents public portal
- [ ] **[WEBUI-08]** Live stream section
- [ ] **[WEBUI-09]** SEO meta tags and Open Graph
- [ ] **[WEBUI-10]** Mobile-first responsive design
- [ ] **[WEBUI-11]** Privacy policy and terms pages
- [ ] **[WEBUI-12]** Routing: public routes separate from admin dashboard routes

---

### FRONTEND MODULE: ADMINUI (Administrative Interface)
**Status: ~40% Complete**
**CSV Source: 15-frontend-modules.csv**

#### What Is Done
- [x] Admin pages directory exists
- [x] Sidebar navigation wired to most modules
- [x] User management pages exist (pages/users/)

#### What Needs To Be Done
- [ ] **[ADMINUI-01]** User management UI (list, create, edit, deactivate, role assignment)
- [ ] **[ADMINUI-02]** Roles and permissions management UI
- [ ] **[ADMINUI-03]** Audit log viewer (searchable, filterable)
- [ ] **[ADMINUI-04]** Bulk operations: users, content, members
- [ ] **[ADMINUI-05]** System health dashboard panel
- [ ] **[ADMINUI-06]** Wire all new modules (SMS, DOC, NOTIF, APPROVAL) into Sidebar

---

## Cross-Cutting: Dark Mode & Theming

### Architecture (Complete)
- [x] `frontend/src/index.css` — utility classes: `.card`, `.btn`, `.input`, `.label`, `.table-row`, etc.
- [x] `tailwind.config.js` — CSS variable mapping (`bg-primary` → `var(--color-primary)`)
- [x] `ColorPaletteContext.jsx` — applies CSS vars to `:root`, toggles `dark` class on `<html>`
- [x] Dynamic palette editing (PaletteSelector.jsx — no hardcoded palettes)
- [x] Settings persistence (saves to DB via `/api/settings/bulk`)

### Dark Mode Status Per Page
| Page/Component | Status |
|---------------|--------|
| DashboardHome.jsx | ✅ Done |
| DashboardLayout.jsx | ✅ Done |
| Sidebar.jsx | ✅ Done |
| Header.jsx | ✅ Done |
| MembersList.jsx | ✅ Done |
| GalleryAlbums.jsx | ✅ Done |
| Settings.jsx | ✅ Done |
| DepartmentsList.jsx | ⚠️ In Progress (~line 541 Department Groups section) |
| DepartmentDashboard.jsx | ❌ Not Started |
| DepartmentOverview.jsx | ❌ Not Started |
| DepartmentActivity.jsx | ❌ Not Started |
| DepartmentSettings.jsx | ❌ Not Started |
| MyDepartments.jsx | ❌ Not Started |
| CategoryManagement.jsx | ❌ Not Started |
| DepartmentHeadAllocation.jsx | ❌ Not Started |
| PermissionManagement.jsx | ❌ Not Started |
| ComponentAllocation.jsx | ❌ Not Started |
| DepartmentBranding.jsx | ❌ Not Started |
| Treasury pages (16 files) | ❌ Not Started |
| Payment pages (3 files) | ❌ Not Started |
| Approvals pages | ❌ Not Started |
| SMS pages | ❌ Not Started (pages empty) |
| Documents pages | ❌ Not Started (pages empty) |
| Notifications pages | ❌ Not Started (pages empty) |
| Content pages | ❌ Not Started (pages empty) |
| Public pages | N/A (separate design) |

---

## Database Migrations Needed

The following modules have controllers and routes but **no migration files** found:

| Module | Tables Needed |
|--------|--------------|
| AUTH | users, roles, user_roles, login_attempts, password_reset_tokens, refresh_tokens |
| CONTENT | content_items, content_categories, content_tags, content_revisions, website_settings, announcements |
| DEPT | departments, department_members, department_permissions, department_resources, department_activities |
| GALLERY | gallery_albums, gallery_photos, gallery_tags, gallery_comments, telegram_photos_cache |
| TREASURY | accounts, funds, journal_entries, expenses, budgets, bank_reconciliations, vendors, projects, fixed_assets, pledges, recurring_payments |
| PAYMENT | payments, payment_transactions, mpesa_settings, payment_categories, payment_links, refunds |
| SMS | sms_messages, sms_templates, sms_credits, sms_usage_logs |
| DOC | documents, document_categories, document_versions, document_permissions |
| APPROVAL | approval_requests, approval_history, approval_rules, approval_delegations |
| NOTIF | notifications, notification_templates, notification_preferences, notification_logs |
| SETTINGS | settings, system_logs, backup_logs, maintenance_schedules |
| CHURCH | members, member_contacts, member_pledges, member_attendance, member_groups |
| TELEGRAM | telegram_channels, telegram_channel_posts, telegram_channel_media, telegram_settings |

**Action Required:** Audit which tables actually exist in the database (`mysql> SHOW TABLES;`) and generate missing migrations. Only 004_gallery_schema.sql was found in migrations/.

---

## Missing Context Files

The following Context files are defined in the CSV architecture but do not exist in `frontend/src/contexts/`:

| Missing File | Required By | Priority |
|-------------|------------|---------|
| DepartmentContext.jsx | DEPT module | HIGH |
| TreasuryContext.jsx | TREASURY module | MEDIUM |
| PaymentContext.jsx | PAYMENT module | MEDIUM |
| SMSContext.jsx | SMS module | MEDIUM |
| DocumentContext.jsx | DOC module | MEDIUM |
| ApprovalContext.jsx | APPROVAL module | HIGH |
| NotificationContext.jsx | NOTIF module | HIGH |

---

## Session Priority Order

### Session 1: Finish Departments (Immediate)
**Goal:** Complete the department module to production quality

1. Finish DepartmentsList.jsx dark mode (Department Groups section)
2. Apply dark mode to all 11 department pages/components
3. Create DepartmentContext.jsx
4. Verify all department API endpoints work end-to-end
5. Test: create department → add members → set permissions → view activity feed

### Session 2: Core Infrastructure Gaps
**Goal:** Fix missing infrastructure before building more features

1. Audit database tables (run `SHOW TABLES` and compare against CSV definitions)
2. Write and run missing migrations for all modules
3. Verify backend server.js registers all routes correctly
4. Fix any duplicate routes (department.routes.js vs departments.routes.js)
5. Fix payment.controller.js vs payments.controller.js duplication

### Session 3: Approvals + Notifications (Cross-cutting)
**Goal:** These modules unblock many other modules

1. Build APPROVAL module fully (controller, migrations, UI)
2. Build NOTIF module (controller, migrations, WebSocket, UI)
3. Create ApprovalContext.jsx and NotificationContext.jsx
4. Wire notification bell into Header.jsx
5. Wire approval count badge into Sidebar

### Session 4: Treasury Dark Mode + Integration
**Goal:** Make treasury usable and correctly integrated

1. Apply dark mode to all 16 treasury pages
2. Create TreasuryContext.jsx
3. Wire treasury into Sidebar navigation
4. Test double-entry journal entry flow
5. Test expense approval flow (requires Session 3 APPROVAL module)

### Session 5: Content Module
**Goal:** CMS and announcements fully functional

1. Build CONTENT module (controller, migrations, routes)
2. Build content pages UI
3. Implement rich text editor
4. Set up Telegram → announcements auto-sync
5. Test content creation → approval → publish flow

### Session 6: Payment + SMS
**Goal:** Communication and payment channels working

1. Complete PAYMENT module (KopoKopo integration, webhooks)
2. Build SMS module (BlessedTexts integration, templates, bulk)
3. Apply dark mode to both modules
4. Test STK push flow end-to-end
5. Test SMS send with template

### Session 7: Documents + Gallery Completion
**Goal:** All media/document handling complete

1. Build DOC module (migrations, controller completeness, UI)
2. Complete GALLERY tagging and comments
3. Gallery approval workflow
4. Apply dark mode to documents pages

### Session 8: Public Website (WEBUI)
**Goal:** Public-facing website live

1. Build PublicHome.jsx properly (hero, service times, announcements, gallery)
2. Build About, Contact, Announcements listing pages
3. Public gallery viewer
4. Public documents portal
5. SEO metadata, responsive design

### Session 9: Testing
**Goal:** Comprehensive verification

1. Backend API tests: all endpoints return correct status codes
2. Auth flow: register → login → RBAC enforcement
3. Department CRUD + member management
4. Gallery upload → Telegram → cache → display
5. Treasury: journal entry → expense → approval → financial report
6. Payment: STK push → webhook → treasury reconciliation
7. SMS: send → delivery status → credit balance update
8. Dark mode: every page in both light and dark modes
9. Palette: custom color editing → all pages reflect change
10. Edge cases: empty states, error states, loading states

### Session 10: Polish + Deployment Prep
**Goal:** Production-ready

1. Performance optimisation (lazy loading, code splitting)
2. Security audit (no exposed secrets, all routes protected)
3. Environment variable audit (.env.example completeness)
4. README.md update with setup instructions
5. Git history clean-up and proper branch strategy (16-version-control-procedures.csv)

---

## Version Control Procedures (from 16-version-control-procedures.csv)

### Branch Naming Convention
```
{MODULE-CODE}/{feature-description}
Examples:
  DEPT/dark-mode-theming
  TREASURY/migrations
  NOTIF/websocket-realtime
  APPROVAL/controller-implementation
```

### Commit Message Format
```
[MODULE] Brief description - Issue #123
Examples:
  [DEPT] Complete dark mode for DepartmentsList.jsx
  [SETTINGS] Fix /api/settings/bulk 404 route ordering
  [GALLERY] Add photo tagging system
```

### Rules
- One module per PR
- All tests must pass before merge
- API docs updated if endpoints change
- No cross-module database table access
- Breaking changes documented

---

## Known Bugs & Technical Debt

| # | Bug | Module | Status |
|---|-----|--------|--------|
| 1 | `/api/settings/bulk` 404 (PUT /bulk declared after PUT /:key) | SETTINGS | ✅ Fixed |
| 2 | `handleDarkModeToggle` called `setIsDark()` which doesn't exist | SETTINGS | ✅ Fixed |
| 3 | Duplicate routes: department.routes.js vs departments.routes.js | DEPT | ⚠️ Needs audit |
| 4 | Duplicate controllers: payment.controller.js vs payments.controller.js | PAYMENT | ⚠️ Needs audit |
| 5 | DepartmentsList.jsx dark mode incomplete (Department Groups section) | DEPT | ⚠️ In Progress |
| 6 | No migrations for most modules (only 004_gallery_schema.sql found) | ALL | ❌ High priority |
| 7 | Missing DepartmentContext.jsx | DEPT | ❌ |
| 8 | Missing ApprovalContext.jsx + NotificationContext.jsx | APPROVAL/NOTIF | ❌ |
| 9 | pages/content/, pages/sms/, pages/documents/, pages/telegram/ are empty | CONTENT/SMS/DOC | ❌ |
| 10 | PublicHome.jsx is a 794-byte stub (not a real website) | WEBUI | ❌ |

---

## File Structure Reference (Target State)

```
KMainCMS/
├── backend/
│   ├── controllers/
│   │   ├── auth.controller.js          ✅
│   │   ├── telegram.controller.js      ❌ missing
│   │   ├── content.controller.js       ❌ missing
│   │   ├── announcement.controller.js  ✅
│   │   ├── department.controller.js    ✅
│   │   ├── gallery.controller.js       ✅
│   │   ├── treasury.controller.js      ✅
│   │   ├── payment.controller.js       ✅ (dedup needed)
│   │   ├── sms.controller.js           ✅
│   │   ├── documents.controller.js     ✅
│   │   ├── approval.controller.js      ❌ missing
│   │   ├── notification.controller.js  ❌ missing
│   │   ├── settings.controller.js      ✅
│   │   └── members.controller.js       ✅
│   ├── routes/                         (most exist, dedup needed)
│   ├── services/
│   │   ├── telegramService.js          ⚠️ verify exists
│   │   ├── kopokopo.js                 ❌ missing
│   │   └── blessedtexts.js             ❌ missing
│   ├── helpers/
│   │   ├── security.js                 ✅
│   │   ├── galleryCache.js             ✅
│   │   ├── finance.js                  ❌ missing
│   │   ├── paymentNotifications.js     ❌ missing
│   │   ├── sms.js                      ❌ missing
│   │   ├── documentStorage.js          ❌ missing
│   │   ├── approvals.js                ⚠️ verify
│   │   ├── notify.js                   ❌ missing
│   │   └── system.js                   ❌ missing
│   └── migrations/
│       ├── 001_auth_schema.sql         ❌ missing
│       ├── 002_content_schema.sql      ❌ missing
│       ├── 003_departments_schema.sql  ❌ missing
│       ├── 004_gallery_schema.sql      ✅
│       ├── 005_treasury_schema.sql     ❌ missing
│       ├── 006_payments_schema.sql     ❌ missing
│       ├── 007_sms_schema.sql          ❌ missing
│       ├── 008_documents_schema.sql    ❌ missing
│       ├── 009_approvals_schema.sql    ❌ missing
│       ├── 010_notifications_schema.sql ❌ missing
│       ├── 011_settings_schema.sql     ❌ missing
│       └── 012_telegram_schema.sql     ❌ missing
└── frontend/src/
    ├── contexts/
    │   ├── AuthContext.jsx             ✅
    │   ├── ColorPaletteContext.jsx     ✅
    │   ├── GalleryContext.jsx          ✅
    │   ├── MembersContext.jsx          ✅
    │   ├── SettingsContext.jsx         ✅
    │   ├── DepartmentContext.jsx       ❌ missing
    │   ├── TreasuryContext.jsx         ❌ missing
    │   ├── PaymentContext.jsx          ❌ missing
    │   ├── SMSContext.jsx              ❌ missing
    │   ├── DocumentContext.jsx         ❌ missing
    │   ├── ApprovalContext.jsx         ❌ missing
    │   └── NotificationContext.jsx     ❌ missing
    └── pages/
        ├── auth/                       ✅
        ├── dashboard/                  ✅ dark mode ✅
        ├── gallery/                    ✅ dark mode ✅
        ├── members/                    ✅ dark mode ✅
        ├── settings/                   ✅ dark mode ✅
        ├── departments/                ✅ dark mode ⚠️ in-progress
        ├── treasury/                   ✅ pages, dark mode ❌
        ├── payments/                   ✅ pages, dark mode ❌
        ├── approvals/                  ⚠️ stub only
        ├── content/                    ❌ empty
        ├── documents/                  ❌ empty
        ├── sms/                        ❌ empty
        ├── telegram/                   ❌ empty
        ├── notifications/              ❌ empty
        └── public/                     ⚠️ stub only
```

---

*This document should be updated at the start of each development session to reflect current progress. Tick off completed items, add new bugs discovered, and adjust session priorities as needed.*
