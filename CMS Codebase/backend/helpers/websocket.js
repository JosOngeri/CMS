const WebSocket = require('ws');
const { pool } = require('../config/database');
const { createLogger } = require('./controllerLogger');

const logger = createLogger('websocket');

class ActivityWebSocket {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.clients = new Map();
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const userId = this.extractUserId(req);
      
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

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

  extractUserId(req) {
    // Extract user ID from query parameters or headers
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('userId');
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

    this.clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        if (!client.channels || client.channels.includes('activity')) {
          client.send(message);
        }
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
