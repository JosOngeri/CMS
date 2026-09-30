/**
 * Department Finance Routes — mounted on /api/departments (last).
 *
 * Implements docs/plans/department-centric-redesign-plan.md:
 * budgets (propose → approve → allocate), member obligations,
 * collections/milestone tracker, M-Pesa/bank SMS reconciliations
 * (collector role), and AI-calibrated parser profiles.
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendNotification, notifyDepartmentAdmins } = require('../helpers/notify');
const { createLogger } = require('../helpers/controllerLogger');
const {
  MANAGER_ROLES, hasManagerRole, getDepartmentForUser, logDeptActivity,
  canManageSubcommittee,
} = require('../helpers/departmentLeadership');
const aiContentService = require('../services/aiContentService');

const logger = createLogger('department_finance');

/** Dept head / assistant / manager check (same rules as community routes). */
async function canManageDepartment(user, departmentId) {
  const roles = user.roles || [];
  if (roles.some((r) => MANAGER_ROLES.includes(r))) return true;
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
    [departmentId, user.id]
  );
  return head.rows.length > 0;
}

/** True if user holds an active collector grant for this dept (or subcommittee). */
async function isCollector(user, departmentId, subcommitteeId = null) {
  const r = await pool.query(
    `SELECT 1 FROM department_leadership
     WHERE department_id = $1 AND user_id = $2 AND position = 'collector'
       AND is_active = true
       AND (subcommittee_id IS NULL OR subcommittee_id = $3)
     LIMIT 1`,
    [departmentId, user.id, subcommitteeId]
  );
  return r.rows.length > 0;
}

/** Collector or dept manager may post reconciliations / calibrate parsers. */
async function canReconcile(user, departmentId, subcommitteeId = null) {
  if (await canManageDepartment(user, departmentId)) return true;
  return isCollector(user, departmentId, subcommitteeId);
}

/** Recompute one obligation from completed payments + reconciled txns. */
async function recalcObligation(obligationId) {
  await pool.query(
    `UPDATE member_obligations mo SET
       paid_amount = COALESCE(p.paid, 0) + COALESCE(r.paid, 0),
       status = CASE
         WHEN mo.status = 'waived' THEN 'waived'
         WHEN COALESCE(p.paid,0) + COALESCE(r.paid,0) >= mo.amount THEN 'fulfilled'
         WHEN COALESCE(p.paid,0) + COALESCE(r.paid,0) > 0 THEN 'partial'
         ELSE 'pending' END,
       updated_at = NOW()
     FROM member_obligations src
     LEFT JOIN (SELECT obligation_id, SUM(amount) paid FROM payments
                WHERE status = 'completed' GROUP BY obligation_id) p
       ON p.obligation_id = src.id
     LEFT JOIN (SELECT obligation_id, SUM(amount) paid FROM mpesa_reconciliations
                WHERE status = 'reconciled' GROUP BY obligation_id) r
       ON r.obligation_id = src.id
     WHERE mo.id = $1 AND src.id = mo.id`,
    [obligationId]
  );
}

// ===========================================================================
// MY OBLIGATIONS — must precede /:id routes
// ===========================================================================
router.get('/me/obligations', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT mo.*, d.name AS department_name, b.purpose, b.collection_deadline,
              b.target_amount AS budget_target
       FROM member_obligations mo
       JOIN departments d ON d.id = mo.department_id
       LEFT JOIN department_budgets b ON b.id = mo.budget_id
       WHERE mo.user_id = $1 AND mo.status NOT IN ('waived','cancelled')
       ORDER BY mo.status = 'pending' DESC, mo.due_date NULLS LAST, mo.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: { obligations: r.rows } });
  } catch (e) {
    logger.error('myObligations', e);
    res.status(500).json({ success: false, error: 'Failed to load obligations' });
  }
});

