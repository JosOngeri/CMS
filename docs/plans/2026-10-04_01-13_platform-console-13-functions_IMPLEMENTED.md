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
  5.3 statement upload, 6.4 tenant session inventory, 7.2 export
  generation, 9.4 credit notes/PDF, 10.2/10.4 growth+usage pages
  (endpoints only), 12.2 ticket-granted support access.
- **Batch 3 (must-haves)** — migration `079_platform_sessions_mfa_alerts.sql`
  (platform_sessions, mfa cols on platform_users, alert rules + seeds,
  settings, `overdue` invoice status). Sessions list/revoke/revoke-all
  (3.3), RFC 6238 TOTP MFA with forced setup (3.4), alert-rules engine
  on 5-min scheduler (4.6), real pg_dump backups daily + manual (7.1),
  dunning service w/ reminder emails + auto-suspend (9.5), maintenance
  mode middleware + toggle (13.6), tenant settings override (2.5).
  Suite 339 green, eslint 0 errors, build clean.
- **Batch 4 (partials + next slice)** — migration `080` (alert
  notify_channels, delivery settings, church_id on platform_alerts).
  Closed all three batch-3 partials: email/Telegram delivery for fired
  alerts, pg_restore into STAGING_DATABASE_URL only, dunning
  auto-restore on payment. New: audit actor/IP/date filters + CSV
  export + forensics pivot (3.5, 8.4), integration health derived from
  real signals (4.4), growth/usage sections on PlatformAnalytics
  (10.2, 10.4).

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
- [x] F5. Seed + idempotency rule for platform tables: migrations 078/079
  seed plans, credential rotations, alert rules, platform_settings with
  `ON CONFLICT`/existence guards; event tables (tickets, incidents,
  jobs, sessions) correctly start empty.
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
- [x] 1.4 Tenant templates — tenant_templates (mig 084) snapshots a
  church's departments+roles via POST /tenant-templates; "capture as
  template" + "apply template" on TenantAdmin; "start from template"
  select on TenantCreate step 4 (applied post-create, name-conflicts
  skipped). PARTIAL: snapshot covers departments+roles (no separate
  categories table exists).
- [x] 1.5 Offboarding flow — churches.offboarded_at/retention_deadline/
  offboard_reason (migration 081); POST /tenants/:id/offboard (deactivate
  + retention clock) and /tenants/:id/purge (owner-only via data:export,
  blocked until retention expires, deletes curated tenant tables in a
  transaction); lifecycle card on TenantAdmin. PARTIAL: purge covers the
  curated export table list, not every FK-less table.

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
- [x] 2.5 Config override — PUT /tenants/:id/settings merges into
  churches.settings JSON (tenant:administer, audited); Settings Override
  card on PlatformTenantAdmin.
- [x] 2.6 Tenant user list — church users with role, last_login,
  mfa, lockout state on TenantDetail tab.

## 3. Platform Staff (`/platform/staff`)

- [x] 3.1 Platform user CRUD (done — PlatformUsers + /users routes).
- [x] 3.2 Role assignment UI constrained to the catalog from F1 —
  GET /users/roles/catalog returns ROLE_PERMISSIONS-derived assignable
  roles; PlatformUsers renders create-form + per-row role selects from
  it with permission-count/permission-list preview; backend re-validates
  against PLATFORM_USER_ROLES.
- [x] 3.3 Session revocation — `platform_sessions` (mig 079); jti-bound
  JWTs; list own/all, revoke one, revoke-all-per-user
  (security:manage); sessions card on PlatformSecurity.
- [x] 3.4 MFA enforcement — mfa_required/mfa_enabled/mfa_secret on
  platform_users (mig 079); RFC 6238 TOTP helper; login asks for code
  (MFA_REQUIRED/MFA_INVALID); forced setup screen when mfa_pending;
  owner toggle on PlatformUsers.
- [x] 3.5 Access audit view — audit page now filters by actor
  (email/name ILIKE), exact IP, and from/to dates.

## 4. Monitoring & Health (`/platform/monitoring*`)

