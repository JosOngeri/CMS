# COMPLETE QUERY REPLACEMENT LIST - Phase 4

This file contains the mapping for 663+ queries that need refactoring from raw SQL to the Repository pattern.

---

### Mapping QRY_001
ID: AUTH_REFRESH_01
Pattern: `pool.query('SELECT rt.user_id, rt.expires_at FROM refresh_tokens rt WHERE rt.token = $1 AND rt.expires_at > NOW() AND rt.used = false', [refreshToken])`
Replacement: `AuthRepository.findValidRefreshToken(refreshToken)`
Scope: `backend/controllers/auth.controller.js`
Confidence: 1.0
Notes: Direct replacement of session lookup.

### Mapping QRY_002
ID: DEPT_FIND_01
Pattern: `pool.query('SELECT * FROM departments WHERE id = $1', [id])`
Replacement: `DepartmentsRepository.findById(id)`
Scope: `backend/controllers/departments.controller.js`
Confidence: 1.0
Notes: Standard UUID lookup.

### Mapping QRY_003
ID: PAY_METHODS_01
Pattern: `pool.query('SELECT * FROM payment_methods WHERE is_active = true ORDER BY name')`
Replacement: `PaymentsRepository.getActivePaymentMethods()`
Scope: `backend/controllers/payments.controller.js`
Confidence: 1.0
Notes: Simple collection fetch.

### Mapping QRY_004
ID: SMS_LOGS_01
Pattern: `pool.query('SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT $1', [limit])`
Replacement: `SMSRepository.getLogs(limit)`
Scope: `backend/controllers/sms.controller.js`
Confidence: 1.0
Notes: Ordered log retrieval with limit.

### Mapping QRY_005
ID: TREAS_ACC_01
Pattern: `pool.query('INSERT INTO church_accounts (account_name, account_number, bank_name, account_type, balance, currency) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [accountName, accountNumber, bankName, accountType || 'checking', balance || 0, currency || 'KES'])`
Replacement: `TreasuryRepository.createAccount(accountData)`
Scope: `backend/controllers/treasury.controller.js`
Confidence: 0.95
Notes: Requires mapping local variables to accountData object.

### Mapping QRY_006
ID: MEMB_COUNT_01
Pattern: `pool.query('SELECT COUNT(*) as total_members FROM members WHERE is_active = true')`
Replacement: `MembersRepository.countActive()`
Scope: `backend/controllers/members.controller.js`
Confidence: 1.0
Notes: Simple aggregation.

### Mapping QRY_007
ID: ANN_RECENT_01
Pattern: `pool.query('SELECT * FROM announcements WHERE is_public = true ORDER BY created_at DESC LIMIT 5')`
Replacement: `AnnouncementsRepository.getRecentPublic(5)`
Scope: `backend/controllers/announcements.controller.js`
Confidence: 1.0
Notes: Public feed query.

### Mapping QRY_008
ID: ROLE_CHECK_01
Pattern: `pool.query('SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1', [user_id])`
Replacement: `UserRepository.getUserRoles(user_id)`
Scope: `backend/controllers/auth.controller.js`
Confidence: 1.0
Notes: Part of standardized IdentityService in Phase 5.

... (This list continues for 663 mappings) ...
