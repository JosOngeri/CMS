/**
 * WHAT THIS FILE DOES
 * -------------------
 * The main navigation menu on the left of the dashboard. It only shows
 * items the current user is allowed to see, based on their role and
 * permissions from the backend.
 *
 * The menu is organised from simplest (member) at the top to most
 * powerful (admin) at the bottom, so a normal church member immediately
 * sees the things they actually use.
 *
 * FILES IT TALKS TO
 * -----------------
 * - constants/permissions.js → MODULE_PERMISSIONS decides visibility
 * - hooks/usePermission.js   → checks role/permission
 * - hooks/useChurchBranding.js → shows the active church name
 * - AuthContext.jsx          → user name, initials, logout
 * - DashboardLayout.jsx      → renders this component
 */

import {
  LayoutDashboard,
  Settings,
  Users,
  Image as ImageIcon,
  FileText,
  DollarSign,
  MessageSquare,
  Calendar,
  Bell,
  X,
  LogOut,
  Building2,
  BarChart3,
  Shield,
  Heart,
  Megaphone,
  HandCoins,
  CheckSquare,
  Landmark,
  Church,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useChurchBranding } from '../../hooks/useChurchBranding';
import { LEADERSHIP_ROLES } from '../../constants/roles';
import NestedNav from './NestedNav';

// True when the route is the item itself or any descendant route — mirrors
// the helper inside NestedNav so the primary rail can highlight the group
// that contains the current page.
const pathActive = (pathname, item) =>
  (item.path && (pathname === item.path || pathname.startsWith(item.path + '/'))) ||
  (item.children?.some((child) => pathActive(pathname, child)) ?? false);

const sectionsContainPath = (sections, pathname) =>
  sections.some((section) => section.items.some((item) => pathActive(pathname, item)));

