-- Migration 038: Role-permission backfill
-- role_permissions only covered Super Admin / Pastor / First Elder, so every
-- other role (Member, Child, Treasurer, Elder, Deacon, Deaconess, Church Board
-- Member, Department Head, Assistant Department Head, Collector) resolved to an
-- empty permission set — the sidebar hid modules for legit users while nothing
-- gated routes for a Child. Adds the module-view permissions the frontend
-- MODULE_PERMISSIONS map expects and grants per-role sets.

-- ---------------------------------------------------------------------------
-- 1. Extend the permission catalog (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO permissions (name, description, category) VALUES
  ('dashboard.view',        'View dashboard',                'dashboard'),
  ('documents.view',        'View documents',                'documents'),
  ('documents.manage',      'Manage documents',              'documents'),
  ('announcements.view',    'View announcements',            'announcements'),
  ('announcements.create',  'Create announcements',          'announcements'),
  ('announcements.publish', 'Publish announcements',         'announcements'),
  ('approvals.view',        'View approval inbox',           'approvals'),
  ('approvals.approve',     'Approve/reject requests',       'approvals'),
  ('notifications.view',    'View notifications',            'notifications'),
  ('payments.view_own',     'View own payments',             'payments'),
  ('payments.view',         'View all payments',             'payments'),
  ('payments.manage',       'Manage payments',               'payments'),
  ('collections.view_own',  'View own collections',          'collections'),
  ('collections.view',      'View all collections',          'collections'),
  ('collections.manage',    'Manage collections',            'collections'),
  ('obligations.view',      'View own obligations',          'obligations'),
  ('analytics.view',        'View analytics',                'analytics'),
  ('security.view',         'View security settings',        'security'),
  ('telegram.view',         'View telegram settings',        'telegram'),
  ('mobile.view',           'View mobile/app settings',      'mobile'),
  ('monitoring.view',       'View monitoring',               'monitoring'),
  ('seo.view',              'View SEO settings',             'seo'),
  ('accessibility.view',    'View accessibility settings',   'accessibility'),
  ('testing.view',          'View testing tools',            'testing'),
  ('documentation.view',    'View documentation',            'documentation')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Super Admin — keep getting everything as the catalog grows
-- ---------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Super Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Pastor — full operational access (existing categories + all view modules)
-- ---------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Pastor' AND (
     p.category IN ('users','members','departments','treasury','content',
                    'events','reports','sms','gallery','settings','documents',
                    'announcements','approvals','payments','collections',
                    'obligations','notifications','dashboard','analytics',
                    'security','telegram','monitoring')
  OR p.name LIKE '%.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- First Elder — near-pastor but read-only on admin tooling
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'First Elder' AND (
     p.category IN ('members','departments','treasury','content','events',
                    'reports','approvals','documents','announcements')
  OR p.name IN ('dashboard.view','notifications.view','sms.view',
                'analytics.view','gallery.view','payments.view',
                'collections.view','obligations.view','security.view',
                'telegram.view')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Treasurer — finance modules end-to-end
-- ---------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Treasurer' AND (
     p.category IN ('treasury','reports','payments','collections','approvals')
  OR p.name IN ('dashboard.view','members.view','departments.view',
                'announcements.view','events.view','documents.view',
                'notifications.view','obligations.view','analytics.view',
                'gallery.view','content.view')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Leadership tier — Elders, Board, Dept leadership, Collector
--    member set + members/departments/approvals visibility
-- ---------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('Elder','Church Board Member','Department Head',
                 'Assistant Department Head','Deacon','Deaconess')
  AND p.name IN (
    'dashboard.view','members.view','departments.view','announcements.view',
    'events.view','gallery.view','documents.view','content.view',
    'notifications.view','approvals.view','payments.view_own',
    'collections.view_own','obligations.view','reports.view','sms.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Subcommittee Collector'
  AND p.name IN (
    'dashboard.view','departments.view','announcements.view','events.view',
    'notifications.view','collections.view_own','collections.view',
    'obligations.view','payments.view_own','gallery.view','content.view',
    'members.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Subcommittee Head'
  AND p.name IN (
    'dashboard.view','members.view','departments.view','announcements.view',
    'events.view','gallery.view','documents.view','content.view',
    'notifications.view','approvals.view','payments.view_own',
    'collections.view_own','obligations.view','reports.view','sms.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Member — member-facing modules only
-- ---------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Member'
  AND p.name IN (
    'dashboard.view','departments.view','announcements.view','events.view',
    'gallery.view','documents.view','content.view','notifications.view',
    'payments.view_own','collections.view_own','obligations.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Child — read-only view of the public-facing modules, nothing financial
-- ---------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Child'
  AND p.name IN ('dashboard.view','announcements.view','events.view',
                 'gallery.view','content.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;
