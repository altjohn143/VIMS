// Configuration for VIMS Mobile App

const Config = {
  // Backend API configuration
  API_BASE_URL: 'https://vims-backend.onrender.com/api', // Production URL on Render
  
  // Function to detect and get the correct API URL
  getApiUrl: () => {
    // In production, always use the production URL
    return Config.API_BASE_URL;
  },
  
  // Update the API URL (for development/testing only)
  setApiUrl: (newUrl) => {
    Config.API_BASE_URL = newUrl.endsWith('/api') ? newUrl : `${newUrl}/api`;
    return Config.API_BASE_URL;
  },
  
  // API endpoints
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      me: '/auth/me'
    },
    users: {
      list: '/users',
      stats: '/users/stats/summary',
      approve: (id) => `/users/${id}/approve`
    }
  },
  
  // Storage keys
  storage: {
    token: 'vims_token',
    user: 'vims_user',
    apiUrl: 'vims_api_url' // Store user's custom API URL
  },
  
  // App info
  app: {
    name: 'VIMS 30% MVP',
    version: '1.0.0',
    platform: 'mobile'
  },
  
  // Default credentials for development
  demoAccounts: {
    admin: {
      email: 'admin@vims.com',
      password: 'SecurePass123!'
    },
    security: {
      email: 'security@vims.com',
      password: 'SecurePass123!'
    },
    resident: {
      email: 'test@resident.com',
      password: '123456'
    }
  },
  
  // Timeout for API requests
  timeout: 10000,
  
  // Debug mode
  debug: true
};

export default Config;