// ===========================================================================
// BUDGETS — propose → approval_request → activate on approval
// ===========================================================================
router.post('/:id/budgets', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { purpose, target_amount, collection_deadline, obligation_type, subcommittee_id } = req.body;
    if (!target_amount || target_amount <= 0) {
      return res.status(400).json({ success: false, error: 'target_amount is required' });
    }

    const budget = await pool.query(
      `INSERT INTO department_budgets
         (department_id, church_id, subcommittee_id, total_amount, target_amount,
          spent_amount, remaining_amount, fiscal_year, status, purpose,
          collection_deadline, obligation_type, created_by)
       VALUES ($1,$2,$3,0,$4,0,0,$5,'pending',$6,$7,$8,$9) RETURNING *`,
      [dept.id, dept.church_id, subcommittee_id || null, target_amount,
       new Date().getFullYear().toString(), purpose || null,
       collection_deadline || null, obligation_type || 'voluntary', req.user.id]
    );

    const approval = await pool.query(
      `INSERT INTO approval_requests
         (title, description, request_type, request_data, requester_id,
          department_id, module, amount, status, church_id)
       VALUES ($1,$2,'department_budget',$3,$4,$5,'departments',$6,'pending',$7) RETURNING *`,
      [`Department budget: ${dept.name}`,
       purpose || `Budget of KES ${target_amount} for ${dept.name}`,
       JSON.stringify({ budget_id: budget.rows[0].id, department_id: dept.id }),
       req.user.id, dept.id, target_amount, dept.church_id]
    );
    await pool.query(
      'UPDATE department_budgets SET approval_request_id = $2 WHERE id = $1',
      [budget.rows[0].id, approval.rows[0].id]
    );

    await notifyDepartmentAdmins(pool, dept.id, {
      type: 'approval_request',
      title: 'Budget awaiting approval',
      body: `${dept.name}: KES ${Number(target_amount).toLocaleString()} budget requested.`,
      link: '/dashboard/approvals',
      relatedEntityType: 'approval_request', relatedEntityId: approval.rows[0].id,
    });
    await logDeptActivity(dept.id, req.user.id, 'budget_proposed',
      `Proposed KES ${target_amount} budget: ${purpose || ''}`);

    res.status(201).json({ success: true, data: { budget: budget.rows[0], approval: approval.rows[0] } });
  } catch (e) {
    logger.error('proposeBudget', e);
    res.status(500).json({ success: false, error: 'Failed to propose budget' });
  }
});

router.get('/:id/budgets', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const r = await pool.query(
      `SELECT b.*,
              COALESCE((SELECT SUM(o.paid_amount) FROM member_obligations o
                        WHERE o.budget_id = b.id AND o.status <> 'cancelled'), 0) AS collected,
              (SELECT COUNT(*) FROM member_obligations o
               WHERE o.budget_id = b.id AND o.status = 'fulfilled') AS members_fulfilled,
              (SELECT COUNT(*) FROM member_obligations o
               WHERE o.budget_id = b.id) AS members_allocated
       FROM department_budgets b
       WHERE b.department_id = $1 ORDER BY b.created_at DESC`,
      [dept.id]
    );
    res.json({ success: true, data: { budgets: r.rows } });
  } catch (e) {
    logger.error('listBudgets', e);
    res.status(500).json({ success: false, error: 'Failed to load budgets' });
  }
});

