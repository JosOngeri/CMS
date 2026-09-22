# KMainCMS Mobile App Feature Parity & Privacy Remediation Plan

**Author:** AI Quality & Mobile Engineering Specialist  
**Date:** September 22, 2026  
**Account Context:** `member1@newlife.com` (New Life SDA Church, Membership No: `NE-0001`, Role: Member)  
**Target Codebase:** `mobile/flutter/flutter-mobile` & `backend/` & `frontend/src`  

---

## 1. Executive Summary

This remediation plan outlines the engineering steps to achieve **100% feature parity** between the **Flutter Mobile Application** and the **React Web Platform** for church member users (`member1@newlife.com`).

It addresses a **critical data privacy defect** on the backend repository (`MobileRepository.js`) where regular members calling `/mobile/dashboard` are currently exposed to church-wide financial totals (`monthly_income` and `monthly_expense`), and establishes missing core mobile modules including **Events RSVP**, **My Departments**, **PDF Receipts Download**, **QR Membership Card**, and **Profile Photo Upload**.

---

## 2. Priority Remediation Phases

### Phase 1: Backend Privacy Fix & Mobile Dashboard Role Awareness
- **Backend (`MobileRepository.js` & `mobile.controller.js`):**
  - Update `getQuickStats(churchId, userId, role)` in `MobileRepository.js`.
  - For `Member` role, execute query for personal metrics:
    - Personal Contributions Total (KES)
    - Assigned Departments Count
    - Registered Upcoming Events Count
  - For Admin/Treasurer/Pastor roles, return church-wide `monthly_income` and `monthly_expense`.
- **Flutter UI (`dashboard_screen.dart`):**
  - Read user role from `authProvider` (`ref.watch(userProvider)`).
  - Render personal metrics for `Member` role:
    - Personal Contributions (KES)
    - My Assigned Departments
    - Upcoming Church Events
    - Unread Announcements

### Phase 2: Profile Picture Upload & QR Membership Card
- **Photo Upload (`profile_screen.dart`):** Re-enable camera button with `image_picker` package support and implement `uploadProfilePhoto()` in `api_service.dart`.
- **Digital Card Widget:** Render a **Digital Membership Card Widget** on profile screen:
  - Member Name (`member1`)
  - Membership No (`NE-0001`)
  - Church Name (`New Life SDA`)
  - Verification QR Code.

### Phase 3: Missing Core Mobile Screens (Events & Departments)
- **New Screen (`events_screen.dart`):** Church calendar, event list, event detail, and **RSVP / Registration** button.
- **New Screen (`departments_screen.dart`):** List member's assigned departments and department updates.
- **Router Update (`router.dart` & `main_shell.dart`):** Update bottom navigation bar with 5 primary tabs:
  1. 🏠 **Dashboard**
  2. 💳 **Payments**
  3. 📅 **Events**
  4. 📢 **Announcements**
  5. 👤 **Profile**

### Phase 4: Receipts PDF & Document Library
- **Payments (`payments_screen.dart`):** Add "Download PDF Receipt" action button to items in payment history modal.
- **Document Library (`documents_screen.dart`):** Add viewer for Sabbath School quarterlies, weekly bulletins, and church policies.

---

## 3. Automated Playwright E2E Test (`frontend/e2e/mobile-parity-member1-2026-09-22.spec.js`)

A Playwright test script has been created at `frontend/e2e/mobile-parity-member1-2026-09-22.spec.js` that tests:
1. Login with `member1@newlife.com` / `right123`.
2. Dashboard privacy check (verifying `Monthly Income` and `Monthly Expense` are hidden from regular members).
3. Payments & M-Pesa STK Push option availability.
4. Announcements viewing.
5. My Departments and Events RSVP options.
6. USB debugging Chrome remote connection socket test.

---

## 4. Execution & Verification Commands

```bash
# 1. Forward ADB port for connected Android phone
adb forward tcp:9222 localabstract:chrome_devtools_remote

# 2. Run Playwright E2E mobile parity test
cd frontend
npx playwright test e2e/mobile-parity-member1-2026-09-22.spec.js --project=chromium

# 3. Analyze and verify Flutter codebase
cd mobile/flutter/flutter-mobile
flutter pub get   # required: qr_flutter dependency added
flutter analyze
flutter test
```

---

## 5. Implementation Status (Verified 2026-09-22)

### Completed
- **Phase 1**: `MobileRepository.getQuickStats(churchId, userId, roles)` is now role-aware. Members receive `{ scope: 'member', personal_contributions, my_departments, upcoming_events, unread_announcements }`; privileged roles keep church-wide stats. `dashboard_screen.dart` renders member-specific cards based on `user['roles']`.
- **Phase 2**: `POST /api/auth/profile/photo` (multer, `uploads/avatars/`, 5MB limit) added; `users.avatar_url` column added via `migrations/026_mobile_parity.sql` (**applied to local DB — verified**). `GET /api/mobile/membership-card` returns member name, membership number, church name, and verification code; `profile_screen.dart` renders the QR card via `qr_flutter` and re-enables the camera button via `media_service.dart`.
- **Phase 3**: New `events_screen.dart` (list + RSVP toggle) and `departments_screen.dart` (assigned departments via `GET /api/mobile/my-departments`). `POST /api/mobile/events/:id/rsvp` and the existing `POST /api/events/:id/rsvp` now persist to `event_attendance.rsvp_status`. Bottom nav now has 5 tabs: Home, Payments, Events, News, Profile.
- **Phase 4**: `GET /api/payments/:id/receipt?format=pdf` returns a generated PDF (jspdf). Receipt download button added to payment history modal. New `documents_screen.dart` lists/downloads files from `GET /api/documents`.

### Bugs fixed along the way
- `getPaymentHistory()` called non-existent `/mobile/payments` → now calls `/payments/my-payments`.
- `PUT /auth/profile` silently ignored the app's snake_case fields (`first_name`/`last_name`) → now accepts both casings.
- `payments.member_id` receipt join fixed (`members.id` → also joins `users.id`, member name now resolves).
- Login response now includes `phone` and `avatarUrl`.

### Caveats / Manual steps required
- `flutter pub get` must be run before building (new `qr_flutter` dep). Flutter SDK was not on PATH in this environment, so `flutter analyze`/`flutter test` were **not run** — static review only.
- Run `node backend/scripts/run-migration-026.js` on any other environment (e.g., production VPS) before deploying.
