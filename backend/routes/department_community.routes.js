/**
 * Department Community Routes
 *
 * Second router mounted on /api/departments (after departments.routes.js).
 * Covers: join requests, subcommittees, programs, dept events, head
 * communications (in-app + private threads + SMS via JOSms), private
 * member<->head message threads, member elevation, and contributions.
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendNotification, notifyDepartmentAdmins } = require('../helpers/notify');
const SmsHub = require('../services/SmsHub');
const { createLogger } = require('../helpers/controllerLogger');
const departmentCommunityRepository = require('../repositories/DepartmentCommunityRepository');
const {
  canManageSubcommittee, grantLeadership, logDeptActivity, getDepartmentForUser,
} = require('../helpers/departmentLeadership');

const logger = createLogger('department_community');

const MANAGER_ROLES = ['Super Admin', 'Pastor', 'First Elder'];

/** Whether req.user may manage this department. */
async function canManageDepartment(user, departmentId) {
  const roles = user.roles || [];
  if (roles.some(r => MANAGER_ROLES.includes(r) || r === 'Department Head')) {
    // Dept-scoped heads still need to belong to this dept
    if (!roles.some(r => MANAGER_ROLES.includes(r))) {
      const own = await departmentCommunityRepository.query(
        `SELECT 1 FROM department_members
         WHERE department_id = $1 AND user_id = $2 AND is_active = true
           AND (role_in_department ILIKE '%head%' OR role = 'Admin')`,
        [departmentId, user.id]
      );
      return own.rows.length > 0;
    }
    return true;
  }
  const head = await departmentCommunityRepository.query(
    'SELECT head_id FROM departments WHERE id = $1', [departmentId]
  );
  return head.rows[0] && head.rows[0].head_id === user.id;
}

/** Verify the department exists inside the caller's church. */
async function getDepartment(departmentId, churchId) {
  const r = await departmentCommunityRepository.query(
    'SELECT * FROM departments WHERE id = $1 AND church_id = $2 AND is_active = true',
    [departmentId, churchId]
  );
  return r.rows[0] || null;
}

// ---------------------------------------------------------------------------
// JOIN REQUEST — member asks to enter a department
// ---------------------------------------------------------------------------
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const churchId = req.user.church_id;

    const dept = await getDepartment(id, churchId);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });

    const existing = await departmentCommunityRepository.query(
      `SELECT status, is_active FROM department_members
       WHERE department_id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (existing.rows[0]) {
      const row = existing.rows[0];
      if (row.is_active) return res.status(409).json({ success: false, error: 'Already a member' });
      if (row.status === 'pending') return res.status(409).json({ success: false, error: 'Request already pending' });
      // Re-request after rejection/removal
      await departmentCommunityRepository.query(
        `UPDATE department_members SET status = 'pending', is_active = false,
         requested_at = NOW() WHERE department_id = $1 AND user_id = $2`,
        [id, userId]
      );
    } else {
      const member = await departmentCommunityRepository.query('SELECT id FROM members WHERE user_id = $1', [userId]);
      await departmentCommunityRepository.query(
        `INSERT INTO department_members
           (user_id, member_id, department_id, role, role_in_department, status, is_active, requested_at, church_id)
         VALUES ($1, $2, $3, 'Member', 'Member', 'pending', false, NOW(), $4)`,
        [userId, member.rows[0] ? member.rows[0].id : null, id, churchId]
      );
    }

    await notifyDepartmentAdmins(pool, id, {
      type: 'join_request',
      title: `New join request: ${dept.name}`,
      body: `${req.user.first_name || ''} ${req.user.last_name || ''} wants to join ${dept.name}`,
      relatedEntityType: 'department',
      relatedEntityId: id
    });

    res.json({ success: true, message: 'Join request sent' });
  } catch (e) {
    logger.error('joinDepartment', e);
    res.status(500).json({ success: false, error: 'Failed to send join request' });
  }
});

// ---------------------------------------------------------------------------
// SUBCOMMITTEES
// ---------------------------------------------------------------------------
router.get('/:id/subcommittees', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });

    const r = await departmentCommunityRepository.query(
      `SELECT s.*,
              u.first_name || ' ' || u.last_name AS lead_name,
              (SELECT COUNT(*) FROM subcommittee_members sm
                WHERE sm.subcommittee_id = s.id AND sm.is_active) AS member_count
       FROM department_subcommittees s
       LEFT JOIN users u ON u.id = s.lead_user_id
       WHERE s.department_id = $1 AND s.is_active = true
       ORDER BY s.name`,
      [req.params.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    logger.error('getSubcommittees', e);
    res.status(500).json({ success: false, error: 'Failed to load subcommittees' });
  }
});

router.post('/:id/subcommittees', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { name, description, lead_user_id, lead_allocation_type, lead_end_date } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });

    const r = await departmentCommunityRepository.query(
      `INSERT INTO department_subcommittees (department_id, church_id, name, description, lead_user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [dept.id, dept.church_id, name, description || null, lead_user_id || null]
    );
    const sub = r.rows[0];

    // A lead gets scoped subcommittee_head leadership + permission bundle
    if (lead_user_id) {
      await grantLeadership({
        departmentId: dept.id, churchId: dept.church_id, userId: lead_user_id,
        position: 'subcommittee_head',
        allocationType: lead_allocation_type === 'temporary' ? 'temporary' : 'permanent',
        endDate: lead_allocation_type === 'temporary' ? (lead_end_date || null) : null,
        appointedBy: req.user.id, subcommitteeId: sub.id,
      });
      await sendNotification(pool, {
        recipientId: lead_user_id,
        type: 'department_leadership',
        title: `You now lead the ${name} subcommittee`,
        body: `You have been appointed head of the ${name} subcommittee in ${dept.name}.`,
        link: `/dashboard/departments/${dept.id}`,
        relatedEntityType: 'department', relatedEntityId: dept.id,
      });
    }
    res.status(201).json({ success: true, data: sub });
  } catch (e) {
    logger.error('createSubcommittee', e);
    res.status(500).json({ success: false, error: 'Failed to create subcommittee' });
  }
});

