import { useState, useEffect } from 'react';
import { Clock, User, Calendar, DollarSign, Megaphone, Filter, RefreshCw, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const RealTimeActivityFeed = ({ limit = 20, autoRefresh = true, refreshInterval = 30000 }) => {
  const { api } = useAuth();
  const toast = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    fetchActivities();
    if (autoRefresh) {
      const interval = setInterval(fetchActivities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchActivities = async () => {
    try {
      const response = await api.get(`/dashboard/activity?limit=${limit}`);
      setActivities(response.data.activities || []);
      setIsLive(true);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchActivities();
  };

  const iconMap = {
    payment: DollarSign,
    announcement: Megaphone,
    event: Calendar,
    member: User,
    approval: Bell,
    system: Megaphone
  };

  const colorMap = {
    payment: 'text-green-600',
    announcement: 'text-[var(--color-primary)]-600',
    event: 'text-purple-600',
    member: 'text-orange-600',
    approval: 'text-red-600',
    system: 'text-[var(--color-textSecondary)]'
  };

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);

  const activityTypes = ['all', ...new Set(activities.map(a => a.type))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Activity Feed
        </h3>
        <div className="flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </div>
          )}
          <button
            onClick={handleRefresh}
            className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-50 rounded-lg transition-colors"
            aria-label="Refresh activities"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter */}
      {activityTypes.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-[var(--color-textSecondary)] flex-shrink-0" />
          {activityTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === type
                  ? 'bg-[var(--color-primary)]-600 text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
              }`}
              aria-label={`Filter by ${type}`}
              aria-pressed={filter === type}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      )}

      {filteredActivities.length === 0 ? (
        <div className="text-center text-[var(--color-textSecondary)] py-8">
          <Bell className="h-12 w-12 mx-auto mb-2 text-[var(--color-textSecondary)]" />
          <p>No recent activities</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredActivities.map((activity, index) => {
            const Icon = iconMap[activity.type] || Megaphone;
            return (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 bg-[var(--color-background)] rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                role="listitem"
              >
                <div className={`p-2 rounded-full bg-[var(--color-surface)] ${colorMap[activity.type]} flex-shrink-0`}>
                  <Icon size={16} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{activity.title}</p>
                  <p className="text-xs text-[var(--color-textSecondary)] truncate">{activity.description}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-[var(--color-textSecondary)]">
                    <Clock size={12} aria-hidden="true" />
                    {activity.time}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RealTimeActivityFeed;
