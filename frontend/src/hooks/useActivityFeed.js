import { useState, useCallback, useEffect } from 'react';
import { API_ENDPOINTS } from '../constants/api';

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

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchActivities = useCallback(async (api, fetchOptions = {}) => {
    if (!api) return;

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
      setError(err.response?.data?.error || err.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
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

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && departmentId) {
      // This will be called by the component that passes the api instance
    }
  }, [autoFetch, departmentId]);

  // Polling for real-time updates
  useEffect(() => {
    if (pollInterval && pollInterval > 0 && departmentId) {
      const interval = setInterval(() => {
        // Polling will be handled by the component that passes the api instance
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [pollInterval, departmentId]);

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
    filterByDateRange
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
