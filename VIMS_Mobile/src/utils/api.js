// src/utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Replace with your computer's IP address
const BASE_URL = 'http://192.168.1.5:5000/api';


const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } else if (error.response?.status === 403) {
      if (error.response.data?.requiresApproval) {
        Alert.alert(
          'Account Pending Approval',
          'Your account is waiting for admin approval.'
        );
      } else {
        Alert.alert('Access Denied', 'You do not have permission');
      }
    } else if (error.code === 'ECONNABORTED') {
      Alert.alert('Timeout', 'Request took too long');
    } else if (!error.response) {
      Alert.alert('Network Error', 'Cannot connect to server');
    }
    
    return Promise.reject(error);
  }
);

export default api;