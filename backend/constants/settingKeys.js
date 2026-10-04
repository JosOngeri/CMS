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
  { category: 'appearance', key: 'accent', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Accent' },
  { category: 'appearance', key: 'accent_color', type: 'color', scope: 'both', enforcedBy: 'public-site', label: 'Accent Color' },
  { category: 'appearance', key: 'accessibilityRating', type: 'string', scope: 'both', enforcedBy: 'none', label: 'Accessibility Rating' },
  { category: 'appearance', key: 'background', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Background' },
  { category: 'appearance', key: 'background_color', type: 'color', scope: 'both', enforcedBy: 'public-site', label: 'Background Color' },
  { category: 'appearance', key: 'border', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Border' },
  { category: 'appearance', key: 'dark_mode', type: 'boolean', scope: 'both', enforcedBy: 'public-site', label: 'Dark Mode', default: 'false' },
  { category: 'appearance', key: 'description', type: 'string', scope: 'both', enforcedBy: 'none', label: 'Theme Description' },
  { category: 'appearance', key: 'error', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Error' },
  { category: 'appearance', key: 'font_family', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Font Family' },
  { category: 'appearance', key: 'primary', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Primary' },
  { category: 'appearance', key: 'primary_color', type: 'color', scope: 'both', enforcedBy: 'public-site', label: 'Primary Color' },
  { category: 'appearance', key: 'secondary', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Secondary' },
  { category: 'appearance', key: 'secondary_color', type: 'color', scope: 'both', enforcedBy: 'public-site', label: 'Secondary Color' },
  { category: 'appearance', key: 'success', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Success' },
  { category: 'appearance', key: 'surface', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Surface' },
  { category: 'appearance', key: 'text', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Text' },
  { category: 'appearance', key: 'text_color', type: 'color', scope: 'both', enforcedBy: 'public-site', label: 'Text Color' },
  { category: 'appearance', key: 'textSecondary', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Text Secondary' },
  { category: 'appearance', key: 'warning', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Warning' },

  // ── contact ────────────────────────────────────────────────────────
  { category: 'contact', key: 'church_address', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Church Address' },
  { category: 'contact', key: 'church_email', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Church Email', validation: { pattern: '^[\\w\\-\\.]+@[\\w\\-\\.]+\\.[a-zA-Z]{2,}$' } },
  { category: 'contact', key: 'church_phone', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Church Phone', validation: { pattern: '^[+]?[0-9\\s\\-]+$' } },
  { category: 'contact', key: 'church_website', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Church Website', validation: { pattern: '^https?://.+$' } },

  // ── feature-flags ──────────────────────────────────────────────────
  { category: 'feature-flags', key: 'FEATURE_SETTINGS_USE_ALTERNATIVE', type: 'boolean', scope: 'global', enforcedBy: 'featureFlags config (planned)', label: 'Settings Alternative UI', default: 'false' },

  // ── features ───────────────────────────────────────────────────────
  { category: 'features', key: 'enable_announcements', type: 'boolean', scope: 'both', enforcedBy: 'sidebar-nav', label: 'Enable Announcements', default: 'true' },
  { category: 'features', key: 'enable_events', type: 'boolean', scope: 'both', enforcedBy: 'sidebar-nav', label: 'Enable Events', default: 'true' },
  { category: 'features', key: 'enable_live_stream', type: 'boolean', scope: 'both', enforcedBy: 'public-site', label: 'Enable Live Stream', default: 'false' },
  { category: 'features', key: 'enable_treasury', type: 'boolean', scope: 'both', enforcedBy: 'sidebar-nav', label: 'Enable Treasury', default: 'true' },

  // ── general ────────────────────────────────────────────────────────
  { category: 'general', key: 'address', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Address' },
  { category: 'general', key: 'contact_email', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Contact Email' },
  { category: 'general', key: 'contact_phone', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Contact Phone' },
  { category: 'general', key: 'maintenance_mode', type: 'boolean', scope: 'global', enforcedBy: 'middleware (planned)', label: 'Maintenance Mode', default: 'false' },
  { category: 'general', key: 'site_description', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Site Description', validation: { maxLength: 500, minLength: 10 } },
  { category: 'general', key: 'site_favicon', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Site Favicon URL' },
  { category: 'general', key: 'site_logo', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Site Logo URL' },
  { category: 'general', key: 'site_name', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Site Name', validation: { maxLength: 100, minLength: 2 } },

  // ── members ────────────────────────────────────────────────────────
  { category: 'members', key: 'member_auto_id', type: 'boolean', scope: 'both', enforcedBy: 'MembersRepository.createMember', label: 'Auto-generate Member IDs', default: 'true' },
  { category: 'members', key: 'member_id_prefix', type: 'string', scope: 'both', enforcedBy: 'MembersRepository.createMember', label: 'Member ID Prefix' },

  // ── notifications ──────────────────────────────────────────────────
  { category: 'notifications', key: 'email_notifications', type: 'boolean', scope: 'both', enforcedBy: 'emailService.sendEmail', label: 'Email Notifications', default: 'true' },
  { category: 'notifications', key: 'sms_notifications', type: 'boolean', scope: 'both', enforcedBy: 'hybridSMS.sendSMS', label: 'SMS Notifications', default: 'false' },

  // ── payment ────────────────────────────────────────────────────────
  { category: 'payment', key: 'default_tithe_amount', type: 'number', scope: 'both', enforcedBy: 'payments UI', label: 'Default Tithe Amount', validation: { max: 100000, min: 1 } },
  { category: 'payment', key: 'mpesa_environment', type: 'string', scope: 'global', enforcedBy: 'none', label: 'M-Pesa Environment', validation: { enum: ['sandbox', 'production'] } },
  { category: 'payment', key: 'mpesa_passkey', type: 'string', scope: 'global', secret: true, enforcedBy: 'none', label: 'M-Pesa Passkey' },
  { category: 'payment', key: 'mpesa_shortcode', type: 'string', scope: 'global', enforcedBy: 'none', label: 'M-Pesa Shortcode', validation: { pattern: '^[0-9]+$' } },

  // ── security ───────────────────────────────────────────────────────
  { category: 'security', key: 'password_min_length', type: 'number', scope: 'both', enforcedBy: 'security.validatePasswordStrength', label: 'Minimum Password Length', validation: { min: 6, max: 128 } },
  { category: 'security', key: 'require_2fa', type: 'boolean', scope: 'both', enforcedBy: 'auth.controller (login)', label: 'Require 2FA', default: 'false' },
  { category: 'security', key: 'session_timeout', type: 'number', scope: 'both', enforcedBy: 'auth.controller (JWT TTL)', label: 'Session Timeout (minutes)', validation: { min: 5, max: 10080 } },

  // ── seo ────────────────────────────────────────────────────────────
  { category: 'seo', key: 'meta_description', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Meta Description' },
  { category: 'seo', key: 'meta_keywords', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Meta Keywords' },
  { category: 'seo', key: 'meta_title', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Meta Title' },

  // ── service ────────────────────────────────────────────────────────
  { category: 'service', key: 'pastor_name', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Pastor Name' },
  { category: 'service', key: 'saturday_service_time', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Saturday Service Time', validation: { pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' } },
  { category: 'service', key: 'wednesday_service_time', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Wednesday Service Time', validation: { pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' } },

  // ── sms ────────────────────────────────────────────────────────────
  { category: 'sms', key: 'sms_api_key', type: 'string', scope: 'global', secret: true, enforcedBy: 'none', label: 'SMS API Key' },
  { category: 'sms', key: 'sms_enabled', type: 'boolean', scope: 'global', enforcedBy: 'hybridSMS.sendSMS', label: 'SMS Enabled', default: 'true' },
  { category: 'sms', key: 'sms_provider', type: 'string', scope: 'global', enforcedBy: 'none', label: 'SMS Provider' },
  { category: 'sms', key: 'sms_sender_id', type: 'string', scope: 'global', enforcedBy: 'none', label: 'SMS Sender ID' },

  // ── social ─────────────────────────────────────────────────────────
  { category: 'social', key: 'facebook_url', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Facebook URL' },
  { category: 'social', key: 'instagram_url', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Instagram URL' },
  { category: 'social', key: 'twitter_url', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'Twitter URL' },
  { category: 'social', key: 'youtube_url', type: 'string', scope: 'both', enforcedBy: 'public-site', label: 'YouTube URL' },
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
