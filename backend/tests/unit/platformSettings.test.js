/**
 * Unit tests for the platform church-settings catalog:
 * manifest validation, secret masking, managed-key rejection.
 */
jest.mock('../../config/database', () => ({
  pool: { query: jest.fn() },
}));
jest.mock('../../repositories/SettingsRepository', () => ({
  getAll: jest.fn(),
  upsert: jest.fn(),
  deleteByKey: jest.fn(),
}));
jest.mock('../../services/platformAudit.service', () => ({
  auditPlatformAction: jest.fn().mockResolvedValue(undefined),
}));

const { pool } = require('../../config/database');
const settingsRepo = require('../../repositories/SettingsRepository');
const { KEYS, SECRET_KEYS, GLOBAL_ONLY_KEYS, validateValue } = require('../../constants/settingKeys');
const ctrl = require('../../controllers/platformTenancy.controller');

const CHURCH_ID = '11111111-2222-3333-4444-555555555555';
const req = (over = {}) => ({
  params: { id: CHURCH_ID }, body: {}, user: {}, platformUser: { id: 'p1' },
  ip: '127.0.0.1', ...over,
});
const res = () => {
  const r = { out: null };
  r.status = (c) => { r.out = { c }; return { json: (b) => { r.out = { c, b }; return r; } }; };
  r.json = (b) => { r.out = { c: 200, b }; return r; };
  return r;
};

describe('settingKeys manifest', () => {
  test('covers real DB keys and flags secrets/managed', () => {
    expect(KEYS.length).toBeGreaterThan(50);
    expect(SECRET_KEYS.has('mpesa_passkey')).toBe(true);
    expect(SECRET_KEYS.has('sms_api_key')).toBe(true);
    expect(GLOBAL_ONLY_KEYS.has('maintenance_mode')).toBe(true);
    expect(GLOBAL_ONLY_KEYS.has('site_name')).toBe(false);
  });

  test('validateValue enforces type + rules', () => {
    expect(validateValue('dark_mode', 'true')).toBeNull();
    expect(validateValue('dark_mode', 'yes')).toMatch(/boolean/);
    expect(validateValue('primary_color', 'blue')).toMatch(/hex/);
    expect(validateValue('church_email', 'nope')).toMatch(/pattern/);
    expect(validateValue('mpesa_environment', 'prod')).toMatch(/one of/);
    expect(validateValue('session_timeout', '3')).toMatch(/>= 5/);
    expect(validateValue('totally_made_up', 'x')).toMatch(/Unknown/);
  });
});

describe('platform tenancy settings catalog', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GET resolves overrides and masks secrets', async () => {
    settingsRepo.getAll.mockResolvedValue({
      general: [
        { key: 'site_name', category: 'general', value: 'Global Name', value_type: 'string', is_editable: true, church_id: null },
        { key: 'maintenance_mode', category: 'general', value: 'false', value_type: 'boolean', is_editable: false, church_id: null },
      ],
      contact: [
        { key: 'church_email', category: 'contact', value: 'church@x.org', value_type: 'string', is_editable: true, church_id: CHURCH_ID },
      ],
      sms: [
        { key: 'sms_api_key', category: 'sms', value: 'SUPERSECRET', value_type: 'string', is_editable: false, church_id: null },
      ],
    });
    const r = res();
    await ctrl.getTenantSettingsCatalog(req(), r);
    const { data } = r.out.b;
    const email = data.contact.find((s) => s.key === 'church_email');
    expect(email.source).toBe('override');
    const name = data.general.find((s) => s.key === 'site_name');
    expect(name.source).toBe('global');
    const secret = data.sms.find((s) => s.key === 'sms_api_key');
    expect(secret.value).toBe('***');
    expect(secret.managed).toBe(true);
  });

  test('PUT rejects platform-managed keys and invalid values', async () => {
    let r = res();
    await ctrl.updateTenantSettingsCatalog(
      req({ body: { settings: { sms_api_key: 'x' } } }), r);
    expect(r.out.c).toBe(400);
    expect(r.out.b.error).toMatch(/platform-managed/);

    r = res();
    await ctrl.updateTenantSettingsCatalog(
      req({ body: { settings: { dark_mode: 'maybe' } } }), r);
    expect(r.out.c).toBe(400);
  });

  test('PUT upserts church overrides via repository', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: CHURCH_ID }] });
    const r = res();
    await ctrl.updateTenantSettingsCatalog(
      req({ body: { settings: { site_name: 'New Name', pastor_name: 'P' } } }), r);
    expect(r.out.c).toBe(200);
    expect(settingsRepo.upsert).toHaveBeenCalledWith('site_name', 'New Name', CHURCH_ID);
    expect(settingsRepo.upsert).toHaveBeenCalledWith('pastor_name', 'P', CHURCH_ID);
  });

  test('DELETE drops the override row', async () => {
    settingsRepo.deleteByKey.mockResolvedValue(1);
    const r = res();
    await ctrl.deleteTenantSetting(req({ params: { id: CHURCH_ID, key: 'site_name' } }), r);
    expect(r.out.c).toBe(200);
    expect(settingsRepo.deleteByKey).toHaveBeenCalledWith('site_name', CHURCH_ID);
  });

  test('global catalog update skips masked secret placeholders', async () => {
    const r = res();
    await ctrl.updateSettingsCatalog(
      req({ body: { settings: { sms_api_key: '***', sms_sender_id: 'MSABATO' } } }), r);
    expect(r.out.c).toBe(200);
    expect(settingsRepo.upsert).not.toHaveBeenCalledWith('sms_api_key', expect.anything(), null);
    expect(settingsRepo.upsert).toHaveBeenCalledWith('sms_sender_id', 'MSABATO', null);
  });
});
