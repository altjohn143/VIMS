import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'; 
import axios from '../config/axios';
import toast from 'react-hot-toast';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivityAt');
    delete axios.defaults.headers.common.Authorization;
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const setLastActivity = () => {
    localStorage.setItem('lastActivityAt', String(Date.now()));
  };

  const isSessionExpired = () => {
    const lastActivityAt = Number(localStorage.getItem('lastActivityAt') || 0);
    if (!lastActivityAt) return false;
    return Date.now() - lastActivityAt > SESSION_TIMEOUT_MS;
  };

  const setAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await axios.get('/api/auth/me');
    if (!response.data?.success || !response.data?.user) {
      throw new Error('Unable to load session');
    }
    const user = response.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
    return user;
  }, []);

  const bootstrapAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      clearAuthData();
      setBootstrapping(false);
      return;
    }

    if (isSessionExpired()) {
      clearAuthData();
      toast.error('Session expired due to inactivity. Please log in again.');
      setBootstrapping(false);
      window.location.href = '/login';
      return;
    }

    try {
      setAuthHeaders();
      await refreshUser();
      setLastActivity();
    } catch (error) {
      clearAuthData();
    } finally {
      setBootstrapping(false);
    }
  }, [refreshUser, setAuthHeaders]);

  useEffect(() => {
    bootstrapAuth();

    const handleActivity = () => {
      if (localStorage.getItem('token')) {
        setLastActivity();
      }
    };

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, handleActivity));

    const intervalId = window.setInterval(() => {
      if (!localStorage.getItem('token')) return;
      if (isSessionExpired()) {
        clearAuthData();
        toast.error('Session expired due to inactivity. Please log in again.');
        window.location.href = '/login';
      }
    }, 15000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      window.clearInterval(intervalId);
    };
  }, [bootstrapAuth]);

  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/register', userData);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        // Store token and user for successful registrations so the client can perform follow-up actions
        if (token) {
          localStorage.setItem('token', token);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          setLastActivity();
          setAuthHeaders();
        }

        if (user?.isApproved) {
          toast.success(response.data.message);
        }

        return { success: true, user, message: response.data.message };
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

const login = async (email, password, expectedRole) => {
  setLoading(true);
  try {
      const response = await axios.post('/api/auth/login', { 
      email, 
      password,
      expectedRole
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setLastActivity();
      setAuthHeaders();
      await refreshUser();
      
      toast.success('Login successful!');
      return { success: true, user };
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Check for pending approval error (403 status)
    if (error.response?.status === 403 && error.response?.data?.requiresApproval) {
      toast.error(error.response?.data?.error || 'Account pending approval');
      return { 
        success: false, 
        error: error.response?.data?.error || 'Account pending approval',
        requiresApproval: true 
      };
    }
    
    const message = error.response?.data?.error || 'Login failed';
    toast.error(message);
    return { success: false, error: message };
  } finally {
    setLoading(false);
  }
};

  const logout = () => {
    clearAuthData();
    toast.success('Logged out successfully');
    
    window.location.href = '/login';  
  };

  const getCurrentUser = () => currentUser;

  const value = {
    loading,
    register,
    login,
    logout,
    getCurrentUser,
    isAuthenticated,
    currentUser,
    bootstrapping,
    refreshUser,
    bootstrapAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};