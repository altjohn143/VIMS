import { useState, useEffect, useCallback } from 'react';
import axios from '../config/axios';

/**
 * Custom Hook: useFetch
 * Consolidates repetitive data fetching logic
 * Handles loading, error, and success states automatically
 * 
 * Usage:
 * const { data, loading, error, refetch } = useFetch('/api/payments/stats', {
 *   dependencies: [filterId],
 *   onSuccess: (data) => console.log('Loaded:', data),
 *   onError: (error) => console.error('Failed:', error),
 *   params: { userId: 123 }
 * });
 */
const useFetch = (url, options = {}) => {
  const {
    dependencies = [],
    onSuccess,
    onError,
    params = {},
    autoFetch = true
  } = options;

  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null
  });

  const [isMounted, setIsMounted] = useState(true);

  const fetchData = useCallback(async () => {
    // Reset error on new fetch
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await axios.get(url, { params });

      if (!isMounted) return;

      // Handle success - extract data from response
      const responseData = response.data?.data || response.data;

      setState({
        data: responseData,
        loading: false,
        error: null
      });

      onSuccess?.(responseData);
    } catch (err) {
      if (!isMounted) return;

      // Extract error message
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        'Failed to load data';

      setState({
        data: null,
        loading: false,
        error: errorMessage
      });

      onError?.(errorMessage);
    }
  }, [url, params, onSuccess, onError, isMounted]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (autoFetch && isMounted) {
      fetchData();
    }
    // Include URL and params in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, JSON.stringify(params), ...dependencies]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchData,
    isLoading: state.loading, // Alias for convenience
    isError: !!state.error
  };
};

export default useFetch;
