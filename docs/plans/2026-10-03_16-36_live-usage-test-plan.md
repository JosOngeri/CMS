# 2026-10-03 16:36 EAST — Live-Usage Test Plan

Simulate a real church running the platform end-to-end: public visitors,
members, department heads, treasurers, and admins — exercising every UI
function and the backend endpoint each one hits. Each row lists the **files in
the call chain** so a failure can be traced page → api → route → controller →
repository.

Status column: `OPEN` = untested, `PASS` = works, `FAIL` = bug found (file the
detail under "Findings" at the bottom), `N/A` = intentionally not testable.

## 0. Test setup (do once)

| # | Task | Files touched | Status |
|---|---|---|---|
| 0.1 | Backend up: `cd backend && npm run dev` → confirm `GET /api/health` 200 | `backend/app.js`, `routes/index.routes.js`, `routes/health.js` | OPEN |
| 0.2 | Frontend up: `cd frontend && npm run dev` → `http://localhost:5181` | `frontend/vite.config.js`, `src/main.jsx`, `App.jsx` | OPEN |
| 0.3 | One login per role: Super Admin, Pastor, Treasurer, Department Head, Member. If missing, create via `backend/create-admin.js` or register + promote in DB | `backend/create-admin.js`, `repositories/UserRepository.js` | OPEN |
| 0.4 | Second church tenant (or second user in another church) for cross-tenant checks | `repositories/ChurchRepository.js` | OPEN |
| 0.5 | Tools: browser devtools Network tab open for every test; `backend` log tail in a second terminal; a screen-size toggle (F12 device toolbar → 375px) for mobile-UX checks | — | OPEN |

## 1. Public site (no login)

| # | Flow / what to click | API calls exercised | Files in chain | Status |
|---|---|---|---|---|
| 1.1 | Home page loads: hero, ministries carousel (auto-scroll + pause on hover), service times, featured photos, live-stream section | `GET /api/settings/public` (palette, church name, stream URLs) | `pages/public/PublicHome.jsx` → `contexts/SettingsContext.jsx` → `routes/settings.routes.js` → `controllers/settings.controller.js` → `repositories/SettingsRepository.js`; `components/public/{MinistriesCarousel,ServiceTimes,FeaturedPhotos,LiveStreamSection}.jsx` | OPEN |
| 1.2 | "Add to calendar" on a service card → opens Google Calendar with **next Sabbath/Wednesday date + correct times** | none (client-side) | `components/public/ServiceTimes.jsx` | OPEN |
| 1.3 | Photo gallery page: grid loads, search bar, category filter, mobile menu button (375px) opens drawer | `GET /api/gallery/photos`, `GET /api/gallery/categories` | `pages/PhotoGalleryPage.jsx` → `components/gallery/{GalleryNavigation,ApplePhotoGrid}.jsx` → `routes/gallery.routes.js` → `controllers/gallery.controller.js` → `repositories/GalleryRepository.js` | OPEN |
| 1.4 | Click a photo → lightbox opens, arrows navigate, Esc closes | `GET /api/gallery/image/:id` | `components/gallery/PhotoLightbox.jsx`, `routes/gallery.routes.js` | OPEN |
| 1.5 | `/announcements` public list → click one → detail page | `GET /api/announcements?public=true`, `GET /api/announcements/:id` | `pages/announcements/Announcements.jsx` (public variant), `pages/public/PublicAnnouncementDetail.jsx` → `routes/announcements.routes.js` → `controllers/announcements.controller.js` | OPEN |
| 1.6 | `/downloads`, `/terms`, `/privacy` render | static/settings | `pages/public/{DownloadsPage,Terms,Privacy}.jsx` | OPEN |
| 1.7 | UX check: every link/button on the public site goes somewhere real — no dead nav, no `/departments` links | — | `components/public/*.jsx`, `router/public.routes.jsx` | OPEN |
| 1.8 | UX check: page under 3s on 4G throttle (devtools Network → Fast 4G), no console errors | all public GETs | `frontend/index.html`, `src/main.jsx` | OPEN |

## 2. Authentication & onboarding

