import { DollarSign, Megaphone, Calendar, Users, FileText, Settings, Plus, Pin } from 'lucide-react';
import { Link } from 'react-router-dom';

const QuickActionsPanel = ({ pinnedActions = [] }) => {
  const allActions = [
    { id: 'payment', title: 'Make Payment', description: 'Pay tithe and offerings', icon: DollarSign, color: 'bg-green-100 text-green-600', link: '/dashboard/payments' },
    { id: 'announcement', title: 'New Announcement', description: 'Create announcement', icon: Megaphone, color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600', link: '/dashboard/announcements/new' },
    { id: 'event', title: 'Create Event', description: 'Schedule church event', icon: Calendar, color: 'bg-purple-100 text-purple-600', link: '/dashboard/events/new' },
    { id: 'member', title: 'Add Member', description: 'Register new member', icon: Users, color: 'bg-orange-100 text-orange-600', link: '/dashboard/members/new' },
    { id: 'document', title: 'Upload Document', description: 'Add to document library', icon: FileText, color: 'bg-[var(--color-surface)] text-[var(--color-textSecondary)]', link: '/dashboard/documents/upload' },
    { id: 'settings', title: 'Settings', description: 'Manage settings', icon: Settings, color: 'bg-[var(--color-surface)] text-[var(--color-textSecondary)]', link: '/dashboard/admin/settings' },
  ];

  const displayActions = pinnedActions.length > 0
    ? allActions.filter(action => pinnedActions.includes(action.id))
    : allActions.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Quick Actions</h3>
        <button className="text-sm text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-700 flex items-center gap-1" aria-label="Customize quick actions">
          <Pin size={14} aria-hidden="true" />
          Customize
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {displayActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              to={action.link}
              className="flex flex-col items-center p-4 bg-[var(--color-surface)] border rounded-lg hover:shadow-md transition-all group"
              aria-label={`${action.title}: ${action.description}`}
            >
              <div className={`p-3 rounded-full ${action.color} mb-2 group-hover:scale-110 transition-transform`}>
                <Icon size={20} aria-hidden="true" />
              </div>
              <span className="text-sm font-medium text-center">{action.title}</span>
              <span className="text-xs text-[var(--color-textSecondary)] text-center mt-1">{action.description}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionsPanel;
