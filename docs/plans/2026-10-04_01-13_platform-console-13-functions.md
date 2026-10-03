# Platform Console — 13 Function Areas (plan)

Date: 2026-10-04 01:13

## Goal

Restructure the platform console (`/platform/*`) navigation into the same
rail + sub-sidebar pattern as the church dashboard, and lay out the full
SaaS-superadmin information architecture: all 13 function areas become
visible, navigable panel sections. Areas that exist today link to real
pages; areas not yet built link to a roadmap page that lists the planned
functions (so the console reads like a finished product map instead of a
half-filled menu).

## Design

- **Rail** (top-level, ≤8 entries): Home, Tenants, Staff, Operations,
  Business, Support, System.
- **Panel** per rail entry: sections titled by the 13 function areas:
  1. Tenant Lifecycle
  2. Tenant Administration
  3. Platform Staff
  4. Monitoring & Health
  5. Payments & Financial Oversight
  6. Security & Compliance
  7. Data Management
  8. Disaster & Incident
  9. Billing & Revenue
  10. Analytics & Reporting
  11. Communication
  12. Support Operations
  13. Platform Configuration
- **Rail retreats to icons** while a panel is open (desktop) — same
  behavior as the church sidebar (w-64 → w-20 + w-64 panel).
- **Icon rail + panel = 21rem** total; mobile panel slides over the
  drawer with a back button.

## Files

| File | Change |
|---|---|
| `frontend/src/constants/platformNav.js` | NEW — rail entries + section/item catalog + `PLATFORM_AREAS` roadmap data (title, description, planned-function checklist per unbuilt area) |
| `frontend/src/pages/platform/PlatformRoadmap.jsx` | NEW — `/platform/roadmap/:slug` page rendering an area's planned-function checklist |
| `frontend/src/shells/PlatformShell.jsx` | rail+panel layout (mirrors `Sidebar.jsx`), adds `roadmap/:slug` route |
| (no backend changes) | existing platform routes reused; unbuilt items are nav-level only |

## Route mapping

Existing real routes stay as-is: `/platform`, `/platform/tenants`,
`/platform/tenants/create`, `/platform/tenants/:id`,
`/platform/tenants/:id/edit`, `/platform/analytics`,
`/platform/monitoring`, `/platform/audit`, `/platform/admins`,
`/platform/settings`.

Every planned-but-unbuilt item links to `/platform/roadmap/<slug>` where
`<slug>` is its function-area key (e.g. `tenant-admin-impersonate`).
`PlatformRoadmap` shows the area's purpose + the full planned checklist —
clicking a nav item is never a dead end.

## Access rules

- `platform_owner` sees everything.
- `Admins` item stays owner-only (existing behavior).
- Roadmap pages are informational — visible to all platform roles.

## Verification

- eslint 0 errors on touched files.
- `vite build` clean.
- Manual: each rail entry opens its panel; rail collapses to icons;
  `/platform/roadmap/<slug>` renders for every unbuilt item slug in the
  catalog (no 404s).

---

# Build Tracker

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done (add date +
commit hash when closing). Each task means: endpoint(s) implemented and
permission-gated, UI wired to a real route (remove the roadmap link in
`platformNav.js` when the real page lands), audit-logged where it
mutates, backend tests for the new endpoints, eslint + build clean.

## Progress log

- **Batch 1 (F1–F3)** — permission catalog + uniform gates + shared audit
  helper. Commit `ded84ea`.
- **Batch 2 (big slice)** — migration `078_platform_control_plane.sql`
  (22 platform tables + idempotent seeds), impersonation service +
  banner, tenant admin, fleet, payments feed, security center + enforced
  IP rules, data/incidents/billing/comms/support/config endpoints and
  pages. Backend suite 331 green, eslint 0 errors, `vite build` clean.
  Partial coverage (endpoints/UI exist, deeper features pending):
  4.6 alert *rules* engine, 5.3 statement upload, 6.4 tenant session
  inventory, 7.1 scheduled pg_dump, 7.2 export generation, 9.4 credit
  notes/PDF, 9.5 dunning automation, 10.2/10.4 growth+usage pages
  (endpoints only), 12.2 ticket-granted support access.

