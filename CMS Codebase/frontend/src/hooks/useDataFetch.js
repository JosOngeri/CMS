import { useState, useEffect } from 'react';

/**
 * Custom hook for data fetching with consistent error and empty state handling
 * @param {string} url - The API endpoint to fetch from
 * @param {Object} options - Additional options
 * @param {Object} options.initialData - Initial data state
 * @param {boolean} options.enabled - Whether to enable the fetch (default: true)
 * @param {Array} options.dependencies - Dependencies for useEffect (default: [])
 * @param {Function} options.transform - Function to transform the response data
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useDataFetch = (url, options = {}) => {
  const {
    initialData = null,
    enabled = true,
    dependencies = [],
    transform = (data) => data
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    if (!enabled) return;

    const controller = new AbortController();
    const { signal } = controller;
    let retryCount = 0;
    const maxRetries = 3;

    const attemptFetch = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(url, {
          signal,
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          // Retry on 5xx errors and network errors
          if (retryCount < maxRetries) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
            await new Promise(resolve => setTimeout(resolve, delay));
            return attemptFetch();
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const transformedData = transform(result);
        setData(transformedData);
      } catch (err) {
        if (err.name === 'AbortError') {
          // Ignore cancellation caused by component unmount or dependency change
          return;
        }
        // Retry on network errors
        if (retryCount < maxRetries && !err.message.includes('HTTP error')) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptFetch();
        }
        console.error(`Failed to fetch data from ${url}:`, err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    attemptFetch();

    return () => controller.abort();
  };

  useEffect(() => {
    const cleanup = fetchData();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [enabled, url, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isEmpty: !loading && !error && (!data || (Array.isArray(data) && data.length === 0))
  };
};

/**
 * Custom hook for paginated data fetching
 * @param {string} url - The API endpoint to fetch from
 * @param {Object} options - Additional options
 * @returns {Object} - { data, loading, error, pagination, refetch, setPage }
 */
export const usePaginatedFetch = (url, options = {}) => {
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Properly construct URL with page parameter using URLSearchParams
  const constructUrl = (baseUrl, pageNum) => {
    const urlObj = new URL(baseUrl, window.location.origin);
    urlObj.searchParams.set('page', pageNum);
    return urlObj.pathname + urlObj.search;
  };

  const { data, loading, error, refetch, isEmpty } = useDataFetch(
    constructUrl(url, page),
    {
      ...options,
      transform: (result) => {
        setPagination(result.data?.pagination || null);
        return options.transform ? options.transform(result) : result;
      }
    }
  );

  return {
    data,
    loading,
    error,
    pagination,
    refetch,
    setPage,
    isEmpty
  };
};
