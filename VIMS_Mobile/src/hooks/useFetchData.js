import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

/**
 * Custom Hook: useFetchData
 * Consolidates repetitive data fetching logic in React Native
 * Handles loading, error, refreshing, and success states
 * 
 * Usage:
 * const { data, loading, error, refreshing, load } = useFetchData('/announcements', {
 *   onSuccess: (data) => console.log('Loaded:', data),
 *   onError: (error) => console.error('Failed:', error)
 * });
 * 
 * // Manual refetch
 * <RefreshControl refreshing={refreshing} onRefresh={load} />
 */
const useFetchData = (endpoint, options = {}) => {
  const {
    onSuccess,
    onError,
    autoFetch = true,
    dependencies = []
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isMounted = useCallback(() => true, []);

  const load = useCallback(async () => {
    try {
      // Determine if this is a refresh or initial load
      const isRefresh = !loading;
      if (isRefresh) setRefreshing(true);

      // Make API request
      const res = await api.get(endpoint);

      if (!isMounted()) return;

      // Check if response indicates success
      if (res.data?.success) {
        const responseData = Array.isArray(res.data.data)
          ? res.data.data
          : res.data.data || [];

        setData(responseData);
        setError('');
        setLoading(false);

        onSuccess?.(responseData);
      } else {
        // Handle API error response
        const errorMsg = res.data?.error || 'Failed to load data';
        setError(errorMsg);
        setData([]);
        setLoading(false);

        onError?.(errorMsg);
      }
    } catch (err) {
      if (!isMounted()) return;

      // Extract error message from various sources
      const errorMsg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to load data';

      console.error(`Error fetching from ${endpoint}:`, errorMsg);

      setError(errorMsg);
      setData([]);
      setLoading(false);

      onError?.(errorMsg);
    } finally {
      if (isMounted()) {
        setRefreshing(false);
      }
    }
  }, [endpoint, onSuccess, onError, isMounted, loading]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, ...dependencies]);

  return {
    // Data states
    data,
    loading,
    error,
    refreshing,

    // Methods
    load, // Manual refetch
    setError, // Manual error setting

    // Convenience aliases
    isLoading: loading,
    isError: !!error,
    isEmpty: data.length === 0,
    hasData: data.length > 0
  };
};

export default useFetchData;
