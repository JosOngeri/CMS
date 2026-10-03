const BaseRepository = require('./BaseRepository');

class ActivityFeedRepository extends BaseRepository {
  constructor() {
    super('activity_feed');
  }

  // Reads the unified activity_feed view (migration 074). activity_type is
  // allowlisted so the caller's ?type= filter applies in SQL *before*
  // pagination — the old post-LIMIT in-memory filter dropped matching rows
  // that fell on later pages.
  static ACTIVITY_TYPES = new Set(['announcement', 'event_created', 'member_joined', 'approval_requested']);

  async getActivityFeed(departmentId, churchId, limit = 20, offset = 0, type = null) {
    const params = [departmentId, churchId];
    let typeFilter = '';
    if (type && type !== 'all') {
      if (!ActivityFeedRepository.ACTIVITY_TYPES.has(type)) return [];
      typeFilter = ' AND activity_type = $3';
      params.push(type);
    }
    params.push(this.clampLimit(limit), Math.max(0, offset || 0));

    const result = await this.pool.query(
      `SELECT activity_type, id, title, description, created_at,
              actor_name, actor_id, priority, sub_type
       FROM activity_feed
       WHERE department_id = $1 AND church_id = $2${typeFilter}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return result.rows;
  }

  async getActivityCount(departmentId, churchId, type = null) {
    const params = [departmentId, churchId];
    let typeFilter = '';
    if (type && type !== 'all') {
      if (!ActivityFeedRepository.ACTIVITY_TYPES.has(type)) return 0;
      typeFilter = ' AND activity_type = $3';
      params.push(type);
    }

    const result = await this.pool.query(
      `SELECT COUNT(*) as total FROM activity_feed
       WHERE department_id = $1 AND church_id = $2${typeFilter}`,
      params
    );
    return parseInt(result.rows[0].total);
  }

  async getActivitySummary(departmentId, churchId) {
    const summary = await this.pool.query(`
      SELECT 
        'announcements' as type,
        COUNT(*) as count
      FROM announcements
      WHERE department_id = $1 AND church_id = $2
      GROUP BY 'announcements'
      
      UNION ALL
      
      SELECT 
        'events' as type,
        COUNT(*) as count
      FROM events
      WHERE department_id = $1 AND church_id = $2
      GROUP BY 'events'
      
      UNION ALL
      
      SELECT 
        'members' as type,
        COUNT(*) as count
      FROM department_members
      WHERE department_id = $1 AND church_id = $2 AND is_active = true
      GROUP BY 'members'
      
      UNION ALL
      
      SELECT 
        'audit_logs' as type,
        COUNT(*) as count
      FROM audit_log
      WHERE church_id = $2
        AND (new_values->>'department_id' = $1 OR old_values->>'department_id' = $1)
      
      UNION ALL
      
      SELECT 
        'approvals' as type,
        COUNT(*) as count
      FROM approval_requests
      WHERE department_id = $1 AND church_id = $2
      GROUP BY 'approvals'
    `, [departmentId, churchId]);

    return summary.rows;
  }

  async checkDepartmentAccess(departmentId, userId, churchId) {
    const result = await this.pool.query(`
      SELECT role FROM department_members
      WHERE department_id = $1 AND user_id = $2 AND church_id = $3 AND is_active = true
    `, [departmentId, userId, churchId]);

    return result.rows.length > 0;
  }

  async getActivitiesByType(activities, type) {
    if (type && type !== 'all') {
      return activities.filter(activity => activity.activity_type === type);
    }
    return activities;
  }
}

module.exports = new ActivityFeedRepository();
