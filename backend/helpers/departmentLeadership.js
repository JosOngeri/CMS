/**
 * Department leadership helpers — shared by department_leadership.routes.js
 * and department_community.routes.js. Implements the permission bundles and
 * expiry model from docs/plans/sda-departments-seed-plan.md.
 */
const { pool } = require('../config/database');
const { createLogger } = require('./controllerLogger');

const logger = createLogger('departmentLeadership');

const MANAGER_ROLES = ['Super Admin', 'Pastor', 'First Elder'];
const POSITIONS = ['head', 'assistant', 'secretary', 'acting_head', 'subcommittee_head'];

// position -> { permission, role }
const BUNDLES = {
  head:              { permission: 'admin',          role: 'Department Head' },
  acting_head:       { permission: 'admin',          role: 'Department Head' },
  assistant:         { permission: 'manage_members', role: 'Assistant Department Head' },
  secretary:         { permission: 'write',          role: null },
  subcommittee_head: { permission: 'manage_members', role: 'Subcommittee Head' },
};

const hasManagerRole = (user) =>
  (user.roles || []).some((r) => MANAGER_ROLES.includes(r));

async function getDepartment(departmentId, churchId) {
  const r = await pool.query(
    'SELECT * FROM departments WHERE id = $1 AND church_id = $2 AND is_active = true',
    [departmentId, churchId]
  );
  return r.rows[0] || null;
}

/** Like getDepartment but Super Admin is church-agnostic. */
async function getDepartmentForUser(departmentId, user) {
  if ((user.roles || []).includes('Super Admin')) {
    const r = await pool.query(
      'SELECT * FROM departments WHERE id = $1 AND is_active = true',
      [departmentId]
    );
    return r.rows[0] || null;
  }
  return getDepartment(departmentId, user.church_id);
}

async function logDeptActivity(departmentId, userId, action, description) {
  await pool.query(
    `INSERT INTO department_activities (department_id, user_id, action, description)
     VALUES ($1, $2, $3, $4)`,
    [departmentId, userId, action, description]
  ).catch((e) => logger.warn('logDeptActivity', e.message));
}

async function grantRole(userId, roleName, churchId, grantedBy) {
  if (!roleName) return;
  await pool.query(
    `INSERT INTO user_roles (user_id, role_id, church_id, assigned_by)
     SELECT $1, r.id, $2, $3 FROM roles r WHERE r.name = $4
     ON CONFLICT (user_id, role_id) DO NOTHING`,
    [userId, churchId, grantedBy, roleName]
  );
}

async function revokeRole(userId, roleName) {
  if (!roleName) return;
  await pool.query(
    `DELETE FROM user_roles WHERE user_id = $1
       AND role_id = (SELECT id FROM roles WHERE name = $2)`,
    [userId, roleName]
  );
}

/** True if the user holds an active head/acting_head position anywhere else. */
async function headsElsewhere(userId, excludeDepartmentId) {
  const r = await pool.query(
    `SELECT 1 FROM departments d WHERE d.head_id = $1 AND d.id <> $2 AND d.is_active = true
     UNION
     SELECT 1 FROM department_leadership dl
       WHERE dl.user_id = $1 AND dl.department_id <> $2 AND dl.is_active = true
         AND dl.position IN ('head', 'acting_head')
     LIMIT 1`,
    [userId, excludeDepartmentId]
  );
  return r.rows.length > 0;
}

/**
 * Grant a leadership position: leadership row + permission bundle + global role.
 * Update-then-insert avoids partial-index ON CONFLICT ambiguity.
 */
