-- Department component system for /departments/:id/components endpoints.
-- department_components (catalog) and department_component_allocations were
-- never created — every component endpoint 500'd. Catalog is global
-- (church-agnostic); allocations are verified church-scoped in the controller.

CREATE TABLE IF NOT EXISTS department_components (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) UNIQUE,
  type        VARCHAR(60) NOT NULL DEFAULT 'module',
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS department_component_allocations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id  UUID NOT NULL REFERENCES department_components(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  granted_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (component_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_dca_department ON department_component_allocations(department_id);

-- Global component catalog matching the department dashboard's real modules.
INSERT INTO department_components (name, slug, type, description) VALUES
  ('Activity Feed',      'activity-feed',      'dashboard',  'Chronological feed of department activity and announcements'),
  ('Members Directory',  'members-directory',  'management', 'Department member roster with roles and contact details'),
  ('Meetings',           'meetings',           'management', 'Schedule and track department meetings and attendance'),
  ('Tasks',              'tasks',              'management', 'Assign and track department tasks and action items'),
  ('Resources',          'resources',          'content',    'Shared files, links, and ministry resources'),
  ('Communications',     'communications',     'content',    'Department message board and announcements'),
  ('Budget Overview',    'budget-overview',    'finance',    'Department budget balances and spend tracking'),
  ('Expense Requests',   'expense-requests',   'finance',    'Submit and track department expense approval requests'),
  ('Reports',            'reports',            'analytics',  'Department activity, attendance, and financial reports'),
  ('Event Management',   'event-management',   'management', 'Create and manage department events and RSVPs')
ON CONFLICT (slug) DO NOTHING;
