# KMainCMS - Routes and Database Calls Documentation

**Generated:** 2026-06-20

---

## API Routes

### Main Routes Files

#### routes\accessibility.routes.js

- **GET** `/settings` (line 10)
- **PUT** `/settings` (line 11)
- **POST** `/audit` (line 14)

#### routes\analytics.routes.js

- **GET** `/dashboard` (line 10)
- **GET** `/member-growth` (line 13)
- **GET** `/financial-trends` (line 16)
- **GET** `/department-activity` (line 19)
- **GET** `/attendance-trends` (line 22)

#### routes\announcements.routes.js

- **GET** `/public` (line 8)
- **GET** `/public/:id` (line 9)
- **GET** `/` (line 12)
- **GET** `/:id` (line 15)
- **POST** `/` (line 18)
- **PUT** `/:id` (line 26)
- **DELETE** `/:id` (line 36)

#### routes\approvals.routes.js

- **GET** `/workflows` (line 11)
- **POST** `/workflows` (line 12)
- **GET** `/analytics` (line 15)
- **GET** `/pending-count` (line 18)
- **POST** `/execute` (line 21)
- **GET** `/` (line 24)
- **GET** `/:id` (line 25)
- **PUT** `/:id/approve` (line 26)
- **PUT** `/:id/reject` (line 27)
- **PUT** `/:id/delegate` (line 28)
- **PUT** `/:approvalId/step` (line 29)
- **GET** `/:approvalId/status` (line 30)

#### routes\audit-logs.routes.js

- **GET** `/` (line 7)
- **GET** `/:id` (line 100)
- **GET** `/department/:departmentId` (line 139)

#### routes\auth.routes.js

- **POST** `/register` (line 21)
- **POST** `/login` (line 29)
- **POST** `/refresh-token` (line 37)
- **POST** `/logout` (line 38)
- **GET** `/profile` (line 41)
- **PUT** `/profile` (line 42)
- **PUT** `/password` (line 43)
- **GET** `/sessions` (line 44)
- **DELETE** `/sessions/:sessionId` (line 45)
- **DELETE** `/sessions` (line 46)
- **POST** `/mfa/enable` (line 47)
- **POST** `/mfa/verify` (line 48)
- **POST** `/mfa/disable` (line 49)
- **GET** `/audit-log` (line 50)
- **POST** `/forgot-password` (line 53)
- **POST** `/reset-password` (line 54)
- **POST** `/verify-email` (line 55)

#### routes\collections.routes.js

- **GET** `/my-collections` (line 10)
- **GET** `/my-statement` (line 11)
- **POST** `/` (line 12)
- **POST** `/event` (line 15)
- **GET** `/:id` (line 18)
- **PUT** `/:id` (line 21)
- **PUT** `/:id/status` (line 24)
- **POST** `/:id/contributions` (line 27)
- **GET** `/:id/contributions` (line 30)
- **DELETE** `/:id/contributions/:contributionId` (line 33)

#### routes\comments.routes.js

- **GET** `/:entityType/:entityId` (line 10)
- **POST** `/:entityType/:entityId` (line 11)
- **PUT** `/:commentId` (line 12)
- **DELETE** `/:commentId` (line 13)

#### routes\content.routes.js

- **GET** `/public/:slug` (line 14)
- **GET** `/website-settings` (line 15)
- **GET** `/categories-list` (line 21)
- **GET** `/tags-list` (line 22)
- **GET** `/` (line 25)
- **POST** `/` (line 26)
- **GET** `/:id` (line 34)
- **PUT** `/:id` (line 35)
- **DELETE** `/:id` (line 43)
- **POST** `/:id/publish` (line 44)
- **GET** `/:id/revisions` (line 47)
- **POST** `/:id/rollback/:revisionId` (line 48)
- **PUT** `/website-settings` (line 51)

#### routes\dashboard.routes.js

- **GET** `/overview` (line 8)
- **GET** `/stats` (line 96)
- **GET** `/activity` (line 160)
- **GET** `/performance` (line 248)
- **GET** `/attendance-trends` (line 289)
- **GET** `/financial-overview` (line 317)
- **GET** `/member-engagement` (line 344)
- **GET** `/system-health` (line 372)

#### routes\department-categories.routes.js

- **GET** `/` (line 8)
- **GET** `/:id` (line 21)
- **POST** `/` (line 41)
- **PUT** `/:id` (line 69)
- **DELETE** `/:id` (line 109)

#### routes\department.routes.js

- **GET** `/user` (line 54)
- **GET** `/my-departments` (line 57)
- **GET** `/available` (line 60)
- **POST** `/join` (line 98)
- **DELETE** `/leave/:departmentId` (line 208)
- **GET** `/:departmentId/pending-requests` (line 253)
- **POST** `/:departmentId/approve/:userId` (line 314)
- **POST** `/:departmentId/reject/:userId` (line 399)
- **GET** `/:departmentId/dashboard` (line 484)
- **GET** `/:departmentId/communications` (line 487)
- **GET** `/:departmentId/members` (line 544)
- **GET** `/:departmentId/meetings` (line 599)
- **GET** `/:departmentId/tasks` (line 653)
- **POST** `/:departmentId/tasks` (line 708)
- **PUT** `/:departmentId/tasks/:taskId` (line 769)
- **DELETE** `/:departmentId/tasks/:taskId` (line 830)
- **GET** `/:departmentId/resources` (line 888)
- **GET** `/:departmentId/activity-feed` (line 942)
- **GET** `/:departmentId/activity-summary` (line 945)
- **POST** `/:departmentId/logo` (line 948)
- **POST** `/:departmentId/banner` (line 951)
- **PUT** `/:departmentId/colors` (line 954)

#### routes\departments.routes.js

- **GET** `/overview` (line 11)
- **GET** `/` (line 18)
- **GET** `/:identifier` (line 39)
- **GET** `/:identifier/dashboard` (line 65)
- **GET** `/:id/members` (line 111)
- **GET** `/:id/communications` (line 133)
- **GET** `/:id/meetings` (line 156)
- **GET** `/:id/tasks` (line 177)
- **GET** `/:id/resources` (line 200)
- **POST** `/` (line 221)
- **PUT** `/:identifier` (line 274)
- **POST** `/:id/members` (line 348)
- **DELETE** `/:id/members/:userId` (line 419)
- **POST** `/batch` (line 478)
- **DELETE** `/:id` (line 563)
- **GET** `/components/all` (line 589)
- **GET** `/:id/components` (line 596)
- **POST** `/:id/components` (line 602)
- **DELETE** `/:id/components/:componentId` (line 610)
- **GET** `/:id/admins` (line 618)
- **POST** `/:id/admins` (line 624)
- **DELETE** `/:id/admins/:userId` (line 632)
- **GET** `/:identifier/pending-requests` (line 640)
- **POST** `/:identifier/approve/:userId` (line 671)
- **POST** `/:identifier/reject/:userId` (line 711)

#### routes\documentation.routes.js

- **GET** `/` (line 10)
- **GET** `/:id` (line 11)
- **POST** `/` (line 12)
- **PUT** `/:id` (line 13)
- **DELETE** `/:id` (line 14)

#### routes\documents.routes.js

- **POST** `/upload` (line 10)
- **GET** `/` (line 13)
- **GET** `/:id/download` (line 16)
- **PUT** `/:id` (line 19)
- **DELETE** `/:id` (line 22)

#### routes\events.routes.js

- **GET** `/` (line 45)
- **GET** `/:id` (line 113)
- **POST** `/` (line 176)
- **PUT** `/:id` (line 223)
- **POST** `/:id/register` (line 319)
- **DELETE** `/:id/register` (line 384)
- **PATCH** `/:id/attendance/:userId` (line 405)
- **DELETE** `/:id` (line 459)
- **GET** `/:id/ticket-types` (line 504)
- **POST** `/:id/ticket-types` (line 525)
- **POST** `/:id/register-with-payment` (line 596)
- **GET** `/:id/registrations` (line 768)

#### routes\fieldPermissions.routes.js

- **GET** `/` (line 10)
- **POST** `/` (line 13)
- **GET** `/module/:module` (line 16)
- **GET** `/check` (line 19)

#### routes\gallery.routes.js