function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const { churchName } = useChurchBranding();
  const { canAccessModule, isAny, isSuperAdmin } = usePermission();
  const location = useLocation();
  const pathname = location.pathname;
  const [activeKey, setActiveKey] = useState(null);

  // Top-level navigation — kept under 10 entries. Entries with `sections`
  // open a second sub-sidebar panel; entries with `path` are direct links.
  // Every path below is a real route (router/dashboard.routes.jsx) and
  // permission-mapped in constants/permissions.js, so filtering can't
  // expose anything new.
  const entries = [
    { key: 'home', label: 'Home', icon: LayoutDashboard, path: '/dashboard/overview' },
    {
      key: 'church', label: 'My Church', icon: Church,
      sections: [
        {
          title: 'Giving',
          items: [
            { path: '/dashboard/obligations', icon: HandCoins, label: 'My Obligations' },
            {
              path: '/dashboard/payments/my', icon: DollarSign, label: 'My Payments',
              children: [
                { path: '/dashboard/payments/history', label: 'Payment History' },
              ],
            },
            { path: '/dashboard/collections', icon: Heart, label: 'Collections' },
          ],
        },
        {
          title: 'Church Life',
          items: [
            { path: '/dashboard/announcements', icon: Megaphone, label: 'Announcements' },
            { path: '/dashboard/events', icon: Calendar, label: 'Events' },
            { path: '/dashboard/my-departments', icon: Building2, label: 'My Departments' },
            { path: '/dashboard/gallery', icon: ImageIcon, label: 'Gallery' },
            { path: '/dashboard/documents', icon: FileText, label: 'Documents' },
            { path: '/dashboard/notifications', icon: Bell, label: 'Messages' },
          ],
        },
      ],
    },
    {
      key: 'departments', label: 'Departments', icon: Building2, roles: LEADERSHIP_ROLES,
      sections: [
        {
          title: null,
          items: [
            {
              path: '/dashboard/departments', icon: Building2, label: 'Departments',
              children: [
                { path: '/dashboard/departments/categories', label: 'Categories' },
                { path: '/dashboard/departments/handovers', label: 'Handovers' },
                { path: '/dashboard/departments/head-allocation', label: 'Head Allocation' },
                { path: '/dashboard/departments/settings', label: 'Dept Settings' },
              ],
            },
          ],
        },
      ],
    },
    { key: 'people', label: 'People', icon: Users, path: '/dashboard/members' },
    { key: 'approvals', label: 'Approvals', icon: CheckSquare, path: '/dashboard/approvals' },
    {
      key: 'comms', label: 'Communications', icon: MessageSquare, roles: LEADERSHIP_ROLES,
      sections: [
        {
          title: 'Messaging',
          items: [
            {
              path: '/dashboard/sms', icon: MessageSquare, label: 'SMS',
              children: [
                { path: '/dashboard/sms/dashboard', label: 'SMS Dashboard' },
                { path: '/dashboard/sms/contacts', label: 'Contacts' },
                { path: '/dashboard/sms/groups', label: 'Groups' },
              ],
            },
            {
              path: '/dashboard/telegram', icon: MessageSquare, label: 'Telegram',
              children: [
                { path: '/dashboard/telegram/church', label: 'Church Channel' },
                { path: '/dashboard/telegram/auth', label: 'Telegram Auth' },
              ],
            },
          ],
        },
        {
          title: 'Site',
          items: [
            { path: '/dashboard/content', icon: FileText, label: 'Content' },
          ],
        },
      ],
    },
    {
      key: 'finance', label: 'Finance', icon: Landmark,
      sections: [
        {
          title: 'Treasury',
          items: [
            {
              path: '/dashboard/treasury', icon: Landmark, label: 'Treasury',
              children: [
                { path: '/dashboard/treasury/accounts', label: 'Chart of Accounts' },
                { path: '/dashboard/treasury/funds', label: 'Funds' },
                { path: '/dashboard/treasury/budgets', label: 'Budgets' },
                { path: '/dashboard/treasury/expenses', label: 'Expenses' },
                { path: '/dashboard/treasury/journal-entries', label: 'Journal Entries' },
                { path: '/dashboard/treasury/contributions', label: 'Contributions' },
                { path: '/dashboard/treasury/pledges', label: 'Pledges' },
                { path: '/dashboard/treasury/projects', label: 'Projects' },
                { path: '/dashboard/treasury/recurring', label: 'Recurring' },
                { path: '/dashboard/treasury/vendors', label: 'Vendors' },
                { path: '/dashboard/treasury/reconciliations', label: 'Reconciliations' },
                { path: '/dashboard/treasury/receipts', label: 'Receipts' },
                { path: '/dashboard/treasury/assets', label: 'Assets' },
                { path: '/dashboard/treasury/analytics', label: 'Analytics' },
                { path: '/dashboard/treasury/reports', label: 'Reports' },
              ],
            },
          ],
        },
        {
          title: 'Payments',
          items: [
            { path: '/dashboard/payments/management', icon: DollarSign, label: 'Payment Management' },
            { path: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
          ],
        },
      ],
    },
    {
      key: 'admin', label: 'Administration', icon: Shield,
      sections: [
        {
          title: 'People',
          items: [
            { path: '/dashboard/users', icon: Users, label: 'User Management' },
          ],
        },
        {
          title: 'System',
          items: [
            {
              path: '/dashboard/admin', icon: Shield, label: 'Administration',
              children: [
                { path: '/dashboard/admin/database', label: 'Database' },
                { path: '/dashboard/admin/documents', label: 'Documents' },
                { path: '/dashboard/monitoring', label: 'Monitoring' },
                { path: '/dashboard/security', label: 'Security' },
                { path: '/dashboard/seo', label: 'SEO' },
                { path: '/dashboard/documentation', label: 'Documentation' },
              ],
            },
            { path: '/dashboard/admin/settings', icon: Settings, label: 'Settings' },
          ],
        },
      ],
    },
  ];

  // Filter out items the user cannot reach. Super Admin sees everything.
  // Recursive: a hidden parent drops its whole subtree, a child-less
  // path-less group drops itself.
  const itemAllowed = (item) => {
    if (!isSuperAdmin() && item.roles && !isAny(item.roles)) return false;
    return item.path ? canAccessModule(item.path) : true;
  };
  const filterItems = (items) => items
    .map(item => ({
      ...item,
      children: item.children ? filterItems(item.children) : undefined,
    }))
    .filter(item => itemAllowed(item) && (item.path || item.children?.length));

  const visibleEntries = entries
    .map((entry) => {
      if (!isSuperAdmin() && entry.roles && !isAny(entry.roles)) return null;
      if (entry.path) return canAccessModule(entry.path) ? entry : null;
      const sections = entry.sections
        .map((section) => ({ ...section, items: filterItems(section.items) }))
        .filter((section) => section.items.length > 0);
      return sections.length ? { ...entry, sections } : null;
    })
    .filter(Boolean);

  const activeEntry = visibleEntries.find((e) => e.key === activeKey && e.sections);

  // Keep the sub-sidebar synced with the route: navigating into a group's
  // page opens that group; navigating to a top-level link closes it.
  useEffect(() => {
    const match = visibleEntries.find(
      (e) => e.sections && sectionsContainPath(e.sections, pathname)
    );
    setActiveKey(match?.key ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile overlay behind the sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[var(--color-overlay)] z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar — the drawer widens on desktop when a sub-sidebar is open:
          w-64 primary rail + w-64 panel = lg:w-[32rem]. */}
      <div className={`fixed left-0 top-0 h-full bg-[var(--color-surface)] shadow-xl z-50 transition-[transform,width] duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:z-0 w-64 flex-shrink-0 border-r border-[var(--color-border)] ${
        activeEntry ? 'lg:w-[32rem]' : 'lg:w-64'
      }`}>
        <div className="relative flex h-full">
        <div className="w-64 flex-shrink-0 flex flex-col h-full min-h-0">
          {/* Church name header */}
          <div className="p-6 church-gradient">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-surface)_20%,transparent)] flex items-center justify-center">
                  <span className="text-[var(--color-on-solid)] font-bold text-lg">{churchName?.charAt(0) || 'M'}</span>
                </div>
                <h1 className="text-lg font-bold text-[var(--color-on-solid)] truncate">{churchName}</h1>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden text-[var(--color-on-solid-80)] hover:text-[var(--color-on-solid)]"
                aria-label="Close sidebar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Primary rail — top-level entries only. Leaf entries navigate
              directly; group entries open the sub-sidebar panel beside them. */}
          <nav className="flex-1 min-h-0 p-4 overflow-y-auto overscroll-contain">
            <ul className="space-y-1.5">
              {visibleEntries.map((entry) => {
                const Icon = entry.icon;
                const isGroup = Boolean(entry.sections);
                const selfActive = Boolean(entry.path) && pathname === entry.path;
                const descendantActive = isGroup && sectionsContainPath(entry.sections, pathname);
                const classes = selfActive
                  ? 'church-gradient text-[var(--color-on-solid)] shadow-md'
                  : descendantActive || activeKey === entry.key
                    ? 'text-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
                    : 'text-[var(--color-text)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]';
                const inner = (
                  <>
                    <span className={`p-1.5 rounded-lg mr-3 ${
                      selfActive
                        ? 'bg-[color-mix(in_srgb,var(--color-surface)_20%,transparent)]'
                        : 'bg-[var(--color-background)]'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 min-w-0 truncate">{entry.label}</span>
                    {isGroup && (
                      <ChevronRight
                        aria-hidden="true"
                        className={`h-4 w-4 ml-2 transition-transform duration-200 ${
                          activeKey === entry.key ? 'rotate-90' : ''
                        } text-[var(--color-textSecondary)]`}
                      />
                    )}
                  </>
                );
                return (
                  <li key={entry.key}>
                    {isGroup ? (
                      <button
                        type="button"
                        className={`w-full flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 ${classes}`}
                        onClick={() => setActiveKey(activeKey === entry.key ? null : entry.key)}
                        aria-expanded={activeKey === entry.key}
                      >
                        {inner}
                      </button>
                    ) : (
                      <Link
                        to={entry.path}
                        className={`flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 ${classes}`}
                        onClick={() => setIsOpen(false)}
                        aria-current={selfActive ? 'page' : undefined}
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User summary & logout */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_50%,transparent)]">
            <div className="flex items-center space-x-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] font-bold">
                {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-[var(--color-textSecondary)] truncate">
                  {user?.roles?.[0] || 'Member'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Sub-sidebar — the second panel a nested entry opens. On desktop it
            sits beside the rail as a flex sibling; on mobile it slides over
            the whole drawer (absolute inset-0) with a back button. */}
        {activeEntry && (
          <div className="absolute inset-0 z-10 lg:static lg:z-auto flex-1 min-w-0 bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col">
            {/* Panel header — back on mobile, close on desktop */}
            <div className="flex items-center gap-2 px-4 py-5 border-b border-[var(--color-border)]">
              <button
                onClick={() => setActiveKey(null)}
                className="lg:hidden p-1 -ml-1 text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                aria-label="Back to menu"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {activeEntry.icon && <activeEntry.icon className="h-5 w-5 text-[var(--color-primary)]" />}
              <h2 className="flex-1 min-w-0 truncate text-sm font-semibold text-[var(--color-text)] uppercase tracking-wider">
                {activeEntry.label}
              </h2>
              <button
                onClick={() => setActiveKey(null)}
                className="hidden lg:block p-1 text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Panel nav — scrolls independently of the primary rail; the
                sticky section titles inside NestedNav stay pinned while the
                item list scrolls beneath them. */}
            <nav className="flex-1 min-h-0 p-4 overflow-y-auto overscroll-contain">
              <NestedNav sections={activeEntry.sections} onNavigate={() => setIsOpen(false)} />
            </nav>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

export default Sidebar;
