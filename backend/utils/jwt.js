const jwt = require('jsonwebtoken');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate access token
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    { 
      ...payload,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES_IN }
  );
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(
    { 
      ...payload,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

/**
 * Generate both access and refresh tokens
 * @param {Object} payload - User data to encode in tokens
 * @returns {Object} Object containing both tokens
 */
const generateTokenPair = (payload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: JWT_ACCESS_EXPIRES_IN
  };
};

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} New access token
 * @throws {Error} If refresh token is invalid
 */
const refreshAccessToken = (refreshToken) => {
  try {
    const decoded = verifyToken(refreshToken);
    
    // Verify it's a refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    // Generate new access token (without the type field)
    const { type, ...payload } = decoded;
    return generateAccessToken(payload);
  } catch (error) {
    throw new Error('Failed to refresh token: ' + error.message);
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
const extractToken = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Calculate time until token expires
 * @param {string} token - JWT token
 * @returns {number} Seconds until expiration
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }
    
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp - now;
  } catch (error) {
    return 0;
  }
};

/**
 * Check if token is expired or will expire soon
 * @param {string} token - JWT token
 * @param {number} bufferSeconds - Buffer time in seconds (default: 300 = 5 minutes)
 * @returns {boolean} True if token is expired or will expire soon
 */
const isTokenExpired = (token, bufferSeconds = 300) => {
  const timeUntilExpiration = getTokenExpiration(token);
  return timeUntilExpiration <= bufferSeconds;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  refreshAccessToken,
  extractToken,
  getTokenExpiration,
  isTokenExpired
};
