/**
 * WHAT THIS FILE DOES
 * -------------------
 * A grid of shortcut buttons that take the user to the most common tasks.
 * Only buttons the user is allowed to use are shown, based on their
 * permissions.
 *
 * FILES IT TALKS TO
 * -----------------
 * - hooks/usePermission.js → filters actions by required permission
 * - React Router <Link>    → navigates to real dashboard routes
 */

import { DollarSign, Megaphone, Calendar, Users, FileText, Building, CheckCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';

const ChurchQuickActions = ({ limit = 6 }) => {
  const { can } = usePermission();

  const allActions = [
    {
      id: 'payment',
      title: 'Make Payment',
      description: 'Pay tithe and offerings',
      icon: DollarSign,
      link: '/dashboard/payments/my',
      permission: 'payments.view_own',
    },
    {
      id: 'announcement',
      title: 'Announcements',
      description: 'Read or share church news',
      icon: Megaphone,
      link: '/dashboard/announcements',
      permission: 'announcements.view',
    },
    {
      id: 'event',
      title: 'Events',
      description: 'View the church calendar',
      icon: Calendar,
      link: '/dashboard/events',
      permission: 'events.view',
    },
    {
      id: 'member',
      title: 'People',
      description: 'View church members',
      icon: Users,
      link: '/dashboard/members',
      permission: 'members.view',
    },
    {
      id: 'document',
      title: 'Documents',
      description: 'Open documents and resources',
      icon: FileText,
      link: '/dashboard/documents',
      permission: 'documents.view',
    },
    {
      id: 'department',
      title: 'Departments',
      description: 'Manage your departments',
      icon: Building,
      link: '/dashboard/departments',
      permission: 'departments.view',
    },
    {
      id: 'approval',
      title: 'Approvals',
      description: 'Requests needing attention',
      icon: CheckCircle,
      link: '/dashboard/approvals',
      permission: 'approvals.view',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Admin and system settings',
      icon: Settings,
      link: '/dashboard/admin/settings',
      permission: 'settings.view',
    },
  ];

  const visibleActions = allActions.filter(a => can(a.permission)).slice(0, limit);

  return (
    <div>
      <h3 className="font-semibold text-lg text-[var(--color-text)] mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              to={action.link}
              className="group flex flex-col items-center p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl hover:shadow-lg hover:border-[var(--color-primary-light)] transition-all"
            >
              <div className="p-4 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] mb-3 group-hover:scale-110 transition-transform">
                <Icon size={24} aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-[var(--color-text)] text-center mb-1">
                {action.title}
              </span>
              <span className="text-xs text-[var(--color-textSecondary)] text-center">
                {action.description}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ChurchQuickActions;
