# KMainCMS Mobile Changelog

All notable releases of the KMainCMS Android (Flutter) app.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-28

### Added
- Department detail screen with tabbed navigation (Overview, Subcommittees, Programs & Events, Messages, Requests).
- Members can request to join a department and see pending status.
- Department heads can approve/reject join requests.
- Subcommittees: create, amend, assign members.
- Department programs and events with RSVP support.
- Communications fan-out: head's message lands in every member's private thread, in-app notification, and optional SMS via JOSms.
- Private member↔head message threads with labels for grouping feedback.
- Member role elevation inside a department.
- Member contributions to department programs and events.
- Web download page at `/downloads` with full version archive.

## [1.1.0] - 2026-09-27

### Added
- Role-specific dashboards (Member, Super Admin, Pastor, First Elder, Treasurer, Department Head).
- Biometric login (fingerprint) with secure Android Keystore storage.
- Password autofill via `AutofillGroup`.
- Clickable dashboard stat cards on the Home tab.
- New Members and Approvals screens for privileged roles.
- Upcoming events seeded and loaded into the Events tab.

## [1.0.0] - 2026-09-20

### Added
- Initial public release of the KMainCMS Android app.
- Login, dashboard, payments, events, announcements, and profile tabs.
- Profile photo upload and QR membership card.
- PDF receipt downloads for payments.
- Dynamic base URL so the app can connect to any server without a rebuild.

---

### Archive

Download links and earlier builds are hosted at `https://msabato.co.ke/downloads`.
