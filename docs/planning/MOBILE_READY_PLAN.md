# Mobile-Ready Webapp Plan — Flutter Parity

Goal: the React webapp should feel like the Flutter app on phones — same
navigation model, same visual language — while keeping every feature web-based.

## Current state (audited)

| Area | Status |
|---|---|
| Public site (home, gallery, downloads) | Mostly responsive; mobile hamburger menu works |
| Dashboard sidebar | Slide-in drawer `< lg` + hamburger — works but desktop-pattern |
| Bottom navigation | **Missing** — Flutter uses Home / Payments / Events / News / Profile |
| `MobileWrapper` + `MobileDashboard` | Exists, only used on dashboard home |
| Tables (`<table>`) | **10 pages overflow on phones** (members, payments, treasury, users, docs, receipts) |
| Pages with zero responsive classes | **23 files** |
| PWA | `manifest.json` + `sw.js` exist; icons are just `logo.png`; install prompt not wired |
| Touch targets | Header buttons already 44px; many list items/tables are not |

## Flutter design language to mirror (theme.dart / main_shell.dart)

- Primary `#3B82F6` blue (web theme already close — `#4A6FA5`)
- `NavigationBar` bottom nav: **Home, Payments, Events, News, Profile**
- Card-based layouts, rounded corners, off-white background
- Safe-area aware bottom UI, touch-friendly rows

## Phase 1 — App shell parity (Flutter look)

1. **`MobileBottomNav` component** (`components/common/MobileBottomNav.jsx`)
   - Fixed bottom bar, visible `< lg` only, inside `DashboardLayout`
   - 5 destinations matching Flutter: Home `/dashboard`, Payments
     `/dashboard/payments`, Events `/dashboard/events`, News
     `/dashboard/announcements`, Profile `/dashboard/profile`
   - Active = filled icon + primary color; inactive = outline icon + secondary
   - `padding-bottom: env(safe-area-inset-bottom)` for notched phones
2. Sidebar keeps working as the "everything else" drawer (hamburger stays in
   header; optionally a 6th "More" tab could open it later)
3. `main` content gets `pb-20 lg:pb-6` so the bottom bar doesn't cover content

## Phase 2 — Page responsiveness

Convert the 10 table pages to a responsive pattern:

```
<div className="hidden md:block"><table>…</table></div>
<div className="md:hidden">{rows.map(r => <Card …/>)}</div>
```

Pages: `MemberDirectory`, `MembersList`, `PaymentHistory`,
`PaymentManagement`, `Contributions`, `FinancialReports`, `FixedAssets`,
`Receipts`, `UserManagement`, `admin/Documents`.

Then fix the 23 pages with no responsive classes: stat grids
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, full-width forms, wrapped
action buttons, `min-h-[44px]` touch targets.

## Phase 3 — Flutter-style details

- Modal → bottom-sheet pattern on `< sm` for forms
- Sticky page headers collapse on scroll (optional)
- List rows: avatar/icon left, title+subtitle, chevron right (Flutter ListTile
  pattern) for member/event/department lists

## Phase 4 — PWA polish

- Generate real 192/512 + maskable icons from logo
- Verify `sw.js` registers; add offline fallback for shell + `cache-first`
  for static assets, `network-first` for `/api`
- Wire `PWAInstaller` "Add to Home Screen" prompt
- `theme_color` → match `--color-primary-strong`

## Verification

- Chrome DevTools emulation (iPhone SE/14, Pixel) on every dashboard section
- Lighthouse mobile score ≥ 90
- Real phone test on `https://msabato.co.ke` after deploy
- Parity check: same 5 destinations and iconography as the Flutter shell

## Order of work

1. Phase 1 bottom nav (biggest visual win, self-contained)
2. Phase 2 table-to-card conversions (biggest usability win)
3. Phase 3 + 4 polish
