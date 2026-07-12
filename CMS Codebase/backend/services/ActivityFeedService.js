const { getActivityWebSocket } = require('../helpers/websocket');
const logger = require('../config/logging');

/**
 * Activity Feed Service
 * Handles WebSocket broadcasting for activity feed
 */
class ActivityFeedService {
  /**
   * Broadcast activities via WebSocket
   * @param {Array} activities - Array of activities to broadcast
   * @returns {Promise<void>}
   */
  async broadcastActivities(activities) {
    try {
      const ws = getActivityWebSocket();
      if (ws) {
        activities.forEach(activity => {
          ws.broadcastActivity({
            type: 'new_activity',
            data: activity,
            timestamp: new Date().toISOString()
          });
        });
      }
    } catch (error) {
      logger.error('ActivityFeedService', 'Failed to broadcast activities:', error);
    }
  }
}

module.exports = new ActivityFeedService();
