import { useState, useCallback, useEffect } from 'react';
import { API_ENDPOINTS } from '../constants/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for fetching and managing department activity feed data
 * @param {string} departmentId - The department ID
 * @param {Object} options - Configuration options
 * @param {number} options.limit - Number of items to fetch per page
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.type - Filter by activity type
 * @param {string} options.startDate - Start date for filtering
 * @param {string} options.endDate - End date for filtering
 * @param {boolean} options.autoFetch - Whether to auto-fetch on mount
 * @param {number} options.pollInterval - Polling interval in milliseconds (optional)
 */
export const useActivityFeed = (departmentId, options = {}) => {
  const {
    limit = 20,
    offset = 0,
    type = null,
    startDate = null,
    endDate = null,
    autoFetch = true,
    pollInterval = null
  } = options;

  const { api } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchActivities = useCallback(async (api, fetchOptions = {}) => {
    if (!api) return;

    let retryCount = 0;
    const maxRetries = 2;

    const attemptFetch = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.append('limit', fetchOptions.limit || limit);
        params.append('offset', fetchOptions.offset || offset);

        if (fetchOptions.type || type) {
          params.append('type', fetchOptions.type || type);
        }
        if (fetchOptions.startDate || startDate) {
          params.append('startDate', fetchOptions.startDate || startDate);
        }
        if (fetchOptions.endDate || endDate) {
          params.append('endDate', fetchOptions.endDate || endDate);
        }

        const response = await api.get(
          `${API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.ACTIVITY_FEED(departmentId)}?${params.toString()}`
        );

        if (response.data.success) {
          const newActivities = response.data.data;
          setActivities(newActivities);
          setHasMore(response.data.pagination.hasMore);
          setTotalCount(response.data.pagination.total);
        } else {
          setError(response.data.error || 'Failed to fetch activities');
        }
      } catch (err) {
        console.error('Error fetching activity feed:', err);
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptFetch();
        } else {
          setError(err.response?.data?.error || err.message || 'Failed to fetch activities');
        }
      } finally {
        setLoading(false);
      }
    };

    await attemptFetch();
  }, [departmentId, limit, offset, type, startDate, endDate]);

  const loadMore = useCallback((api) => {
    const currentOffset = activities.length;
    fetchActivities(api, { offset: currentOffset });
  }, [activities.length, fetchActivities]);

  const refresh = useCallback((api) => {
    fetchActivities(api, { offset: 0 });
  }, [fetchActivities]);

  const filterByType = useCallback((api, newType) => {
    fetchActivities(api, { type: newType, offset: 0 });
  }, [fetchActivities]);

  const filterByDateRange = useCallback((api, newStartDate, newEndDate) => {
    fetchActivities(api, { startDate: newStartDate, endDate: newEndDate, offset: 0 });
  }, [fetchActivities]);

  const addActivity = useCallback(async (api, newActivity) => {
    // Optimistic update: immediately add to local state
    const tempId = `temp-${Date.now()}`;
    const optimisticActivity = { ...newActivity, id: tempId, isOptimistic: true };
    setActivities(prev => [optimisticActivity, ...prev]);

    try {
      // In a real implementation, you would call an API to create the activity
      // const response = await api.post(`${API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.ACTIVITY_FEED(departmentId)}`, newActivity);
      // if (response.data.success) {
      //   setActivities(prev => prev.map(a => a.id === tempId ? response.data.data : a));
      // }
      // For now, we'll just keep the optimistic update
    } catch (err) {
      // Revert on error
      setActivities(prev => prev.filter(a => a.id !== tempId));
      console.error('Error adding activity:', err);
      throw err;
    }
  }, [departmentId]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && departmentId) {
      fetchActivities(api);
    }
  }, [autoFetch, departmentId, api, fetchActivities]);

  // Polling for real-time updates
  useEffect(() => {
    if (pollInterval && pollInterval > 0 && departmentId) {
      const interval = setInterval(() => {
        fetchActivities(api);
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [pollInterval, departmentId, api, fetchActivities]);

  return {
    activities,
    loading,
    error,
    hasMore,
    totalCount,
    fetchActivities,
    loadMore,
    refresh,
    filterByType,
    filterByDateRange,
    addActivity
  };
};

/**
 * Custom hook for fetching activity summary statistics
 * @param {string} departmentId - The department ID
 */
export const useActivitySummary = (departmentId) => {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async (api) => {
    if (!api || !departmentId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(
        API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.ACTIVITY_SUMMARY(departmentId)
      );

      if (response.data.success) {
        setSummary(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch activity summary');
      }
    } catch (err) {
      console.error('Error fetching activity summary:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch activity summary');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  return {
    summary,
    loading,
    error,
    fetchSummary
  };
};
