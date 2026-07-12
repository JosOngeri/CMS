/**
 * Cursor Pagination Utility (Phase 11)
 * Provides cursor-based pagination for infinite scroll
 * More efficient than offset-based pagination for large datasets
 */

class CursorPagination {
  /**
   * Parse cursor string to extract offset and timestamp
   * @param {string} cursor - Encoded cursor string
   * @returns {object} Parsed cursor data
   */
  static parseCursor(cursor) {
    if (!cursor) return { offset: 0, timestamp: null };
    
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const [offset, timestamp] = decoded.split(':');
      return {
        offset: parseInt(offset) || 0,
        timestamp: timestamp || null
      };
    } catch (error) {
      console.error('Failed to parse cursor:', error);
      return { offset: 0, timestamp: null };
    }
  }

  /**
   * Create cursor from offset and timestamp
   * @param {number} offset - Current offset
   * @param {string} timestamp - Last record timestamp
   * @returns {string} Encoded cursor string
   */
  static createCursor(offset, timestamp) {
    const cursorString = `${offset}:${timestamp || ''}`;
    return Buffer.from(cursorString).toString('base64');
  }

  /**
   * Build pagination query with cursor
   * @param {object} options - Pagination options
   * @returns {object} Query builder with cursor logic
   */
  static buildQuery(options = {}) {
    const {
      cursor = null,
      limit = 20,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      timestampColumn = 'created_at'
    } = options;

    const { offset, timestamp } = this.parseCursor(cursor);
    
    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    // Add cursor-based filtering
    if (timestamp && orderDirection === 'DESC') {
      whereClause = `WHERE ${timestampColumn} < $${paramIndex}`;
      params.push(timestamp);
      paramIndex++;
    } else if (timestamp && orderDirection === 'ASC') {
      whereClause = `WHERE ${timestampColumn} > $${paramIndex}`;
      params.push(timestamp);
      paramIndex++;
    }

    // Add limit
    const limitClause = `LIMIT $${paramIndex}`;
    params.push(limit + 1); // Fetch one extra to determine if there are more results
    paramIndex++;

    return {
      whereClause,
      limitClause,
      params,
      offset,
      timestamp
    };
  }

  /**
   * Process paginated results and add pagination metadata
   * @param {Array} results - Query results
   * @param {number} limit - Requested limit
   * @param {number} offset - Current offset
   * @returns {object} Processed results with pagination metadata
   */
  static processResults(results, limit, offset) {
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;
    
    let nextCursor = null;
    if (hasMore && data.length > 0) {
      const lastRecord = data[data.length - 1];
      const timestamp = lastRecord.created_at || lastRecord.updated_at;
      nextCursor = this.createCursor(offset + data.length, timestamp);
    }

    return {
      data,
      pagination: {
        nextCursor,
        hasMore,
        count: data.length,
        offset: offset + data.length
      }
    };
  }

  /**
   * Build SQL query with cursor pagination
   * @param {string} tableName - Table name
   * @param {object} options - Pagination options
   * @returns {object} SQL query and parameters
   */
  static buildSQLQuery(tableName, options = {}) {
    const {
      cursor = null,
      limit = 20,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      timestampColumn = 'created_at',
      additionalWhere = '',
      additionalParams = []
    } = options;

    const { whereClause, limitClause, params } = this.buildQuery({
      cursor,
      limit,
      orderBy,
      orderDirection,
      timestampColumn
    });

    // Combine where clauses
    let finalWhere = whereClause;
    if (additionalWhere) {
      finalWhere = finalWhere 
        ? `${whereClause} AND (${additionalWhere})`
        : `WHERE ${additionalWhere}`;
    }

    const query = `
      SELECT * FROM ${tableName}
      ${finalWhere}
      ORDER BY ${orderBy} ${orderDirection}
      ${limitClause}
    `;

    return {
      query,
      params: [...params, ...additionalParams]
    };
  }

  /**
   * Get page info for GraphQL-style pagination
   * @param {boolean} hasNextPage - Whether there is a next page
   * @param {boolean} hasPreviousPage - Whether there is a previous page
   * @param {string} startCursor - Cursor for first item
   * @param {string} endCursor - Cursor for last item
   * @returns {object} Page info object
   */
  static getPageInfo(hasNextPage, hasPreviousPage, startCursor, endCursor) {
    return {
      hasNextPage,
      hasPreviousPage,
      startCursor,
      endCursor
    };
  }

  /**
   * Create edges array for GraphQL-style pagination
   * @param {Array} data - Data array
   * @param {number} offset - Starting offset
   * @returns {Array} Edges array with cursor and node
   */
  static createEdges(data, offset = 0) {
    return data.map((item, index) => ({
      cursor: this.createCursor(offset + index, item.created_at || item.updated_at),
      node: item
    }));
  }

  /**
   * Validate cursor format
   * @param {string} cursor - Cursor to validate
   * @returns {boolean} True if cursor is valid
   */
  static isValidCursor(cursor) {
    if (!cursor || typeof cursor !== 'string') return false;
    
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      return parts.length === 2 && !isNaN(parseInt(parts[0]));
    } catch {
      return false;
    }
  }
}

module.exports = CursorPagination;