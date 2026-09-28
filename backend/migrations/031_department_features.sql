-- Migration 031 (rev 2): department feature upgrade
-- Subcommittees, programs, private member<->head message threads,
-- communications fan-out, budgets linked to events/programs, contributions.

CREATE TABLE IF NOT EXISTS department_subcommittees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL,
  church_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  lead_user_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subcommittees_dept ON department_subcommittees(department_id);
CREATE INDEX IF NOT EXISTS idx_subcommittees_church ON department_subcommittees(church_id);

CREATE TABLE IF NOT EXISTS subcommittee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcommittee_id UUID NOT NULL REFERENCES department_subcommittees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_in_subcommittee VARCHAR(100) DEFAULT 'Member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE (subcommittee_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_sub_members_user ON subcommittee_members(user_id);

CREATE TABLE IF NOT EXISTS department_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL,
  church_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  budget_target NUMERIC(12,2) DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_programs_dept ON department_programs(department_id);
CREATE INDEX IF NOT EXISTS idx_programs_church ON department_programs(church_id);

-- Head-to-members broadcasts (route GET /departments/:id/communications already exists)
CREATE TABLE IF NOT EXISTS department_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL,
  church_id UUID,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  type VARCHAR(50) DEFAULT 'announcement',
  send_sms BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dept_comms_dept ON department_communications(department_id);

-- Private member <-> head threads: one thread per (department, member)
CREATE TABLE IF NOT EXISTS department_message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL,
  church_id UUID NOT NULL,
  member_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (department_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_dept_threads_dept ON department_message_threads(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_threads_member ON department_message_threads(member_id);

CREATE TABLE IF NOT EXISTS department_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES department_message_threads(id) ON DELETE CASCADE,
  department_id UUID NOT NULL,
  church_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  label VARCHAR(100),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dept_messages_thread ON department_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_dept_messages_label ON department_messages(department_id, label);
CREATE INDEX IF NOT EXISTS idx_dept_messages_dept ON department_messages(department_id);

-- Department type classification
ALTER TABLE departments ADD COLUMN IF NOT EXISTS dept_type VARCHAR(100);

-- Programs on events + RSVP control
ALTER TABLE events ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_required BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMPTZ;

-- Budgets attachable to an event or a program
ALTER TABLE department_budgets ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE department_budgets ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE department_budgets ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE department_budgets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Collections link back to a department/event/program
ALTER TABLE event_collections ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE event_collections ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE event_collections ADD COLUMN IF NOT EXISTS department_id UUID;

-- Member money contributions toward a program or event
CREATE TABLE IF NOT EXISTS program_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  church_id UUID NOT NULL,
  program_id UUID,
  event_id UUID,
  amount NUMERIC(12,2) NOT NULL,
  method VARCHAR(50) DEFAULT 'manual',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_program_contrib_program ON program_contributions(program_id);
CREATE INDEX IF NOT EXISTS idx_program_contrib_event ON program_contributions(event_id);
CREATE INDEX IF NOT EXISTS idx_program_contrib_user ON program_contributions(user_id);
