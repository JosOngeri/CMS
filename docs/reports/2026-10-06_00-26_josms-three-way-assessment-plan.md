# JOSms Three-Way Assessment & Integration Plan
**Date:** 2026-10-06 · **Scope:** KMainCMS (backend + web console), JOSms Android, JOSms webapp
**Status:** Phases 1–5 implemented and deployed; device-level pilot + contract tests pending

---

## Implementation evidence (added 2026-10-06)

| Commit | Scope | Verification |
|---|---|---|
| `af07cb1` | Phase 1 backend: `gatewayRegistry`, `smsGateway.controller`, `095_sms_gateway_ledger.sql`, presence gate in `sendViaJOSms`, `sendSMS` dispatch fix, route reorder (`/sms/auth` before `/sms`), provider callbacks, `callback_secret` generation | 73 unit tests pass; `hybridSMS.test.js` 13/13 incl. offline + failover |
| `cc64fc2` | Phase 3–5 backend + Phase 4 webapp: `096_member_interests.sql`, `/api/members/interest`, tenant-scoped provider selection (`_providersForChurch`), `register-sms-provider.js`, `Send.jsx`, `Outbox.jsx`, Dashboard gateway card + banner, routes/sidebar/permissions | 74 unit tests pass (new cross-tenant provider test); `vite build` clean; live `curl` checks below |

**Live endpoint checks after `cc64fc2` deploy:**
- `GET /api/health` → 200
- `POST /api/sms/auth/login` → 400 (route reachable — was previously shadowed by the `/sms` auth wall)
- `GET /api/sms/gateway-status` → 401 (mounted, auth enforced)
- `POST /api/members/interest` → 401 (mounted, auth enforced)
- `POST /api/sms/provider-callbacks/BlessedTexts/<bad>/delivery` → 404 (routed, secret rejected)

**Android (`JOSms 1`, `com.church.sms` v5.0.0):**
- Missing source reconstructed: 6 entity/DAO pairs, `CmsApiService` (mapped to real CMS auth envelope), `CmsAuthService`/`CmsAuthViewModel`, sync services/workers, biometric + monitoring, 12 Compose screens, `SmsReceiver`/`SmsStatusReceiver`; `churchId` corrected `Int`→`String` (UUID), auth paths aligned to `/api/sms/auth/*`.
- `io.socket:socket.io-client:2.1.0` added; `GatewayRelayWorker` (long-running WorkManager + foreground) connects with the SMS JWT, emits `register_relay`, persists `process_bulk` payloads into `sms_logs` keyed by `batchId` (replay dedup), acks `accepted`, hands off to `SmsService`, and posts per-recipient states to `/api/sms/delivery-report` every 30s; REST + socket heartbeat every 5 min.
- `GatewayKeepAliveWorker` re-enqueues the relay if the OS reaps it; `CmsAuthViewModel` starts the relay + periodic sync on login and stops it on logout; `ChurchSmsApplication` re-arms both on cold start when a token exists.
- `CmsSyncSettingsScreen` now captures the CMS base URL at login (`cms_base_url` in encrypted storage) — server is configurable, not hardcoded.
- `SmsReceiver` forwards matched keywords to `POST /api/members/interest`.
- `assembleDebug` BUILD SUCCESSFUL; `app-debug.apk` installed on SM-S901U1 via `adb install -r` (Room data preserved).

**Remaining for the pilot:** run `register-sms-provider.js` on the VPS with the BlessedTexts key to mint the callback URLs; sign in on the phone against `https://cms.josongeri.co.ke` and complete the socket + one-message pilot; scheduled-message sweep cadence and contract tests for the three new routes are still open.

---

---

## 1. What exists today

