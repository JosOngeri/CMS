# Role Dashboards — Assessment & Build Plan

## Goal

Every role gets a dashboard that (a) shows only what that role needs,
(b) uses real API data — no hardcoded metrics, (c) has links that
actually resolve. Complexity is reserved for admin/finance roles.

## Current state (audited 2026-09-30)

| Role | Gets today | Verdict |
|---|---|---|
| Super Admin | `SuperAdminDashboard` | OK — real stats/health/activity; 1 broken link `/admin/activity` |
| Pastor | `PastorDashboard` | Real APIs work; has fake `memberEngagement: 85`, `departmentActivity: 92`; broken link `/activity` |
| First Elder | MemberDashboard | **Wrong** — church leadership needs the ministry view |
| Treasurer | `TreasurerDashboard` | Real APIs; fake `collectionRate: 85`; link `/treasury/transactions` → **route doesn't exist** |
| Department Head | `DepartmentHeadDashboard` | Real APIs; `activeMembers` faked as `members × 0.85`; link `/department/activity` wrong path |
| Asst. Dept Head | MemberDashboard | **Wrong** — needs dept view |
| Subcommittee Head/Collector | MemberDashboard | **Wrong** — needs dept/collections view |
| Elder, Church Board, Deacon/ess | MemberDashboard | Acceptable for Deacon/ess; Elders/Board should see ministry view |
| Member | MemberDashboard (rebuilt) | Done — giving hero, real obligations/announcements/events |
| Child | MemberDashboard | Done — permission-gated sections hide finance |

## Implementation

### 1. Dispatch — `Dashboard.jsx`

```text
Super Admin                          → SuperAdminDashboard
Pastor, First Elder, Elder,
  Church Board Member                → PastorDashboard (ministry view)
Treasurer                            → TreasurerDashboard
Department Head, Assistant Dept Head,
  Subcommittee Head,
  Subcommittee Collector             → DepartmentHeadDashboard
Member, Child, Deacon, Deaconess,
  (default)                          → MemberDashboard
```

### 2. Remove fake data

- PastorDashboard: delete `memberEngagement: 85` / `departmentActivity: 92`
  fallbacks — show real values or hide the stat when the API has none
- TreasurerDashboard: same for `collectionRate: 85`
- DepartmentHeadDashboard: `activeMembers = members × 0.85` → show
  `departmentMembers` directly (backend gives real count)

### 3. Fix broken links

- PastorDashboard `/activity` → `/dashboard/announcements` (or drop)
- TreasurerDashboard `/treasury/transactions` → `/dashboard/treasury/journal-entries`
  (no transactions route exists)
- DepartmentHeadDashboard `/department/activity` → `/dashboard/departments/handovers`
  or dept-scoped activity path
- SuperAdminDashboard `/admin/activity` → `/dashboard/approvals`

### 4. Verify per-role

Login matrix (prod accounts): Admin, pastor.*, elder.*, treasurer.*,
abelnyakundi108 (Dept Head), abigaelmokaya131 (Asst Head),
edwardongeri16 (Elder), arnoldmayaka26 (Deacon), aliceonchari53
(Deaconess), JosOngeri (Member), childaliceamalemba359 (Child).

Checks per account: dashboard loads, no console errors, every link
resolves, no hardcoded percentages, finance sections only where the
role has finance perms.

## Status: Implemented & deployed (commit 73fb04f)

- Dispatch map covers all 14 roles
- All fake fallbacks removed; dashboards show real API data or zeros
- Backend `getDepartmentStats`/`getFinancialStats` now return camelCase
  (were snake_case — dashboards silently showed zeros)
- `getSystemHealth` reports real host metrics (CPU load, memory, uptime,
  DB latency)
- All card/activity links fixed to real `/dashboard/*` routes
- SystemOrganismViz: null-safe ("—" for unmeasured), divide-by-zero guard
- Verified on prod: dept-stats `4 members / KES 919,200`; system metrics
  `cpu 13% / mem 11% / uptime 34h / db 2ms`

### 5. Defer (not in scope)

- Purpose-built ElderDashboard/BoardDashboard — the Pastor view covers
  ministry oversight for now
- Child-specific dashboard — MemberDashboard permission-gating suffices