## Foundation (do first — every area depends on these)

- [x] F1. Platform permission catalog — `backend/constants/platformPermissions.js`
  holds `PLATFORM_PERMISSION_GROUPS` (13 areas, 30 permissions),
  `ROLE_PERMISSIONS` per role, `OWNER_ONLY_PERMISSIONS`; migration 077
  backfills stored rows (owner → `["*"]`, admin → 22, support → 5).
- [x] F2. `requirePlatformPermission` already existed; now sourced from
  the catalog; `/users` routes switched from role-check to
  `staff:manage` so permission gates are uniform.
- [x] F3. Shared audit helper — `auditPlatformAction(req, {...})` in
  `services/platformAudit.service.js` derives actor/ip/UA, supports
  `tenantId` (writes `details.tenant_id` + resourceType `tenant`), and
  an explicit `actorId` override for unauthenticated flows. All 12
  existing call sites converted.
- [x] F4. Impersonation infrastructure — short-lived token containing
  `{ platformUserId, tenantId, asUserId, expiresAt }`; frontend banner
  component shown while impersonating; "end impersonation" endpoint.
  (Build before the tasks that need it: 2.1, 11.2.)
- [ ] F5. Seed + idempotency rule for platform tables: every new table
  migration includes realistic seed data for all churches where the
  rule applies (project rule), `ON CONFLICT` guards.
- [x] F6. Real deploy verification — replace the echo in
  `deploy-vps.yml` with `curl /api/health` + retry, fail the run on
  non-200.

## 1. Tenant Lifecycle (`/platform/tenants*`)

- [x] 1.1 Tenant list / detail / create / edit pages + API (done —
  existing TenantList, TenantDetail, TenantCreate, TenantSettings).
- [x] 1.2 Onboarding checklist — `tenant_onboarding_state` table or
  JSONB column: logo set, admin invited, members imported, M-Pesa
  configured, first service scheduled; progress bar on TenantDetail.
- [x] 1.3 Trials — `trial_ends_at` on `churches`; list filter
  "trialing"; extend/convert actions; auto-flag when expired.
- [ ] 1.4 Tenant templates — snapshot roles/departments/categories from
  a source church; "create from template" option on TenantCreate.
- [ ] 1.5 Offboarding flow — export → archive → retention deadline →
  purge, with status on TenantDetail.

## 2. Tenant Administration (`/platform/tenant-admin`)

- [x] 2.1 Impersonate — uses F4; pick church → pick user → read-only or
  full mode; audit both ends; replace roadmap links.
- [x] 2.2 Reset tenant admin — force password reset + unlock for a
  chosen church admin; audit-logged.
- [x] 2.3 Tenant feature flags — `tenant_feature_flags (church_id,
  flag, enabled)`; toggles on TenantDetail; backend checks flags on
  module routes.
- [x] 2.4 Limits & quotas — columns on `churches` (member_cap,
  sms_credits, storage_cap, admin_seats); enforcement at member
  create / SMS send / upload.
- [ ] 2.5 Config override — platform-editable tenant settings editor
  (same fields churches self-edit); audit diff old→new.
- [x] 2.6 Tenant user list — church users with role, last_login,
  mfa, lockout state on TenantDetail tab.

## 3. Platform Staff (`/platform/staff`)

- [x] 3.1 Platform user CRUD (done — PlatformUsers + /users routes).
- [ ] 3.2 Role assignment UI constrained to the catalog from F1
  (dropdown of roles → permission preview).
- [ ] 3.3 Session revocation — `platform_sessions` table or token
  denylist; "revoke all sessions" per user.