// ===========================================================================
// ALLOCATION — budget → member obligations
// ===========================================================================
router.post('/:id/budgets/:bid/allocate', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const b = await pool.query(
      `SELECT * FROM department_budgets WHERE id = $1 AND department_id = $2`,
      [req.params.bid, dept.id]
    );
    const budget = b.rows[0];
    if (!budget) return res.status(404).json({ success: false, error: 'Budget not found' });
    if (budget.status !== 'active') {
      return res.status(400).json({ success: false, error: `Budget is ${budget.status} — approval required first` });
    }

    const { mode, obligation_type, due_date, allocations } = req.body;
    const obType = obligation_type || budget.obligation_type || 'target';

    // Resolve member list for equal split
    let rows = [];
    if (mode === 'equal') {
      const members = await pool.query(
        `SELECT user_id FROM department_members
         WHERE department_id = $1 AND is_active = true AND status = 'active'`,
        [dept.id]
      );
      if (!members.rows.length) {
        return res.status(400).json({ success: false, error: 'No active members to allocate to' });
      }
      const perMember = Math.round((budget.target_amount / members.rows.length) * 100) / 100;
      rows = members.rows.map((m) => ({ user_id: m.user_id, amount: perMember }));
    } else if (mode === 'custom') {
      if (!Array.isArray(allocations) || !allocations.length) {
        return res.status(400).json({ success: false, error: 'allocations[] required for custom mode' });
      }
      rows = allocations;
    } else if (mode === 'voluntary') {
      // No per-member rows — pool stays open; voluntary pledges join later
      await pool.query(
        `UPDATE department_budgets SET obligation_type = 'voluntary', updated_at = NOW() WHERE id = $1`,
        [budget.id]
      );
      await logDeptActivity(dept.id, req.user.id, 'budget_voluntary',
        `Opened voluntary pool for budget ${budget.id}`);
      return res.json({ success: true, data: { mode: 'voluntary', budget_id: budget.id } });
    } else {
      return res.status(400).json({ success: false, error: "mode must be 'equal'|'custom'|'voluntary'" });
    }

    const inserted = [];
    for (const a of rows) {
      if (!a.user_id || !(a.amount > 0)) continue;
      const r = await pool.query(
        `INSERT INTO member_obligations
           (church_id, department_id, budget_id, user_id, amount,
            obligation_type, due_date, allocated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (budget_id, user_id)
         DO UPDATE SET amount = EXCLUDED.amount, obligation_type = EXCLUDED.obligation_type,
                       due_date = EXCLUDED.due_date, updated_at = NOW()
         RETURNING *`,
        [dept.church_id, dept.id, budget.id, a.user_id, a.amount, obType,
         due_date || budget.collection_deadline || null, req.user.id]
      );
      inserted.push(r.rows[0]);
      await sendNotification(pool, {
        recipientId: a.user_id,
        type: 'obligation_assigned',
        title: `New ${obType === 'voluntary' ? 'suggested' : 'required'} contribution — ${dept.name}`,
        body: `KES ${Number(a.amount).toLocaleString()} allocated for "${budget.purpose || 'department budget'}"${due_date || budget.collection_deadline ? ` — due ${due_date || budget.collection_deadline}` : ''}.`,
        link: '/dashboard/obligations',
        relatedEntityType: 'department', relatedEntityId: dept.id,
      }).catch(() => {});
    }

    await logDeptActivity(dept.id, req.user.id, 'budget_allocated',
      `Allocated budget ${budget.id} to ${inserted.length} members (${obType}, ${mode})`);

    res.status(201).json({ success: true, data: { allocated: inserted.length, obligations: inserted } });
  } catch (e) {
    logger.error('allocateBudget', e);
    res.status(500).json({ success: false, error: 'Failed to allocate budget' });
  }
});

// ===========================================================================
// COLLECTIONS — milestone tracker
// ===========================================================================
router.get('/:id/collections', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const manager = await canManageDepartment(req.user, dept.id);

    const budgets = await pool.query(
      `SELECT b.id, b.purpose, b.status, b.target_amount, b.obligation_type,
              b.collection_deadline, b.created_at,
              COALESCE(SUM(o.paid_amount), 0) AS collected,
              COUNT(o.id) AS member_count,
              COUNT(o.id) FILTER (WHERE o.status = 'fulfilled') AS fulfilled_count
       FROM department_budgets b
       LEFT JOIN member_obligations o ON o.budget_id = b.id AND o.status <> 'cancelled'
       WHERE b.department_id = $1 AND b.status = 'active'
       GROUP BY b.id ORDER BY b.created_at DESC`,
      [dept.id]
    );

    const result = budgets.rows.map((bgt) => {
      const target = Number(bgt.target_amount) || 0;
      const collected = Number(bgt.collected) || 0;
      const pct = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
      return {
        ...bgt,
        collected,
        percent: pct,
        milestones: [25, 50, 75, 100].map((m) => ({ percent: m, reached: pct >= m })),
      };
    });

    // Per-member breakdown — leaders only
    let members = null;
    if (manager && result[0]) {
      const r = await pool.query(
        `SELECT o.id, o.user_id, o.amount, o.paid_amount, o.status, o.obligation_type,
                u.first_name, u.last_name, u.phone
         FROM member_obligations o JOIN users u ON u.id = o.user_id
         WHERE o.budget_id = $1 AND o.status <> 'cancelled'
         ORDER BY o.status, u.first_name`,
        [result[0].id]
      );
      members = r.rows;
    }

    res.json({ success: true, data: { budgets: result, members } });
  } catch (e) {
    logger.error('collections', e);
    res.status(500).json({ success: false, error: 'Failed to load collections' });
  }
});