- [x] 4.1 Base monitoring page (done — exists).
- [x] 4.2 Fleet dashboard — per-tenant status cards: users, active
  sessions, errors last 24h, last payment, SMS credit; new
  `/api/platform/fleet` endpoint.
- [x] 4.3 Uptime & latency — uptimeMetrics middleware times every /api
  call; sliding window (500 samples) summarized into platform_health
  ('api.http': avg response_time, error_rate, last_check) at most every
  5 min; fire-and-forget, never blocks a request. PARTIAL: app-side
  self-report, not an external probe.
  aggregates; chart per endpoint.
- [x] 4.4 Integration health — GET /platform/integrations derives
  red/amber/green/unconfigured from real signals (payments/mpesa_receipt,
  sms_logs, telegram_posts, EMAIL_* env config); card on PlatformFleet.
- [x] 4.5 Background jobs — `platform_jobs` table or reuse existing;
  failed jobs list + retry button.
- [x] 4.6 Alerting — `platform_alert_rules` CRUD + evaluation engine
  (platformAlertEngine.service, scheduler every 5min) fires rows into
  platform_alerts; rule editor on PlatformFleet; per-rule notify_channels
  (email/telegram) delivered via emailService/telegramService (mig 080).
- [x] 4.7 Log explorer — platform_app_logs (mig 085) fed by a buffered
  pino stream on warn+ (prod only, fails silent, PII redaction kept);
  GET /logs (level/search/from/to filters, health:read) + Log Explorer
  card on Fleet. PARTIAL: warn+ only — info/debug stay stdout-only.
  filter by tenant/severity/time.

## 5. Payments & Financial Oversight (`/platform/payments`)

- [x] 5.1 Cross-tenant payment feed — `/api/platform/payments`
  joining all churches' payments; filter by church/status/date.
- [x] 5.2 Failed & stuck queue — pending > 24h + webhook mismatches;
  "reconcile to completed/failed" action; uses F3 audit.
- [x] 5.3 Reconciliation — "Import statement" on Payments parses the
  M-Pesa CSV client-side (utils/csv.js) and POSTs rows to
  /payments/reconcile-statement; server matches mpesa_receipt_number/
  mpesa_receipt/reference_number, auto-completes pending payments, and
  returns matched/unmatched/still-pending buckets. Also fixed: the feed
  + stuck queue selected a nonexistent transaction_reference column —
  now COALESCEd from the real receipt columns.
  payments, flag orphans.
- [x] 5.4 Refund oversight — GET /payments/refunds (cross-tenant list)
  + POST /payments/refunds/:id/decision approve|reject (pending-only,
  audited; refunds.processed_by is a church-user FK so the platform actor
  lives in the audit trail); Refunds tab on the Payments page.
  reason; writes through to the church ledger.
- [x] 5.5 SMS cost ledger — GET /sms-ledger per-tenant send volume
  (30d sent/failed, total, last send, sms_credits left); sms_logs has no
  church_id so scope comes via sender user; SMS ledger tab on Payments.
  PARTIAL: message counts, not monetary cost — no per-message price.
  partially?); expose per-tenant cost on fleet cards.

## 6. Security & Compliance (`/platform/security`)

- [x] 6.1 Global audit log page (done — /platform/audit).
- [x] 6.2 Security center — failed logins, lockouts, suspicious IPs
  across platform + all tenants.
- [x] 6.3 IP blocking — `platform_ip_rules (ip/cidr, allow|deny,
  reason)`; enforcement middleware on both auth stacks.
- [x] 6.4 Session oversight — GET /tenants/:id/sessions lists
  refresh-token sessions per church user; POST
  /tenants/:id/users/:userId/revoke-sessions forces logout (audited);
  sessions card on TenantAdmin. PARTIAL: access JWTs already issued live
  out their TTL — revocation acts at refresh level.
  force-logout.
- [x] 6.5 Credential rotation tracker — secrets registry (name, last
  rotated, owner); rotation reminders incl. the Daraja secrets item.
- [x] 6.6 Data-protection requests — DSAR/deletion request log per
  tenant with status workflow.
