import React, { createContext, useState, useContext, useEffect } from 'react'; 
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'https://vims-backend.onrender.com/api';

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

  const setAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    if (userStr) {
      axios.defaults.headers.common['x-user-data'] = userStr;
    }
  };

  useEffect(() => {
axios.defaults.baseURL = 'https://vims-backend.onrender.com';
    
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    if (userStr) {
      axios.defaults.headers.common['x-user-data'] = userStr;
    }
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

axios.defaults.baseURL = 'https://vims-backend.onrender.com';  
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        axios.defaults.headers.common['x-user-data'] = JSON.stringify(user);
        
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['x-user-data'];
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
    isAuthenticated: !!localStorage.getItem('token')
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};