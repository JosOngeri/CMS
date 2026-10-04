/**
 * WHAT THIS FILE DOES
 * -------------------
 * The platform console's information architecture in one place: the rail
 * entries rendered by PlatformShell plus the roadmap catalog describing
 * each unbuilt function area.
 *
 * Shape:
 *   rail entry: { key, label, icon, path? | sections? }
 *   section:    { title, items }
 *   item:       { path, label, ownerOnly? }
 *
 * Items whose feature isn't built yet link to /platform/roadmap/<slug>,
 * where <slug> indexes PLATFORM_AREAS below — every nav item is a real,
 * informative destination, never a dead end.
 *
 * FILES IT TALKS TO
 * -----------------
 * - shells/PlatformShell.jsx          → renders rail + sub-sidebar panel
 * - pages/platform/PlatformRoadmap.jsx → renders PLATFORM_AREAS[slug]
 * - backend/routes/platform.routes.js → the real endpoints behind live items
 */
import {
  LayoutDashboard, Building2, Users, HeartPulse, Briefcase,
  LifeBuoy, Settings, PlusCircle, ListChecks, Clock, UserCog,
  KeyRound, ToggleLeft, GitMerge, ShieldCheck, ScrollText,
  Activity, Server, Plug, FileSearch, CreditCard, AlertOctagon,
  SearchCheck, Ban, DatabaseBackup, Upload, HardDrive, Undo2,
  Siren, Coins, FileSpreadsheet, TrendingUp, BarChart3, UserPlus,
  PieChart, FileDown, MessageSquarePlus, Newspaper, FileSignature,
  Inbox, Eye, Bug, HeartHandshake, Flag, Palette, Power, FileClock
} from 'lucide-react';

// ── Roadmap catalog ─────────────────────────────────────────────────────
// One entry per function area that doesn't have a page yet. `functions`
// is the checklist PlatformRoadmap renders — keep it aligned with the
// SaaS-superadmin capability list.
export const PLATFORM_AREAS = {
  'tenant-onboarding': {
    title: 'Tenant Onboarding & Trials',
    description: 'Guide a new church from signup to fully operational.',
    functions: [
      'Onboarding checklist per tenant (logo, members imported, M-Pesa configured, first service)',
      'Trial start/end, extensions, convert-to-paid',
      'Tenant templates — clone roles/departments/categories for new churches',
      'Suspend / archive / offboard with data export + retention policy',
    ],
  },
  'tenant-admin': {
    title: 'Tenant Administration',
    description: 'Reach into a church to fix accounts, limits, and config.',
    functions: [
      'Impersonate / login-as (banner-marked, audit-logged)',
      'Reset a tenant admin password / clear lockouts',
      'Per-tenant feature flags (SMS, Telegram, treasury, mobile)',
      'Limits & quotas — members, SMS credits, storage, admin seats',
      'Config override — repair a broken church configuration',
      'Tenant user list — roles, last login, MFA status',
    ],
  },
  'platform-staff': {
    title: 'Platform Staff',
    description: 'Manage the team that runs the SaaS.',
    functions: [
      'Role assignment — owner / admin / support (least privilege)',
      'Session revocation for platform accounts',
      'MFA enforcement on platform accounts',
      'Platform-team access audit',
    ],
  },
  'monitoring': {
    title: 'Monitoring & Health',
    description: 'Fleet-wide visibility before tenants notice a problem.',
    functions: [
      'Fleet dashboard — status, users, activity, errors per tenant',
      'Uptime & latency per endpoint/tenant',
      'Integration health — M-Pesa, SMS, Telegram, email delivery',
      'Background jobs & failed-job retry queue',
      'Alerting — error spikes, payment failures, low SMS credit',
      'Log explorer — search logs filtered by tenant/severity/time',
    ],
  },
  'payments-oversight': {
    title: 'Payments & Financial Oversight',
    description: 'Watch money move across every church.',
    functions: [
      'Cross-tenant payment feed, filterable',
      'Failed & stuck payment queue with manual reconcile',
      'M-Pesa statement reconciliation — flag orphans',
      'Refund oversight & dispute handling',
      'SMS cost ledger per tenant',
    ],
  },
  'security': {
    title: 'Security & Compliance',
    description: 'Protect the platform and prove it in the audit trail.',
    functions: [
      'Security center — failed logins, lockouts, suspicious IPs, IP blocking',
      'Session oversight — force-logout any session',
      'Credential rotation reminders (Daraja, SMS keys)',
      'Data-protection requests — export & deletion log',
      'Permission audit — detect privilege drift per tenant',
      'Rate-limit controls per tenant',
    ],
  },
  'data-management': {
    title: 'Data Management',
    description: 'Backups, exports, imports, and storage across tenants.',
    functions: [
      'Backups — trigger/verify per tenant, point-in-time restore',
      'Full tenant data export (CSV/JSON)',
      'Import/migration tooling for existing church records',
      'Storage usage per tenant + cleanup quotas',
      'Schema version tracking — which tenants have which migrations',
      'Demo-data toggle & purge on conversion',
    ],
  },
  'disaster': {
    title: 'Disaster & Incident',
    description: 'When things go wrong, act fast and provably.',
    functions: [
      'Incident playbook — outage broadcast, partial maintenance, read-only mode',
      'Tenant quarantine — isolate a compromised/abusive tenant',
      'Rollback tooling for deploys and destructive actions',
      'Forensic audit views — reconstruct who changed what',
    ],
  },
  'billing': {
    title: 'Billing & Revenue',
    description: 'Plans, invoices, and the money the SaaS itself earns.',
    functions: [
      'Subscription tiers — plans, features, pricing',
      'Tenant billing state — plan, renewal, history, balance',
      'Invoices — generate, send, credit notes',
      'Dunning — overdue reminders, grace, auto-suspend',
      'Revenue reports — MRR, churn, LTV, collection rate',
    ],
  },
  'communication': {
    title: 'Communication',
    description: 'Talk to tenants, not just about them.',
    functions: [
      'Broadcast announcements to all church admins',
      'Direct tenant messaging',
      'Public system status page',
      'Platform email/SMS templates (welcome, dunning, security notices)',
    ],
  },
  'support': {
    title: 'Support Operations',
    description: 'Help churches succeed, not just survive.',
    functions: [
      'Ticket inbox tied to tenants',
      'Time-boxed, tenant-approved support access',
      'Known-issues board across tenants',
      'Tenant health scores — flag stalling churches proactively',
    ],
  },
  'platform-config': {
    title: 'Platform Configuration',
    description: 'The knobs that shape every tenant at once.',
    functions: [
      'Global feature flags — gradual rollout',
      'New-tenant defaults (roles, categories, fiscal year)',
      'Branding defaults for new churches',
      'Integration config — M-Pesa, SMS, SMTP fallbacks',
      'Maintenance mode with tenant-visible notice',
      'Version & changelog visible to tenants',
    ],
  },
};

