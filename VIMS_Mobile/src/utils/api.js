// src/utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================
// BACKEND CONFIGURATION
// ============================================

// PRODUCTION URL (highest priority)
const PRODUCTION_URL = 'https://vims-backend.onrender.com/api';

// Option 1: Set your computer's IP address manually (for development only)
// Run 'ipconfig' on Windows or 'ifconfig' on Mac/Linux to find your IP
const MANUAL_IP = '192.168.1.141'; // CHANGE THIS TO YOUR ACTUAL IP FOR DEVELOPMENT

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
// On some setups (especially Windows), another local service can bind 127.0.0.1:5000
// while the backend listens on 0.0.0.0:5000. Using LAN IP avoids hitting the wrong app.
const WEB_LAN_URL = `http://${localIP}:${PORT}/api`;

// For Physical Device using Ngrok (for testing over internet)
// const NGROK_URL = 'https://your-ngrok-subdomain.ngrok.io/api';

// ============================================
// AUTO-DETECT BASED ON PLATFORM
// ============================================

let BASE_URL;

// Highest priority: Production URL (for deployed apps)
if (!__DEV__) {
  // In production builds, always use production URL
  BASE_URL = PRODUCTION_URL;
  console.log('🚀 Production build detected - using production URL');
} else if (ENV_API_URL) {
  // Second priority: explicit environment override
  BASE_URL = ENV_API_URL;
}

// Web cannot reach a backend bound to a different localhost process.
// If env points to localhost on web, rewrite it to LAN IP automatically.
if (BASE_URL && Platform.OS === 'web' && BASE_URL.includes('localhost')) {
  BASE_URL = BASE_URL.replace('localhost', localIP);
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
  // Prefer LAN IP on web to avoid localhost/127.0.0.1 port collisions.
  BASE_URL = Platform.OS === 'web' ? WEB_LAN_URL : PHYSICAL_DEVICE_URL;
}

// ============================================
// FALLBACK CONFIGURATION
// ============================================

// You can also manually override by setting an environment variable
// For development, you can uncomment one of these:

// BASE_URL = 'http://192.168.1.5:5000/api';  // Your computer's IP (development)
// BASE_URL = 'http://10.0.2.2:5000/api';     // Android Emulator (development)
// BASE_URL = 'http://localhost:5000/api';    // iOS Simulator (development)
// BASE_URL = 'https://vims-backend.onrender.com/api'; // Production (already set above)

console.log('========================================');
console.log('🔧 API Configuration:');
console.log(`   Platform: ${Platform.OS}`);
console.log(`   Device: ${Constants.isDevice ? 'Physical Device' : 'Emulator/Simulator'}`);
console.log(`   Base URL: ${BASE_URL}`);
console.log('========================================');

// ============================================
// AXIOS INSTANCE
// ============================================

// Create axios instance with proper React Native adapter
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // Increased timeout to 60 seconds for slow networks
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'VIMSMobileApp/1.0'
  },
  // Allow all status codes to be handled
  validateStatus: () => true,
});

// For React Native/Expo: Override the request adapter to use native fetch with SSL verification disabled in dev
if (Platform.OS !== 'web') {
  api.defaults.adapter = async (config) => {
    try {
      const url = `${config.baseURL}${config.url}`;
      const requestOptions = {
        method: config.method?.toUpperCase() || 'GET',
        headers: config.headers,
        timeout: config.timeout,
      };

      if (config.data) {
        if (typeof config.data === 'string') {
          requestOptions.body = config.data;
        } else if (config.data instanceof FormData) {
          requestOptions.body = config.data;
          delete requestOptions.headers['Content-Type'];
        } else {
          requestOptions.body = JSON.stringify(config.data);
        }
      }

      console.log(`🌐 Using native fetch for ${config.method?.toUpperCase()} ${url}`);

      const response = await fetch(url, requestOptions);

      let responseData;
      const responseType = config.responseType?.toLowerCase();
      if (responseType === 'blob') {
        responseData = await response.blob();
      } else if (responseType === 'arraybuffer') {
        responseData = await response.arrayBuffer();
      } else {
        const text = await response.text();
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = text;
        }
      }

      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers,
        config,
        request: url,
      };
    } catch (error) {
      console.error(`🔴 Fetch error for ${config.url}:`, error);
      throw {
        ...error,
        config,
        request: config.url,
      };
    }
  };
}

