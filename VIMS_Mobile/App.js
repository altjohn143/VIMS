import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Platform, StatusBar, StyleSheet, KeyboardAvoidingView, Appearance, TextInput } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { themeColors, navigationTheme } from './src/utils/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { installCrashDiagnostics } from './src/utils/crashDiagnostics';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';

installCrashDiagnostics();


if (Platform.OS !== 'web') {
  Appearance.setColorScheme('light');
}

TextInput.defaultProps = {
  ...(TextInput.defaultProps || {}),
  placeholderTextColor: themeColors.textMuted,
  selectionColor: themeColors.primary,
  cursorColor: themeColors.primary,
  keyboardAppearance: 'light',
};

export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const AppContent = () => {
  const { isLoading } = useAuth();
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      SystemUI.setBackgroundColorAsync(themeColors.background).catch(() => {});
      return;
    }

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

  const appContent = (
    <>
      <StatusBar barStyle="light-content" backgroundColor={themeColors.primaryDark} />
      <KeyboardAvoidingView
        style={styles.appShell}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <NavigationContainer theme={navigationTheme}>
          <AppNavigator />
        </NavigationContainer>
      </KeyboardAvoidingView>
    </>
  );

  if (splashFinished) {
    return appContent;
  }

  return (
    <AnimatedSplashScreen ready={!isLoading} onFinish={() => setSplashFinished(true)}>
      {appContent}
    </AnimatedSplashScreen>
  );
};

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
  },
});