// Waive an obligation
router.put('/:id/obligations/:oid/waive', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const r = await pool.query(
      `UPDATE member_obligations SET status = 'waived', waived_by = $3, updated_at = NOW()
       WHERE id = $1 AND department_id = $2 RETURNING *`,
      [req.params.oid, dept.id, req.user.id]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Obligation not found' });
    await logDeptActivity(dept.id, req.user.id, 'obligation_waived', `Waived obligation ${req.params.oid}`);
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('waiveObligation', e);
    res.status(500).json({ success: false, error: 'Failed to waive obligation' });
  }
});

// ===========================================================================
// RECONCILIATIONS — collector posts extracted SMS fields
// ===========================================================================
router.post('/:id/reconciliations', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });

    const { tx_code, amount, payer_name, payer_phone, sms_timestamp,
            obligation_id, budget_id, subcommittee_id } = req.body;
    if (!tx_code || !(amount > 0)) {
      return res.status(400).json({ success: false, error: 'tx_code and amount are required' });
    }
    if (!(await canReconcile(req.user, dept.id, subcommittee_id || null))) {
      return res.status(403).json({ success: false, error: 'Not authorized to reconcile' });
    }

    // If an obligation was chosen, verify it belongs to this dept
    let status = 'unassigned';
    let linkedObligation = null;
    if (obligation_id) {
      const o = await pool.query(
        `SELECT * FROM member_obligations WHERE id = $1 AND department_id = $2`,
        [obligation_id, dept.id]
      );
      if (!o.rows[0]) {
        return res.status(400).json({ success: false, error: 'Obligation not found in this department' });
      }
      linkedObligation = o.rows[0];
      status = 'reconciled';
    } else if (budget_id) {
      status = 'reconciled'; // pool contribution to the budget
    }

    let row;
    try {
      const r = await pool.query(
        `INSERT INTO mpesa_reconciliations
           (church_id, department_id, subcommittee_id, budget_id, obligation_id,
            tx_code, amount, payer_name, payer_phone, sms_timestamp, reconciled_by, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [dept.church_id, dept.id, subcommittee_id || null, budget_id || null,
         obligation_id || null, tx_code, amount, payer_name || null,
         payer_phone || null, sms_timestamp || null, req.user.id, status]
      );
      row = r.rows[0];
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ success: false, error: 'This transaction was already reconciled' });
      }
      throw e;
    }

    if (linkedObligation) {
      await recalcObligation(linkedObligation.id);
      await sendNotification(pool, {
        recipientId: linkedObligation.user_id,
        type: 'payment_reconciled',
        title: 'Payment received',
        body: `KES ${Number(amount).toLocaleString()} was reconciled to your ${dept.name} contribution.`,
        link: '/dashboard/obligations',
        relatedEntityType: 'department', relatedEntityId: dept.id,
      }).catch(() => {});
    }
    await logDeptActivity(dept.id, req.user.id, 'payment_reconciled',
      `tx ${tx_code} KES ${amount} → ${status}${linkedObligation ? ` obligation ${linkedObligation.id}` : ''}`);

    res.status(201).json({ success: true, data: row });
  } catch (e) {
    logger.error('reconcile', e);
    res.status(500).json({ success: false, error: 'Failed to reconcile payment' });
  }
});

router.get('/:id/reconciliations', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const manager = await canManageDepartment(req.user, dept.id);
    const collector = await isCollector(req.user, dept.id, null);
    if (!manager && !collector) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const r = await pool.query(
      `SELECT r.*, u.first_name || ' ' || u.last_name AS reconciled_by_name,
              mo.user_id AS obligation_user_id
       FROM mpesa_reconciliations r
       LEFT JOIN users u ON u.id = r.reconciled_by
       LEFT JOIN member_obligations mo ON mo.id = r.obligation_id
       WHERE r.department_id = $1
       ${manager ? '' : 'AND r.reconciled_by = $2'}
       ORDER BY r.created_at DESC LIMIT 200`,
      manager ? [dept.id] : [dept.id, req.user.id]
    );
    res.json({ success: true, data: { reconciliations: r.rows } });
  } catch (e) {
    logger.error('listReconciliations', e);
    res.status(500).json({ success: false, error: 'Failed to load reconciliations' });
  }
});

// Treasurer/head attaches an unassigned tx to an obligation
router.put('/:id/reconciliations/:rid/assign', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    if (!(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { obligation_id, budget_id } = req.body;
    if (!obligation_id && !budget_id) {
      return res.status(400).json({ success: false, error: 'obligation_id or budget_id required' });
    }
    const r = await pool.query(
      `UPDATE mpesa_reconciliations
       SET obligation_id = $3, budget_id = COALESCE($4, budget_id), status = 'reconciled'
       WHERE id = $1 AND department_id = $2 RETURNING *`,
      [req.params.rid, dept.id, obligation_id || null, budget_id || null]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Reconciliation not found' });
    if (obligation_id) await recalcObligation(obligation_id);
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('assignReconciliation', e);
    res.status(500).json({ success: false, error: 'Failed to assign reconciliation' });
  }
});

// ===========================================================================
// PARSER PROFILES — AI-calibrated per scope
// ===========================================================================

/** Apply a ruleset JSON to an SMS string; returns extracted fields or null. */
function applyRuleset(ruleset, sms) {
  try {
    const pick = (re) => {
      if (!re) return null;
      const m = sms.match(new RegExp(re, 'i'));
      return m ? (m[1] !== undefined ? m[1] : m[0]) : null;
    };
    const tx = pick(ruleset.tx_code_regex);
    const amtRaw = pick(ruleset.amount_regex);
    if (!tx || !amtRaw) return null;
    return {
      type: ruleset.type || 'received',
      tx_code: tx.trim(),
      amount: parseFloat(String(amtRaw).replace(/,/g, '')),
      counterparty_name: pick(ruleset.counterparty_name_regex),
      counterparty_phone: pick(ruleset.counterparty_phone_regex),
      occurred_at: pick(ruleset.occurred_at_regex),
    };
  } catch {
    return null;
  }
}

router.post('/:id/parser/calibrate', authenticateToken, async (req, res) => {
  try {
    const dept = req.params.id === 'church' ? null : await getDepartmentForUser(req.params.id, req.user);
    const isChurchScope = req.params.id === 'church';
    if (!isChurchScope && !dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    const { sample_sms, subcommittee_id } = req.body;
    if (!sample_sms || sample_sms.length < 20) {
      return res.status(400).json({ success: false, error: 'sample_sms required' });
    }

    // Rights: church scope → global roles; dept/sub → manager or collector
    let allowed = hasManagerRole(req.user) || (req.user.roles || []).includes('Treasurer');
    if (!allowed && dept) {
      allowed = await canReconcile(req.user, dept.id, subcommittee_id || null);
    }
    if (!allowed) return res.status(403).json({ success: false, error: 'Not authorized' });

    const churchId = dept ? dept.church_id : req.user.church_id;
    const result = await aiContentService.calibrateSmsParser({
      sampleSms: sample_sms, churchId, userId: req.user.id,
    });
    const ruleset = result.data.ruleset;
    if (!ruleset || ruleset.type === 'not_payment') {
      return res.status(422).json({ success: false, error: 'AI could not identify this as a payment SMS' });
    }

    // Validate: ruleset must actually extract from the (unmasked) sample
    const check = applyRuleset(ruleset, sample_sms);
    if (!check || !check.tx_code || !(check.amount > 0)) {
      return res.status(422).json({
        success: false,
        error: 'Generated ruleset failed sandbox validation against your sample',
      });
    }

    const version = await pool.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS v FROM mpesa_parser_profiles
       WHERE church_id = $1 AND department_id IS NOT DISTINCT FROM $2
         AND subcommittee_id IS NOT DISTINCT FROM $3`,
      [churchId, isChurchScope ? null : dept.id, subcommittee_id || null]
    );

    const r = await pool.query(
      `INSERT INTO mpesa_parser_profiles
         (church_id, department_id, subcommittee_id, version, ruleset, sample_sms, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',$7) RETURNING id, version, status, ruleset`,
      [churchId, isChurchScope ? null : dept.id, subcommittee_id || null,
       version.rows[0].v, JSON.stringify(ruleset), sample_sms, req.user.id]
    );

    res.status(201).json({
      success: true,
      data: { profile: r.rows[0], test_extraction: check },
    });
  } catch (e) {
    logger.error('calibrate', e);
    const msg = e.message || '';
    res.status(msg.includes('disabled') ? 503 : 500)
       .json({ success: false, error: msg.includes('disabled') ? 'AI service unavailable — use base parser' : 'Calibration failed' });
  }
});

