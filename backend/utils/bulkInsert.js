const { pool } = require('../config/database');

/**
 * Bulk Insert Utility (Phase 2)
 * Optimized for O(1) ingestion of roles, tags, and categories
 */
const bulkInsert = async (tableName, columns, dataArray) => {
  if (!dataArray || dataArray.length === 0) return [];

  const client = await pool.connect();
  try {
    const columnNames = columns.join(', ');
    const placeholders = dataArray.map((_, rowIndex) =>
      `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
    ).join(', ');

    const flattenedValues = dataArray.flat();
    const query = `INSERT INTO ${tableName} (${columnNames}) VALUES ${placeholders} RETURNING *`;

    const result = await client.query(query, flattenedValues);
    return result.rows;
  } catch (error) {
    console.error(`Bulk insert failed for ${tableName}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = bulkInsert;
