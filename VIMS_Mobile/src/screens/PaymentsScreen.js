// src/screens/PaymentsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { themeColors, shadows } from '../utils/theme';
import api from '../utils/api';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const PaymentsScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    totalPaid: 0,
    totalPending: 0,
    pendingCount: 0,
    overdueCount: 0,
    overdueAmount: 0
  });
  const [currentDues, setCurrentDues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [uploadedReceipt, setUploadedReceipt] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch current dues
      const duesResponse = await api.get('/payments/current-dues');
      if (duesResponse.data.success) {
        setCurrentDues(duesResponse.data.data);
      }
      
      // Fetch payment history
      const paymentsResponse = await api.get('/payments/my');
      if (paymentsResponse.data.success) {
        setPayments(paymentsResponse.data.data);
        setSummary(paymentsResponse.data.summary);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load payment data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePayClick = (payment) => {
    setSelectedPayment(payment);
    setShowPaymentMethod(true);
  };

  const handleQRPhPayment = () => {
    setShowPaymentMethod(false);
    setShowQRDialog(true);
  };

  const handleCashPayment = async () => {
    setShowPaymentMethod(false);
    setProcessing(true);
    try {
      const response = await api.post(`/payments/${selectedPayment._id}/pay`, {
        paymentMethod: 'cash'
      });
      
      if (response.data.success) {
        Alert.alert('Cash Payment', 'Please pay at the admin office to complete your payment.');
        setShowCashDialog(true);
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to process cash payment');
    } finally {
      setProcessing(false);
    }
  };

  const pickReceiptImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photos');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      setUploadedReceipt({ uri, name: filename, type });
    }
  };

  const handleUploadReceipt = async () => {
    if (!referenceNumber.trim()) {
      Alert.alert('Error', 'Please enter your reference number');
      return;
    }
    
    if (!uploadedReceipt) {
      Alert.alert('Error', 'Please upload your payment receipt/screenshot');
      return;
    }
    
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('referenceNumber', referenceNumber);
      formData.append('paymentId', selectedPayment._id);
      formData.append('amount', selectedPayment.amount);
      formData.append('receipt', {
        uri: uploadedReceipt.uri,
        name: uploadedReceipt.name,
        type: uploadedReceipt.type,
      });
      
      const response = await api.post('/payments/upload-qrph-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        Alert.alert('Success', 'Payment receipt submitted! Admin will verify your payment within 24 hours.');
        setShowQRDialog(false);
        setReferenceNumber('');
        setUploadedReceipt(null);
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit payment');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusChip = (status, dueDate) => {
    if (status === 'paid') {
      return { label: 'Paid', color: themeColors.success, icon: 'checkmark-circle' };
    }
    if (dueDate && new Date() > new Date(dueDate)) {
      return { label: 'Overdue', color: themeColors.error, icon: 'warning' };
    }
    return { label: 'Pending', color: themeColors.warning, icon: 'time' };
  };

  const filteredPayments = activeTab === 0 
    ? payments 
    : payments.filter(p => p.status === (activeTab === 1 ? 'pending' : 'paid'));

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments & Dues</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
            <Text style={[styles.statValue, { color: themeColors.success }]}>
              {formatCurrency(summary.totalPaid)}
            </Text>
            <Text style={styles.statLabel}>Total Paid</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fffbeb' }]}>
            <Text style={[styles.statValue, { color: themeColors.warning }]}>
              {formatCurrency(summary.totalPending)}
            </Text>
            <Text style={styles.statLabel}>Pending Balance</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
            <Text style={[styles.statValue, { color: themeColors.error }]}>
              {formatCurrency(summary.overdueAmount)}
            </Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        </View>

        {/* Current Month Dues Banner */}
        {currentDues && currentDues.status !== 'paid' && (
          <View style={styles.currentDuesCard}>
            <View style={styles.currentDuesContent}>
              <View>
                <Text style={styles.currentDuesTitle}>Current Month Dues</Text>
                <Text style={styles.currentDuesDesc}>{currentDues.description}</Text>
                <Text style={styles.currentDuesAmount}>{formatCurrency(currentDues.amount)}</Text>
                <Text style={styles.currentDuesDue}>Due: {formatDate(currentDues.dueDate)}</Text>
              </View>
              <TouchableOpacity
                style={styles.payNowButton}
                onPress={() => handlePayClick(currentDues)}
              >
                <Ionicons name="qr-code" size={20} color="white" />
                <Text style={styles.payNowText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 0 && styles.activeTab]}
            onPress={() => setActiveTab(0)}
          >
            <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>
              All ({payments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 1 && styles.activeTab]}
            onPress={() => setActiveTab(1)}
          >
            <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>
              Pending ({payments.filter(p => p.status === 'pending').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 2 && styles.activeTab]}
            onPress={() => setActiveTab(2)}
          >
            <Text style={[styles.tabText, activeTab === 2 && styles.activeTabText]}>
              Paid ({payments.filter(p => p.status === 'paid').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment History */}
        {filteredPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyText}>No payment records found</Text>
          </View>
        ) : (
          filteredPayments.map((payment) => {
            const status = getStatusChip(payment.status, payment.dueDate);
            return (
              <View key={payment._id} style={[styles.paymentCard, shadows.small]}>
                <View style={styles.paymentHeader}>
                  <Text style={styles.invoiceNumber}>{payment.invoiceNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Ionicons name={status.icon} size={12} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                
                <Text style={styles.paymentDesc}>{payment.description}</Text>
                {payment.notes && (
                  <Text style={styles.paymentNotes}>{payment.notes}</Text>
                )}
                
                <View style={styles.paymentDetails}>
                  <View>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>{formatCurrency(payment.amount)}</Text>
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Due Date</Text>
                    <Text style={styles.detailValue}>{formatDate(payment.dueDate)}</Text>
                  </View>
                  {payment.paymentDate && (
                    <View>
                      <Text style={styles.detailLabel}>Paid On</Text>
                      <Text style={styles.detailValue}>{formatDate(payment.paymentDate)}</Text>
                    </View>
                  )}
                </View>
                
                {payment.status === 'pending' ? (
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => handlePayClick(payment)}
                  >
                    <Text style={styles.payButtonText}>Pay Now</Text>
                  </TouchableOpacity>
                ) : payment.receiptNumber && (
                  <TouchableOpacity
                    style={styles.receiptButton}
                    onPress={() => {
                      setReceiptData({
                        receiptNumber: payment.receiptNumber,
                        amount: payment.amount,
                        paymentDate: payment.paymentDate,
                        paymentMethod: payment.paymentMethod,
                        invoiceNumber: payment.invoiceNumber,
                        description: payment.description
                      });
                      setShowReceiptDialog(true);
                    }}
                  >
                    <Ionicons name="receipt" size={20} color={themeColors.primary} />
                    <Text style={styles.receiptButtonText}>View Receipt</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentMethod}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentMethod(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentMethod(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalAmount}>
              Amount to pay: {formatCurrency(selectedPayment?.amount)}
            </Text>
            
            <TouchableOpacity style={styles.qrphOption} onPress={handleQRPhPayment}>
              <View style={styles.qrphIcon}>
                <Ionicons name="qr-code" size={28} color="white" />
              </View>
              <View style={styles.qrphTextContainer}>
                <Text style={styles.qrphTitle}>QRPh</Text>
                <Text style={styles.qrphDesc}>Scan with GCash, PayMaya, or any banking app</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cashOption} onPress={handleCashPayment}>
              <View style={styles.cashIcon}>
                <Ionicons name="cash" size={28} color={themeColors.primary} />
              </View>
              <View style={styles.cashTextContainer}>
                <Text style={styles.cashTitle}>Cash</Text>
                <Text style={styles.cashDesc}>Pay at the admin office</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QRPh Payment Modal */}
      <Modal
        visible={showQRDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQRDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay with QRPh</Text>
              <TouchableOpacity onPress={() => setShowQRDialog(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.qrCodeContainer}>
                <Image
                  source={require('../../assets/qrph.jpg')}
                  style={styles.qrCodeImage}
                  resizeMode="contain"
                />
              </View>
              
              <Text style={styles.qrAmount}>{formatCurrency(selectedPayment?.amount)}</Text>
              
              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsTitle}>How to pay:</Text>
                <Text style={styles.instructionsText}>
                  1. Open GCash, PayMaya, or any banking app{'\n'}
                  2. Tap "Scan to Pay" or "QR Payment"{'\n'}
                  3. Scan the QR code above{'\n'}
                  4. Enter amount: {formatCurrency(selectedPayment?.amount)}{'\n'}
                  5. Complete the payment and save the reference number
                </Text>
              </View>
              
              <TextInput
                style={styles.referenceInput}
                placeholder="Payment Reference Number"
                value={referenceNumber}
                onChangeText={setReferenceNumber}
              />
              
              <TouchableOpacity style={styles.uploadButton} onPress={pickReceiptImage}>
                <Ionicons name="cloud-upload" size={20} color={themeColors.primary} />
                <Text style={styles.uploadButtonText}>Upload Receipt/Screenshot</Text>
              </TouchableOpacity>
              
              {uploadedReceipt && (
                <View style={styles.selectedFileCard}>
                  <Ionicons name="document" size={20} color={themeColors.success} />
                  <Text style={styles.selectedFileName}>{uploadedReceipt.name}</Text>
                </View>
              )}
              
              <TouchableOpacity
                style={[styles.submitButton, (!referenceNumber || !uploadedReceipt || processing) && styles.disabledButton]}
                onPress={handleUploadReceipt}
                disabled={!referenceNumber || !uploadedReceipt || processing}
              >
                {processing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Payment</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cash Payment Confirmation Modal */}
      <Modal
        visible={showCashDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCashDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModal}>
            <View style={styles.alertIcon}>
              <Ionicons name="cash" size={40} color={themeColors.warning} />
            </View>
            <Text style={styles.alertTitle}>Cash Payment Selected</Text>
            <Text style={styles.alertMessage}>
              Please visit the admin office to complete your cash payment.
            </Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setShowCashDialog(false)}
            >
              <Text style={styles.alertButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={showReceiptDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReceiptDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Receipt</Text>
              <TouchableOpacity onPress={() => setShowReceiptDialog(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {receiptData && (
              <ScrollView>
                <View style={styles.receiptContainer}>
                  <View style={styles.receiptHeader}>
                    <Text style={styles.receiptLogo}>WESTVILLE CASIMIRO HOMES</Text>
                    <Text style={styles.receiptSubtitle}>Village Information Management System</Text>
                  </View>
                  
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Receipt Number:</Text>
                    <Text style={styles.receiptValue}>{receiptData.receiptNumber}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Invoice Number:</Text>
                    <Text style={styles.receiptValue}>{receiptData.invoiceNumber}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Payment Date:</Text>
                    <Text style={styles.receiptValue}>{formatDate(receiptData.paymentDate)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Payment Method:</Text>
                    <Text style={styles.receiptValue}>{receiptData.paymentMethod?.toUpperCase() || 'QRPh'}</Text>
                  </View>
                  
                  <View style={styles.receiptDivider} />
                  
                  <View style={styles.receiptTotalRow}>
                    <Text style={styles.receiptTotalLabel}>Amount Paid:</Text>
                    <Text style={styles.receiptTotalValue}>{formatCurrency(receiptData.amount)}</Text>
                  </View>
                  
                  <Text style={styles.receiptFooter}>
                    This is a system-generated receipt. Thank you for your payment!
                  </Text>
                </View>
              </ScrollView>
            )}
            
            <TouchableOpacity
              style={styles.closeReceiptButton}
              onPress={() => setShowReceiptDialog(false)}
            >
              <Text style={styles.closeReceiptText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    backgroundColor: themeColors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  currentDuesCard: {
    backgroundColor: '#fffbeb',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: themeColors.warning,
    padding: 16,
  },
  currentDuesContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentDuesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.warning,
  },
  currentDuesDesc: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  currentDuesAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginTop: 8,
  },
  currentDuesDue: {
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  payNowButton: {
    backgroundColor: themeColors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  payNowText: {
    color: 'white',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: themeColors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: themeColors.textSecondary,
  },
  activeTabText: {
    color: 'white',
  },
  paymentCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: themeColors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paymentDesc: {
    fontSize: 14,
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  paymentNotes: {
    fontSize: 11,
    color: themeColors.textSecondary,
    marginBottom: 12,
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  detailLabel: {
    fontSize: 11,
    color: themeColors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: themeColors.textPrimary,
  },
  payButton: {
    backgroundColor: themeColors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: themeColors.primary,
  },
  receiptButtonText: {
    color: themeColors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  modalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  qrphOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  qrphIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  qrphTextContainer: {
    flex: 1,
  },
  qrphTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  qrphDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  cashOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cashIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeColors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cashTextContainer: {
    flex: 1,
  },
  cashTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  cashDesc: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  qrAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionsCard: {
    backgroundColor: themeColors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.primary,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    lineHeight: 20,
  },
  referenceInput: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.primary,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  uploadButtonText: {
    color: themeColors.primary,
    fontWeight: '500',
  },
  selectedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.success + '10',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  selectedFileName: {
    fontSize: 13,
    color: themeColors.success,
    flex: 1,
  },
  submitButton: {
    backgroundColor: themeColors.success,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  alertModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  alertIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: themeColors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertButton: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  alertButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  receiptContainer: {
    padding: 16,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  receiptLogo: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.primary,
  },
  receiptSubtitle: {
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '500',
    color: themeColors.textPrimary,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: themeColors.border,
    marginVertical: 12,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  receiptTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  receiptTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.success,
  },
  receiptFooter: {
    fontSize: 10,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  closeReceiptButton: {
    backgroundColor: themeColors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeReceiptText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default PaymentsScreen;