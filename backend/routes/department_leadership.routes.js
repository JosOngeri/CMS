/**
 * Department Leadership & Handover Routes
 *
 * Third router mounted on /api/departments (after departments.routes.js and
 * department_community.routes.js). Implements the leadership model from
 * docs/plans/sda-departments-seed-plan.md:
 *
 *  - department_leadership rows per appointed position (head, assistant,
 *    secretary, acting_head, subcommittee_head) with permanent|temporary
 *    allocation and expiry.
 *  - department_handovers workflow: pending -> accepted -> completed
 *    (or declined/cancelled), with checklist, permission grants/revokes and
 *    role synchronisation.
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole, invalidateUserCache } = require('../middleware/auth');
const { logAction } = require('../helpers/auditLog');
const { sendNotification } = require('../helpers/notify');
const { createLogger } = require('../helpers/controllerLogger');
const departmentLeadershipRepository = require('../repositories/DepartmentLeadershipRepository');
const {
  MANAGER_ROLES, POSITIONS, hasManagerRole, getDepartmentForUser, logDeptActivity,
  grantLeadership, revokeLeadership, headsElsewhere, revokeRole,
} = require('../helpers/departmentLeadership');

const logger = createLogger('department_leadership');

const DEFAULT_CHECKLIST = {
  records: false,
  funds_assets: false,
  pending_programs: false,
  keys_logins: false,
  member_roster: false,
};

async function createHandover({ dept, outgoingUserId, incomingUserId, position, initiatedBy, subcommitteeId, notes, req }) {
  const r = await departmentLeadershipRepository.query(
    `INSERT INTO department_handovers
       (department_id, church_id, outgoing_user_id, incoming_user_id, position,
        status, checklist, notes, initiated_by, subcommittee_id)
     VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9) RETURNING *`,
    [dept.id, dept.church_id, outgoingUserId || null, incomingUserId, position,
     JSON.stringify(DEFAULT_CHECKLIST), notes || null, initiatedBy, subcommitteeId || null]
  );
  const h = r.rows[0];

  const scope = subcommitteeId ? 'subcommittee ' : '';
  for (const [rid, isIncoming] of [[incomingUserId, true], [outgoingUserId, false]]) {
    if (!rid) continue;
    await sendNotification(pool, {
      recipientId: rid,
      type: 'department_handover',
      title: isIncoming
        ? `Handover: you are the incoming ${position.replace('_', ' ')}`
        : `Handover initiated for your ${position.replace('_', ' ')} role`,
      body: `A handover for ${dept.name} ${scope}has been initiated. ${isIncoming ? 'Accept it to receive access.' : 'You will complete the checklist after it is accepted.'}`,
      link: `/dashboard/departments/${dept.id}`,
      relatedEntityType: 'department', relatedEntityId: dept.id,
    });
  }
  await logDeptActivity(dept.id, initiatedBy, 'handover_initiated',
    `Handover initiated for position ${position}`);
  if (req) {
    await logAction(pool, {
      actorId: initiatedBy, action: 'initiate_department_handover',
      tableName: 'department_handovers', recordId: h.id,
      departmentId: dept.id, after: h, ipAddress: req.ip, userAgent: req.get('user-agent'),
    });
  }
  return h;
}

/** Load a handover scoped to the caller's church. */
async function loadHandover(hid, user) {
  const r = await departmentLeadershipRepository.query('SELECT * FROM department_handovers WHERE id = $1', [hid]);
  const h = r.rows[0];
  const isSuperAdmin = (user.roles || []).includes('Super Admin');
  if (!h || (!isSuperAdmin && h.church_id !== user.church_id)) {
    return { error: 'Handover not found', status: 404 };
  }
  return { h };
}

// ---------------------------------------------------------------------------
// Admin view: temporary grants nearing expiry
// ---------------------------------------------------------------------------
router.get('/leadership/expiring',
  authenticateToken,
  requireRole(MANAGER_ROLES),
  async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 30;
      const r = await departmentLeadershipRepository.query(
        `SELECT dl.*, d.name AS department_name,
                u.first_name || ' ' || u.last_name AS user_name, u.email AS user_email
         FROM department_leadership dl
         JOIN departments d ON d.id = dl.department_id
         JOIN users u ON u.id = dl.user_id
         WHERE dl.is_active = true AND dl.end_date IS NOT NULL
           AND dl.church_id = $1
           AND dl.end_date < CURRENT_TIMESTAMP + ($2 || ' days')::interval
         ORDER BY dl.end_date ASC`,
        [req.user.church_id, String(days)]
      );
      res.json({ success: true, data: r.rows });
    } catch (e) {
      logger.error('leadershipExpiring', e);
      res.status(500).json({ success: false, error: 'Failed to load expiring grants' });
    }
  }
);

