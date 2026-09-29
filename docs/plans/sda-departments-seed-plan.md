# SDA Departments Seed Plan — Kiserian Main + Shared Catalog

**Source document:** `D:\Kiserian Main SDA Communications Department\Data\2026 Church Workers Kiserian Main.docx`
(matching text export: `Church workers List with departments.txt` in the same folder)

## Goal

1. Seed Kiserian Main SDA's real departments (~35) from the 2026 workers list.
2. Make the same canonical SDA list selectable/available to all other churches.
3. Attach auxiliary departments (Choristers, Pianist, PA System, Pathfinder, etc.) to a parent
   department instead of listing them flat.
4. Treat "Church Board" as a **role label** on leaders — NOT a department.

## Design decision: auxiliaries = child departments, not subcommittees

Two mechanisms exist in the codebase:

- `departments.parent_department_id` + `is_committee` — defined in
  `database/add_categories_hierarchy.sql` (NOT yet applied via backend/migrations).
  `DepartmentsList.jsx` already groups children under parents (line ~262) and the form
  already carries `parent_department_id` / `is_committee` fields.
- `department_subcommittees` + routes (migration `031_department_features.sql`,
  `department_community.routes.js`) — meant for ad-hoc teams inside a department.

**Chosen approach:** `parent_department_id`, because auxiliaries are still real departments
(own leaders, members, budgets, pages). Subcommittees stay for ad-hoc teams.

## Design decision: leadership, handover & access rights

### Current state (verified)
- `departments.head_id` — single head; set via `PUT /departments/:id` from
  `DepartmentHeadAllocation.jsx`.
- `department_members.role_in_department` — 'Head'/'Assistant'/'Member' strings, no rights attached.
- `department_permissions` — per-user per-dept grants (`read`,`write`,`admin`,
  `manage_members`,`manage_budget`) via `setDepartmentPermission`. **No expiry column.**
- `user_roles`/`roles` — global roles ('Department Head' at level 2 via `database/role_hierarchy.sql`).
- `audit_log` + `department_activities` — exist, usable for the handover trail.
- **Gaps:** no assistant head field, no temporary access, no handover workflow,
  setting `head_id` does NOT sync the 'Department Head' user role.

### Access-rights model (new)
`department_leadership` table — one row per appointed position:

| Column | Purpose |
|---|---|
| `position` | `head`, `assistant`, `secretary`, `acting_head` |
| `allocation_type` | `permanent` or `temporary` |
| `start_date` / `end_date` | `end_date` NULL = permanent; set = temporary/acting |
| `appointed_by`, `is_active` | who appointed; soft-revoke flag |
| `handover_id` | links to the handover record that created it |

**Default permission bundle** (written to `department_permissions` on appointment):
- Permanent head → `admin` (all dept permissions) + global `Department Head` role
- Temporary/acting head → `admin` **with `expires_at`**; role revoked automatically at expiry
- Assistant → `write` + `manage_members` (+ new `Assistant Department Head` role, level 1.5)
- Secretary → `write`

### Handover protocol (new `department_handovers` table)
`id, department_id, church_id, outgoing_user_id, incoming_user_id, position,
status (pending|accepted|completed|declined|cancelled), handover_date, checklist JSONB,
notes, initiated_by, created_at, completed_at`

Flow:
1. Admin appoints successor → handover row `pending`; notify outgoing + incoming.
2. Incoming accepts → `accepted`; leadership row + permissions granted (temp = with expiry).
3. Outgoing completes checklist (records, funds/assets, pending programs, keys/logins,
   member roster) → `completed`; outgoing's `head_id` cleared, dept permissions revoked,
   `Department Head` role removed **only if they head no other department**.
4. Decline/cancel → `declined`/`cancelled`; incoming grants rolled back.
- Every step writes to `audit_log` + `department_activities`; `department_permissions`
  gains `expires_at`, `granted_by`, `is_temporary` columns.
- A startup sweep (or per-request check) expires temporary grants past `end_date`.

### Subcommittee heads — dept-head powers, scoped + finance gate

