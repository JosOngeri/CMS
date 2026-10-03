const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const hibp = require('hibp');
const { createLogger } = require('./controllerLogger');

const logger = createLogger('security');

// Use environment variable for bcrypt rounds, standardized to 12 across all environments
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Hash password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Church tokens carry iss/aud/type claims so they can never be confused with
// platform tokens (which use their own issuer/audience — see config/platformJwt).
const TOKEN_ISSUER = 'msabato';
const TOKEN_AUDIENCE = 'church';

// Generate access token (short-lived: 1h for security)
const generateAccessToken = (userId, roles, mfaVerified = false, scope = null) => {
  const payload = { userId, roles, mfaVerified, type: 'access' };
  if (scope) {
    payload.scope = Array.isArray(scope) ? scope : [scope];
  }
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h', issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE }
  );
};

// Generate refresh token — carries mfaVerified so the MFA state survives the
// access-token rotation without trusting client input.
const generateRefreshToken = (userId, { mfaVerified = false } = {}) => {
  return jwt.sign(
    { userId, type: 'refresh', mfaVerified },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d', issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE }
  );
};

// Verify access token — iss/aud enforced: claim-less legacy tokens and
// foreign-audience tokens are rejected (forces re-login once after deploy).
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, { issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE });
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, { issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE });
};

// Generate random token for password reset
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Password strength validation
const validatePasswordStrength = (password) => {
  const errors = [];
  
  // Minimum length for public registration
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Prevent common patterns
  const commonPatterns = [
    'password', '123456', 'qwerty', 'admin', 'letmein',
    'welcome', 'monkey', 'dragon', 'master', 'hello'
  ];
  
  if (commonPatterns.some(pattern => 
    password.toLowerCase().includes(pattern)
  )) {
    errors.push('Password contains common patterns');
  }
  
  // Prevent sequential characters
  if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    errors.push('Password contains sequential characters');
  }
  
  // Prevent repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password contains repeated characters');
  }
  
  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors.join('. ') : 'Password is valid',
    errors,
    strength: calculatePasswordStrength(password)
  };
};

const calculatePasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 12) strength += 1;
  if (password.length >= 16) strength += 1;
  if (password.length >= 20) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
  if (password.length >= 24) strength += 1;
  
  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  if (strength <= 6) return 'strong';
  return 'very strong';
};

// Generate MFA secret
const generateMFASecret = (email) => {
  return speakeasy.generateSecret({
    name: `Msabato CMS (${email})`,
    issuer: 'Msabato CMS',
  });
};

// Verify MFA token
const verifyMFAToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2,
  });
};

// Generate QR code for MFA (returns OTPAuth URL)
const generateMFAQRCode = (secret) => {
  return secret.otpauth_url;
};

// Check if password has been breached — pwnedPasswordRange returns the
// numeric breach count directly (single HIBP call, no double request).
const checkPasswordBreach = async (password) => {
  try {
    const count = await hibp.pwnedPasswordRange(password);
    return { isBreached: count > 0, count };
  } catch (error) {
    logger.error('checkPasswordBreach', 'Password breach check error:', error);
    return { isBreached: false, count: 0 };
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateRandomToken,
  validatePasswordStrength,
  calculatePasswordStrength,
  generateMFASecret,
  verifyMFAToken,
  generateMFAQRCode,
  checkPasswordBreach,
};
