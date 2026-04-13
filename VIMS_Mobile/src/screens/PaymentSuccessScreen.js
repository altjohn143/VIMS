// src/screens/PaymentSuccessScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../utils/theme';
import api from '../utils/api';

const PaymentSuccessScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  
  const { paymentId } = route.params || {};

  const verifyPayment = useCallback(async () => {
    try {
      const response = await api.get(`/payments/verify-paymongo-payment/${paymentId}`);
      
      if (response.data.success) {
        setPaymentStatus(response.data.status);
        setPaymentDetails(response.data.payment);
      }
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (paymentId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [paymentId, verifyPayment]);

  const handleGoToPayments = () => {
    navigation.navigate('Payments');
  };

  const handleGoToDashboard = () => {
    navigation.navigate('ResidentDashboard');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {paymentStatus === 'paid' ? (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={themeColors.success} />
            </View>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.message}>Your payment has been processed successfully.</Text>
            
            {paymentDetails && (
              <View style={[styles.summaryCard, shadows.medium]}>
                <Text style={styles.summaryTitle}>Payment Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Invoice:</Text>
                  <Text style={styles.summaryValue}>{paymentDetails.invoiceNumber}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount:</Text>
                  <Text style={[styles.summaryValue, { color: themeColors.success, fontWeight: '700' }]}>
                    {formatCurrency(paymentDetails.amount)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Payment Method:</Text>
                  <Text style={styles.summaryValue}>{paymentDetails.paymentMethod?.toUpperCase() || 'Online'}</Text>
                </View>
              </View>
            )}
            
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleGoToPayments}>
                <Ionicons name="receipt" size={20} color="white" />
                <Text style={styles.primaryButtonText}>View My Payments</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleGoToDashboard}>
                <Ionicons name="home" size={20} color={themeColors.primary} />
                <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.processingIcon}>
              <Ionicons name="time" size={80} color={themeColors.warning} />
            </View>
            <Text style={styles.title}>Processing Payment</Text>
            <Text style={styles.message}>
              Your payment is being processed. Please check your payments page for updates.
            </Text>
            <ActivityIndicator size="large" color={themeColors.primary} style={styles.processingSpinner} />
            <TouchableOpacity style={styles.primaryButton} onPress={handleGoToPayments}>
              <Ionicons name="receipt" size={20} color="white" />
              <Text style={styles.primaryButtonText}>View My Payments</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    marginBottom: 20,
  },
  processingIcon: {
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
  summaryCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.textPrimary,
  },
  buttonRow: {
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
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
  secondaryButtonText: {
    color: themeColors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  processingSpinner: {
    marginBottom: 20,
  },
});

export default PaymentSuccessScreen;