### A. KMainCMS backend — the brain
| Piece | Location | State |
|---|---|---|
| `hybridSMS` | `backend/services/hybridSMS.js` | Routes <400 recipients → `sendViaJOSms` (socket emit), ≥400 → bulk provider (`sms_providers` table). Now gated by `sms_enabled`/`sms_notifications` settings (both verified `true` on prod). |
| `SmsHub` | `backend/services/SmsHub.js` | **Duplicate** of hybridSMS routing — same 400 threshold, same `relay:` emit, but hardcodes `BlessedTexts` API as the bulk side. Two routers for one job. |
| Socket.io relay | `backend/server.js` | JWT-authenticated sockets; `register_relay` joins `relay:{churchId}` — already church-scoped (tenant-safe). |
| Sync API | `routes/smsSync.routes.js` | `GET /api/sms/sync/snapshot`, `GET /api/sms/sync/updates` — contact/template pull for devices. Live. |
| SMS auth | `routes/smsAuth.routes.js` | `POST /api/sms/auth/login`, `GET /organization` — device identity. Live. |
| Push channel | `controllers/smsPush.controller.js` | `/api/sms/sync/push` namespace, JWT-verified — for pushing updates to the app. |
| Provider config | `sms_providers` table | **Empty on prod** — zero bulk providers. JOSms is currently the only intended path. |

### B. JOSms webapp — the console (deployed, but not yet operational end-to-end)
`frontend/src/modules/sms/pages/` — `Dashboard.jsx`, `Contacts.jsx`, `Groups.jsx`, plus legacy `frontend/src/sms/SMS.jsx`. The routes exist at `/dashboard/sms`, `/dashboard/sms/dashboard`, `/dashboard/sms/contacts`, and `/dashboard/sms/groups`, restricted to leadership roles. The SMS menu is also controlled by the church `enable_sms` feature flag.

This console is already part of the main KMainCMS React build deployed to the VPS. The deployment workflow builds `frontend/`, installs it under `/var/www/CMS`, and Caddy serves `frontend/dist-new`; therefore it is not a separate web server or separate deployment. The production route `https://cms.josongeri.co.ke/dashboard/sms` is reachable as a SPA route. This confirms deployment, but authenticated UI behavior and all SMS API operations still require a live browser acceptance test.

The webapp is a *console*, not a gateway: message requests go through the CMS backend and still require either a connected JOSms Android phone or a configured bulk provider. “Live on the VPS” does not yet mean “able to deliver SMS.”

### C. JOSms Android — the installed app and source identification

The 56.7-second phone recording `Screen_Recording_20261006_010228_JOSms.mp4` was compared against the Android source variants. The installed app matches **`2 JOSms AndroidApp/JOSms 1`**, not `versions/v0.4.0-current`:

- The recording shows the exact six-item bottom navigation defined in `JOSms 1/app/src/main/java/com/church/sms/ChurchSmsApp.kt`: Dashboard, Contacts, Send, Templates, Logs, Settings.
- Its Dashboard cards read Members, Broadcasts and Delivered, matching `JOSms 1/.../ui/screens/DashboardScreen.kt`.
- “Compose JOSms” matches `JOSms 1/.../ui/screens/SendSmsScreenNew.kt`.
- “Communication Overview” with Campaigns and Conversations matches `JOSms 1/.../ui/screens/LogsScreenNew.kt`.
- The recording reports app version **5.0.0**, matching `JOSms 1/app/build.gradle` (`versionName "5.0.0"`, `versionCode 5`).

| Codebase | State after recording comparison |
|---|---|
| `JOSms 1` | **Canonical installed UI candidate.** Compose/Hilt/Room app with dashboard, 1,172 phone contacts in the recording, compose, templates, campaigns/conversations, chat, settings, biometrics, central-number setup, subscription keywords and A/B testing routes. Retrofit/OkHttp dependencies are declared. |
| `versions/v0.4.0-current` | Advanced offline snapshot, but its version and several UI labels do not match the installed recording. Keep as a source of reusable implementations until differences are merged deliberately. |
| `JOSms/app` | Integration fragment containing CMS auth/sync-related work; evaluate and merge into the canonical project rather than treating it as the installed application. |
| `ChurchSmsApp`, `versions/v0.2.0`, `versions/v0.4.0-full` | Historical/reference variants; do not build for the gateway until useful differences are inventoried. |