router.put('/:id/subcommittees/:sid', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { name, description, lead_user_id, is_active, lead_allocation_type, lead_end_date } = req.body;

    const before = await departmentCommunityRepository.query(
      'SELECT * FROM department_subcommittees WHERE id = $1 AND department_id = $2',
      [req.params.sid, dept.id]
    );
    if (!before.rows[0]) return res.status(404).json({ success: false, error: 'Subcommittee not found' });
    const prevLead = before.rows[0].lead_user_id;

    // Replacing an existing lead routes through the handover workflow —
    // the column is only repointed when the handover completes.
    let handover = null;
    let leadForUpdate = lead_user_id ?? null;
    if (lead_user_id && prevLead && lead_user_id !== prevLead) {
      const { createHandover } = require('./department_leadership.routes');
      handover = await createHandover({
        dept, outgoingUserId: prevLead, incomingUserId: lead_user_id,
        position: 'subcommittee_head', initiatedBy: req.user.id,
        subcommitteeId: req.params.sid, req,
      });
      leadForUpdate = null;
    }

    const r = await departmentCommunityRepository.query(
      `UPDATE department_subcommittees SET
         name = COALESCE($3, name),
         description = COALESCE($4, description),
         lead_user_id = COALESCE($5, lead_user_id),
         is_active = COALESCE($6, is_active),
         updated_at = NOW()
       WHERE id = $1 AND department_id = $2 RETURNING *`,
      [req.params.sid, dept.id, name ?? null, description ?? null, leadForUpdate, is_active ?? null]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Subcommittee not found' });
    const sub = r.rows[0];

    // First-time lead appointment: grant scoped leadership immediately
    if (lead_user_id && !prevLead) {
      await grantLeadership({
        departmentId: dept.id, churchId: dept.church_id, userId: lead_user_id,
        position: 'subcommittee_head',
        allocationType: lead_allocation_type === 'temporary' ? 'temporary' : 'permanent',
        endDate: lead_allocation_type === 'temporary' ? (lead_end_date || null) : null,
        appointedBy: req.user.id, subcommitteeId: sub.id,
      });
    }
    res.json({ success: true, data: sub, handover });
  } catch (e) {
    logger.error('updateSubcommittee', e);
    res.status(500).json({ success: false, error: 'Failed to update subcommittee' });
  }
});

