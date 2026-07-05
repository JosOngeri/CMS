/**
 * Pagination Middleware
 * Provides consistent pagination handling across all controllers
 */

const paginate = (defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
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
  buildPaginationResponse
};
