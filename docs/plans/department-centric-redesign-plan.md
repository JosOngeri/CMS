# Department-Centric App Redesign + Budget-Obligation Workflow

**Status:** Planned · **Supersedes/extends:** `FLUTTER_WEB_PARITY.md` work order
**Goal:** Departments become the organizing center of both apps, and departmental
budgets flow into real member financial obligations with milestone tracking.

---

## 1. Vision

Today departments are one tab among many. In an SDA church, the department **is**
where ministry happens — members belong to departments, budgets live in departments,
programs run through departments. The apps should reflect that.

### App shell redesign (Flutter)

Bottom nav becomes 5 tabs with **Departments center-stage**:

| 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|
| Home | Events | **Departments** | Payments | Profile |

- Departments tab gets visual emphasis (larger/center icon, like a FAB-style center
  destination in `NavigationBar`).
- Dashboard home gets a **"My Departments"** hero section at top — cards for each
  dept the member belongs to, each showing: my role, my outstanding obligation,
  dept collection progress bar.
- Department detail becomes a **full hub** (it already has tabs) — add
  **Collections** and **Leadership** tabs to the existing
  Overview/Subcommittees/Programs/Messages/Requests set.

### Web parity

Same treatment in the React app: Departments already in bottom nav scope; add the
My Obligations surface to the member dashboard and a Collections tab to
`DepartmentDashboard`. The header links added this sprint (Leadership, Handovers)
stay.

---

## 2. The Budget → Obligation → Collection Workflow

```
Dept Head proposes budget → Pastor/Treasurer approves →
Head allocates to members (target | voluntary) →
Members see obligation & pay →
Collection tracker shows target vs collected →
Milestones hit (25/50/75/100%) → dept notified
```

### 2a. Budget approval (backend exists, extend)

- `department_budgets` already supports dept/subcommittee/program/event scope.
- New: head creates a budget request → `approval_requests` row routed to
  Pastor/First Elder/Treasurer (reuse the subcommittee-spend gate pattern —
  approval → budget row activated).
- Budget fields to add: `status` (`draft/pending/approved/closed`),
  `purpose`, `target_amount`, `collection_deadline`, `obligation_type`
  (`target` | `voluntary`) — the head chooses at allocation time, or per-member.

### 2b. Member obligations — NEW table `member_obligations`

| column | notes |
|---|---|
| id | uuid |
| church_id, department_id, budget_id | scoping |
| user_id | the member |
| amount | allocated share |
| obligation_type | `target` = required obligation · `voluntary` = pledge-style |
| paid_amount | denormalized sum, updated on payment |
| status | `pending / partial / fulfilled / waived / cancelled` |
| due_date | optional |
| allocated_by | the head who assigned it |
| created_at / updated_at | |

Allocation modes the head picks from:
- **Equal split** — target_amount ÷ member count
- **Custom** — per-member amounts (e.g. leaders carry more)
- **Voluntary pool** — no per-member requirement; members pledge what they can
  (still tracked against the dept target)

Target obligations appear in the member's payment view as a **required** item with
outstanding balance. Voluntary ones appear as a suggested contribution with a
progress bar.

### 2c. Payment integration

- `POST /payments/initiate` accepts `obligation_id` — payment tagged at source.
- On payment success: `member_obligations.paid_amount += amount`, status
  recalculated, `program_contributions`/`event_collections` row written for the
  dept-level rollup (existing tables already do this for programs/events —
  extend to `obligation_id`).
- Voluntary contributions without a specific allocation can point at the
  `budget_id` directly (pool contribution).

### 2d. Milestone / collection tracker — NEW views

**Member view — "My Obligations"** (`/dashboard/obligations`, Flutter screen):
- Per-dept cards: obligation amount, paid, balance, due date, status chip,
  progress bar; voluntary items show "suggested" not "required".

**Dept view — "Collections"** (tab on dept detail, web + Flutter):
- Dept target vs collected — big progress bar
- Milestone checkpoints: 25/50/75/100% with dates hit
- Per-member breakdown table (heads/treasurer only): allocated, paid, balance
- Outstanding-members list for follow-up
- Trend line of collections over time

