// src/config/apiConfig.js
import { Platform } from 'react-native';

// IMPORTANT: Replace this with your computer's actual IP address
// To find your IP:
// - Windows: Open cmd and type 'ipconfig' - look for IPv4 Address
// - Mac: Open terminal and type 'ifconfig' - look for inet address
const YOUR_COMPUTER_IP = '192.168.1.236'; // <-- UPDATED TO YOUR SERVER IP

export const API_CONFIG = {
  // For different platforms
  baseURL: Platform.select({
    // iOS Simulator can use localhost
    ios: 'http://localhost:5000/api',
    
    // Android Emulator uses 10.0.2.2 to access host machine
    android: 'http://10.0.2.2:5000/api',
    
    // For real devices, use your computer's IP address
    default: `http://${YOUR_COMPUTER_IP}:5000/api`
  }),
  
  // Force using network IP for all platforms (recommended for testing)
  forceNetworkIP: `http://${YOUR_COMPUTER_IP}:5000/api`,
  
  // Timeout in milliseconds
  timeout: 10000,
};

// Helper function to test connection
export const testConnection = async () => {
  try {
    console.log('Testing connection to:', API_CONFIG.forceNetworkIP);
    const response = await fetch(`${API_CONFIG.forceNetworkIP}/test-connection`);
    const data = await response.json();
    console.log('✅ Server connection successful:', data);
    return true;
  } catch (error) {
    console.error('❌ Server connection failed:', error);
    console.log('Please check:');
    console.log('1. Server is running (node server.js)');
    console.log('2. IP address is correct:', YOUR_COMPUTER_IP);
    console.log('3. Firewall is not blocking port 5000');
    console.log('4. Phone/emulator is on same network');
    return false;
  }
};