# KMainCMS Mobile App Feature Parity & Remediation Plan

**Author:** AI Quality & Mobile Engineering Specialist  
**Date:** September 22, 2026  
**Account Context:** `member1@newlife.com` (New Life SDA Church, Membership No: `NE-0001`, Role: Member)  
**Target Codebase:** `mobile/flutter/flutter-mobile` & `frontend/src`  

---

## 1. Executive Summary

This remediation plan outlines the engineering steps to achieve **100% feature parity** between the **Flutter Mobile Application** and the **React Web Platform** for church member users (`member1@newlife.com`).

It addresses a **critical data privacy defect** on the mobile dashboard where regular members are currently exposed to church-wide financial totals (`monthly_income` and `monthly_expense`), and establishes missing core modules including **Events RSVP**, **My Departments**, **PDF Receipts Download**, **QR Membership Card**, and **Profile Photo Upload**.

---

## 2. Priority Remediation Phases

### Phase 1: Mobile Dashboard Privacy Fix (Critical / Immediate)
- **Problem:** `dashboard_screen.dart` calls generic `getDashboardData()` which populates `monthly_income` and `monthly_expense` on the mobile home screen.
- **Fix:** Update `dashboard_screen.dart` to check `ref.watch(userProvider)['role']`. If role is `Member`, fetch `/api/dashboard/personal-stats` and `/api/dashboard/personal-activity`.
- **UI Elements:**
  - Personal Contributions (KES)
  - My Assigned Departments
  - Upcoming Church Events
  - Unread Announcements
  - Personal Spiritual Growth Indicator

### Phase 2: Profile Picture Upload & QR Membership Card
- **Problem:** Camera picker in `profile_screen.dart` is commented out (`// Temporarily disabled due to package compatibility`).
- **Fix:** Restore `image_picker` package support and implement `uploadProfilePhoto()` in `api_service.dart`.
- **New Feature:** Render a **Digital Membership Card Widget** on profile screen:
  - Member Name
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

## 3. Automated Playwright E2E Test (`frontend/e2e/mobile-parity-member1.spec.js`)

A Playwright test script has been added at `frontend/e2e/mobile-parity-member1.spec.js` that tests:
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
npx playwright test e2e/mobile-parity-member1.spec.js --project=chromium

# 3. Analyze and verify Flutter codebase
cd mobile/flutter/flutter-mobile
flutter analyze
flutter test
```
