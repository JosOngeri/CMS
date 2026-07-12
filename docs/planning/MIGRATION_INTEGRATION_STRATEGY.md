# KMainCMS Migration & Integration Strategy
**Version:** 1.1  
**Target:** Unified Church Management Platform  
**Lead System:** KMainCMS (Modular/UUID)  
**Source System:** Kiserian Main SDA Church Website (Legacy/Public)

---

## 1. Objective
To consolidate the proven functionalities of the Legacy Website into the modern, modular architecture of KMainCMS. This migration prioritizes the **Gallery**, **Blessed Texts Messaging**, **Notifications**, and **M-Pesa Sandbox** which were fully operational in the legacy system.

---

## 2. Core Feature Porting (Proven Logic)

### 2.1 Gallery Module (MTProto Sync)
*   **Source**: `backend/controllers/gallery.controller.js` and `backend/services/telegramClient.service.js`.
*   **Action**: Import "as is" but convert the `gallery_photos` schema to UUID.
*   **Key Logic**: Retain the MTProto client initialization for history syncing and the Bot API fallback for photo uploads.

### 2.2 Messaging API (Blessed Texts)
*   **Source**: `backend/controllers/sms.controller.js`.
*   **Action**: Use the `sendBlessedTextsSMS` method logic which uses `https://sms.blessedtexts.com/api/sms/v1/sendsms`.
*   **Integration**: Replace the simulation logic in CMS with this real provider logic.

### 2.3 M-Pesa Integration (Sandbox/Production)
*   **Source**: `backend/utils/mpesa.js`.
*   **Action**: Port the `MpesaService` class and its STK Push initiation/callback handlers.
*   **Setup**: Use the `settings` table based configuration to switch between Sandbox and Production.

### 2.4 Notifications System
*   **Source**: `backend/routes/notifications.routes.js`.
*   **Action**: Port the notification dispatching logic for real-time alerts.

---

## 3. Granulated Implementation To-Do List

### Phase 1: Database Synchronization
- [ ] **Task 1.1: Merge Telegram & Gallery Schema**
    - Copy definitions from `gallery_schema.sql` and `telegram_schema.sql`.
    - **Integration Check**: Verify all foreign keys to `users` use `UUID` type.
- [ ] **Task 1.2: Initialize Master Schema**
    - Run `scripts/reset-db.js`.
    - **Integration Check**: Run `SELECT * FROM roles;` to ensure default roles exist.
- [ ] **Task 1.3: Migration Data Port**
    - Execute SQL to move existing members/announcements from legacy to CMS.
    - **Integration Check**: Verify `id` column format in `announcements` is UUID.

### Phase 2: Backend Logic Porting
- [ ] **Task 2.1: Port Telegram MTProto Service**
    - Copy `telegramClient.service.js` to CMS `backend/services/`.
    - **Integration Check**: Run `node -e "require('./services/telegramClient.service').initClient()"` to test connection.
- [ ] **Task 2.2: Implement Blessed Texts SMS**
    - Update `sms.controller.js` with the Legacy `sendBlessedTextsSMS` method.
    - **Integration Check**: Trigger a balance check via `/api/sms/balance` to verify API key connection.
- [ ] **Task 2.3: Integrate M-Pesa Service**
    - Port `MpesaService` and register `/api/payment/mpesa/callback` route.
    - **Integration Check**: Test STK push using a sandbox number. Verify row creation in `payments` with `UUID`.

### Phase 3: Frontend Merging & UI Polish
- [ ] **Task 3.1: Install Legacy Dependencies**
    - `npm install react-quill big-integer telegram` in frontend.
- [ ] **Task 3.2: Port Gallery Component**
    - Move Gallery UI from Legacy site to CMS `frontend/src/modules/gallery/`.
    - **Integration Check**: Ensure the image proxy `/api/gallery/image/:fileId` correctly handles UUID lookups.
- [ ] **Task 3.3: Rich Text Announcement Form**
    - Replace standard text inputs with `ReactQuill`.
    - **Integration Check**: Verify HTML content is saved correctly in the DB and rendered with Tailwind `prose` class.

---

## 4. Integration Conflict Resolution Matrix (The IIR Layer)

| Integration Point | Potential Issue | Resolution Check |
| :--- | :--- | :--- |
| **ID References** | Legacy frontend sends INT, Backend expects UUID. | **Guard**: Middleware must validate `id` format before DB query. |
| **SMS Provider** | Conflict between CMS simulation and Blessed logic. | **Guard**: Environment variable `SMS_PROVIDER=blessed` must toggle logic. |
| **Styling** | Legacy Gallery CSS vs CMS Tailwind. | **Guard**: Use `@tailwindcss/typography` and prefix legacy CSS with `.legacy-scope`. |
| **M-Pesa Callbacks** | CheckoutRequestID matching logic failure. | **Guard**: Ensure `payments` table has `checkout_request_id` indexed for fast lookup. |

---

## 5. Visual Audit & Handshake Tests
1.  **Bot Sync Handshake**: Trigger Telegram Sync. Check if `gallery_photos` records appear with UUIDs.
2.  **Payment Handshake**: Initiate STK Push. Check `audit_log` for the `PAYMENT_INITIATED` event.
3.  **Visual Handshake**: Run `frontend/scripts/run-e2e.js`. Verify Gallery grid alignment in screenshots.

**Status:** 🛡️ **Comprehensive Plan Finalized. Ready for surgical execution.**
