/**
 * @audit Activity WebSocket helper (ws).
 * @known FIXED: handshake now verifies ?token=<JWT> via verifyAccessToken (was raw
 *        ?userId= — unauthenticated impersonation). Church resolved from users table at
 *        connect; broadcastActivity only delivers to matching church when the activity
 *        carries church_id. server.js still runs a second io bind — see ledger Batch-1.
 */
const WebSocket = require('ws');
const { pool } = require('../config/database');
const { verifyAccessToken } = require('./security');
const { createLogger } = require('./controllerLogger');

const logger = createLogger('websocket');

class ActivityWebSocket {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.clients = new Map();
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', async (ws, req) => {
      const identity = await this.authenticate(req);

      if (!identity) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      const { userId, churchId } = identity;
      ws.churchId = churchId;

      logger.info('setupWebSocket', `WebSocket client connected: ${userId}`);
      this.clients.set(userId, ws);

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connection established',
        userId
      }));

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(userId, data);
        } catch (error) {
          logger.error('handleMessage', 'WebSocket message error:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        logger.info('setupWebSocket', `WebSocket client disconnected: ${userId}`);
        this.clients.delete(userId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('setupWebSocket', `WebSocket error for user ${userId}:`, error);
      });
    });

    logger.info('setupWebSocket', 'WebSocket server initialized');
  }

  /**
   * Authenticate the WS handshake via ?token=<JWT>.
   * Returns { userId, churchId } or null — the connection is rejected on any failure.
   */
  async authenticate(req) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (!token) return null;

      const decoded = verifyAccessToken(token);
      if (!decoded?.userId) return null;

      // Token carries no church claim — resolve tenant + active status from DB
      const result = await pool.query(
        'SELECT church_id FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
        [decoded.userId]
      );
      if (result.rows.length === 0) return null;

      return { userId: decoded.userId, churchId: result.rows[0].church_id };
    } catch (error) {
      return null;
    }
  }

  handleMessage(userId, data) {
    switch (data.type) {
      case 'subscribe':
        this.handleSubscribe(userId, data.channels);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(userId, data.channels);
        break;
      case 'ping':
        this.handlePing(userId);
        break;
      default:
        logger.info('handleMessage', `Unknown message type: ${data.type}`);
    }
  }

  handleSubscribe(userId, channels) {
    const client = this.clients.get(userId);
    if (client) {
      client.channels = channels || ['activity'];
      client.send(JSON.stringify({
        type: 'subscribed',
        channels: client.channels
      }));
    }
  }

  handleUnsubscribe(userId, channels) {
    const client = this.clients.get(userId);
    if (client && client.channels) {
      client.channels = client.channels.filter(ch => !channels.includes(ch));
      client.send(JSON.stringify({
        type: 'unsubscribed',
        channels
      }));
    }
  }

  handlePing(userId) {
    const client = this.clients.get(userId);
    if (client) {
      client.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
    }
  }

  broadcastActivity(activity) {
    const message = JSON.stringify({
      type: 'activity',
      data: activity
    });

    // Tenant scoping: activities carrying church_id only reach that church's clients
    const churchId = activity?.church_id || activity?.data?.church_id || null;

    this.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) return;
      if (churchId && client.churchId !== churchId) return;
      if (!client.channels || client.channels.includes('activity')) {
        client.send(message);
      }
    });
  }

  broadcastToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  getConnectedClients() {
    return Array.from(this.clients.keys());
  }

  getConnectedCount() {
    return this.clients.size;
  }
}

// Singleton instance
let activityWebSocket = null;

function initActivityWebSocket(server) {
  if (!activityWebSocket) {
    activityWebSocket = new ActivityWebSocket(server);
  }
  return activityWebSocket;
}

function getActivityWebSocket() {
  return activityWebSocket;
}

module.exports = {
  initActivityWebSocket,
  getActivityWebSocket
};
