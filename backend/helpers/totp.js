/**
 * Minimal TOTP (RFC 6238) — no external deps, uses crypto HMAC-SHA1.
 * Used for platform-user MFA (3.4): a 30s-window 6-digit code, verified
 * with ±1 window of clock skew tolerance.
 * @exports { generateSecret, verify, otpauthUri }
 */
const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// RFC 4648 base32 (no padding) — the alphabet authenticator apps expect.
const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
};

const base32Decode = (str) => {
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of str.toUpperCase().replace(/=+$/, '')) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue; // skip whitespace/invalid chars
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

/** Random 160-bit secret, base32-encoded for authenticator apps. */
const generateSecret = () => base32Encode(crypto.randomBytes(20));

// HOTP: HMAC-SHA1(secret, counter) -> 6 digits via dynamic truncation.
const hotp = (secretB32, counter) => {
  const key = base32Decode(secretB32);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
};

/**
 * Verify a 6-digit user code against a base32 secret. Accepts ±1 window
 * (60s) of clock drift — the standard tolerance authenticator apps get.
 */
const verify = (secretB32, code, window = 1) => {
  if (!secretB32 || typeof code !== 'string') return false;
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const counter = Math.floor(Date.now() / 30000);
  for (let i = -window; i <= window; i++) {
    const candidate = hotp(secretB32, counter + i);
    // Constant-time compare — TOTP codes are guessable so timing leaks matter less,
    // but it's cheap insurance against sloppy comparisons elsewhere.
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(normalized))) return true;
  }
  return false;
};

/** otpauth:// URI authenticator apps (Google/Authy/1Password) scan. */
const otpauthUri = ({ secret, email, issuer = 'KMain CMS Platform' }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}` +
  `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;

module.exports = { generateSecret, verify, otpauthUri };