- [ ] 3.4 MFA enforcement — `mfa_required` flag on platform_users;
  setup flow on next login; block API until enrolled.
- [ ] 3.5 Access audit view — filter platform_audit_logs by platform
  user (page exists; add actor filter).

## 4. Monitoring & Health (`/platform/monitoring*`)

- [x] 4.1 Base monitoring page (done — exists).
- [x] 4.2 Fleet dashboard — per-tenant status cards: users, active
  sessions, errors last 24h, last payment, SMS credit; new
  `/api/platform/fleet` endpoint.
- [ ] 4.3 Uptime & latency — request timing middleware writing
  aggregates; chart per endpoint.
- [ ] 4.4 Integration health — last-success/failure timestamps for
  M-Pesa webhook, SMS provider, Telegram, SMTP; red/amber/green.
- [x] 4.5 Background jobs — `platform_jobs` table or reuse existing;
  failed jobs list + retry button.
- [ ] 4.6 Alerting — `platform_alert_rules` + `platform_alerts`
  (table exists in migration 020); rule editor + email/Telegram notify.
- [ ] 4.7 Log explorer — structured app logs into DB or file tail;
  filter by tenant/severity/time.

## 5. Payments & Financial Oversight (`/platform/payments`)

- [x] 5.1 Cross-tenant payment feed — `/api/platform/payments`
  joining all churches' payments; filter by church/status/date.
- [x] 5.2 Failed & stuck queue — pending > 24h + webhook mismatches;
  "reconcile to completed/failed" action; uses F3 audit.
- [ ] 5.3 Reconciliation — upload/import M-Pesa statement, match to
  payments, flag orphans.
- [ ] 5.4 Refund oversight — refund requests list, approve/reject with
  reason; writes through to the church ledger.
- [ ] 5.5 SMS cost ledger — per-tenant SMS spend table (exists
  partially?); expose per-tenant cost on fleet cards.

## 6. Security & Compliance (`/platform/security`)

- [x] 6.1 Global audit log page (done — /platform/audit).
- [x] 6.2 Security center — failed logins, lockouts, suspicious IPs
  across platform + all tenants.
- [x] 6.3 IP blocking — `platform_ip_rules (ip/cidr, allow|deny,
  reason)`; enforcement middleware on both auth stacks.
- [ ] 6.4 Session oversight — list active sessions per tenant user;
  force-logout.
- [x] 6.5 Credential rotation tracker — secrets registry (name, last
  rotated, owner); rotation reminders incl. the Daraja secrets item.
- [x] 6.6 Data-protection requests — DSAR/deletion request log per
  tenant with status workflow.
- [ ] 6.7 Permission audit — diff each church's role_permissions vs the
  canonical catalog; flag drift (e.g. the `Admin` orphan we fixed).
- [ ] 6.8 Rate limits — per-tenant override table; applied by the
  existing limiter.

## 7. Data Management (`/platform/data`)

- [ ] 7.1 Backups — schedule pg_dump per DB, verify, list restore
  points; restore action into staging only.
- [ ] 7.2 Tenant export — full church dump (members, payments, docs)
  as zipped CSV/JSON, signed-URL download, audit-logged.
- [ ] 7.3 Import tooling — member CSV import wizard reusing the church
  import path; preview + error report.
- [x] 7.4 Storage usage — per-tenant media/doc sizes on fleet cards +
  quota flags.
- [x] 7.5 Schema versions — `schema_migrations` per tenant vs latest;
  drift report.
- [ ] 7.6 Demo data — `is_demo` flagging + purge action on trial
  conversion.

## 8. Disaster & Incident (`/platform/incidents`)

- [x] 8.1 Incident playbook — `platform_incidents` table; create
  incident → broadcast banner → resolve; status enum.
- [x] 8.2 Tenant quarantine — `quarantined` flag on churches; middleware
  returns 503 notice for that tenant only.
