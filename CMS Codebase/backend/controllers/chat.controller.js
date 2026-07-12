const BaseController = require('./BaseController');
const ChatRepository = require('../repositories/ChatRepository');
const ResponseHandler = require('../utils/ResponseHandler');
const MessagingService = require('../services/MessagingService');

/**
 * Chat Controller (Phase 10)
 * Handles in-app messaging and room management
 */
class ChatController extends BaseController {

  async getRooms(req, res) {
    const churchId = req.user.church_id;
    try {
      const rooms = await ChatRepository.getRoomsByChurchId(churchId);
      return ResponseHandler.success(res, { rooms });
    } catch (error) {
      return ResponseHandler.error(res, 'Failed to fetch rooms');
    }
  }

  async getMessages(req, res) {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    try {
      const messages = await ChatRepository.getMessagesByRoomId(roomId, limit, offset);
      return ResponseHandler.success(res, { messages: messages.reverse() });
    } catch (error) {
      return ResponseHandler.error(res, 'Failed to fetch messages');
    }
  }

  async sendMessage(req, res) {
    const { roomId, content, type = 'text', metadata = {} } = req.body;
    const senderId = req.user.id;

    try {
      const message = await ChatRepository.createMessage({
        room_id: roomId,
        sender_id: senderId,
        content: content,
        message_type: type,
        metadata: metadata
      });

      // Broadcast via MessagingService
      MessagingService.sendChatMessage(roomId, message, {
        first_name: req.user.first_name,
        last_name: req.user.last_name
      });

      return ResponseHandler.success(res, { message }, 'Message sent successfully');
    } catch (error) {
      return ResponseHandler.error(res, 'Failed to send message');
    }
  }
}

module.exports = new ChatController();