- [x] 6.7 Permission audit — GET /security/permission-audit diffs stored vs
      effective role permissions per platform staff member; flags owner-only
      drift + permissions outside the catalog; card on Security page.
  canonical catalog; flag drift (e.g. the `Admin` orphan we fixed).
- [x] 6.8 Rate limits — tenant_rate_limits (mig 084); tenantRateLimiter
  middleware layered after apiLimiter, keyed on resolved req.church_id,
  sliding-window with 60s-cached override map, fails open; GET/PUT/
  DELETE /tenants/:id/rate-limit + card on TenantAdmin.

## 7. Data Management (`/platform/data`)

- [x] 7.1 Backups — real pg_dump via platformBackup.service (custom
  format), run-backup endpoint + button on PlatformData, daily
  scheduler run, registry + verify, restore-to-staging via
  STAGING_DATABASE_URL (no production restore path exists).
- [x] 7.2 Tenant export — GET /tenants/:id/export downloads a JSON dump of
      the core church-scoped tables (credentials stripped). PARTIAL: curated
      table list, not all 100+ tables; needs a formal data-coverage review
      and signed/queued downloads for large churches.
  as zipped CSV/JSON, signed-URL download, audit-logged.
- [x] 7.3 Import tooling — shared memberImport.service (normalize,
  validate, name+phone dedup, per-row errors); platform
  POST /tenants/:id/members/import (audited) with CSV preview on
  TenantAdmin; church-side POST /api/members/import for admin roles so
  the church app reuses the same pipeline.
  import path; preview + error report.
- [x] 7.4 Storage usage — per-tenant media/doc sizes on fleet cards +
  quota flags.
- [x] 7.5 Schema versions — `schema_migrations` per tenant vs latest;
  drift report.
- [x] 7.6 Demo data — PATCH /tenants/:id/demo toggles the flag (Mark demo
  button on TenantAdmin, demo badge on Fleet cards); POST
  /tenants/purge-demos (owner-only) wipes all demo churches + their core
  data in one transaction, no retention wait.
  conversion.

## 8. Disaster & Incident (`/platform/incidents`)

- [x] 8.1 Incident playbook — `platform_incidents` table; create
  incident → broadcast banner → resolve; status enum.
- [x] 8.2 Tenant quarantine — `quarantined` flag on churches; middleware
  returns 503 notice for that tenant only.
- [x] 8.3 Rollback tooling — platform_deploys (migration 083) records
  version+sha at every server boot; GET /deploys + history card on Config
  with the manual rollback note (checkout previous sha, rebuild, restart).
  rollback steps (automated rollback optional).
- [x] 8.4 Forensic views — GET /audit-logs/forensics pivots
  actors/IPs/actions for a date window; GET /audit-logs/export streams CSV
  (audit:export); forensics panel + export button on the audit page.

## 9. Billing & Revenue (`/platform/billing`)

- [x] 9.1 Data model — `subscription_plans`, `tenant_subscriptions`,
  `invoices`, `invoice_items` migrations + seeds.
- [x] 9.2 Plans admin — CRUD tiers, feature list per tier, pricing.
- [x] 9.3 Tenant billing — assign plan, renewal date, balance; plan
  picker on TenantDetail.
- [x] 9.4 Invoices — generate, mark paid/void, credit notes (credit_amount
  capped at invoice amount, audited) + printable HTML view (operator
  prints/saves as PDF); credit + print buttons in the Invoices tab.
- [x] 9.5 Dunning — platformDunning.service: marks open invoices
  overdue, reminder emails via emailService (3-day throttle), suspends
  tenant past grace + fires church_id-linked platform alert, auto-restores
  on payment (each pass + instantly on invoice-marked-paid); manual run
  endpoint + Dunning tab on PlatformBilling; scheduler every 6h.
- [x] 9.6 Revenue reports — MRR, churn, LTV, collection rate on
  PlatformAnalytics.

## 10. Analytics & Reporting (`/platform/analytics*`)

