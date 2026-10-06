const BaseController = require('./BaseController');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');
const gatewayRegistry = require('../services/gatewayRegistry');
const smsProviderRepo = require('../repositories/SMSProviderRepository');
const { pool } = require('../config/database');

const DELIVERY_STATUSES = ['queued', 'accepted', 'sent', 'delivered', 'failed'];

/**
 * SMS Gateway Controller — device-facing and webapp-facing gateway endpoints.
 *
 * Device-facing (Android relay, SMS-scoped JWT):
 *   POST /api/sms/gateway-heartbeat   battery/signal/last-seen
 *   POST /api/sms/delivery-report     per-recipient delivery acks
 *
 * Webapp-facing (church-scoped reads):
 *   GET  /api/sms/gateway-status      online/offline + device health
 *   GET  /api/sms/deliveries          queue/outbox ledger
 *
 * Provider-facing (unauthenticated, secret-tokened path):
 *   POST /api/sms/provider-callbacks/:provider/:token/delivery
 *   POST /api/sms/provider-callbacks/:provider/:token/topup
 */
class SmsGatewayController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('SmsGatewayController');
  }

  /** GET /api/sms/gateway-status — live presence + durable device records. */
  async getGatewayStatus(req, res) {
    try {
      const churchId = req.user.church_id || req.user.churchId;
      if (!churchId) return ResponseHandler.error(res, 'church_id is required', 400);
      const status = await gatewayRegistry.getStatus(churchId);
      return ResponseHandler.success(res, status);
    } catch (error) {
      this.logger.error('getGatewayStatus', error);
      return ResponseHandler.error(res, 'Failed to get gateway status');
    }
  }

  /** POST /api/sms/gateway-heartbeat — device health ping. */
  async heartbeat(req, res) {
    try {
      const churchId = req.user.church_id || req.user.churchId;
      if (!churchId) return ResponseHandler.error(res, 'church_id is required', 400);

      const { deviceId, battery, signal, appVersion, label } = req.body || {};
      if (!deviceId || typeof deviceId !== 'string') {
        return ResponseHandler.error(res, 'deviceId is required', 400);
      }

      await gatewayRegistry.heartbeat(churchId, deviceId, {
        userId: req.user.id || req.user.userId,
        battery: typeof battery === 'number' ? battery : null,
        signal: typeof signal === 'number' ? signal : null,
        appVersion: appVersion || null,
        label: label || null,
      });

      return ResponseHandler.success(res, { received: true, at: new Date().toISOString() });
    } catch (error) {
      this.logger.error('heartbeat', error);
      return ResponseHandler.error(res, 'Failed to record heartbeat');
    }
  }

  /**
   * POST /api/sms/delivery-report — per-recipient status updates from the relay.
   * Body: { batchId, deviceId?, reports: [{ recipient, status, error? }] }
   * Rows are upserted on (batch_id, recipient) and confined to the caller's
   * church — a gateway can never write into another tenant's ledger.
   */
  async deliveryReport(req, res) {
    try {
      const churchId = req.user.church_id || req.user.churchId;
      if (!churchId) return ResponseHandler.error(res, 'church_id is required', 400);

      const { batchId, deviceId, reports } = req.body || {};
      if (!batchId || !Array.isArray(reports) || reports.length === 0) {
        return ResponseHandler.error(res, 'batchId and a non-empty reports array are required', 400);
      }
      if (reports.length > 1000) {
        return ResponseHandler.error(res, 'reports array exceeds the 1000-row limit', 400);
      }

      let updated = 0;
      const errors = [];
      for (const report of reports) {
        const { recipient, status, error: reportError } = report || {};
        if (!recipient || !DELIVERY_STATUSES.includes(status)) {
          errors.push({ recipient, reason: 'invalid recipient or status' });
          continue;
        }
        try {
          const result = await pool.query(
            `UPDATE sms_deliveries
               SET status = $1,
                   error = $2,
                   device_id = COALESCE($3, device_id),
                   delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
                   updated_at = NOW()
             WHERE church_id = $4 AND batch_id = $5 AND recipient = $6`,
            [status, reportError || null, deviceId || null, churchId, batchId, recipient]
          );
          updated += result.rowCount;
        } catch (rowErr) {
          errors.push({ recipient, reason: rowErr.message });
        }
      }

      // Roll the batch's sms_logs row forward when every delivery reached a
      // terminal state — keeps the aggregate log honest without polling.
      try {
        const summary = await pool.query(
          `SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status IN ('delivered','sent')) AS ok,
             COUNT(*) FILTER (WHERE status = 'failed') AS failed
           FROM sms_deliveries
           WHERE church_id = $1 AND batch_id = $2`,
          [churchId, batchId]
        );
        const { total, ok, failed } = summary.rows[0];
        if (Number(total) > 0 && Number(ok) + Number(failed) === Number(total)) {
          const finalStatus = Number(failed) === Number(total) ? 'failed'
            : Number(failed) > 0 ? 'partial' : 'delivered';
          await pool.query(
            `UPDATE sms_logs SET status = $1, updated_at = NOW()
             WHERE id::text = $2 AND church_id = $3`,
            [finalStatus, batchId, churchId]
          );
        }
      } catch (aggErr) {
        this.logger.warn('delivery-report aggregate update skipped:', aggErr.message);
      }

      return ResponseHandler.success(res, { updated, errors: errors.length ? errors : undefined });
    } catch (error) {
      this.logger.error('deliveryReport', error);
      return ResponseHandler.error(res, 'Failed to record delivery report');
    }
  }

  /**
   * GET /api/sms/deliveries — church-scoped ledger for the outbox UI.
   * Query: ?batchId=&status=&page=&limit= (limit clamped to 200)
   */
  async listDeliveries(req, res) {
    try {
      const churchId = req.user.church_id || req.user.churchId;
      if (!churchId) return ResponseHandler.error(res, 'church_id is required', 400);

      const { batchId, status } = req.query;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
      const offset = (page - 1) * limit;

      const conditions = ['church_id = $1'];
      const params = [churchId];
      let idx = 2;
      if (batchId) { conditions.push(`batch_id = $${idx++}`); params.push(batchId); }
      if (status && DELIVERY_STATUSES.includes(status)) {
        conditions.push(`status = $${idx++}`); params.push(status);
      }

      const where = conditions.join(' AND ');
      const [rows, count] = await Promise.all([
        pool.query(
          `SELECT id, batch_id, recipient, message_preview, gateway, device_id,
                  status, error, queued_at, updated_at, delivered_at
           FROM sms_deliveries
           WHERE ${where}
           ORDER BY queued_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, offset]
        ),
        pool.query(`SELECT COUNT(*) AS total FROM sms_deliveries WHERE ${where}`, params),
      ]);

      return ResponseHandler.success(res, {
        deliveries: rows.rows,
        total: Number(count.rows[0].total),
        page,
        limit,
      });
    } catch (error) {
      this.logger.error('listDeliveries', error);
      return ResponseHandler.error(res, 'Failed to list deliveries');
    }
  }

  /**
   * Provider delivery callback — BlessedTexts (or future providers) POST here.
   * Authenticated by the provider's callback_secret in the path — no user JWT.
   * Finds the provider row by name + secret, then updates matching deliveries.
   */
  async providerDeliveryCallback(req, res) {
    try {
      const provider = await this._resolveProviderBySecret(req);
      if (!provider) return ResponseHandler.error(res, 'Unknown provider callback', 404);

      // BlessedTexts-style payload — tolerate common field spellings.
      const body = req.body || {};
      const phone = body.recipient || body.phone || body.msisdn || body.to;
      const rawStatus = (body.status || body.delivery_status || '').toLowerCase();
      const batchId = body.batchId || body.batch_id || body.reference || body.message_id;
      const status = rawStatus.includes('deliver') ? 'delivered'
        : rawStatus.includes('fail') || rawStatus.includes('reject') ? 'failed'
        : rawStatus.includes('sent') ? 'sent' : null;

      if (phone && status && provider.church_id) {
        await pool.query(
          `UPDATE sms_deliveries
             SET status = $1,
                 delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
                 updated_at = NOW()
           WHERE church_id = $2 AND recipient LIKE '%' || $3 AND gateway = $4
             AND ($5::text IS NULL OR batch_id = $5)`,
          [status, provider.church_id, String(phone).replace(/^\+/, ''), provider.name, batchId || null]
        );
      }

      return ResponseHandler.success(res, { received: true });
    } catch (error) {
      this.logger.error('providerDeliveryCallback', error);
      return ResponseHandler.error(res, 'Callback processing failed');
    }
  }

  /**
   * Provider topup/credit confirmation callback — records balance changes the
   * provider pushes to us.
   */
  async providerTopupCallback(req, res) {
    try {
      const provider = await this._resolveProviderBySecret(req);
      if (!provider) return ResponseHandler.error(res, 'Unknown provider callback', 404);

      const body = req.body || {};
      const newBalance = body.balance ?? body.credits ?? body.units;
      if (newBalance !== undefined && Number.isFinite(Number(newBalance))) {
        await smsProviderRepo.updateBalance(provider.id, Number(newBalance));
      }

      this.logger.info(`Topup callback for provider ${provider.name}: balance=${newBalance}`);
      return ResponseHandler.success(res, { received: true });
    } catch (error) {
      this.logger.error('providerTopupCallback', error);
      return ResponseHandler.error(res, 'Callback processing failed');
    }
  }

  /** Resolve provider by name + callback_secret path token. */
  async _resolveProviderBySecret(req) {
    const { provider, token } = req.params;
    if (!provider || !token) return null;
    const row = await smsProviderRepo.findByName(provider);
    if (!row || !row.callback_secret || row.callback_secret !== token) return null;
    return row;
  }
}

module.exports = new SmsGatewayController();
