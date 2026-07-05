/**
 * Featured Announcements Component
 * Displays featured announcements on the home page with enhanced design
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { useDataFetch } from '../../hooks/useDataFetch';
import { AnnouncementsEmptyState, ErrorEmptyState } from '../common/EmptyState';

const FeaturedAnnouncements = () => {
  const { data, loading, error, isEmpty, refetch } = useDataFetch(
    '/api/announcements/public?limit=3',
    {
      transform: (result) => result.announcements || []
    }
  );

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'urgent': 
        return { 
          icon: AlertCircle, 
          bg: 'bg-red-50', 
          text: 'text-red-700', 
          border: 'border-red-200',
          label: 'Urgent'
        };
      case 'high': 
        return { 
          icon: AlertCircle, 
          bg: 'bg-orange-50', 
          text: 'text-orange-700', 
          border: 'border-orange-200',
          label: 'High'
        };
      case 'low': 
        return { 
          icon: Info, 
          bg: 'bg-[var(--color-background)]', 
          text: 'text-[var(--color-text)]', 
          border: 'border-[var(--color-border)]',
          label: 'Info'
        };
      default: 
        return { 
          icon: CheckCircle, 
          bg: 'bg-[var(--color-primary)]-50', 
          text: 'text-[var(--color-primary)]-700', 
          border: 'border-[var(--color-primary)]-200',
          label: 'Normal'
        };
    }
  };

  return (
    <section className="py-20 bg-[var(--color-background)]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h2 className="text-4xl font-bold text-[var(--color-text)] mb-2">Latest Announcements</h2>
            <p className="text-[var(--color-textSecondary)]">Stay updated with church news and events</p>
          </div>
          <Link
            to="/announcements"
            className="inline-flex items-center gap-2 text-[var(--color-primary)]-800 hover:text-[var(--color-primary)]-900 font-semibold transition-colors group"
            aria-label="View all announcements"
          >
            <span>View All</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="loading-spinner mx-auto"></div>
            <p className="text-[var(--color-textSecondary)] mt-4">Loading announcements...</p>
          </div>
        ) : error ? (
          <ErrorEmptyState message={error} onRetry={refetch} />
        ) : isEmpty ? (
          <AnnouncementsEmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.map((announcement) => {
              const config = getPriorityConfig(announcement.priority);
              const Icon = config.icon;
              return (
                <div 
                  key={announcement.id} 
                  className="bg-[var(--color-surface)] rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
                >
                  {/* Priority Badge */}
                  <div className={`px-4 py-3 flex items-center justify-between ${config.bg} ${config.border} border-b`}>
                    <div className={`flex items-center gap-2 ${config.text}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className="text-sm font-semibold">{config.label}</span>
                    </div>
                    <span className="text-xs text-[var(--color-textSecondary)]">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-bold text-xl text-[var(--color-text)] mb-3 group-hover:text-[var(--color-primary)]-800 transition-colors">
                      {announcement.title}
                    </h3>
                    <p className="text-[var(--color-textSecondary)] mb-4 line-clamp-3">
                      {announcement.content}
                    </p>
                    
                    <Link
                      to={`/announcements/${announcement.id}`}
                      className="inline-flex items-center gap-2 text-[var(--color-primary)]-800 hover:text-[var(--color-primary)]-900 font-medium transition-colors group"
                      aria-label={`Read more about ${announcement.title}`}
                    >
                      <span>Read more</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedAnnouncements;