**Source warning:** `JOSms 1/ChurchSmsApp.kt` currently imports `CmsAuthService` and `CmsAuthViewModel`, but corresponding declarations were not found under that project's source tree. The installed APK proves a build existed, but the present local source must be compiled and repaired before it can be declared reproducible. Retrofit exists; no Socket.IO client, `process_bulk` listener, `register_relay`, or `GatewayRelayService` was found.

**Critical gap:** the installed app sends locally and displays local contacts/history, but it is not yet the CMS relay. The CMS emits into `relay:{churchId}` and this app has no listener.

---

## 2. Findings (ordered by severity)

1. **Silent message loss.** `sendViaJOSms` emits `process_bulk` and returns `{status:'queued'}` **without checking that a relay device is actually connected**. With no socket client in the app, every small-batch send on prod today is "queued" to nobody. Messages vanish with a success response.
2. **Two routing services.** `hybridSMS` and `SmsHub` both do threshold routing with divergent bulk implementations (provider table vs hardcoded BlessedTexts). They will drift.
3. **No delivery loop.** The app can't report sent/failed back; `POST /api/sms/poll-delivery-status` exists server-side but nothing populates it.
4. **No bulk path.** ≥400 sends need a `sms_providers` row — prod has none. Large campaigns currently fail.
5. **The installed-app source is identified but not reproducible yet.** The recording matches `JOSms 1` version 5.0.0, while its current source has unresolved CMS auth imports. The exact build must pass before integration work starts.
6. **Integration work is split across variants.** CMS auth/sync fragments and advanced offline features must be inventoried and merged into `JOSms 1`; blindly switching to `v0.4.0-current` would discard the UI users already recognize.
7. **Gateway invisible to the webapp.** No battery/signal/heartbeat reporting, so the Dashboard can't show "gateway offline" — matching the silent-loss risk in #1.

## 3. Blessed Texts visual and product reference

The supplied Blessed Texts screenshot is a design reference, not code to copy. JOSms should adopt its information hierarchy while retaining the existing KMainCMS shell, responsive behavior, accessibility, tenant controls, and CSS-variable theme.

### Dashboard layout to plan
- **Top summary row:** SMS balance/available units, units consumed today, saved contacts, and active sender ID or connected JOSms gateway. Each card links to its related operation.
- **Readiness banner:** a prominent status strip under the summary cards. It must show whether the Android gateway is connected, whether a bulk provider is configured, and which route would handle a send. It must never display a reassuring state when no delivery path exists.
- **Main activity area:** a wide Recent Messages table with sender, recipient, message preview, delivery status, creation time, and a link to complete message history.
- **Operational side panel:** replace the reference site's M-Pesa top-up form with controls appropriate to this product: gateway status, Android device identity, last heartbeat, battery/signal health, provider balance, sender ID, and quick links to configure or top up the selected provider.
- **Consumption report:** delivery/sending consumption chart for today and the selected date range, with accessible numeric totals alongside the visual chart.
- **Recent purchases/top-ups:** show only when a paid bulk provider and billing ledger are configured; otherwise show provider setup guidance rather than placeholder transactions.
- **SMS navigation:** Dashboard, Send SMS, Outbox/Queue, Scheduled SMS, Contacts & Groups, Campaigns/Templates, Delivery Reports, Provider/Top-up, Sender IDs, Gateway Devices, and Settings. Items remain permission- and feature-gated.

### Walkthrough assessment

The 2 minute 27 second walkthrough at `plans/blessed text walk through.mp4` was reviewed across the complete navigation flow. It confirms the following product structure:

| Blessed Texts screen | Observed behavior | JOSms/KMainCMS adaptation |
|---|---|---|
| Dashboard | Balance, consumed-today, contacts, sender-ID cards; recent messages; consumption ring; quick top-up and recharge history | Keep the hierarchy, but add gateway readiness and distinguish SIM capacity from paid-provider units |
| Single/Group SMS | Single contact or group selector, number, message, character/SMS count, template helper, sender ID, schedule toggle, optional attachment | Consolidate into the existing compose screen; add segment/cost estimate, gateway/provider route, approval state, and safe scheduling |
| Bulk Numbers SMS | Separate workflow for pasted/bulk numbers | Support paste/manual E.164 numbers with validation, deduplication, invalid-number preview, and recipient count before submission |
| Custom Excel SMS | Drag/drop spreadsheet, downloadable template, sample personalized columns | Extend CSV import to CSV/XLSX mapping and preview; do not send until rows and personalization fields pass validation |
| Outbox/Sent Messages | Search, date filter, Excel export, sender/recipient/message, character length, units, created/processed dates, status, detail action | Build one durable queue/history view using CMS job and delivery records; mask phone numbers according to permission |
| Scheduled SMS | Separate scheduled-message list | Add create/edit/cancel controls backed by durable CMS scheduling, not browser timers |
| Contacts Groups | Paginated group table with contact count, description, creator, actions | Existing Groups page is the starting point; add pagination, creator/audit metadata, import, deduplication, and tenant-safe membership management |
| Top-up SMS | Paybill instructions, STK phone/amount form, invoice action, unit price and balance cards | Only for paid providers; use the existing M-Pesa service and billing ledger with idempotent callbacks and reconciled credit entries |
| Recharge History | Historical purchases and receipt download | Use tenant-scoped provider-credit transactions with invoice/receipt status and immutable audit trail |
| M-Pesa Integration | Promotional onboarding for automated payment SMS notifications | KMainCMS should provide an actual setup/status workflow tied to existing M-Pesa configuration and transactional receipt templates |
| Sender IDs | Application form: name, business certificate, payment phone, instructions | Treat as provider-specific onboarding; secure document upload, approval states, cost disclosure, and platform-admin review |
| System Users | Additional account management | Reuse KMainCMS users, roles, permissions, sessions, and audit logs; do not create a second identity system |
| API Documentation | Base URL, send endpoint, request parameters and examples | Publish authenticated KMainCMS SMS API documentation without exposing live API keys; document idempotency, tenant scope, limits, callbacks, and errors |
| Profile | Contact details, API key area, sender-type settings, session timeout | Reuse KMainCMS profile/security pages; gateway tokens and provider secrets must be revocable and never displayed in full after creation |

### Design rules
- Preserve the main KMainCMS header and sidebar rather than creating a second application shell inside the dashboard.
- Use the semantic variables in `frontend/src/index.css`; do not copy Blessed Texts colors as hardcoded values.
- Support desktop, tablet, and phone layouts; summary cards stack and tables scroll or become compact cards on narrow screens.
- Minimum 44–48px interactive targets, visible keyboard focus, text labels in addition to color, and readable empty/loading/error states.
- Populate cards only from real tenant-scoped APIs. Unsupported balance, sender-ID, top-up, gateway, or delivery data must be marked unavailable until its backend contract exists.
- Improve on the reference where needed: clear delivery-route status, explicit confirmation, recipient validation, idempotency, approval workflows, masked personal data, and truthful queued/sent/delivered states.

### Recommended JOSms webapp information architecture
1. **Overview:** readiness banner, balance/capacity cards, delivery summary, recent activity, consumption.
2. **Send:** single/group, pasted numbers, spreadsheet personalization, templates, scheduling, route/cost preview.
3. **Messages:** queue, scheduled, sent, failed, delivery details, filters, export, retry where safe.
4. **Audience:** contacts, groups, imports, synchronization, opt-in/opt-out status.
5. **Gateways & providers:** Android devices, heartbeat, SIM status, bulk-provider configuration, sender IDs.
6. **Billing:** SMS credits, M-Pesa top-up, invoices/receipts, recharge history and cost ledger.
7. **Developer:** API documentation, scoped credentials, webhooks and delivery callbacks.
8. **Administration:** reuse CMS users, permissions, approvals, audit logs and tenant settings.