// ---------------------------------------------------------------------------
// My pending handovers (incoming or outgoing)
// ---------------------------------------------------------------------------
router.get('/handovers/mine', authenticateToken, async (req, res) => {
  try {
    const r = await departmentLeadershipRepository.query(
      `SELECT h.*, d.name AS department_name,
              ou.first_name || ' ' || ou.last_name AS outgoing_name,
              iu.first_name || ' ' || iu.last_name AS incoming_name,
              s.name AS subcommittee_name
       FROM department_handovers h
       JOIN departments d ON d.id = h.department_id
       LEFT JOIN users ou ON ou.id = h.outgoing_user_id
       JOIN users iu ON iu.id = h.incoming_user_id
       LEFT JOIN department_subcommittees s ON s.id = h.subcommittee_id
       WHERE h.church_id = $1 AND h.status IN ('pending','accepted')
         AND (h.incoming_user_id = $2 OR h.outgoing_user_id = $2)
       ORDER BY h.created_at DESC`,
      [req.user.church_id, req.user.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    logger.error('handoversMine', e);
    res.status(500).json({ success: false, error: 'Failed to load handovers' });
  }
});

// ---------------------------------------------------------------------------
// Leadership listing for a department
// ---------------------------------------------------------------------------
router.get('/:id/leadership', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const r = await departmentLeadershipRepository.query(
      `SELECT dl.*, u.first_name || ' ' || u.last_name AS user_name, u.email AS user_email,
              a.first_name || ' ' || a.last_name AS appointed_by_name,
              s.name AS subcommittee_name
       FROM department_leadership dl
       JOIN users u ON u.id = dl.user_id
       LEFT JOIN users a ON a.id = dl.appointed_by
       LEFT JOIN department_subcommittees s ON s.id = dl.subcommittee_id
       WHERE dl.department_id = $1
       ORDER BY dl.is_active DESC, dl.start_date DESC`,
      [dept.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    logger.error('getLeadership', e);
    res.status(500).json({ success: false, error: 'Failed to load leadership' });
  }
});

// ---------------------------------------------------------------------------
// Appoint a position. If the seat is occupied (head-type positions) this
// routes through the handover workflow instead of swapping silently.
// ---------------------------------------------------------------------------
router.post('/:id/leadership',
  authenticateToken,
  requireRole(MANAGER_ROLES),
  async (req, res) => {
    try {
      const dept = await getDepartmentForUser(req.params.id, req.user);
      if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });

      const { user_id, position, allocation_type, end_date, subcommittee_id } = req.body;
      if (!user_id || !POSITIONS.includes(position)) {
        return res.status(400).json({ success: false, error: 'user_id and a valid position are required' });
      }
      const allocType = allocation_type === 'temporary' ? 'temporary' : 'permanent';
      const endDate = allocType === 'temporary' ? (end_date || null) : null;

      // Occupied head-type seat -> create a pending handover instead.
      // The seat is "occupied" by an active leadership row OR a legacy
      // departments.head_id pointing at someone else.
      const existing = await departmentLeadershipRepository.query(
        `SELECT dl.* FROM department_leadership dl
         WHERE dl.department_id = $1 AND dl.position = $2 AND dl.is_active = true
           AND dl.user_id <> $3
           AND dl.subcommittee_id IS NOT DISTINCT FROM $4`,
        [dept.id, position, user_id, subcommittee_id || null]
      );
      const seatHolder = existing.rows[0]?.user_id
        || (!subcommittee_id && position === 'head' && dept.head_id !== user_id ? dept.head_id : null);
      if (seatHolder && ['head', 'acting_head', 'subcommittee_head'].includes(position)) {
        const h = await createHandover({
          dept, outgoingUserId: seatHolder, incomingUserId: user_id,
          position, initiatedBy: req.user.id, subcommitteeId: subcommittee_id || null, req,
        });
        return res.status(201).json({
          success: true,
          handover: h,
          message: 'A handover was created — the incoming leader must accept it',
        });
      }

      const row = await grantLeadership({
        departmentId: dept.id, churchId: dept.church_id, userId: user_id,
        position, allocationType: allocType, endDate,
        appointedBy: req.user.id, subcommitteeId: subcommittee_id || null,
      });

      if ((position === 'head' || position === 'acting_head') && !subcommittee_id) {
        await departmentLeadershipRepository.query('UPDATE departments SET head_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [user_id, dept.id]);
      }
      if (position === 'subcommittee_head' && subcommittee_id) {
        await departmentLeadershipRepository.query('UPDATE department_subcommittees SET lead_user_id = $1, updated_at = NOW() WHERE id = $2',
          [user_id, subcommittee_id]);
      }

      await logAction(pool, {
        actorId: req.user.id, action: 'appoint_department_leader',
        tableName: 'department_leadership', recordId: row.id,
        departmentId: dept.id, after: row,
        ipAddress: req.ip, userAgent: req.get('user-agent'),
      });
      await logDeptActivity(dept.id, req.user.id, 'leadership_appointed',
        `${position} appointed (${allocType}${endDate ? `, until ${endDate}` : ''})`);

      await sendNotification(pool, {
        recipientId: user_id,
        type: 'department_leadership',
        title: `You have been appointed ${position.replace('_', ' ')}`,
        body: `You have been appointed ${position.replace('_', ' ')} of ${dept.name}${endDate ? ` until ${endDate}` : ''}.`,
        link: `/dashboard/departments/${dept.id}`,
        relatedEntityType: 'department', relatedEntityId: dept.id,
      });

      res.status(201).json({ success: true, data: row });
    } catch (e) {
      logger.error('appointLeadership', e);
      res.status(500).json({ success: false, error: 'Failed to appoint leader' });
    }
  }
);

/** Revoke an active leadership row (managers only). */
router.delete('/:id/leadership/:lid',
  authenticateToken,
  requireRole(MANAGER_ROLES),
  async (req, res) => {
    try {
      const r = await departmentLeadershipRepository.query(
        `SELECT * FROM department_leadership WHERE id = $1 AND department_id = $2 AND is_active = true`,
        [req.params.lid, req.params.id]
      );
      if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Leadership record not found' });
      const row = r.rows[0];
      await revokeLeadership(row);
      if ((row.position === 'head' || row.position === 'acting_head') && !row.subcommittee_id) {
        await departmentLeadershipRepository.query(
          `UPDATE departments SET head_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND head_id = $2`,
          [row.department_id, row.user_id]
        );
      }
      if (row.position === 'subcommittee_head' && row.subcommittee_id) {
        await departmentLeadershipRepository.query(
          'UPDATE department_subcommittees SET lead_user_id = NULL WHERE id = $1 AND lead_user_id = $2',
          [row.subcommittee_id, row.user_id]
        );
      }
      await logDeptActivity(row.department_id, req.user.id, 'leadership_revoked',
        `${row.position} appointment revoked`);
      res.json({ success: true, message: 'Leadership revoked' });
    } catch (e) {
      logger.error('revokeLeadership', e);
      res.status(500).json({ success: false, error: 'Failed to revoke leadership' });
    }
  }
);

// ---------------------------------------------------------------------------
// Handover workflow
// ---------------------------------------------------------------------------
router.get('/:id/handovers', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const r = await departmentLeadershipRepository.query(
      `SELECT h.*, ou.first_name || ' ' || ou.last_name AS outgoing_name,
              iu.first_name || ' ' || iu.last_name AS incoming_name,
              s.name AS subcommittee_name
       FROM department_handovers h
       LEFT JOIN users ou ON ou.id = h.outgoing_user_id
       JOIN users iu ON iu.id = h.incoming_user_id
       LEFT JOIN department_subcommittees s ON s.id = h.subcommittee_id
       WHERE h.department_id = $1
       ORDER BY h.created_at DESC`,
      [dept.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    logger.error('getHandovers', e);
    res.status(500).json({ success: false, error: 'Failed to load handovers' });
  }
});

router.post('/:id/handovers',
  authenticateToken,
  requireRole(MANAGER_ROLES),
  async (req, res) => {
    try {
      const dept = await getDepartmentForUser(req.params.id, req.user);
      if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
      const { incoming_user_id, position = 'head', notes, subcommittee_id } = req.body;
      if (!incoming_user_id) {
        return res.status(400).json({ success: false, error: 'incoming_user_id is required' });
      }
      const current = await departmentLeadershipRepository.query(
        `SELECT user_id FROM department_leadership
         WHERE department_id = $1 AND position = $2 AND is_active = true
           AND subcommittee_id IS NOT DISTINCT FROM $3 LIMIT 1`,
        [dept.id, position, subcommittee_id || null]
      );
      const h = await createHandover({
        dept, outgoingUserId: current.rows[0]?.user_id || dept.head_id,
        incomingUserId: incoming_user_id, position, initiatedBy: req.user.id,
        subcommitteeId: subcommittee_id || null, notes, req,
      });
      res.status(201).json({ success: true, data: h });
    } catch (e) {
      logger.error('createHandover', e);
      res.status(500).json({ success: false, error: 'Failed to create handover' });
    }
  }
);

router.put('/handovers/:hid/accept', authenticateToken, async (req, res) => {
  try {
    const { h, error, status } = await loadHandover(req.params.hid, req.user);
    if (error) return res.status(status).json({ success: false, error });
    if (h.incoming_user_id !== req.user.id && !hasManagerRole(req.user)) {
      return res.status(403).json({ success: false, error: 'Only the incoming leader can accept' });
    }
    if (h.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Handover is ${h.status}` });
    }

    const row = await grantLeadership({
      departmentId: h.department_id, churchId: h.church_id,
      userId: h.incoming_user_id, position: h.position,
      allocationType: 'permanent', appointedBy: h.initiated_by,
      handoverId: h.id, subcommitteeId: h.subcommittee_id,
    });
    await departmentLeadershipRepository.query(
      `UPDATE department_handovers SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [h.id]
    );

    if (h.outgoing_user_id) {
      await sendNotification(pool, {
        recipientId: h.outgoing_user_id,
        type: 'department_handover',
        title: 'Handover accepted — complete the checklist',
        body: 'The incoming leader has accepted. Please complete the handover checklist to finish.',
        link: `/dashboard/departments/${h.department_id}`,
        relatedEntityType: 'department', relatedEntityId: h.department_id,
      });
    }
    await logDeptActivity(h.department_id, req.user.id, 'handover_accepted',
      `Handover accepted for position ${h.position}`);
    res.json({ success: true, data: { handover_id: h.id, status: 'accepted', leadership: row } });
  } catch (e) {
    logger.error('acceptHandover', e);
    res.status(500).json({ success: false, error: 'Failed to accept handover' });
  }
});

router.put('/handovers/:hid/decline', authenticateToken, async (req, res) => {
  try {
    const { h, error, status } = await loadHandover(req.params.hid, req.user);
    if (error) return res.status(status).json({ success: false, error });
    if (h.incoming_user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the incoming leader can decline' });
    }
    if (!['pending', 'accepted'].includes(h.status)) {
      return res.status(400).json({ success: false, error: `Handover is ${h.status}` });
    }
    // Roll back any grants made on accept
    if (h.status === 'accepted') {
      const lr = await departmentLeadershipRepository.query(
        `SELECT * FROM department_leadership WHERE handover_id = $1 AND is_active = true`, [h.id]);
      for (const row of lr.rows) await revokeLeadership(row);
    }
    await departmentLeadershipRepository.query(
      `UPDATE department_handovers SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [h.id]
    );
    await logDeptActivity(h.department_id, req.user.id, 'handover_declined',
      `Handover declined for position ${h.position}`);
    res.json({ success: true, message: 'Handover declined' });
  } catch (e) {
    logger.error('declineHandover', e);
    res.status(500).json({ success: false, error: 'Failed to decline handover' });
  }
});

router.put('/handovers/:hid/cancel', authenticateToken, async (req, res) => {
  try {
    const { h, error, status } = await loadHandover(req.params.hid, req.user);
    if (error) return res.status(status).json({ success: false, error });
    if (h.initiated_by !== req.user.id && !hasManagerRole(req.user)) {
      return res.status(403).json({ success: false, error: 'Only the initiator or an admin can cancel' });
    }
    if (!['pending', 'accepted'].includes(h.status)) {
      return res.status(400).json({ success: false, error: `Handover is ${h.status}` });
    }
    if (h.status === 'accepted') {
      const lr = await departmentLeadershipRepository.query(
        `SELECT * FROM department_leadership WHERE handover_id = $1 AND is_active = true`, [h.id]);
      for (const row of lr.rows) await revokeLeadership(row);
    }
    await departmentLeadershipRepository.query(
      `UPDATE department_handovers SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [h.id]
    );
    await logDeptActivity(h.department_id, req.user.id, 'handover_cancelled',
      `Handover cancelled for position ${h.position}`);
    res.json({ success: true, message: 'Handover cancelled' });
  } catch (e) {
    logger.error('cancelHandover', e);
    res.status(500).json({ success: false, error: 'Failed to cancel handover' });
  }
});

router.put('/handovers/:hid/complete', authenticateToken, async (req, res) => {
  try {
    const { h, error, status } = await loadHandover(req.params.hid, req.user);
    if (error) return res.status(status).json({ success: false, error });
    if (h.outgoing_user_id !== req.user.id && !hasManagerRole(req.user)) {
      return res.status(403).json({ success: false, error: 'Only the outgoing leader or an admin can complete the handover' });
    }
    if (h.status !== 'accepted') {
      return res.status(400).json({ success: false, error: 'Handover must be accepted before completing' });
    }
    const checklist = { ...DEFAULT_CHECKLIST, ...(h.checklist || {}), ...(req.body.checklist || {}) };
    const incomplete = Object.entries(checklist).filter(([, v]) => !v).map(([k]) => k);
    if (incomplete.length && !hasManagerRole(req.user)) {
      return res.status(400).json({
        success: false,
        error: `Checklist incomplete: ${incomplete.join(', ')}`,
        checklist,
      });
    }

    // Remove the outgoing holder's leadership + permissions
    if (h.outgoing_user_id) {
      const lr = await departmentLeadershipRepository.query(
        `SELECT * FROM department_leadership
         WHERE department_id = $1 AND user_id = $2 AND position = $3 AND is_active = true
           AND subcommittee_id IS NOT DISTINCT FROM $4`,
        [h.department_id, h.outgoing_user_id, h.position, h.subcommittee_id]
      );
      for (const row of lr.rows) await revokeLeadership(row);

      // Legacy head with no leadership row: drop dept permissions and the
      // global role unless they still head another department.
      if (lr.rows.length === 0 && (h.position === 'head' || h.position === 'acting_head')) {
        await departmentLeadershipRepository.query(
          'DELETE FROM department_permissions WHERE department_id = $1 AND user_id = $2',
          [h.department_id, h.outgoing_user_id]
        );
        if (!(await headsElsewhere(h.outgoing_user_id, h.department_id))) {
          await revokeRole(h.outgoing_user_id, 'Department Head');
        }
        // dept permissions were dropped even when the global role survives
        invalidateUserCache(h.outgoing_user_id);
      }
    }

    // Point head/lead columns at the incoming user
    if (!h.subcommittee_id && (h.position === 'head' || h.position === 'acting_head')) {
      await departmentLeadershipRepository.query(
        'UPDATE departments SET head_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [h.incoming_user_id, h.department_id]
      );
    }
    if (h.subcommittee_id && h.position === 'subcommittee_head') {
      await departmentLeadershipRepository.query(
        'UPDATE department_subcommittees SET lead_user_id = $1, updated_at = NOW() WHERE id = $2',
        [h.incoming_user_id, h.subcommittee_id]
      );
    }

    await departmentLeadershipRepository.query(
      `UPDATE department_handovers
       SET status = 'completed', checklist = $2, handover_date = CURRENT_TIMESTAMP,
           completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [h.id, JSON.stringify(checklist)]
    );

    await Promise.all([h.incoming_user_id, h.outgoing_user_id].filter(Boolean).map((rid) =>
      sendNotification(pool, {
        recipientId: rid,
        type: 'department_handover',
        title: 'Handover completed',
        body: 'The handover for department leadership has been completed.',
        link: `/dashboard/departments/${h.department_id}`,
        relatedEntityType: 'department', relatedEntityId: h.department_id,
      })
    ));
    await logDeptActivity(h.department_id, req.user.id, 'handover_completed',
      `Handover completed for position ${h.position}`);
    await logAction(pool, {
      actorId: req.user.id, action: 'complete_department_handover',
      tableName: 'department_handovers', recordId: h.id,
      departmentId: h.department_id, after: { status: 'completed', checklist },
      ipAddress: req.ip, userAgent: req.get('user-agent'),
    });
    res.json({ success: true, message: 'Handover completed' });
  } catch (e) {
    logger.error('completeHandover', e);
    res.status(500).json({ success: false, error: 'Failed to complete handover' });
  }
});

module.exports = { router, createHandover };
