import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../../config';

const API_BASE_URL = Config.getApiUrl();

export const api = {
  async get(endpoint) {
    console.log('API GET:', endpoint);
    
    const token = await AsyncStorage.getItem('vims_token');
    const userStr = await AsyncStorage.getItem('vims_user');
    
    if (!token || !userStr) {
      console.log('No token or user found');
      throw new Error('Not authenticated');
    }
    
    console.log('Token available, making request...');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-user-data': userStr,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.status === 401) {
      console.log('Unauthorized, clearing storage');
      await AsyncStorage.multiRemove(['vims_token', 'vims_user']);
      throw new Error('Session expired. Please login again.');
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    
    return data;
  },
  
  async post(endpoint, data) {
    console.log('API POST:', endpoint, data);
    
    const token = await AsyncStorage.getItem('vims_token');
    const userStr = await AsyncStorage.getItem('vims_user');
    
    if (!token || !userStr) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-user-data': userStr,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (response.status === 401) {
      await AsyncStorage.multiRemove(['vims_token', 'vims_user']);
      throw new Error('Session expired');
    }
    
    return response.json();
  },
  
  async put(endpoint, data) {
    console.log('API PUT:', endpoint, data);
    
    const token = await AsyncStorage.getItem('vims_token');
    const userStr = await AsyncStorage.getItem('vims_user');
    
    if (!token || !userStr) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-user-data': userStr,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (response.status === 401) {
      await AsyncStorage.multiRemove(['vims_token', 'vims_user']);
      throw new Error('Session expired');
    }
    
    return response.json();
  }
};