## 4. Plan

### Phase 0 — Confirm and make the SMS webapp operational on the live VPS
- [ ] Sign in to `https://cms.josongeri.co.ke` as an authorized Kiserian leadership/admin user and open all four SMS routes. Confirm the `enable_sms` feature flag exposes the sidebar item and role/permission checks do not incorrectly block access.
- [ ] Browser-test Dashboard, Contacts, Groups, and the legacy compose/campaign page against production APIs. Record every failed request, empty-state error, stale endpoint, and console error before changing code.
- [x] Assess the authenticated Blessed Texts walkthrough covering Send SMS, bulk/custom Excel, outbox, scheduled messages, contacts/groups, purchases, M-Pesa, sender IDs, users, API documentation, and profile. The assessment records product behavior only; credentials, tokens, and proprietary code were not captured.
- [ ] Produce a screen-by-screen JOSms wireframe based on the reference hierarchy: four summary cards, readiness banner, recent-messages table, operational side panel, and consumption report. Map every visible value to an existing API or mark the required endpoint as new before implementation.
- [ ] Choose one web entry point: keep `/dashboard/sms` as the main console and link its dashboard/contacts/groups children consistently; remove or redirect duplicated legacy UI only after feature comparison.
- [ ] Add an explicit gateway status panel. Until a relay phone is connected, show **Gateway offline — messages cannot be sent through JOSms** and disable/confirm sends rather than implying the webapp alone can deliver them.
- [ ] Confirm Caddy SPA fallback supports direct refreshes on every SMS route and that `/api/sms-*`, `/api/sms/*`, and Socket.IO traffic reach the backend.
- [ ] Run `npm run build` in `frontend/`, deploy through the existing `deploy-vps.yml`, then repeat the authenticated browser acceptance test.

**Acceptance:** all four routes load after login and after a direct browser refresh; contacts/groups API calls are tenant-scoped; the UI reports gateway/provider readiness truthfully; no send is attempted when no delivery path exists.

### Phase 1 — CMS truthfulness and durable jobs (small, high value)
- [x] `sendViaJOSms`: presence check via `gatewayRegistry.isOnline(churchId)` — empty room returns `{status:'offline'}` and fails over to a church-usable bulk provider instead of fake-queuing.
- [x] `GET /api/sms/gateway-status` — live sockets + durable `sms_gateway_devices` (label, battery, signal, last heartbeat/seen).
- [x] One router: `hybridSMS` is canonical; `SmsHub` delegates to it (hardcoded BlessedTexts path retired).
- [x] Deliverability ledger: `sms_deliveries` (migration 095) written as `queued` before `process_bulk` emits; `UNIQUE(batch_id, recipient)` makes replays idempotent; `POST /api/sms/delivery-report` upserts states and rolls the `sms_logs` row to `delivered`/`partial`/`failed`.
- [x] Also landed: `/api/sms/gateway-heartbeat`, `/api/sms/deliveries` (paged outbox), `/api/sms/provider-callbacks/:provider/:token/delivery|topup`, `callback_secret` auto-generated per provider, `/sms` route reorder so `/sms/auth/login` is reachable, `/api/sms/send` now actually dispatches batches (was silent pending-only) + due-scheduled sweeper.