`department_subcommittees.lead_user_id` already stores the subcommittee head
(migration 031). Rights model:

- **Scoped head powers**: subcommittee head manages their subcommittee like a dept
  head — members (`subcommittee_members`), programs/events, communications,
  subcommittee budget. Same `permanent|temporary` + expiry model via
  `department_leadership` (`position='subcommittee_head'`, `subcommittee_id` set).
- **Auth gate**: new `canManageSubcommittee(user, sub)` next to `canManageDepartment`
  (`department_community.routes.js` line 22) — true for the sub lead (scoped to that
  subcommittee), the parent dept's managers, and MANAGER_ROLES.
- **Finance/reporting gate (requires parent dept head approval)**:
  - `department_budgets`/`event_collections`/`department_programs` gain `subcommittee_id`.
  - Sub head creates a budget spend/expense/report → an `approval_requests` row is
    created (`module='department'`, `amount`, `request_data` holds the spend details)
    routed to the parent department head — NOT auto-posted to treasury.
  - Parent dept head approves/rejects in the existing approvals inbox; on approval the
    spend posts and treasury sees it; sub head is notified.
  - Dept head sees subcommittee budgets/spend rolled up in dept budget view.
- Handover protocol applies to subcommittee leads identically (pending → accept →
  checklist → complete).

## Canonical department catalog (from docx)

Category / name / parent (→) / is_committee:

| Category | Department | Parent | Notes |
|---|---|---|---|
| Leadership | Elders | — | |
| Leadership | Deacons | — | |
| Leadership | Deaconesses | — | |
| Leadership | Treasury | — | docx "TREASURER" + assistants |
| Leadership | Church Clerk | — | |
| Leadership | Stewardship | — | docx "STEWARDSHIP LEADER" |
| Leadership | Religious Liberty | — | docx "RELIGIOUS LIBERTY LEADER" |
| Ministry | Personal Ministry | — | |
| Ministry | Interest Coordinator | → Personal Ministry | |
| Ministry | Evangelism | → Personal Ministry | |
| Ministry | Publishing Ministry | — | docx "PUBLISHING DIRECTOR" |
| Ministry | V.O.P./S.O.P. | → Publishing Ministry | |
| Ministry | Health Ministry | — | |
| Ministry | Family Life | — | |
| Ministry | Prayer Ministry | — | |
| Ministry | Nurture and Retention | — | |
| Ministry | Adventist Women Ministry | — | AWM |
| Ministry | Annah's Family | → Adventist Women Ministry | |
| Ministry | Adventist Men Ministry | — | AMM |
| Ministry | Adventist Possibility Ministry | — | APM |
| Ministry | Dorcas | — | community services |
| Ministry | Chaplaincy | — | |
| Ministry | A.M.R. | — | Adventist-Muslim Relations |
| Youth | Youth Ministry | — | |
| Youth | Pathfinder Club | → Youth Ministry | |
| Youth | Adventurer Club | → Youth Ministry | |
| Youth | Ambassadors | → Youth Ministry | |
| Youth | Master Guide | → Youth Ministry | |
| Youth | Children Ministry | — | docx "CHILDREN MINISTRY" |
| Youth | VBS | → Children Ministry | Vacation Bible School |
| Youth | KID – Kids in Discipleship | → Children Ministry | |
| Worship | Music Ministry | — | docx "MUSIC CO-ORDINATOR" |
| Worship | Church Choir | → Music Ministry | |
| Worship | Choristers | → Music Ministry | |
| Worship | Pianist | → Music Ministry | |
| Education | Sabbath School | — | docx "SABBATH SCHOOL SUPERINTENDENT" |
| Education | Librarian | → Sabbath School | |
| Education | Education | — | docx "EDUCATION SECRETARY" |
| Education | School Chair | → Education | |
| Support | Communication | — | docx "COMMUNICATION SECRETARY" |
| Support | PA System | → Communication | |
| Special | Camp Meeting | — | is_committee |
| Special | Development | — | is_committee |
| Special | Welfare | — | is_committee |