router.delete('/:id/subcommittees/:sid', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    await departmentCommunityRepository.query(
      `UPDATE department_subcommittees SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND department_id = $2`,
      [req.params.sid, dept.id]
    );
    res.json({ success: true, message: 'Subcommittee dissolved' });
  } catch (e) {
    logger.error('deleteSubcommittee', e);
    res.status(500).json({ success: false, error: 'Failed to dissolve subcommittee' });
  }
});

// Assign a member to a subcommittee (head) or self-join (member of dept)
router.post('/:id/subcommittees/:sid/members', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });

    const targetUser = req.body.user_id || req.user.id;
    const subRow = await departmentCommunityRepository.query(
      'SELECT * FROM department_subcommittees WHERE id = $1 AND department_id = $2',
      [req.params.sid, dept.id]
    );
    if (!subRow.rows[0]) return res.status(404).json({ success: false, error: 'Subcommittee not found' });
    const isManager = await canManageSubcommittee(req.user, subRow.rows[0]);
    if (targetUser !== req.user.id && !isManager) {
      return res.status(403).json({ success: false, error: 'Only the head can assign others' });
    }
    // Target must be an approved dept member
    const isMember = await departmentCommunityRepository.query(
      `SELECT 1 FROM department_members
       WHERE department_id = $1 AND user_id = $2 AND is_active = true`,
      [dept.id, targetUser]
    );
    if (!isMember.rows[0]) return res.status(400).json({ success: false, error: 'User is not a department member' });

    const r = await departmentCommunityRepository.query(
      `INSERT INTO subcommittee_members (subcommittee_id, user_id, role_in_subcommittee)
       VALUES ($1, $2, $3)
       ON CONFLICT (subcommittee_id, user_id) DO UPDATE SET is_active = true, role_in_subcommittee = $3
       RETURNING *`,
      [req.params.sid, targetUser, req.body.role || 'Member']
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('addSubcommitteeMember', e);
    res.status(500).json({ success: false, error: 'Failed to add member' });
  }
});

router.delete('/:id/subcommittees/:sid/members/:uid', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const sub = await departmentCommunityRepository.query(
      'SELECT * FROM department_subcommittees WHERE id = $1 AND department_id = $2',
      [req.params.sid, dept.id]
    );
    if (!sub.rows[0]) return res.status(404).json({ success: false, error: 'Subcommittee not found' });
    if (req.params.uid !== req.user.id && !(await canManageSubcommittee(req.user, sub.rows[0]))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    await departmentCommunityRepository.query(
      `UPDATE subcommittee_members SET is_active = false
       WHERE subcommittee_id = $1 AND user_id = $2`,
      [req.params.sid, req.params.uid]
    );
    res.json({ success: true, message: 'Removed from subcommittee' });
  } catch (e) {
    logger.error('removeSubcommitteeMember', e);
    res.status(500).json({ success: false, error: 'Failed to remove member' });
  }
});

