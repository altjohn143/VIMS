import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://vims-backend.onrender.com/api';
const API_BASE_URL = API_URL.replace(/\/api\/?$/, '');

// Set default base URL
axios.defaults.baseURL = API_BASE_URL;

// Add request interceptor to add token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
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
    const requestUrl = error.config?.url || '';
    const isLoginRequest = /\/auth\/login(?:[/?#]|$)/.test(requestUrl);
    const hadAuthenticatedSession = Boolean(sessionStorage.getItem('token'));

    if (error.response?.status === 401 && !isLoginRequest && hadAuthenticatedSession) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    } else if (
      error.response?.status === 403
      && error.response?.data?.requiresApproval
      && !isLoginRequest
    ) {
      window.location.href = '/pending-approval';
    }
    return Promise.reject(error);
  }
);

export default axios;

