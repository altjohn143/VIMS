// src/utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================
// BACKEND CONFIGURATION
// ============================================

// Option 1: Set your computer's IP address manually (RECOMMENDED for physical devices)
// Run 'ipconfig' on Windows or 'ifconfig' on Mac/Linux to find your IP
const MANUAL_IP = '192.168.1.141'; // CHANGE THIS TO YOUR ACTUAL IP

// Env override support:
// - EXPO_PUBLIC_API_URL is the Expo-recommended client env key
// - API_URL kept for backward compatibility with existing setup
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;

// Option 2: Auto-detect using Expo's debugger host.
// IMPORTANT: If Expo reports 'localhost' or '127.0.0.1', we fall back to MANUAL_IP so
// physical devices don't try to connect to their own localhost.
const getLocalIP = () => {
  try {
    // Gets the host IP from Expo config in SDK 50+
    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      console.log('📡 Detected debugger host:', debuggerHost);
      if (ip === 'localhost' || ip === '127.0.0.1') {
        console.log('⚠️ Debugger host is localhost; using MANUAL_IP instead:', MANUAL_IP);
        return MANUAL_IP;
      }
      console.log('📡 Using detected local IP:', ip);
      return ip;
    }
  } catch (error) {
    console.log('Could not auto-detect IP, using manual IP');
  }
  return MANUAL_IP;
};

// ============================================
// URL CONFIGURATION BY PLATFORM
// ============================================

const localIP = getLocalIP();
const PORT = '5000';

// For Android Emulator (Android Virtual Device)
const ANDROID_EMULATOR_URL = 'http://10.0.2.2:5000/api';

// For Android Emulator (Genymotion)
const GENYMOTION_URL = 'http://10.0.3.2:5000/api';

// For iOS Simulator  
const IOS_SIMULATOR_URL = 'http://localhost:5000/api';

// For Physical Device (using detected or manual IP)
const PHYSICAL_DEVICE_URL = `http://${localIP}:${PORT}/api`;
const WEB_LOCALHOST_URL = `http://localhost:${PORT}/api`;

// For Physical Device using Ngrok (for testing over internet)
// const NGROK_URL = 'https://your-ngrok-subdomain.ngrok.io/api';

// ============================================
// AUTO-DETECT BASED ON PLATFORM
// ============================================

let BASE_URL;

// Highest priority: explicit environment override
if (ENV_API_URL) {
  BASE_URL = ENV_API_URL;
}

if (!BASE_URL && Platform.OS === 'android') {
  // Check if running on emulator by looking for common emulator indicators
  const isEmulator = 
    Constants.isDevice === false || 
    (Constants.platform?.android?.versionCode === undefined);
  
  if (isEmulator) {
    // Running on Android Emulator
    BASE_URL = ANDROID_EMULATOR_URL;
    console.log('📱 Running on Android Emulator');
  } else {
    // Running on physical Android device
    BASE_URL = PHYSICAL_DEVICE_URL;
    console.log('📱 Running on physical Android device');
  }
} else if (!BASE_URL && Platform.OS === 'ios') {
  // Check if running on simulator
  const isSimulator = Constants.isDevice === false;
  
  if (isSimulator) {
    // Running on iOS Simulator
    BASE_URL = IOS_SIMULATOR_URL;
    console.log('📱 Running on iOS Simulator');
  } else {
    // Running on physical iOS device
    BASE_URL = PHYSICAL_DEVICE_URL;
    console.log('📱 Running on physical iOS device');
  }
} else if (!BASE_URL) {
  // Web runs in desktop browser, so localhost is usually correct
  BASE_URL = Platform.OS === 'web' ? WEB_LOCALHOST_URL : PHYSICAL_DEVICE_URL;
}

// ============================================
// FALLBACK CONFIGURATION
// ============================================

// You can also manually override by setting an environment variable
// For development, you can uncomment one of these:

// BASE_URL = 'http://192.168.1.5:5000/api';  // Your computer's IP
// BASE_URL = 'http://10.0.2.2:5000/api';     // Android Emulator
// BASE_URL = 'http://localhost:5000/api';    // iOS Simulator
// BASE_URL = 'https://vims-backend.onrender.com/api'; // Production

console.log('========================================');
console.log('🔧 API Configuration:');
console.log(`   Platform: ${Platform.OS}`);
console.log(`   Device: ${Constants.isDevice ? 'Physical Device' : 'Emulator/Simulator'}`);
console.log(`   Base URL: ${BASE_URL}`);
console.log('========================================');

// ============================================
// AXIOS INSTANCE
// ============================================

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ============================================
// REQUEST INTERCEPTOR
// ============================================

api.interceptors.request.use(
  async (config) => {
    // If we're sending FormData, do NOT force JSON content-type.
    // Let Axios/browser set the correct multipart boundary; otherwise multer receives no files.
    const isFormData =
      typeof FormData !== 'undefined' &&
      config.data &&
      (config.data instanceof FormData ||
        Object.prototype.toString.call(config.data) === '[object FormData]');
    if (isFormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }

    // Skip adding token for auth endpoints (login, register, check-availability)
    const skipAuthPaths = ['/auth/login', '/auth/register', '/auth/check-availability'];
    const shouldSkipAuth = skipAuthPaths.some(path => config.url?.includes(path));
    
    if (!shouldSkipAuth) {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // Log request for debugging
    console.log(`🌐 API ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    console.log(`   Headers:`, JSON.stringify(config.headers, null, 2));
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

api.interceptors.response.use(
  (response) => {
    console.log(`✅ API ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const message = error.response?.data?.error || error.message;
    
    console.error(`❌ API Error ${status || 'No Response'} ${url || 'Unknown URL'}`);
    console.error(`   Message: ${message}`);
    
    // Handle authentication errors
    if (status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      Alert.alert('Session Expired', 'Please login again.');
    }
    
    // Handle connection errors
    else if (error.code === 'ECONNABORTED') {
      Alert.alert('Timeout', 'Request took too long. Please check your connection.');
    }
    
    // Handle network errors
    else if (!error.response) {
      Alert.alert(
        'Connection Error', 
        `Cannot connect to server at ${BASE_URL}\n\n` +
        `Make sure:\n` +
        `1. Backend is running (node server.js)\n` +
        `2. Your phone and computer are on the same WiFi\n` +
        `3. Firewall allows port 5000\n\n` +
        `Current IP: ${localIP}`
      );
    }
    
    // Handle server errors
    else if (status === 500) {
      Alert.alert('Server Error', 'Something went wrong on the server. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// HELPER FUNCTIONS
// ============================================

// Test connection to backend
export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    console.log('✅ Backend connection successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Get current base URL (useful for debugging)
export const getBaseUrl = () => BASE_URL;

// Update base URL (useful for switching between environments)
export const setBaseUrl = (newUrl) => {
  api.defaults.baseURL = newUrl;
  console.log('🔄 API base URL updated to:', newUrl);
};

export default api;