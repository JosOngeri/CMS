/**
 * Tenant feature-flag names — single source for the platform toggle API,
 * the route-mount enforcement middleware, and the church-facing
 * features map (each flag surfaces as `enable_<flag>`).
 * @exports {TENANT_FLAGS}
 */
const TENANT_FLAGS = [
  'sms', 'telegram', 'treasury', 'gallery', 'documents', 'departments',
  'approvals', 'mobile_app', 'members', 'payments', 'events', 'announcements',
  'live_stream'
];

module.exports = { TENANT_FLAGS };
