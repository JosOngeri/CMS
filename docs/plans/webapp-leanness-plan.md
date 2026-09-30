# Webapp Leanness Assessment — KMainCMS Frontend

Assessment date: 2026-10-01. All figures verified against `frontend/` and the current build (`dist-new/`).

## Verdict

The **runtime JS is already lean** — 1.7MB raw JS total (~550KB gzipped est.),
vendor-react 343KB raw (~110KB gz), largest page chunk `DepartmentDashboard` 115KB raw.
Every dashboard route is already `lazy()`. Dependencies are minimal (15 runtime deps,
no moment/lodash).

The fat is **around** the code, not in it — and the deep-dive shows it's bigger than
first measured: **~35% of all source code is unreachable dead code**, plus a 13MB
copy of the entire project committed inside the repo.

## Deep-dive results (import-graph analysis, 2026-10-01)

Walked every `import`/`require`/`lazy()` from `frontend/src/main.jsx` and
`backend/server.js` and measured what is actually reachable:

| Area | Live LOC | Unreachable LOC | Share dead |
|---|---|---|---|
| `frontend/src` | 44,257 | 24,258 (120 files) | **35%** |
| `backend` prod code | 50,404 | 25,734 (182 files) | **34%** |

(`unreachable` excludes test LOC where noted; backend excludes `scripts/` + `migrations/`
which are standalone by design.)

**Frontend dead code (21,717 LOC non-test + 2,541 LOC test):**
- Whole unused feature folders: `components/sms/` (9 files), `pages/telegram/` (6),
  `components/common/` orphans (15: DataTable, ReadOnlyTable, FileUpload, DatePicker,
  Pagination, RichTextEditor, StatusBadge, ConfirmationDialog, SearchAndFilter…),
  `components/security/` (3), `components/chat/` (2), `components/ui/` (4),
  `modules/shared/` feature-registry scaffolding (stubs with `component: null`)
- Stale page duplicates at old paths: `pages/PublicHome.jsx` (live copy is
  `pages/public/PublicHome.jsx`), `pages/Announcements.jsx`, `pages/members/MembersList.jsx`,
  `pages/members/MemberForm.jsx`, `pages/dashboard/DashboardHome.jsx`,
  `pages/auth/{EmailVerification,MFASetup,ResetPassword,Sessions}.jsx`
- Entire `router/auth.routes.jsx` unmounted — auth pages under it are transitively dead
- The A/B-variant system (`Departments.jsx` wrappers + Original/Alternative) — the
  *wrapper itself* is never imported; the router uses `DepartmentsList` directly.
  So all 10 variant files are fully dead, not just half-shipped.
- Dead contexts: `ContentContext`, `PaletteContext`, `TelegramContext`

**Backend unreachable code (25,734 LOC):**
- 29 dead `controllers/` (users, events, treasury — features re-implemented under
  `modules/` or other route files)
- 28 dead `repositories/`, 26 dead `routes/`, 21 dead `services/` — e.g.
  `treasury.controller.js` ↔ `treasury.routes.js` reference each other but neither is
  mounted (treasury now lives in `modules/treasury/`)
