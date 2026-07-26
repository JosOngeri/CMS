const getPlatformJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET must be configured for platform authentication');
  }

  return secret;
};

module.exports = { getPlatformJwtSecret };
