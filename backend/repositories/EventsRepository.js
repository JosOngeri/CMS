const BaseRepository = require('./BaseRepository');

class EventsRepository extends BaseRepository {
  constructor() {
    super('events');
  }

  async getUpcoming(churchId = null, limit = 10) {
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE event_date >= CURRENT_DATE
    `;
    const params = [];

    if (churchId) {
      query += ` AND church_id = $1`;
      params.push(churchId);
    }

    query += ` ORDER BY event_date ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getByDepartment(departmentId, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE department_id = $1`;
    const params = [departmentId];

    if (churchId) {
      query += ` AND church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY event_date DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getWithCreatorDetails(eventId, churchId = null) {
    let query = `
      SELECT e.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `;
    const params = [eventId];

    if (churchId) {
      query += ` AND e.church_id = $2`;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getEventAttendees(eventId, churchId = null) {
    let query = `
      SELECT ea.*, m.first_name, m.last_name, m.email
      FROM event_attendees ea
      LEFT JOIN members m ON ea.member_id = m.id
      WHERE ea.event_id = $1
    `;
    const params = [eventId];

    if (churchId) {
      query += ` AND ea.church_id = $2`;
      params.push(churchId);
    }

    query += ` ORDER BY ea.registered_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createEvent(data, churchId = null) {
    const { title, description, event_date, location, department_id, organizer_id, max_attendees, is_public, poster_url } = data;

    let query = `
      INSERT INTO events (title, description, event_date, location, department_id, organizer_id, max_attendees, is_public, poster_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const params = [title, description, event_date, location, department_id, organizer_id, max_attendees, is_public, poster_url];

    if (churchId) {
      query = `
        INSERT INTO events (title, description, event_date, location, department_id, organizer_id, max_attendees, is_public, poster_url, church_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async updateEvent(eventId, data, churchId = null) {
    const { title, description, event_date, event_time, location, max_attendees, is_public } = data;

    let query = `
      UPDATE events
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          event_date = COALESCE($3, event_date),
          event_time = COALESCE($4, event_time),
          location = COALESCE($5, location),
          max_attendees = COALESCE($6, max_attendees),
          is_public = COALESCE($7, is_public),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    const params = [title, description, event_date, event_time, location, max_attendees, is_public, eventId];

    if (churchId) {
      query = `
        UPDATE events
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            event_date = COALESCE($3, event_date),
            event_time = COALESCE($4, event_time),
            location = COALESCE($5, location),
            max_attendees = COALESCE($6, max_attendees),
            is_public = COALESCE($7, is_public),
            updated_at = NOW()
        WHERE id = $8 AND church_id = $9
        RETURNING *
      `;
      params.push(churchId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async getAllEvents(filters = {}) {
    const { page = 1, limit = 20, department_id, is_public, userId, userRoles } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Add filters
    if (department_id) {
      whereClause += ` AND e.department_id = $${paramIndex++}`;
      params.push(department_id);
    }

    if (is_public !== undefined) {
      whereClause += ` AND e.is_public = $${paramIndex++}`;
      params.push(is_public === 'true');
    }

    // For non-admin users, only show public events or their department's
    if (userRoles && !userRoles.includes('Super Admin') && !userRoles.includes('Pastor') && !userRoles.includes('First Elder')) {
      whereClause += ` AND (e.is_public = true OR e.department_id IN (
        SELECT department_id FROM department_members WHERE user_id = $${paramIndex++}
      ))`;
      params.push(userId);
    }

    const query = `
      SELECT e.*, u.first_name as organizer_first_name, u.last_name as organizer_last_name,
             d.name as department_name, 
             COUNT(ea.id) as attendee_count
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN event_attendance ea ON e.id = ea.event_id
      ${whereClause}
      GROUP BY e.id, u.first_name, u.last_name, d.name
      ORDER BY e.event_date ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM events e ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, params.slice(0, -2));

    return {
      events: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  }

  async getEventById(eventId) {
    const query = `
      SELECT e.*, u.first_name as organizer_first_name, u.last_name as organizer_last_name,
             d.name as department_name
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1
    `;

    const result = await this.pool.query(query, [eventId]);
    return result.rows[0];
  }

  async deleteEvent(eventId) {
    const result = await this.pool.query(
      'DELETE FROM events WHERE id = $1 RETURNING *',
      [eventId]
    );
    return result.rows[0];
  }

  async delete(id) {
    // Alias for deleteEvent for consistency with BaseRepository
    return this.deleteEvent(id);
  }

  async findAll(filters = {}, churchId = null) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (churchId) {
      paramCount++;
      query += ` AND church_id = $${paramCount}`;
      params.push(churchId);
    }

    if (filters.department_id) {
      paramCount++;
      query += ` AND department_id = $${paramCount}`;
      params.push(filters.department_id);
    }

    if (filters.is_public !== undefined) {
      paramCount++;
      query += ` AND is_public = $${paramCount}`;
      params.push(filters.is_public);
    }

    query += ` ORDER BY event_date ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async registerForEvent(eventId, userId) {
    const result = await this.pool.query(
      `INSERT INTO event_attendance (event_id, user_id, registered_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING *`,
      [eventId, userId]
    );
    return result.rows[0];
  }

  async cancelEventRegistration(eventId, userId) {
    const result = await this.pool.query(
      'DELETE FROM event_attendance WHERE event_id = $1 AND user_id = $2 RETURNING *',
      [eventId, userId]
    );
    return result.rows[0];
  }

  async getEventAttendeesList(eventId) {
    const query = `
      SELECT ea.*, u.first_name, u.last_name, u.email
      FROM event_attendance ea
      LEFT JOIN users u ON ea.user_id = u.id
      WHERE ea.event_id = $1
      ORDER BY ea.registered_at DESC
    `;

    const result = await this.pool.query(query, [eventId]);
    return result.rows;
  }

  async checkDepartmentMembership(userId, departmentId) {
    const result = await this.pool.query(
      'SELECT 1 FROM department_members WHERE user_id = $1 AND department_id = $2',
      [userId, departmentId]
    );
    return result.rows[0];
  }

  async updateEventDetails(eventId, data) {
    const { title, description, event_date, location, department_id, max_attendees, is_public, poster_url } = data;

    const query = `
      UPDATE events
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          event_date = COALESCE($3, event_date),
          location = COALESCE($4, location),
          department_id = COALESCE($5, department_id),
          max_attendees = COALESCE($6, max_attendees),
          is_public = COALESCE($7, is_public),
          poster_url = COALESCE($8, poster_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;

    const result = await this.pool.query(query, [title, description, event_date, location, department_id, max_attendees, is_public, poster_url, eventId]);
    return result.rows[0];
  }
}

module.exports = new EventsRepository();
