import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://vims-backend.onrender.com/api';
const API_BASE_URL = API_URL.replace(/\/api\/?$/, '');

// Set default base URL
axios.defaults.baseURL = API_BASE_URL;

// Add request interceptor to add token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 403 && error.response?.data?.requiresApproval) {
      window.location.href = '/pending-approval';
    }
    return Promise.reject(error);
  }
);

export default axios;