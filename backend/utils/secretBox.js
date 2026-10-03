// L780: reversible at-rest encryption for provider API keys stored in the DB.
// Format: 'enc:v1:<iv_b64>:<tag_b64>:<cipher_b64>'. Rows without the prefix
// are treated as legacy plaintext and returned as-is, so existing data keeps
// working until re-saved through the encrypted write path.
const crypto = require('crypto');

const PREFIX = 'enc:v1:';

const getKey = () => {
  const secret = process.env.SMS_KEYS_SECRET || process.env.JWT_SECRET;
  if (!secret) return null;
  return crypto.createHash('sha256').update(secret).digest();
};

const isEncrypted = (v) => typeof v === 'string' && v.startsWith(PREFIX);

const encrypt = (plaintext) => {
  const key = getKey();
  if (!key || plaintext == null || isEncrypted(plaintext)) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return PREFIX + [iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
};

const decrypt = (stored) => {
  if (!isEncrypted(stored)) return stored;
  const key = getKey();
  if (!key) throw new Error('SMS_KEYS_SECRET/JWT_SECRET required to decrypt provider key');
  const [, , ivB64, tagB64, dataB64] = stored.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
};

module.exports = { encrypt, decrypt, isEncrypted };
