/**
 * @audit Repository over chat_rooms / chat_messages.
 * @known getRoomById is the tenant gate — controllers MUST verify the room's
 *        church_id before reading messages or writing to a room.
 * @deps   migrations/053_chat_tables.sql
 */
const BaseRepository = require('./BaseRepository');

class ChatRepository extends BaseRepository {
  constructor() {
    super('chat_rooms');
  }

  async getRoomsByChurchId(churchId) {
    const query = 'SELECT * FROM chat_rooms WHERE church_id = $1 ORDER BY created_at DESC';
    const result = await this.pool.query(query, [churchId]);
    return result.rows;
  }

  async createRoom(data, churchId) {
    const { name, description = null, room_type = 'group', created_by } = data;
    const result = await this.pool.query(
      `INSERT INTO chat_rooms (church_id, name, description, room_type, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [churchId, name, description, room_type, created_by]
    );
    return result.rows[0];
  }

  // Tenant gate: room must belong to the caller's church (returns undefined otherwise)
  async getRoomById(roomId, churchId) {
    const result = await this.pool.query(
      'SELECT * FROM chat_rooms WHERE id = $1 AND church_id = $2',
      [roomId, churchId]
    );
    return result.rows[0];
  }

  async getMessagesByRoomId(roomId, limit = 50, offset = 0) {
    const query = `
      SELECT m.*, u.first_name, u.last_name
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.pool.query(query, [roomId, limit, offset]);
    return result.rows;
  }

  async createMessage(messageData) {
    const { room_id, sender_id, content, message_type, metadata } = messageData;
    const query = `
      INSERT INTO chat_messages (room_id, sender_id, content, message_type, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      room_id,
      sender_id,
      content,
      message_type,
      JSON.stringify(metadata)
    ]);
    return result.rows[0];
  }
}

module.exports = new ChatRepository();
