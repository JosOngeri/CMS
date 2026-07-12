# KMainCMS: Final 10% Implementation Gap Analysis

This document identifies the specific, non-structural tasks remaining to reach 100% completion of the **Neutrino-Level** upgrade.

## 1. Controller & Repository Refactoring (The Heavy Duty Part)
*Rationale: To ensure Tenant RLS is enforced everywhere and SQL strings are centralized.*

- [ ] **Announcements**: Refactor `announcements.controller.js` to use `AnnouncementRepository`.
- [ ] **Members**: Refactor `members.controller.js` to use `MemberRepository`.
- [ ] **Payments**: Refactor `payments.controller.js` and `payment.controller.js` to use `TreasuryRepository`.
- [ ] **SMS**: Refactor `sms.controller.js` to use `SmsHub` and `SmsRepository`.
- [ ] **Events**: Refactor `events.controller.js` to use `EventRepository`.
- [ ] **Gallery**: Refactor `gallery.controller.js` to use `GalleryRepository`.

## 2. Advanced Service Integration
- [ ] **SMS Hub**: Wire `SmsHub.sendSMS()` into the `POST /api/sms/send` endpoint.
- [ ] **Reconciliation**: Wire `MpesaService.initiateSTK()` and callback logic into the `Payments` module.
- [ ] **Redis**: Connect a real `ioredis` client to `redisCache.js` and apply to `GET /api/announcements` and `GET /api/gallery`.
- [ ] **AI Assistant**: Add rate-limiting and usage logging to `AIController`.

## 3. Frontend Semantic Scrubbing
*Rationale: To ensure the Dark Mode and Palette Swapping works perfectly across all screens.*

- [ ] Scrub `bg-white`, `text-gray-*`, and hex codes from:
    - [ ] `frontend/src/pages/members/*`
    - [ ] `frontend/src/pages/treasury/*`
    - [ ] `frontend/src/pages/sms/*`
    - [ ] `frontend/src/pages/announcements/*`
- [ ] Update all `shadow-sm` and `border-gray-*` classes to use `var(--color-border)`.

## 4. Multi-Tenant Data Hardening
- [ ] **Slug Migration**: Execute SQL to add `church_slug` (redundant key) to all core tables for zero-join query support.
- [ ] **Default Seed**: Create `database/seed_default_church.sql` with a standard UUID for Kiserian Main SDA.
- [ ] **Subdomain Logic**: Enhance `tenantResolver.js` to support `*.kmaincms.org` extraction.

## 5. Security Polish
- [ ] **MFA**: Implement the actual TOTP verification logic in `AuthController` using the `speakeasy` library.
- [ ] **PII Masking**: Add a utility to `ResponseHandler.js` to auto-mask phone numbers and emails based on user permission level.

## 6. Infrastructure & QA
- [ ] **Screenshots**: Capture E2E screenshots of the new "Neutrino" UI in both Light and Dark modes.
- [ ] **Load Testing**: Finalize the `artillery` or `k6` script for the 100k concurrency benchmark.

---
**Status**: Foundational Logic is 100% complete. Integration and Refactoring are at 70%.
**Next Priority**: Refactoring `SMSController` and `PaymentsController`.