- 45 loose one-off scripts at `backend/` root (create-*.js, check-*.js, fix-*.js)
- Plus `backend/scripts/` = 96 files / 7,568 LOC of assorted one-offs
- Dead middleware: `pagination.js` (a ready-made paginator nobody uses — relevant to
  the security plan's pagination task), `securityMiddleware.js`, `treasurySecurity.js`

**Repo hygiene:**
- `CMS Codebase/` — a 13MB full copy of the project inside the repo, 1,125 git-tracked files
- `frontend/dist*` — 236 tracked build artifacts (already covered below)
- `mobile/` has 22,316 files on disk — mostly `build/`/`.dart_tool` artifacts; check
  `.gitignore` covers them
- `docs/` 283 files + `Documentation/` 127 + `plans/` 19 + `todo-lists/` — heavy doc
  sprawl from past sessions

---

## Findings (with evidence)

### Quick wins (biggest bytes for least effort)

1. **`public/logo.png` = 794KB and `public/favicon.png` = the exact same file**
   (identical MD5). The logo loads on every page and in `manifest.json`/`<link rel=icon>`.
   Compress to a sized PNG/WebP (~30–60KB) and use a real favicon. **Saves ~1.5MB/page load.**

2. **Sourcemaps shipped to production** — `vite.config.js` has `sourcemap: true`;
   `dist-new/` contains 96 `.map` files = **4.4MB** (bigger than all the JS).
   Also exposes original source to anyone. **Set `sourcemap: false` (or `'hidden'`).**

3. **Build output committed to git** — 236 files under `frontend/dist*` are tracked.
   Repo bloat + constant diff churn. **`git rm -r --cached`, add `dist*` to `.gitignore`.**

4. **Output dir mismatch** — `vite.config.js` builds to `dist-new/` but `backend/app.js`
   line 222 serves `frontend/dist`. Two stale folders (`dist`, `dist-test`) plus the real
   one. **Pick one dir, point both at it, delete the other two.**

### Dead code

5. **`components/common/DataTable.jsx` + `ReadOnlyTable.jsx` are orphaned** — DataTable
   is imported only by ReadOnlyTable; ReadOnlyTable is imported by nothing. Worse,
   DataTable eagerly imports `xlsx`, `jspdf`, `jspdf-autotable`, `react-window` —
   and **jspdf is not in `package.json`** (not installed; would crash if the file were
   ever imported). **Delete both files.**

6. **A/B variant system is fully dead** — `Departments`, `Settings`, `Insights`,
   `Resources`, `Administration` each have a wrapper + `*Original.jsx` +
   `*Alternative.jsx` (~3,750 lines) wired via `useAlternativeSection`, but the
   **wrapper files themselves are never imported** (router goes straight to
   `DepartmentsList` etc.). All 15 files + `useFeatureFlag.js` +
   `config/featureFlags.js` are dead code.

7. **`react-toastify` has ~2 usages** while the app has its own `ToastContext`.
   Swap the two usages and drop the dependency + its CSS.

8. **Two E2E frameworks installed** — both `cypress` and `@playwright/test` in
   devDependencies. Pick one (Playwright — the scripts already use it).

### Structural leanness

9. **`xlsx` (~430KB) imported eagerly** in `components/sms/SMSAnalytics.jsx` — convert
   to `await import('xlsx')` inside the export handler so it only downloads when a
   treasurer clicks Export.

10. **`recharts` in 4 components** (dashboard charts + SMSAnalytics) — already chunked
    per-page via lazy routes; keep, but verify it's not pulled into a shared chunk
    (if so, give it `manualChunks` entry `vendor-charts`).

11. **`socket.io-client` in `ChatPanel`** — confirm ChatPanel is lazy; if chat is
    rarely used, lazy-import the socket client too.

12. **Identity of `dist` vs `dist-new` vs `dist-test`** — three build dirs exist;
    `dist` is a stale older build (different chunk names), `dist-test` likewise.
    Remove from repo and disk.

13. **Dev-only overhead** — `vite.config.js` `watch.usePolling: true` + 1s interval
    burns CPU on Windows; only needed for network drives. Also `--force` in `npm run dev`
    re-bundles deps every start. Make polling opt-in via env, drop `--force`.

14. **`sw.js` service worker** — precaches a URL list with a `NEVER_CACHE` guard for
    auth endpoints; verify the precache list doesn't pin old asset hashes (it caches
    by name so stale bundles can be served after redeploy). Prefer cache-on-demand
    (runtime caching) with a versioned cache name per release.

---

## Task list

### Tier 0 — Quick wins (do first)

| # | Task | Est. saving |
|---|------|-------------|
| 1 | Compress `logo.png`/`favicon.png` (794KB→~50KB); distinct favicon | ~1.5MB per load |
| 2 | `sourcemap: false` in vite.config.js | 4.4MB off deploy |
| 3 | Untrack + ignore `dist`, `dist-new`, `dist-test`; keep one output dir aligned with `app.js` | 236 files off repo |
| 4 | Delete or move `CMS Codebase/` out of the repo (full project copy) | 13MB, 1,125 tracked files |
| 5 | Delete `DataTable.jsx` + `ReadOnlyTable.jsx` (dead, imports uninstalled jspdf) | removes xlsx/jspdf risk |

### Tier 1 — Dead-code purge (the deep-dive items)

