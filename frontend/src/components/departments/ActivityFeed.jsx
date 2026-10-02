/**
 * WHAT THIS COMPONENT DOES
 * ------------------------
 * The "Recent Activity" feed used inside a department dashboard. Lists
 * member joins, communications, meetings, tasks, approvals etc. with
 * filter chips, refresh, "approve/reject all pending" bulk actions, and
 * Load More pagination.
 *
 * FILES IT TALKS TO
 * -----------------
 * - hooks/useActivityFeed.js                → data fetching + pagination
 * - backend /departments/:id/activities      → activity list (via the hook)
 * - Parent supplies onActivityClick / onActionClick for approvals
 */

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
    filterByType,
    loadMore
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
        return <Users className="w-4 h-4 text-[var(--color-success)]" aria-hidden="true" />;
      case 'member_left':
        return <UserMinus className="w-4 h-4 text-[var(--color-error)]" aria-hidden="true" />;
      case 'communication':
        return <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />;
      case 'meeting_created':
        return <Calendar className="w-4 h-4 text-[var(--color-accent)]" aria-hidden="true" />;
      case 'task_created':
        return <CheckSquare className="w-4 h-4 text-[var(--color-warning)]" aria-hidden="true" />;
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-[var(--color-success)]" aria-hidden="true" />;
      case 'approval_requested':
        return <Clock className="w-4 h-4 text-[var(--color-warning)]" aria-hidden="true" />;
      case 'approval_approved':
        return <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" aria-hidden="true" />;
      case 'approval_rejected':
        return <X className="w-4 h-4 text-[var(--color-error)]" aria-hidden="true" />;
      case 'admin_granted':
        return <Shield className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />;
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
        return 'bg-[var(--color-success-light)]';
      case 'member_left':
        return 'bg-[var(--color-error-light)]';
      case 'communication':
        return 'bg-[var(--color-primary-light)]';
      case 'meeting_created':
        return 'bg-[var(--color-accent-light)]';
      case 'task_created':
        return 'bg-[var(--color-warning-light)]';
      case 'task_completed':
        return 'bg-[var(--color-success-light)]';
      case 'approval_requested':
        return 'bg-[var(--color-warning-light)]';
      case 'approval_approved':
        return 'bg-[var(--color-success-light)]';
      case 'approval_rejected':
        return 'bg-[var(--color-error-light)]';
      case 'admin_granted':
        return 'bg-[var(--color-primary-light)]';
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
        <div className="text-center py-8">
          <p className="text-[var(--color-error)] mb-2">Error loading activities</p>
          <p className="text-sm text-[var(--color-textSecondary)]">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:bg-[var(--color-primary)] transition-colors min-h-[44px]"
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
              <span className="px-2 py-1 bg-[var(--color-warning-light)] text-[var(--color-warning)] text-xs font-medium rounded-full">
                {getPendingActions().length} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getPendingActions().length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-success)] text-[var(--color-on-solid)] text-xs rounded-lg hover:opacity-90 transition-colors min-h-[44px]"
                  aria-label="Approve all pending actions"
                  aria-busy={isProcessingBulk}
                >
                  <Check className="w-3 h-3" aria-hidden="true" />
                  Approve All
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-error)] text-[var(--color-on-solid)] text-xs rounded-lg hover:opacity-90 transition-colors min-h-[44px]"
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
              className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Refresh"
              aria-label="Refresh activities"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                className={`px-3 py-1.5 rounded-full text-sm transition-colors min-h-[44px] ${
                  filterType === option.id
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-solid)]'
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
              className={`p-4 hover:bg-[var(--color-background)] transition-colors cursor-pointer ${needsAction(activity) ? 'bg-[var(--color-warning-light)]' : ''}`}
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
                        <span className="ml-2 px-2 py-0.5 bg-[var(--color-warning-light)] text-[var(--color-warning)] text-xs rounded-full">
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
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors min-h-[44px]"
              aria-label="View all activity"
            >
              View All Activity
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          {hasMore && !showViewAll && (
            <button
              onClick={() => loadMore(api)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors min-h-[44px]"
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
