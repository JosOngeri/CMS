# 2026-10-04 18:47 EAT — Church Settings Configurable by Platform Admin

Goal: every setting a church admin edits at `/{church}/dashboard/admin/settings`
(1) actually does something, and (2) is viewable/overridable by the platform
admin per-tenant. Status column: `OPEN` = not started, `DONE` = verified,
`N/A` = intentionally skipped.

## Current state (verified 2026-10-04)

- Two disjoint stores: `settings` table (65 rows, 13 categories, church
  override via `church_id` column — only 3 override rows in prod) vs
  `churches.settings` jsonb (tenancy metadata; empty `{}` on all churches).
- **Most settings are dead**: zero backend runtime code reads the `settings`
  table. Only `/api/settings/public` consumers (logo, colors, church name) are
  live. `sms_enabled`, `session_timeout`, `enable_treasury`, etc. save but do
  nothing.
- **Platform admin is blind**: `PUT /platform/tenants/:id/settings` writes raw
  JSON to `churches.settings` — the wrong store for functional settings.
- **Secrets in plaintext**: `payment/mpesa_passkey`, `sms/sms_api_key` are
  readable rows.
- Migration ledger max: `088`. Next free: `089`.

## 0. Settings manifest (single catalog)

| # | Task | Files | Status |
|---|---|---|---|
| 0.1 | Create `backend/constants/settingKeys.js`: every key → `{key, category, type, scope: global\|church\|both, secret, enforced_by, default}` | `backend/constants/settingKeys.js` | OPEN |
| 0.2 | Reconcile manifest vs `settings` table rows — flag keys in DB not in manifest and vice versa; print report | `backend/scripts/audit-settings-keys.js` | OPEN |

## 1. Boundary + migration 089

| # | Task | Files | Status |
|---|---|---|---|
| 1.1 | Rule: `settings` table = functional church config; `churches.settings` = tenancy metadata only (tier, billing, contact). No cross-writes | docstring `repositories/SettingsRepository.js` | OPEN |
| 1.2 | Migration 089: `is_editable=false` on global-scope keys at church level (`mpesa_passkey`, `sms_api_key`, `sms_provider`, `mpesa_shortcode`, `mpesa_environment`); backfill missing global rows from manifest; seed realistic values all 4 churches (idempotent, no NULLs) | `backend/migrations/089_settings_scope_cleanup.sql` | OPEN |
| 1.3 | Verify migration applied: row counts, `church_id IS NULL` coverage, spot-check one church's resolved set | `backend/scripts/audit-settings-keys.js` | OPEN |

## 2. Platform settings API (per-tenant)

| # | Task | Files | Status |
|---|---|---|---|
| 2.1 | `GET /platform/tenants/:id/settings` → resolved view: `{value, source: 'global'\|'override', label, type, validation_rules, is_editable}` — reuse `SettingsRepository` merge logic with arbitrary `church_id` | `repositories/SettingsRepository.js`, `controllers/platformTenancy.controller.js`, `routes/platform.routes.js` | OPEN |
| 2.2 | `PUT /platform/tenants/:id/settings` → bulk upsert `church_id` override rows; validate `value_type` + `validation_rules`; secret keys write-only | same | OPEN |
| 2.3 | `DELETE /platform/tenants/:id/settings/:key` → drop override → revert to global | same | OPEN |
| 2.4 | Mask secrets on read (`***`); never return plaintext for `secret: true` keys | `platformTenancy.controller.js` serializer | OPEN |
| 2.5 | All writes through `auditPlatformAction` with changed keys | `platformTenancy.controller.js`, `services/platformAudit.service.js` | OPEN |
| 2.6 | Permission: reuse `tenant:administer` (or add `tenant:settings` — decision TBD) | `constants/platformPermissions.js`, migration if new | OPEN |

## 3. Platform UI — tenant settings editor

| # | Task | Files | Status |
|---|---|---|---|
| 3.1 | Add "Settings" tab to `TenantDetail`: category accordion, typed inputs from manifest, per-key badge `Inherited`/`Overridden`, `Reset` button, dirty-state bulk save | `pages/platform/tenants/TenantDetail.jsx`, new `components/platform/TenantSettingsEditor.jsx` | OPEN |
| 3.2 | Secret fields: `•••` display + "Change" toggle, never echo value | same | OPEN |
| 3.3 | No hardcoded colors — CSS-var tokens only | same | OPEN |

## 4. Make dead settings live (the "all settings work" half)

Wire each manifest entry's `enforced_by`. One row per wiring:

| # | Key(s) | Consumer to wire | Status |
|---|---|---|---|
| 4.1 | `features/enable_*` (4 keys) | module gating — `contexts/AuthContext.jsx` nav/menu + backend route guard where relevant | OPEN |
| 4.2 | `security/session_timeout` | JWT TTL for church-user tokens — `controllers/auth.controller.js` | OPEN |
| 4.3 | `security/password_min_length` | password change/reset validators — shared rule helper | OPEN |
| 4.4 | `security/require_2fa` | login flow flag — `controllers/auth.controller.js` | OPEN |
| 4.5 | `members/member_id_prefix`, `member_auto_id` | member ID generation — `services/MemberService.js` | OPEN |
| 4.6 | `service/*_time`, `pastor_name` | public service times + dashboard — verify `/api/settings/public` consumers display them | OPEN |
| 4.7 | `notifications/email_notifications`, `sms_notifications` | dispatch gate — `repositories/NotificationsRepository.js` | OPEN |
| 4.8 | `sms/*`, `payment/mpesa_*` | global-scope provider config — move to env-backed/platform-level read; not per-church | OPEN |
| 4.9 | `appearance/*`, `seo/*`, `social/*`, `contact/*`, `general/*` | `enforced_by: 'public-site'` — verify end-to-end via `/api/settings/public` | OPEN |

## 5. Church-admin side

| # | Task | Files | Status |
|---|---|---|---|
| 5.1 | `SiteSettings.jsx` reads manifest-driven categories; lock icon + "Managed by platform" on `is_editable=false` keys | `pages/settings/SiteSettings.jsx` | OPEN |
| 5.2 | Church admins stop writing secret keys (global-only scope) | `controllers/settings.controller.js` guard | OPEN |

## 6. Verification gate

| # | Task | Files | Status |
|---|---|---|---|
| 6.1 | `backend/scripts/verify-settings.js`: per manifest key — write via platform API → read via church API → confirm consumer reads it. Run in dev; add to CI later | `backend/scripts/verify-settings.js` | OPEN |
| 6.2 | Unit tests: platform override CRUD, secret masking, revert-to-global, `tenant:administer` gate | `backend/tests/unit/platformSettings.test.js` | OPEN |
| 6.3 | Frontend build + lint pass; manual click-through on one tenant | — | OPEN |

## Decisions needed (block implementation of 1.2 / 2.6 / 4.8)

- [ ] SMS/payment provider creds: global-only (recommended) vs per-church KopoKopo accounts
- [ ] New `tenant:settings` permission vs reuse `tenant:administer`

## Findings (fill in during implementation)

- _empty_
