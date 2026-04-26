// src/config/apiConfig.js
import { Platform } from 'react-native';

// SECURITY: No hardcoded IPs - use environment variables or production URLs only
const PRODUCTION_API_URL = 'https://vims-backend.onrender.com/api';
const DEVELOPMENT_API_URL = __DEV__ ? 'http://localhost:5000/api' : PRODUCTION_API_URL;

export const API_CONFIG = {
  // Use production URL in production, localhost for development
  baseURL: PRODUCTION_API_URL,

  // For different platforms (only use localhost in development)
  platformURL: Platform.select({
    ios: DEVELOPMENT_API_URL,
    android: DEVELOPMENT_API_URL,
    default: PRODUCTION_API_URL
  }),

  // Timeout in milliseconds
  timeout: 10000,
};

// SECURITY: Remove hardcoded IP addresses and connection testing that could expose internal network info
export const testConnection = async () => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/health`);
    const data = await response.json();
    return response.ok && data.status === 'OK';
  } catch (error) {
    console.error('Server connection test failed');
    return false;
  }
};