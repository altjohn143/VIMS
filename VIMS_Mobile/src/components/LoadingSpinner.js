import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { themeColors } from '../utils/theme';

const LoadingSpinner = ({ size = 'large', message = 'Loading...', fullScreen = false }) => {
  if (fullScreen) {
    return (
      <View style={styles.fullScreenContainer}>
        <ActivityIndicator size={size} color={themeColors.primary} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={themeColors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
});

export default LoadingSpinner;