**Excluded:** `CHURCH BOARD MEMBERS` → becomes a `Church Board Member` role label
assigned to the 47 listed members (or to dept heads).

## Tasks

### 1. Create shared department catalog — NEW FILE
`backend/scripts/data/sda-departments.js`
- Export `SDA_DEPARTMENTS`: array of `{ name, slug, category, parent, isCommittee }`
  matching the table above.
- Verification: `node -e "console.log(require('./backend/scripts/data/sda-departments.js').SDA_DEPARTMENTS.length)"` prints ~44.

### 2. Add hierarchy + leadership migration — NEW FILE
`backend/migrations/034_department_hierarchy_leadership.sql`
- `departments`: `parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL`,
  `is_committee BOOLEAN DEFAULT false`, index on `parent_department_id`.
  (Equivalent SQL sits in `database/add_categories_hierarchy.sql` but was never folded into
  backend/migrations — a 2026-06-23 session log notes the columns were missing and the
  POST route had to be rewritten without them.)
- `department_permissions`: `+ expires_at TIMESTAMPTZ`, `+ granted_by UUID`,
  `+ is_temporary BOOLEAN DEFAULT false`.
- NEW `department_leadership` table (columns per design above,
  + `subcommittee_id UUID NULL` for subcommittee heads).
- NEW `department_handovers` table (columns per design above,
  + `subcommittee_id UUID NULL`).
- `department_budgets`, `event_collections`, `department_programs`:
  `+ subcommittee_id UUID`.
- NEW role `Assistant Department Head`; NEW `Church Board Member` role;
  NEW `Subcommittee Head` role.
- Verification: `information_schema.columns` shows new columns/tables; roles inserted.

### 3. Update `backend/scripts/seed-church-data.js` — EXISTING
- Fix `WORKERS_FILE` (line 6): currently `D:\\VIbeCode\\Msabato CMS\\Church workers List with departments.txt`
  → point to `D:\Kiserian Main SDA Communications Department\Data\Church workers List with departments.txt`,
  with a clear error if the file is missing.
- Department upsert (line ~546): switch `ON CONFLICT (name)` → keyed on `(slug, church_id)`
  to match the multi-tenant index `departments_slug_church_key`.
- Set `parent_department_id` and `is_committee` from the catalog after parents are created
  (two-pass insert: parents first, then children).
- Populate `department_leadership` from the docx: section head (first listed /
  Leader / Director) → `head` + `permanent`; 'Assistant' members → `assistant` +
  `permanent`; 'Secretary' → `secretary`. Seed permission bundles accordingly.
- Ensure `Church Board Member` role exists in `roles` and assign it to board-listed people.
- Verification: run script; `SELECT count(*) FROM departments WHERE church_id=<kmain>`
  ≈ 44, children have non-null `parent_department_id`, `department_leadership` has
  ~1 head + N assistants per section, Church Board members carry the role.

### 4. Update `backend/scripts/seed-churches.js` — EXISTING
- Replace the 10-item `DEPARTMENTS` array (line 60) with the shared catalog so
  `newlife`, `mount-horeb`, `kiserian-dam` (and any future church) get the full
  selectable set, including parent links (resolve parent ids per church after insert).
- Verification: `SELECT count(*) FROM departments WHERE church_id=<each>` equals
  catalog size for all three churches.

### 5. Update `backend/scripts/generate-comprehensive-seed.js` — EXISTING
- Extend `departmentMappings` (line ~157) so worker groups map to the new names
  (e.g. `Deaconry` → `Deacons`/`Deaconesses`, `Treasurer` → `Treasury`).
- Verification: script runs without "department not found" warnings.

### 6. Update departments routes — EXISTING
`backend/routes/departments.routes.js`
- POST (~line 232) and PUT (~line 291): accept and persist `parent_department_id`
  and `is_committee` (frontend already sends them; currently dropped).
- On `head_id` change: create a `pending` handover record instead of silently swapping,
  and sync the `Department Head` user_role (grant incoming; revoke outgoing only if they
  head no other department).
