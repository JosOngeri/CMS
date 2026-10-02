/**
 * @audit Chat controller — in-app messaging and room management.
 * @known getMessages/sendMessage verify the room belongs to the caller's church
 *        via ChatRepository.getRoomById before any read/write (404 otherwise).
 * @deps   ChatRepository, MessagingService (church-namespaced WS broadcast),
 *         migrations/053_chat_tables.sql
 */
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

  async createRoom(req, res) {
    const churchId = req.user.church_id;
    const { name, description, room_type } = req.body;
    if (!name || !name.trim()) {
      return ResponseHandler.error(res, 'Room name is required', 400);
    }
    try {
      const room = await ChatRepository.createRoom(
        { name: name.trim(), description, room_type, created_by: req.user.id },
        churchId
      );
      return ResponseHandler.success(res, { room }, 'Room created', 201);
    } catch (error) {
      return ResponseHandler.error(res, 'Failed to create room');
    }
  }

  async getMessages(req, res) {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const churchId = req.user.church_id;
    try {
      // Room must belong to the caller's church — bare roomId was cross-tenant
      const room = await ChatRepository.getRoomById(roomId, churchId);
      if (!room) {
        return ResponseHandler.notFound(res, 'Room not found');
      }
      const messages = await ChatRepository.getMessagesByRoomId(roomId, limit, offset);
      return ResponseHandler.success(res, { messages: messages.reverse() });
    } catch (error) {
      return ResponseHandler.error(res, 'Failed to fetch messages');
    }
  }

  async sendMessage(req, res) {
    const { roomId, content, type = 'text', metadata = {} } = req.body;
    const senderId = req.user.id;
    const churchId = req.user.church_id;

    try {
      const room = await ChatRepository.getRoomById(roomId, churchId);
      if (!room) {
        return ResponseHandler.notFound(res, 'Room not found');
      }
      const message = await ChatRepository.createMessage({
        room_id: roomId,
        sender_id: senderId,
        content: content,
        message_type: type,
        metadata: metadata
      });

      // Broadcast via MessagingService (church-namespaced to match join_room)
      MessagingService.sendChatMessage(roomId, message, {
        first_name: req.user.first_name,
        last_name: req.user.last_name
      }, req.user.church_id);

      return ResponseHandler.success(res, { message }, 'Message sent successfully');
    } catch (error) {
      return ResponseHandler.error(res, 'Failed to send message');
    }
  }
}

module.exports = new ChatController();
