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

  const fetchData = async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const transformedData = transform(result);
      setData(transformedData);
    } catch (err) {
      console.error(`Failed to fetch data from ${url}:`, err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [enabled, ...dependencies]);

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

  const { data, loading, error, refetch, isEmpty } = useDataFetch(
    `${url}${url.includes('?') ? '&' : '?'}page=${page}`,
    {
      ...options,
      transform: (result) => {
        setPagination(result.pagination || null);
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
