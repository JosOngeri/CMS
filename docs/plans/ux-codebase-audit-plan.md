# Full-Codebase + UX Audit Plan — KMainCMS / Msabato

**Goal:** a verified, per-file ledger of (a) inefficiencies and misalignment in the code,
and (b) UX/ergonomics issues — with special attention to **mobile web** — that a prodigy
UX reviewer would flag.

Two parallel workstreams, one report each, one combined prioritized fix list.
Plan produces evidence first, fixes second — no guesses.

---

## Ground truth already established (don't re-audit)

- `docs/plans/dead-code-verification.md` — the verified dead-file lists
- `docs/reports/security-assessment.md` — security findings (auth, CSRF, deps, PII)
- `docs/reports/codebase-map.html` — visual map of the whole repo

This plan covers what's LEFT: **live-code quality** and **UX**.

## What the evidence already shows (sampled, verified)

- **Duplicated UI primitives**: the same Tailwind class-strings appear 30–170× each
  (`text-sm text-[var(--color-textSecondary)]` 172×, a full input style 67×,
  `flex items-center justify-between` 97×). There is no shared `<Input>`, `<Label>`,
  or `<Toolbar>` component — every page re-types them.
- **Mobile skeleton exists but is uneven**: `MobileBottomNav` is mounted only in
  `DashboardLayout`, `MobileCard` used in 7 pages but not others; `Header` has 44px
  touch targets while `ActivityFeed` uses 36px — inconsistent hit areas.
- **Tables that will overflow mobile**: `FinancialReports.jsx` hard-codes
  `min-w-[560px]` tables — a 375px phone gets horizontal scroll on a financial report.
- **Two layout systems**: `layouts/DashboardLayout` (bottom nav) vs pages that roll
  their own header/sidebar spacing — alignment will drift.
- **Inline `style={{}}` in 29 files** — bypasses the theme tokens entirely.

---

## Workstream A — Codebase inefficiency & misalignment audit

Read every live file (the 398 live + 313 dead + scripts from the map; skip
`node_modules`/`dist*`. Dead files are logged, not reviewed in depth).

### A1 — Inventory & per-file pass
For each live file, record one row: path | LOC | role (route/controller/repo/component)
| issues found | verdict (keep/refactor/delete).

What to flag while reading:

- **Duplication** — the same logic in two files (e.g. both `departments.routes.js`
  and `department.routes.js` are mounted; same for `payments`/`payment`).
- **Fat controllers** — routes doing business logic inline instead of delegating
  to a repository/service (your `.windsurfrules` modular pattern).
- **Cross-module violations** — any file that queries another module's table
  directly (rule: modules access only their own tables, communicate via APIs).
- **N+1 / unbounded queries** — `SELECT` inside a `for` loop, missing `LIMIT`,
  missing `church_id` filter (feeds the security report too).
- **Inconsistent response shape** — rule is `{success, data/error, message}`;
  flag every endpoint returning something else.
- **Dead-but-referenced** — files flagged dead by the graph but kept for a reason;
  add a header comment or move to `scripts/archive/`.
- **Naming drift** — `departments` vs `department`, `payments` vs `payment`,
  snake_case vs camelCase on the same field.

**Output A:** `docs/reports/code-quality-audit.md` — per-area table + a
"Top 20" ranked by blast radius.

### A2 — Dependency & config hygiene
- `npm ls` both packages; flag unused deps (already suspects: `react-toastify`,
  `xlsx`, `jspdf`, `socket.io-client` if its only consumer is dead) and missing
  ones (`jspdf` imported but not installed).
- `vite.config.js` — sourcemap, output dir, manualChunks, polling, `--force`.
- `package.json` scripts — dead scripts pointing at deleted files.

**Output A2:** dependency table in the same report.

---

## Workstream B — UX & ergonomics audit (mobile-first)

Audit at **three widths**: 375px (phone), 768px (tablet), 1280px (desktop).
Every interactive page gets a checklist run at each width.

### B1 — Global shell
- One layout or many? Confirm every dashboard page renders inside
  `DashboardLayout`; flag pages that bypass it (they lose the bottom nav).
- `MobileBottomNav`: does it show the right items per role? Does it hide on
  desktop? Is the active tab indicated? Is it reachable by thumb (bottom, ≥56px)?
- `Header`/`Sidebar` on mobile: hamburger reachable? Drawer closable by swipe/
  backdrop? Does the drawer block content it should overlay?

