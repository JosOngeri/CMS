# KMainCMS Routing and Database Audit Report

**Audit Conducted by:** Software Testing Expert  
**Date:** June 21, 2026  
**Scope:** `backend`, `database`, and `frontend` cross-reference.

---

## 1. Executive Summary
A comprehensive audit of the `KMainCMS` codebase has revealed significant inconsistencies between the database schema definitions and the API implementation. The system is in a "split-brain" state where different modules assume different data types (UUID vs. INTEGER) for the same identifiers. Several controllers contain queries with incorrect column names that will cause runtime crashes.

---

## 2. Routing Inconsistencies

### 2.1 Duplicate/Overlapping Endpoints
*   **Password Management**: 
    *   `POST /api/users/change-password` (defined in `users.routes.js`)
    *   `PUT /api/auth/password` (defined in `auth.routes.js`)
    *   *Issue*: Redundant logic increases maintenance overhead and potential for security gaps.
*   **User/Member Ambiguity**:
    *   The frontend uses `/api/users` but the codebase contains a detached `members.routes.js` that is not registered in `app.js`.

### 2.2 Unregistered/Dead Routes
*   `payment.routes.js` and `members.routes.js` exist in the `backend/routes` directory but are **not** imported in `app.js`. Any frontend calls to these specific files will result in 404 errors.

---

## 3. Database Call Inconsistencies (CRITICAL)

### 3.1 Identifier Data Type Mismatch
This is the most critical issue found. 
*   **Base Schema (`schema.sql`)**: Defines `users.id` as **`UUID`**.
*   **Auth Module (`001_auth_schema.sql`)**: Defines `users.id` as **`SERIAL (INTEGER)`**.
*   **Impact**: Depending on which script is run (`setup-database.js` vs `migrate.js`), foreign key relationships will break. For example, `members.user_id` (INTEGER) cannot reference `users.id` (UUID).

### 3.2 Incorrect Column References in Controllers
*   **Dashboard Activity Crash**: In `DashboardController.js` (line 78), the query tries to join `payments` on `p.user_id`. 
    *   *Schema*: The table defines the column as `member_id`. 
    *   *Result*: `p.user_id` does not exist; the dashboard activity feed will crash.
*   **Payments Member Join**: In `PaymentsController.js` (line 22), it joins with `members m`. 
    *   *Issue*: In the base `schema.sql`, there is no `members` table (members are just `users`). If `003_members_schema.sql` was not run, this query fails.

### 3.3 Table Name Mismatches
*   **Income Categories**: `PaymentsController.js` (line 257) queries `income_categories`.
    *   *Issue*: The base schema (`schema.sql`) defines this as `payment_categories`. `income_categories` is only defined in the optional `treasury_schema.sql`.
*   **Payment Methods**: `PaymentsController.js` expects a table `payment_methods`.
    *   *Issue*: This table is missing from the core `schema.sql` (where payment method is just a VARCHAR column).

---

## 4. Recommendations

1.  **Standardize Identifiers**: Choose either `UUID` or `SERIAL` for all primary keys across all `.sql` files. `UUID` is generally better for distributed systems but requires consistent types in all foreign key references.
2.  **Consolidate Schemas**: Merge `schema.sql` with the module-specific `00x_*.sql` files to ensure a single source of truth for the database structure.
3.  **Refactor Controllers to use Repositories**: Currently, controllers like `users.controller.js` are bypassed by direct DB calls in `users.routes.js`. Move all `pool.query` logic into the `repositories/` layer.
4.  **Fix Column Names**:
    *   Change `p.user_id` to `p.member_id` in `DashboardController.js`.
    *   Update `PaymentsController.js` to join with `users` instead of `members` if `members` table isn't intended to be distinct.
5.  **Remove Dead Route Files**: Delete or properly register `payment.routes.js` and `members.routes.js` to avoid "phantom" code.

---
**Status:** ❌ **Fail (Requires Debugging)**  
*Note: Build scripts `setup-database.js` and `migrate.js` are currently incompatible with each other.*
