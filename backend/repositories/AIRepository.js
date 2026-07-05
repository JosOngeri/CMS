const BaseRepository = require('./BaseRepository');

class AIRepository extends BaseRepository {
  constructor() {
    super('ai_usage_logs');
  }

  async checkAIRateLimit(churchId, endpoint, limit) {
    const result = await this.pool.query(
      'SELECT * FROM check_ai_rate_limit($1, $2, $3)',
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

  async getUsageStats(churchId, dateFilter) {
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
