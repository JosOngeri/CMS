# Merged Fix List — Code Quality + UX

**Built from:** `code-quality-audit.md` + `ux-audit.md` (2026-09-30)
Ordered by impact. Every item maps to a verified finding.

---

## P0 — Mobile blockers (fix first — users can't complete tasks without these)

| # | File | Fix | Verify |
|---|---|---|---|
| 1 | `modules/sms/pages/Contacts.jsx` | Wrap `<table>` in `overflow-x-auto` or add `MobileCard` below `md` | 375px: no horizontal page scroll |
| 2 | `pages/treasury/FinancialReports.jsx` | `min-w-[560px]` tables → card list on `md:hidden`, table `hidden md:block` (same pattern as `MemberDirectory`) | 375px: report readable without scroll |
| 3 | Any `/dashboard/*` route not inside `DashboardLayout` | Route through the layout so bottom nav + drawer appear | Bottom nav shows on every page |
| 4 | 49 unconfirmed deletes (grep `onClick.*delete\|handleDelete` in `pages/`) | Wrap in `ConfirmDialog` or `window.confirm` | Tap-delete asks first |

## P1 — Daily friction

| # | File(s) | Fix | Verify |
|---|---|---|---|
| 5 | `components/departments/ActivityFeed.jsx` | 36px → 44px targets | Tap without mis-taps |
| 6 | 10 `group-hover` files (`AdminDashboard`, `PlatformDashboard`, `HeroSection`, `MinistriesCarousel`, `FeaturedAnnouncements`, `FeaturedPhotos`, `PhotoGallery`, `PublicLayout`, `Announcements`) | Add visible trigger for touch (`focus-within` + always-visible kebab/edit on `sm`) | Action visible without hover |
| 7 | `pages/departments/DepartmentHandover.jsx` | `min-w-[140px]` inputs → `flex-col` on mobile | Fits 375px |
| 8 | 273 `<input>` missing `type=`; 0 `inputMode` anywhere | `type="email"\|"tel"\|"number"` + `inputMode` on amount/phone fields | Right keyboard pops up |
| 9 | Form pages with <1 label per input (10 files listed in ux-audit #10) | `<label>` or `aria-label` on every input | Screen reader names fields |
| 12 | Toast inconsistency | Standardize on `ToastContext`; drop unused `react-toastify` dep | One toast style |

## P2 — Consistency / design system (do once, prevents all future drift)

| # | Action | Verify |
|---|---|---|
| 13 | Extract `components/ui/{Input,Label,Toolbar,PageTitle}.jsx` from the repeated class-strings | New pages use them; grep count of the old strings drops |
| 14 | Create `utils/format.js` (`fmtKES`, `fmtDate`, `fmtDateTime`, `fmtRelative`) | All 9 duplicating files import it |
| 15 | Sweep the 230 `style={{}}` instances (hotspots listed) → tokens | Zero hard values outside `styles/` |
| 16 | One hard hex `text-[#1B3252]` in `NewsletterSection.jsx` → token | Grep returns 0 |
| 17 | Strip 85 files' `console.*` via `esbuild.drop: ['console','debugger']` in prod | Build output has none |

## P1-backend — contract & drift (pairs with the UX work)

| # | Action | Verify |
|---|---|---|
| 18 | Route all responses through `utils/ResponseHandler` — kill the raw `res.json` shapes in the 10 route files listed in code-quality #A1 | Every endpoint returns `{success,data,error,message}` |
| 19 | Unify duplicate mounts: `/api/departments` vs `/api/department`, `/api/payments` vs `/api/payment` | One route file per resource |
| 20 | Extract inline `pool.query` from the 6 route files (up to 46 queries in `department_community.routes.js`) into repositories | Routes call repo methods only |
| 21 | Verify `church_id` scoping on `CommentsRepository`, `ActivityFeedRepository`, `AuditLogRepository`, `AccountingExportRepository`, `TelegramAuthRepository`, `UserSettingsRepository` | No cross-tenant leak |
| 22 | Delete `utils/jwt.js` + `RichTextEditor.jsx` (dead + dangerous) | Files gone |

## Batch order (do in this sequence)

1. **P0 #1-4** — an afternoon; makes the app usable on a phone
2. **P2 #13-14** — extract primitives FIRST so P1 fixes write against them
3. **P1 #5-9** — page-by-page ergonomics using the new components
4. **Backend #18-21** — contract cleanup while UI settles
5. **P2 #15-17** — final polish sweep

## Estimated effort

P0: ~4h · P1: ~2 days · P2+backend: ~2 days.
If Path A (concierge SaaS) is the go-to-market plan, P0 + P2 #13-14 is the
minimum before showing it to another church.