### Phase 2 — Make the recorded Android app reproducible, then turn it into the gateway
- [x] `JOSms 1` adopted as canonical (`com.church.sms` v5.0.0); `assembleDebug` now builds clean after reconstructing the missing entity/DAO/auth/sync/screen sources and is installed on the gateway phone.
- [x] Clean build reproduced: JDK 17, Android SDK 34, Gradle wrapper 9.4.1, AGP 9.2.1 (`gradle-wrapper.properties` corrected from 8.5).
- [ ] Variant inventory/diff still open — only the `JOSms/app` auth/sync fragments were merged; `v0.4.0-current`/`full` not yet inventoried.
- [x] Non-destructive Room migrations only — `api_sync_status` added as v11 migration; 1,172 contacts preserved (APK installed with `-r`, DB intact).
- [x] `io.socket:socket.io-client:2.1.0` added; CMS base URL is now **user-configurable at login** (`cms_base_url` in EncryptedSharedPreferences), not hardcoded.
- [x] `GatewayRelayWorker` (long-running WorkManager coroutine with foreground info — Android 12+ safe, auto-restarts after process death): JWT socket → `register_relay` → `process_bulk` → persist `sms_logs` rows → ack `accepted` → hand to `SmsService`.
- [x] Delivery ack: `POST /api/sms/delivery-report` with `{batchId, deviceId, reports[{recipient,status,error}]}` on a 30s pump until terminal state.
- [x] Persisted queue + dedup: `sms_logs.batchId` is the dedup key — a replayed `process_bulk` reports current states without resending.
- [x] Visible gateway state: persistent foreground notification ("JOSms Gateway connected / batch relayed"), auth screen shows signed-in user + church name.

#### Build, install, and activate the gateway phone
1. Install Android Studio and Android SDK 34; open `2 JOSms AndroidApp/JOSms 1` and use its Gradle wrapper.
2. From `D:\VIbeCode\SMS APP\2 JOSms AndroidApp\JOSms 1`, run unit tests and build a debug APK on Windows:
   ```powershell
   .\gradlew.bat testDebugUnitTest
   .\gradlew.bat assembleDebug
   ```
3. Connect a controlled Android phone with USB debugging enabled and verify it with `adb devices`.
4. Install the debug build:
   ```powershell
   adb install -r app\build\outputs\apk\debug\app-debug.apk
   ```
   The debug package uses `com.church.sms.debug`, so it can coexist with a future signed production build.
5. Open JOSms, grant SMS/notification permissions, sign in to the production CMS with a dedicated authorized gateway account, and confirm the webapp changes from **offline** to **online**.
6. Send exactly one approved test SMS to an administrator-owned test number; verify accepted → sent/delivered or failed status in both Android logs and the web dashboard.
7. Before wider installation, create a protected release signing configuration outside source control, build `assembleRelease`, securely distribute the signed APK, and document upgrade/rollback steps. Never commit the keystore or passwords.

**Acceptance:** Gradle tests pass; debug APK installs; device authenticates into only its own church relay room; one controlled message is sent once; restart/offline/reconnect does not duplicate it; status appears in the live webapp.

### Phase 3 — Sync + heartbeat
- [x] `ContactSyncService` + `TemplateSyncService` wired: `SyncManager.startPeriodicSync()` (contacts 15min, templates 1h) fires on login and on app start when a token exists.
- [x] Heartbeat: relay worker posts battery/app-version/label to `POST /api/sms/gateway-heartbeat` every 5 min **and** emits `gateway_heartbeat` on the socket; `member_interests` table (096) + endpoints landed.
- [x] `SmsReceiver` → matched keyword → local subscription **and** `POST /api/members/interest` (best-effort, offline-safe).

### Phase 4 — Webapp delivery operations

**MVP — required for the first real JOSms send**
- [x] Dashboard readiness banner + Gateway card: online/offline dot, live socket count, per-device label/battery/signal/last heartbeat, queued-delivery count; 30s poll (`Send.jsx` shows the same banner).
- [x] Unified Send screen (`/dashboard/sms/send`): contacts multi-select + groups + pasted numbers with KE-aware E.164 normalization, dedup, template fill, char/segment counter, optional schedule, gateway-aware confirm dialog, per-batch result display.
- [x] Outbox (`/dashboard/sms/outbox`): `sms_deliveries` ledger, status filter, batch drill-down, pagination, 15s auto-refresh, honest queued/accepted/sent/delivered/failed chips.
- [ ] Scheduled Messages list view and Contacts/Groups pagination polish still open (Contacts has search/filter; group member paging pending).

