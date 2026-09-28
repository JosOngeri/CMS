# Mobile-Ready Webapp Plan — Flutter Parity

Goal: the React webapp should feel like the Flutter app on phones — same
navigation model, same visual language — while keeping every feature web-based.
Design reference: `mobile/flutter/flutter-mobile/lib/theme.dart` +
`lib/widgets/main_shell.dart` (bottom `NavigationBar`: Home, Payments,
Events, News, Profile; card layouts; off-white bg; `#3B82F6` primary).

## Audit results

**Already good**
- Public pages (home, gallery, downloads, announcements) responsive
- Sidebar collapses to drawer `< lg`; hamburger present; header buttons ≥44px
- `MobileBottomNav` shipped (Phase 1) — mirrors the 5 Flutter destinations
- `manifest.json` exists; `MobileWrapper`/`MobileDashboard` precedent exists
- Theme CSS vars handle dark/light on the bottom nav automatically

**Broken / missing**
| # | Issue | Files / evidence |
|---|---|---|
| 1 | 10 `<table>` pages overflow on phones | `members/MemberDirectory`, `MembersList`, `payments/PaymentHistory`, `PaymentManagement`, `treasury/Contributions`, `FinancialReports`, `FixedAssets`, `Receipts`, `users/UserManagement`, `admin/Documents` |
| 2 | 37 page files have zero responsive classes | list below |
| 3 | `sw.js` never registered — PWA is dead code; cache name still `kmaincms-v1` | `public/sw.js`, no `navigator.serviceWorker.register` anywhere |
| 4 | Header search input stays full-width on mobile | `components/common/Header.jsx` |
| 5 | `MobileWrapper` wraps every role branch in `Dashboard.jsx` — duplicated pattern | `pages/dashboard/Dashboard.jsx` |
| 6 | Stale duplicate pages inflate the audit | `*Alternative.jsx`, `pages/PublicHome.jsx` vs `pages/public/PublicHome.jsx` |
| 7 | No real PWA icons — `logo.png` reused for 192/512 maskable | `public/manifest.json` |

**Pages with zero responsive classes** (37):

- Priority (real user pages): `announcements/Announcements`,
  `approvals/ApprovalInbox`, `auth/ForgotPassword`, `content/Content`,
  `departments/Departments`, `MyDepartments`, `CategoryManagement`,
  `DepartmentSettings`, `DepartmentHeadAllocation`, `DepartmentBranding`,
  `gallery/GalleryManagement`, `admin/SiteSettings`,
  `administration/Administration`, `insights/Insights`, `mobile/Mobile`,
  `monitoring/Monitoring`, `notifications/Notifications`,
  `NotificationDashboard`, `public/Privacy`, `PublicAnnouncementDetail`,
  `Terms`, `settings/Settings`, `telegram/Telegram`, `telegram/TelegramAuth`,
  `accessibility/Accessibility`, `documentation/Documentation`,
  `resources/Resources`, `security/Security`, `seo/SEO`,
  `platform/PlatformLogin`, `testing/Testing`
- Suspected dead code (verify usage, then delete): `AdministrationAlternative`,
  `DepartmentsAlternative`, `InsightsAlternative`, `SettingsAlternative`,
  `pages/PublicHome.jsx` (dup of `pages/public/PublicHome.jsx`)

## Phase 1 — App shell parity ✅ DONE (commit 6aefdba)

- `MobileBottomNav` (Home/Payments/Events/News/Profile), `pb-24` content
  clearance, safe-area inset, dynamic church name in sidebar

**Follow-up worth doing:** role-aware tabs — members get the 5 tabs; users
with admin roles could get a 6th "More" tab that opens the sidebar drawer
directly (Sidebar already exposes `isOpen`/`setIsOpen` — lift the trigger
into the nav).

## Phase 2 — Responsive pages (biggest usability win)

2a. **Table → card pattern** for the 10 table pages:

```jsx
<div className="hidden md:block overflow-x-auto"><table>…</table></div>
<div className="md:hidden space-y-3">
  {rows.map(r => <Card>{/* avatar/icon + title + subtitle + chevron */}</Card>)}
</div>
```

Pick the 2–3 most important fields per table for the card; the full row stays
in the desktop table. Order: MemberDirectory → MyPayments/PaymentHistory →
Contributions → Receipts → the rest.

2b. **Stat grids & layouts** on the remaining priority pages:
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, `flex-col sm:flex-row` toolbars,
full-width forms, `min-h-[44px]` touch targets on list rows/buttons.

2c. **Header mobile fix** — collapse the search input to an icon-expandable
field `< md`; move profile/notifications to compact icon buttons.

2d. **Delete stale duplicates** after a usage grep (the 5 `Alternative`/dup
files) so the audit numbers stop lying.

## Phase 3 — Flutter-style interaction details

- List rows = Flutter `ListTile` look: leading icon/avatar in a tinted
  rounded square, title + subtitle, trailing chevron
- Forms/modals become **bottom sheets** on `< sm` (slide-up panel, drag
  handle, `max-h-[85vh]`) — matches Material mobile patterns
- Pull-to-refresh is out of scope (web), but add `LoadingButton`-style busy
  states to match `lib/widgets/loading_button.dart`
- Skeleton loaders instead of blank spinners where Flutter shows shimmer

## Phase 4 — Real PWA

- Register the service worker in `main.jsx` (`if ('serviceWorker' in
  navigator)` + production-only)
- Update `sw.js`: rename cache `msabato-v1`, `cache-first` for
  `/assets/*` + fonts, `network-first` for `/api/*`, offline fallback to a
  cached shell page
- Generate proper 192/512 + maskable icons from `logo.png`
- `theme_color` → `#2A4F7F` (primary-strong, matches new brand surface)
- Wire `PWAInstaller` "Add to Home Screen" banner on mobile after 2nd visit

## Phase 5 — Hardening & testing

- Device matrix: iPhone SE (375px), Pixel 7 (412px), iPad (768px) — every
  dashboard section, both light and dark themes
- Lighthouse mobile ≥ 90; check CLS from the bottom nav
- Playwright/RTL spot tests for nav presence `< lg` and table/card swap
- Verify no horizontal scroll (`overflow-x`) on any page at 375px
- Flutter parity checklist: same destinations, same labels, same icons,
  same card styling

## Sequencing

1. ~~Phase 1~~ ✅
2. Phase 2a tables (MemberDirectory first — most-used page)
3. Phase 2b/2c/2d in one sweep
4. Phase 3 + 4 polish
5. Phase 5 test pass, then mark plan complete

## Risks

- `*Alternative` files may still be routed — confirm before deleting
- Service worker caching `/api` incorrectly could show stale member data —
  keep `network-first` with short TTL, never cache auth endpoints
- Role-filtered sidebar items vs fixed bottom nav: bottom nav destinations
  are all member-safe routes (overview, payments/my, events, announcements,
  profile) so no permission gating needed
