/**
 * @purpose Church-side endpoints for the platform <-> church message thread
 *          (tracker 11.2). Scoped to the caller's own church; admin-tier
 *          roles only — these are staff-to-admin conversations.
 * @deps middleware/auth.js (authenticateToken, requireRole)
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { pool } = require('../config/database');

const ADMIN_ROLES = ['Super Admin', 'Pastor', 'First Elder'];

// GET /api/platform-messages — the thread with platform staff, oldest first.
// Fetching marks platform-authored messages read by this church.
router.get('/', authenticateToken, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `SELECT id, sender_type, sender_label, body, created_at
         FROM platform_tenant_messages
        WHERE church_id = $1
        ORDER BY created_at ASC LIMIT 200`,
      [churchId]
    );
    await pool.query(
      `UPDATE platform_tenant_messages
          SET read_by_church_at = COALESCE(read_by_church_at, CURRENT_TIMESTAMP)
        WHERE church_id = $1 AND sender_type = 'platform' AND read_by_church_at IS NULL`,
      [churchId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    if (error.code === '42P01') return res.json({ success: true, data: [] });
    res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
});

// POST /api/platform-messages — church admin replies into the same thread.
router.post('/', authenticateToken, requireRole(ADMIN_ROLES), async (req, res) => {
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body || body.length > 2000) {
    return res.status(400).json({ success: false, error: 'Message body required (max 2000 chars)' });
  }
  try {
    const label = [req.user.first_name || req.user.firstName, req.user.last_name || req.user.lastName].filter(Boolean).join(' ') || req.user.email || 'Church admin';
    const { rows } = await pool.query(
      `INSERT INTO platform_tenant_messages (church_id, sender_type, sender_label, body, read_by_church_at)
       VALUES ($1, 'church', $2, $3, CURRENT_TIMESTAMP) RETURNING *`,
      [req.user.church_id, label, body]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// GET /api/platform-messages/unread-count — cheap badge counter.
router.get('/unread-count', authenticateToken, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM platform_tenant_messages
        WHERE church_id = $1 AND sender_type = 'platform' AND read_by_church_at IS NULL`,
      [req.user.church_id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    if (error.code === '42P01') return res.json({ success: true, data: { n: 0 } });
    res.status(500).json({ success: false, error: 'Failed to count messages' });
  }
});

module.exports = router;
