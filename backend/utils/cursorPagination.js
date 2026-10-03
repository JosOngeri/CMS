/**
 * Cursor Pagination Utility (Phase 11)
 * Provides cursor-based pagination for infinite scroll
 * More efficient than offset-based pagination for large datasets
 */

// SQL identifiers (table/column names) can't be parameterized — validate them
// against a strict identifier pattern and, when the caller supplies allowlists,
// against those too (ledger Batch-6 L314).
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DIRECTIONS = new Set(['ASC', 'DESC']);

function assertIdentifier(value, kind, allowlist = null) {
  if (typeof value !== 'string' || !IDENTIFIER_RE.test(value)) {
    throw new Error(`Invalid ${kind} identifier`);
  }
  if (allowlist && !allowlist.includes(value)) {
    throw new Error(`${kind} '${value}' is not in the allowed list`);
  }
  return value;
}

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
      timestampColumn = 'created_at',
      allowedColumns = null
    } = options;

    // Validate interpolated identifiers and direction before use
    assertIdentifier(timestampColumn, 'timestampColumn', allowedColumns);
    assertIdentifier(orderBy, 'orderBy', allowedColumns);
    const direction = String(orderDirection).toUpperCase();
    if (!DIRECTIONS.has(direction)) {
      throw new Error('Invalid orderDirection — must be ASC or DESC');
    }

    const { offset, timestamp } = this.parseCursor(cursor);

    let whereClause = '';
    const params = [];

    // Add cursor-based filtering (cursor timestamp is always $1 when present)
    if (timestamp && direction === 'DESC') {
      whereClause = `WHERE ${timestampColumn} < $1`;
      params.push(timestamp);
    } else if (timestamp && direction === 'ASC') {
      whereClause = `WHERE ${timestampColumn} > $1`;
      params.push(timestamp);
    }

    // Fetch one extra row to determine if there are more results
    const fetchLimit = limit + 1;

    return {
      whereClause,
      params,          // cursor params only — LIMIT placeholder is appended by the caller
      fetchLimit,
      offset,
      timestamp,
      direction
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
      additionalParams = [],
      allowedTables = null,
      allowedColumns = null
    } = options;

    // Interpolated into the query text — must be validated identifiers
    assertIdentifier(tableName, 'table', allowedTables);

    const { whereClause, params, fetchLimit, direction } = this.buildQuery({
      cursor,
      limit,
      orderBy,
      orderDirection,
      timestampColumn,
      allowedColumns
    });

    // Reindex additionalWhere: the caller writes its placeholders starting at
    // $2 (after the optional cursor param at $1). LIMIT comes last.
    const offsetBase = params.length; // 0 or 1 cursor params
    const reindexedWhere = additionalWhere
      ? additionalWhere.replace(/\$(\d+)/g, (_, n) => `$${offsetBase + Number(n) - 1}`)
      : '';
    const limitIndex = offsetBase + additionalParams.length + 1;

    // Combine where clauses
    let finalWhere = whereClause;
    if (reindexedWhere) {
      finalWhere = finalWhere
        ? `${whereClause} AND (${reindexedWhere})`
        : `WHERE ${reindexedWhere}`;
    }

    const query = `
      SELECT * FROM ${tableName}
      ${finalWhere}
      ORDER BY ${orderBy} ${direction}
      LIMIT $${limitIndex}
    `;

    return {
      query,
      params: [...params, ...additionalParams, fetchLimit]
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