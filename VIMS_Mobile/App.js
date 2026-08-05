import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, Platform, Text, Image, StatusBar, StyleSheet, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { themeColors, navigationTheme, shadows } from './src/utils/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const LoadingScreen = () => (
  <View style={styles.loadingScreen}>
    <View style={styles.loadingBrand}>
      <Image source={require('./assets/village-logo.png')} style={styles.loadingLogo} />
    </View>
    <Text style={styles.loadingTitle}>VIMS</Text>
    <Text style={styles.loadingSubtitle}>Preparing your community workspace</Text>
    <ActivityIndicator style={styles.loadingIndicator} size="small" color={themeColors.primary} />
  </View>
);

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
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
    root.style.borderRadius = '0';
    root.style.overflow = 'hidden';
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={themeColors.primaryDark} />
      <KeyboardAvoidingView
        style={styles.appShell}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <NavigationContainer theme={navigationTheme}>
          <AppNavigator />
        </NavigationContainer>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    padding: 24,
  },
  loadingBrand: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: themeColors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  loadingLogo: { width: 62, height: 62, resizeMode: 'contain' },
  loadingTitle: {
    marginTop: 20,
    color: themeColors.primaryDark,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  loadingSubtitle: {
    marginTop: 5,
    color: themeColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  loadingIndicator: { marginTop: 24 },
});
