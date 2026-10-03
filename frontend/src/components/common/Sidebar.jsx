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
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useChurchBranding } from '../../hooks/useChurchBranding';
import { LEADERSHIP_ROLES } from '../../constants/roles';
import NestedNav from './NestedNav';

function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const { churchName } = useChurchBranding();
  const { canAccessModule, isAny, isSuperAdmin } = usePermission();

  // Menu sections, ordered from everyday member tasks down to admin tools.
  // Items with `children` render an expandable sub-sidebar — every child path
  // below is a real route (router/dashboard.routes.jsx) and permission-mapped
  // in constants/permissions.js, so filtering can't expose anything new.
  const sections = [
    {
      title: null,
      items: [
        { path: '/dashboard/overview', icon: LayoutDashboard, label: 'Home' },
      ],
    },
    {
      title: 'My Church',
      items: [
        { path: '/dashboard/obligations', icon: HandCoins, label: 'My Obligations' },
        {
          path: '/dashboard/payments/my', icon: DollarSign, label: 'My Payments',
          children: [
            { path: '/dashboard/payments/history', label: 'Payment History' },
          ],
        },
        { path: '/dashboard/announcements', icon: Megaphone, label: 'Announcements' },
        { path: '/dashboard/events', icon: Calendar, label: 'Events' },
        { path: '/dashboard/my-departments', icon: Building2, label: 'My Departments' },
        { path: '/dashboard/collections', icon: Heart, label: 'Collections' },
        { path: '/dashboard/gallery', icon: ImageIcon, label: 'Gallery' },
        { path: '/dashboard/documents', icon: FileText, label: 'Documents' },
        { path: '/dashboard/notifications', icon: Bell, label: 'Messages' },
      ],
    },
    {
      title: 'Leadership',
      items: [
        {
          path: '/dashboard/departments', icon: Building2, label: 'Departments', roles: LEADERSHIP_ROLES,
          children: [
            { path: '/dashboard/departments/categories', label: 'Categories' },
            { path: '/dashboard/departments/handovers', label: 'Handovers' },
            { path: '/dashboard/departments/head-allocation', label: 'Head Allocation' },
            { path: '/dashboard/departments/settings', label: 'Dept Settings' },
          ],
        },
        { path: '/dashboard/members', icon: Users, label: 'People' },
        { path: '/dashboard/approvals', icon: CheckSquare, label: 'Approvals' },
        {
          path: '/dashboard/sms', icon: MessageSquare, label: 'Communications', roles: LEADERSHIP_ROLES,
          children: [
            { path: '/dashboard/sms/dashboard', label: 'SMS Dashboard' },
            { path: '/dashboard/sms/contacts', label: 'Contacts' },
            { path: '/dashboard/sms/groups', label: 'Groups' },
            {
              path: '/dashboard/telegram', label: 'Telegram',
              children: [
                { path: '/dashboard/telegram/church', label: 'Church Channel' },
                { path: '/dashboard/telegram/auth', label: 'Telegram Auth' },
              ],
            },
          ],
        },
        { path: '/dashboard/content', icon: FileText, label: 'Content', roles: LEADERSHIP_ROLES },
      ],
    },
    {
      title: 'Finance',
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
        { path: '/dashboard/payments/management', icon: DollarSign, label: 'Payment Management' },
        { path: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { path: '/dashboard/users', icon: Users, label: 'User Management' },
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

  const visibleSections = sections
    .map(section => ({ ...section, items: filterItems(section.items) }))
    .filter(section => section.items.length > 0);

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

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-[var(--color-surface)] shadow-xl z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:z-0 w-64 flex-shrink-0 border-r border-[var(--color-border)]`}>
        <div className="flex flex-col h-full">
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

          {/* Navigation links — collapsible sub-sidebars via NestedNav */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <NestedNav sections={visibleSections} onNavigate={() => setIsOpen(false)} />
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
      </div>
    </>
  );
}

export default Sidebar;
