import React, { createContext, useState, useContext, useEffect } from 'react'; 
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'https://vims-backend.onrender.com/api';
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
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivityAt');
    delete axios.defaults.headers.common.Authorization;
    setIsAuthenticated(false);
  };

  const setLastActivity = () => {
    localStorage.setItem('lastActivityAt', String(Date.now()));
  };

  const isSessionExpired = () => {
    const lastActivityAt = Number(localStorage.getItem('lastActivityAt') || 0);
    if (!lastActivityAt) return false;
    return Date.now() - lastActivityAt > SESSION_TIMEOUT_MS;
  };

  const setAuthHeaders = () => {
    const token = localStorage.getItem('token');
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
    }
  };

  useEffect(() => {
    axios.defaults.baseURL = API_URL;
    
    const token = localStorage.getItem('token');
    if (!token) {
      clearAuthData();
      return;
    }

    if (isSessionExpired()) {
      clearAuthData();
      toast.error('Session expired due to inactivity. Please log in again.');
      window.location.href = '/login';
      return;
    }

    setAuthHeaders();
    setLastActivity();

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
  }, []);

  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        // Only store token and user if account is pre-approved (admin/security)
        // For residents, we don't store the token since they need approval
        if (user.isApproved) {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          setLastActivity();
          setAuthHeaders();
        }
        
        toast.success(response.data.message);
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

 const login = async (email, password) => {
  setLoading(true);
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { 
      email, 
      password 
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

      axios.defaults.baseURL = API_URL;
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
      
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

  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  };

  const value = {
    loading,
    register,
    login,
    logout,
    getCurrentUser,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};