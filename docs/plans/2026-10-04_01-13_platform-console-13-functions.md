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
