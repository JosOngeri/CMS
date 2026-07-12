const logger = require('../config/logging');

/**
 * Secure Query Builder Service
 * Provides safe SQL query construction with input validation and sanitization
 * Prevents SQL injection by validating table/column names and using parameterized queries
 */
class QueryBuilderService {
  constructor() {
    // Whitelist of allowed table names
    this.allowedTables = new Set([
      'users',
      'members',
      'payments',
      'transactions',
      'events',
      'announcements',
      'departments',
      'department_members',
      'roles',
      'user_roles',
      'approvals',
      'approval_requests',
      'documents',
      'gallery',
      'gallery_albums',
      'comments',
      'notifications',
      'settings',
      'reports',
      'custom_reports',
      'custom_report_columns',
      'custom_report_filters'
    ]);

    // Whitelist of allowed SQL functions for aggregations
    this.allowedAggregations = new Set([
      'COUNT',
      'SUM',
      'AVG',
      'MIN',
      'MAX',
      'ARRAY_AGG'
    ]);

    // Whitelist of allowed SQL operators
    this.allowedOperators = new Set([
      '=',
      '!=',
      '<>',
      '<',
      '>',
      '<=',
      '>=',
      'LIKE',
      'ILIKE',
      'IN',
      'NOT IN',
      'IS NULL',
      'IS NOT NULL'
    ]);

    // Whitelist of allowed sort directions
    this.allowedSortDirections = new Set(['ASC', 'DESC']);
  }

  /**
   * Validate table name against whitelist
   * @param {string} tableName - Table name to validate
   * @returns {boolean} True if valid
   * @throws {Error} If table name is invalid
   */
  validateTable(tableName) {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Invalid table name');
    }

    const sanitized = tableName.trim().toLowerCase();
    
    if (!this.allowedTables.has(sanitized)) {
      throw new Error(`Table '${tableName}' is not allowed`);
    }

    return sanitized;
  }

  /**
   * Validate column name to prevent SQL injection
   * @param {string} columnName - Column name to validate
   * @returns {string} Sanitized column name
   * @throws {Error} If column name is invalid
   */
  validateColumn(columnName) {
    if (!columnName || typeof columnName !== 'string') {
      throw new Error('Invalid column name');
    }

    // Only allow alphanumeric characters, underscores, and periods
    const sanitized = columnName.trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(sanitized)) {
      throw new Error(`Invalid column name format: ${columnName}`);
    }

    return sanitized;
  }

  /**
   * Validate aggregation function
   * @param {string} aggregation - Aggregation function name
   * @returns {string} Validated aggregation function
   * @throws {Error} If aggregation is invalid
   */
  validateAggregation(aggregation) {
    if (!aggregation) return null;
    
    const upperAgg = aggregation.trim().toUpperCase();
    if (!this.allowedAggregations.has(upperAgg)) {
      throw new Error(`Aggregation '${aggregation}' is not allowed`);
    }

    return upperAgg;
  }

  /**
   * Validate SQL operator
   * @param {string} operator - SQL operator
   * @returns {string} Validated operator
   * @throws {Error} If operator is invalid
   */
  validateOperator(operator) {
    if (!operator) return '=';
    
    const upperOp = operator.trim().toUpperCase();
    if (!this.allowedOperators.has(upperOp)) {
      throw new Error(`Operator '${operator}' is not allowed`);
    }

    return upperOp;
  }

  /**
   * Validate sort direction
   * @param {string} direction - Sort direction (ASC/DESC)
   * @returns {string} Validated direction
   */
  validateSortDirection(direction) {
    if (!direction) return 'ASC';
    
    const upperDir = direction.trim().toUpperCase();
    if (!this.allowedSortDirections.has(upperDir)) {
      throw new Error(`Sort direction '${direction}' is not allowed`);
    }

    return upperDir;
  }

  /**
   * Build a secure SELECT query from report definition
   * @param {Object} reportDefinition - Report definition object
   * @param {string} reportDefinition.data_source - Table name
   * @param {Array} reportDefinition.columns - Column definitions
   * @param {Array} reportDefinition.filters - Filter definitions
   * @param {string} reportDefinition.group_by - GROUP BY clause
   * @param {string} reportDefinition.order_by - ORDER BY clause
   * @param {Object} parameters - Runtime parameters for filters
   * @returns {Object} { query: string, params: Array }
   * @throws {Error} If validation fails
   */
  buildSelectQuery(reportDefinition, parameters = {}) {
    const {
      data_source,
      columns = [],
      filters = [],
      group_by,
      order_by
    } = reportDefinition;

    // Validate table name
    const table = this.validateTable(data_source);

    // Build SELECT clause
    let selectClause = '*';
    if (columns && columns.length > 0) {
      const validatedColumns = columns.map(col => {
        const columnName = this.validateColumn(col.column_name);
        
        if (col.aggregation) {
          const agg = this.validateAggregation(col.aggregation);
          const alias = col.column_alias ? ` AS ${this.validateColumn(col.column_alias)}` : '';
          return `${agg}(${columnName})${alias}`;
        }
        
        const alias = col.column_alias ? ` AS ${this.validateColumn(col.column_alias)}` : '';
        return `${columnName}${alias}`;
      });
      
      selectClause = validatedColumns.join(', ');
    }

    // Build base query
    let query = `SELECT ${selectClause} FROM ${table}`;
    let params = [];
    let paramCount = 0;

    // Build WHERE clause with parameterized queries
    if (filters && filters.length > 0) {
      const whereConditions = [];

      for (const filter of filters) {
        const columnName = this.validateColumn(filter.filter_column);
        const operator = this.validateOperator(filter.operator);
        
        // Handle different operator types
        if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
          whereConditions.push(`${columnName} ${operator}`);
        } else if (operator === 'IN' || operator === 'NOT IN') {
          paramCount++;
          const value = parameters[filter.filter_column] || filter.filter_value;
          if (Array.isArray(value)) {
            params.push(value);
            whereConditions.push(`${columnName} ${operator} ($${paramCount})`);
          } else {
            // Handle single value for IN operator
            params.push([value]);
            whereConditions.push(`${columnName} ${operator} ($${paramCount})`);
          }
        } else {
          paramCount++;
          const value = parameters[filter.filter_column] !== undefined 
            ? parameters[filter.filter_column] 
            : filter.filter_value;
          params.push(value);
          whereConditions.push(`${columnName} ${operator} $${paramCount}`);
        }
      }

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
    }

    // Build GROUP BY clause
    if (group_by) {
      const groupByColumns = group_by.split(',').map(col => this.validateColumn(col.trim()));
      query += ` GROUP BY ${groupByColumns.join(', ')}`;
    }

    // Build ORDER BY clause
    if (order_by) {
      const orderParts = order_by.split(',').map(part => {
        const trimmed = part.trim();
        const [column, direction] = trimmed.split(/\s+/);
        const validatedColumn = this.validateColumn(column);
        const validatedDirection = this.validateSortDirection(direction);
        return `${validatedColumn} ${validatedDirection}`;
      });
      query += ` ORDER BY ${orderParts.join(', ')}`;
    }

    logger.debug({ query, params: params.length }, 'Built secure query');

    return { query, params };
  }

  /**
   * Add a table to the allowed tables whitelist
   * @param {string} tableName - Table name to add
   */
  allowTable(tableName) {
    this.allowedTables.add(tableName.toLowerCase());
  }

  /**
   * Remove a table from the allowed tables whitelist
   * @param {string} tableName - Table name to remove
   */
  disallowTable(tableName) {
    this.allowedTables.delete(tableName.toLowerCase());
  }
}

module.exports = new QueryBuilderService();