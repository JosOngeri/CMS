# APPENDIX A — QUICK-WIN TASKS (< 10 minutes each)
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

- [ ] 🔴 `auth.js` line 1: add `const { pool } = require('../config/database');`
- [ ] 🔴 `auth.js` line 150: change `permissions[permission]` → `permissions.includes(permission)`
- [ ] 🔴 `reconciliationService.js` line 188: change `pending` → `params`
- [ ] 🔴 `reconciliationService.js` line 220: change `reconciled IS NULL` → `reconciled_at IS NULL`
- [ ] 🔴 `tenantResolver.js` line 65: wrap church_id in parameterized query
- [ ] 🔴 `tenantResolver.js` line 89: same fix
- [ ] 🔴 `passport.js` line 19: add optional chaining to `profile.emails?.[0]?.value`
- [ ] 🔴 `identityGuard.js` line 44: change `req.churchId` → `req.church_id`
- [ ] 🟠 `dashboard.controller.js` line 115: change `activities.splice(limit)` → `activities.slice(0, limit)`
- [ ] 🟠 `env-validation.js` line 48: change `'DB_PASSWORD'` → `'PGPASSWORD'`
- [ ] 🟠 `logging.js` line 9: wrap pino-pretty in `NODE_ENV === 'development'` check
- [ ] 🟠 `IdentityService.js` line 144: move `require('speakeasy')` to top of file
- [ ] 🟠 `notificationService.js` line 210: add `if (!notifications?.length) return;` guard
- [ ] 🟠 `database.js` line 13: change `rejectUnauthorized: false` → `true`
- [ ] 🟠 `UsersRepository.js` line 156: change `password` column → `password_hash`
- [ ] 🟠 `TaxStatementRepository.js` line 157: change `totalAmount` → `total_amount`
- [ ] 🟠 `SecurityRepository.js` line 93: change `timestamp` column → `created_at`
- [ ] 🟠 `SearchRepository.js` line 125: change `FROM users` → `FROM members` in `globalSearchMembers`
- [ ] 🟠 `SearchRepository.js` line 135: change `name` column → `title` in `globalSearchDocuments`
- [ ] 🟠 `server.js` line 96: change `global.io = io` → `module.exports.io = io`
- [ ] 🟠 `payments.routes.js`: add role check to `POST /`
- [ ] 🟠 `008_permissions_schema.sql` lines 27–28: remove duplicate index definition
- [ ] 🟠 `useActivityFeed.js` lines 92–96: implement the empty auto-fetch useEffect
- [ ] 🟠 `useActivityFeed.js` lines 99–107: implement the empty polling useEffect
- [ ] 🟠 `ProtectedRoute.jsx` lines 10, 24, 37, 42: wrap console.logs in `import.meta.env.DEV &&`
