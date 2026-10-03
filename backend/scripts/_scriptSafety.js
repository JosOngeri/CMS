/**
 * Shared guards for repo scripts (L736/L753/L754/L755/L756).
 *
 * requireDevDatabase()  — call at the top of any script that DROPs, TRUNCATEs,
 *                         or mass-updates. Refuses when NODE_ENV=production or
 *                         DB_HOST is remote, unless ALLOW_DESTRUCTIVE=1.
 * seedPassword(label)   — returns process.env.SEED_PASSWORD or a generated
 *                         random password; never a hardcoded literal.
 */
const crypto = require('crypto');

function requireDevDatabase(scriptName) {
  const isProd = process.env.NODE_ENV === 'production';
  const dbHost = process.env.DB_HOST || process.env.PGHOST || 'localhost';
  const isRemote = !['localhost', '127.0.0.1', '::1'].includes(dbHost);

  if ((isProd || isRemote) && process.env.ALLOW_DESTRUCTIVE !== '1') {
    console.error(
      `[${scriptName}] REFUSED: NODE_ENV=${process.env.NODE_ENV || 'unset'} DB_HOST=${dbHost}.\n` +
      `This script destroys or rewrites data. Set ALLOW_DESTRUCTIVE=1 to override.`
    );
    process.exit(1);
  }
}

function seedPassword(label = 'account') {
  const pw = process.env.SEED_PASSWORD || crypto.randomBytes(12).toString('base64url');
  console.log(`[seed] ${label} password: ${process.env.SEED_PASSWORD ? '(from SEED_PASSWORD env)' : pw}`);
  return pw;
}

module.exports = { requireDevDatabase, seedPassword };