- [ ] 8.3 Rollback tooling — deploy tag/record list; document manual
  rollback steps (automated rollback optional).
- [ ] 8.4 Forensic views — audit log pivot: all actions by actor/IP in a
  window; export to CSV.

## 9. Billing & Revenue (`/platform/billing`)

- [x] 9.1 Data model — `subscription_plans`, `tenant_subscriptions`,
  `invoices`, `invoice_items` migrations + seeds.
- [x] 9.2 Plans admin — CRUD tiers, feature list per tier, pricing.
- [x] 9.3 Tenant billing — assign plan, renewal date, balance; plan
  picker on TenantDetail.
- [ ] 9.4 Invoices — generate monthly, mark paid, credit notes; PDF or
  printable view.
- [ ] 9.5 Dunning — overdue rules; reminder emails; grace period;
  auto-suspend + auto-restore on payment.
- [x] 9.6 Revenue reports — MRR, churn, LTV, collection rate on
  PlatformAnalytics.

## 10. Analytics & Reporting (`/platform/analytics*`)

- [x] 10.1 Base analytics page (done — exists).
- [ ] 10.2 Growth metrics — tenants added/churned, total users, DAU/MAU.
- [ ] 10.3 Feature adoption — per-tenant module usage counters.
- [ ] 10.4 Usage reports — payments volume, SMS sent, members per
  tenant; date-range selector.
- [ ] 10.5 Benchmarks — percentile rank a church vs similar sizes.
- [ ] 10.6 Exports — monthly metrics CSV/PDF for stakeholders.

## 11. Communication (`/platform/communication`)

- [x] 11.1 Announcements — `platform_announcements`; compose → target
  all/specific churches → shown as banner in tenant dashboards.
- [ ] 11.2 Tenant messaging — message thread between platform staff
  and church admins.
- [ ] 11.3 Status page — public `/status` route: component health,
  incident history from 8.1.
- [ ] 11.4 Templates — platform email/SMS template CRUD (welcome,
  dunning, security notices) with variable preview.

## 12. Support Operations (`/platform/support`)

- [x] 12.1 Ticket inbox — `support_tickets` tied to churches; list,
  assign, status, reply.
- [ ] 12.2 Support access — time-boxed impersonation granted by ticket;
  uses F4; auto-expires.
- [x] 12.3 Known issues board — issue cards linkable to tickets and
  incidents.
- [x] 12.4 Health scores — computed per tenant (recency of logins,
  member growth, payment failures); sorted at-risk list.

## 13. Platform Configuration (`/platform/settings*`)

- [x] 13.1 Settings page (done — exists).
- [x] 13.2 Global feature flags — `platform_feature_flags`; rollout
  percentage/cohort support.
- [ ] 13.3 New-tenant defaults — editable defaults for roles,
  categories, fiscal year used by tenant creation.
- [ ] 13.4 Branding defaults — default theme assets for new churches.
- [ ] 13.5 Integration config — M-Pesa/SMS/SMTP fallback credentials
  editor (masked secrets, re-auth to reveal).
- [ ] 13.6 Maintenance mode — flag + scheduled window + tenant-visible
  banner (ties into 8.1).
- [x] 13.7 Version & changelog — deployed SHA shown on dashboard;
  release notes page tenants can read.

## Cleanup (as features land)

- [ ] C1. Remove each roadmap link in `platformNav.js` as its real page
  ships; delete `PLATFORM_AREAS` entries whose area is fully built.
- [ ] C2. Delete `PlatformRoadmap.jsx` + its route when no roadmap
  links remain.
- [ ] C3. Update this file's filename to mark it implemented
  (`..._platform-console-13-functions_IMPLEMENTED.md`) when the
  tracker is all `[x]`.
- [ ] C4. Ledger entry: link each shipped area back to
  `docs/reports/2026-10-02_22-49_line-by-line-ledger.md` conventions —
  record completion evidence (endpoint tested, page verified).
