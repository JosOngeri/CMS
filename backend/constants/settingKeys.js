/**
 * Canonical settings manifest — the single catalog every settings surface
 * reads from (church admin UI, platform console, public site).
 *
 * scope:
 *   'global' — platform-level only; church admins can't see or override it
 *              (provider creds, SaaS-level switches)
 *   'church' — church-specific only (rare)
 *   'both'   — a global default exists and a church may override it
 *
 * secret: value is write-only — reads return '***', never plaintext.
 * enforced_by: what consumes this key. 'public-site' = read via
 *   /api/settings/public today. 'none' = stored but nothing reads it yet
 *   (see docs/plans/2026-10-04_18-47_church-settings-platform-admin.md §4).
 */

const KEYS = [
  // ── appearance ─────────────────────────────────────────────────────
  { key: 'appearance/accent', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Accent' },
  { key: 'appearance/accent_color', type: 'color', scope: 'both', enforcedBy: 'public-site', label: 'Accent Color' },
  { key: 'appearance/accessibilityRating', type: 'string', scope: 'both', enforcedBy: 'none', label: 'Accessibility Rating' },
  { key: 'appearance/background', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Background' },
  { key: 'appearance/background_color', type: 'color', scope: 'both', enforcedBy: 'public-site', label: 'Background Color' },
  { key: 'appearance/border', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Border' },
  { key: 'appearance/dark_mode', type: 'boolean', scope: 'both', enforcedBy: 'public-site', label: 'Dark Mode', default: 'false' },
  { key: 'appearance/description', type: 'string', scope: 'both', enforcedBy: 'none', label: 'Theme Description' },
  { key: 'appearance/error', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Error' },
  { key: 'appearance/font_family', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Font Family' },
  { key: 'appearance/primary', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Primary' },
  { key: 'appearance/primary_color', type: 'color', scope: 'both', enforcedBy: 'public-site', label: 'Primary Color' },
  { key: 'appearance/secondary', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Secondary' },
  { key: 'appearance/secondary_color', type: 'color', scope: 'both', enforcedBy: 'public-site', label: 'Secondary Color' },
  { key: 'appearance/success', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Success' },
  { key: 'appearance/surface', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Surface' },
  { key: 'appearance/text', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Text' },
  { key: 'appearance/text_color', type: 'color', scope: 'both', enforcedBy: 'public-site', label: 'Text Color' },
  { key: 'appearance/textSecondary', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Text Secondary' },
  { key: 'appearance/warning', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Warning' },

  // ── contact ────────────────────────────────────────────────────────
  { key: 'contact/church_address', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Church Address' },
  { key: 'contact/church_email', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Church Email', validation: { pattern: '^[\\w\\-\\.]+@[\\w\\-\\.]+\\.[a-zA-Z]{2,}$' } },
  { key: 'contact/church_phone', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Church Phone', validation: { pattern: '^[+]?[0-9\\s\\-]+$' } },
  { key: 'contact/church_website', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Church Website', validation: { pattern: '^https?://.+$' } },

  // ── feature-flags ──────────────────────────────────────────────────
  { key: 'feature-flags/FEATURE_SETTINGS_USE_ALTERNATIVE', type: 'boolean', scope: 'global', enforcedBy: 'none', label: 'Settings Alternative UI', default: 'false' },

  // ── features ───────────────────────────────────────────────────────
  { key: 'features/enable_announcements', type: 'boolean', scope: 'both', enforcedBy: 'none', label: 'Enable Announcements', default: 'true' },
  { key: 'features/enable_events', type: 'boolean', scope: 'both', enforcedBy: 'none', label: 'Enable Events', default: 'true' },
  { key: 'features/enable_live_stream', type: 'boolean', scope: 'both', enforcedBy: 'none', label: 'Enable Live Stream', default: 'false' },
  { key: 'features/enable_treasury', type: 'boolean', scope: 'both', enforcedBy: 'none', label: 'Enable Treasury', default: 'true' },

  // ── general ────────────────────────────────────────────────────────
  { key: 'general/address', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Address' },
  { key: 'general/contact_email', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Contact Email' },
  { key: 'general/contact_phone', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Contact Phone' },
  { key: 'general/maintenance_mode', type: 'boolean', scope: 'global', enforcedBy: 'none', label: 'Maintenance Mode', default: 'false' },
  { key: 'general/site_description', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Site Description', validation: { maxLength: 500, minLength: 10 } },
  { key: 'general/site_favicon', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Site Favicon URL' },
  { key: 'general/site_logo', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Site Logo URL' },
  { key: 'general/site_name', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Site Name', validation: { maxLength: 100, minLength: 2 } },

  // ── members ────────────────────────────────────────────────────────
  { key: 'members/member_auto_id', type: 'boolean', scope: 'both', enforcedBy: 'none', label: 'Auto-generate Member IDs', default: 'true' },
  { key: 'members/member_id_prefix', type: 'string', scope: 'both', enforcedBy: 'none', label: 'Member ID Prefix' },

  // ── notifications ──────────────────────────────────────────────────
  { key: 'notifications/email_notifications', type: 'boolean', scope: 'both', enforcedBy: 'none', label: 'Email Notifications', default: 'true' },
  { key: 'notifications/sms_notifications', type: 'boolean', scope: 'both', enforcedBy: 'none', label: 'SMS Notifications', default: 'false' },

  // ── payment ────────────────────────────────────────────────────────
  { key: 'payment/default_tithe_amount', type: 'number', scope: 'both', enforcedBy: 'none', label: 'Default Tithe Amount', validation: { max: 100000, min: 1 } },
  { key: 'payment/mpesa_environment', type: 'string', scope: 'global', enforcedBy: 'none', label: 'M-Pesa Environment', validation: { enum: ['sandbox', 'production'] } },
  { key: 'payment/mpesa_passkey', type: 'string', scope: 'global', secret: true, enforcedBy: 'none', label: 'M-Pesa Passkey' },
  { key: 'payment/mpesa_shortcode', type: 'string', scope: 'global', enforcedBy: 'none', label: 'M-Pesa Shortcode', validation: { pattern: '^[0-9]+$' } },

  // ── security ───────────────────────────────────────────────────────
  { key: 'security/password_min_length', type: 'number', scope: 'both', enforcedBy: 'none', label: 'Minimum Password Length', validation: { min: 6, max: 128 } },
  { key: 'security/require_2fa', type: 'boolean', scope: 'both', enforcedBy: 'none', label: 'Require 2FA', default: 'false' },
  { key: 'security/session_timeout', type: 'number', scope: 'both', enforcedBy: 'none', label: 'Session Timeout (minutes)', validation: { min: 5, max: 10080 } },

  // ── seo ────────────────────────────────────────────────────────────
  { key: 'seo/meta_description', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Meta Description' },
  { key: 'seo/meta_keywords', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Meta Keywords' },
  { key: 'seo/meta_title', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Meta Title' },

  // ── service ────────────────────────────────────────────────────────
  { key: 'service/pastor_name', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Pastor Name' },
  { key: 'service/saturday_service_time', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Saturday Service Time', validation: { pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' } },
  { key: 'service/wednesday_service_time', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Wednesday Service Time', validation: { pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' } },

  // ── sms ────────────────────────────────────────────────────────────
  { key: 'sms/sms_api_key', type: 'string', scope: 'global', secret: true, enforcedBy: 'none', label: 'SMS API Key' },
  { key: 'sms/sms_enabled', type: 'boolean', scope: 'global', enforcedBy: 'none', label: 'SMS Enabled', default: 'true' },
  { key: 'sms/sms_provider', type: 'string', scope: 'global', enforcedBy: 'none', label: 'SMS Provider' },
  { key: 'sms/sms_sender_id', type: 'string', scope: 'global', enforcedBy: 'none', label: 'SMS Sender ID' },

  // ── social ─────────────────────────────────────────────────────────
  { key: 'social/facebook_url', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Facebook URL' },
  { key: 'social/instagram_url', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Instagram URL' },
  { key: 'social/twitter_url', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Twitter URL' },
  { key: 'social/youtube_url', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'YouTube URL' },
];

const byKey = new Map(KEYS.map((k) => [k.key, k]));
const SECRET_KEYS = new Set(KEYS.filter((k) => k.secret).map((k) => k.key));
const GLOBAL_ONLY_KEYS = new Set(KEYS.filter((k) => k.scope === 'global').map((k) => k.key));

/**
 * Validates a proposed value against the manifest entry's type + rules.
 * Returns an error string, or null when valid.
 */
function validateValue(key, value) {
  const def = byKey.get(key);
  if (!def) return `Unknown setting key: ${key}`;
  const v = value == null ? '' : String(value);
  switch (def.type) {
    case 'boolean':
      if (!['true', 'false', '0', '1', ''].includes(v)) return `${key} must be a boolean`;
      break;
    case 'number':
      if (v !== '' && Number.isNaN(Number(v))) return `${key} must be a number`;
      break;
    case 'color':
      if (v !== '' && !/^#[0-9a-fA-F]{3,8}$/.test(v)) return `${key} must be a hex color`;
      break;
    default: break;
  }
  const rules = def.validation || {};
  if (rules.pattern && v !== '' && !new RegExp(rules.pattern).test(v)) return `${key} fails pattern ${rules.pattern}`;
  if (rules.enum && v !== '' && !rules.enum.includes(v)) return `${key} must be one of ${rules.enum.join(', ')}`;
  const n = Number(v);
  if (rules.min != null && v !== '' && n < rules.min) return `${key} must be >= ${rules.min}`;
  if (rules.max != null && v !== '' && n > rules.max) return `${key} must be <= ${rules.max}`;
  if (rules.minLength != null && v.length < rules.minLength) return `${key} must be at least ${rules.minLength} chars`;
  if (rules.maxLength != null && v.length > rules.maxLength) return `${key} must be at most ${rules.maxLength} chars`;
  return null;
}

module.exports = { KEYS, byKey, SECRET_KEYS, GLOBAL_ONLY_KEYS, validateValue };