- **GET** `/photos` (line 7)
- **GET** `/categories` (line 13)
- **GET** `/albums` (line 16)
- **GET** `/albums/:id` (line 17)
- **POST** `/albums` (line 18)
- **PUT** `/albums/:id` (line 19)
- **DELETE** `/albums/:id` (line 20)
- **POST** `/albums/:albumId/photos` (line 23)
- **PUT** `/photos/:id` (line 24)
- **DELETE** `/photos/:id` (line 25)
- **GET** `/tags` (line 28)
- **POST** `/photos/tags` (line 29)
- **DELETE** `/photos/:photoId/tags/:tagId` (line 30)
- **GET** `/photos/:photoId/comments` (line 33)
- **POST** `/photos/:photoId/comments` (line 34)

#### routes\health.js

- **GET** `/` (line 5)

#### routes\members.routes.js

- **GET** `/` (line 10)
- **GET** `/stats` (line 13)
- **GET** `/:id` (line 16)
- **POST** `/` (line 19)
- **PUT** `/:id` (line 22)
- **DELETE** `/:id` (line 25)

#### routes\mobile.routes.js

- **GET** `/dashboard` (line 10)
- **GET** `/content` (line 13)
- **GET** `/announcements` (line 16)
- **GET** `/departments` (line 19)
- **GET** `/events` (line 22)
- **POST** `/sync` (line 25)

#### routes\monitoring.routes.js

- **GET** `/metrics` (line 10)
- **GET** `/logs` (line 13)

#### routes\notifications.routes.js

- **GET** `/` (line 10)
- **GET** `/unread-count` (line 11)
- **POST** `/:notificationId/read` (line 12)
- **POST** `/mark-all-read` (line 13)
- **POST** `/read-all` (line 14)
- **DELETE** `/:notificationId` (line 15)
- **GET** `/types` (line 18)
- **GET** `/preferences` (line 21)
- **PUT** `/preferences` (line 22)
- **POST** `/` (line 25)

#### routes\palette.routes.js

- **GET** `/` (line 15)
- **GET** `/:id` (line 16)
- **GET** `/name/:name` (line 17)
- **POST** `/:id/apply` (line 20)
- **POST** `/` (line 23)
- **PUT** `/:id` (line 24)
- **DELETE** `/:id` (line 25)

#### routes\payment.routes.js

- **POST** `/kopokopo/webhook` (line 8)
- **POST** `/initiate` (line 14)
- **POST** `/payment-link` (line 15)
- **POST** `/qr-code` (line 16)
- **GET** `/status/:paymentId` (line 19)
- **GET** `/history/:memberId` (line 20)
- **GET** `/all` (line 21)
- **GET** `/analytics` (line 24)
- **POST** `/refund/:paymentId` (line 27)

#### routes\payments.routes.js

- **GET** `/methods` (line 10)
- **GET** `/categories` (line 13)
- **GET** `/my-payments` (line 16)
- **GET** `/` (line 19)
- **POST** `/` (line 20)
- **GET** `/payments` (line 23)
- **POST** `/payments` (line 24)
- **PUT** `/payments/:id/status` (line 25)
- **PUT** `/status/:id` (line 26)
- **GET** `/pledges` (line 29)
- **POST** `/pledges` (line 30)
- **POST** `/pledges/:pledgeId/payments` (line 31)
- **GET** `/summary` (line 34)
- **GET** `/:id/receipt` (line 37)

#### routes\performance.routes.js

- **GET** `/metrics` (line 10)
- **GET** `/cache-stats` (line 13)

#### routes\reports.routes.js

- **GET** `/financial` (line 10)
- **GET** `/department` (line 13)
- **GET** `/attendance` (line 16)
- **GET** `/sms` (line 19)
- **GET** `/approvals` (line 22)
- **GET** `/export` (line 25)
- **POST** `/save` (line 28)
- **GET** `/saved` (line 29)
- **POST** `/generate` (line 30)
- **POST** `/schedule` (line 33)
- **GET** `/scheduled` (line 34)
- **GET** `/scheduled/:reportId/executions` (line 35)
- **GET** `/templates` (line 38)

#### routes\search.routes.js

- **GET** `/global` (line 10)
- **POST** `/` (line 13)
- **POST** `/saved` (line 16)
- **GET** `/saved` (line 17)
- **DELETE** `/saved/:id` (line 18)
- **GET** `/suggestions` (line 21)

#### routes\security.routes.js

- **GET** `/logs` (line 10)
- **GET** `/failed-attempts` (line 13)
- **GET** `/blocked-ips` (line 16)
- **POST** `/block-ip` (line 17)
- **DELETE** `/unblock-ip/:ipAddress` (line 18)
- **GET** `/sessions/:userId` (line 21)
- **DELETE** `/sessions/:userId` (line 22)
- **GET** `/settings` (line 25)
- **PUT** `/settings` (line 26)
- **GET** `/analytics` (line 29)

#### routes\seo.routes.js

- **GET** `/settings` (line 10)
- **PUT** `/settings` (line 11)
- **POST** `/analyze` (line 14)

#### routes\settings.routes.js

- **GET** `/public` (line 16)
- **GET** `/` (line 19)
- **GET** `/export/data` (line 20)
- **GET** `/history/audit` (line 21)
- **GET** `/:key` (line 22)
- **POST** `/` (line 23)
- **POST** `/import/data` (line 24)
- **POST** `/reset` (line 25)
- **PUT** `/bulk` (line 26)
- **PUT** `/:key` (line 27)
- **DELETE** `/:key` (line 28)

#### routes\sms.routes.js

- **GET** `/providers` (line 10)
- **POST** `/providers` (line 11)
- **GET** `/templates` (line 14)
- **POST** `/templates` (line 15)
- **DELETE** `/templates/:id` (line 16)
- **POST** `/send` (line 19)
- **POST** `/send-blessed` (line 20)
- **GET** `/logs` (line 23)
- **GET** `/history` (line 24)
- **GET** `/balance` (line 27)
- **GET** `/campaigns` (line 30)
- **POST** `/campaigns` (line 31)
- **POST** `/campaigns/:campaignId/send` (line 32)
- **PUT** `/campaigns/:id/status` (line 33)
- **GET** `/stats` (line 36)
- **GET** `/analytics` (line 37)
- **GET** `/rate-limit` (line 41)
- **GET** `/recent` (line 42)
- **GET** `/templates/:id/analytics` (line 45)
- **GET** `/templates/:id/versions` (line 46)
- **PUT** `/templates/:id/approve` (line 47)
- **PUT** `/templates/:id/reject` (line 48)
- **GET** `/templates/:id/ab-tests` (line 49)
- **POST** `/campaigns/:id/optimize` (line 52)
- **GET** `/analytics/predictive` (line 55)
- **GET** `/analytics/benchmarks` (line 56)
- **GET** `/analytics/collaboration` (line 57)

#### routes\socialAuth.routes.js

- **GET** `/google` (line 8)
- **GET** `/google/callback` (line 13)
- **GET** `/facebook` (line 20)
- **GET** `/facebook/callback` (line 25)
- **POST** `/link` (line 32)
- **DELETE** `/unlink/:provider` (line 33)

#### routes\telegram.routes.js

- **GET** `/channels` (line 21)
- **POST** `/channels` (line 22)
- **PUT** `/channels/:id` (line 29)
- **DELETE** `/channels/:id` (line 30)
- **POST** `/channels/:id/post` (line 33)
- **GET** `/channels/:id/posts` (line 40)
- **POST** `/channels/:id/sync` (line 41)
- **POST** `/upload-photo` (line 44)
- **GET** `/settings` (line 47)
- **PUT** `/settings` (line 48)
- **GET** `/auth/status` (line 51)
- **POST** `/auth/start` (line 52)
- **POST** `/auth/start-fallback` (line 53)
- **POST** `/auth/verify` (line 54)
- **GET** `/cache/health` (line 57)
- **POST** `/cache/refresh` (line 58)
- **GET** `/channels/:id/gallery-photos` (line 61)
- **POST** `/webhook` (line 64)

#### routes\testing.routes.js

- **GET** `/results` (line 10)
- **POST** `/run/:type` (line 13)

