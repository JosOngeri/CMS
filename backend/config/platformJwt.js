/**
 * Secret provider for platform-admin JWTs.
 * @exports {getPlatformJwtSecret}
 * @known Returns the SAME JWT_SECRET as church tokens — no iss/aud/type separation (ledger Batch-1/2); fix by adding PLATFORM_JWT_SECRET + claim checks.
 */
const getPlatformJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET must be configured for platform authentication');
  }

  return secret;
};

module.exports = { getPlatformJwtSecret };