- [x] 10.1 Base analytics page (done — exists).
- [x] 10.2 Growth metrics — /analytics/growth (tenants by month,
  users, DAU/MAU) rendered as Growth & Activity on PlatformAnalytics.
- [x] 10.3 Feature adoption — GET /analytics/adoption returns per-tenant
      record counts + module-in-use flags; dot matrix on Analytics page.
- [x] 10.4 Usage reports — /analytics/usage per-tenant
  members/users/payments/volume table on PlatformAnalytics.
  (date-range selector still open)
- [x] 10.5 Benchmarks — GET /tenants/:id/benchmarks computes PERCENT_RANK
  vs all active churches (members, users, 30d engagement, 90d payment
  volume, events); percentile bars on TenantAdmin.
- [x] 10.6 Exports — GET /analytics/export.csv downloads current totals +
  tenants-per-month CSV, audited; Export button on the Analytics header.

## 11. Communication (`/platform/communication`)

- [x] 11.1 Announcements — `platform_announcements`; compose → target
  all/specific churches → shown as banner in tenant dashboards.
- [x] 11.2 Tenant messaging — platform_tenant_messages (mig 085); GET/
  POST /tenants/:id/messages (audited sends, auto mark-read) + thread
  card on TenantAdmin; church-side GET/POST /api/platform-messages
  (admin roles, church-scoped, unread-count badge endpoint). PARTIAL:
  church app has no inbox UI yet — endpoints ready for it..
- [x] 11.3 Status page — public GET /platform/status (no auth, exposes
  only component health + global incident titles) and a /status SPA page
  in the public shell, auto-refreshing each minute.
- [x] 11.4 Templates — platform_message_templates (migration 082, seeded
  with welcome/dunning/security/suspension/restored bodies); list +
  upsert endpoints; editor card on the Communication page. PARTIAL: no
  live variable preview, and senders do not yet consume the templates.

## 12. Support Operations (`/platform/support`)

- [x] 12.1 Ticket inbox — `support_tickets` tied to churches; list,
  assign, status, reply.
- [x] 12.2 Support access — platform_support_access table; grant on a
  ticket mints a time-boxed impersonation JWT as the church's admin
  (auto-expires via token TTL), revoke closes the session row; grants
  list + revoke on the Support page.
- [x] 12.3 Known issues board — issue cards linkable to tickets and
  incidents.
- [x] 12.4 Health scores — computed per tenant (recency of logins,
  member growth, payment failures); sorted at-risk list.

## 13. Platform Configuration (`/platform/settings*`)

- [x] 13.1 Settings page (done — exists).
- [x] 13.2 Global feature flags — `platform_feature_flags`; rollout
  percentage/cohort support.
- [x] 13.3 New-tenant defaults — platform_settings.new_tenant_defaults JSON
      merged under each new church's settings at signup; JSON editor card on
      Config page. PARTIAL: settings-only defaults — does not yet seed role
  categories, fiscal year used by tenant creation.
- [x] 13.4 Branding defaults — new_tenant_defaults.branding seeded in
  mig 084 (theme/primaryColor/secondaryColor/logoUrl/faviconUrl);
  gateway merges it into settings.branding on tenant create; editable
  via the defaults JSON editor on Config.
- [x] 13.5 Integration config — GET /integrations/config reports env-var
  PRESENCE per integration (M-Pesa/SMS/SMTP/Telegram/backups/secrets —
  values never exposed) + editable non-secret integration_fallbacks;
  card on Config. PARTIAL: no credential rotation workflow — presence
  view + fallbacks only.
- [x] 13.6 Maintenance mode — platform_settings.maintenance_mode flag
  (message + ends_at), maintenanceMode middleware 503s tenant API while
  platform/health stay up, toggle card on PlatformConfig.
  banner (ties into 8.1).
- [x] 13.7 Version & changelog — deployed SHA shown on dashboard;
  release notes page tenants can read.

## Cleanup (as features land)

- [x] C1. Roadmap links removed from `platformNav.js`; all nav items
  point at real pages (`/status` for the public page); PLATFORM_AREAS
  catalog deleted with them.
