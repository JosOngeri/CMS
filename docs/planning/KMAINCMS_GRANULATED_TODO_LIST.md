# KMainCMS Granulated Implementation To-Do List

## 🟢 Phase 1: SQL Schema Unification (Primary Priority)
*Objective: Ensure database integrity by making all IDs consistent (UUID).*

- [ ] **1.1 Update `database/001_auth_schema.sql`**
    - [ ] Change `users.id` from `SERIAL` to `UUID PRIMARY KEY DEFAULT uuid_generate_v4()`.
    - [ ] Change `roles.id` from `SERIAL` to `UUID PRIMARY KEY DEFAULT uuid_generate_v4()`.
    - [ ] Update `user_roles` foreign keys (`user_id`, `role_id`) to `UUID`.
    - [ ] Update `password_reset_tokens` and `refresh_tokens` to use `UUID` for `user_id`.
- [ ] **1.2 Update `database/003_members_schema.sql`**
    - [ ] Change `members.id` to `UUID PRIMARY KEY DEFAULT uuid_generate_v4()`.
    - [ ] Update `members.user_id` to `UUID` type.
    - [ ] Update `member_contacts`, `member_groups`, `member_attendance`, and `member_pledges` to use `UUID` for all ID and reference columns.
- [ ] **1.3 Update `database/payments_schema.sql`**
    - [ ] Change `payment_methods.id`, `payments.id`, `pledges.id`, and `pledge_payments.id` to `UUID`.
    - [ ] Ensure `payments.member_id` and `payments.processed_by` are `UUID`.
- [ ] **1.4 Reconcile Column Names in `payments` Table**
    - [ ] Add `checkout_request_id` (VARCHAR) to `payments` table (required by Kopo Kopo logic).
    - [ ] Add `merchant_request_id` (VARCHAR) to `payments` table.
    - [ ] Ensure `status` column has a check constraint for consistent values (`pending`, `completed`, `failed`).

---

## 🔵 Phase 2: Backend Controller Debugging
*Objective: Fix logic that references non-existent columns or uses incorrect types.*

- [ ] **2.1 Fix `backend/controllers/dashboard.controller.js`**
    - [ ] **Line 78**: Change `JOIN users u ON p.user_id = u.id` to `JOIN users u ON p.member_id = u.id`.
- [ ] **2.2 Fix `backend/controllers/payments.controller.js`**
    - [ ] **Table Name Sync**: Globally replace `income_categories` with `payment_categories`.
    - [ ] **Join Sync**: Update queries joining `members m` to join `users u` (or verify `members` table existence if keeping separate).
    - [ ] **Reference Sync**: Ensure `payment_method_id` logic matches the `UUID` type expected from Phase 1.
- [ ] **2.3 Fix `backend/controllers/members.controller.js`**
    - [ ] Update `createMember` to accept `UUID` for the `user_id` field.
    - [ ] Fix the `getMemberById` join for `member_groups` to ensure UUID compatibility.
- [ ] **2.4 Update `backend/routes/users.routes.js`**
    - [ ] Update `convertUserSlugToId` regex to strictly enforce UUID format if the slug is missing.

---

## 🟡 Phase 3: Route Integration & Security
*Objective: Expose all functionality and eliminate redundant security endpoints.*

- [ ] **3.1 Update `backend/app.js`**
    - [ ] Add `app.use('/api/payment', require('./routes/payment.routes'));` (Kopo Kopo / QR logic).
    - [ ] Add `app.use('/api/members', require('./routes/members.routes'));` (Member Directory logic).
- [ ] **3.2 Consolidate Password Logic**
    - [ ] Choose **one** route (either `PUT /auth/password` or `POST /users/change-password`).
    - [ ] Point both frontend calls to the controller method to prevent logic drift.

---

## 🟠 Phase 4: Frontend-Backend Handshake
*Objective: Ensure the UI is calling the correct, fixed endpoints.*

- [ ] **4.1 Audit `frontend/src/constants/api.js`**
    - [ ] **SMS**: Change `SEND: '/sms/send-blessed'` to `SEND: '/sms/send'`.
    - [ ] **Payments**: Ensure `STATUS` points to `/payments/status/:transaction_id` (note the underscore).
    - [ ] **Members**: Ensure directory calls point to `/api/members` if using the dedicated members route.
- [ ] **4.2 Global Parameter Check**
    - [ ] Search for `transactionId` in frontend and ensure it matches the backend's `transaction_id`.

---

## 🔴 Phase 5: Verification & Cleanup
- [ ] **5.1 Database Reset**
    - [ ] Run a fresh `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`.
    - [ ] Execute the unified `UUID`-based schema files.
- [ ] **5.2 Environment Check**
    - [ ] Verify `K2_API_KEY`, `K2_CLIENT_ID`, and `K2_SECRET` exist in `.env` for the Kopo Kopo service.
- [ ] **5.3 Test Run**
    - [ ] Test User Registration (Check for UUID generation).
    - [ ] Test Dashboard Stats (Check for SQL Join crashes).
    - [ ] Test Payment Initiation (Check for Kopo Kopo column errors).
