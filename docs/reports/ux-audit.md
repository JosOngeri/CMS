# UX & Ergonomics Audit — KMainCMS Web App

**Date:** 2026-09-30
**Focus:** mobile web (375px) first, then 768px / 1280px.
**Method:** code-level sweep of all 173 live frontend files + reads of the shell
(`DashboardLayout`, `Sidebar`, `Header`, `MobileBottomNav`, `MobileCard`).

**Severity:** P0 = blocks a mobile user · P1 = annoys daily · P2 = polish.

---

## Verdict

The skeleton is genuinely good — `DashboardLayout` + `MobileBottomNav` +
`MobileCard` already deliver the "bottom nav + card rows on phone" pattern,
`Header` has 44px touch targets, Sidebar is a proper drawer with backdrop.
The failure mode is **unevenness**: pages that adopted the pattern are fine,
pages that didn't are unusable on a phone, and there's no component layer
keeping them consistent.

---

## What's already right (keep doing it)

| Pattern | Where | Why it works |
|---|---|---|
| Bottom nav (`MobileBottomNav`) | `DashboardLayout` | 5 destinations, 56px rows, safe-area inset, `aria-label` — matches Flutter app |
| Table→card switch (`hidden md:block` / `md:hidden`) | `MemberDirectory`, `PaymentHistory`, `Contributions`, `FixedAssets`, `Receipts`, `UserManagement`, `PaymentManagement` | Cards on phone, table on desktop — correct pattern |
| `MobileCard` + `CardField` primitives | `components/common/` | Reusable row-card for mobile lists |
| 44px touch targets | `components/common/Header.jsx` | All header buttons `min-h-[44px] min-w-[44px]` — meets Apple HIG |
| Sidebar drawer | `Sidebar.jsx` | `translate-x` + backdrop + `lg:hidden` — correct mobile nav |
| `SkipNavigation`, `aria-live`, `aria-label` | layout + common | accessibility bones are present |
| Theme tokens (`--color-*`) | every page | consistent palette, dark-mode-ready |
| Toast system | `ToastContext` in `App.jsx` | one shared toast — good; just needs consistent use |

---

## Findings

### P0 — blocks mobile use

| # | Where | Problem | Fix |
|---|---|---|---|
| 1 | `modules/sms/pages/Contacts.jsx` | `<table>` with **no** `overflow-x` wrap and **no** `MobileCard` fallback | wrap in `overflow-x-auto` or switch to cards below `md` |
| 2 | `pages/treasury/FinancialReports.jsx` | `min-w-[560px]` tables — a 375px phone scrolls horizontally inside a card | add `md:hidden` card list + keep table `hidden md:block` |
| 3 | `components/common/GmailMessageList.jsx` + pages rolling own `MobileMenu` | every page invents its own mobile menu instead of using the shared shell | route all list/detail nav through `MobileBottomNav` or a shared `MobileDrawer` |
| 4 | Pages that bypass `DashboardLayout` entirely | lose bottom nav + drawer + skip nav on phone | confirm every `/dashboard/*` route renders inside `DashboardLayout` (63 routes — spot-check the few added later) |

### P1 — daily annoyance

| # | Where | Problem | Fix |
|---|---|---|---|
| 5 | `components/departments/ActivityFeed.jsx:300,308` | 36px icon buttons — too small to tap reliably | bump to `min-h-[44px] min-w-[44px]` (header already does this) |
| 6 | `group-hover` reveals on 10 files | actions that appear on hover are invisible on touch — e.g. `AdminDashboard`, `PlatformDashboard`, `HeroSection`, `MinistriesCarousel` | show on `focus-within` + add a visible kebab/edit button for mobile |
| 7 | `pages/departments/DepartmentHandover.jsx` | `min-w-[140px]` inputs — two side-by-side = 280px+, overflows 375px | `flex-col` on `sm` breakpoint, `flex-row` on `md:` |
| 8 | 273 `<input>` have **no** `type=` attribute | mobile shows generic keyboard instead of number/email pad | add `type="email"\|"tel"\|"number"` + `inputMode` where relevant |
| 9 | Zero `inputMode` attributes anywhere | same as above — numeric keypad never summoned | `inputMode="decimal"` on amount fields, `numeric` on codes |
| 10 | Forms at 0–1 `<label>` per input | `MemberDirectory`, `PaymentHistory`, `PhotoGalleryPage`, `TenantList`, `Announcements`, `ComponentAllocation`, `PermissionManagement`, `DepartmentHandover`, `DepartmentHeadAllocation`, `DepartmentOverview` | wrap every input in `<label>` or `aria-label` |
| 11 | 49 delete/destructive calls lack `confirm()` | one accidental tap deletes a record | add `window.confirm` or a `ConfirmDialog` before every destructive `onClick` |
| 12 | `react-toastify` | not actually imported anywhere live — but `ToastContext` usage is uneven (some pages use it, some alert()) | standardize on `ToastContext`; remove dead import from `package.json` |

