/**
 * WHAT THIS FILE DOES
 * -------------------
 * The platform console's information architecture in one place: the rail
 * entries rendered by PlatformShell.
 *
 * Shape:
 *   rail entry: { key, label, icon, path? | sections? }
 *   section:    { title, items }
 *   item:       { path, label, ownerOnly? }
 *
 * Every nav item links to a real page — the roadmap catalog was retired
 * once all 13 function areas shipped (batches 1-12).
 *
 * FILES IT TALKS TO
 * -----------------
 * - shells/PlatformShell.jsx          → renders rail + sub-sidebar panel
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
          { path: '/platform/tenants', icon: Upload, label: 'Import & Migration' },
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
          { path: '/platform/analytics', icon: FileDown, label: 'Exports' },
        ],
      },
      {
        title: 'Communication',
        items: [
          { path: '/platform/comms', icon: MessageSquarePlus, label: 'Announcements' },
          { path: '/status', icon: Newspaper, label: 'Status Page' },
          { path: '/platform/comms', icon: FileSignature, label: 'Templates' },
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
          { path: '/platform/support', icon: Eye, label: 'Support Access' },
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
          { path: '/platform/config', icon: Palette, label: 'Branding & Defaults' },
          { path: '/platform/config', icon: Power, label: 'Maintenance Mode' },
          { path: '/platform/config', icon: FileClock, label: 'Version & Changelog' },
        ],
      },
    ],
  },
];

export default buildPlatformNav;
