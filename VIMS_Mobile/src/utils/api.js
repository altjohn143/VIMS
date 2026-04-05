// src/utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

// IMPORTANT: Change this to your computer's IP address
// For Android Emulator: 10.0.2.2
// For iOS Simulator: localhost
// For Physical Device: Your computer's local IP address (e.g., 192.168.1.xxx)

// Get the IP from your network - run 'ipconfig' on Windows or 'ifconfig' on Mac/Linux
const YOUR_COMPUTER_IP = '192.168.1.5'; // CHANGE THIS TO YOUR ACTUAL IP

// For Android Emulator
const ANDROID_EMULATOR_URL = 'http://10.0.2.2:5000/api';

// For iOS Simulator  
const IOS_SIMULATOR_URL = 'http://localhost:5000/api';

// For Physical Device
const PHYSICAL_DEVICE_URL = `http://${YOUR_COMPUTER_IP}:5000/api`;

// Auto-detect based on platform
let BASE_URL;
if (Platform.OS === 'android') {
  // Check if running on emulator or physical device
  // You can also use a package like 'react-native-device-info' to detect
  BASE_URL = PHYSICAL_DEVICE_URL; // Change to ANDROID_EMULATOR_URL if using emulator
} else {
  BASE_URL = IOS_SIMULATOR_URL;
}

console.log('API Base URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.error('API Response Error:', error.response?.status, error.config?.url);
    console.error('Error details:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } else if (error.code === 'ECONNABORTED') {
      Alert.alert('Timeout', 'Request took too long. Check your connection.');
    } else if (!error.response) {
      Alert.alert('Network Error', `Cannot connect to server at ${BASE_URL}. Make sure your backend is running.`);
    }
    
    return Promise.reject(error);
  }
);

export default api;