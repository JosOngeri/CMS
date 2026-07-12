const logger = require('../config/logging');

/**
 * Messaging Service
 * Handles Socket.io broadcasting and real-time message delivery
 * Decouples controllers from direct Socket.io access
 */
class MessagingService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize the messaging service with Socket.io instance
   * @param {Object} io - Socket.io instance
   */
  initialize(io) {
    this.io = io;
    logger.info('MessagingService initialized with Socket.io');
  }

  /**
   * Get the Socket.io instance
   * @returns {Object|null} Socket.io instance or null if not initialized
   */
  getIo() {
    return this.io;
  }

  /**
   * Check if messaging service is ready
   * @returns {boolean} True if initialized
   */
  isReady() {
    return this.io !== null;
  }

  /**
   * Broadcast a message to a specific room
   * @param {string} room - Room name
   * @param {string} event - Event name
   * @param {Object} data - Data to broadcast
   */
  broadcastToRoom(room, event, data) {
    if (!this.isReady()) {
      logger.warn(`MessagingService not ready, skipping broadcast to room: ${room}`);
      return;
    }

    try {
      this.io.to(room).emit(event, data);
      logger.debug({ room, event }, `Broadcasted to room: ${room}`);
    } catch (error) {
      logger.error({ error: error.message, room, event }, 'Failed to broadcast to room');
    }
  }

  /**
   * Broadcast a message to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Data to broadcast
   */
  broadcastToAll(event, data) {
    if (!this.isReady()) {
      logger.warn('MessagingService not ready, skipping broadcast to all');
      return;
    }

    try {
      this.io.emit(event, data);
      logger.debug({ event }, 'Broadcasted to all clients');
    } catch (error) {
      logger.error({ error: error.message, event }, 'Failed to broadcast to all');
    }
  }

  /**
   * Send a message to a specific user by their socket ID
   * @param {string} socketId - Socket ID
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  sendToSocket(socketId, event, data) {
    if (!this.isReady()) {
      logger.warn(`MessagingService not ready, skipping send to socket: ${socketId}`);
      return;
    }

    try {
      this.io.to(socketId).emit(event, data);
      logger.debug({ socketId, event }, `Sent to socket: ${socketId}`);
    } catch (error) {
      logger.error({ error: error.message, socketId, event }, 'Failed to send to socket');
    }
  }

  /**
   * Send a chat message to a room
   * @param {string} roomId - Room ID
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   */
  sendChatMessage(roomId, message, sender = {}) {
    this.broadcastToRoom(`room:${roomId}`, 'new_message', {
      ...message,
      first_name: sender.first_name,
      last_name: sender.last_name
    });
  }

  /**
   * Send a notification to a user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   */
  sendNotification(userId, notification) {
    this.broadcastToRoom(`user:${userId}`, 'notification', notification);
  }

  /**
   * Send activity feed update
   * @param {string} churchId - Church ID
   * @param {Object} activity - Activity object
   */
  sendActivityUpdate(churchId, activity) {
    this.broadcastToRoom(`church:${churchId}`, 'activity_update', activity);
  }
}

module.exports = new MessagingService();