**Second release — operational depth from the walkthrough**
- [ ] Spreadsheet-personalized sends with downloadable template, column mapping, preview, validation, deduplication and size limits.
- [ ] Message filters, masked-recipient display, date range, CSV/XLSX export, and permission-controlled detail access.
- [ ] Provider management UI for `sms_providers`, balances, sender IDs, routing priority and health.
- [ ] Billing screens for top-up, recharge history and receipts only after the M-Pesa/provider ledger is complete.
- [ ] Sender-ID application workflow with secure documents and platform approval.
- [ ] SMS API documentation and scoped credential management after the API contract is stable.
- [ ] Reuse CMS users and profile/security pages rather than recreating Blessed Texts System Users or Profile modules.

### Phase 5 — Bulk fallback and production readiness
- [ ] Register the BlessedTexts row on the VPS: `cd /var/www/CMS/backend && SMS_API_KEY=… CHURCH_SLUG=kiserian-main node scripts/register-sms-provider.js` — encrypts the key, prints the delivery + topup callback URLs (`/api/sms/provider-callbacks/BlessedTexts/<secret>/delivery|/topup`) to give the provider.
- [x] Failover policy live: <400 → relay if online else church-usable bulk; ≥400 → bulk always; neither available → honest `offline`/error, never fake-queued.
- [x] Tenant-scoped providers: church-owned rows serve only their church; NULL `church_id` rows are shared platform fallback (unit-tested).

## 5. Verification and rollout gates
- **Live webapp:** authenticated leadership user can load and directly refresh all SMS routes on `cms.josongeri.co.ke`; feature and permission gates behave correctly; browser console and API calls are clean.
- **Frontend deployment:** `npm run build` succeeds and the existing VPS workflow deploys `frontend/dist-new`; post-deploy health and church sweeps remain green.
- **Android build:** `testDebugUnitTest` and `assembleDebug` succeed from `2 JOSms AndroidApp/JOSms 1`; the resulting version 5.0.0 debug APK installs with `adb install -r` on the controlled phone and matches the recorded navigation/screens.
- **Dev integration:** socket client on emulator/test device ↔ local backend; send a small batch → Android receives `process_bulk` → delivery report lands in `sms_deliveries`.
- **Offline/retry:** disconnect the phone, create a job, reconnect, and prove the job is delivered once; kill/restart the app during sending and prove no duplicate SMS.
- **Tenant isolation:** a gateway authenticated to Church A cannot register in, receive jobs for, sync contacts from, or report against Church B.
- **Production pilot:** dedicated gateway phone connected → live Dashboard shows `online` → one explicitly approved SMS to an administrator-owned number → matching delivery status in CMS and Android.
- **Sweep/contracts:** new routes (`gateway-status`, `delivery-report`, `gateway-heartbeat`) have Jest/API contract tests and are covered safely by existing smoke sweeps; sweeps must never trigger a real SMS.
- **Release:** signed APK installation and upgrade are tested on the gateway phone; keystore backup, token revocation, rollback APK, and device replacement procedure are documented before church rollout.

## 6. Repo hygiene
- Preserve `JOSms 1` as the canonical candidate until a clean build and installed-screen comparison pass; rename it only in a dedicated move after references and build scripts are updated.
- Produce a file/feature diff against `versions/v0.4.0-current`, `versions/v0.4.0-full`, `JOSms/app`, `ChurchSmsApp`, and `versions/v0.2.0-core` before archiving anything.
- After useful code is merged and verified, archive historical variants and keep one Android application root. Do not delete the integration fragment until CMS login, sync and relay tests pass from the canonical project.