### P2 — polish / consistency

| # | Where | Problem | Fix |
|---|---|---|---|
| 13 | 29 files with `style={{}}` (230 instances) | bypasses theme tokens; hotspots: `PermissionManagement` 34, `DepartmentBranding` 31, `ComponentAllocation` 30, `DepartmentDashboard` 28 | move to utility classes or CSS vars |
| 14 | 1 hard hex | `NewsletterSection.jsx` uses `text-[#1B3252]` | replace with `--color-text` or token |
| 15 | No shared format utils | `fmtKES`/`fmtDate`/`formatDate` re-declared in ~9 files, different formats (`1 Oct` vs `Wed 1 Oct`) | `utils/format.js` — one `fmtKES`, `fmtDate`, `fmtDateTime`, `fmtRelative` |
| 16 | No shared UI primitives | the 6 most-repeated class-strings copied 60–170× each | extract `Input`, `Label`, `Toolbar`, `PageTitle`, `EmptyState` (exists — use everywhere) |
| 17 | `console.log` in 85 files | noise + leaks internals in prod console | strip via `esbuild.drop` or gate behind `import.meta.env.DEV` |
| 18 | 8 icon-only buttons lack `aria-label` | `TelegramAuthModal`, `MobileDashboard`, `Content`, `DepartmentActivity`, `DepartmentDashboard`, `ProfileManagement` | add `aria-label` (screen readers announce "button" with no name otherwise) |
| 19 | `AdminDashboard`/`PlatformDashboard` use `group-hover` for actions | hidden actions invisible on touch | see #6 |

---

## Mobile-width checklist (run at 375px)

Go through the app on a phone (or DevTools device toolbar, `iPhone SE`) and verify:

- [ ] Bottom nav visible + correct active state on every dashboard page
- [ ] No horizontal page scroll (tables use card fallback or `overflow-x`)
- [ ] Every tap target ≥44px — check `ActivityFeed`, `PhotoLightbox`, any kebab menus
- [ ] Inputs show numeric keypad for amounts/phones
- [ ] Submit buttons reachable without scrolling a long form
- [ ] Toasts appear above the bottom nav, not under it
- [ ] Hamburger menu opens/closes smoothly; drawer doesn't trap scroll
- [ ] No content hidden behind the fixed bottom nav (`pb-24` on main is doing this — verify it covers all pages)

## Design-system extraction list (kill the repetition)

| Extract into | Replaces | Saves |
|---|---|---|
| `components/ui/Input.jsx` | 67 identical input class strings | 1 source of truth for all forms |
| `components/ui/Label.jsx` | 90 label strings | same |
| `components/ui/Toolbar.jsx` | 97 `flex justify-between` | consistent page headers |
| `components/ui/PageTitle.jsx` | 67 `text-2xl font-bold` | same |
| `utils/format.js` | 9× duplicated `fmtKES`/`fmtDate` | one money/date format |
| `components/ui/ConfirmDialog.jsx` | 49 unconfirmed deletes | consistent destructive UX |

---

## Bottom line for a buyer/user

On desktop the app is presentable. On a phone — which is how church members
actually use it — the experience is **80% there**: the shell is right, but
individual pages drift. The fastest wins are the 4 P0s (all under an hour
each) plus extracting the shared input/label/toolbar components so the next
page can't drift again.
