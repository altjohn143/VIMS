// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import api from '../utils/api';
import { registerForPushNotifications, unregisterPushToken } from '../utils/notifications';
import {
  getAuthToken,
  getStoredPushToken,
  removeAuthToken,
  removeStoredPushToken,
  setAuthToken,
  setStoredPushToken,
} from '../utils/secureSession';

const AuthContext = createContext({});
const debugLog = (...args) => {
  if (__DEV__) console.log(...args);
};
const ROLE_SESSION_GRACE_MS = {
  resident: 5 * 60 * 1000,
  admin: 10 * 60 * 1000,
  security: 10 * 60 * 1000,
};
const DEFAULT_SESSION_GRACE_MS = ROLE_SESSION_GRACE_MS.resident;
const AUTH_REFRESH_TIMEOUT_MS = 8000;
const LOGIN_TIMEOUT_MS = 45000;
const LOGIN_RETRY_TIMEOUT_MS = 30000;
const BACKEND_WARM_TIMEOUT_MS = 10000;

const getSessionGraceMs = (role) => ROLE_SESSION_GRACE_MS[role] || DEFAULT_SESSION_GRACE_MS;
const isTransientAuthRefreshError = (error) => (
  error?.config?.url === '/auth/me' &&
  !error?.response &&
  (
    error?.code === 'ECONNABORTED' ||
    error?.name === 'AbortError' ||
    /aborted|timed out|network request failed/i.test(error?.message || '')
  )
);
const isRequestTimeout = (error) => (
  !error?.response &&
  (
    error?.code === 'ECONNABORTED' ||
    error?.name === 'AbortError' ||
    /aborted|timed out|network request failed/i.test(error?.message || '')
  )
);

const parseStoredUserRole = (storedUser) => {
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser)?.role || null;
  } catch {
    return null;
  }
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadStoredData();
  }, []);

  useEffect(() => {
    let currentState = AppState.currentState;

    const handleAppStateChange = async (nextState) => {
      const wasBackgrounded = currentState.match(/inactive|background/);

      if (nextState.match(/inactive|background/)) {
        await AsyncStorage.setItem('lastBackgroundedAt', String(Date.now()));
      }

      if (wasBackgrounded && nextState === 'active') {
        const lastBackgroundedAt = Number(await AsyncStorage.getItem('lastBackgroundedAt') || 0);
        const storedUser = await AsyncStorage.getItem('user');
        const role = parseStoredUserRole(storedUser);
        if (lastBackgroundedAt && Date.now() - lastBackgroundedAt > getSessionGraceMs(role)) {
          await clearStoredSession();
          await removeStoredPushToken();
          await AsyncStorage.removeItem('lastBackgroundedAt');
        }
      }

      currentState = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const normalizeUser = (incomingUser, previousUser = null) => {
    if (!incomingUser) return incomingUser;
    return {
      ...previousUser,
      ...incomingUser,
      securityLevel: incomingUser.securityLevel || previousUser?.securityLevel || null,
    };
  };

  const persistUser = async (incomingUser, previousUser = null) => {
    const normalizedUser = normalizeUser(incomingUser, previousUser);
    if (!normalizedUser) return null;
    await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    return normalizedUser;
  };

  const clearStoredSession = async () => {
    await removeAuthToken();
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('lastBackgroundedAt');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  const syncPushToken = async () => {
    try {
      const result = await registerForPushNotifications();
      if (result.success && result.token) {
        await setStoredPushToken(result.token);
      }
    } catch (error) {
      console.log('Push notification registration skipped:', error?.message || error);
    }
  };

  const loadStoredData = async () => {
    try {
      const [token, userData, lastBackgroundedValue] = await Promise.all([
        getAuthToken(),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('lastBackgroundedAt'),
      ]);
      const lastBackgroundedAt = Number(lastBackgroundedValue || 0);
      let storedUser = null;

      if (userData) {
        try {
          storedUser = JSON.parse(userData);
        } catch {
          await clearStoredSession();
          return;
        }
      }

      if (token && lastBackgroundedAt && Date.now() - lastBackgroundedAt > getSessionGraceMs(storedUser?.role)) {
        await clearStoredSession();
        return;
      }
      
      if (token && userData) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
          setIsLoading(false);
        }

        const response = await api.get('/auth/me', { timeout: AUTH_REFRESH_TIMEOUT_MS });
        if (response.data?.success && response.data?.user) {
          const serverUser = response.data.user;
          const storedId = storedUser?._id || storedUser?.id;
          const serverId = serverUser?._id || serverUser?.id;
          const sameStoredSession =
            !storedId ||
            !serverId ||
            (String(storedId) === String(serverId) && (!storedUser?.role || storedUser.role === serverUser.role));

          await persistUser(serverUser, sameStoredSession ? storedUser : null);
          setIsAuthenticated(true);
        } else {
          await clearStoredSession();
          return;
        }
        syncPushToken();
      } else {
        await clearStoredSession();
      }
    } catch (error) {
      if (isTransientAuthRefreshError(error)) {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          try {
            const storedUser = JSON.parse(userData);
            setUser(storedUser);
            setIsAuthenticated(true);
            console.warn('Auth refresh timed out; keeping stored session until the next successful check.');
            return;
          } catch {
            // Fall through to clearing corrupted session data.
          }
        }
      }
      console.error('Error loading stored data:', error);
      await clearStoredSession();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password, expectedRole) => {
    try {
      debugLog('Attempting login for:', email);
      debugLog('API URL:', api.defaults.baseURL);
      
      // Make sure no Authorization header is set for login
      delete api.defaults.headers.common['Authorization'];

      const loginPayload = {
        email: email.trim().toLowerCase(),
        password: password,
        expectedRole
      };

      const submitLogin = (timeout = LOGIN_TIMEOUT_MS) => api.post('/auth/login', loginPayload, { timeout });
      let response;
      try {
        response = await submitLogin();
      } catch (loginError) {
        if (!isRequestTimeout(loginError)) throw loginError;
        console.warn('Login timed out; warming backend and retrying once with a shorter timeout.');
        await api.get('/health', { timeout: BACKEND_WARM_TIMEOUT_MS }).catch(() => null);
        response = await submitLogin(LOGIN_RETRY_TIMEOUT_MS);
      }
      
      debugLog('Login response status:', response.status);
      
      if (response.data.success) {
        const { token, user } = response.data;

        await setAuthToken(token);
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const normalizedUser = await persistUser(user);
        setIsAuthenticated(true);
        syncPushToken();
        
        return { success: true, user: normalizedUser };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('❌ Login error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          headers: error.config?.headers
        }
      });
      
      // Return the error response so the component can handle it
      if (error.response) {
        return { 
          success: false, 
          error: error.response.data?.error || 'Login failed',
          status: error.response.status,
          requiresApproval: error.response.data?.requiresApproval
        };
      }
      
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      // Make sure no Authorization header is set for register
      delete api.defaults.headers.common['Authorization'];
      
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        return { success: true, message: response.data.message };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      const pushToken = await getStoredPushToken();
      if (pushToken) {
        await unregisterPushToken(pushToken).catch(() => null);
      }
      await AsyncStorage.removeItem('user');
      await removeStoredPushToken();
      await clearStoredSession();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = async (updatedUser) => {
    try {
      if (!updatedUser) return;
      await persistUser(updatedUser, user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    getCurrentUser: () => user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
