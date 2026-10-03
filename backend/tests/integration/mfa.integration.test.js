/**
 * Integration test for the MFA setup flow.
 *
 * Exercises the real endpoints a browser hits from MFASetup.jsx:
 *   POST /api/auth/mfa/enable        -> PNG QR data URL + base32 secret
 *   POST /api/auth/mfa/verify-setup  -> confirms a real TOTP, flips mfa_enabled
 *   POST /api/auth/mfa/disable       -> clears the secret
 *
 * Regression guard: this flow was fully dead (every endpoint 500'd on missing
 * repository methods) until commit a039970 — a smoke test is the only thing
 * that would have caught it.
 */

const request = require('supertest');
const speakeasy = require('speakeasy');
const { app } = require('../../server');
const { pool } = require('../../config/database');

describe('MFA setup flow (integration)', () => {
  let token;
  let userId;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@msabato.test', password: 'TestPassword123!' });
    token = login.body.data.accessToken;

    const profile = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);
    userId = profile.body.data.id;

    // Start clean — a leftover enabled state from a previous run breaks the flow
    await pool.query('UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1', [userId]);
  });

  afterAll(async () => {
    await pool.query('UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1', [userId]);
  });

  test('mfa/enable returns a renderable QR data URL + base32 secret', async () => {
    const res = await request(app)
      .post('/api/auth/mfa/enable')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // <img src> needs a data URL, not a raw otpauth:// string
    expect(res.body.data.qrCode).toMatch(/^data:image\/png;base64,/);
    expect(res.body.data.secret).toMatch(/^[A-Z2-7]+$/);
  });

  test('mfa/enable requires auth', async () => {
    const res = await request(app).post('/api/auth/mfa/enable');
    expect(res.status).toBe(401);
  });

  test('verify-setup accepts a real TOTP and enables MFA', async () => {
    const en = await request(app)
      .post('/api/auth/mfa/enable')
      .set('Authorization', `Bearer ${token}`);
    const { secret } = en.body.data;

    const bad = await request(app)
      .post('/api/auth/mfa/verify-setup')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: '000000' });
    expect(bad.status).toBe(400);

    const code = speakeasy.totp({ secret, encoding: 'base32' });
    const res = await request(app)
      .post('/api/auth/mfa/verify-setup')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: code });

    expect(res.status).toBe(200);
    const { rows } = await pool.query('SELECT mfa_enabled FROM users WHERE id = $1', [userId]);
    expect(rows[0].mfa_enabled).toBe(true);
  });

  test('mfa/disable clears the secret', async () => {
    const res = await request(app)
      .post('/api/auth/mfa/disable')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { rows } = await pool.query('SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1', [userId]);
    expect(rows[0].mfa_enabled).toBe(false);
    expect(rows[0].mfa_secret).toBeNull();
  });
});
