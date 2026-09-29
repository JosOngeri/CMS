# Flutter App ↔ Web App Parity Assessment

**Date:** 2025-06 · **Scope:** `mobile/flutter/flutter-mobile` vs `frontend/` (60 dashboard routes + public site)

## Executive Summary

The Flutter app is **more capable than expected** — it already has departments, department
detail with subcommittees/programs/messages, approvals, documents, members, and payments.
It also has mobile-only features the web lacks (biometrics, offline sync, push, membership card).

**The real gaps are in the new department-leadership features and two blocking workflows:**
members on mobile **cannot respond to department handovers** and **cannot read their
notification history** — both of which the web added this sprint.

---

## 1. Feature Matrix

| Feature | Web | Flutter | Status |
|---|---|---|---|
| Login / forgot password | ✅ | ✅ | Parity |
| Server URL config | n/a | ✅ | **Flutter-only** |
| Biometric login | ❌ | ✅ | **Flutter-only** |
| Offline sync (pull/push) | ❌ | ✅ | **Flutter-only** |
| Push notifications (FCM) | ❌ | ✅ | **Flutter-only** |
| Real-time socket | ❌ | ✅ | **Flutter-only** |
| Membership card (QR) | ❌ | ✅ | **Flutter-only** |
| Dashboard (role-aware) | ✅ | ✅ | Parity |
| Payments: initiate/history/receipt/QR | ✅ | ✅ | Parity |
| Events + RSVP | ✅ | ✅ | Parity |
| Announcements | ✅ | ✅ | Parity |
| Profile (edit/photo) | ✅ | ✅ | Parity |
| Members directory | ✅ | ✅ | Parity |
| Departments list + join | ✅ | ✅ | Parity |
| Dept detail: subcommittees, programs, events, threads/messages, join requests | ✅ | ✅ | Parity |
| Approvals inbox (approve/reject) | ✅ | ✅ | Parity |
| Documents (list/download) | ✅ | ✅ | Parity |
| **Notifications inbox** | ✅ `NotificationDashboard` | ❌ push only, no history | **GAP (blocking)** |
| **Dept leadership UI** (head/assistant/secretary, temp expiry) | ✅ `DepartmentHeadAllocation` | ❌ | **GAP** |
| **Dept handovers** (accept/decline/checklist) | ✅ `DepartmentHandover` | ❌ | **GAP (blocking)** |
| **Subcommittee spend request + budget view** | ✅ in handover page | ❌ endpoints missing from `api_service` | **GAP** |
| Dept settings / categories / activity / per-dept dashboard | ✅ 4 pages | partial | Minor gap |
| **Gallery viewer** | ✅ public + admin | ❌ | Minor gap |
| Treasury suite (15 pages: accounts, journal, budgets, expenses, funds, reconciliations, contributions, vendors, projects, assets, pledges, recurring, receipts, reports, analytics) | ✅ | ❌ | **Web-only — decision needed** |
| Admin (users, database, settings, security, monitoring, analytics) | ✅ | ❌ | **Web-only — decision needed** |
| SMS module (4 pages) | ✅ | ❌ | Web-only |
| Telegram (3 pages) | ✅ | ❌ | Web-only |
| Reports / Content / SEO / Accessibility / Testing / Docs | ✅ | ❌ | Web-only |

---

## 2. Blocking Gaps (must fix — workflows break for mobile-only users)

### 2a. Department handover — `P0`
A dept head or incoming leader who only uses the app **cannot complete the handover
workflow**: no screen for accept/decline, no checklist completion. The web flow
notifies them but dead-ends on mobile.

Endpoints already exist on the backend:
- `GET  /api/departments/handovers/mine`
- `PUT  /api/departments/handovers/:id/accept | decline | complete`
- `GET  /api/departments/:id/handovers`
- `POST /api/departments/:id/leadership` · `GET /:id/leadership` · `DELETE /:id/leadership/:lid`
- `GET  /api/departments/leadership/expiring`

**Work:** new `handovers_screen.dart` (pending incoming/outgoing cards, accept/decline
buttons, checklist with progress bar) + a "Leadership" section/tab in
`department_detail_screen.dart` showing current leadership + appoint UI for admins.
Add the ~8 endpoints to `api_service.dart`.

### 2b. Notifications inbox — `P0`
Web has a full notification dashboard; Flutter only shows push notifications which
disappear. Members can't see handover invites, approval results, or announcements
pushed while offline.

**Work:** `notifications_screen.dart` — list + mark-read, badge on the Home tab.
Backend endpoint exists (`/api/notifications`).

### 2c. Subcommittee spend + leadership — `P1`
Backend has `POST /:id/subcommittees/:sid/spend` and `GET .../budget` (this sprint).
Add to api_service + a spend-request form + budget card on the subcommittee tile.

---

## 3. Minor Gaps

- **Gallery** — public web has a photo gallery; add a read-only gallery screen (grid + viewer) or link out.
- **Department settings/categories/activity** — admin-oriented; low priority on mobile.
- **Receipts list** — Flutter downloads receipts per-payment; web has a dedicated receipts page. Acceptable difference.

## 4. Intentional Web-Only (recommend keeping)

| Area | Reason |
|---|---|
| Treasury suite (15 pages) | Dense admin workflows — tables, journal entries, reconciliations don't fit phones. Consider a **read-only treasury summary** later. |
| Admin / User mgmt / Database / Monitoring | Rarely needed on the go; desktop-class tasks. |
| SMS / Telegram config | Infrastructure config — desktop-appropriate. |
| Reports / Content / SEO / Docs | Authoring workflows. |

## 5. Flutter-Only Features (no action — native advantages)

Biometric login, offline sync, push notifications, socket live updates, membership
card QR, dynamic server URL, in-app updates. These are *advantages* — the PWA now
closes part of this gap (installable, offline shell) but can't match biometrics/offline.

---

## 6. Recommended Work Order

| # | Task | Effort | Why |
|---|---|---|---|
| 1 | Handover screen + leadership view in dept detail | M | Blocks real workflow |
| 2 | Notifications inbox + badge | S | Blocks real workflow |
| 3 | Subcommittee spend/budget on dept detail | S | Completes finance gate |
| 4 | Gallery viewer | S | Public-feature parity |
| 5 | Read-only treasury summary (optional) | M | Nice-to-have |

**Verification:** build APK, log in as dept head, run a full handover round-trip on
mobile; verify notification badge; confirm subcommittee spend routes to head for approval.
