/**
 * Pagination Middleware
 * Provides consistent pagination handling across all controllers
 */

const paginate = (defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    const page = Math.max(1, Math.min(parseInt(req.query.page) || 1, 10000));
    const limit = parseInt(req.query.limit) || defaultLimit;
    
    // Validate and clamp limit
    const validLimit = Math.min(Math.max(limit, 1), maxLimit);
    const offset = (page - 1) * validLimit;
    
    req.pagination = {
      page,
      limit: validLimit,
      offset,
      maxLimit
    };
    
    next();
  };
};

/**
 * Clamp limit/offset/page query params in place.
 * Many list endpoints destructure req.query directly instead of
 * using req.pagination — this bounds LIMIT values (e.g. ?limit=99999999)
 * without changing each handler's contract.
 */
const clampQueryPagination = (maxLimit = 100) => {
  return (req, res, next) => {
    if (req.query.limit !== undefined) {
      const parsed = parseInt(req.query.limit);
      req.query.limit = Math.min(Math.max(Number.isNaN(parsed) ? 1 : parsed, 1), maxLimit);
    }
    if (req.query.offset !== undefined) {
      const parsed = parseInt(req.query.offset);
      req.query.offset = Math.max(Number.isNaN(parsed) ? 0 : parsed, 0);
    }
    if (req.query.page !== undefined) {
      const parsed = parseInt(req.query.page);
      req.query.page = Math.max(Number.isNaN(parsed) ? 1 : parsed, 1);
    }
    next();
  };
};

/**
 * Helper to build pagination response
 */
const buildPaginationResponse = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

module.exports = {
  paginate,
  clampQueryPagination,
  buildPaginationResponse
};
