const BaseRepository = require('./BaseRepository');

class ActivityFeedRepository extends BaseRepository {
  constructor() {
    super('activity_feed');
  }

  async getActivityFeed(departmentId, limit = 20, offset = 0) {
    let activityQuery = `
      SELECT 
        'announcement' as activity_type,
        a.id,
        a.title,
        a.content as description,
        a.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as actor_name,
        u.id as actor_id,
        a.priority,
        'announcement' as sub_type
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      WHERE a.department_id = $1
      UNION ALL
      SELECT 
        'event_created' as activity_type,
        e.id,
        e.title,
        e.description,
        e.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as actor_name,
        u.id as actor_id,
        NULL as priority,
        'event' as sub_type
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.department_id = $1
      UNION ALL
      SELECT 
        'member_joined' as activity_type,
        dm.user_id as id,
        CONCAT(u.first_name, ' ', u.last_name) as title,
        'Joined the department' as description,
        dm.joined_at as created_at,
        CONCAT(u.first_name, ' ', u.last_name) as actor_name,
        u.id as actor_id,
        NULL as priority,
        'member' as sub_type
      FROM department_members dm
      JOIN users u ON dm.user_id = u.id
      WHERE dm.department_id = $1 AND dm.is_active = true
      UNION ALL
      SELECT 
        'approval_requested' as activity_type,
        ar.id,
        ar.title,
        ar.description,
        ar.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as actor_name,
        u.id as actor_id,
        ar.priority,
        'approval' as sub_type
      FROM approval_requests ar
      JOIN users u ON ar.requester_id = u.id
      WHERE ar.department_id = $1
      ORDER BY created_at DESC LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(activityQuery, [departmentId, limit, offset]);
    return result.rows;
  }

  async getActivityCount(departmentId) {
    let countQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT id FROM announcements WHERE department_id = $1
        UNION ALL
        SELECT id FROM events WHERE department_id = $1
        UNION ALL
        SELECT user_id FROM department_members WHERE department_id = $1 AND is_active = true
        UNION ALL
        SELECT id FROM approval_requests WHERE department_id = $1
      ) as all_activities
    `;

    const result = await this.pool.query(countQuery, [departmentId]);
    return parseInt(result.rows[0].total);
  }

  async getActivitySummary(departmentId) {
    const summary = await this.pool.query(`
      SELECT 
        'announcements' as type,
        COUNT(*) as count
      FROM announcements
      WHERE department_id = $1
      GROUP BY 'announcements'
      
      UNION ALL
      
      SELECT 
        'events' as type,
        COUNT(*) as count
      FROM events
      WHERE department_id = $1
      GROUP BY 'events'
      
      UNION ALL
      
      SELECT 
        'members' as type,
        COUNT(*) as count
      FROM department_members
      WHERE department_id = $1 AND is_active = true
      GROUP BY 'members'
      
      UNION ALL
      
      SELECT 
        'audit_logs' as type,
        COUNT(*) as count
      FROM audit_log
      WHERE new_values->>'department_id' = $1 OR old_values->>'department_id' = $1
      
      UNION ALL
      
      SELECT 
        'approvals' as type,
        COUNT(*) as count
      FROM approval_requests
      WHERE department_id = $1
      GROUP BY 'approvals'
    `, [departmentId]);

    return summary.rows;
  }

  async checkDepartmentAccess(departmentId, userId) {
    const result = await this.pool.query(`
      SELECT role FROM department_members 
      WHERE department_id = $1 AND user_id = $2 AND is_active = true
    `, [departmentId, userId]);

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
