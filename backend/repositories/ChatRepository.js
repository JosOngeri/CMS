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