### B2 — Touch ergonomics (the big mobile wins)
- Every button/icon-button ≥44×44px hit area. `ActivityFeed` uses 36px — flag
  all under-44px targets. (Apple HIG / WCAG 2.5.5 target size.)
- Primary actions reachable by thumb on a 375px screen? Flag "save" buttons
  that sit at the top-right on desktop and stay there on mobile.
- Tap spacing — no two targets closer than 8px.
- Any hover-only affordance (menus that open on hover, tooltips-only actions)
  fails mobile — flag and give a tap alternative.

### B3 — Forms
- Input font-size ≥16px (iOS auto-zooms on smaller focus fonts — annoying).
- `inputmode`/`type` correct (tel, email, numeric, decimal) — mobile keyboards
  change accordingly.
- Labels visible while typing (not placeholder-only).
- Error messages next to the field, not toast-only.
- Sticky submit button on long forms? On mobile, flag forms where submit is
  off-screen at initial scroll.

### B4 — Data display (the mobile killer)
- Every `<table>` needs one of: `overflow-x` wrapper, column-hiding on mobile,
  or a `MobileCard` switch. `FinancialReports` `min-w-[560px]` tables are the
  pattern to find and fix — cards on mobile, table on `md:` and up.
- Stat cards: do they stack to 1 column on phone (`grid-cols-1`) or cram 3-up?
- Long text: truncates with ellipsis, never pushes layout.

### B5 — Repetition & consistency (the "design system" check)
- Extract the repeated class-strings into real components: `<Input>`,
  `<Label>`, `<Toolbar>`, `<PageHeader>`, `<EmptyState>` exists — use it.
- One date format, one money format (`KES x,xxx`), one "no data" empty state.
- Colors only via `--color-*` tokens — flag any hard hex (the 29 inline-style
  files are suspects) and any color not in the palette (primary #3B82F6,
  secondary #F59E0B, bg #FEFDFB, surface #FFF, text #1F2937/#6B7280,
  success #22C55E, error #EF4444).
- Icons: one icon set, consistent sizes (16/20/24), no emoji-as-icon.

### B6 — Feedback & perceived performance
- Loading: skeleton or spinner everywhere async data loads — flag pages that
  flash blank.
- Optimistic UI on toggle/like/delete? Flag anything that waits for the server
  before reflecting a click.
- Toasts positioned for mobile (top or bottom, not covering the bottom nav),
  auto-dismiss, one at a time.
- Confirm dialogs on destructive actions — flag any delete that fires instantly.

### B7 — Accessibility (= better UX for everyone)
- Focus visible on all interactive elements.
- Color contrast: `--color-textSecondary` #6B7280 on #FEFDFB passes (4.8:1);
  flag anything lighter on white.
- `alt` on images, `aria-label` on icon-only buttons, `aria-live` on toasts.
- Keyboard: can you complete each form tab-only?

**Output B:** `docs/reports/ux-audit.md` — per-page findings table, a
"P0 blocks mobile use / P1 annoying / P2 polish" severity column, and a
design-system extraction checklist.

---

## Workstream C — Reconcile & fix plan

Merge both reports into `docs/plans/ux-codebase-fix-list.md` ordered by
impact:

1. **P0 — mobile blockers**: unscrollable tables, <44px targets, forms that
   lose their submit, missing bottom-nav pages.
2. **P1 — drift**: extract the 6 most-repeated class-strings into components;
   unify the duplicate route mounts; kill `style={{}}` in favor of tokens.
3. **P2 — polish**: consistent empty states, toast placement, skeletons.

Each fix item gets: file path, what's wrong, the fix, how to verify
(viewport test, grep, build).

---

## Verification (before calling it done)

- Every flagged file exists and the claim is quoted with a line ref.
- UX audit sampled at 375px — either via DevTools device emulation or a real
  phone; screenshots in `docs/reports/ux-screenshots/` for the worst offenders.
- Fix list items each map to ≥1 audit finding (no orphan tasks).
- `npm run build` still passes; Lighthouse mobile score on `/dashboard` and
  `/members` before/after.

## Deliverables (all under docs/)

| File | What |
|---|---|
| `docs/reports/code-quality-audit.md` | per-file ledger + top-20 |
| `docs/reports/ux-audit.md` | per-page UX findings + severity |
| `docs/reports/ux-screenshots/` | phone-width proof |
| `docs/plans/ux-codebase-fix-list.md` | merged prioritized fix plan |
