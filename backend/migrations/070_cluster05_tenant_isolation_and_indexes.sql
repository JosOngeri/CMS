-- 070_cluster05_tenant_isolation_and_indexes.sql
-- Cluster 05 (Backend Repositories — Core) remedies:
--
-- 0. Canonical-path backfill (L771): the tables below existed ONLY in the
--    legacy database/*.sql files yet are queried by live repositories
--    (DepartmentRepository, DepartmentsRepository, MembersRepository,
--    AnalyticsRepository, ReportsRepository). Ported here with UUID types
--    to match canonical id conventions; all IF NOT EXISTS so DBs built via
--    the legacy path are unaffected.
CREATE TABLE IF NOT EXISTS department_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  color       VARCHAR(7),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO department_categories (name, description, color) VALUES
  ('Leadership', 'Church leadership departments', '#8B5CF6'),
  ('Ministry',   'Ministry departments',          '#3B82F6'),
  ('Education',  'Education departments',         '#10B981'),
  ('Youth',      'Youth programs',                '#F97316'),
  ('Support',    'Support ministries',            '#6B7280'),
  ('Special',    'Special programs',              '#EC4899')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS member_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  group_type  VARCHAR(50),
  leader_id   UUID REFERENCES members(id),
  church_id   UUID REFERENCES churches(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_group_memberships (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  group_id  UUID REFERENCES member_groups(id) ON DELETE CASCADE,
  role      VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, group_id)
);

CREATE TABLE IF NOT EXISTS department_meetings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  meeting_date  TIMESTAMP NOT NULL,
  duration      INTEGER,
  location      VARCHAR(200),
  organizer_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  status        VARCHAR(20) DEFAULT 'scheduled',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS department_meeting_attendees (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id    UUID REFERENCES department_meetings(id) ON DELETE CASCADE,
  member_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(20) DEFAULT 'invited',
  response_time TIMESTAMP,
  UNIQUE(meeting_id, member_id)
);

CREATE TABLE IF NOT EXISTS department_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id   UUID REFERENCES departments(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  report_type     VARCHAR(50),
  content         TEXT,
  file_url        VARCHAR(500),
  submitted_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period_start    DATE,
  period_end      DATE,
  status          VARCHAR(20) DEFAULT 'submitted'
);

CREATE TABLE IF NOT EXISTS department_tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date      TIMESTAMP,
  priority      VARCHAR(20) DEFAULT 'normal',
  status        VARCHAR(20) DEFAULT 'pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS department_resources (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  type          VARCHAR(50),
  url           VARCHAR(500),
  file_path     VARCHAR(500),
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_public     BOOLEAN DEFAULT false
);

-- 1. department_categories gains church_id so categories can be tenant-scoped.
--    NULL church_id = global/shared category (same convention as
--    approval_workflows), so existing rows stay visible to every church and
--    the migration is non-breaking. Tenant-created categories always carry
--    their church_id and are invisible to other tenants.
ALTER TABLE department_categories
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);

CREATE INDEX IF NOT EXISTS idx_department_categories_church
  ON department_categories(church_id);

-- 2. Junction index for MembersRepository.getWithContactsAndGroups — the
--    memberships lookup is keyed on member_id but shipped with no index.
CREATE INDEX IF NOT EXISTS idx_member_group_memberships_member
  ON member_group_memberships(member_id);

CREATE INDEX IF NOT EXISTS idx_member_group_memberships_group
  ON member_group_memberships(group_id);

-- 3. Unified activity view for DepartmentRepository.getRecentActivity —
--    replaces the inline UNION ALL so the shape (and tenant column) lives in
--    one place and can be reused by other dashboards.
CREATE OR REPLACE VIEW department_activity_feed AS
SELECT
  d.id AS department_id,
  d.church_id,
  d.name AS department_name,
  d.category,
  'communication' AS type,
  dc.title,
  dc.created_at AS date,
  CONCAT(u.first_name, ' ', u.last_name) AS author
FROM department_communications dc
JOIN departments d ON dc.department_id = d.id
LEFT JOIN users u ON dc.created_by = u.id
UNION ALL
SELECT
  d.id,
  d.church_id,
  d.name,
  d.category,
  'meeting',
  dm.title,
  dm.meeting_date,
  CONCAT(u.first_name, ' ', u.last_name)
FROM department_meetings dm
JOIN departments d ON dm.department_id = d.id
LEFT JOIN users u ON dm.organizer_id = u.id;
