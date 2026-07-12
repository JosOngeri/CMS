# KMainCMS Routing and Database Remediation Plan

**Author:** Software Testing Expert  
**Date:** June 21, 2026  
**Version:** 1.0  
**Target:** production-readiness, data integrity, and route consistency.

---

## 1. Phase 1: Database Schema Standardization (CRITICAL)

### 1.1 Identifier Type Unification
Currently, `schema.sql` uses `UUID` while `001_auth_schema.sql` uses `SERIAL`. This breaks foreign keys.
*   **Action**: Update all primary keys to `UUID` to match the base `schema.sql`.
*   **Target Files**: 
    *   `database/001_auth_schema.sql`
    *   `database/003_members_schema.sql`
    *   `database/payments_schema.sql`
*   **Code Update Example (`001_auth_schema.sql`)**:
    ```sql
    -- Change from:
    -- id SERIAL PRIMARY KEY
    -- To:
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
    ```

### 1.2 Table & Column Synchronization
*   **Payments Schema**: Reconcile the conflict between `payment.controller.js` and `payments.controller.js`.
    *   *Standard Schema*: Merge columns to support both M-Pesa and Kopo Kopo.
    *   *Columns to Add/Fix*: `category` (Income Category ID), `method` (Payment Method ID), `status`, `reference_number`, `transaction_id`, `checkout_request_id`.
*   **Members vs Users**: 
    *   Ensure `members.user_id` is a `UUID` and `members.id` is also a `UUID`.
    *   Update `members.controller.js` to handle `UUID` inputs.

---

## 2. Phase 2: Backend Controller & Repository Fixes

### 2.1 Dashboard Controller (`dashboard.controller.js`)
*   **Fix**: Correct the join column in `getActivity`.
*   **Code Update**:
    ```javascript
    // Line 78 - Change:
    // JOIN users u ON p.user_id = u.id
    // To:
    JOIN users u ON p.member_id = u.id
    ```

### 2.2 Payments Controller (`payments.controller.js`)
*   **Fix**: Update joins and table names.
*   **Code Update**:
    ```javascript
    // Change joins from 'members m' to 'users u' if members table isn't used
    // Change 'income_categories' to 'payment_categories' to match schema.sql
    ```

### 2.3 Identity Conversion (`users.routes.js`)
*   **Fix**: Ensure `convertUserSlugToId` middleware handles UUID format strictly to prevent type errors in PostgreSQL.

---

## 3. Phase 3: Routing Integration

### 3.1 Register Missing Routes
Add the currently "dead" routes to `app.js` to ensure the features (Kopo Kopo, QR Codes, Member management) are available.
*   **Code Update (`backend/app.js`)**:
    ```javascript
    // Add missing routes
    app.use('/api/payment', generalLimiter, require('./routes/payment.routes'));
    app.use('/api/members', generalLimiter, require('./routes/members.routes'));
    ```

### 3.2 Consolidate Overlapping Endpoints
*   **Password Change**: Redirect `PUT /api/auth/password` to use the same logic as `POST /api/users/change-password` to maintain a single security standard.

---

## 4. Phase 4: Frontend Alignment

### 4.1 Update API Constants (`frontend/src/constants/api.js`)
*   **Action**: Ensure frontend calls match the newly registered backend routes.
*   **Verification**:
    *   Verify `SMS.SEND` points to `/sms/send` (matching `sms.routes.js`) instead of `/sms/send-blessed`.
    *   Ensure `PAYMENTS.STATUS` uses the correct parameter naming (`transaction_id`).

---

## 5. Implementation Roadmap

| Task | Effort | Risk |
|------|--------|------|
| **1. UUID Type Unification** | High | High (Requires full DB reset) |
| **2. Controller Column Fixes** | Low | Low |
| **3. Route Registration in app.js** | Low | Medium (Check for shadowing) |
| **4. Controller Variable Cleanup** | Medium | Low |

---
**Status Recommendation:** 
Do **not** attempt to run migrations individually. Use a single consolidated `complete_schema.sql` file derived from this remediation plan to avoid type mismatches.
