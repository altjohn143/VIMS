import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { themeColors } from './src/utils/theme';

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
    <ActivityIndicator size="large" color={themeColors.primary} />
  </View>
);

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const AppContent = () => {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    if (!html || !body || !root) return;

    // Make the web build behave like a centered mobile viewport
    html.style.height = '100%';
    html.style.width = '100%';

    body.style.height = '100%';
    body.style.width = '100%';
    body.style.margin = '0';
    body.style.overflow = 'auto';
    body.style.display = 'flex';
    body.style.justifyContent = 'center';
    body.style.alignItems = 'stretch';
    body.style.backgroundColor = '#111827';

    root.style.height = '100%';
    root.style.width = '100%';
    root.style.maxWidth = '480px';
    root.style.margin = '0 auto';
    root.style.boxShadow = '0 0 40px rgba(0,0,0,0.45)';
    root.style.borderRadius = '24px';
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
};