#### routes\treasury.routes.js

- **GET** `/accounts` (line 10)
- **POST** `/accounts` (line 11)
- **GET** `/transactions` (line 14)
- **POST** `/transactions` (line 15)
- **PUT** `/transactions/:id/approve` (line 16)
- **GET** `/income-categories` (line 19)
- **GET** `/expense-categories` (line 20)
- **GET** `/budgets` (line 23)
- **POST** `/budgets` (line 24)
- **GET** `/budgets/:budgetId/items` (line 25)
- **POST** `/budgets/:budgetId/items` (line 26)
- **GET** `/budgets/alerts` (line 27)
- **GET** `/summary` (line 30)
- **GET** `/vendors` (line 33)
- **POST** `/vendors` (line 34)
- **PUT** `/vendors/:id` (line 35)
- **DELETE** `/vendors/:id` (line 36)
- **GET** `/analytics` (line 38)
- **GET** `/recurring-payments` (line 40)
- **POST** `/recurring-payments` (line 41)
- **PUT** `/recurring-payments/:id` (line 42)
- **DELETE** `/recurring-payments/:id` (line 43)
- **POST** `/recurring-payments/:id/pause` (line 44)
- **POST** `/recurring-payments/:id/activate` (line 45)
- **GET** `/receipts` (line 47)
- **GET** `/receipts/:id/pdf` (line 48)
- **GET** `/projects` (line 50)
- **POST** `/projects` (line 51)
- **PUT** `/projects/:id` (line 52)
- **DELETE** `/projects/:id` (line 53)
- **GET** `/pledges` (line 55)
- **POST** `/pledges` (line 56)
- **PUT** `/pledges/:id` (line 57)
- **DELETE** `/pledges/:id` (line 58)
- **GET** `/campaigns` (line 60)
- **POST** `/campaigns` (line 61)

#### routes\users.routes.js

- **GET** `/directory` (line 44)
- **GET** `/` (line 130)
- **GET** `/:id` (line 215)
- **PUT** `/:id` (line 266)
- **POST** `/:id/roles` (line 320)
- **DELETE** `/:id/roles/:roleId` (line 365)
- **PATCH** `/:id/deactivate` (line 392)
- **GET** `/activity-history` (line 420)
- **POST** `/change-password` (line 472)
- **DELETE** `/:id` (line 522)

#### routes\userSettings.routes.js

- **GET** `/preferences` (line 15)
- **PUT** `/preferences` (line 18)
- **POST** `/change-password` (line 21)
- **GET** `/activity-history` (line 24)

### Treasury Module Routes

#### modules\treasury\routes\account.routes.js

- **GET** `/` (line 28)
- **GET** `/hierarchy` (line 34)
- **GET** `/trial-balance` (line 40)
- **GET** `/:id` (line 47)
- **POST** `/` (line 53)
- **PUT** `/:id` (line 61)
- **DELETE** `/:id` (line 68)

#### modules\treasury\routes\budget.routes.js

- **GET** `/` (line 31)
- **GET** `/alerts` (line 38)
- **GET** `/comparison` (line 45)
- **GET** `/:id` (line 52)
- **POST** `/` (line 59)
- **PUT** `/:id` (line 67)
- **POST** `/:id/activate` (line 74)
- **POST** `/:id/close` (line 81)

#### modules\treasury\routes\expense.routes.js

- **GET** `/` (line 30)
- **GET** `/pending` (line 36)
- **GET** `/summary` (line 43)
- **GET** `/report` (line 50)
- **GET** `/:id` (line 57)
- **POST** `/` (line 63)
- **PUT** `/:id` (line 70)
- **POST** `/:id/approve` (line 76)
- **POST** `/:id/reject` (line 83)
- **POST** `/:id/pay` (line 91)

#### modules\treasury\routes\fund.routes.js

- **GET** `/` (line 29)
- **GET** `/balances` (line 35)
- **GET** `/:id` (line 42)
- **POST** `/` (line 48)
- **PUT** `/:id` (line 56)
- **DELETE** `/:id` (line 63)

#### modules\treasury\routes\journalEntry.routes.js

- **GET** `/` (line 28)
- **GET** `/:id` (line 35)
- **POST** `/` (line 42)
- **PUT** `/:id` (line 50)
- **POST** `/:id/reverse` (line 57)
- **GET** `/accounts/:account_id/transactions` (line 64)

---

## Database Calls

### Controllers

#### controllers\accessibility.controller.js

- Line 6: `const result = await pool.query('SELECT * FROM accessibility_settings WHERE id = 1');`
- Line 17: `await pool.query(`

#### controllers\activityFeed.controller.js

