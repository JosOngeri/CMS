const { pool } = require('../config/database');

/**
 * ChatService (Phase 10)
 * Handles message logic and Slash Command parsing
 */
class ChatService {

  async processMessage(roomId, senderId, content) {
    // 1. Check for Slash Commands
    if (content.startsWith('/')) {
      return await this.handleSlashCommand(roomId, senderId, content);
    }

    // 2. Standard Persistence logic
    return { type: 'text', content };
  }

  async handleSlashCommand(roomId, senderId, content) {
    const parts = content.split(' ');
    const command = parts[0].toLowerCase();

    switch (command) {
      case '/pay':
        // Example: /pay 500 Tithe
        return {
          type: 'slash_command',
          command: 'payment_modal',
          data: { amount: parts[1], category: parts[2] }
        };
      case '/event':
        return { type: 'slash_command', command: 'event_modal' };
      default:
        return { type: 'text', content: `Unknown command: ${command}` };
    }
  }
}

module.exports = new ChatService();