// ---------------------------------------------------------------------------
// SUBCOMMITTEE FINANCE — spend goes through the parent dept head's approval
// ---------------------------------------------------------------------------
router.post('/:id/subcommittees/:sid/spend', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const sub = await departmentCommunityRepository.query(
      'SELECT * FROM department_subcommittees WHERE id = $1 AND department_id = $2 AND is_active = true',
      [req.params.sid, dept.id]
    );
    if (!sub.rows[0]) return res.status(404).json({ success: false, error: 'Subcommittee not found' });
    if (!(await canManageSubcommittee(req.user, sub.rows[0]))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { amount, description } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return res.status(400).json({ success: false, error: 'A positive amount is required' });

    // Route to the parent department head (fall back to null approver = any manager)
    const approver = dept.head_id || null;
    const r = await departmentCommunityRepository.query(
      `INSERT INTO approval_requests
         (title, description, request_type, request_data, entity_type, entity_id,
          requester_id, approver_id, department_id, module,
          amount, priority, status, church_id, requested_at)
       VALUES ($1,$2,'department_spend',$3,'department',$4,$5,$6,$7,'department',
               $8,'normal','pending',$9,CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        `${sub.rows[0].name} — spend request`,
        description || `Spend request from ${sub.rows[0].name}`,
        JSON.stringify({
          department_id: dept.id, subcommittee_id: sub.rows[0].id,
          subcommittee_name: sub.rows[0].name, description: description || null,
        }),
        dept.id, req.user.id, approver, dept.id, amt, dept.church_id,
      ]
    );

    if (approver) {
      await sendNotification(pool, {
        recipientId: approver,
        type: 'approval_request',
        title: `Spend request: ${sub.rows[0].name}`,
        body: `A KES ${amt.toLocaleString()} spend request from the ${sub.rows[0].name} subcommittee needs your approval.`,
        link: '/dashboard/approvals',
        relatedEntityType: 'approval_request', relatedEntityId: r.rows[0].id,
      });
    }
    await logDeptActivity(dept.id, req.user.id, 'subcommittee_spend_requested',
      `${sub.rows[0].name}: KES ${amt} spend request submitted for approval`);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('subcommitteeSpend', e);
    res.status(500).json({ success: false, error: 'Failed to submit spend request' });
  }
});

// Budget view: dept head/managers get the whole-department roll-up, sub heads
// only their own subcommittee scope.
router.get('/:id/subcommittees/:sid/budget', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const sub = await departmentCommunityRepository.query(
      'SELECT * FROM department_subcommittees WHERE id = $1 AND department_id = $2 AND is_active = true',
      [req.params.sid, dept.id]
    );
    if (!sub.rows[0]) return res.status(404).json({ success: false, error: 'Subcommittee not found' });
    if (!(await canManageSubcommittee(req.user, sub.rows[0]))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const budget = await departmentCommunityRepository.query(
      `SELECT * FROM department_budgets WHERE subcommittee_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [sub.rows[0].id]
    );
    const requests = await departmentCommunityRepository.query(
      `SELECT id, title, amount, status, requested_at, approved_at, rejected_at
       FROM approval_requests
       WHERE request_type = 'department_spend'
         AND request_data->>'subcommittee_id' = $1
       ORDER BY requested_at DESC LIMIT 50`,
      [sub.rows[0].id]
    );

    // Department roll-up for dept managers
    let rollup = null;
    if (await canManageDepartment(req.user, dept.id)) {
      const rr = await departmentCommunityRepository.query(
        `SELECT db.subcommittee_id, s.name AS subcommittee_name,
                db.total_amount, db.spent_amount, db.remaining_amount
         FROM department_budgets db
         LEFT JOIN department_subcommittees s ON s.id = db.subcommittee_id
         WHERE db.department_id = $1`,
        [dept.id]
      );
      rollup = rr.rows;
    }

    res.json({
      success: true,
      data: { budget: budget.rows[0] || null, spend_requests: requests.rows, rollup },
    });
  } catch (e) {
    logger.error('subcommitteeBudget', e);
    res.status(500).json({ success: false, error: 'Failed to load subcommittee budget' });
  }
});

// ---------------------------------------------------------------------------
// PROGRAMS
// ---------------------------------------------------------------------------
router.get('/:id/programs', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const r = await departmentCommunityRepository.query(
      `SELECT p.*,
              COALESCE((SELECT SUM(c.amount) FROM program_contributions c WHERE c.program_id = p.id), 0) AS raised
       FROM department_programs p
       WHERE p.department_id = $1 ORDER BY p.created_at DESC`,
      [dept.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    logger.error('getPrograms', e);
    res.status(500).json({ success: false, error: 'Failed to load programs' });
  }
});

