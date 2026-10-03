/**
 * Secret + claim constants for platform-admin JWTs.
 * @exports {getPlatformJwtSecret, PLATFORM_JWT_ISSUER, PLATFORM_JWT_AUDIENCE, PLATFORM_JWT_SIGN_OPTIONS, PLATFORM_JWT_VERIFY_OPTIONS}
 * @known PLATFORM_JWT_SECRET should be set in production — the JWT_SECRET fallback
 *        exists only for backward compatibility; iss/aud/type claim enforcement
 *        (platformAuth middleware) still rejects church tokens either way.
 */
const PLATFORM_JWT_ISSUER = 'msabato-platform';
const PLATFORM_JWT_AUDIENCE = 'platform';
const PLATFORM_JWT_EXPIRES_IN = '8h';

const getPlatformJwtSecret = () => {
  // Prefer a dedicated platform secret so church and platform tokens are
  // cryptographically separated. Fall back to JWT_SECRET for older
  // deployments — claim checks below still block cross-token reuse.
  const secret = process.env.PLATFORM_JWT_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('PLATFORM_JWT_SECRET or JWT_SECRET must be configured for platform authentication');
  }

  if (!process.env.PLATFORM_JWT_SECRET && process.env.NODE_ENV === 'production') {
    // Shared-secret deployments lose defense-in-depth: a church token can only
    // be rejected by claims, not by signature. Log once at first use.
    console.warn('[platformJwt] PLATFORM_JWT_SECRET not set — sharing JWT_SECRET (set a dedicated secret in production)');
  }

  return secret;
};

const PLATFORM_JWT_SIGN_OPTIONS = {
  expiresIn: PLATFORM_JWT_EXPIRES_IN,
  issuer: PLATFORM_JWT_ISSUER,
  audience: PLATFORM_JWT_AUDIENCE
};

const PLATFORM_JWT_VERIFY_OPTIONS = {
  issuer: PLATFORM_JWT_ISSUER,
  audience: PLATFORM_JWT_AUDIENCE
};

module.exports = {
  getPlatformJwtSecret,
  PLATFORM_JWT_ISSUER,
  PLATFORM_JWT_AUDIENCE,
  PLATFORM_JWT_SIGN_OPTIONS,
  PLATFORM_JWT_VERIFY_OPTIONS
};
