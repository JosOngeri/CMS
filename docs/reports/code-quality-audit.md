# Code-Quality Audit — KMainCMS

**Date:** 2026-09-30
**Scope:** 401 live files (173 frontend, 222 backend, 6 mobile lib) from `codebase-map.html`
**Method:** pattern sweeps + targeted reads on every flag; dead files excluded (already in `dead-code-verification.md`).

---

## Summary verdict

The code is **functional and reasonably well-organized** — consistent layering
(route → controller → repository), a real design-token system, no SQL injection,
no command injection. The problems are **drift and duplication**, not architecture.
The same patterns were re-implemented in slightly different ways across phases,
leaving multiple response shapes, duplicate route mounts, and repeated UI
class-strings that will make future changes error-prone.

---

## Top findings (ranked by blast radius)

### A1. Three response conventions coexist — API contract is inconsistent
`utils/ResponseHandler` (proper `{success, message, data, error, timestamp}` + PII
masking), `this.success()/this.error()` on BaseController, and **raw `res.json`**
with ad-hoc shapes (`{categories: r}`, `{error: msg}`) across route files.

| Convention | Files | Example |
|---|---|---|
| `ResponseHandler` | auth, ai, approvals, chat, collection controllers | `{success:true,data:{}}` |
| `this.success/error` | most controllers | `{success:true,data:{}}` |
| raw `res.json` | `department-categories.routes.js` (16), `departments.routes.js` (50), `department.routes.js` (50), `department_community.routes.js` (105), `department_finance.routes.js` (89), `department_leadership.routes.js` (43), `events.routes.js` (56), `users.routes.js` (35), `mpesa.routes.js` (14), `apk.routes.js` (5) | `{categories: r}` or `{error: msg}` |

The raw-shape files return `{categories: r}` (no `success` flag) while the rest
return `{success:true, data:{...}}` — the frontend has to guess the envelope.
**Fix:** route all responses through `ResponseHandler` (it's already built and
does PII masking for free).

### A2. Duplicate route mounts — drift creates real risk
`index.routes.js` mounts BOTH singular and plural twins:

- `/api/departments` → `departments.routes.js` **and** `/api/department` → `department.routes.js` (and departments is mounted 4× more for community/leadership/finance)
- `/api/payments` → `payments.routes.js` **and** `/api/payment` → `payment.routes.js`

Two parallel implementations of the same resource mean a fix applied to one
(e.g. adding a `church_id` filter) silently doesn't reach the other.
**Fix:** pick one mount per resource, delete the other, redirect old paths.

### A3. Route files doing business logic inline
Six route files bypass the repository layer with inline `pool.query` —
`department_community.routes.js` (46 queries), `department_finance.routes.js` (31),
`department.routes.js` (27), `departments.routes.js` (26),
`department_leadership.routes.js` (23), `events.routes.js` (18).
Against the `.windsurfrules` layering rule and duplicates repository logic.
**Fix:** extract to `*Repository` methods; routes should call one method and
shape the response.

### A4. Duplicated UI primitives — no shared component layer
The same Tailwind strings are re-typed across pages:

| Class string | Occurrences | Should be |
|---|---|---|
| `text-sm text-[var(--color-textSecondary)]` | 172 | `<Text variant="secondary">` |
| `flex items-center justify-between` | 97 | `<Toolbar>` / `<Row>` |
| `block text-sm font-medium ... mb-2` (label) | 90 | `<Label>` |
| `w-full px-4 py-2 border ... rounded-lg` (input) | 67 | `<Input>` |
| `text-2xl font-bold text-[var(--color-text)]` | 67 | `<PageTitle>` |
| `grid grid-cols-1 md:grid-cols-2 gap-4` | 33 | `<TwoCol>` |

Per-file date/money helpers are defined separately in ~9 files each with
**different formats** (`fmtDate` shows `1 Oct` in one page, `Wed 1 Oct` in
another, default `toLocaleDateString()` elsewhere; `fmtKES` re-declared per file).
**Fix:** extract `components/ui/{Input,Label,Toolbar,PageTitle}.jsx` and
`utils/format.js` with one `fmtKES`, one `fmtDate`, one `fmtDateTime`.

### A5. Repositories without `church_id` scoping (feeds the security report)
Nine live repositories contain 3+ queries and zero `church_id` references.
Most are legitimately global (auth tokens, settings, categories) — but
`CommentsRepository`, `ActivityFeedRepository`, `AuditLogRepository` hold
per-church data and should be verified:

- `repositories/CommentsRepository.js` (6 queries)
- `repositories/ActivityFeedRepository.js` (4 queries)
- `repositories/AuditLogRepository.js` (5 queries)
- `repositories/AccountingExportRepository.js` (8 queries)
- `repositories/TelegramAuthRepository.js` (9 queries)
- `repositories/UserSettingsRepository.js` (9 queries)

(Church-agnostic by design: `AuthRepository`, `base.repository`,
`DepartmentCategoriesRepository`.)

### A6. `console.*` left in production code — 85 files
`DashboardShell.jsx` alone logs a connection probe on every mount.
**Fix:** wrap in `import.meta.env.DEV` or strip via `esbuild.drop` in
`vite.config.js`.

### A7. Minor: `console.log` health probe on every dashboard mount
`DashboardShell.jsx` lines 18-35 fire an `/api/health` GET + console.log on
every dashboard mount — noise in prod, remove or gate to dev.

---

## Pattern-level findings (lower risk, logged)

- **N+1-risk files** (loop + `await query`): `ApprovalsRepository`,
  `DashboardRepository`, `DepartmentsRepository`, `MobileRepository`,
  `NotificationsRepository` — spot-check whether the await is inside the loop.
- **`utils/jwt.js`** — dead file w/ fallback JWT secret; delete (also in
  security report L1).
- **`RichTextEditor.jsx`** — dead file w/ un-sanitized `innerHTML`; delete (L3).
- **`sms/`, `telegram/` feature folders** — dead feature stubs; decide keep or
  archive before relying on the dead-code purge list.
- **`MobileRepository.js`/`MobileController`** — partially separate API surface
  for mobile; verify it doesn't duplicate member/payment logic.

## What's clean (verified)

- All mounted routes apply auth middleware (27/27 mounts verified)
- Parameterized SQL everywhere live; only whitelisted table/column-name
  interpolation
- No `eval`, no `new Function`, no unguarded `dangerouslySetInnerHTML` in live
  frontend code
- `spawn` calls use arg-arrays (no shell injection)
- `exec` only in dead `testing.controller.js` + dev `killPort.js`
- PII redaction in pino logger is configured correctly
- `.env` is gitignored and untracked
