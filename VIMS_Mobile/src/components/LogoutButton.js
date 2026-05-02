// components/LogoutButton.js
import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const LogoutButton = ({ navigation, color = '#ef4444', size = 18, label = 'Logout' }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    if (navigation) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  return (
    <TouchableOpacity onPress={handleLogout} style={styles.button} activeOpacity={0.8}>
      <View style={styles.iconWrapper}>
        <Ionicons name="log-out-outline" size={size} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    marginRight: 8,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LogoutButton;
