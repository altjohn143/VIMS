// Configuration for VIMS Mobile App

const Config = {
  // SECURITY: Use production URL only - no hardcoded development IPs
  API_BASE_URL: 'https://vims-backend.onrender.com/api',

  // Function to detect and get the correct API URL
  getApiUrl: () => {
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
    user: 'vims_user'
  },

  // App info
  app: {
    name: 'VIMS 30% MVP',
    version: '1.0.0',
    platform: 'mobile'
  }
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