- Verification: POST `/api/departments` with `parent_department_id` returns a row
  containing the parent id; changing `head_id` creates a handover row.

### 6b. Leadership & handover endpoints — NEW routes
`backend/routes/department_leadership.routes.js` (new file, mounted under /api/departments)
- `POST /:id/leadership` — appoint head/assistant, `allocation_type` + `end_date`;
  grants the permission bundle. Accepts `subcommittee_id` for subcommittee heads.
- `GET /:id/leadership` — current + historical leadership.
- `POST /:id/handovers` `PUT /handovers/:hid/accept|decline|complete` — the workflow above.
- `GET /leadership/expiring` — admin view of temporary grants nearing `end_date`.
- Expiry sweep on server start + daily timer: deactivate expired temporary leadership,
  revoke `department_permissions`, remove roles where appropriate.
- Restricted to Super Admin/Pastor/First Elder (initiate) + involved users (accept/decline).
- Verification: integration test exercises appoint→accept→complete and shows old head's
  permissions revoked.

### 6c. Subcommittee head + finance gate — EXISTING routes
`backend/routes/department_community.routes.js`
- New `canManageSubcommittee(user, sub)` helper; swap `canManageDepartment` for it on
  subcommittee member/program/event/budget endpoints so the sub lead manages their own.
- Setting `lead_user_id` on a subcommittee (POST/PUT ~lines 130-176) creates a
  `department_leadership` row (`subcommittee_head`) + scoped permission bundle instead
  of just updating the column; goes through the same handover flow on replacement.
- `POST /:id/subcommittees/:sid/spend` — creates `approval_requests` row routed to the
  parent dept head (`approver_id` = active dept head); spend posts only on approval.
- `GET /:id/subcommittees/:sid/budget` — dept head sees roll-up; sub head sees own.
- Verification: sub lead can add members but a spend request lands in dept head's
  approval inbox and is invisible to treasury until approved.

### 7. Frontend — selectable suggestions + parent picker — EXISTING + NEW
- NEW `frontend/src/constants/sdaDepartments.js`: mirror of the catalog names/categories.
- `DepartmentsList.jsx` create form (lines ~337-355): add a `datalist` of standard
  SDA names on the Name input; add a "Parent department" select populated from existing
  departments; add `is_committee` checkbox; add `Worship` and `Special` to the
  category `<select>` options (lines 342-346).
- Verification: create form shows suggestions + parent select; child departments render
  nested in the list.

### 7b. Leadership allocation & handover UI — EXISTING + NEW
- `DepartmentHeadAllocation.jsx` (existing): per department, pickers for Head AND
  Assistant; `permanent|temporary` toggle; end-date field shown when temporary;
  shows current holder and pending handover status.
- NEW `DepartmentHandover.jsx` page (or tab on DepartmentDashboard): incoming leader
  sees pending handover with checklist, accepts/declines; outgoing sees checklist to
  complete; admins see handover history and expiring temporary grants.
- Subcommittee management UI: lead picker per subcommittee (permanent/temporary),
  subcommittee budget view; "Request spend approval" button for sub heads creating
  an approval request; dept head sees pending sub-approvals + subcommittee roll-up.
- New dashboard route in `frontend/src/router/dashboard.routes.jsx`; menu item under
  Departments.
- Verification: full allocate→accept→complete round-trip works in UI; temporary
  grants show expiry date; sub-head spend request appears in dept head approvals.

### 8. Run seeds — requires local Postgres + `backend/.env`
- `node backend/scripts/seed-church-data.js` (Kiserian Main real data)
- `node backend/scripts/seed-churches.js` (demo churches)
- Verification: department counts per church match catalog; Kiserian Main heads assigned.

## Open items / assumptions
- Kiserian Main = the church row used by `seed-church-data.js` (first church row by
  `created_at`, line 457). Confirm it resolves to the right church if multiple exist.
- PA System parented under Communication (it's AV/media work) — easy to move under Music.
- `getDeptCategory` in seed-church-data.js will be superseded by the catalog's `category`.