| # | Task | Est. saving |
|---|------|-------------|
| 6 | Frontend: delete unreachable component folders — `components/sms/`, `components/chat/`, `components/ui/`, `components/security/` orphans, `components/common/` orphans (15 files), `components/documents/`, `components/realtime/`, `components/pwa/`, `components/monitoring/`, `components/performance/`, `components/dynamic/`, `modules/shared/` | ~15k LOC, whole dep trees (xlsx, socket.io-client, react-window maybe) |
| 7 | Frontend: delete stale duplicate pages at old paths (`pages/PublicHome.jsx`, `pages/Announcements.jsx`, `pages/members/MembersList.jsx`, `MemberForm.jsx`, `dashboard/DashboardHome.jsx`, `pages/auth/*` orphans, `router/auth.routes.jsx`) | ~5k LOC |
| 8 | Frontend: A/B system — router already bypasses the wrappers; delete `Departments.jsx`, `Settings.jsx` wrappers + all 10 `*Original`/`*Alternative` files + `useFeatureFlag.js`/`featureFlags.js` | ~3.8k LOC |
| 9 | Backend: delete unmounted controllers/routes/repositories/services (the 182-file list, verified per-file before removal — some may be future feature stubs worth keeping, e.g. telegram) | ~25k LOC |
| 10 | Backend: move 45 root-level one-off scripts into `scripts/` or `scripts/archive/`; audit `scripts/` (96 files) — delete obsoleted ones | ~12k LOC off root |
| 11 | Decide the keep-list: unmounted-but-planned features (telegram pages, MFASetup, security dashboards) → move to `docs/roadmap` notes rather than live source | clarity |

### Tier 2 — Structural

| # | Task | Est. saving |
|---|------|-------------|
| 12 | Lazy-import `xlsx` in SMSAnalytics export handler (or delete with components/sms) | ~430KB if kept |
| 13 | Remove `react-toastify` (2 usages → ToastContext) | ~40KB + css |
| 14 | Remove `cypress` devDep (keep Playwright) | install/dev weight |
| 15 | `vendor-charts` manualChunk for recharts if shared across chunks | chunk hygiene |
| 16 | sw.js: versioned cache name + runtime caching only | avoids stale-asset bugs |
| 17 | vite: drop `--force`, make `usePolling` env-gated | dev CPU |
| 18 | Delete dead contexts (`ContentContext`, `PaletteContext`, `TelegramContext`) after their consumers go | included above |
| 19 | `mobile/` artifacts: confirm `build/`, `.dart_tool` ignored | repo hygiene |

### Caveat — verify before deleting
"Unreachable" ≠ "safe to delete" without a check: (a) test files are standalone by
design; (b) backend `scripts/` are run manually; (c) a few files may be loaded by
string reference (featureRegistry pattern). Before deleting each batch, grep the file
name once across the repo and confirm only dead files reference it.

**Verification done (2026-10-02):** every dead file was re-checked by exact path
resolution — a live file importing `./X` resolves to the exact dead file only if the
path matches. All 19 frontend + 21 backend basename collisions resolved **SAFE**
(e.g. live code imports `components/common/Card.jsx`, not `components/ui/Card.jsx`).
The full per-file verified list is in `docs/plans/dead-code-verification.md`:

| Category | Files | LOC |
|---|---|---|
| Frontend non-test dead | 108 | 21,921 |
| Frontend test/standalone | 12 | 2,337 |
| Backend tree dead | 137 | 20,913 |
| Backend root-stray scripts | 45 | 4,821 |

Remaining judgment calls before Tier 1 deletion: (1) `middleware/pagination.js` is
dead-but-useful — rescue it into the security plan's pagination task instead of
deleting; (2) `utils/jwt.js` is the fallback-secret file — delete regardless
(security plan P0); (3) whole feature stubs (telegram, SMS components, MFASetup) —
confirm they're not planned before removing; (4) backend root-stray scripts are
manual tools — move to `scripts/archive/` rather than delete.

## Verification

- `npm run build` → `dist-new` size before/after (expect ~4.5MB→~2MB without maps).
- `npm run build:analyze` (rollup-plugin-visualizer already installed) — confirm no
  chunk >150KB raw except vendor-react; xlsx absent from initial chunks.
- Load `/` — logo transfer <60KB; DevTools shows no `.map` downloads.
- `npm run lint` passes; app boots; departments/settings/insights/resources pages render.
