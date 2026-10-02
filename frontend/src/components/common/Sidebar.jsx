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

import { Link, useLocation } from 'react-router-dom';
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

function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const { churchName } = useChurchBranding();
  const { canAccessModule, isAny, isSuperAdmin } = usePermission();
  const location = useLocation();

  // Menu sections, ordered from everyday member tasks down to admin tools.
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
        { path: '/dashboard/payments/my', icon: DollarSign, label: 'My Payments' },
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
        { path: '/dashboard/departments', icon: Building2, label: 'All Departments', roles: LEADERSHIP_ROLES },
        { path: '/dashboard/members', icon: Users, label: 'People' },
        { path: '/dashboard/approvals', icon: CheckSquare, label: 'Approvals' },
        { path: '/dashboard/sms', icon: MessageSquare, label: 'Communications', roles: LEADERSHIP_ROLES },
        { path: '/dashboard/content', icon: FileText, label: 'Content', roles: LEADERSHIP_ROLES },
      ],
    },
    {
      title: 'Finance',
      items: [
        { path: '/dashboard/treasury', icon: Landmark, label: 'Treasury' },
        { path: '/dashboard/payments/management', icon: DollarSign, label: 'Payment Management' },
        { path: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { path: '/dashboard/users', icon: Users, label: 'User Management' },
        { path: '/dashboard/admin', icon: Shield, label: 'Administration' },
        { path: '/dashboard/admin/settings', icon: Settings, label: 'Settings' },
      ],
    },
  ];

  // Filter out items the user cannot reach. Super Admin sees everything.
  const visibleSections = sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (isSuperAdmin()) return true;
        if (item.roles && !isAny(item.roles)) return false;
        return canAccessModule(item.path);
      }),
    }))
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

          {/* Navigation links */}
          <nav className="flex-1 p-4 overflow-y-auto">
            {visibleSections.map((section, si) => (
              <div key={si} className={si > 0 ? 'mt-5' : ''}>
                {section.title && (
                  <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-textSecondary)]">
                    {section.title}
                  </p>
                )}
                <ul className="space-y-1.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={`flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'church-gradient text-[var(--color-on-solid)] shadow-md'
                              : 'text-[var(--color-text)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
                          }`}
                          onClick={() => setIsOpen(false)}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <div className={`p-1.5 rounded-lg mr-3 ${isActive ? 'bg-[color-mix(in_srgb,var(--color-surface)_20%,transparent)]' : 'bg-[var(--color-background)]'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
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
