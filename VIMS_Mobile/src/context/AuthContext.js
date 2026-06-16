// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { registerForPushNotifications, unregisterPushToken } from '../utils/notifications';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadStoredData();
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

  const syncPushToken = async () => {
    try {
      const result = await registerForPushNotifications();
      if (result.success && result.token) {
        await AsyncStorage.setItem('pushToken', result.token);
      }
    } catch (error) {
      console.log('Push notification registration skipped:', error?.message || error);
    }
  };

  const loadStoredData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (token && userData) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const storedUser = JSON.parse(userData);
        setUser(storedUser);
        setIsAuthenticated(true);

        const response = await api.get('/auth/me');
        if (response.data?.success && response.data?.user) {
          await persistUser(response.data.user, storedUser);
        }
        syncPushToken();
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password, expectedRole) => {
    try {
      console.log('🔐 Attempting login for:', email);
      console.log('📡 API URL:', api.defaults.baseURL);
      
      // Make sure no Authorization header is set for login
      delete api.defaults.headers.common['Authorization'];
      
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: password,
        expectedRole
      });
      
      console.log('📥 Login response status:', response.status);
      console.log('📥 Login response data:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        const { token, user } = response.data;

        await AsyncStorage.setItem('token', token);
        
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
      const pushToken = await AsyncStorage.getItem('pushToken');
      if (pushToken) {
        await unregisterPushToken(pushToken).catch(() => null);
      }
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('pushToken');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
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
