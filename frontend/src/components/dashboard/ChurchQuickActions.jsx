import { DollarSign, Megaphone, Calendar, Users, FileText, Settings, Plus, Pin, Heart, Building, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ChurchQuickActions = ({ pinnedActions = [] }) => {
  const allActions = [
    { 
      id: 'payment', 
      title: 'Make Payment', 
      description: 'Pay tithe and offerings', 
      icon: DollarSign, 
      category: 'stewardship',
      link: '/dashboard/payments' 
    },
    { 
      id: 'announcement', 
      title: 'New Announcement', 
      description: 'Create announcement', 
      icon: Megaphone, 
      category: 'communication',
      link: '/dashboard/announcements/new' 
    },
    { 
      id: 'event', 
      title: 'Create Event', 
      description: 'Schedule church event', 
      icon: Calendar, 
      category: 'community',
      link: '/dashboard/events/new' 
    },
    { 
      id: 'member', 
      title: 'Add Member', 
      description: 'Register new member', 
      icon: Users, 
      category: 'community',
      link: '/dashboard/members/new' 
    },
    { 
      id: 'document', 
      title: 'Upload Document', 
      description: 'Add to document library', 
      icon: FileText, 
      category: 'resources',
      link: '/dashboard/documents/upload' 
    },
    { 
      id: 'ministry', 
      title: 'Ministry Update', 
      description: 'Share ministry progress', 
      icon: Heart, 
      category: 'ministry',
      link: '/dashboard/ministry/update' 
    },
    { 
      id: 'department', 
      title: 'Department Activity', 
      description: 'Manage department', 
      icon: Building, 
      category: 'community',
      link: '/dashboard/departments' 
    },
    { 
      id: 'approval', 
      title: 'Submit Request', 
      description: 'Request approval', 
      icon: CheckCircle, 
      category: 'governance',
      link: '/dashboard/approvals/submit' 
    },
    { 
      id: 'settings', 
      title: 'Settings', 
      description: 'Manage settings', 
      icon: Settings, 
      category: 'system',
      link: '/dashboard/admin/settings' 
    },
  ];

  const displayActions = pinnedActions.length > 0
    ? allActions.filter(action => pinnedActions.includes(action.id))
    : allActions.slice(0, 6);

  // Group actions by category for community gathering metaphor
  const groupedActions = displayActions.reduce((groups, action) => {
    const category = action.category || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(action);
    return groups;
  }, {});

  const getCategoryColor = (category) => {
    const colors = {
      stewardship: 'bg-[var(--color-success)]-10 text-[var(--color-success)]',
      communication: 'bg-[var(--color-primary)]-10 text-[var(--color-primary)]',
      community: 'bg-[var(--color-accent)]-10 text-[var(--color-accent)]',
      resources: 'bg-[var(--color-surface)] text-[var(--color-textSecondary)]',
      ministry: 'bg-[var(--color-secondary)]-10 text-[var(--color-secondary)]',
      governance: 'bg-[var(--color-warning)]-10 text-[var(--color-warning)]',
      system: 'bg-[var(--color-surface)] text-[var(--color-textSecondary)]',
      general: 'bg-[var(--color-primary)]-10 text-[var(--color-primary)]'
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-[var(--color-text)]">Quick Actions</h3>
        <button 
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]-700 flex items-center gap-1 transition-colors"
          aria-label="Customize quick actions"
        >
          <Pin size={14} aria-hidden="true" />
          Customize
        </button>
      </div>
      
      {/* Community gathering layout - circular/grouped arrangement */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {displayActions.map((action) => {
          const Icon = action.icon;
          const categoryColor = getCategoryColor(action.category);
          
          return (
            <Link
              key={action.id}
              to={action.link}
              className="group flex flex-col items-center p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl hover:shadow-lg hover:border-[var(--color-primary)]-30 transition-all duration-300"
              aria-label={`${action.title}: ${action.description}`}
            >
              {/* Icon with warm interaction */}
              <div className={`p-4 rounded-full ${categoryColor} mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                <Icon size={24} aria-hidden="true" />
              </div>
              
              {/* Text */}
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
      
      {/* Category indicators for community feel */}
      <div className="flex flex-wrap gap-2 mt-4">
        {Object.keys(groupedActions).map((category) => (
          <span 
            key={category}
            className="text-xs px-3 py-1 rounded-full bg-[var(--color-background)] text-[var(--color-textSecondary)] border border-[var(--color-border)]"
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ChurchQuickActions;