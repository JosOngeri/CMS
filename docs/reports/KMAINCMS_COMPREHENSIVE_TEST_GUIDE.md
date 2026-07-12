# KMainCMS Comprehensive Test Guide
**Version:** 1.0  
**Last Updated:** June 21, 2026  
**Target:** QA Engineers & Developers

## 1. Introduction
This guide provides instructions for validating the KMainCMS system. Following the **June 2026 Remediation Plan**, the system has been standardized to use **UUIDs** across all modules, and an automated testing suite has been established to ensure stability across the frontend and backend.

---

## 2. Prerequisites & Environment Setup
Before running any tests, ensure your local environment matches the production-ready architecture.

### 2.1 Backend & Database
1.  **Database Reset**: Ensure the database is using the unified UUID schema.
    ```bash
    cd backend
    node scripts/reset-db.js
    ```
2.  **Seeding**: Populate the system with test users and data.
    ```bash
    cd backend
    node scripts/seed-comprehensive.js
    ```
3.  **Start API**: Ensure the backend is running on `http://localhost:5005`.
    ```bash
    cd backend
    npm run dev
    ```

### 2.2 Frontend
1.  **Start Web Server**: Ensure the frontend is running on `http://localhost:5180`.
    ```bash
    cd frontend
    npm run dev
    ```

---

## 3. Automated E2E Testing (Playwright)
Playwright is the primary tool for functional and visual verification.

### 3.1 Running the Full Suite
To execute all tests and generate a visual report automatically:
```bash
cd frontend
node scripts/run-e2e.js
```

### 3.2 Manual Test Execution
To run tests in headed mode (to watch the browser):
```bash
cd frontend
npx playwright test e2e/comprehensive-test.spec.js --headed
```

### 3.3 Test Coverage
The `comprehensive-test.spec.js` suite covers:
*   **Auth Flow**: Login with `admin@kmaincms.org` / `password123`.
*   **RBAC (Security)**: Logs in as a regular member to verify that Admin menus (Settings, SMS, Approvals) are hidden.
*   **Navigation**: Ensures all 10+ modules load without SQL join errors.
*   **Visual Audit**: Captures 12 sequential screenshots of the entire system.

---

## 4. Visual Verification & Reporting
The testing suite is designed to be "visual-first" to help the Communications Department verify the UI.

### 4.1 Screenshots
All screenshots are saved to: `frontend/screenshots/`
*   `01-dashboard.png`: Validates statistics and activity feed.
*   `04-treasury.png`: Validates payment category and method consistency.
*   `11-member-dashboard.png`: Validates restricted view for non-admins.

### 4.2 Automated Report
After running `scripts/run-e2e.js`, a document is generated at:  
`docs/reports/E2E_TEST_REPORT.md`  
This report provides a timestamped log of the test results and embeds the screenshots for easy review.

---

## 5. Manual Testing Checklist (High Risk Areas)
While automated tests cover the basics, perform manual checks on these areas fixed during remediation:

| Feature | What to Check | Expected Result |
| :--- | :--- | :--- |
| **Dashboard Activity** | Perform a payment, then check Dashboard. | Activity should appear without "user_id" errors. |
| **Member Creation** | Create a member via the Members module. | Database should generate a valid UUID for the new record. |
| **SMS Sending** | Send a test message. | Should hit `/api/sms/send` (NOT `/send-blessed`). |
| **Payment Status** | Check status of an M-Pesa transaction. | Controller should query `payments` using `transaction_id`. |

---

## 6. Troubleshooting
*   **Error: "invalid input syntax for type uuid"**: This means the database still has old INTEGER data or the frontend is passing a non-UUID string. Run `node scripts/reset-db.js` again.
*   **Error: "Route not found"**: Check `backend/app.js` to ensure the module (e.g., `/api/payment`) is properly registered.
*   **Playwright Timeout**: Ensure both the frontend and backend are reachable via `curl` before starting the test.

---
**Status:** ✅ **System Verified for Build Readiness**