router.post('/:id/programs', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { name, description, status, start_date, end_date, budget_target } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    const r = await departmentCommunityRepository.query(
      `INSERT INTO department_programs (department_id, church_id, name, description, status, start_date, end_date, budget_target, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [dept.id, dept.church_id, name, description || null, status || 'planned',
       start_date || null, end_date || null, budget_target || 0, req.user.id]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('createProgram', e);
    res.status(500).json({ success: false, error: 'Failed to create program' });
  }
});

router.put('/:id/programs/:pid', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { name, description, status, start_date, end_date, budget_target } = req.body;
    const r = await departmentCommunityRepository.query(
      `UPDATE department_programs SET
         name = COALESCE($3, name), description = COALESCE($4, description),
         status = COALESCE($5, status), start_date = COALESCE($6, start_date),
         end_date = COALESCE($7, end_date), budget_target = COALESCE($8, budget_target),
         updated_at = NOW()
       WHERE id = $1 AND department_id = $2 RETURNING *`,
      [req.params.pid, dept.id, name ?? null, description ?? null, status ?? null,
       start_date ?? null, end_date ?? null, budget_target ?? null]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Program not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('updateProgram', e);
    res.status(500).json({ success: false, error: 'Failed to update program' });
  }
});

// ---------------------------------------------------------------------------
// DEPT EVENTS (with RSVP request)
// ---------------------------------------------------------------------------
router.get('/:id/events', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const r = await departmentCommunityRepository.query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM event_attendance ea WHERE ea.event_id = e.id AND ea.rsvp_status = 'attending') AS rsvp_count,
              (SELECT ea2.rsvp_status FROM event_attendance ea2 WHERE ea2.event_id = e.id AND ea2.member_id = $2) AS my_rsvp
       FROM events e
       WHERE e.department_id = $1 AND e.event_date >= CURRENT_DATE - INTERVAL '90 days'
       ORDER BY e.event_date DESC`,
      [dept.id, req.user.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    logger.error('getDeptEvents', e);
    res.status(500).json({ success: false, error: 'Failed to load events' });
  }
});

router.post('/:id/events', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { title, description, event_date, event_time, location, program_id, rsvp_required, rsvp_deadline } = req.body;
    if (!title || !event_date) {
      return res.status(400).json({ success: false, error: 'title and event_date are required' });
    }
    const r = await departmentCommunityRepository.query(
      `INSERT INTO events (title, description, event_date, event_time, location, department_id, program_id,
                           organizer_id, church_id, is_public, rsvp_required, rsvp_deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11) RETURNING *`,
      [title, description || null, event_date, event_time || null, location || null,
       dept.id, program_id || null, req.user.id, dept.church_id,
       rsvp_required === true, rsvp_deadline || null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('createDeptEvent', e);
    res.status(500).json({ success: false, error: 'Failed to create event' });
  }
});