| # | Flow | API calls | Files in chain | Status |
|---|---|---|---|---|
| 2.1 | Login as each role → lands on dashboard; wrong password → clean error, no stack trace | `POST /api/auth/login` | `pages/auth/Login.jsx` → `contexts/AuthContext.jsx` → `routes/auth.routes.js` → `controllers/auth.controller.js` → `services/IdentityService.js`, `middleware/auth.js` | OPEN |
| 2.2 | Logout → back to public site; refresh after login → session persists | `POST /api/auth/logout`, `GET /api/auth/me` | `contexts/AuthContext.jsx`, `components/common/Header.jsx` | OPEN |
| 2.3 | Token expiry: wait for access-token expiry or tamper the cookie → app redirects to login with 401, not a crash | `401` handling | `contexts/AuthContext.jsx` (axios interceptor), `middleware/auth.js` | OPEN |
| 2.4 | Register a new member account → verify approval/pending flow if enabled | `POST /api/auth/register` | `pages/auth/Register.jsx` → `controllers/auth.controller.js` → `repositories/UserRepository.js` | OPEN |
| 2.5 | Password reset request → code/email flow → login with new password | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | `pages/auth/ForgotPassword.jsx` → auth routes, `middleware/rateLimiter.js` (`passwordResetLimiter`) | OPEN |
| 2.6 | MFA: if enabled on admin → login asks for code; wrong code rejected | `POST /api/auth/mfa/verify` | `middleware/identityGuard.js`, `controllers/auth.controller.js` | OPEN |

## 3. Member dashboard (Member role)

