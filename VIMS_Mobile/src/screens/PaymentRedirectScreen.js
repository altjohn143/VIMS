// src/screens/PaymentRedirectScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors } from '../utils/theme';
import api from '../utils/api';

const PaymentRedirectScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [checkoutOpened, setCheckoutOpened] = useState(false);
  
  const { paymentId, method } = route.params || {};

  const initPayment = useCallback(async () => {
    try {
      const response = await api.post('/payments/create-paymongo-session', {
        paymentId,
        paymentMethod: method
      });
      
      if (response.data.success && response.data.checkoutUrl) {
        // Open URL in browser
        const supported = await Linking.canOpenURL(response.data.checkoutUrl);
        if (supported) {
          await Linking.openURL(response.data.checkoutUrl);
          setCheckoutOpened(true);
        } else {
          setError('Cannot open payment URL');
        }
      } else {
        setError(response.data.error || 'Failed to create payment session');
      }
    } catch (err) {
      console.error('Payment init error:', err);
      setError(err.response?.data?.error || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  }, [paymentId, method]);

  useEffect(() => {
    if (paymentId && method) {
      initPayment();
    } else {
      setError('Missing payment information');
      setLoading(false);
    }
  }, [paymentId, method, initPayment]);

  useEffect(() => {
    let timer;
    if (error && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (error && countdown === 0) {
      navigation.navigate('ResidentDashboard', { screen: 'PaymentsTab' });
    }
    return () => clearTimeout(timer);
  }, [error, countdown, navigation]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setCheckoutOpened(false);
    initPayment();
  };

  const handleCancelled = () => {
    navigation.replace('PaymentCancelled', { paymentId });
  };

  const handleViewPayments = () => {
    navigation.navigate('ResidentDashboard', { screen: 'PaymentsTab' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="card" size={60} color={themeColors.primary} />
          <ActivityIndicator size="large" color={themeColors.primary} style={styles.spinner} />
          <Text style={styles.title}>Redirecting to PayMongo...</Text>
          <Text style={styles.message}>Please wait while we prepare your secure payment.</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.errorIcon, { backgroundColor: themeColors.error + '15' }]}>
            <Ionicons name="alert-circle" size={50} color={themeColors.error} />
          </View>
          <Text style={styles.errorTitle}>Payment Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.countdownText}>Redirecting back in {countdown} seconds...</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <Text style={styles.backButtonText}>Back to Payments</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (checkoutOpened) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.errorIcon, { backgroundColor: themeColors.primary + '15' }]}>
            <Ionicons name="open-outline" size={50} color={themeColors.primary} />
          </View>
          <Text style={styles.title}>Payment Page Opened</Text>
          <Text style={styles.message}>
            Complete the payment in the secure checkout page. If you cancelled or returned without paying, mark it cancelled here.
          </Text>
          <View style={styles.stackedButtons}>
            <TouchableOpacity style={styles.retryButton} onPress={handleViewPayments}>
              <Text style={styles.retryButtonText}>Back to Payments</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleCancelled}>
              <Text style={styles.backButtonText}>Payment Cancelled</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return null;
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
  spinner: {
    marginTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: themeColors.error,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  countdownText: {
    fontSize: 13,
    color: themeColors.textSecondary,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stackedButtons: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  retryButton: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
});

export default PaymentRedirectScreen;
