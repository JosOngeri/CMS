# Phase 19 — CODE QUALITY AND TECH DEBT
**Part of:** KMainCMS Master Todo List
**Priority:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

### 19.1 Console.log Cleanup

- [ ] 🟡 Search codebase for all `console.log(` calls in frontend production code: `grep -r "console.log" frontend/src --include="*.jsx" --include="*.js"` — replace all with `import.meta.env.DEV && console.log(...)` guards
- [ ] 🟡 Search backend for debug `console.log` calls: replace with `logger.debug(...)` from the pino logger

### 19.2 Hardcoded Values

- [ ] 🟡 Search for all `'Super Admin'`, `'Pastor'`, `'First Elder'`, `'Treasurer'` string literals across the entire codebase — move to a shared `backend/config/roles.js` and `frontend/src/config/roles.js` constant files
- [ ] 🟡 Search for all hardcoded `LIMIT 5`, `LIMIT 10`, `LIMIT 20` in repository SQL queries — replace with a `limit` parameter

### 19.3 Error Messages

- [ ] 🟡 Audit all `catch (err)` blocks in controllers — ensure they call `next(err)` or return a structured `{ success: false, error: ... }` response, not an empty catch
- [ ] 🟡 Standardize all error response shapes to `{ success: false, error: string, details?: object, code?: string }` across all controllers

### 19.4 Dead Code

- [ ] 🟢 Remove commented-out blocks in `DataTable.jsx` lines 109 after implementing real Excel/PDF export
- [ ] 🟢 Search for any `// TODO`, `// FIXME`, `// HACK` comments across the codebase and file them as separate tasks
