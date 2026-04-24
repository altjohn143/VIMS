// Shared utilities for VIMS 30% MVP

export const getApiUrl = () => {
  // Production URL for deployed apps
  return 'https://vims-backend.onrender.com/api';
  
  // Development fallbacks (uncomment for local development):
  // if (typeof window !== 'undefined') {
  //   return 'http://localhost:5000/api';
  // }
  
  // For React Native development
  // if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
  //   return 'http://YOUR_COMPUTER_IP:5000/api'; // Replace with actual IP
  // }
  
  // return 'http://localhost:5000/api';
};

export const handleApiError = (error) => {
  if (error.response) {
    return error.response.data.error || `Server error: ${error.response.status}`;
  } else if (error.request) {
    return 'Cannot connect to server. Check network connection.';
  } else {
    return error.message;
  }
};

export const roleConfig = {
  resident: {
    title: 'Resident Dashboard',
    icon: 'home',
    color: '#3b82f6',
    features: [
      { title: 'Generate Visitor Pass', icon: 'qrcode', desc: 'Create QR codes for visitors' },
      { title: 'Pay Dues', icon: 'payment', desc: 'Monthly maintenance payments' },
      { title: 'Service Requests', icon: 'build', desc: 'Report maintenance issues' },
      { title: 'Announcements', icon: 'announcement', desc: 'View community updates' }
    ]
  },
  admin: {
    title: 'Admin Dashboard',
    icon: 'admin-panel-settings',
    color: '#10b981',
    features: [
      { title: 'User Management', icon: 'people', desc: 'Manage residents & approvals' },
      { title: 'Financial Overview', icon: 'payment', desc: 'View payments & reports' },
      { title: 'System Settings', icon: 'build', desc: 'Configure system parameters' },
      { title: 'Create Announcements', icon: 'announcement', desc: 'Post community updates' }
    ]
  },
  security: {
    title: 'Security Dashboard',
    icon: 'security',
    color: '#f59e0b',
    features: [
      { title: 'QR Code Scanner', icon: 'qrcode', desc: 'Scan visitor QR codes' },
      { title: 'Visitor Logs', icon: 'people', desc: 'View entry/exit records' },
      { title: 'Emergency Alerts', icon: 'notifications', desc: 'Monitor security alerts' },
      { title: 'Patrol Schedule', icon: 'build', desc: 'View security rounds' }
    ]
  }
};

export const validateEmail = (email) => {
  return /\S+@\S+\.\S+/.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};