# Msabato CMS Mobile Changelog

All notable releases of the Msabato Church Management System Android (Flutter)
app.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-10-01

### Added
- Automatic M-Pesa/bank payment alerts — the app listens for incoming payment SMS in the background and notifies the collector; no manual scanning
- Pending Payments inbox (`/collect-payments`) — collector taps Accept, picks the member's obligation (auto-suggested by phone + amount match), or Decline
- "Payment alerts" toggle in department Collections tab — one switch enables listening on that phone
- On-device SMS parser per `docs/specs/mpesa-sms-samples.md` — received, sent, PayBill/Till, bank deposit, and reversal detection; tx-code dedupe; raw SMS bodies never leave the phone

## [1.3.0] - 2026-10-01

### Added
- Departments moved to centre tab of bottom navigation (Home · Events · Depts · Payments · Profile)
- Department detail gains Collections and Leadership tabs
- Collections tab: collection target progress, 25/50/75/100% milestones, budgets (propose/allocate), reconciliations, AI parser calibration
- Leadership tab: roster of head/assistant/secretary/collector, appoint and revoke, temporary grants
- My Obligations screen — member financial obligations (target and voluntary) with per-item progress and M-Pesa pay
- Handovers screen — incoming accept/decline, outgoing checklist and complete
- Notifications inbox with unread badge on the dashboard app bar
- Dashboard "My Departments" hero strip plus quick links to obligations and handovers

### Changed
- Announcements moved off the bottom navigation; reachable from the dashboard

## [1.2.1] - 2026-09-28

### Fixed
- Dynamic church branding now resolves the first active church from the database; public pages show `Kiserian Main SDA` (or the active tenant name).

### Changed
- Removed remaining `KMainCMS` references from visible UI text and docs; the product is now consistently `Msabato Church Management System` / `Msabato CMS`.

## [1.2.0] - 2026-09-28

### Added
- Department detail screen with tabbed navigation.
- Members can request to join a department and see pending status.
- Department heads can approve/reject join requests.
- Subcommittees: create, amend, assign members.
- Department programs and events with RSVP support.
- Communications fan-out: head's message lands in every member's private thread,
  in-app notification, and optional SMS via JOSms.
- Private member↔head threads with labels for grouping feedback.
- Member role elevation inside a department.
- Member contributions to department programs and events.
- Versioned APK builds, public `/downloads` archive, and changelog.

### Changed
- Rebranded all user-facing references from `Msabato CMS` to `Msabato CMS`.
- Church name and branding are now driven by the active church settings.

## [1.1.0] - 2026-09-27

### Added
- Role-specific dashboards (Member, Super Admin, Pastor, First Elder, Treasurer,
  Department Head).
- Biometric login (fingerprint) with secure Android Keystore storage.
- Password autofill via `AutofillGroup`.
- Clickable dashboard stat cards on the Home tab.
- New Members and Approvals screens for privileged roles.
- Upcoming events seeded and loaded into the Events tab.
- Per-church role test accounts (Pastor, First Elder, Treasurer, Department
  Head).

### Fixed
- Dashboard endpoints that returned 500 due to missing columns/tables.
- `department_budgets` query now uses correct `total_amount`/`spent_amount`.
- Rate-limiter `req.ip` key generation made IPv6-safe.

## [1.0.0] - 2026-09-20

### Added
- Initial public release of the Msabato CMS Android app.
- Login, dashboard, payments, events, announcements, and profile tabs.
- Profile photo upload and QR membership card.
- PDF receipt downloads for payments.
- Dynamic base URL so the app can connect to any server without a rebuild.
- 5-tab navigation: Home / Payments / Events / News / Profile.

## [0.9.0] - 2026-09-18

### Added
- Three years of historical data seeding (events, attendance, announcements,
  transactions, payments, notifications, approvals).
- Role account seeder for pastors, elders, treasurers, department heads across
  three churches.
- SMS login credentials export script.
- Flutter dashboard parity plan.

## [0.8.0] - 2026-09-14

### Added
- Public React frontend shell with landing page, announcements, and gallery.
- PWA manifest and install support.
- Photo gallery and featured announcements.
- Service times component.
- Dark mode toggle.

## [0.7.0] - 2026-09-10

### Added
- Mobile API endpoints (`/api/mobile/*`) for dashboard, payments, events,
  announcements, profile.
- `avatar_url`, `rsvp_status`, and `event_time`/`poster_url` columns.
- Mobile parity E2E tests.

## [0.6.0] - 2026-09-05

### Added
- Treasury module with budgets, collections, and payment categories.
- Approval workflows for payments, documents, and membership requests.
- Notifications and audit logs.
- Department permissions and activity feeds.

## [0.5.0] - 2026-08-28

### Added
- Admin dashboard with role-based stat cards.
- System health, financial, ministry, and personal dashboard endpoints.
- Reports and analytics skeleton.
- Multi-tenant church isolation across all queries.

## [0.4.0] - 2026-08-20

### Added
- JOSms relay integration via Socket.io.
- Blessed Texts bulk SMS fallback.
- SMS campaign composer and analytics components.
- SmsHub routing service.

## [0.3.0] - 2026-08-12

### Added
- Members, departments, events, and payments modules.
- Department membership join/approve flow.
- Event attendance and RSVP tracking.
- Payment records and receipt PDF generation.

## [0.2.0] - 2026-08-05

### Added
- Church, user, and role management.
- JWT authentication with access/refresh tokens.
- Initial PostgreSQL schema with migrations.
- Seeder scripts for churches and admin accounts.

## [0.1.0] - 2026-07-28

### Added
- Project bootstrap: Node/Express backend, React/Vite frontend, Flutter mobile.
- Database design and initial `churches`/`users`/`roles` tables.
- Repository pattern and BaseRepository.

---

### Archive

Download links and earlier builds are hosted at `https://msabato.co.ke/downloads`.
Only version 1.2.0 and onward have a downloadable APK archived on the server;
older versions are recorded here for reference.
