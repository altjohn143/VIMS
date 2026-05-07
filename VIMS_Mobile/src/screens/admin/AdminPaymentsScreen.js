// src/screens/admin/AdminPaymentsScreen.js
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
  FlatList,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { themeColors, shadows } from '../../utils/theme';
import api, { getProtectedImageDataUrl } from '../../utils/api';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const AdminPaymentsScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalCollected: 0, monthlyCollected: 0 });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showQRVerifyDialog, setShowQRVerifyDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [selectedImagePayment, setSelectedImagePayment] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  const closeReceiptViewer = () => {
    setShowImageViewer(false);
    setSelectedImage(null);
    setSelectedImagePayment(null);
    setSelectedImageUri(null);
  };
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { user } = useAuth();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await api.get('/payments', { params });
      
      if (response.data.success) {
        setPayments(response.data.data);
        setTotal(response.data.pagination.total);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/payments/admin/stats');
      if (response.data.success) {
        setSummary(prev => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [fetchPayments, fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const handleConfirmCashPayment = async () => {
    if (!selectedPayment) return;
    setProcessing(true);
    try {
      const response = await api.put(`/payments/${selectedPayment._id}/confirm`, {});
      
      if (response.data.success) {
        Alert.alert('Success', 'Cash payment confirmed successfully');
        fetchPayments();
        fetchStats();
        setShowConfirmDialog(false);
        setSelectedPayment(null);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to confirm payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyQRPhPayment = async () => {
    if (!selectedPayment) return;
    setProcessing(true);
    try {
      const response = await api.put(`/payments/${selectedPayment._id}/confirm`, {
        verificationNotes: verificationNotes,
        verifiedBy: user?.id,
        paymentMethod: 'qrph'
      });
      
      if (response.data.success) {
        Alert.alert('Success', 'QRPh payment verified and confirmed successfully!');
        fetchPayments();
        fetchStats();
        setShowQRVerifyDialog(false);
        setSelectedPayment(null);
        setVerificationNotes('');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to verify payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendReminders = async () => {
    setProcessing(true);
    try {
      const response = await api.post('/payments/send-reminders', {});
      
      if (response.data.success) {
        Alert.alert('Success', response.data.message);
        setShowReminderDialog(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send reminders');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewReceiptImage = async (payment) => {
    if (!payment?.receiptImage) {
      Alert.alert('Info', 'No receipt image available for this payment');
      return;
    }

    setSelectedImage(payment.receiptImage);
    setSelectedImagePayment(payment);
    setSelectedImageUri(null);
    setShowImageViewer(true);

    const previewUri = await getProtectedImageDataUrl(`/payments/receipt-image/${payment.receiptImage}`);
    if (previewUri) {
      setSelectedImageUri(previewUri);
    } else {
      Alert.alert('Preview unavailable', 'Unable to load this receipt image.');
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
    return new Date(date).toLocaleDateString('en-PH');
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

  const getPaymentMethodConfig = (method) => {
    const configs = {
      cash: { label: 'Cash', color: themeColors.success },
      qrph: { label: 'QRPh', color: themeColors.info },
      gcash: { label: 'GCash', color: themeColors.primary },
      paymaya: { label: 'PayMaya', color: themeColors.primary },
    };
    return configs[method] || { label: method?.toUpperCase() || 'N/A', color: themeColors.textSecondary };
  };

  const getReceiptAiMeta = (receiptAi) => {
    if (!receiptAi) return { label: 'AI not analyzed', color: themeColors.textSecondary };
    if (receiptAi.recommendation === 'likely_legit') return { label: 'AI: Likely legit', color: themeColors.success };
    if (receiptAi.recommendation === 'likely_fraud') return { label: 'AI: Likely fraud', color: themeColors.error };
    return { label: 'AI: Needs review', color: themeColors.warning };
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const residentName = `${payment.residentId?.firstName} ${payment.residentId?.lastName}`.toLowerCase();
    return residentName.includes(query) || payment.invoiceNumber?.toLowerCase().includes(query);
  });

  const renderPaymentCard = ({ item: payment }) => {
    const status = getStatusChip(payment.status, payment.dueDate);
    const methodConfig = getPaymentMethodConfig(payment.paymentMethod);
    const receiptAiMeta = getReceiptAiMeta(payment.receiptAi);
    
    return (
      <View style={[styles.paymentCard, shadows.small]}>
        <View style={styles.paymentHeader}>
          <Text style={styles.invoiceNumber}>{payment.invoiceNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        
        <View style={styles.residentInfo}>
          <Text style={styles.residentName}>
            {payment.residentId?.firstName} {payment.residentId?.lastName}
          </Text>
          <Text style={styles.houseNumber}>House: {payment.residentId?.houseNumber || 'N/A'}</Text>
        </View>
        
        <Text style={styles.paymentDesc}>{payment.description}</Text>
        
        <View style={styles.paymentDetails}>
          <View>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>{formatCurrency(payment.amount)}</Text>
          </View>
          <View>
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>{formatDate(payment.dueDate)}</Text>
          </View>
        </View>
        
        <View style={styles.paymentFooter}>
          <View style={[styles.methodBadge, { backgroundColor: methodConfig.color + '20' }]}>
            <Text style={[styles.methodText, { color: methodConfig.color }]}>{methodConfig.label}</Text>
          </View>
          {payment.referenceNumber && (
            <Text style={styles.referenceText}>Ref: {payment.referenceNumber}</Text>
          )}
        </View>
        <View style={[styles.methodBadge, { backgroundColor: receiptAiMeta.color + '20', marginBottom: 10, alignSelf: 'flex-start' }]}>
          <Text style={[styles.methodText, { color: receiptAiMeta.color }]}>{receiptAiMeta.label}</Text>
        </View>
        {payment.receiptAi?.flags?.length > 0 && (
          <Text style={styles.referenceText}>Flags: {payment.receiptAi.flags.slice(0, 2).join(', ')}</Text>
        )}
        
        <View style={styles.actionButtons}>
          {payment.status === 'pending' && payment.paymentMethod === 'cash' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => {
                setSelectedPayment(payment);
                setShowConfirmDialog(true);
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color="white" />
              <Text style={styles.actionButtonText}>Confirm Cash</Text>
            </TouchableOpacity>
          )}
          
          {payment.status === 'pending' && payment.paymentMethod === 'qrph' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.verifyButton]}
              onPress={() => {
                setSelectedPayment(payment);
                setShowQRVerifyDialog(true);
              }}
            >
              <Ionicons name="shield-checkmark" size={18} color="white" />
              <Text style={styles.actionButtonText}>Verify QRPh</Text>
            </TouchableOpacity>
          )}
          
          {payment.receiptImage && (
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => handleViewReceiptImage(payment)}
            >
              <Ionicons name="image" size={18} color={themeColors.info} />
              <Text style={[styles.actionButtonText, { color: themeColors.info }]}>View Receipt</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Management</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Chatbot')} style={styles.backButton}>
          <Ionicons name="sparkles-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.coloredStatCard, { backgroundColor: '#16a34a' }]}>
          <Ionicons name="cash-outline" style={styles.coloredStatBgIcon} />
          <Text style={styles.coloredStatValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(summary.totalCollected)}</Text>
          <Text style={styles.coloredStatLabel} numberOfLines={1} adjustsFontSizeToFit>Total Collected</Text>
        </View>
        <View style={[styles.coloredStatCard, { backgroundColor: '#2563eb' }]}>
          <Ionicons name="calendar-outline" style={styles.coloredStatBgIcon} />
          <Text style={styles.coloredStatValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(summary.monthlyCollected)}</Text>
          <Text style={styles.coloredStatLabel} numberOfLines={1} adjustsFontSizeToFit>Monthly</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBarButton} onPress={() => setShowReminderDialog(true)}>
          <Ionicons name="send" size={20} color="white" />
          <Text style={styles.actionBarButtonText}>Reminders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBarButton} onPress={fetchPayments}>
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.actionBarButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by resident or invoice..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, statusFilter !== 'all' && styles.activeFilter]}
          onPress={() => setStatusFilter(statusFilter === 'all' ? 'pending' : 'all')}
        >
          <Ionicons name="filter" size={18} color={statusFilter !== 'all' ? 'white' : themeColors.textSecondary} />
          <Text style={[styles.filterText, statusFilter !== 'all' && styles.activeFilterText]}>
            {statusFilter === 'all' ? 'All' : 'Pending'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payments List */}
      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyText}>No payments found</Text>
          </View>
        }
      />

      {/* Confirm Cash Payment Dialog */}
      <Modal
        visible={showConfirmDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Confirm Cash Payment</Text>
            {selectedPayment && (
              <>
                <View style={styles.confirmDetails}>
                  <Text style={styles.confirmLabel}>Invoice: <Text style={styles.confirmValue}>{selectedPayment.invoiceNumber}</Text></Text>
                  <Text style={styles.confirmLabel}>Resident: <Text style={styles.confirmValue}>{selectedPayment.residentId?.firstName} {selectedPayment.residentId?.lastName}</Text></Text>
                  <Text style={styles.confirmLabel}>Amount: <Text style={styles.confirmValue}>{formatCurrency(selectedPayment.amount)}</Text></Text>
                </View>
                <Text style={styles.confirmMessage}>Confirm that you have received cash payment for this invoice?</Text>
              </>
            )}
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelConfirmButton} onPress={() => setShowConfirmDialog(false)}>
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButtonLarge} onPress={handleConfirmCashPayment} disabled={processing}>
                {processing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.confirmButtonText}>Confirm Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QRPh Verification Dialog */}
      <Modal
        visible={showQRVerifyDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQRVerifyDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify QRPh Payment</Text>
              <TouchableOpacity onPress={() => setShowQRVerifyDialog(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {selectedPayment && (
              <ScrollView>
                <View style={styles.verifyDetails}>
                  <View style={styles.verifyRow}>
                    <Text style={styles.verifyLabel}>Invoice:</Text>
                    <Text style={styles.verifyValue}>{selectedPayment.invoiceNumber}</Text>
                  </View>
                  <View style={styles.verifyRow}>
                    <Text style={styles.verifyLabel}>Resident:</Text>
                    <Text style={styles.verifyValue}>{selectedPayment.residentId?.firstName} {selectedPayment.residentId?.lastName}</Text>
                  </View>
                  <View style={styles.verifyRow}>
                    <Text style={styles.verifyLabel}>Amount:</Text>
                    <Text style={[styles.verifyValue, { color: themeColors.success, fontWeight: '700' }]}>
                      {formatCurrency(selectedPayment.amount)}
                    </Text>
                  </View>
                  <View style={styles.verifyRow}>
                    <Text style={styles.verifyLabel}>Reference:</Text>
                    <Text style={styles.verifyValue}>{selectedPayment.referenceNumber || 'N/A'}</Text>
                  </View>
                  {selectedPayment.notes && (
                    <View style={styles.verifyNotes}>
                      <Text style={styles.verifyLabel}>Notes:</Text>
                      <Text style={styles.verifyValue}>{selectedPayment.notes}</Text>
                    </View>
                  )}
                </View>
                {selectedPayment?.receiptAi && (
                  <View style={[styles.verifyDetails, { marginTop: 8 }]}>
                    <Text style={[styles.verifyLabel, { fontWeight: '700', marginBottom: 8 }]}>AI Receipt Analysis</Text>
                    <Text style={[styles.verifyValue, { color: getReceiptAiMeta(selectedPayment.receiptAi).color }]}>
                      {getReceiptAiMeta(selectedPayment.receiptAi).label}
                    </Text>
                    <Text style={styles.verifyValue}>
                      Fraud score: {typeof selectedPayment.receiptAi.fraudScore === 'number' ? selectedPayment.receiptAi.fraudScore.toFixed(2) : 'N/A'}
                    </Text>
                    {selectedPayment.receiptAi.flags?.length > 0 && (
                      <Text style={styles.verifyValue}>Flags: {selectedPayment.receiptAi.flags.join(', ')}</Text>
                    )}
                  </View>
                )}
                
                <TextInput
                  style={styles.notesInput}
                  placeholder="Verification Notes (Optional)"
                  value={verificationNotes}
                  onChangeText={setVerificationNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                
                <TouchableOpacity
                  style={styles.verifySubmitButton}
                  onPress={handleVerifyQRPhPayment}
                  disabled={processing}
                >
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.verifySubmitText}>Verify & Confirm Payment</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Send Reminders Dialog */}
      <Modal
        visible={showReminderDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReminderDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reminderModal}>
            <Ionicons name="mail" size={48} color={themeColors.warning} />
            <Text style={styles.reminderTitle}>Send Overdue Reminders</Text>
            <Text style={styles.reminderMessage}>
              This will send SMS/Email reminders to all residents with overdue payments.
            </Text>
            <View style={styles.reminderActions}>
              <TouchableOpacity style={styles.cancelReminderButton} onPress={() => setShowReminderDialog(false)}>
                <Text style={styles.cancelReminderText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendReminderButton} onPress={handleSendReminders} disabled={processing}>
                {processing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.sendReminderText}>Send Reminders</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Dialog */}
      <Modal
        visible={showImageViewer}
        transparent
        animationType="slide"
        onRequestClose={closeReceiptViewer}
      >
        <View style={styles.imageViewerOverlay}>
          <View style={styles.imageViewerHeader}>
            <Text style={styles.imageViewerTitle}>Payment Receipt</Text>
            <TouchableOpacity onPress={closeReceiptViewer}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
          {selectedImageUri ? (
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : selectedImage ? (
            <View style={[styles.fullImage, styles.noPreviewContainer]}>
              <Text style={styles.noPreviewText}>Loading receipt preview...</Text>
            </View>
          ) : null}
          {selectedImagePayment && (
            <View style={styles.imageInfo}>
              <Text style={styles.imageInfoText}>Invoice: {selectedImagePayment.invoiceNumber}</Text>
              <Text style={styles.imageInfoText}>Amount: {formatCurrency(selectedImagePayment.amount)}</Text>
            </View>
          )}
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
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#f1f5f9',
  },
  coloredStatCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  coloredStatBgIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 24,
    color: 'rgba(255,255,255,0.4)',
  },
  coloredStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  coloredStatLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionBarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionBarButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    marginLeft: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  activeFilter: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  filterText: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  activeFilterText: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  residentInfo: {
    marginBottom: 8,
  },
  residentName: {
    fontSize: 15,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  houseNumber: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  paymentDesc: {
    fontSize: 13,
    color: themeColors.textSecondary,
    marginBottom: 12,
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.textPrimary,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  referenceText: {
    fontSize: 11,
    color: themeColors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  confirmButton: {
    backgroundColor: themeColors.success,
  },
  verifyButton: {
    backgroundColor: themeColors.info,
  },
  viewButton: {
    backgroundColor: themeColors.primary + '10',
    borderWidth: 1,
    borderColor: themeColors.info,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    width: '85%',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmDetails: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  confirmLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 8,
  },
  confirmValue: {
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  confirmMessage: {
    fontSize: 14,
    color: themeColors.warning,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelConfirmText: {
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  confirmButtonLarge: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: themeColors.success,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
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
  verifyDetails: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  verifyLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  verifyValue: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.textPrimary,
  },
  verifyNotes: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
  },
  verifySubmitButton: {
    backgroundColor: themeColors.success,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifySubmitText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  generateModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    width: '85%',
  },
  generateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  monthPicker: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  pickerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  selectedMonth: {
    backgroundColor: themeColors.primary,
  },
  monthButtonText: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  selectedMonthText: {
    color: 'white',
  },
  yearInput: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: themeColors.warning,
    marginBottom: 20,
    textAlign: 'center',
  },
  generateActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelGenerateButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelGenerateText: {
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  generateButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: themeColors.primary,
  },
  generateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  reminderModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    width: '85%',
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  reminderMessage: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelReminderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelReminderText: {
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  sendReminderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: themeColors.warning,
  },
  sendReminderText: {
    color: 'white',
    fontWeight: '600',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'black',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  imageViewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  fullImage: {
    flex: 1,
    width: '100%',
  },
  noPreviewContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  noPreviewText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  imageInfo: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  imageInfoText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 4,
  },
});

export default AdminPaymentsScreen;