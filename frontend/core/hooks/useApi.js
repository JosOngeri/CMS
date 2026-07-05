/**
 * useApi Hook
 * Generic hook for API calls with loading and error states
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../api/client';

/**
 * Generic API hook for any endpoint
 * @param {Function} apiFunction - API function to call
 * @param {Object} options - Hook options
 * @returns {Object} - { data, loading, error, execute, reset }
 */
export const useApi = (apiFunction, options = {}) => {
  const { 
    initialData = null, 
    immediate = false, 
    onSuccess = null, 
    onError = null,
    params = null 
  } = options;
  
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  
  // Use ref to prevent state updates after unmount
  const isMounted = useRef(true);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  const execute = useCallback(async (...args) => {
    if (!isMounted.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      
      if (isMounted.current) {
        setData(result);
        setLoading(false);
        
        if (onSuccess) {
          onSuccess(result);
        }
      }
      
      return result;
    } catch (err) {
      if (isMounted.current) {
        setError(err.response?.data?.error || err.message || 'An error occurred');
        setLoading(false);
        
        if (onError) {
          onError(err);
        }
      }
      
      throw err;
    }
  }, [apiFunction, onSuccess, onError]);
  
  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);
  
  // Execute immediately if requested
  useEffect(() => {
    if (immediate && params !== undefined) {
      execute(params);
    }
  }, [immediate, execute, params]);
  
  return { data, loading, error, execute, reset, setData };
};

/**
 * Hook for GET requests
 */
export const useGet = (url, options = {}) => {
  const { params = null, ...rest } = options;
  
  const fetchFn = useCallback(async (queryParams) => {
    const queryString = queryParams 
      ? '?' + new URLSearchParams(queryParams).toString()
      : '';
    return api.get(`${url}${queryString}`);
  }, [url]);
  
  return useApi(fetchFn, { params, ...rest });
};

/**
 * Hook for POST requests
 */
export const usePost = (url, options = {}) => {
  const postFn = useCallback(async (data) => {
    return api.post(url, data);
  }, [url]);
  
  return useApi(postFn, options);
};

/**
 * Hook for PUT requests
 */
export const usePut = (url, options = {}) => {
  const putFn = useCallback(async (id, data) => {
    return api.put(`${url}/${id}`, data);
  }, [url]);
  
  return useApi(putFn, options);
};

/**
 * Hook for DELETE requests
 */
export const useDelete = (url, options = {}) => {
  const deleteFn = useCallback(async (id) => {
    return api.delete(`${url}/${id}`);
  }, [url]);
  
  return useApi(deleteFn, options);
};

/**
 * Hook for paginated lists
 */
export const usePaginatedList = (apiFunction, options = {}) => {
  const { pageSize = 10, ...rest } = options;
  
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0
  });
  
  const fetchWithPagination = useCallback(async (params = {}) => {
    const result = await apiFunction({
      ...params,
      page: pagination.page,
      limit: pagination.pageSize
    });
    
    if (result.pagination) {
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total || 0,
        totalPages: result.pagination.totalPages || 
          Math.ceil((result.pagination.total || 0) / pagination.pageSize)
      }));
    }
    
    return result;
  }, [apiFunction, pagination.page, pagination.pageSize]);
  
  const { data, loading, error, execute, reset } = useApi(
    fetchWithPagination,
    { ...rest, immediate: false }
  );
  
  const goToPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);
  
  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [pagination.page, pagination.totalPages]);
  
  const previousPage = useCallback(() => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  }, [pagination.page]);
  
  return {
    data,
    loading,
    error,
    pagination,
    execute,
    reset,
    goToPage,
    nextPage,
    previousPage,
    refresh: execute
  };
};

export default useApi;
