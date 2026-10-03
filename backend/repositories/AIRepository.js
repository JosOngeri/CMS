const BaseRepository = require('./BaseRepository');

class AIRepository extends BaseRepository {
  constructor() {
    super('ai_usage_logs');
  }

  async checkAIRateLimit(churchId, endpoint, limit = 100) {
    // Standardized in-repository: single upsert replaces the
    // check_ai_rate_limit() stored procedure (still defined in migration 066)
    // so the rate limiter works in environments where the function is absent.
    const result = await this.pool.query(
      `INSERT INTO ai_rate_limits (church_id, endpoint, window_start, request_count, max_requests, reset_at)
       VALUES ($1, $2, date_trunc('hour', CURRENT_TIMESTAMP), 1, $3,
               date_trunc('hour', CURRENT_TIMESTAMP) + INTERVAL '1 hour')
       ON CONFLICT (church_id, endpoint, window_start)
       DO UPDATE SET request_count = ai_rate_limits.request_count + 1
       RETURNING (request_count <= $3) AS allowed,
                 ($3 - request_count) AS remaining,
                 reset_at`,
      [churchId, endpoint, limit]
    );
    return result.rows[0];
  }

  async logAIUsage(data) {
    const {
      churchId,
      userId,
      endpoint,
      model,
      inputTokens,
      outputTokens,
      status,
      error,
      requestMetadata,
      responseMetadata
    } = data;

    const result = await this.pool.query(
      'SELECT log_ai_usage($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [
        churchId,
        userId,
        endpoint,
        model,
        inputTokens,
        outputTokens,
        status,
        error,
        requestMetadata,
        responseMetadata
      ]
    );
    return result.rows[0];
  }

  async getChurchSettings(churchId) {
    const result = await this.pool.query('SELECT settings FROM churches WHERE id = $1', [churchId]);
    return result.rows[0];
  }

  async getUsageStats(churchId, period = '7d') {
    let dateFilter = '';
    if (period === '24h') {
      dateFilter = "AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'";
    } else if (period === '7d') {
      dateFilter = "AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'";
    } else if (period === '30d') {
      dateFilter = "AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'";
    }

    const result = await this.pool.query(
      `SELECT
        COUNT(*) as total_requests,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(cost) as total_cost,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_requests,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_requests
      FROM ai_usage_logs
      WHERE church_id = $1 ${dateFilter}`,
      [churchId]
    );
    return result.rows[0];
  }

  async updateChurchSettings(churchId, settings) {
    const result = await this.pool.query(
      `UPDATE churches
       SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING settings`,
      [JSON.stringify(settings), churchId]
    );
    return result.rows[0];
  }
}

module.exports = new AIRepository();
