# Plan: Department Feature Upgrade — Head & Member Workflows

Date: 2026-09-28 (rev 2 — private threads + dept type + SMS)
Status: IN PROGRESS

## Goal

Turn departments into a full working unit with real two-way workflows,
on both the backend and the Flutter app.

### Department Head capabilities
1. Approve/reject join requests (backend exists → wire into app)
2. Create & amend **subcommittees** (sub-teams inside a department)
3. Create **events** and **programs** for the department
4. Attach **budgets** to events or programs
5. **RSVP requests** on department events
6. Send **communications** — one send hits **three channels**:
   - the department's public thread
   - each member's **private 1:1 thread** with the head
   - **SMS** to each member's phone via the JOSms relay app
7. Read **private member↔head threads**, replies grouped/labelled
   (Feedback, Prayer Request, Volunteer, …)

### Member capabilities
1. Request to join a department
2. Private thread with the dept head (not shared with other members)
3. RSVP to dept events
4. Contribute (money) to events and programs
5. See their subcommittees
6. Be elevated (`role_in_department` change → e.g. "Assistant Head")

### Department type
`departments.dept_type` — classifies the dept (Ministry / Service /
Outreach / Administrative / Support). Shown on cards, used by heads when
creating subcommittees.

## What already exists

| Piece | State |
|---|---|
| `department_members` pending→approved/rejected + approve/reject endpoints | Live |
| `GET /api/mobile/my-departments` | Live |
| `events.department_id`, `event_attendance.rsvp_status` | Live |
| `department_budgets` table | Exists (needs event/program links) |
| `GET /departments/:id/communications` | Route exists, **table missing on VPS** |
| `tasks`, `event_collections` | Created (migration 030) |
| `SmsHub.sendSMS` → `io.to('relay:{churchId}').emit('process_bulk')` | Live — this IS the JOSms channel |
| `sendNotification` helper (in-app notifications) | Live |

## New schema — migration 031 (revised)

```text
department_subcommittees        id, department_id, church_id, name, description, lead_user_id, is_active
subcommittee_members            id, subcommittee_id, user_id, role_in_subcommittee, joined_at, is_active
department_programs             id, department_id, church_id, name, description, status, start/end, budget_target
department_communications       id, department_id, church_id, title, body, type, send_sms, created_by, created_at
department_message_threads      id, department_id, church_id, member_id, created_at, updated_at
department_messages             id, thread_id, sender_id, label, body, is_read, created_at
departments                     + dept_type
events                          + program_id, rsvp_required, rsvp_deadline
department_budgets              + event_id, program_id, church_id, created_at
event_collections               + event_id, program_id, department_id
program_contributions           id, user_id, church_id, program_id, event_id, amount, method, note, created_at
```

### Messaging model (private threads)

- A **thread** = `(department_id, member_id)` — one per member per dept.
- Members only ever see their own thread.
- The head sees every thread in the dept, filterable/grouped by `label`.
- Any head/admin reply lands in the member's thread.
- `label` is set per message — heads use it to group feedback
  (UI: filter chips across the top of the thread list).

### Communications fan-out (`POST /departments/:id/communications`)

```
insert department_communications row
├─ insert one department_messages row per member thread (auto-create thread)
├─ sendNotification() per dept member (in-app bell)
└─ if send_sms → SmsHub.sendSMS(memberPhones, body, churchId)
                → Socket.io 'process_bulk' → JOSms app sends texts
```

## Backend endpoints to add

Under `/api/departments`:

| Method | Path | Who |
|---|---|---|
| `POST` | `/:id/join` | Member (creates pending `department_members` row + notifies dept head) |
| `GET/POST` | `/:id/subcommittees` | members read / head creates |
| `PUT/DELETE` | `/:id/subcommittees/:sid` | head |
| `POST/DELETE` | `/:id/subcommittees/:sid/members(/:uid)` | head assigns; member can self-join |
| `GET/POST` | `/:id/programs` · `PUT /:id/programs/:pid` | members read / head writes |
| `POST` | `/:id/events` | head — dept event, optional `rsvp_required`, `program_id` |
| `POST` | `/:id/communications` | head — 3-channel fan-out above |
| `GET` | `/:id/threads` | head — list of member threads (with labels + unread counts) |
| `GET` | `/:id/threads/:tid/messages` | head or that thread's member |
| `POST` | `/:id/threads/:tid/messages` | either party |
| `POST` | `/:id/threads` (auto-create) | member — first message creates thread |
| `PUT` | `/:id/messages/:mid/label` | head — group feedback |
| `PUT` | `/:id/members/:uid/role` | head — elevate (Assistant Head etc.) |
| `POST` | `/:id/programs/:pid/contribute` | member |
| `POST` | `/events/:eid/contribute` | member |

Permission check: `Super Admin`, `Pastor`, `First Elder`, `Department Head`,
or `departments.head_id = me`, or `role_in_department` containing 'Head'.

## Flutter changes

- `departments_screen.dart` → card tap opens **`department_detail_screen.dart`**
- Detail tabs:
  - **Overview** — dept type, description, head, my role, member count
  - **Subcommittees** — member sees own subs; head sees all + create/edit/assign
  - **Events & Programs** — RSVP button, "Contribute" (amount dialog)
  - **Messages** — member: own thread; head: thread list → per-member chat
    with label chips + assign-label long-press
  - **Requests** *(heads only)* — pending approvals, Approve/Reject
  - **Compose** *(heads only)* — send communication with `send_sms` toggle
- `departments_screen` → **"Request to join"** on depts the user isn't in

## Order of work

1. Migration 031 (updated schema) — local + VPS
2. Backend `department_community.routes.js` + mount in `app.js` + deploy + smoke-test
3. Flutter `department_detail_screen.dart` + api_service methods + router
4. Rebuild APK → install → test as `depthead@newlife.com` + `member1@newlife.com`
5. Update `docs/DEPARTMENTS_WORKFLOW.md` (new DFD/ERD) + commit

## Open dependency

- **JOSms relay must be connected** to the `relay:{churchId}` socket for SMS
  to actually send. If the app isn't running, SMS stays "queued" — the rest
  of the communication fan-out (thread + notification) still works.
