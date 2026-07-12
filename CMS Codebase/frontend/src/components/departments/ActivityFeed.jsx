import React, { useState, useEffect } from 'react';
import {
  Users,
  UserMinus,
  MessageSquare,
  Calendar,
  CheckSquare,
  CheckCircle,
  Clock,
  CheckCircle2,
  Shield,
  FolderOpen,
  Filter,
  RefreshCw,
  ChevronRight,
  MoreVertical,
  X,
  FileText,
  Check,
  X as XIcon
} from 'lucide-react';
import { useActivityFeed } from '../../hooks/useActivityFeed';

const ActivityFeed = ({ departmentId, api, limit = 10, showViewAll = false, onViewAllClick, onActivityClick, onActionClick }) => {
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  const {
    activities,
    loading,
    error,
    hasMore,
    fetchActivities,
    refresh,
    filterByType
  } = useActivityFeed(departmentId, { limit, autoFetch: false });

  useEffect(() => {
    if (api && departmentId) {
      fetchActivities(api);
    }
  }, [api, departmentId, fetchActivities]);

  const handleFilterChange = (newType) => {
    setFilterType(newType);
    filterByType(api, newType);
  };

  const handleRefresh = () => {
    refresh(api);
  };

  const handleBulkAction = async (action) => {
    const pendingActions = getPendingActions();
    if (pendingActions.length === 0) return;

    setIsProcessingBulk(true);
    let successCount = 0;
    let failureCount = 0;

    // Process each pending action with delay to avoid rate limiting
    for (const activity of pendingActions) {
      try {
        await onActionClick?.(activity, action);
        successCount++;
        // Add delay between requests to avoid rate limiting (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Failed to process action:', error);
        failureCount++;
        // Wait longer on error to avoid further rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsProcessingBulk(false);
    
    // Refresh the activity feed after bulk actions complete
    refresh(api);
  };

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'member_joined':
        return <Users className="w-4 h-4 text-green-600" aria-hidden="true" />;
      case 'member_left':
        return <UserMinus className="w-4 h-4 text-red-600" aria-hidden="true" />;
      case 'communication':
        return <MessageSquare className="w-4 h-4 text-[var(--color-primary)]-600" aria-hidden="true" />;
      case 'meeting_created':
        return <Calendar className="w-4 h-4 text-purple-600" aria-hidden="true" />;
      case 'task_created':
        return <CheckSquare className="w-4 h-4 text-orange-600" aria-hidden="true" />;
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />;
      case 'approval_requested':
        return <Clock className="w-4 h-4 text-yellow-600" aria-hidden="true" />;
      case 'approval_approved':
        return <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />;
      case 'approval_rejected':
        return <X className="w-4 h-4 text-red-600" aria-hidden="true" />;
      case 'admin_granted':
        return <Shield className="w-4 h-4 text-[var(--color-primary)]-600" aria-hidden="true" />;
      case 'admin_revoked':
        return <Shield className="w-4 h-4 text-[var(--color-textSecondary)]" aria-hidden="true" />;
      case 'resource_added':
        return <FolderOpen className="w-4 h-4 text-[var(--color-textSecondary)]" aria-hidden="true" />;
      case 'user_action':
        return <FileText className="w-4 h-4 text-[var(--color-textSecondary)]" aria-hidden="true" />;
      default:
        return <MessageSquare className="w-4 h-4 text-[var(--color-textSecondary)]" aria-hidden="true" />;
    }
  };

  const getActivityColor = (activityType) => {
    switch (activityType) {
      case 'member_joined':
        return 'bg-green-100';
      case 'member_left':
        return 'bg-red-100';
      case 'communication':
        return 'bg-[var(--color-primary)]-100';
      case 'meeting_created':
        return 'bg-purple-100';
      case 'task_created':
        return 'bg-orange-100';
      case 'task_completed':
        return 'bg-green-100';
      case 'approval_requested':
        return 'bg-yellow-100';
      case 'approval_approved':
        return 'bg-green-100';
      case 'approval_rejected':
        return 'bg-red-100';
      case 'admin_granted':
        return 'bg-[var(--color-primary)]-100';
      case 'admin_revoked':
        return 'bg-[var(--color-surface)]';
      case 'resource_added':
        return 'bg-[var(--color-surface)]';
      case 'user_action':
        return 'bg-[var(--color-surface)]';
      default:
        return 'bg-[var(--color-surface)]';
    }
  };

  const getActivityLabel = (activityType) => {
    switch (activityType) {
      case 'member_joined':
        return 'Member Joined';
      case 'member_left':
        return 'Member Left';
      case 'communication':
        return 'Communication';
      case 'meeting_created':
        return 'Meeting Created';
      case 'task_created':
        return 'Task Created';
      case 'task_completed':
        return 'Task Completed';
      case 'approval_requested':
        return 'Approval Requested';
      case 'approval_approved':
        return 'Approval Approved';
      case 'approval_rejected':
        return 'Approval Rejected';
      case 'admin_granted':
        return 'Admin Granted';
      case 'admin_revoked':
        return 'Admin Revoked';
      case 'resource_added':
        return 'Resource Added';
      case 'user_action':
        return 'User Action';
      default:
        return 'Activity';
    }
  };

  const needsAction = (activity) => {
    return activity.activity_type === 'approval_requested' && 
           activity.metadata?.status === 'pending';
  };

  const getPendingActions = () => {
    return activities.filter(needsAction);
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filterOptions = [
    { id: 'all', label: 'All Activities' },
    { id: 'communication', label: 'Communications' },
    { id: 'meeting_created', label: 'Meetings' },
    { id: 'task_created', label: 'Tasks' },
    { id: 'task_completed', label: 'Completed Tasks' },
    { id: 'member_joined', label: 'New Members' },
    { id: 'resource_added', label: 'Resources' },
    { id: 'user_action', label: 'User Actions' },
  ];

  if (loading && activities.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Error loading activities</p>
          <p className="text-sm text-[var(--color-textSecondary)]">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors min-h-[44px]"
            aria-label="Retry loading activities"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Recent Activity</h2>
            {getPendingActions().length > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                {getPendingActions().length} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getPendingActions().length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors min-h-[36px]"
                  aria-label="Approve all pending actions"
                  aria-busy={isProcessingBulk}
                >
                  <Check className="w-3 h-3" aria-hidden="true" />
                  Approve All
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors min-h-[36px]"
                  aria-label="Reject all pending actions"
                  aria-busy={isProcessingBulk}
                >
                  <XIcon className="w-3 h-3" aria-hidden="true" />
                  Reject All
                </button>
              </div>
            )}
            <button
              onClick={handleRefresh}
              className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Refresh"
              aria-label="Refresh activities"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Filter"
              aria-label="Toggle filters"
            >
              <Filter className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Filter Dropdown */}
        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleFilterChange(option.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors min-h-[36px] ${
                  filterType === option.id
                    ? 'bg-[var(--color-primary)]-600 text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                }`}
                aria-label={`Filter by ${option.label}`}
                aria-pressed={filterType === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="divide-y divide-[var(--color-border)]">
        {activities.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[var(--color-textSecondary)]">No recent activity</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div 
              key={`${activity.activity_type}-${activity.id}-${index}`} 
              className={`p-4 hover:bg-[var(--color-background)] transition-colors cursor-pointer ${needsAction(activity) ? 'bg-yellow-50' : ''}`}
              onClick={() => onActivityClick?.(activity)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getActivityColor(activity.activity_type)}`}>
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">
                      {activity.title || getActivityLabel(activity.activity_type)}
                      {needsAction(activity) && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                          Action Required
                        </span>
                      )}
                    </p>
                    <span className="text-xs text-[var(--color-textSecondary)] whitespace-nowrap">
                      {getRelativeTime(activity.created_at)}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-[var(--color-textSecondary)] mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  {activity.actor_name && (
                    <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                      by {activity.actor_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {(showViewAll || hasMore) && (
        <div className="p-4 border-t border-[var(--color-border)]">
          {showViewAll && onViewAllClick && (
            <button
              onClick={onViewAllClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-700 transition-colors min-h-[44px]"
              aria-label="View all activity"
            >
              View All Activity
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          {hasMore && !showViewAll && (
            <button
              onClick={() => {/* Load more logic would go here */}}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)] text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)] transition-colors min-h-[44px]"
              aria-label="Load more activities"
            >
              Load More
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
