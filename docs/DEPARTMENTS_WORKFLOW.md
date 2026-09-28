# "My Departments" Workflow — Msabato CMS

Scope: what happens when a member taps **My Departments** on the mobile app
(or navigates the web equivalent), how membership requests get approved, and
how the tables relate.

Code touched by this flow:

- `mobile/flutter/flutter-mobile/lib/screens/departments_screen.dart`
- `mobile/flutter/flutter-mobile/lib/services/api_service.dart` (`getMyDepartments`)
- `backend/routes/mobile.routes.js` → `GET /api/mobile/my-departments`
- `backend/controllers/mobile.controller.js` → `getMyDepartments`
- `backend/repositories/MobileRepository.js` → `getMyDepartments`
- `backend/routes/departments.routes.js` → membership request/approve/reject
- Tables: `churches`, `departments`, `department_members`, `users`, `members`

## 1. How it works, step by step

1. **Dashboard count** — `GET /api/mobile/dashboard` runs a member-scoped count
   of `department_members` where `user_id = <you> AND is_active = true`
   (that's what the *My Departments* stat card shows).
2. **Tap the card** → Flutter routes to `/departments`
   (`context.push('/departments')`).
3. **Screen loads** → `departments_screen.dart` calls
   `ApiService.getMyDepartments()` → `GET /api/mobile/my-departments`
   with the user's Bearer JWT.
4. **Backend resolves the JWT** → `req.user.id` + `req.user.church_id`
   (tenant isolation — you can only ever see your own church's departments).
5. **Repository query**:

   ```sql
   SELECT d.id, d.name, d.description, d.category,
          dm.role_in_department, dm.joined_at
   FROM department_members dm
   JOIN departments d ON d.id = dm.department_id
   WHERE dm.user_id = $1        -- the logged-in user
     AND dm.is_active = true    -- only approved memberships
     AND d.is_active = true     -- only live departments
     AND d.church_id = $2       -- tenant scope
   ORDER BY d.name
   ```
6. **Response** → `{ success, data: { data: [ ...rows ] } }`
   (double `data` — `api_service._unwrapData` strips it) → each row renders
   as a card with **name, category chip, your role in the department, and
   description**.
7. **Empty state** — if you belong to none, the screen shows a prompt instead
   of errors.

## 2. DFD

### Level 0 — context

```mermaid
flowchart LR
    M((Member)) -->|opens Departments tab| A[Mobile App]
    A -->|"GET /api/mobile/my-departments<br/>Bearer JWT"| API[Express API]
    API -->|SQL SELECT| DB[(PostgreSQL cms_db)]
    DB --> API --> A --> M
```

### Level 1 — decomposed

```mermaid
flowchart TD
    M((Member)) -->|"tap My Departments"| UI[departments_screen.dart]
    UI -->|"getMyDepartments()"| SVC[ApiService]
    SVC -->|"GET /mobile/my-departments<br/>+ Authorization: Bearer JWT"| MW[authenticateToken middleware]

    MW -->|JWT valid → req.user = id, church_id| CTRL[mobile.controller.getMyDepartments]
    MW -.->|invalid/expired → 401| M

    CTRL -->|"getMyDepartments(userId, churchId)"| REPO[MobileRepository]

    REPO --> Q1[(department_members)]
    REPO --> Q2[(departments)]
    Q1 -->|"dm.user_id = me<br/>dm.is_active = true"| REPO
    Q2 -->|"d.is_active = true<br/>d.church_id = my church"| REPO

    REPO -->|rows: id, name, description,<br/>category, role_in_department, joined_at| CTRL
    CTRL -->|"{ success, data }"| SVC
    SVC -->|unwrapped list| UI
    UI -->|cards: name / category / role / description| M
```

### Membership request & approval (how a row gets into `department_members`)

```mermaid
flowchart TD
    U((Member)) -->|"request to join dept"| REQ["POST /api/departments/:id/members"]
    REQ --> P1[(department_members<br/>status='pending'<br/>requested_at=now)]
    P1 -->|notify| H((Dept Head /<br/>Pastor))
    H -->|"GET /:identifier/pending-requests"| P2[Review pending list]
    P2 --> APPROVE["POST /:identifier/approve/:userId"]
    P2 --> REJECT["POST /:identifier/reject/:userId"]
    APPROVE -->|"status='approved'<br/>approved_at, approved_by<br/>is_active=true"| P1
    REJECT -->|"status='rejected'"| P1
    P1 -->|"is_active=true rows only"| MY["My Departments list"]
```

**Status lifecycle in `department_members`:**

```mermaid
stateDiagram-v2
    [*] --> pending: member requests to join
    pending --> approved: head/pastor approves
    pending --> rejected: head/pastor rejects
    approved --> inactive: member removed (is_active=false)
```

Only `status='approved' AND is_active=true` rows appear in *My Departments*.

## 3. ERD

```mermaid
erDiagram
    CHURCHES ||--o{ DEPARTMENTS : "church_id"
    CHURCHES ||--o{ USERS : "church_id"
    CHURCHES ||--o{ DEPARTMENT_MEMBERS : "church_id"
    USERS ||--o{ USER_ROLES : "user_id"
    ROLES ||--o{ USER_ROLES : "role_id"
    USERS ||--o| MEMBERS : "user_id"
    USERS ||--o{ DEPARTMENT_MEMBERS : "user_id"
    MEMBERS ||--o{ DEPARTMENT_MEMBERS : "member_id"
    DEPARTMENTS ||--o{ DEPARTMENT_MEMBERS : "department_id"
    DEPARTMENTS ||--o{ DEPARTMENT_BUDGETS : "department_id"
    DEPARTMENTS ||--o{ TASKS : "department_id"

    CHURCHES {
        uuid id PK
        varchar name
        varchar slug
        boolean is_active
    }

    USERS {
        uuid id PK
        varchar email
        varchar username
        varchar first_name
        varchar last_name
        uuid church_id FK
        varchar avatar_url
        timestamptz last_login
    }

    MEMBERS {
        uuid id PK
        uuid user_id FK
        varchar membership_number
        date joined_date
        varchar membership_status
        uuid church_id FK
    }

    DEPARTMENTS {
        uuid id PK
        varchar name
        text description
        varchar category
        varchar slug
        uuid head_id
        boolean is_active
        uuid church_id FK
    }

    DEPARTMENT_MEMBERS {
        uuid user_id FK
        uuid member_id FK
        uuid department_id FK
        varchar role_in_department
        varchar status "pending|approved|rejected"
        boolean is_active
        timestamp requested_at
        timestamp joined_at
        uuid approved_by FK
        timestamp approved_at
        uuid church_id FK
    }

    DEPARTMENT_BUDGETS {
        uuid id PK
        uuid department_id FK
        numeric total_amount
        numeric spent_amount
        numeric remaining_amount
        varchar fiscal_year
    }

    TASKS {
        uuid id PK
        uuid department_id FK
        uuid church_id FK
        varchar title
        varchar status
        varchar priority
        uuid assigned_to
    }
```

### Key relationships

- **`department_members` is the join table** between `users` (or `members`) and
  `departments` — it carries both `user_id` (login identity) and `member_id`
  (church record), plus role/status/approval audit columns.
- **Tenant isolation**: every row carries `church_id`; the query filters on
  `d.church_id = req.user.church_id`, so a member of New Life can never see
  Mount Horeb's departments.
- **`departments.head_id`** points at the department leader (used by the
  Department Head dashboard for dept-scoped stats).
- **`role_in_department`** is the member's *function inside the dept*
  (e.g. "Department Head", "Secretary") — distinct from the global RBAC role.

## 4. Request/response contract

```http
GET /api/mobile/my-departments
Authorization: Bearer <jwt>
```

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "ae035c1e-…",
        "name": "Choir",
        "description": "Music ministry…",
        "category": "Worship",
        "role_in_department": "Member",
        "joined_at": "2026-09-23T10:41:00Z"
      }
    ]
  }
}
```

Web equivalent endpoints (same tables, richer data):

- `GET /api/departments/:identifier/dashboard` — dept dashboard (members, pending requests)
- `GET /api/departments/:identifier/pending-requests` — approval queue
- `POST /api/departments/:identifier/approve|reject/:userId` — decision
- `GET /api/departments/:departmentId/statistics|activity|budget|members` — drill-downs
- `GET /api/mobile/departments` — browse *all* active church departments (used by the departments list when you aren't scoped to "mine")

## 5. What's verified vs. what's stubbed

- **Verified live**: dashboard count, `my-departments` list, dept detail, pending-requests queue.
- **Verified local (all in smoke test)**: member can see exactly 2 departments, correct `role_in_department`.
- **Community features live** (2026-09-28): join requests, subcommittees, programs, dept events, private member↔head threads, head communications fan-out (thread + notification + optional JOSms SMS), message labels, role elevation, program/event contributions — all on `/api/departments/*` via `department_community.routes.js`, migration 031.
- **Wired in Flutter**: `departments_screen.dart` (browse-all + Request-to-join), `department_detail_screen.dart` (Overview / Subcommittees / Programs & Events / Messages / Requests tabs), route `/departments/:id`.
- **Still not wired in mobile**: message label editing (head sets labels on replies — endpoint `PUT /:id/messages/:mid/label` exists, UI long-press not yet added); subcommittee member assignment UI (endpoint exists); dept event creation form (endpoint `POST /:id/events` exists).

## 6. Community feature endpoints (all under `/api/departments`)

| Route | Who | Purpose |
|---|---|---|
| `POST /:id/join` | Member | Request entry → pending `department_members` row + dept-admins notification |
| `GET/POST /:id/subcommittees` | members / head | list / create |
| `PUT/DELETE /:id/subcommittees/:sid` | head | amend / dissolve |
| `POST/DELETE /:id/subcommittees/:sid/members(/:uid)` | head (assign) / member (self) | membership |
| `GET/POST /:id/programs` · `PUT /:id/programs/:pid` | members / head | dept programs with budget targets + raised totals |
| `GET/POST /:id/events` | members / head | dept events; `rsvp_required`, `rsvp_deadline`, `program_id` |
| `POST /:id/communications` | head | broadcast → comms row + per-member private thread message + in-app notification + SMS via `SmsHub` → JOSms (`send_sms` flag) |
| `GET /:id/threads` | head | member threads w/ last message, unread count, labels |
| `GET /:id/threads/mine` | member | own thread (auto-created) |
| `GET/POST /:id/threads/:tid/messages` | thread member / head | private chat |
| `PUT /:id/messages/:mid/label` | head | group/label a reply |
| `PUT /:id/members/:uid/role` | head | elevate member (`role_in_department`) |
| `POST /:id/programs/:pid/contribute` | member | money contribution |
| `POST /:id/events/:eid/contribute` | member | money contribution |

New tables (migration 031): `department_subcommittees`, `subcommittee_members`,
`department_programs`, `department_communications`,
`department_message_threads`, `department_messages`, `program_contributions`.
New columns: `departments.dept_type`, `events.program_id/rsvp_required/rsvp_deadline`,
`department_budgets.event_id/program_id/church_id`, `event_collections.event_id/program_id/department_id`.

### Communications fan-out DFD

```
Head (mobile/web)
   │ POST /departments/:id/communications {title, body, send_sms}
   ▼
department_communications row ──┬─> department_messages (each member thread, label="Announcement")
                                ├─> notifications (per member, in-app bell)
                                └─> if send_sms: SmsHub.sendSMS → Socket.io "process_bulk"
                                              → relay:{church_id} room → JOSms app → SMS
```

## 7. Improvement ideas

1. **Subcommittee member picker** in Flutter (head taps subcommittee → assign members)
2. **Label-assign UI** — long-press a message → pick label
3. **Dept event creation form** in the app (endpoint live)
4. **Budget attach UI** — pick event/program when creating a `department_budgets` row
5. **Unread-badge** on My Departments card driven by `threads` unread count