// ============================================
// REQUEST INTERCEPTOR
// ============================================

api.interceptors.request.use(
  async (config) => {
    // If we're sending FormData, do NOT force JSON content-type.
    // Let the adapter handle multipart boundary
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
    console.log(`   Full URL: ${config.baseURL}${config.url}`);
    console.log(`   Platform: ${Platform.OS}`);
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
    console.error(`   Error Code: ${error.code}`);
    console.error(`   Full URL attempted: ${error.config?.baseURL}${url}`);
    console.error(`   Platform: ${Platform.OS}`);
    
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
      console.error('🔍 NETWORK ERROR DETAILS:', {
        code: error.code,
        message: error.message,
        errno: error.errno,
        syscall: error.syscall,
        platform: Platform.OS,
        baseURL: BASE_URL,
        fullUrl: error.config?.baseURL + error.config?.url,
      });
      
      // Provide helpful error message based on URL
      if (BASE_URL.includes('localhost') || BASE_URL.includes('192.168')) {
        Alert.alert(
          'Connection Error', 
          `Cannot connect to local server at ${BASE_URL}\n\n` +
          `Make sure:\n` +
          `1. Backend is running (node server.js)\n` +
          `2. Your phone and computer are on the same WiFi\n` +
          `3. Firewall allows port 5000\n` +
          `4. Phone and computer are on same network`
        );
      } else {
        Alert.alert(
          'Network Error', 
          `Cannot connect to ${BASE_URL}\n\n` +
          `Error: ${error.message}\n` +
          `Code: ${error.code}\n\n` +
          `Troubleshooting:\n` +
          `1. Check internet connection\n` +
          `2. Try again in a moment\n` +
          `3. Check backend status`
        );
      }
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

// Retry wrapper for API calls with exponential backoff
export const apiWithRetry = async (requestFn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      // Only retry on network errors, not on 4xx/5xx status codes
      if (error.response || i === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      console.log(`🔄 Retrying after ${delay}ms (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

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

const uint8ArrayToBase64 = (bytes) => {
  if (typeof btoa === 'function') {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  const lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  let i;
  const len = bytes.length;

  for (i = 0; i + 2 < len; i += 3) {
    const triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    base64 += lookup[(triplet >> 18) & 0x3f];
    base64 += lookup[(triplet >> 12) & 0x3f];
    base64 += lookup[(triplet >> 6) & 0x3f];
    base64 += lookup[triplet & 0x3f];
  }

  if (i < len) {
    const a = bytes[i++];
    base64 += lookup[(a >> 2) & 0x3f];
    if (i === len) {
      base64 += lookup[(a << 4) & 0x3f] + '==';
    } else {
      const b = bytes[i];
      base64 += lookup[((a << 4) & 0x30) | ((b >> 4) & 0x0f)];
      base64 += lookup[(b << 2) & 0x3c] + '=';
    }
  }

  return base64;
};

export const arrayBufferToDataUrl = (buffer, mimeType = 'image/jpeg') => {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
  const base64 = uint8ArrayToBase64(bytes);

  if (!base64) {
    throw new Error('Unable to create base64 data URL');
  }

  return `data:${mimeType};base64,${base64}`;
};

export const getProtectedImageDataUrl = async (relativePath) => {
  if (!relativePath) return null;

  const buildDataUrlFromBlob = async (blob) => {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  try {
    const response = await api.get(relativePath, { responseType: 'blob' });
    if (response.status === 200 && response.data) {
      return await buildDataUrlFromBlob(response.data);
    }
  } catch (error) {
    console.warn('Blob fetch failed for protected image:', error?.message || error);
  }

  try {
    const response = await api.get(relativePath, { responseType: 'arraybuffer' });
    if (response.status === 200 && response.data) {
      const mimeType = response.headers?.['content-type'] || 'image/jpeg';
      return arrayBufferToDataUrl(response.data, mimeType);
    }
  } catch (error) {
    console.error('Error fetching protected image:', error?.message || error);
  }

  return null;
};

export default api;