// ---------------------------------------------------------------------------
// COMMUNICATIONS — dept thread + private threads + notifications + SMS (JOSms)
// ---------------------------------------------------------------------------
router.post('/:id/communications', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { title, body, type = 'announcement', send_sms = false, label = 'Announcement' } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, error: 'title and body are required' });

    const comm = await departmentCommunityRepository.query(
      `INSERT INTO department_communications (department_id, church_id, title, body, type, send_sms, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [dept.id, dept.church_id, title, body, type, send_sms, req.user.id]
    );

    // Dept members
    const members = await departmentCommunityRepository.query(
      `SELECT dm.user_id, u.phone
       FROM department_members dm
       JOIN users u ON u.id = dm.user_id
       WHERE dm.department_id = $1 AND dm.is_active = true`,
      [dept.id]
    );

    // 1) one message into each member's private thread
    for (const m of members.rows) {
      const thread = await departmentCommunityRepository.query(
        `INSERT INTO department_message_threads (department_id, church_id, member_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (department_id, member_id) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [dept.id, dept.church_id, m.user_id]
      );
      await departmentCommunityRepository.query(
        `INSERT INTO department_messages (thread_id, department_id, church_id, sender_id, label, body)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [thread.rows[0].id, dept.id, dept.church_id, req.user.id, label, `**${title}**\n\n${body}`]
      );
    }

    // 2) in-app notifications
    await Promise.all(members.rows.map(m =>
      sendNotification(pool, {
        recipientId: m.user_id,
        type: 'department_communication',
        title: `${dept.name}: ${title}`,
        body,
        link: `/departments/${dept.id}`,
        relatedEntityType: 'department',
        relatedEntityId: dept.id
      })
    ));

    // 3) SMS via JOSms relay (only if requested)
    let smsResult = null;
    if (send_sms) {
      const phones = members.rows.map(m => m.phone).filter(Boolean);
      if (phones.length) {
        try {
          smsResult = await SmsHub.sendSMS({
            recipients: phones,
            message: `${dept.name}: ${title} — ${body}`,
            churchId: dept.church_id
          });
        } catch (smsErr) {
          logger.error('communications.sms', smsErr);
          smsResult = { success: false, error: smsErr.message };
        }
      }
    }

    res.status(201).json({
      success: true,
      data: comm.rows[0],
      delivered: { members: members.rows.length, sms: smsResult }
    });
  } catch (e) {
    logger.error('sendCommunication', e);
    res.status(500).json({ success: false, error: 'Failed to send communication' });
  }
});

// ---------------------------------------------------------------------------
// PRIVATE THREADS — member <-> head, with labels
// ---------------------------------------------------------------------------

// Head: list all member threads in this dept (with last message + unread)
router.get('/:id/threads', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const r = await departmentCommunityRepository.query(
      `SELECT t.id AS thread_id, t.member_id,
              u.first_name || ' ' || u.last_name AS member_name,
              (SELECT body FROM department_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM department_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_at,
              (SELECT COUNT(*) FROM department_messages m WHERE m.thread_id = t.id AND m.is_read = false AND m.sender_id = t.member_id) AS unread,
              (SELECT STRING_AGG(DISTINCT m.label, ', ') FROM department_messages m WHERE m.thread_id = t.id AND m.label IS NOT NULL) AS labels
       FROM department_message_threads t
       JOIN users u ON u.id = t.member_id
       WHERE t.department_id = $1
       ORDER BY last_at DESC NULLS LAST`,
      [dept.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    logger.error('getThreads', e);
    res.status(500).json({ success: false, error: 'Failed to load threads' });
  }
});

// Member: get (or lazily create) own thread in this dept
router.get('/:id/threads/mine', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const r = await departmentCommunityRepository.query(
      `INSERT INTO department_message_threads (department_id, church_id, member_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (department_id, member_id) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [dept.id, dept.church_id, req.user.id]
    );
    res.json({ success: true, data: { thread_id: r.rows[0].id } });
  } catch (e) {
    logger.error('getMyThread', e);
    res.status(500).json({ success: false, error: 'Failed to load thread' });
  }
});

