// src/screens/PaymentCancelledScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors } from '../utils/theme';

const PaymentCancelledScreen = ({ navigation, route }) => {
  const [countdown, setCountdown] = useState(10);
  
  const { paymentId } = route.params || {};

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigation.navigate('Payments');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [navigation]);

  const handleRetry = () => {
    if (paymentId) {
      navigation.navigate('Payments');
    } else {
      navigation.navigate('Payments');
    }
  };

  const handleGoToDashboard = () => {
    navigation.navigate('ResidentDashboard');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.cancelIcon}>
          <Ionicons name="close-circle" size={80} color={themeColors.error} />
        </View>
        <Text style={styles.title}>Payment Cancelled</Text>
        <Text style={styles.message}>
          You cancelled the payment process. No charges were made to your account.
        </Text>
        
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={themeColors.info} />
          <Text style={styles.infoText}>
            Redirecting back to payments in {countdown} seconds...
          </Text>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dashboardButton} onPress={handleGoToDashboard}>
            <Ionicons name="home" size={20} color={themeColors.primary} />
            <Text style={styles.dashboardButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.info + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: themeColors.info,
    flex: 1,
  },
  buttonRow: {
    gap: 12,
    width: '100%',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: themeColors.primary,
  },
  dashboardButtonText: {
    color: themeColors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default PaymentCancelledScreen;