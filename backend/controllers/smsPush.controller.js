const { authenticateToken } = require('../middleware/auth');
const SnapshotService = require('../services/SnapshotService');
const RollingUpdateService = require('../services/RollingUpdateService');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('SmsPushController');

class SmsPushController {
  constructor() {
    this.logger = createLogger('SmsPushController');
    this.snapshotService = SnapshotService;
    this.rollingUpdateService = RollingUpdateService;
    this.clients = new Map(); // userId -> Set of socket connections
  }

  setServices(services) {
    if (services.snapshotService) {
      this.snapshotService = services.snapshotService;
    }
    if (services.rollingUpdateService) {
      this.rollingUpdateService = services.rollingUpdateService;
    }
  }

  initializeWebSocket(io) {
    // SMS-specific WebSocket namespace
    const smsNamespace = io.of('/api/sms/sync/push');

    smsNamespace.use(async (socket, next) => {
      try {
        // Extract token from query parameters
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify token and get user info
        const auth = await this.verifyToken(token);
        if (!auth) {
          return next(new Error('Invalid authentication token'));
        }

        // Attach user info to socket
        socket.user = auth;
        socket.userId = auth.id;
        socket.churchId = auth.churchId;

        next();
      } catch (error) {
        logger.error('WebSocket authentication error', error);
        next(new Error('Authentication failed'));
      }
    });

    smsNamespace.on('connection', (socket) => {
      const userId = socket.userId;
      const churchId = socket.churchId;

      logger.info(`SMS WebSocket client connected: userId=${userId}, churchId=${churchId}`);

      // Add client to the map
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(socket);

      // Send connection confirmation
      socket.emit('connected', {
        type: 'connected',
        userId: userId,
        timestamp: new Date().toISOString()
      });

      // Handle department updates
      socket.on('department_update', (data) => {
        this.handleDepartmentUpdate(socket, data);
      });

      // Handle ping/pong for keep-alive
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`SMS WebSocket client disconnected: userId=${userId}, reason=${reason}`);
        
        // Remove client from the map
        if (this.clients.has(userId)) {
          this.clients.get(userId).delete(socket);
          if (this.clients.get(userId).size === 0) {
            this.clients.delete(userId);
          }
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`WebSocket error for userId=${userId}:`, error);
      });
    });

    logger.info('SMS WebSocket push endpoint initialized');
  }

  async verifyToken(token) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = process.env;
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if token has SMS scope
      if (!decoded.scope || !decoded.scope.includes('sms')) {
        return null;
      }

      return {
        id: decoded.userId,
        churchId: decoded.churchId,
        roles: decoded.roles,
        scope: decoded.scope
      };
    } catch (error) {
      logger.error('Token verification error:', error);
      return null;
    }
  }

  async handleDepartmentUpdate(socket, data) {
    try {
      const { department, updateType, changes } = data;
      const userId = socket.userId;
      const churchId = socket.churchId;

      logger.info(`Department update received: userId=${userId}, department=${department}, type=${updateType}`);

      // Broadcast department update to relevant users
      await this.broadcastToDepartmentMembers(churchId, department, {
        type: 'department_update',
        department: department,
        update_type: updateType,
        changes: changes,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling department update:', error);
      socket.emit('error', { message: 'Failed to process department update' });
    }
  }

  async broadcastToDepartmentMembers(churchId, department, message) {
    try {
      // In a real implementation, you would query the database to find all users
      // who are members of this department and broadcast to them
      // For now, this is a placeholder
      
      logger.info(`Broadcasting to department members: churchId=${churchId}, department=${department}`);
      
      // Placeholder: broadcast to all connected clients for this church
      for (const [userId, sockets] of this.clients.entries()) {
        for (const socket of sockets) {
          if (socket.churchId === churchId) {
            socket.emit('update', message);
          }
        }
      }
    } catch (error) {
      logger.error('Error broadcasting to department members:', error);
    }
  }

  async pushUpdateToUser(userId, update) {
    try {
      const userSockets = this.clients.get(userId);
      
      if (!userSockets || userSockets.size === 0) {
        logger.debug(`No active WebSocket connections for userId=${userId}`);
        return false;
      }

      const message = {
        type: 'update',
        data: update,
        timestamp: new Date().toISOString()
      };

      // Send to all sockets for this user
      for (const socket of userSockets) {
        socket.emit('update', message);
      }

      logger.info(`Push update sent to userId=${userId}, connections=${userSockets.size}`);
      return true;
    } catch (error) {
      logger.error(`Error pushing update to userId=${userId}:`, error);
      return false;
    }
  }

  getConnectedUsers() {
    return Array.from(this.clients.keys());
  }

  getConnectionCount() {
    let total = 0;
    for (const sockets of this.clients.values()) {
      total += sockets.size;
    }
    return total;
  }
}

module.exports = new SmsPushController();