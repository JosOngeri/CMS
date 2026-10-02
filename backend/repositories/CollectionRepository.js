const BaseRepository = require('./BaseRepository');

class CollectionRepository extends BaseRepository {
  constructor() {
    super('event_collections');
  }

  // Personal Collections
  async getPersonalCollectionsByUserId(userId) {
    const query = `
      SELECT id, amount, purpose, fund, date, created_at
      FROM personal_collections
      WHERE user_id = $1
      ORDER BY date DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async createPersonalCollection(collectionData) {
    const { user_id, amount, purpose, fund, date } = collectionData;
    const query = `
      INSERT INTO personal_collections (user_id, amount, purpose, fund, date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [user_id, amount, purpose, fund, date]);
    return result.rows[0];
  }

  // Event Collections
  async getEventById(eventId, churchId = null) {
    const query = `SELECT id, has_collection FROM events WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`;
    const result = await this.pool.query(query, churchId ? [eventId, churchId] : [eventId]);
    return result.rows[0];
  }

  async updateEventHasCollection(eventId, churchId = null) {
    const query = `UPDATE events SET has_collection = true WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`;
    await this.pool.query(query, churchId ? [eventId, churchId] : [eventId]);
  }

  async createEventCollection(collectionData) {
    const { event_id, title, description, target_amount, visibility, created_by, church_id } = collectionData;
    const query = `
      INSERT INTO event_collections (event_id, title, description, target_amount, visibility, created_by, church_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await this.pool.query(query, [event_id, title, description, target_amount, visibility, created_by, church_id]);
    return result.rows[0];
  }

  async getEventCollectionWithDetails(id, churchId = null) {
    const query = `
      SELECT ec.*,
             e.title as event_title,
             e.start_date as event_date,
             CONCAT(u.first_name, ' ', u.last_name) as created_by_name
      FROM event_collections ec
      JOIN events e ON ec.event_id = e.id
      JOIN users u ON ec.created_by = u.id
      WHERE ec.id = $1${churchId ? ' AND ec.church_id = $2' : ''}
    `;
    const result = await this.pool.query(query, churchId ? [id, churchId] : [id]);
    return result.rows[0];
  }

  // All collections for a church (used by DepartmentDashboard to find the
  // collection linked to an event)
  async getCollectionsByChurch(churchId) {
    const query = `
      SELECT ec.*, e.title as event_title
      FROM event_collections ec
      LEFT JOIN events e ON ec.event_id = e.id
      WHERE ec.church_id = $1
      ORDER BY ec.created_at DESC
    `;
    const result = await this.pool.query(query, [churchId]);
    return result.rows;
  }

  async getEventCollectionWithProgress(id, churchId = null) {
    const collection = await this.getEventCollectionWithDetails(id, churchId);
    if (!collection) return null;

    const contributionCount = await this.countContributions(id);
    const progress = collection.target_amount > 0
      ? (collection.current_amount / collection.target_amount) * 100
      : 0;

    return {
      ...collection,
      progress: Math.min(progress, 100),
      contribution_count: contributionCount
    };
  }

  async countContributions(collectionId) {
    const query = 'SELECT COUNT(*) as count FROM collection_contributions WHERE collection_id = $1';
    const result = await this.pool.query(query, [collectionId]);
    return parseInt(result.rows[0].count);
  }

  async getEventCollectionById(id, churchId = null) {
    const query = `SELECT * FROM event_collections WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`;
    const result = await this.pool.query(query, churchId ? [id, churchId] : [id]);
    return result.rows[0];
  }

  async updateEventCollection(id, collectionData, churchId = null) {
    const { title, description, target_amount, visibility } = collectionData;
    const query = `
      UPDATE event_collections
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          target_amount = COALESCE($3, target_amount),
          visibility = COALESCE($4, visibility),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5${churchId ? ' AND church_id = $6' : ''}
      RETURNING *
    `;
    const params = churchId
      ? [title, description, target_amount, visibility, id, churchId]
      : [title, description, target_amount, visibility, id];
    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async createContribution(contributionData) {
    // collection_contributions schema: id, collection_id, contributor_id,
    // amount, church_id, created_at — no contributor_name/payment_method/notes.
    const { collection_id, contributor_id, amount, church_id } = contributionData;
    const query = `
      INSERT INTO collection_contributions (collection_id, contributor_id, amount, church_id)
      SELECT $1, $2, $3, $4
      WHERE EXISTS (SELECT 1 FROM event_collections WHERE id = $1 AND church_id = $4)
      RETURNING *
    `;
    const result = await this.pool.query(query, [collection_id, contributor_id, amount, church_id]);
    return result.rows[0];
  }

  async updateCollectionCurrentAmount(collectionId, amount) {
    const query = 'UPDATE event_collections SET current_amount = current_amount + $1 WHERE id = $2';
    await this.pool.query(query, [amount, collectionId]);
  }

  async getCollectionAmounts(collectionId) {
    const query = 'SELECT current_amount, target_amount FROM event_collections WHERE id = $1';
    const result = await this.pool.query(query, [collectionId]);
    return result.rows[0];
  }

  async updateCollectionStatus(collectionId, status) {
    const query = 'UPDATE event_collections SET status = $1 WHERE id = $2';
    await this.pool.query(query, [status, collectionId]);
  }

  async updateCollectionStatusWithTimestamp(collectionId, status, churchId = null) {
    const query = `UPDATE event_collections SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2${churchId ? ' AND church_id = $3' : ''} RETURNING *`;
    const result = await this.pool.query(query, churchId ? [status, collectionId, churchId] : [status, collectionId]);
    return result.rows[0];
  }

  async getContributions(collectionId, limit = 50, offset = 0) {
    const query = `
      SELECT cc.*,
             CASE
               WHEN cc.contributor_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
               ELSE 'Anonymous'
             END as contributor_name
      FROM collection_contributions cc
      LEFT JOIN users u ON cc.contributor_id = u.id
      WHERE cc.collection_id = $1
      ORDER BY cc.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.pool.query(query, [collectionId, limit, offset]);
    return result.rows;
  }

