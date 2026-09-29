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

---

## 7. Progress Tracker — Parity Todo List

Legend: ✅ done · 🚧 in progress · ⬜ not started · — intentional gap

### Blocking gaps (P0)

- [x] Flutter handover screen — incoming accept/decline + outgoing checklist (`handovers_screen.dart`, `/handovers`)
- [x] Flutter notifications inbox + Home-tab badge (`notifications_screen.dart`, bell w/ unread badge)

### Department & finance parity (P1 — from `department-centric-redesign-plan.md`)

- [ ] Flutter subcommittee spend request + budget view (`/subcommittees/:id/spend`, `/budget`)
- [x] Flutter collector auto-reconciliation — background SMS listener, payment notification, accept/decline inbox (`collect_payments_screen.dart`, `sms_recon_service.dart`)
- [x] Flutter "Parser Setup" — AI calibrate dialog in dept Collections tab (`POST /parser/calibrate`)
- [ ] Web: reconciliation unassigned queue + remittance + ledger (dept Collections tab)
- [x] Migration 035 — `member_obligations`, `mpesa_reconciliations`, `mpesa_parser_profiles` (applied on prod)
- [x] Budget→obligation flow — propose → approve → allocate (target|voluntary) → milestones
- [x] Departments center-stage — Flutter nav reordered (Depts center tab) + dept hero strip + Collections/Leadership tabs
- [x] My Obligations page/screen (web `/dashboard/obligations` + Flutter `/obligations`)
- [x] Payment tagging — `obligation_id`/`obligationId` on `POST /payments/initiate` + status recalc

### Minor parity (P2)

- [ ] Flutter gallery viewer (read-only)
- [ ] Flutter dept settings/categories/activity (admin pages — optional)
- ⬜ Read-only treasury summary in Flutter (optional, deferred)

### Done this sprint (web side)

- [x] Mobile-ready web app — bottom nav, table→card lists, bottom-sheet modals
- [x] PWA wired — sw.js registered, real icons, installable
- [x] Web dept leadership UI — `DepartmentHeadAllocation` (positions, temp grants, revoke)
- [x] Web handover page — `/dashboard/departments/handovers`
- [x] Backend: leadership/handovers/expiry-sweep/subcommittee-spend endpoints live
- [x] Kiserian Main seeded — 550 users, 43 depts, leadership assigned
- [x] AI provider live — `gemini-3.8-flash` verified on VPS
- [x] M-Pesa SMS parsing spec — `docs/specs/mpesa-sms-samples.md`

### Infrastructure

- [ ] Ollama self-hosted AI on VPS (`qwen2.5:3b`) — optional fallback
- [ ] `AI_PROVIDER` env switch (gemini | ollama)
- [x] PII redaction in `/parser/calibrate` — format-preserving dummies (`0700000000`, `JANE DOE`) so generated regexes still match real messages

---

## 8. Master Feature List — All Requests To Date

### Shipped ✅

| # | Feature | Where |
|---|---|---|
| 1 | Newsletter/footer contrast fix (both themes) | Web public site |
| 2 | `USER_LOGINS.md` — all 2,326 accounts, role quick-reference per church | Repo root |
| 3 | Dark-mode audit — `--color-primary-strong`, full `primary-50…900` scale, 120 dead classes restored | Web |
| 4 | Church branding — logged-in/selected church name resolves (optionalAuth fix) | Web |
| 5 | Mobile-ready webapp — bottom nav, table→cards, bottom sheets, header search collapse | Web |
| 6 | PWA — sw.js registered, real 192/512 + maskable icons, installable | Web |
| 7 | Department leadership system — hierarchy, handovers, temp grants, expiry sweep, roles | Web + API |
| 8 | Subcommittee leads + spend-approval gate (parent head approves before budget posts) | API + Web |
| 9 | Canonical SDA dept catalog (44 depts, nested auxiliaries) seeded for all 4 churches | DB |
| 10 | Kiserian Main real workers — 550 users, 43 depts, 111 leadership rows | DB |
| 11 | Departments header links — Leadership + Handovers discoverable | Web |
| 12 | AI live on VPS — `gemini-3.8-flash` via `aiContentService` | Backend |
| 13 | Departments center-stage — Flutter nav reordered (Home·Events·Depts·Payments·Profile), dept hero strip, Collections/Leadership tabs | Flutter |
| 14 | Budget → member obligations — propose → approve → allocate as `target` or `voluntary` | API + Web + Flutter |
| 15 | Milestone/collection tracker — target vs collected, 25/50/75/100% milestones, per-member progress | API + Web + Flutter |
| 16 | M-Pesa/bank SMS reconciliation — `mpesa_reconciliations`, tx-code dedupe, obligation matching | API (device scan pending) |
| 17 | Collector role — `collector` leadership position, scoped reconcile rights | API |
| 18 | AI parser calibration — treasurer pastes sample → ruleset per scope, PII-redacted | API + Web + Flutter UI |
| 19 | Flutter handover screen + notifications inbox (P0 gaps closed) | Flutter |

### In plan — not yet built ⬜

| # | Feature | Doc ref |
|---|---|---|
| 20 | Ollama self-hosted AI fallback (`qwen2.5:3b`) | §7 tracker |
| 22 | Remittance ledger — mark collected funds as remitted to church account | §5b |

### Deferred / intentional

| # | Feature | Reason |
|---|---|---|
| 21 | Treasury suite on mobile | Desktop-class workflows — maybe read-only summary later |
| 22 | Admin/SMS/Telegram on mobile | Web-only by design |
| 23 | Flutter gallery viewer | P2 polish |