- Line 22: `const accessCheck = await pool.query(``
- Line 118: `const activities = await pool.query(activityQuery, params);`
- Line 152: `const countResult = await pool.query(countQuery, [departmentId]);`
- Line 187: `const accessCheck = await pool.query(``
- Line 201: `const summary = await pool.query(``

#### controllers\analytics.controller.js

- Line 16: `pool.query('SELECT COUNT(*) as count FROM members'),`
- Line 17: `pool.query('SELECT COUNT(*) as count FROM departments WHERE is_active = true'),`
- Line 18: `pool.query('SELECT COUNT(*) as count FROM members WHERE membership_status = $1', ['active']),`
- Line 19: `pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE transaction_type = $1 A...`
- Line 20: `pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE transaction_type = $1 A...`
- Line 21: `pool.query('SELECT COUNT(*) as count FROM approval_requests WHERE status = $1', ['pending']),`
- Line 22: `pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [re...`
- Line 58: `const result = await pool.query(`
- Line 79: `const result = await pool.query(`
- Line 101: `const result = await pool.query(`
- Line 126: `const result = await pool.query(`

#### controllers\announcements.controller.js

- Line 24: `const result = await pool.query(query, [`
- Line 38: `const announcementResult = await pool.query(announcementQuery, [result.rows[0].id]);`
- Line 97: `const result = await pool.query(query, params);`
- Line 106: `const countResult = await pool.query(countQuery, params.slice(0, -2));`
- Line 137: `const result = await pool.query(query, [id]);`
- Line 156: `const deptMemberResult = await pool.query(deptMemberQuery, [req.user.id, announcement.department_id]...`
- Line 196: `const checkResult = await pool.query(checkQuery, [`
- Line 219: `const result = await pool.query(updateQuery, [`
- Line 250: `const checkResult = await pool.query(checkQuery, [`
- Line 265: `await pool.query('DELETE FROM announcements WHERE id = $1', [id]);`
- Line 301: `pool.query(query, [limit, offset]),`
- Line 302: `pool.query(countQuery)`
- Line 337: `const result = await pool.query(query, [id]);`

#### controllers\approvals.controller.js

- Line 24: `const result = await pool.query(query, params);`
- Line 35: `const result = await pool.query(`
- Line 49: `const result = await pool.query(`
- Line 70: `const historyResult = await pool.query(`
- Line 82: `const delegatesResult = await pool.query(`
- Line 114: `await pool.query(`
- Line 120: `await pool.query(`
- Line 139: `await pool.query(`
- Line 145: `await pool.query(`
- Line 164: `await pool.query(`
- Line 170: `await pool.query(`
- Line 186: `const result = await pool.query(`
- Line 201: `const result = await pool.query('SELECT * FROM approval_workflows WHERE is_active = true ORDER BY cr...`
- Line 211: `const result = await pool.query(`

#### controllers\auth.controller.js

- Line 41: `const existingUser = await pool.query(`
- Line 54: `const result = await pool.query(`
- Line 64: `const roleResult = await pool.query(`
- Line 70: `await pool.query(`
- Line 77: `await pool.query(`
- Line 99: `const userResult = await pool.query(`
- Line 106: `await pool.query(`
- Line 119: `await pool.query(`
- Line 127: `const rolesResult = await pool.query(`
- Line 137: `const permissionsResult = await pool.query(`
- Line 153: `await pool.query(`
- Line 160: `await pool.query(`
- Line 166: `await pool.query(`
- Line 198: `const tokenResult = await pool.query(`
- Line 211: `const rolesResult = await pool.query(`
- Line 225: `await pool.query(`
- Line 231: `await pool.query(`
- Line 256: `await pool.query(`
- Line 263: `await pool.query(`
- Line 283: `const result = await pool.query(`
- Line 296: `const rolesResult = await pool.query(`
- Line 304: `const permissionsResult = await pool.query(`
- Line 332: `const result = await pool.query(`
- Line 348: `await pool.query(`
- Line 371: `const userResult = await pool.query(`
- Line 392: `await pool.query(`
- Line 398: `await pool.query(`
- Line 419: `const userResult = await pool.query(`
- Line 439: `await pool.query(`
- Line 446: `await pool.query(`
- Line 471: `const tokenResult = await pool.query(`
- Line 487: `await pool.query(`
- Line 493: `await pool.query(`
- Line 499: `await pool.query(`
- Line 519: `const tokenResult = await pool.query(`
- Line 532: `await pool.query(`
- Line 538: `await pool.query(`
- Line 557: `const result = await pool.query(`
- Line 581: `await pool.query(`
- Line 600: `await pool.query(`
- Line 620: `const userResult = await pool.query(`
- Line 635: `await pool.query(`
- Line 641: `await pool.query(`
- Line 666: `const userResult = await pool.query(`
- Line 689: `await pool.query(`
- Line 695: `await pool.query(`
- Line 717: `const userResult = await pool.query(`
- Line 732: `await pool.query(`
- Line 738: `await pool.query(`
- Line 759: `const result = await pool.query(`

#### controllers\collection.controller.js

- Line 8: `const result = await pool.query(`
- Line 46: `const result = await pool.query(`
- Line 75: `const result = await pool.query(`
- Line 127: `const eventCheck = await pool.query(`
- Line 148: `const result = await pool.query(`
- Line 156: `await pool.query(`
- Line 181: `const result = await pool.query(`
- Line 208: `const contributionCount = await pool.query(`
- Line 239: `const collectionCheck = await pool.query(`
- Line 263: `const result = await pool.query(`
- Line 306: `const collectionCheck = await pool.query(`
- Line 329: `const result = await pool.query(`
- Line 337: `await pool.query(`
- Line 343: `const updatedCollection = await pool.query(`
- Line 349: `await pool.query(`
- Line 378: `const collectionCheck = await pool.query(`
- Line 391: `const result = await pool.query(`
- Line 406: `const countResult = await pool.query(`
- Line 449: `const contributionCheck = await pool.query(`
- Line 464: `await pool.query(`
- Line 470: `await pool.query(`
- Line 476: `const updatedCollection = await pool.query(`
- Line 483: `await pool.query(`
- Line 519: `const collectionCheck = await pool.query(`
- Line 543: `const result = await pool.query(`

#### controllers\comments.controller.js

- Line 7: `const result = await pool.query(`
- Line 30: `const result = await pool.query(`
- Line 38: `const commentWithUser = await pool.query(`
- Line 62: `const commentCheck = await pool.query(`
- Line 78: `const result = await pool.query(`
- Line 95: `const commentCheck = await pool.query(`
- Line 111: `await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);`

#### controllers\content.controller.js

- Line 39: `const result = await pool.query(query, params);`
- Line 51: `const result = await pool.query(`
- Line 65: `const tagsResult = await pool.query(`
- Line 90: `const result = await pool.query(`
- Line 102: `await pool.query(`
- Line 110: `await pool.query(`
- Line 134: `const currentResult = await pool.query('SELECT * FROM content_items WHERE id = $1', [id]);`
- Line 147: `const result = await pool.query(`
- Line 169: `await pool.query('DELETE FROM content_item_tags WHERE content_item_id = $1', [id]);`
- Line 171: `await pool.query(`
- Line 180: `const revisionNumber = await pool.query(`
- Line 185: `await pool.query(`
- Line 207: `await pool.query('DELETE FROM content_items WHERE id = $1', [id]);`
- Line 224: `const result = await pool.query(`
- Line 253: `const result = await pool.query(`
- Line 278: `const revisionResult = await pool.query(`
- Line 290: `const currentRevResult = await pool.query(`
- Line 296: `await pool.query(`
- Line 304: `await pool.query(`
- Line 322: `const result = await pool.query(`
- Line 338: `const result = await pool.query('SELECT * FROM content_tags ORDER BY name');`
- Line 352: `const result = await pool.query(`
- Line 380: `await pool.query(`

#### controllers\dashboard.controller.js

- Line 7: `const membersResult = await pool.query(`
- Line 12: `const paymentsResult = await pool.query(`
- Line 18: `const eventsResult = await pool.query(`
- Line 24: `const announcementsResult = await pool.query(`
- Line 52: `const approvalsResult = await pool.query(`
- Line 78: `const paymentsActivityResult = await pool.query(`
- Line 102: `const announcementsResult = await pool.query(`
- Line 127: `const eventsResult = await pool.query(`
- Line 152: `const membersResult = await pool.query(`

#### controllers\department.controller.js

- Line 44: `const departments = await pool.query(``
- Line 110: `const departments = await pool.query(``
- Line 135: `const recentActivity = await pool.query(``
- Line 164: `const stats = await pool.query(``
- Line 204: `const departmentInfo = await pool.query(``
- Line 232: `const accessCheck = await pool.query(``
- Line 255: `const memberCountCheck = await pool.query(``
- Line 260: `const metricsResult = await pool.query(``
- Line 279: `const recentActivitiesResult = await pool.query(``
- Line 318: `const upcomingMeetingsResult = await pool.query(``
- Line 341: `const pendingTasksResult = await pool.query(``
- Line 404: `const accessCheck = await pool.query(``
- Line 416: `const result = await pool.query(``
- Line 450: `const accessCheck = await pool.query(``
- Line 490: `const communications = await pool.query(query, params);`
- Line 498: `const countResult = await pool.query(countQuery, [departmentId]);`
- Line 529: `const accessCheck = await pool.query(``
- Line 541: `const result = await pool.query(``
- Line 549: `await pool.query(``
- Line 576: `const result = await pool.query(``
- Line 601: `const result = await pool.query(``
- Line 639: `const deptCheck = await pool.query(``
- Line 651: `const result = await pool.query(``
- Line 685: `const deptCheck = await pool.query(``
- Line 697: `await pool.query(``
- Line 730: `const deptCheck = await pool.query(``
- Line 743: `const memberCheck = await pool.query(``
- Line 756: `await pool.query(``
- Line 788: `const deptCheck = await pool.query(``
- Line 801: `await pool.query(``
- Line 827: `const result = await pool.query(``
- Line 864: `const accessCheck = await pool.query(``
- Line 876: `const members = await pool.query(``
- Line 939: `await pool.query(``
- Line 973: `await pool.query(``
- Line 1000: `await pool.query(``

#### controllers\departments.controller.js

- Line 26: `const result = await pool.query(query, params);`
- Line 38: `const result = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);`
- Line 45: `const membersResult = await pool.query(`
- Line 67: `const result = await pool.query(`
- Line 90: `const result = await pool.query(`
- Line 123: `await pool.query('DELETE FROM departments WHERE id = $1', [id]);`
- Line 140: `const result = await pool.query(`
- Line 166: `await pool.query(`
- Line 202: `const result = await pool.query(query, params);`
- Line 216: `const result = await pool.query(`
- Line 263: `const result = await pool.query(query, params);`
- Line 277: `const result = await pool.query(`
- Line 300: `const result = await pool.query(`
- Line 329: `const result = await pool.query(`
- Line 352: `const result = await pool.query(`

#### controllers\documentation.controller.js

- Line 6: `const result = await pool.query(`
- Line 18: `const result = await pool.query(`
- Line 35: `const result = await pool.query(`
- Line 51: `const result = await pool.query(`
- Line 70: `await pool.query('DELETE FROM documentation WHERE id = $1', [req.params.id]);`

#### controllers\documents.controller.js

- Line 43: `const result = await pool.query(`
- Line 77: `const columnCheck = await pool.query(``
- Line 103: `const result = await pool.query(query, params);`
- Line 117: `const result = await pool.query(`
- Line 136: `await pool.query(`
- Line 152: `const result = await pool.query(`

#### controllers\events.controller.js

- Line 6: `const result = await pool.query(``
- Line 24: `const result = await pool.query(``
- Line 46: `const result = await pool.query(`
- Line 63: `const result = await pool.query(`
- Line 83: `const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING *', [id]);`

#### controllers\gallery.controller.js

- Line 7: `const result = await pool.query(`
- Line 24: `const result = await pool.query(`
- Line 43: `const albumResult = await pool.query('SELECT * FROM gallery_albums WHERE id = $1', [id]);`
- Line 49: `const photosResult = await pool.query(`
- Line 73: `const result = await pool.query(`
- Line 96: `const result = await pool.query(`
- Line 126: `await pool.query('DELETE FROM gallery_albums WHERE id = $1', [id]);`
- Line 144: `const result = await pool.query(`
- Line 172: `const result = await pool.query(`
- Line 202: `await pool.query('DELETE FROM gallery_photos WHERE id = $1', [id]);`
- Line 216: `const result = await pool.query('SELECT * FROM gallery_tags ORDER BY name');`
- Line 229: `await pool.query(`
- Line 248: `await pool.query(`
- Line 267: `const result = await pool.query(`
- Line 289: `const result = await pool.query(`
- Line 310: `const result = await pool.query(`

#### controllers\members.controller.js

- Line 31: `const result = await pool.query(query, params);`
- Line 34: `const countResult = await pool.query(countQuery, params.slice(0, paramCount));`
- Line 58: `const result = await pool.query('SELECT * FROM members WHERE id = $1', [id]);`
- Line 65: `const contactsResult = await pool.query(`
- Line 71: `const groupsResult = await pool.query(`
- Line 112: `const result = await pool.query(`
- Line 139: `await pool.query(`
- Line 174: `const result = await pool.query(`
- Line 226: `await pool.query('DELETE FROM members WHERE id = $1', [id]);`
- Line 236: `const totalResult = await pool.query('SELECT COUNT(*) as count FROM members');`
- Line 237: `const activeResult = await pool.query("SELECT COUNT(*) as count FROM members WHERE membership_status...`
- Line 238: `const newResult = await pool.query(`

#### controllers\mobile.controller.js

- Line 14: `pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [us...`
- Line 15: `pool.query('SELECT COUNT(*) as count FROM approval_requests WHERE status = $1 AND requester_id = $2'...`
- Line 16: `pool.query(``
- Line 48: `const result = await pool.query(`
- Line 69: `const tableCheck = await pool.query(``
- Line 80: `const result = await pool.query(`
- Line 98: `const result = await pool.query(`
- Line 117: `const tableCheck = await pool.query(``
- Line 142: `const result = await pool.query(query, params);`
- Line 157: `pool.query('SELECT * FROM content_items WHERE updated_at > $1', [syncDate]),`
- Line 158: `pool.query('SELECT * FROM announcements WHERE updated_at > $1', [syncDate]).catch(() => ({ rows: [] ...`
- Line 159: `pool.query('SELECT * FROM events WHERE updated_at > $1', [syncDate]).catch(() => ({ rows: [] })),`
- Line 160: `pool.query('SELECT * FROM departments WHERE updated_at > $1', [syncDate])`

#### controllers\monitoring.controller.js

- Line 46: `const result = await pool.query(`

#### controllers\notifications.controller.js

- Line 24: `const result = await pool.query(query, params);`
- Line 37: `await pool.query(`
- Line 58: `await pool.query(`
- Line 80: `await pool.query(`
- Line 99: `const result = await pool.query(`
- Line 113: `const result = await pool.query('SELECT * FROM notification_types ORDER BY name');`
- Line 125: `const result = await pool.query(`
- Line 143: `await pool.query(`
- Line 165: `const result = await pool.query(`

#### controllers\palette.controller.js

- Line 8: `const result = await pool.query(`
- Line 31: `const paletteResult = await pool.query(`
- Line 42: `const colorsResult = await pool.query(`
- Line 68: `const paletteResult = await pool.query(`
- Line 79: `const colorsResult = await pool.query(`
- Line 107: `const existing = await pool.query(`
- Line 117: `const paletteResult = await pool.query(`
- Line 128: `await pool.query(`
- Line 151: `const paletteResult = await pool.query(`
- Line 168: `await pool.query(`
- Line 180: `await pool.query(`
- Line 187: `await pool.query(`
- Line 210: `const paletteResult = await pool.query(`
- Line 232: `await pool.query('DELETE FROM color_palettes WHERE id = $1', [id]);`
- Line 250: `const paletteResult = await pool.query(`
- Line 262: `const colorsResult = await pool.query(`
- Line 276: `await pool.query(`
- Line 285: `await pool.query(`

#### controllers\payment.controller.js

- Line 32: `const paymentResult = await pool.query(paymentQuery, [`
- Line 53: `await pool.query('UPDATE payments SET status = $1, failure_reason = $2 WHERE id = $3', [`
- Line 66: `await pool.query(`
- Line 104: `const paymentResult = await pool.query(paymentQuery, [`
- Line 126: `await pool.query('UPDATE payments SET status = $1, failure_reason = $2 WHERE id = $3', [`
- Line 138: `await pool.query(`
- Line 170: `const paymentResult = await pool.query(paymentQuery, [`
- Line 190: `await pool.query('UPDATE payments SET status = $1, failure_reason = $2 WHERE id = $3', [`
- Line 202: `await pool.query(`
- Line 230: `const paymentResult = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);`
- Line 247: `await pool.query(`
- Line 310: `const countResult = await pool.query(countQuery, params);`
- Line 317: `const paymentsResult = await pool.query(query, params);`
- Line 375: `const countResult = await pool.query(countQuery, params);`
- Line 382: `const paymentsResult = await pool.query(query, params);`
- Line 459: `const localAnalyticsResult = await pool.query(localAnalyticsQuery, [start, end]);`
- Line 489: `const paymentResult = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);`
- Line 524: `const refundResultData = await pool.query(refundQuery, [`

#### controllers\payments.controller.js

- Line 6: `const result = await pool.query(`
- Line 74: `const result = await pool.query(query, params);`
- Line 87: `const result = await pool.query(`
- Line 110: `const result = await pool.query(`
- Line 169: `const result = await pool.query(query, params);`
- Line 181: `const result = await pool.query(`
- Line 204: `const result = await pool.query(`
- Line 234: `const result = await pool.query(`
- Line 256: `const result = await pool.query(`
- Line 291: `const result = await pool.query(query, params);`
- Line 305: `const result = await pool.query(`

#### controllers\performance.controller.js

- Line 28: `const result = await pool.query(`

#### controllers\reports.controller.js

- Line 30: `const result = await pool.query(query, params);`
- Line 71: `const result = await pool.query(query, params);`
- Line 100: `const result = await pool.query(query, params);`
- Line 137: `const result = await pool.query(query, params);`
- Line 178: `const result = await pool.query(query, params);`
- Line 246: `const result = await pool.query(query, params);`
- Line 267: `const result = await pool.query(query, params);`
- Line 284: `const result = await pool.query(query, params);`
- Line 292: `const result = await pool.query(`
- Line 308: `const result = await pool.query(`
- Line 371: `const result = await pool.query(query, params);`
- Line 399: `const result = await pool.query(`
- Line 419: `const result = await pool.query(`
- Line 439: `const result = await pool.query(`

#### controllers\search.controller.js

- Line 17: `const membersResult = await pool.query(`
- Line 29: `const contentResult = await pool.query(`
- Line 41: `const deptResult = await pool.query(`
- Line 53: `const docsResult = await pool.query(`
- Line 65: `const usersResult = await pool.query(`
- Line 90: `const membersResult = await pool.query(`
- Line 101: `const docsResult = await pool.query(`
- Line 112: `const eventsResult = await pool.query(`
- Line 123: `const announcementsResult = await pool.query(`
- Line 152: `const membersResult = await pool.query(`
- Line 162: `const contentResult = await pool.query(`
- Line 172: `const deptResult = await pool.query(`
- Line 191: `const result = await pool.query(`
- Line 206: `const result = await pool.query(`
- Line 219: `await pool.query(`

#### controllers\security.controller.js

- Line 7: `const result = await pool.query(`
- Line 20: `const result = await pool.query(`
- Line 34: `const result = await pool.query('SELECT * FROM blocked_ips ORDER BY blocked_at DESC');`
- Line 45: `await pool.query(`
- Line 58: `await pool.query('DELETE FROM blocked_ips WHERE ip_address = $1', [req.params.ipAddress]);`
- Line 68: `const result = await pool.query(`
- Line 81: `await pool.query(`
- Line 94: `const result = await pool.query('SELECT * FROM security_settings WHERE id = 1');`
- Line 105: `await pool.query(`
- Line 121: `const result = await pool.query(`
- Line 131: `const recentEvents = await pool.query(`

#### controllers\seo.controller.js

- Line 6: `const result = await pool.query('SELECT * FROM seo_settings WHERE id = 1');`
- Line 17: `await pool.query(`

#### controllers\settings.controller.js

- Line 6: `const result = await pool.query(`
- Line 27: `const result = await pool.query(`
- Line 46: `const result = await pool.query(`
- Line 69: `const result = await pool.query(`
- Line 91: `const settingResult = await pool.query(`
- Line 106: `const result = await pool.query(`
- Line 142: `const settingResult = await pool.query(`
- Line 149: `const insertResult = await pool.query(`
- Line 166: `const result = await pool.query(`
- Line 192: `const settingResult = await pool.query(`
- Line 207: `await pool.query('DELETE FROM settings WHERE key = $1', [key]);`
- Line 228: `const result = await pool.query(query, params);`
- Line 257: `const result = await pool.query(`
- Line 301: `const result = await pool.query(query, params);`
- Line 331: `const result = await pool.query(query, params);`

#### controllers\sms.controller.js

- Line 6: `const result = await pool.query('SELECT * FROM sms_providers WHERE is_active = true ORDER BY name');`
- Line 17: `const result = await pool.query(`
- Line 31: `const result = await pool.query(`
- Line 45: `const result = await pool.query(`
- Line 68: `const result = await pool.query(`
- Line 87: `const result = await pool.query(`
- Line 101: `await pool.query('UPDATE sms_campaigns SET status = $1 WHERE id = $2', ['active', campaignId]);`
- Line 115: `const result = await pool.query('SELECT phone FROM users WHERE is_active = true AND phone IS NOT NUL...`
- Line 118: `const result = await pool.query(`
- Line 124: `const result = await pool.query(`
- Line 131: `const insertResult = await pool.query(`
- Line 154: `const result = await pool.query(`
- Line 172: `const result = await pool.query(`
- Line 191: `await pool.query('UPDATE sms_templates SET is_active = false WHERE id = $1', [req.params.id]);`
- Line 202: `const result = await pool.query(`
- Line 226: `await pool.query(`
- Line 242: `const statsResult = await pool.query(`
- Line 253: `const trendsResult = await pool.query(`
- Line 266: `const topRecipientsResult = await pool.query(`
- Line 304: `const result = await pool.query(`
- Line 330: `const result = await pool.query(`
- Line 353: `const statsResult = await pool.query(`
- Line 377: `const result = await pool.query(`
- Line 397: `await pool.query(`
- Line 402: `await pool.query(`
- Line 418: `await pool.query(`
- Line 433: `const result = await pool.query(`
- Line 454: `const campaignResult = await pool.query(`
- Line 529: `const topContributorsResult = await pool.query(`

#### controllers\socialAuth.controller.js

- Line 10: `let userResult = await pool.query(`
- Line 22: `userResult = await pool.query(`
- Line 30: `await pool.query(`
- Line 39: `const newUserResult = await pool.query(`
- Line 49: `const roleResult = await pool.query(`
- Line 55: `await pool.query(`
- Line 62: `await pool.query(`
- Line 71: `const rolesResult = await pool.query(`
- Line 85: `await pool.query(`
- Line 92: `await pool.query(`
- Line 111: `let userResult = await pool.query(`
- Line 123: `userResult = await pool.query(`
- Line 132: `await pool.query(`
- Line 142: `const newUserResult = await pool.query(`
- Line 152: `const roleResult = await pool.query(`
- Line 158: `await pool.query(`
- Line 165: `await pool.query(`
- Line 174: `const rolesResult = await pool.query(`
- Line 188: `await pool.query(`
- Line 195: `await pool.query(`
- Line 215: `await pool.query(`
- Line 220: `await pool.query(`
- Line 227: `await pool.query(`
- Line 249: `await pool.query(`
- Line 254: `await pool.query(`
- Line 261: `await pool.query(`

#### controllers\telegram.controller.js

- Line 7: `const result = await pool.query(`
- Line 33: `const result = await pool.query(`
- Line 56: `const result = await pool.query(`
- Line 89: `await pool.query('DELETE FROM telegram_channels WHERE id = $1', [id]);`
- Line 107: `const channelResult = await pool.query(`
- Line 127: `await pool.query(`
- Line 149: `const result = await pool.query(`
- Line 175: `const channelResult = await pool.query(`
- Line 194: `await pool.query(`
- Line 222: `const result = await pool.query('SELECT * FROM telegram_settings WHERE id = 1');`
- Line 246: `await pool.query(`
- Line 375: `const channelResult = await pool.query(`
- Line 391: `await pool.query(`
- Line 411: `await pool.query(`

#### controllers\testing.controller.js

- Line 7: `const result = await pool.query(`
- Line 59: `await pool.query(`

#### controllers\treasury.controller.js

- Line 6: `const result = await pool.query(`
- Line 21: `const result = await pool.query(`
- Line 97: `const result = await pool.query(query, params);`
- Line 110: `const result = await pool.query(`
- Line 133: `const result = await pool.query(`
- Line 160: `const result = await pool.query('SELECT * FROM income_categories ORDER BY name');`
- Line 170: `const result = await pool.query('SELECT * FROM expense_categories ORDER BY name');`
- Line 200: `const result = await pool.query(query, params);`
- Line 213: `const result = await pool.query(`
- Line 235: `const result = await pool.query(`
- Line 258: `const result = await pool.query(`
- Line 288: `const incomeResult = await pool.query(`
- Line 296: `const expenseResult = await pool.query(`
- Line 304: `const accountsResult = await pool.query(`
- Line 329: `const result = await pool.query(`
- Line 354: `const result = await pool.query('SELECT * FROM vendors ORDER BY name');`
- Line 365: `const result = await pool.query(`
- Line 380: `const result = await pool.query(`
- Line 393: `await pool.query('DELETE FROM vendors WHERE id = $1', [req.params.id]);`
- Line 404: `const result = await pool.query(`
- Line 422: `const result = await pool.query('SELECT * FROM recurring_payments ORDER BY next_payment_date');`
- Line 433: `const result = await pool.query(`
- Line 448: `const result = await pool.query(`
- Line 461: `await pool.query('DELETE FROM recurring_payments WHERE id = $1', [req.params.id]);`
- Line 471: `await pool.query('UPDATE recurring_payments SET status = $1 WHERE id = $2', ['paused', req.params.id...`
- Line 481: `await pool.query('UPDATE recurring_payments SET status = $1 WHERE id = $2', ['active', req.params.id...`
- Line 491: `const result = await pool.query('SELECT * FROM receipts ORDER BY created_at DESC');`
- Line 502: `const result = await pool.query('SELECT * FROM receipts WHERE id = $1', [id]);`
- Line 515: `const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');`
- Line 526: `const result = await pool.query(`
- Line 541: `const result = await pool.query(`
- Line 554: `await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);`
- Line 564: `const result = await pool.query('SELECT * FROM pledges ORDER BY created_at DESC');`
- Line 575: `const result = await pool.query(`
- Line 590: `const result = await pool.query(`
- Line 603: `await pool.query('DELETE FROM pledges WHERE id = $1', [req.params.id]);`
- Line 613: `const result = await pool.query('SELECT * FROM pledge_campaigns ORDER BY created_at DESC');`
- Line 624: `const result = await pool.query(`

#### controllers\users.controller.js

- Line 6: `const result = await pool.query(``
- Line 28: `const result = await pool.query(``
- Line 54: `const result = await pool.query(`
- Line 62: `const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);`
- Line 64: `await pool.query(`
- Line 84: `const result = await pool.query(`
- Line 95: `await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);`
- Line 97: `const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);`
- Line 99: `await pool.query(`
- Line 118: `const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);`

#### controllers\userSettings.controller.js

- Line 10: `const result = await pool.query(`
- Line 17: `const insertResult = await pool.query(`
- Line 175: `const result = await pool.query(query, values);`
- Line 184: `const insertResult = await pool.query(insertQuery, values);`
- Line 218: `const userResult = await pool.query(`
- Line 240: `await pool.query(`
- Line 261: `const result = await pool.query(`
- Line 269: `const countResult = await pool.query(`

### Helpers

#### helpers\activityLogger.js

- Line 9: `const result = await pool.query(`

#### helpers\auditLog.js

- Line 51: `const result = await pool.query(query, [`

#### helpers\fieldPermissionService.js

- Line 6: `const result = await pool.query(`
- Line 33: `const userResult = await pool.query(`
- Line 51: `const result = await pool.query(`
- Line 74: `await pool.query(`
- Line 100: `const userResult = await pool.query(`

#### helpers\galleryCache.js

- Line 13: `await pool.query(`
- Line 36: `const result = await pool.query(`
- Line 86: `const result = await pool.query(query, params);`
- Line 99: `await pool.query(`
- Line 115: `const result = await pool.query(`
- Line 138: `const result = await pool.query(``
- Line 184: `const expiredResult = await pool.query(`

#### helpers\notify.js

- Line 41: `const result = await pool.query(query, [`
- Line 83: `const deptResult = await pool.query(deptQuery, [departmentId]);`
- Line 91: `const adminsResult = await pool.query(adminsQuery, [departmentId]);`

#### helpers\reportScheduler.js

- Line 22: `const result = await pool.query(`
- Line 89: `await pool.query(`
- Line 103: `await pool.query(`
- Line 144: `const result = await pool.query(query, params);`

#### helpers\workflowEngine.js

- Line 7: `const workflowResult = await pool.query(`
- Line 20: `const approvalResult = await pool.query(`
- Line 57: `await pool.query(`
- Line 66: `await pool.query(`
- Line 80: `const approvalResult = await pool.query(`
- Line 97: `const currentApprovals = await pool.query(`
- Line 107: `await pool.query(`
- Line 143: `await pool.query(`
- Line 152: `await pool.query(`
- Line 169: `await pool.query(`
- Line 176: `await pool.query(`
- Line 189: `await pool.query(`
- Line 196: `await pool.query(`
- Line 209: `await pool.query(`
- Line 217: `await pool.query(`
- Line 223: `await pool.query(`
- Line 236: `const result = await pool.query(`

### Middleware

#### middleware\auth.js

- Line 16: `const rolesResult = await pool.query(`
- Line 24: `const permissionsResult = await pool.query(`
- Line 91: `const permissionResult = await pool.query(`

#### middleware\treasurySecurity.js

- Line 65: `await pool.query(query, [`

### Repositories

#### repositories\base.repository.js

- Line 73: `const result = await this.pool.query(query, params);`
- Line 99: `const result = await this.pool.query(query, [id]);`
- Line 127: `const result = await this.pool.query(query, values);`
- Line 151: `const result = await this.pool.query(query, [...values, id]);`
- Line 165: `const result = await this.pool.query(query, [id]);`
- Line 186: `const result = await this.pool.query(query, params);`
- Line 213: `const result = await this.pool.query(sql, params);`
- Line 221: `const result = await this.pool.query(sql, params);`

### Services

#### services\accounting.service.js

- Line 41: `const result = await pool.query(query, params);`
- Line 46: `const accountResult = await pool.query(accountQuery, [accountId]);`
- Line 86: `const result = await pool.query(query, params);`
- Line 242: `const budgetsResult = await pool.query(budgetsQuery, [fiscalYear]);`
- Line 263: `const actualResult = await pool.query(actualQuery, [budget.account_id, fiscalYear]);`
- Line 268: `await pool.query(`
- Line 308: `const result = await pool.query(query, params);`
- Line 409: `const assetResult = await pool.query(assetQuery, [assetId]);`
- Line 457: `const result = await pool.query(query, [accountId, startDate, endDate]);`

#### services\telegramMTProto.js

- Line 300: `const defaultAlbum = await pool.query(`
- Line 305: `const newAlbum = await pool.query(`
- Line 324: `const existing = await pool.query(`
- Line 335: `await pool.query(`

#### services\telegramService.js

- Line 13: `const result = await pool.query('SELECT * FROM telegram_settings WHERE id = 1');`
- Line 182: `const channelResult = await pool.query(`
- Line 194: `await pool.query(`
- Line 209: `const channel = await pool.query(`
- Line 225: `const channelResult = await pool.query(`
- Line 237: `await pool.query(`
- Line 254: `const channelResult = await pool.query(`
- Line 266: `await pool.query(`
- Line 276: `const postResult = await pool.query(`
- Line 282: `await pool.query(`
- Line 297: `await pool.query(`
- Line 323: `await pool.query(`
- Line 347: `const postResult = await pool.query(`
- Line 362: `const announcementResult = await pool.query(`
- Line 374: `await pool.query(`
- Line 396: `await pool.query(`
- Line 403: `const expiredResult = await pool.query(`

### Routes with Inline Queries

#### routes\audit-logs.routes.js

- Line 83: `const result = await pool.query(query, params);`
- Line 115: `const result = await pool.query(query, [id]);`
- Line 151: `const deptCheck = await pool.query(`
- Line 156: `const adminCheck = await pool.query(`
- Line 191: `const result = await pool.query(query, [departmentId, limit, offset]);`

#### routes\dashboard.routes.js

- Line 11: `const membersResult = await pool.query(`
- Line 18: `const paymentsResult = await pool.query(`
- Line 33: `const eventsResult = await pool.query(`
- Line 47: `const announcementsResult = await pool.query(`
- Line 60: `const approvalsResult = await pool.query(`
- Line 71: `const notificationsResult = await pool.query(`
- Line 99: `const membersResult = await pool.query(`
- Line 106: `const paymentsResult = await pool.query(`
- Line 121: `const eventsResult = await pool.query(`
- Line 135: `const announcementsResult = await pool.query(`
- Line 181: `const paymentsResult = await pool.query(paymentsQuery, [limit]);`
- Line 202: `const announcementsResult = await pool.query(announcementsQuery, [limit]);`
- Line 223: `const eventsResult = await pool.query(eventsQuery, [limit]);`
- Line 294: `const result = await pool.query(`
- Line 321: `const result = await pool.query(`
- Line 346: `const result = await pool.query(`
- Line 377: `await pool.query('SELECT 1');`
- Line 385: `const result = await pool.query(`

#### routes\department-categories.routes.js

- Line 10: `const result = await pool.query(`
- Line 24: `const result = await pool.query(`
- Line 49: `const result = await pool.query(`
- Line 78: `const result = await pool.query(`
- Line 117: `const deptCheck = await pool.query(`
- Line 128: `const result = await pool.query(`

#### routes\department.routes.js

- Line 26: `const result = await pool.query(`
- Line 65: `const availableDepartments = await pool.query(``
- Line 123: `const result = await pool.query(``
- Line 146: `const result = await pool.query(``
- Line 214: `const beforeState = await pool.query(`
- Line 219: `await pool.query(``
- Line 259: `const departmentCheck = await pool.query(``
- Line 283: `const pendingRequests = await pool.query(``
- Line 321: `const departmentCheck = await pool.query(``
- Line 345: `const result = await pool.query(``
- Line 406: `const departmentCheck = await pool.query(``
- Line 430: `const result = await pool.query(``
- Line 499: `const accessCheck = await pool.query(``
- Line 512: `const communications = await pool.query(``
- Line 555: `const accessCheck = await pool.query(``
- Line 568: `const members = await pool.query(``
- Line 610: `const accessCheck = await pool.query(``
- Line 623: `const meetings = await pool.query(``
- Line 664: `const accessCheck = await pool.query(``
- Line 677: `const tasks = await pool.query(``
- Line 720: `const accessCheck = await pool.query(``
- Line 735: `const memberCheck = await pool.query(``
- Line 748: `const result = await pool.query(``
- Line 782: `const accessCheck = await pool.query(``
- Line 796: `const taskCheck = await pool.query(``
- Line 808: `const result = await pool.query(``
- Line 842: `const accessCheck = await pool.query(``
- Line 856: `const taskCheck = await pool.query(``
- Line 868: `await pool.query(``
- Line 899: `const accessCheck = await pool.query(``
- Line 912: `const resources = await pool.query(``

#### routes\departments.routes.js

- Line 27: `const result = await pool.query(query);`
- Line 51: `const result = await pool.query(query, [identifier]);`
- Line 71: `const deptResult = await pool.query(deptQuery, [identifier]);`
- Line 87: `const memberResult = await pool.query(memberQuery, [department.id]);`
- Line 124: `const result = await pool.query(query, [id]);`
- Line 138: `const result = await pool.query(`
- Line 160: `const result = await pool.query(`
- Line 181: `const result = await pool.query(`
- Line 204: `const result = await pool.query(`
- Line 236: `const result = await pool.query(query, [name, description, head_id, category, parent_department_id, ...`
- Line 283: `const deptResult = await pool.query(deptQuery, [identifier]);`
- Line 305: `const beforeState = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);`
- Line 330: `const result = await pool.query(updateQuery, [name, description, head_id, category, newSlug, id]);`
- Line 367: `const deptResult = await pool.query(deptQuery, [id]);`
- Line 382: `const result = await pool.query(query, [user_id, id, role_in_department]);`
- Line 431: `const deptResult = await pool.query(deptQuery, [id]);`
- Line 439: `const beforeState = await pool.query(`
- Line 444: `await pool.query('DELETE FROM department_members WHERE department_id = $1 AND user_id = $2', [id, us...`
- Line 538: `const result = await pool.query(query, params);`
- Line 572: `const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);`
- Line 646: `const deptResult = await pool.query(deptQuery, [identifier]);`
- Line 654: `const result = await pool.query(`
- Line 677: `const deptResult = await pool.query(deptQuery, [identifier]);`
- Line 685: `const result = await pool.query(`
- Line 717: `const deptResult = await pool.query(deptQuery, [identifier]);`
- Line 725: `const result = await pool.query(`

#### routes\events.routes.js

- Line 89: `const result = await pool.query(query, params);`
- Line 95: `const countResult = await pool.query(countQuery, params.slice(0, -2));`
- Line 126: `const result = await pool.query(query, [id]);`
- Line 145: `const deptMemberResult = await pool.query(deptMemberQuery, [req.user.id, event.department_id]);`
- Line 161: `const attendeesResult = await pool.query(attendeesQuery, [id]);`
- Line 207: `const result = await pool.query(query, [`
- Line 260: `const checkResult = await pool.query(checkQuery, [`
- Line 303: `const result = await pool.query(updateQuery, [`
- Line 337: `const eventResult = await pool.query(eventQuery, [req.user.id, id]);`
- Line 352: `const countResult = await pool.query(countQuery, [id]);`
- Line 367: `const result = await pool.query(registerQuery, [id, req.user.id]);`
- Line 388: `const result = await pool.query(`
- Line 425: `const eventResult = await pool.query(eventQuery, [id]);`
- Line 438: `const result = await pool.query(`
- Line 475: `const checkResult = await pool.query(checkQuery, [`
- Line 490: `await pool.query('DELETE FROM events WHERE id = $1', [id]);`
- Line 516: `const result = await pool.query(query, [id]);`
- Line 558: `const checkResult = await pool.query(checkQuery, [`
- Line 579: `const result = await pool.query(query, [`
- Line 787: `const result = await pool.query(query, [id]);`

#### routes\health.js

- Line 9: `await pool.query('SELECT 1');`

#### routes\users.routes.js

- Line 20: `const result = await pool.query(`
- Line 89: `const result = await pool.query(query, params);`
- Line 112: `const countResult = await pool.query(countQuery, countParams);`
- Line 174: `const result = await pool.query(query, params);`
- Line 197: `const countResult = await pool.query(countQuery, countParams);`
- Line 236: `const result = await pool.query(query, [id]);`
- Line 251: `const deptResult = await pool.query(deptQuery, [id]);`
- Line 300: `const result = await pool.query(updateQuery, [`
- Line 347: `const result = await pool.query(query, [id, role_id]);`
- Line 374: `const result = await pool.query(`
- Line 399: `const result = await pool.query(`
- Line 439: `const paymentsResult = await pool.query(paymentsQuery, [userId, limit]);`
- Line 451: `const profileResult = await pool.query(profileQuery, [userId]);`
- Line 483: `const userResult = await pool.query(userQuery, [userId]);`
- Line 509: `await pool.query(updateQuery, [hashedPassword, userId]);`
- Line 532: `const result = await pool.query(`

### Modules

#### modules\payments\repositories\payment.repository.js

- Line 55: `const result = await this.pool.query(query, params);`
- Line 61: `const countResult = await this.pool.query(countQuery, params.slice(0, -2));`
- Line 94: `const result = await this.pool.query(query, [id]);`
- Line 100: `const result = await this.pool.query(query, [transactionId]);`
- Line 141: `const result = await this.pool.query(query, [`
- Line 166: `const result = await this.pool.query(query, [`
- Line 203: `const result = await this.pool.query(query, [paymentId]);`
- Line 214: `const result = await this.pool.query(query);`
- Line 220: `const result = await this.pool.query(query, [id]);`
- Line 237: `const result = await this.pool.query(query, [`
- Line 260: `const result = await this.pool.query(query, [`
- Line 282: `const result = await this.pool.query(query, [startDate, endDate]);`

#### modules\payments\services\payment.service.js

- Line 151: `await this.pool.query(`

#### modules\treasury\repositories\account.repository.js

- Line 59: `const result = await this.pool.query(query.sql, query.params);`
- Line 89: `const result = await this.pool.query(query.sql, query.params);`
- Line 97: `const result = await this.pool.query(`
- Line 108: `const result = await this.pool.query(`
- Line 119: `const result = await this.pool.query(`
- Line 151: `const result = await this.pool.query(query);`
- Line 185: `const result = await this.pool.query(query, params);`
- Line 207: `const result = await this.pool.query(query, [`
- Line 241: `const result = await this.pool.query(query, [`
- Line 266: `const checkResult = await this.pool.query(checkQuery, [id]);`
- Line 272: `const result = await this.pool.query(`

#### modules\treasury\repositories\budget.repository.js

- Line 56: `const result = await this.pool.query(query, params);`
- Line 74: `const result = await this.pool.query(query, [id]);`
- Line 93: `const result = await this.pool.query(query, [`
- Line 114: `const result = await this.pool.query(query, [`
- Line 156: `const result = await this.pool.query(query, [id]);`
- Line 162: `await this.pool.query(``
- Line 188: `const result = await this.pool.query(query, [threshold]);`
- Line 211: `const result = await this.pool.query(query, [fiscalYear]);`

#### modules\treasury\repositories\expense.repository.js

- Line 72: `const result = await this.pool.query(query, params);`
- Line 96: `const result = await this.pool.query(query, [id]);`
- Line 116: `const result = await this.pool.query(query, [`
- Line 137: `const result = await this.pool.query(query, [`
- Line 156: `const result = await this.pool.query(query, [approverId, id]);`
- Line 169: `const result = await this.pool.query(query, [reason, id]);`
- Line 181: `const result = await this.pool.query(query, [id]);`
- Line 195: `const result = await this.pool.query(query);`
- Line 212: `const result = await this.pool.query(query, [startDate, endDate]);`

#### modules\treasury\repositories\fund.repository.js

- Line 31: `const result = await this.pool.query(query, [fundCode]);`
- Line 49: `const result = await this.pool.query(query, [`
- Line 68: `const result = await this.pool.query(query, [`
- Line 84: `const result = await this.pool.query(query, [amount, id]);`
- Line 101: `const result = await this.pool.query(query);`

#### modules\treasury\repositories\journalEntry.repository.js

- Line 61: `const result = await this.pool.query(query, params);`
- Line 79: `const result = await this.pool.query(query, [id]);`
- Line 95: `const result = await this.pool.query(query, [journalEntryId]);`
- Line 247: `const result = await this.pool.query(query, params);`

---

*This document is auto-generated by extract-routes-and-db.js*