async function grantLeadership({
  departmentId, churchId, userId, position,
  allocationType = 'permanent', endDate = null,
  appointedBy, handoverId = null, subcommitteeId = null,
}) {
  const isTemporary = allocationType === 'temporary' || !!endDate;
  const subId = subcommitteeId || null;

  const upd = await pool.query(
    `UPDATE department_leadership SET
       is_active = true, allocation_type = $4, end_date = $5,
       handover_id = $6, appointed_by = $7, updated_at = CURRENT_TIMESTAMP
     WHERE department_id = $1 AND user_id = $2 AND position = $3
       AND subcommittee_id IS NOT DISTINCT FROM $8
     RETURNING *`,
    [departmentId, userId, position, allocationType, endDate,
     handoverId, appointedBy, subId]
  );
  let row = upd.rows[0];
  if (!row) {
    const ins = await pool.query(
      `INSERT INTO department_leadership
         (department_id, church_id, user_id, position, allocation_type,
          start_date, end_date, appointed_by, is_active, handover_id, subcommittee_id)
       VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,$6,$7,true,$8,$9) RETURNING *`,
      [departmentId, churchId, userId, position, allocationType,
       endDate, appointedBy, handoverId, subId]
    );
    row = ins.rows[0];
  }

  const bundle = BUNDLES[position];
  if (bundle) {
    await pool.query(
      `INSERT INTO department_permissions
         (department_id, user_id, permission, expires_at, granted_by, is_temporary)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (department_id, user_id)
       DO UPDATE SET permission = EXCLUDED.permission,
                     expires_at = EXCLUDED.expires_at,
                     granted_by = EXCLUDED.granted_by,
                     is_temporary = EXCLUDED.is_temporary,
                     updated_at = CURRENT_TIMESTAMP`,
      [departmentId, userId, bundle.permission, isTemporary ? endDate : null, appointedBy, isTemporary]
    );
    if (bundle.role) await grantRole(userId, bundle.role, churchId, appointedBy);
  }
  return row;
}

/** Revoke one leadership row: deactivate, drop permission, conditional role removal. */
async function revokeLeadership(leadership) {
  await pool.query(
    `UPDATE department_leadership SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [leadership.id]
  );
  await pool.query(
    'DELETE FROM department_permissions WHERE department_id = $1 AND user_id = $2',
    [leadership.department_id, leadership.user_id]
  );
  const bundle = BUNDLES[leadership.position];
  if (bundle && bundle.role) {
    if (bundle.role === 'Department Head') {
      if (!(await headsElsewhere(leadership.user_id, leadership.department_id))) {
        await revokeRole(leadership.user_id, bundle.role);
      }
    } else {
      const stillHolds = await pool.query(
        `SELECT 1 FROM department_leadership
         WHERE user_id = $1 AND position = $2 AND is_active = true AND id <> $3 LIMIT 1`,
        [leadership.user_id, leadership.position, leadership.id]
      );
      if (!stillHolds.rows[0]) await revokeRole(leadership.user_id, bundle.role);
    }
  }
}

/**
 * Expire temporary leadership + permissions past their end_date.
 * Called on server boot and on a daily timer.
 */
async function expireTemporaryGrants() {
  const expired = await pool.query(
    `SELECT * FROM department_leadership
     WHERE is_active = true AND end_date IS NOT NULL AND end_date < CURRENT_TIMESTAMP`
  );
  for (const row of expired.rows) {
    await revokeLeadership(row);
    await logDeptActivity(row.department_id, row.user_id, 'leadership_expired',
      `${row.position} appointment expired automatically`);
    logger.info('expireTemporaryGrants',
      `Expired ${row.position} grant for user ${row.user_id} in dept ${row.department_id}`);
  }
  await pool.query(
    `DELETE FROM department_permissions
     WHERE is_temporary = true AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP`
  );
  return expired.rows.length;
}

/** Whether req.user may manage this subcommittee (lead, dept manager, or global). */
async function canManageSubcommittee(user, sub) {
  const roles = user.roles || [];
  if (roles.some((r) => MANAGER_ROLES.includes(r))) return true;
  if (sub.lead_user_id === user.id) return true;
  const scoped = await pool.query(
    `SELECT 1 FROM department_leadership
     WHERE subcommittee_id = $1 AND user_id = $2 AND is_active = true
       AND position = 'subcommittee_head' LIMIT 1`,
    [sub.id, user.id]
  );
  if (scoped.rows[0]) return true;
  const head = await pool.query(
    `SELECT 1 FROM departments d WHERE d.id = $1 AND d.head_id = $2 AND d.is_active = true
     UNION
     SELECT 1 FROM department_leadership dl
       WHERE dl.department_id = $1 AND dl.user_id = $2 AND dl.is_active = true
         AND dl.position IN ('head','acting_head','assistant')
     UNION
     SELECT 1 FROM department_members dm
       WHERE dm.department_id = $1 AND dm.user_id = $2 AND dm.is_active = true
         AND dm.role_in_department ILIKE '%head%'
     LIMIT 1`,
    [sub.department_id, user.id]
  );
  return head.rows.length > 0;
}

module.exports = {
  MANAGER_ROLES,
  POSITIONS,
  BUNDLES,
  hasManagerRole,
  getDepartment,
  getDepartmentForUser,
  logDeptActivity,
  grantRole,
  revokeRole,
  headsElsewhere,
  grantLeadership,
  revokeLeadership,
  expireTemporaryGrants,
  canManageSubcommittee,
};