### 2e. Notifications & audit

- Allocation → notify each member ("You have a new KES X obligation in Choir —
  due by …") — existing `notifications` table + notify helper.
- Milestone hit → notify dept head + members.
- Payment on obligation → receipt references the obligation.
- All mutations through `audit_log` (rule: record security/financial mutations).

---

## 3. New Endpoints (backend)

| Method | Path | Purpose |
|---|---|---|
| POST | `/departments/:id/budgets` | head proposes budget → approval request |
| GET | `/departments/:id/budgets` | list budgets + approval status |
| POST | `/departments/:id/budgets/:bid/allocate` | equal-split / custom / voluntary → creates obligations |
| GET | `/departments/:id/collections` | milestone data: target, collected, per-member, timeline |
| GET | `/me/obligations` | member's obligations across all depts |
| POST | `/payments/initiate` (extend) | accept `obligation_id` |
| PUT | `/departments/:id/obligations/:oid/waive` | head/treasurer waives a target obligation |
| POST | `/departments/:id/reconciliations` | collector posts a parsed SMS payment |
| GET | `/departments/:id/reconciliations` | list reconciliations + `unassigned` queue |
| PUT | `/reconciliations/:rid/assign` | treasurer attaches an unassigned tx to an obligation |

Permission rules: allocate/collections-detail = dept head, assistant,
subcommittee lead (own scope), Pastor/First Elder/Treasurer. `/me/obligations` =
self only.

---

## 4. Frontend Work

### Flutter (mobile)
- `main_shell.dart` — reorder tabs, Departments center + emphasized
- `departments_screen.dart` — hero cards with obligation/progress
- `department_detail_screen.dart` — add **Collections** tab (milestone tracker,
  progress bars, per-member list for leaders) + **Leadership** tab
- New `my_obligations_screen.dart` — from Payments tab + dashboard card
- `payments_screen.dart` — "Pay obligation" entry point with obligation picker
- `handovers_screen.dart` — from parity plan (P0, still required)
- `notifications_screen.dart` — from parity plan (P0, still required)
- `api_service.dart` — ~10 new methods (budgets, allocate, collections,
  obligations, handovers, notifications)

### Web (React)
- `DepartmentsList` — already has leadership/handovers links; add dept cards
  showing collection progress
- `DepartmentDashboard` — new **Collections** tab (reuse `MobileCard` +
  progress components); Leadership tab for heads
- New `/dashboard/obligations` — My Obligations page
- `Payments`/`MyPayments` — obligation picker on initiate
- Sidebar already has Departments; keep

---

## 5. Data Migration — `035_department_obligations.sql`

```sql
ALTER TABLE department_budgets
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS collection_deadline DATE,
  ADD COLUMN IF NOT EXISTS obligation_type VARCHAR(20) DEFAULT 'voluntary',
  ADD COLUMN IF NOT EXISTS approval_request_id UUID;

CREATE TABLE member_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL, department_id UUID NOT NULL, budget_id UUID,
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  obligation_type VARCHAR(20) NOT NULL DEFAULT 'target', -- target|voluntary
  paid_amount NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  due_date DATE, allocated_by UUID, waived_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE program_contributions ADD COLUMN IF NOT EXISTS obligation_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS obligation_id UUID;  -- whatever the payments table is

CREATE TABLE mpesa_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL, department_id UUID, subcommittee_id UUID,
  budget_id UUID, obligation_id UUID,
  tx_code VARCHAR(20) UNIQUE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payer_name VARCHAR(200), payer_phone VARCHAR(20),
  sms_timestamp TIMESTAMPTZ,
  reconciled_by UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'reconciled', -- reconciled|unassigned|reversed|remitted
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 5b. M-Pesa / Bank SMS Reconciliation + Collector Role

Church money often lands in a **person's own M-Pesa** — a subcommittee names one
member to collect. The app must let that designated **collector** reconcile those
real-world payments against budget allocations without giving them treasury access.

### The collector role

- A subcommittee lead or dept head designates **one subcommittee member as
  collector** → `department_leadership` row, `position='collector'`, scoped to the
  `subcommittee_id` (or dept). Grant permission `reconcile_collections` +
  `view_members` for that scope only.
- Collector rights are **reconciliation-only**: they can match a payment to an
  obligation/budget — they cannot create budgets, allocate, or see church-wide
  treasury data.
- Revocable like any leadership row; expires if temporary.

### How it works (Flutter — Android only, iOS can't read SMS)

1. Collector opens **"Collect & Reconcile"** on their subcommittee tile.
2. App requests `READ_SMS` permission, scans the inbox **filtered to financial
   senders only** (M-PESA, bank shortcodes — see `docs/specs/mpesa-sms-samples.md`).
3. **Parsing happens on-device** against the spec's extraction rules — the app
   shows a list: tx code, amount, payer name/phone, date. Raw SMS bodies are
   **never uploaded**; only extracted fields post to the server.
4. Collector taps a payment → picks the member's obligation (or the budget pool)
   → `POST /departments/:id/reconciliations`.
5. Server: dedupes on `tx_code` (UNIQUE), marks the obligation
   `partial`/`fulfilled`, writes the contribution rollup, notifies the payer
   member + dept head, audit-logs the mutation.
6. The collector's own incoming balance stays private — nothing else is readable.

### Verification counter-flow

- Reconciled collections sit on the dept's Collections page flagged **"via
  collector — awaiting remittance"** until the money actually reaches church
  accounts (the `sent` SMS type 3d lets the collector also prove remittance).
- Treasurer sees an **unassigned** queue for bank/PayBill messages that matched
  nothing, plus a `reversed` flag on any reversed transactions.

### New table — `mpesa_reconciliations`

| column | notes |
|---|---|
| id, church_id, department_id, subcommittee_id, budget_id, obligation_id | scoping (obligation nullable = pool payment) |
| tx_code | UNIQUE — dedupe key |
| amount, payer_name, payer_phone, sms_timestamp | extracted fields only |
| reconciled_by | the collector's user_id |
| status | `reconciled / unassigned / reversed / remitted` |
| created_at | |

`ALTER TABLE department_leadership` — extend position CHECK to include `'collector'`.
`department_permissions` gains the `reconcile_collections` permission value.

### Web parity

Treasurer side lives on web: the unassigned queue, remittance confirmation, and
the full reconciliations ledger on the dept Collections tab. The collector's
scan-and-assign flow is Flutter-only (SMS access is a phone feature).

## 6. Rollout Order

| # | Task | Depends |
|---|---|---|
| 1 | Migration 035 + obligations endpoints | — |
| 2 | Budget approval flow (extend spend-gate pattern) | 1 |
| 3 | Allocate → obligations → notify | 1,2 |
| 4 | Payment tagging + status recalc | 3 |
| 5 | Collections/milestone endpoint | 4 |
| 6 | Web: obligations page + dept Collections tab | 5 |
| 7 | Flutter: nav reorder + dept hero + Collections/Leadership tabs + obligations screen | 5 |
| 8 | Flutter: handovers + notifications screens (parity P0s, unchanged) | — |
| 9 | Reconciliation: collector role + SMS parser + `/reconciliations` endpoints | 1,3 |
| 10 | Flutter: Collect & Reconcile screen (SMS permission + tx picker) | 9 |
| 11 | Web: unassigned queue + remittance + reconciliations ledger | 9 |
| 12 | Build APK + deploy web | all |

## 7. Acceptance Criteria

- Head can propose a budget; it activates only after Pastor/Treasurer approval
- Head allocates equal-split → every member gets an obligation row + notification
- Member pays via app; obligation status → partial → fulfilled; dept collection
  bar moves
- Collections tab shows correct target/collected/milestones in both apps
- Voluntary budgets accept pool contributions without per-member rows
- Waived obligations excluded from outstanding lists
- Treasury sees only approved budgets posting to `department_budgets`
- Collector can scan own M-Pesa → assign a payment to an obligation → member's
  status flips to fulfilled; duplicate `tx_code` rejected on resubmit
- Collector sees **nothing** outside their scope; non-collectors never see the
  scan option
- Raw SMS bodies never leave the device — verified in request payloads
- Reversed transaction flags its reconciliation, doesn't delete it