- [x] C2. `PlatformRoadmap.jsx` deleted; lazy import + `/roadmap/:slug`
  route removed from PlatformShell.
- [x] C3. This file renamed to `..._IMPLEMENTED.md` on tracker close-out.
- [x] C4. Completion ledger — see table below.

## Completion ledger (C4)

| Area | Shipped surface | Evidence |
|---|---|---|
| 1 Onboarding & trials | `/platform/tenants*` pages; create/update/archive; onboarding checklist + trial extend/end on TenantAdmin; tenant templates (mig 084); offboard→purge (mig 081) | createTenant merges platform defaults; template apply verified on dev; purge transaction tested |
| 2 Tenant admin | TenantAdmin page: users, reset-admin, impersonate (read-only + full), flags, quotas, sessions, settings override, rate limit, templates, messages, member import | Impersonation sets church JWT cookie + banner; write-block tested in read-only |
| 3 Staff & access | `/platform/admins`; roles catalog endpoint; platform sessions (jti revocation); TOTP MFA + forced setup | `users/roles/catalog` returns ROLE_PERMISSIONS; MFA login flow unit-tested |
| 4 Monitoring | Fleet page: tenant cards, alerts, jobs, alert rules, integrations, log explorer | Alert engine runs 5min via scheduler; uptime middleware feeds platform_health; DB log stream smoke-tested (warn+ lands in platform_app_logs) |
| 5 Payments | `/platform/payments`: feed, stuck queue, manual reconcile, statement import, refunds, SMS ledger | Statement match verified on dev; fixed latent transaction_reference bug (column never existed) |
| 6 Security | `/platform/security`: failed logins, sessions, IP rules (enforced by middleware), impersonations, data requests, credential rotation, permission audit | IP rules enforce CIDR via ipaddr.js, 6-test suite; permission audit diffed vs catalog |
| 7 Data mgmt | `/platform/data`: backup registry + pg_dump runs + staging restore; storage/schema views; tenant export; member CSV import (shared w/ church `/api/members/import`) | Export strips credentials via to_regclass pre-checks; restore requires STAGING_DATABASE_URL |
| 8 Disaster/incident | `/platform/incidents` + quarantine enforcement; `/platform/audit` filters + forensics pivot + CSV; deploy records + rollback (mig 083) | Quarantine blocks at IdentityService; forensics verified |
| 9 Billing | `/platform/billing`: plans, subscriptions, invoices (+credit notes/printable/PDF-ish print view), dunning run, revenue reports | Mig 081 credit_notes; auto-restore on paid invoice verified |
| 10 Analytics | `/platform/analytics`: growth, adoption matrix, usage, benchmarks, metrics CSV export | Adoption query verified on real dev data (4 tenants) |
| 11 Communication | `/platform/comms`: announcements, templates (mig 082); public `/status` page; platform↔church messages (mig 085, church-side `/api/platform-messages`) | Status page public-rendered; message thread end-to-end |
| 12 Support | `/platform/support`: tickets + replies, known issues, health scores, support-access grants (mig 081) | Grant/revoke audited, expiry enforced |
| 13 Configuration | `/platform/config` + `/platform/settings`: global flags, maintenance mode, new-tenant defaults (incl. branding), integration config (presence-only), deploys/version | Maintenance middleware 503s tenant APIs; integration view never returns secret values |

**Verification summary (batches 1–12):** migrations 077–085 applied to dev + test DBs; `jest --testPathPatterns=__tests__/unit` green (71 tests incl. platformAuth, ipRules, maintenanceMode, uptime-adjacent suites); `eslint` 0 errors on all touched files; `vite build` clean every batch; live deploy verified earlier via workflow health check + 401-gated route probes.

**Known honest partials (recorded per-item above):** alert channels limited to email/Telegram config presence; uptime is app-side self-report not external probe; SMS ledger counts messages not money (no per-message pricing column); log explorer stores warn+ only; church-side message inbox UI pending (endpoints ready); integration credential rotation still manual; member import dedups on name+phone only.
