/**
 * Environment Variable Validation
 * Validates required environment variables are present before app starts.
 * Fails fast — a booted server with missing secrets only surfaces as
 * per-request 500s, which is worse than refusing to start.
 */

// Secrets must never equal these placeholder/example values.
const PLACEHOLDER_PATTERNS = [
  /change[_ -]?this/i,
  /your[_ -]?.*(key|secret|token)/i,
  /change[_ -]?in[_ -]?production/i,
  /example/i,
  /^x+$/i,
];

const MIN_SECRET_LENGTH = 32;

function isWeakSecret(value) {
  if (!value) return true;
  if (value.length < MIN_SECRET_LENGTH) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';

  // The app cannot function at all without these.
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'SESSION_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Copy backend/.env.example to backend/.env and fill in real values.`
    );
  }

  // Placeholder/weak secrets are fatal in production, warnings elsewhere —
  // a dev box with a short local secret is acceptable, prod is not.
  const weak = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'SESSION_SECRET']
    .filter((key) => isWeakSecret(process.env[key]));

  if (weak.length > 0) {
    const msg =
      `Weak or placeholder secrets: ${weak.join(', ')} — each must be a ` +
      `random string of at least ${MIN_SECRET_LENGTH} characters`;
    if (isProd) {
      throw new Error(msg);
    }
    console.warn(`WARNING: ${msg}`);
  }

  console.log('Environment variables validated successfully');
}

module.exports = { validateEnv };
