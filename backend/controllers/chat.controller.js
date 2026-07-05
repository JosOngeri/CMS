const BaseController = require('./BaseController');
const ChatRepository = require('../repositories/ChatRepository');

/**
 * Chat Controller (Phase 10)
 * Handles in-app messaging and room management
 */
class ChatController extends BaseController {

  async getRooms(req, res) {
    const churchId = req.user.church_id;
    try {
      const rooms = await ChatRepository.getRoomsByChurchId(churchId);
      res.json({ success: true, rooms: rooms });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMessages(req, res) {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    try {
      const messages = await ChatRepository.getMessagesByRoomId(roomId, limit, offset);
      res.json({ success: true, messages: messages.reverse() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
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

      // Broadcast via Socket.io if available
      if (global.io) {
        global.io.to(`room:${roomId}`).emit('new_message', {
          ...message,
          first_name: req.user.first_name,
          last_name: req.user.last_name
        });
      }

      res.json({ success: true, message });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ChatController();