// Test a draft ruleset against another sample
router.post('/:id/parser/test', authenticateToken, async (req, res) => {
  try {
    const dept = req.params.id === 'church' ? null : await getDepartmentForUser(req.params.id, req.user);
    if (!dept && req.params.id !== 'church') {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    const { profile_id, sample_sms } = req.body;
    const p = await pool.query(
      `SELECT ruleset FROM mpesa_parser_profiles WHERE id = $1`,
      [profile_id]
    );
    if (!p.rows[0]) return res.status(404).json({ success: false, error: 'Profile not found' });
    const extracted = applyRuleset(p.rows[0].ruleset, sample_sms || '');
    res.json({ success: true, data: { extracted, passed: !!(extracted && extracted.tx_code) } });
  } catch (e) {
    logger.error('parserTest', e);
    res.status(500).json({ success: false, error: 'Test failed' });
  }
});

// Activate a draft profile (retires older versions for the scope)
router.post('/:id/parser/profiles/:pid/activate', authenticateToken, async (req, res) => {
  try {
    const p = await pool.query(
      `SELECT * FROM mpesa_parser_profiles WHERE id = $1`, [req.params.pid]
    );
    const profile = p.rows[0];
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
    const dept = profile.department_id
      ? await getDepartmentForUser(profile.department_id, req.user) : null;
    let allowed = hasManagerRole(req.user) || (req.user.roles || []).includes('Treasurer');
    if (!allowed && dept) {
      allowed = await canReconcile(req.user, dept.id, profile.subcommittee_id);
    }
    if (!allowed) return res.status(403).json({ success: false, error: 'Not authorized' });

    await pool.query(
      `UPDATE mpesa_parser_profiles SET status = 'retired'
       WHERE church_id = $1 AND department_id IS NOT DISTINCT FROM $2
         AND subcommittee_id IS NOT DISTINCT FROM $3 AND status = 'active'`,
      [profile.church_id, profile.department_id, profile.subcommittee_id]
    );
    await pool.query(
      `UPDATE mpesa_parser_profiles SET status = 'active' WHERE id = $1`, [profile.id]
    );
    res.json({ success: true, data: { id: profile.id, status: 'active' } });
  } catch (e) {
    logger.error('activateProfile', e);
    res.status(500).json({ success: false, error: 'Activation failed' });
  }
});

// The app downloads the active ruleset for a scope
router.get('/:id/parser/profiles', authenticateToken, async (req, res) => {
  try {
    const isChurchScope = req.params.id === 'church';
    const dept = isChurchScope ? null : await getDepartmentForUser(req.params.id, req.user);
    if (!isChurchScope && !dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    const { subcommittee_id } = req.query;
    const churchId = dept ? dept.church_id : req.user.church_id;
    const r = await pool.query(
      `SELECT id, version, ruleset, status, created_at
       FROM mpesa_parser_profiles
       WHERE church_id = $1 AND department_id IS NOT DISTINCT FROM $2
         AND subcommittee_id IS NOT DISTINCT FROM $3 AND status = 'active'
       ORDER BY version DESC LIMIT 1`,
      [churchId, isChurchScope ? null : dept.id, subcommittee_id || null]
    );
    res.json({ success: true, data: { profile: r.rows[0] || null } });
  } catch (e) {
    logger.error('getProfiles', e);
    res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

// ===========================================================================
// REMITTANCE LEDGER — collector batches reconciled funds → church account
// ===========================================================================

/** Funds sitting with collectors: reconciled but not yet remitted. */
router.get('/:id/remittances/pending-funds', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const manager = await canManageDepartment(req.user, dept.id);
    const collector = await isCollector(req.user, dept.id, null);
    if (!manager && !collector) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const r = await pool.query(
      `SELECT r.id, r.tx_code, r.amount, r.payer_name, r.payer_phone,
              r.sms_timestamp, r.created_at, r.reconciled_by,
              u.first_name || ' ' || u.last_name AS reconciled_by_name
       FROM mpesa_reconciliations r
       LEFT JOIN users u ON u.id = r.reconciled_by
       WHERE r.department_id = $1 AND r.status = 'reconciled' AND r.remittance_id IS NULL
       ${manager ? '' : 'AND r.reconciled_by = $2'}
       ORDER BY r.created_at ASC`,
      manager ? [dept.id] : [dept.id, req.user.id]
    );
    const total = r.rows.reduce((s, x) => s + Number(x.amount), 0);
    res.json({ success: true, data: { items: r.rows, total } });
  } catch (e) {
    logger.error('pendingFunds', e);
    res.status(500).json({ success: false, error: 'Failed to load pending funds' });
  }
});

/** List remittance batches for the department. */
router.get('/:id/remittances', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const manager = await canManageDepartment(req.user, dept.id);
    const collector = await isCollector(req.user, dept.id, null);
    if (!manager && !collector) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { status } = req.query;
    const r = await pool.query(
      `SELECT rem.*,
              c.first_name || ' ' || c.last_name AS collector_name,
              t.first_name || ' ' || t.last_name AS treasurer_name
       FROM remittances rem
       LEFT JOIN users c ON c.id = rem.collector_id
       LEFT JOIN users t ON t.id = rem.treasurer_id
       WHERE rem.department_id = $1
         ${status ? 'AND rem.status = $2' : ''}
         ${manager ? '' : `AND rem.collector_id = ${status ? '$3' : '$2'}`}
       ORDER BY rem.created_at DESC LIMIT 200`,
      manager
        ? (status ? [dept.id, status] : [dept.id])
        : (status ? [dept.id, status, req.user.id] : [dept.id, req.user.id])
    );
    res.json({ success: true, data: { remittances: r.rows } });
  } catch (e) {
    logger.error('listRemittances', e);
    res.status(500).json({ success: false, error: 'Failed to load remittances' });
  }
});

/** Collector declares a batch handover. */
router.post('/:id/remittances', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) {
      client.release();
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    const manager = await canManageDepartment(req.user, dept.id);
    const collector = await isCollector(req.user, dept.id, null);
    if (!manager && !collector) {
      client.release();
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { reconciliation_ids, method = 'cash', reference, notes } = req.body;
    if (!Array.isArray(reconciliation_ids) || reconciliation_ids.length === 0) {
      client.release();
      return res.status(400).json({ success: false, error: 'reconciliation_ids[] required' });
    }

    await client.query('BEGIN');

    // Lock the items: must be this dept, reconciled, unremitted, and — for
    // collectors — reconciled by themselves (managers may remit anyone's).
    const items = await client.query(
      `SELECT id, amount, reconciled_by FROM mpesa_reconciliations
       WHERE id = ANY($1) AND department_id = $2
         AND status = 'reconciled' AND remittance_id IS NULL
       FOR UPDATE`,
      [reconciliation_ids, dept.id]
    );
    if (items.rows.length !== reconciliation_ids.length) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({
        success: false,
        error: 'Some transactions are missing, already remitted, or not reconciled',
      });
    }
    if (!manager && items.rows.some((x) => x.reconciled_by !== req.user.id)) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(403).json({ success: false, error: 'Collectors may only remit their own reconciliations' });
    }

    const amount = items.rows.reduce((s, x) => s + Number(x.amount), 0);
    const rem = await client.query(
      `INSERT INTO remittances
         (church_id, department_id, collector_id, amount, item_count, method, reference, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [dept.church_id, dept.id, req.user.id, amount, items.rows.length,
       method, reference || null, notes || null]
    );
    const remittanceId = rem.rows[0].id;

    await client.query(
      `INSERT INTO remittance_items (remittance_id, reconciliation_id)
       SELECT $1, unnest($2::uuid[])`,
      [remittanceId, reconciliation_ids]
    );
    await client.query(
      `UPDATE mpesa_reconciliations
       SET status = 'remitted', remittance_id = $1
       WHERE id = ANY($2::uuid[])`,
      [remittanceId, reconciliation_ids]
    );

    await client.query('COMMIT');
    client.release();

    await logDeptActivity(dept.id, req.user.id, 'remittance_created',
      `Remittance ${remittanceId.slice(0, 8)} — KES ${amount} (${items.rows.length} txns, ${method})`);
    await notifyDepartmentAdmins(pool, dept.id, {
      type: 'remittance_pending',
      title: 'Remittance awaiting confirmation',
      body: `KES ${Number(amount).toLocaleString()} handed over for ${dept.name} — please confirm receipt.`,
      relatedEntityType: 'department', relatedEntityId: dept.id,
    }).catch(() => {});

    res.status(201).json({ success: true, data: rem.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    logger.error('createRemittance', e);
    res.status(500).json({ success: false, error: 'Failed to create remittance' });
  }
});

/** Treasurer/manager confirms the money actually arrived. Church
 *  Treasurers confirm even without a dept-management position. */
router.put('/:id/remittances/:rid/confirm', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const isTreasurer = (req.user.roles || []).includes('Treasurer');
    if (!isTreasurer && !(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const r = await pool.query(
      `UPDATE remittances
       SET status = 'confirmed', treasurer_id = $1, confirmed_at = NOW()
       WHERE id = $2 AND department_id = $3 AND status = 'pending'
       RETURNING *`,
      [req.user.id, req.params.rid, dept.id]
    );
    if (!r.rows[0]) {
      return res.status(404).json({ success: false, error: 'Pending remittance not found' });
    }
    await logDeptActivity(dept.id, req.user.id, 'remittance_confirmed',
      `Remittance ${req.params.rid.slice(0, 8)} confirmed — KES ${r.rows[0].amount}`);
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('confirmRemittance', e);
    res.status(500).json({ success: false, error: 'Failed to confirm remittance' });
  }
});

/** Treasurer/manager flags a discrepancy — items stay 'remitted' but the
 *  batch is marked disputed for follow-up. */
router.put('/:id/remittances/:rid/dispute', authenticateToken, async (req, res) => {
  try {
    const dept = await getDepartmentForUser(req.params.id, req.user);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    const isTreasurer = (req.user.roles || []).includes('Treasurer');
    if (!isTreasurer && !(await canManageDepartment(req.user, dept.id))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, error: 'reason is required' });
    }
    const r = await pool.query(
      `UPDATE remittances
       SET status = 'disputed', treasurer_id = $1, dispute_reason = $4
       WHERE id = $2 AND department_id = $3 AND status = 'pending'
       RETURNING *`,
      [req.user.id, req.params.rid, dept.id, reason]
    );
    if (!r.rows[0]) {
      return res.status(404).json({ success: false, error: 'Pending remittance not found' });
    }
    await sendNotification(pool, {
      recipientId: r.rows[0].collector_id,
      type: 'remittance_disputed',
      title: 'Remittance disputed',
      body: `Your KES ${Number(r.rows[0].amount).toLocaleString()} handover for ${dept.name} was flagged: ${reason}`,
      relatedEntityType: 'department', relatedEntityId: dept.id,
    }).catch(() => {});
    await logDeptActivity(dept.id, req.user.id, 'remittance_disputed',
      `Remittance ${req.params.rid.slice(0, 8)} disputed — ${reason}`);
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    logger.error('disputeRemittance', e);
    res.status(500).json({ success: false, error: 'Failed to dispute remittance' });
  }
});

module.exports = router;
