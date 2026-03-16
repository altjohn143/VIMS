// components/LogoutButton.js
import React from 'react';
import { TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { themeColors } from '../utils/theme';

const LogoutButton = ({ navigation, color = "white", size = 24 }) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // For web, use window.confirm
      if (window.confirm('Are you sure you want to logout?')) {
        logout();
        navigation.replace('Login');
      }
    } else {
      // For mobile, use Alert
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await logout();
              navigation.replace('Login');
            },
          },
        ]
      );
    }
  };

  return (
    <TouchableOpacity onPress={handleLogout} style={{ padding: 8 }}>
      <Ionicons name="log-out" size={size} color={color} />
    </TouchableOpacity>
  );
};

export default LogoutButton;