// ── Rail entries ────────────────────────────────────────────────────────
// Top-level platform navigation. `sections` open a sub-sidebar panel;
// `path` entries are direct links. All 13 function areas appear as
// section titles across the panels.
export const buildPlatformNav = ({ isOwner }) => [
  { key: 'home', label: 'Home', icon: LayoutDashboard, path: '/platform' },
  {
    key: 'tenants', label: 'Tenants', icon: Building2,
    sections: [
      {
        title: 'Tenant Lifecycle',
        items: [
          { path: '/platform/tenants', icon: ListChecks, label: 'All Churches' },
          { path: '/platform/tenants/create', icon: PlusCircle, label: 'New Church' },
          { path: '/platform/tenant-admin', icon: Clock, label: 'Onboarding & Trials' },
        ],
      },
      {
        title: 'Tenant Administration',
        items: [
          { path: '/platform/tenant-admin', icon: UserCog, label: 'Administer a Church' },
          { path: '/platform/tenant-admin', icon: ToggleLeft, label: 'Feature Flags & Quotas' },
          { path: '/platform/tenant-admin', icon: GitMerge, label: 'Impersonate & Access' },
        ],
      },
    ],
  },
  {
    key: 'staff', label: 'Staff', icon: Users,
    sections: [
      {
        title: 'Platform Staff',
        items: [
          ...(isOwner ? [{ path: '/platform/admins', icon: ShieldCheck, label: 'Admins' }] : []),
          { path: '/platform/admins', icon: KeyRound, label: 'Roles & Access' },
          { path: '/platform/security', icon: Eye, label: 'Sessions & MFA' },
        ],
      },
    ],
  },
  {
    key: 'operations', label: 'Operations', icon: HeartPulse,
    sections: [
      {
        title: 'Monitoring & Health',
        items: [
          { path: '/platform/monitoring', icon: Activity, label: 'Monitoring' },
          { path: '/platform/fleet', icon: Server, label: 'Fleet & Infrastructure' },
          { path: '/platform/fleet', icon: Plug, label: 'Integrations & Jobs' },
          { path: '/platform/audit', icon: FileSearch, label: 'Logs & Alerts' },
        ],
      },
      {
        title: 'Payments & Oversight',
        items: [
          { path: '/platform/payments', icon: CreditCard, label: 'Payment Feed' },
          { path: '/platform/payments', icon: AlertOctagon, label: 'Failed & Stuck' },
          { path: '/platform/payments', icon: SearchCheck, label: 'Reconciliation' },
        ],
      },
      {
        title: 'Security & Compliance',
        items: [
          { path: '/platform/audit', icon: ScrollText, label: 'Audit Log' },
          { path: '/platform/security', icon: ShieldCheck, label: 'Security Center' },
          { path: '/platform/security', icon: Ban, label: 'IP & Sessions' },
        ],
      },
      {
        title: 'Data Management',
        items: [
          { path: '/platform/data', icon: DatabaseBackup, label: 'Backups & Export' },
          { path: '/platform/roadmap/data-management', icon: Upload, label: 'Import & Migration' },
          { path: '/platform/data', icon: HardDrive, label: 'Storage & Schema' },
        ],
      },
      {
        title: 'Disaster & Incident',
        items: [
          { path: '/platform/incidents', icon: Siren, label: 'Incident Playbook' },
          { path: '/platform/incidents', icon: Ban, label: 'Tenant Quarantine' },
          { path: '/platform/audit', icon: Undo2, label: 'Rollback & Forensics' },
        ],
      },
    ],
  },
  {
    key: 'business', label: 'Business', icon: Briefcase,
    sections: [
      {
        title: 'Billing & Revenue',
        items: [
          { path: '/platform/billing', icon: Coins, label: 'Plans & Subscriptions' },
          { path: '/platform/billing', icon: FileSpreadsheet, label: 'Invoices & Dunning' },
          { path: '/platform/billing', icon: TrendingUp, label: 'Revenue Reports' },
        ],
      },
      {
        title: 'Analytics & Reporting',
        items: [
          { path: '/platform/analytics', icon: BarChart3, label: 'Analytics' },
          { path: '/platform/analytics', icon: UserPlus, label: 'Growth & Adoption' },
          { path: '/platform/analytics', icon: PieChart, label: 'Usage & Benchmarks' },
          { path: '/platform/roadmap/analytics-exports', icon: FileDown, label: 'Exports' },
        ],
      },
      {
        title: 'Communication',
        items: [
          { path: '/platform/comms', icon: MessageSquarePlus, label: 'Announcements' },
          { path: '/platform/roadmap/communication', icon: Newspaper, label: 'Status Page' },
          { path: '/platform/roadmap/communication', icon: FileSignature, label: 'Templates' },
        ],
      },
    ],
  },
  {
    key: 'support', label: 'Support', icon: LifeBuoy,
    sections: [
      {
        title: 'Support Operations',
        items: [
          { path: '/platform/support', icon: Inbox, label: 'Ticket Inbox' },
          { path: '/platform/roadmap/support', icon: Eye, label: 'Support Access' },
          { path: '/platform/support', icon: Bug, label: 'Known Issues' },
          { path: '/platform/support', icon: HeartHandshake, label: 'Health Scores' },
        ],
      },
    ],
  },
  {
    key: 'system', label: 'System', icon: Settings,
    sections: [
      {
        title: 'Platform Configuration',
        items: [
          { path: '/platform/settings', icon: Settings, label: 'Settings' },
          { path: '/platform/config', icon: Flag, label: 'Feature Flags' },
          { path: '/platform/roadmap/platform-config', icon: Palette, label: 'Branding & Defaults' },
          { path: '/platform/config', icon: Power, label: 'Maintenance Mode' },
          { path: '/platform/config', icon: FileClock, label: 'Version & Changelog' },
        ],
      },
    ],
  },
];

// Roadmap slugs used above that don't have a PLATFORM_AREAS entry yet get
// a generic area — this keeps the nav complete while areas can be added
// incrementally.
PLATFORM_AREAS['analytics-exports'] = {
  title: 'Metrics Export',
  description: 'Monthly SaaS metrics export — MRR, churn, growth — as CSV/PDF for board reporting.',
  functions: [
    'Scheduled monthly metrics snapshot',
    'CSV/PDF export of revenue + growth + usage',
    'Audit-logged export downloads',
  ],
};

PLATFORM_AREAS['analytics-growth'] = {
  title: 'Analytics & Reporting',
  description: 'Measure growth, adoption, and usage across tenants.',
  functions: [
    'Growth metrics — tenants added/churned, total users, DAU/MAU',
    'Feature adoption per tenant — drives pricing tiers',
    'Usage reports — payments volume, SMS sent, members managed',
    'Cross-tenant benchmarking',
    'Monthly SaaS metrics export',
  ],
};

export default buildPlatformNav;