  async countTotalContributions(collectionId) {
    const query = 'SELECT COUNT(*) as count FROM collection_contributions WHERE collection_id = $1';
    const result = await this.pool.query(query, [collectionId]);
    return parseInt(result.rows[0].count);
  }

  async getContributionById(contributionId, collectionId, churchId = null) {
    const query = `SELECT * FROM collection_contributions WHERE id = $1 AND collection_id = $2${churchId ? ' AND church_id = $3' : ''}`;
    const result = await this.pool.query(query, churchId ? [contributionId, collectionId, churchId] : [contributionId, collectionId]);
    return result.rows[0];
  }

  async deleteContribution(contributionId, churchId = null) {
    const query = `DELETE FROM collection_contributions WHERE id = $1${churchId ? ' AND church_id = $2' : ''}`;
    await this.pool.query(query, churchId ? [contributionId, churchId] : [contributionId]);
  }

  async subtractFromCollectionCurrentAmount(collectionId, amount) {
    const query = 'UPDATE event_collections SET current_amount = current_amount - $1 WHERE id = $2';
    await this.pool.query(query, [amount, collectionId]);
  }

  async getCollectionStatusAndAmounts(collectionId) {
    const query = 'SELECT current_amount, target_amount, status FROM event_collections WHERE id = $1';
    const result = await this.pool.query(query, [collectionId]);
    return result.rows[0];
  }

  // ---------------------------------------------------------------------------
  // Additional methods for remaining controller queries
  // ---------------------------------------------------------------------------

  async findEventCollectionById(id) {
    const result = await this.pool.query('SELECT * FROM event_collections WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getCollectionAnalytics(collectionId, churchId = null) {
    const query = `
      SELECT
        ec.*,
        COUNT(DISTINCT cc.contributor_id) as unique_contributors,
        COUNT(cc.id) as total_contributions,
        AVG(cc.amount) as average_contribution,
        MAX(cc.amount) as highest_contribution,
        MIN(cc.amount) as lowest_contribution
      FROM event_collections ec
      LEFT JOIN collection_contributions cc ON ec.id = cc.collection_id
      WHERE ec.id = $1${churchId ? ' AND ec.church_id = $2' : ''}
      GROUP BY ec.id
    `;
    const result = await this.pool.query(query, churchId ? [collectionId, churchId] : [collectionId]);
    return result.rows[0];
  }
}

module.exports = new CollectionRepository();