// Messages inside a thread — must be the member or a dept manager
router.get('/:id/threads/:tid/messages', authenticateToken, async (req, res) => {
  try {
    const { tid } = req.params;
    const thread = await departmentCommunityRepository.query(
      'SELECT * FROM department_message_threads WHERE id = $1', [tid]
    );
    if (!thread.rows[0]) return res.status(404).json({ success: false, error: 'Thread not found' });
    if (thread.rows[0].member_id !== req.user.id &&
        !(await canManageDepartment(req.user, thread.rows[0].department_id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const r = await departmentCommunityRepository.query(
      `SELECT m.*, u.first_name || ' ' || u.last_name AS sender_name
       FROM department_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.thread_id = $1
       ORDER BY m.created_at ASC`,
      [tid]
    );
    // Mark head's unread member messages as read when a manager views them
    if (await canManageDepartment(req.user, thread.rows[0].department_id)) {
      await departmentCommunityRepository.query(
        `UPDATE department_messages SET is_read = true
         WHERE thread_id = $1 AND sender_id = $2 AND is_read = false`,
        [tid, thread.rows[0].member_id]
      );
    }
    res.json({ success: true, data: r.rows });
  } catch (e) {
    logger.error('getThreadMessages', e);
    res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
});

// Post a message — member posts to own thread; head replies to any thread
router.post('/:id/threads/:tid/messages', authenticateToken, async (req, res) => {
  try {
    const { tid } = req.params;
    const { body, label } = req.body;
    if (!body) return res.status(400).json({ success: false, error: 'body is required' });

    const thread = await departmentCommunityRepository.query(
      'SELECT * FROM department_message_threads WHERE id = $1', [tid]
    );
    if (!thread.rows[0]) return res.status(404).json({ success: false, error: 'Thread not found' });
    const isManager = await canManageDepartment(req.user, thread.rows[0].department_id);
    if (thread.rows[0].member_id !== req.user.id && !isManager) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const t = thread.rows[0];
    const r = await departmentCommunityRepository.query(
      `INSERT INTO department_messages (thread_id, department_id, church_id, sender_id, label, body)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tid, t.department_id, t.church_id, req.user.id, label || null, body]
    );

    // Notify the other party
    if (isManager) {
      await sendNotification(pool, {
        recipientId: t.member_id,
        type: 'dept_message',
        title: 'New message from your department head',
        body: body.substring(0, 100),
        link: '/departments',
        relatedEntityType: 'department',
        relatedEntityId: t.department_id
      });
    } else {
      await notifyDepartmentAdmins(pool, t.department_id, {
        type: 'dept_message',
        title: `${req.user.first_name || 'A member'} sent a message`,
        body: body.substring(0, 100),
        link: '/departments',
        relatedEntityType: 'department',
        relatedEntityId: t.department_id
      });
    }
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('postMessage', e);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Head assigns/updates a label on a message
router.put('/:id/messages/:mid/label', authenticateToken, async (req, res) => {
  try {
    const { mid } = req.params;
    const { label } = req.body;
    const msg = await departmentCommunityRepository.query('SELECT department_id FROM department_messages WHERE id = $1', [mid]);
    if (!msg.rows[0]) return res.status(404).json({ success: false, error: 'Message not found' });
    if (!(await canManageDepartment(req.user, msg.rows[0].department_id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const r = await departmentCommunityRepository.query(
      'UPDATE department_messages SET label = $2 WHERE id = $1 RETURNING *',
      [mid, label || null]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('labelMessage', e);
    res.status(500).json({ success: false, error: 'Failed to label message' });
  }
});

// ---------------------------------------------------------------------------
// ELEVATE / CHANGE member role inside the department
// ---------------------------------------------------------------------------
router.put('/:id/members/:uid/role', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartment(req.params.id, req.user.church_id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { role } = req.body;
    if (!role) return res.status(400).json({ success: false, error: 'role is required' });
    const r = await departmentCommunityRepository.query(
      `UPDATE department_members SET role_in_department = $3, updated_at = NOW()
       WHERE department_id = $1 AND user_id = $2 RETURNING *`,
      [dept.id, req.params.uid, role]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Membership not found' });
    await sendNotification(pool, {
      recipientId: req.params.uid,
      type: 'role_elevation',
      title: `Role changed in ${dept.name}`,
      body: `You are now "${role}" in ${dept.name}`,
      link: '/departments',
      relatedEntityType: 'department',
      relatedEntityId: dept.id
    });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('elevateMember', e);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

// ---------------------------------------------------------------------------
// CONTRIBUTIONS — member contributes to a program or a dept event
// ---------------------------------------------------------------------------
router.post('/:id/programs/:pid/contribute', authenticateToken, async (req, res) => {
  try {
    const { amount, method = 'manual', note } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ success: false, error: 'Valid amount required' });
    const program = await departmentCommunityRepository.query(
      'SELECT * FROM department_programs WHERE id = $1 AND department_id = $2',
      [req.params.pid, req.params.id]
    );
    if (!program.rows[0]) return res.status(404).json({ success: false, error: 'Program not found' });

    const r = await departmentCommunityRepository.query(
      `INSERT INTO program_contributions (user_id, church_id, program_id, amount, method, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, req.user.church_id, req.params.pid, amount, method, note || null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('contributeProgram', e);
    res.status(500).json({ success: false, error: 'Failed to record contribution' });
  }
});

router.post('/:id/events/:eid/contribute', authenticateToken, async (req, res) => {
  try {
    const { amount, method = 'manual', note } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ success: false, error: 'Valid amount required' });
    const event = await departmentCommunityRepository.query(
      'SELECT * FROM events WHERE id = $1 AND department_id = $2',
      [req.params.eid, req.params.id]
    );
    if (!event.rows[0]) return res.status(404).json({ success: false, error: 'Event not found' });

    const r = await departmentCommunityRepository.query(
      `INSERT INTO program_contributions (user_id, church_id, event_id, amount, method, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, req.user.church_id, req.params.eid, amount, method, note || null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('contributeEvent', e);
    res.status(500).json({ success: false, error: 'Failed to record contribution' });
  }
});

module.exports = router;