| # | Flow | API calls | Files in chain | Status |
|---|---|---|---|---|
| 3.1 | Overview loads: stats, activity feed, no "Invalid Date", no undefined names in header | `GET /api/dashboard/*`, `GET /api/users/me` | `pages/dashboard/Dashboard.jsx` → `components/common/{Header,StatsCard,ActivityFeed}.jsx` → `routes/dashboard.routes.js` → `controllers/dashboard.controller.js` | OPEN |
| 3.2 | My payments: list, "New payment" form submit (use a fake/manual method — don't send real M-Pesa) | `GET /api/payments/my`, `POST /api/payments` | `pages/payments/{MyPayments,Payments}.jsx` → `routes/payments.routes.js` → `controllers/payments.controller.js` → `repositories/PaymentRepository.js` | OPEN |
| 3.3 | Payment history + My Obligations pages load | `GET /api/payments/history`, `GET /api/payments/obligations` | `pages/payments/{PaymentHistory,MyObligations}.jsx` | OPEN |
| 3.4 | My collections: view, contribute with valid amount; try 0/negative/text → must reject | `GET /api/collections`, `POST /api/collections/:id/contributions` | `pages/collections/MyCollections.jsx` → `components/events/CollectionTracker.jsx` → `routes/collections.routes.js` | OPEN |
| 3.5 | Notifications page loads; bell icon in header navigates there | `GET /api/notifications` | `pages/notifications/NotificationDashboard.jsx`, `components/common/Header.jsx` | OPEN |
| 3.6 | Profile: edit name/phone → save → reflected on reload | `PUT /api/users/profile` | `pages/profile/Profile.jsx` → `routes/users.routes.js` → `controllers/users.controller.js` | OPEN |
| 3.7 | Member tries a finance URL directly (`/dashboard/treasury`) → redirected/blocked, no data leak | n/a | `router/dashboard.routes.jsx` (`W` role guard) | OPEN |
| 3.8 | Announcements: list opens, row delete icon visible on mobile size | `GET /api/announcements` | `pages/announcements/Announcements.jsx` → `components/common/GmailMessageList.jsx` | OPEN |

## 4. Leadership (Department Head / Pastor)

| # | Flow | API calls | Files in chain | Status |
|---|---|---|---|---|
| 4.1 | Member directory: list loads **all** members (scroll past 50), role/department filters actually filter, export works | `GET /api/users/directory`, `GET /api/departments` | `pages/members/MemberDirectory.jsx` → `routes/users.routes.js` → `controllers/users.controller.js` → `repositories/UserRepository.js` | OPEN |
| 4.2 | Departments list → click department card → dashboard loads (slug route); Activity page loads | `GET /api/departments/:slug/dashboard`, `/activity` | `pages/departments/{DepartmentsList,DepartmentDashboard,DepartmentActivity}.jsx` → `hooks/useActivityFeed.js` → `routes/departments.routes.js` → `controllers/departments.controller.js` | OPEN |
| 4.3 | Department activity feed: filter chips work, bulk approve/reject on pending rows | `POST /api/departments/:id/activities/:aid/action` | `components/departments/ActivityFeed.jsx` → `hooks/useActivityFeed.js` | OPEN |
| 4.4 | Create announcement → appears in list + public page | `POST /api/announcements` | `pages/announcements/Announcements.jsx` (compose) → `controllers/announcements.controller.js` → `repositories/AnnouncementsRepository.js` | OPEN |
| 4.5 | SMS: send single + bulk to a test group; contact list, groups CRUD | `POST /api/sms/send`, `GET /api/sms/contacts`, `POST /api/sms/groups` | `pages/sms/{SMS,SMSDashboard,SMSContacts,SMSGroups}.jsx` → `routes/sms.routes.js` → `controllers/sms.controller.js` → `services/hybridSMS.js` → `repositories/SMSProviderRepository.js` | OPEN |
| 4.6 | Approvals inbox: pending list, approve/reject one → status changes, requester notified | `GET /api/approvals`, `POST /api/approvals/:id/approve|reject` | `pages/approvals/ApprovalInbox.jsx` → `routes/approvals.routes.js` → `controllers/approvals.controller.js` → `repositories/ApprovalsRepository.js` | OPEN |
| 4.7 | Content pages: create/edit/publish content; scheduled list loads (route shadowing regression) | `GET /api/content/scheduled`, `GET /api/content/:id` | `pages/content/Content.jsx` → `routes/content.routes.js` | OPEN |

## 5. Finance (Treasurer)

| # | Flow | API calls | Files in chain | Status |
|---|---|---|---|---|
| 5.1 | Treasury dashboard loads with real numbers | `GET /api/treasury/dashboard` | `pages/treasury/TreasuryDashboard.jsx` → `routes/treasury*.routes.js` → `controllers/treasury*.controller.js` | OPEN |
| 5.2 | Payment management: approve a pending payment, reject one; verify a manual payment; match to member | `PUT /api/payments/:id/status`, `POST /api/manual-payments/:id/match` | `pages/payments/PaymentManagement.jsx` → `controllers/{payments,manualPayment}.controller.js` | OPEN |
| 5.3 | Chart of accounts: create account, list, edit | `GET/POST/PUT /api/treasury/chart-of-accounts` | `pages/treasury/ChartOfAccounts.jsx` → `routes/chartOfAccounts.routes.js` | OPEN |
| 5.4 | Journal entry: create with balanced debit/credit lines; unbalanced → rejected | `POST /api/treasury/journal-entries` | `pages/treasury/JournalEntries.jsx` → journal controller/repo | OPEN |
| 5.5 | Budgets: create, edit, NaN input rejected | `POST/PUT /api/treasury/budgets` | `pages/treasury/Budgets.jsx` | OPEN |
| 5.6 | Expenses: create, approve, delete; search with no results | `/api/treasury/expenses` | `pages/treasury/Expenses.jsx` | OPEN |
| 5.7 | Receipts: view + generate PDF/receipt for a payment | `GET /api/manual-payments/receipt/:num(/generate)` | `pages/treasury/Receipts.jsx` → `routes/manualPayment.routes.js` | OPEN |
| 5.8 | Funds, Vendors, Projects, Pledges, Recurring, Fixed Assets, Bank Reconciliations, Contributions, Financial Reports, Analytics — each page: list loads, create/edit/delete a record | `/api/treasury/funds|vendors|projects|pledges|recurring|assets|reconciliations|contributions`, `/api/reports`, `/api/treasury/analytics` | `pages/treasury/*.jsx` → matching routes/controllers/repos | OPEN |
| 5.9 | Cross-tenant: treasurer of church A opens a church B payment/pledge/project ID directly → 403/404, never data | `GET /api/payments/:id` (foreign id) | `middleware/auth.js`, `controllers/payments.controller.js`, `repositories/PaymentRepository.js` | OPEN |
| 5.10 | M-Pesa STK push on own church → churchId comes from JWT (tamper `churchId` in body → still own church) | `POST /api/mpesa/stk-push` | `routes/mpesa.routes.js` → `services/MpesaService.js` | OPEN |
| 5.11 | M-Pesa callback without signature → rejected (fail closed) | `POST /api/mpesa/callback` | `services/MpesaService.js` (`validateSignature`) | OPEN |

## 6. Admin (Super Admin)

| # | Flow | API calls | Files in chain | Status |
|---|---|---|---|---|
| 6.1 | Admin dashboard + user management: create user, assign role, deactivate, reactivate | `GET/POST/PUT /api/users`, `PUT /api/users/:id/role` | `pages/admin/{AdminDashboard,UserManagement}.jsx` → `routes/users.routes.js` | OPEN |
| 6.2 | Site settings: change church name → reflected publicly; set `youtube_stream_url` → live-stream section link changes; toggle `enable_live_stream` → badge appears | `GET/PUT /api/settings` | `pages/admin/SiteSettings.jsx` → `controllers/settings.controller.js` → `components/public/LiveStreamSection.jsx` | OPEN |
| 6.3 | Palette selector: pick preset (whole site recolors); type invalid hex (`#zzz`, `red`) → rejected; valid hex applies | `PUT /api/settings` (palette keys) | `components/settings/PaletteSelector.jsx` → `contexts/ColorPaletteContext.jsx` | OPEN |
| 6.4 | Documents: upload a file, download it, check permissions | `POST /api/documents/upload`, `GET /api/documents/:id/download` | `pages/admin/Documents.jsx` → `routes/documents.routes.js` → `controllers/documents.controller.js` | OPEN |
| 6.5 | Documentation page: list loads (was 404), edit doc, Export All downloads JSON | `GET /api/documents` | `pages/documentation/Documentation.jsx` → `components/documentation/DocumentationManager.jsx` | OPEN |
| 6.6 | Security page: sessions, events, IP block/unblock | `GET /api/security/*` | `pages/admin/Security.jsx` → `routes/security.routes.js` → `controllers/security.controller.js` | OPEN |
| 6.7 | Monitoring, Admin Database, SEO, Accessibility, Testing, Mobile admin pages each load without console errors | `/api/monitoring`, `/api/health/db` etc. | `pages/admin/{Monitoring,AdminDatabase}.jsx`, `pages/{SEO,Accessibility,Testing,Mobile}.jsx` | OPEN |
| 6.8 | Telegram church settings page loads (config save optional) | `GET /api/telegram-church/config` | `pages/telegram/TelegramChurchSettings.jsx` | OPEN |
| 6.9 | Audit logs page (if surfaced) or `GET /api/audit-logs` returns tenant-scoped rows | `GET /api/audit-logs` | `routes/auditLogs.routes.js`, `repositories/AuditLogRepository.js` | OPEN |

## 7. Cross-cutting / non-functional

| # | Test | Pass criteria | Files | Status |
|---|---|---|---|---|
| 7.1 | Cross-tenant IDOR sweep: with church-A token, `GET/PUT/DELETE` church-B IDs on payments, users, departments, gallery, documents | 403/404 every time, never B's data | `middleware/auth.js`, all `controllers/*.js`, scoped `repositories/*.js` | OPEN |
| 7.2 | Rate limiting: 6+ rapid logins on platform login → 429 | 429 after limit | `middleware/rateLimiter.js`, `routes/platform.routes.js` | OPEN |
| 7.3 | Kill Redis → restart backend → requests still work (in-memory limiter); start Redis after boot → check logs for "switched to Redis" | no crash; lazy adoption | `middleware/rateLimiter.js`, `services/redisCache.js` | OPEN |
| 7.4 | Kill Postgres → API returns clean 503/error pages, not white screen | error states render | `config/database.js`, `components/common/{ErrorBoundary,EmptyState}.jsx` | OPEN |
| 7.5 | Mobile UX (375px): every dashboard page usable, no horizontal scroll, all tap targets ≥44px, nav drawer works | visual pass | `components/common/{Header,Sidebar}.jsx`, `pages/**/*` | OPEN |
| 7.6 | Dark mode toggle → whole app recolors, no hardcoded-color leaks | visual pass | `contexts/ColorPaletteContext.jsx`, `index.css` | OPEN |
| 7.7 | Pino log check after test session: no passwords/tokens/phone numbers in logged bodies | grep `backend` logs | `config/logging.js` (`redact.paths`) | OPEN |
| 7.8 | API load: `npx autocannon -c 20 -d 15 http://localhost:3000/api/gallery/photos` | p95 < 500ms, 0 errors | `routes/gallery.routes.js` | OPEN |
| 7.9 | Browser a11y: tab through login + dashboard, axe/Lighthouse a11y ≥ 90 | keyboard + score | `components/common/*` | OPEN |
| 7.10 | WebSocket: open two sessions, send announcement → other session live-updates | socket event | `services/socketService.js` (or equivalent), `contexts/*` | OPEN |

## 8. Mobile app (Flutter)

| # | Flow | API calls | Files | Status |
|---|---|---|---|---|
| 8.1 | Change API base URL in app settings/config → app points at VPS without rebuild | all | `mobile/flutter/flutter-mobile/lib/services/config.dart` | OPEN |
| 8.2 | Login → token stored in secure storage (check `flutter_secure_storage`, not SharedPreferences) | `POST /api/auth/login` (or mobile auth) | `lib/services/auth_service.dart` | OPEN |
| 8.3 | Dashboard, members, payments, announcements parity vs web | matching GETs | `lib/screens/**`, `lib/services/**` | OPEN |
| 8.4 | Paste-based SMS reconciliation flow | `POST /api/sms-sync/*` | `lib/services/sms_recon_service.dart` → `routes/smsSync.routes.js` | OPEN |
| 8.5 | Airplane mode → graceful offline/error states | — | `lib/widgets/*`, error handling | OPEN |

## 9. Findings log

Record every failure here as a new row (per ledger conventions), then file
into the audit ledger:

| # | Flow ref | File | Symptom | Severity | Status |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
