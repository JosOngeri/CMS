/**
 * Register (or rotate) an SMS bulk provider for a church — VPS-side script.
 *
 * The API key is encrypted at rest via secretBox and NEVER logged. A
 * callback_secret is generated so provider delivery/topup webhooks can
 * authenticate by path token.
 *
 * Run on the VPS:
 *   cd /var/www/CMS/backend
 *   SMS_API_KEY='…' CHURCH_SLUG='kiserian-main' \
 *     SMS_PROVIDER_NAME='BlessedTexts' \
 *     SMS_API_URL='https://api.blessedtexts.com/v1' \
 *     SMS_SENDER_ID='ChurchSMS' \
 *     node scripts/register-sms-provider.js
 *
 * Prints the delivery + topup callback URLs to configure in the provider's
 * dashboard. Existing provider rows are updated in place (key rotation).
 */
require('dotenv').config();
const { pool } = require('../config/database');
const providerRepo = require('../repositories/SMSProviderRepository');

(async () => {
  const name = process.env.SMS_PROVIDER_NAME || 'BlessedTexts';
  const apiKey = process.env.SMS_API_KEY;
  const apiUrl = process.env.SMS_API_URL || 'https://api.blessedtexts.com/v1';
  const senderId = process.env.SMS_SENDER_ID || null;
  const churchSlug = process.env.CHURCH_SLUG;
  const baseUrl = (process.env.PUBLIC_BASE_URL || 'https://cms.josongeri.co.ke').replace(/\/$/, '');

  if (!apiKey) {
    console.error('SMS_API_KEY env var is required');
    process.exit(1);
  }

  try {
    // Resolve the church — explicit slug wins, otherwise the only/first church.
    let church;
    if (churchSlug) {
      const r = await pool.query('SELECT id, name FROM churches WHERE slug = $1', [churchSlug]);
      church = r.rows[0];
    } else {
      const r = await pool.query('SELECT id, name FROM churches ORDER BY created_at LIMIT 1');
      church = r.rows[0];
    }
    if (!church) {
      console.error('No church found — pass CHURCH_SLUG that matches churches.slug');
      process.exit(1);
    }

    const existing = await providerRepo.findByName(name);
    let provider;
    if (existing && existing.church_id === church.id) {
      provider = await providerRepo.update(existing.id, {
        api_key: apiKey, api_url: apiUrl, sender_id: senderId, is_active: true,
      }, church.id, null);
      console.log(`Updated provider "${name}" for church "${church.name}"`);
      // Pre-095 rows may lack a callback_secret — mint one now.
      if (!provider.callback_secret) {
        const crypto = require('crypto');
        const newSecret = crypto.randomBytes(24).toString('hex');
        await pool.query(
          'UPDATE sms_providers SET callback_secret = $1 WHERE id = $2',
          [newSecret, provider.id]
        );
        provider.callback_secret = newSecret;
      }
    } else {
      if (existing) {
        console.warn(`Note: provider "${name}" already exists on another church — creating a second row scoped to "${church.name}".`);
      }
      provider = await providerRepo.create({
        name, api_key: apiKey, api_url: apiUrl,
        sender_id: senderId, church_id: church.id, priority: 10,
      });
      console.log(`Created provider "${name}" for church "${church.name}"`);
    }

    const secret = provider.callback_secret;
    console.log('\nCallback URLs — register these in the provider dashboard:');
    console.log(`  Delivery : ${baseUrl}/api/sms/provider-callbacks/${encodeURIComponent(name)}/${secret}/delivery`);
    console.log(`  Topup    : ${baseUrl}/api/sms/provider-callbacks/${encodeURIComponent(name)}/${secret}/topup`);
    console.log('\n(api_key stored encrypted; callback_secret is the path token)');
    process.exit(0);
  } catch (err) {
    console.error('Provider registration failed:', err.message);
    process.exit(1);
  }
})();
