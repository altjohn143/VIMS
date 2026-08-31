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
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { themeColors, shadows, roleLayouts } from '../../utils/theme';
import api, { getProtectedImageDataUrl } from '../../utils/api';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getAuthToken } from '../../utils/secureSession';
import UserDropdownMenu from '../../components/UserDropdownMenu';

const AdminPaymentsScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalCollected: 0, monthlyCollected: 0, pendingTotal: 0, collectionRate: 0 });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showQRVerifyDialog, setShowQRVerifyDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [selectedImagePayment, setSelectedImagePayment] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationAmount, setVerificationAmount] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const closeReceiptViewer = () => {
    setShowImageViewer(false);
    setSelectedImage(null);
    setSelectedImagePayment(null);
    setSelectedImageUri(null);
  };
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
  const [paymentDatePicker, setPaymentDatePicker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [monthlyDuesAmount, setMonthlyDuesAmount] = useState(0);
  const [duesAmountDraft, setDuesAmountDraft] = useState('');
  const [showDuesDialog, setShowDuesDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);

  const { user } = useAuth();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (paymentTypeFilter !== 'all') params.paymentType = paymentTypeFilter;
      if (paymentMethodFilter !== 'all') params.paymentMethod = paymentMethodFilter;
      if (paymentStartDate) params.startDate = paymentStartDate;
      if (paymentEndDate) params.endDate = paymentEndDate;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      
      const response = await api.get('/payments', { params });
      
      if (response.data.success) {
        setPayments(response.data.data);
        setTotal(response.data.pagination.total);
        setSummary(prev => ({ ...prev, ...response.data.summary }));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, paymentTypeFilter, paymentMethodFilter, paymentStartDate, paymentEndDate, searchQuery]);

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

  const fetchMonthlyDuesAmount = useCallback(async () => {
    try {
      const response = await api.get('/payments/admin/monthly-dues-amount');
      const amount = response.data?.data?.amount || 0;
      setMonthlyDuesAmount(amount);
      setDuesAmountDraft(String(amount));
    } catch (error) {
      console.error('Error fetching monthly dues amount:', error);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchStats();
    fetchMonthlyDuesAmount();
  }, [fetchPayments, fetchStats, fetchMonthlyDuesAmount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchDraft.trim());
    }, 450);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, paymentTypeFilter, paymentMethodFilter, paymentStartDate, paymentEndDate, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
    fetchStats();
    fetchMonthlyDuesAmount();
  };

  const handleUpdateDuesAmount = async () => {
    const draft = String(duesAmountDraft || '').trim();
    const amount = Number(draft);
    if (!draft || !/^\d+(\.\d+)?$/.test(draft) || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a monthly dues amount greater than zero.');
      return;
    }
    setProcessing(true);
    try {
      const response = await api.put('/payments/admin/monthly-dues-amount', { amount });
      setMonthlyDuesAmount(response.data?.data?.amount ?? amount);
      setShowDuesDialog(false);
      Alert.alert('Monthly dues updated', 'The new amount will apply when monthly invoices are generated.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update monthly dues.');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportFile = async (fileFormat = 'pdf') => {
    setExporting(true);
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams({ format: fileFormat, timezoneOffset: String(new Date().getTimezoneOffset()) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (paymentTypeFilter !== 'all') params.set('paymentType', paymentTypeFilter);
      if (paymentMethodFilter !== 'all') params.set('paymentMethod', paymentMethodFilter);
      if (paymentStartDate) params.set('startDate', paymentStartDate);
      if (paymentEndDate) params.set('endDate', paymentEndDate);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const target = `${FileSystem.cacheDirectory}VIMS_Payments_${new Date().toISOString().slice(0, 10)}.${fileFormat}`;
      const result = await FileSystem.downloadAsync(
        `${api.defaults.baseURL}/payments?${params.toString()}`,
        target,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (result.status !== 200) throw new Error('Export request failed');
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Export ready', `Saved to ${result.uri}`);
        return;
      }
      await Sharing.shareAsync(result.uri, {
        mimeType: fileFormat === 'pdf' ? 'application/pdf' : 'text/csv',
        dialogTitle: `Export payments ${fileFormat.toUpperCase()}`
      });
    } catch (error) {
      Alert.alert('Export failed', `The payments ${fileFormat.toUpperCase()} could not be generated.`);
    } finally {
      setExporting(false);
    }
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
        verifiedAmount: verificationAmount || undefined,
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
        setVerificationAmount('');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to verify payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a rejection reason so the resident knows what happened.');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.put(`/payments/${selectedPayment._id}/reject`, { rejectionReason });

      if (response.data.success) {
        Alert.alert('Success', 'Payment rejected. The resident can submit again.');
        fetchPayments();
        fetchStats();
        setShowRejectDialog(false);
        setSelectedPayment(null);
        setRejectionReason('');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendReminders = async () => {
    setProcessing(true);
    try {
      const response = await api.post('/payments/send-reminders', {});
      
      if (response.data.success) {
        const message = response.data.message || 'Payment reminders processed.';
        const sentCount = response.data.data?.sent ?? Number(String(message).match(/\d+/)?.[0] || 0);
        Alert.alert(sentCount > 0 ? 'Reminders Sent' : 'No Eligible Accounts', message);
        setShowReminderDialog(false);
        fetchPayments();
        fetchStats();
      } else {
        Alert.alert('Reminder Status', response.data?.error || response.data?.message || 'No reminders were sent.');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send reminders');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewReceiptImage = async (payment) => {
    const receiptImage = payment?.receiptImage || payment?.paymentHistory?.slice().reverse().find((transaction) => transaction.receiptImage)?.receiptImage;
    setSelectedImage(receiptImage);
    setSelectedImagePayment(payment);
    setSelectedImageUri(null);
    setShowImageViewer(true);

    if (!receiptImage) {
      Alert.alert('Receipt Missing', 'No receipt image is available for this payment.');
      return;
    }

    const previewUri = await getProtectedImageDataUrl(`/payments/receipt-image/payment/${payment._id}`);
    if (previewUri) {
      setSelectedImageUri(previewUri);
    } else {
      Alert.alert('Preview unavailable', 'Unable to load this receipt image.');
    }
  };

  const handleShareReceiptImage = async () => {
    if (!selectedImageUri) return;
    try {
      const match = selectedImageUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error('Unsupported receipt format');
      const extension = match[1].includes('png') ? 'png' : 'jpg';
      const target = `${FileSystem.cacheDirectory}payment-receipt-${selectedImagePayment?.invoiceNumber || Date.now()}.${extension}`;
      await FileSystem.writeAsStringAsync(target, match[2], { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(target, { mimeType: match[1], dialogTitle: 'Save or share payment receipt' });
    } catch (error) {
      Alert.alert('Unable to share', 'The receipt image could not be saved or shared.');
    }
  };

  const clearPaymentFilters = () => {
    setSearchDraft('');
    setSearchQuery('');
    setStatusFilter('all');
    setPaymentTypeFilter('all');
    setPaymentMethodFilter('all');
    setPaymentStartDate('');
    setPaymentEndDate('');
    setPaymentDatePicker(null);
    setPage(1);
  };

  const selectPaymentDate = (field, selectedDate) => {
    if (Platform.OS === 'android') setPaymentDatePicker(null);
    if (!selectedDate) return;
    const value = format(selectedDate, 'yyyy-MM-dd');
    if (field === 'start') {
      if (paymentEndDate && value > paymentEndDate) {
        Alert.alert('Invalid Date Range', 'The start date must be before or equal to the end date.');
        return;
      }
      setPaymentStartDate(value);
    } else {
      if (paymentStartDate && value < paymentStartDate) {
        Alert.alert('Invalid Date Range', 'The end date must be after or equal to the start date.');
        return;
      }
      setPaymentEndDate(value);
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
    if (status === 'failed') {
      return { label: 'Failed', color: themeColors.error, icon: 'close-circle' };
    }
    if (status === 'refunded') {
      return { label: 'Refunded', color: themeColors.info, icon: 'return-up-back' };
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
    const residentName = `${payment.residentId?.firstName || ''} ${payment.residentId?.lastName || ''}`.toLowerCase();
    return (
      residentName.includes(query) ||
      String(payment.residentId?.houseNumber || '').toLowerCase().includes(query) ||
      String(payment.invoiceNumber || '').toLowerCase().includes(query) ||
      String(payment.referenceNumber || '').toLowerCase().includes(query) ||
      String(payment.receiptNumber || '').toLowerCase().includes(query) ||
      String(payment.description || '').toLowerCase().includes(query)
    );
  });

  const renderScreenHeader = () => (
    <View>

      <View style={styles.financeSnapshot}>
        {[
          ['Monthly', formatCurrency(summary.monthlyCollected)],
          ['Pending', formatCurrency(summary.pendingTotal)],
          ['Rate', `${summary.collectionRate || 0}%`],
        ].map(([label, value]) => (
          <View key={label} style={styles.snapshotItem}>
            <Text style={styles.snapshotLabel}>{label}</Text>
            <Text style={styles.snapshotValue}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search resident, invoice, or reference"
            value={searchDraft}
            onChangeText={setSearchDraft}
            blurOnSubmit={false}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, (statusFilter !== 'all' || paymentTypeFilter !== 'all' || paymentMethodFilter !== 'all') && styles.activeFilter]}
          onPress={() => setShowFiltersDialog(true)}
        >
          <Ionicons name="filter" size={17} color={(statusFilter !== 'all' || paymentTypeFilter !== 'all' || paymentMethodFilter !== 'all') ? 'white' : themeColors.textSecondary} />
          <Text style={[styles.filterText, (statusFilter !== 'all' || paymentTypeFilter !== 'all' || paymentMethodFilter !== 'all') && styles.activeFilterText]}>Filter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
            <Text style={styles.detailLabel}>Balance</Text>
            <Text style={styles.detailValue}>{formatCurrency(payment.amount)}</Text>
            {!!payment.penaltyAmount && <Text style={[styles.referenceText, { color: themeColors.error }]}>+{formatCurrency(payment.penaltyAmount)} penalty</Text>}
          </View>
          <View>
            <Text style={styles.detailLabel}>Paid</Text>
            <Text style={styles.detailValue}>{formatCurrency(payment.paidAmount)}</Text>
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
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => {
              setSelectedPayment(payment);
              setShowDetailsDialog(true);
            }}
          >
            <Ionicons name="document-text-outline" size={18} color={themeColors.primaryDeep} />
            <Text style={[styles.actionButtonText, { color: themeColors.primaryDeep }]}>Details</Text>
          </TouchableOpacity>
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
                setVerificationAmount(String(payment.receiptAi?.extracted?.amount || payment.submittedAmount || payment.amount || ''));
                setShowQRVerifyDialog(true);
              }}
            >
              <Ionicons name="shield-checkmark" size={18} color="white" />
              <Text style={styles.actionButtonText}>Verify QRPh</Text>
            </TouchableOpacity>
          )}

          {payment.status === 'pending' && !!(payment.paymentMethod || payment.referenceNumber || payment.receiptImage) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => {
                setSelectedPayment(payment);
                setRejectionReason('');
                setShowRejectDialog(true);
              }}
            >
              <Ionicons name="close-circle" size={18} color="white" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          )}
          
          {(payment.receiptImage || payment.paymentHistory?.some((transaction) => transaction.receiptImage)) && (
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
    <View style={styles.listHeaderControls}>
      <View style={styles.directoryHeader}>
        <View style={styles.directoryTopRow}>
          <View>
            <Text style={styles.directoryEyebrow}>ADMIN PAYMENTS</Text>
            <Text style={styles.directoryTitle}>Payments</Text>
            <Text style={styles.directorySubtitle}>{total || payments.length} payment records</Text>
          </View>
          <UserDropdownMenu navigation={navigation} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.directoryActions}>
          <TouchableOpacity onPress={onRefresh} style={styles.directoryPrimaryAction}>
            <Ionicons name="refresh" size={16} color="white" />
            <Text style={styles.directoryPrimaryText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFiltersDialog(true)} style={styles.directoryIconAction}>
            <Ionicons name="options-outline" size={17} color={themeColors.primaryDeep} />
            <Text style={styles.directoryIconActionText}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDuesDialog(true)} style={styles.directoryIconAction}>
            <Ionicons name="settings-outline" size={17} color={themeColors.primaryDeep} />
            <Text style={styles.directoryIconActionText}>Dues</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleExportFile('pdf')} style={styles.directoryIconAction} disabled={exporting}>
            {exporting ? <ActivityIndicator size="small" color={themeColors.primaryDeep} /> : <Ionicons name="document-text-outline" size={17} color={themeColors.primaryDeep} />}
            <Text style={styles.directoryIconActionText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowReminderDialog(true)} style={styles.directoryIconAction} disabled={processing}>
            <Ionicons name="mail-outline" size={17} color={themeColors.primaryDeep} />
            <Text style={styles.directoryIconActionText}>Send Reminders</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      {/* Payments List */}
      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentCard}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderScreenHeader()}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyText}>No payments found</Text>
          </View>
        }
        ListFooterComponent={total > 20 ? (
          <View style={styles.pagination}>
            <TouchableOpacity disabled={page <= 1} style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]} onPress={() => setPage(current => Math.max(1, current - 1))}>
              <Ionicons name="chevron-back" size={18} color={themeColors.primaryDeep} />
              <Text style={styles.pageButtonText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.pageIndicator}>Page {page} of {Math.ceil(total / 20)}</Text>
            <TouchableOpacity disabled={page >= Math.ceil(total / 20)} style={[styles.pageButton, page >= Math.ceil(total / 20) && styles.pageButtonDisabled]} onPress={() => setPage(current => current + 1)}>
              <Text style={styles.pageButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={18} color={themeColors.primaryDeep} />
            </TouchableOpacity>
          </View>
        ) : null}
      />

      <Modal visible={showFiltersDialog} transparent animationType="slide" onRequestClose={() => setShowFiltersDialog(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filter payments</Text>
                <Text style={styles.detailModalInvoice}>Use advanced filters only when needed</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFiltersDialog(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.filterGroupLabel}>PAYMENT TYPE</Text>
            <View style={styles.wrappedFilters}>
              {[['all', 'All types'], ['monthly_dues', 'Monthly dues'], ['special_assessment', 'Special assessment'], ['service_fee', 'Service fee'], ['penalty', 'Penalty']].map(([value, label]) => (
                <TouchableOpacity key={value} style={[styles.filterChip, paymentTypeFilter === value && styles.filterChipActive]} onPress={() => setPaymentTypeFilter(value)}>
                  <Text style={[styles.filterChipText, paymentTypeFilter === value && styles.filterChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.filterGroupLabel}>STATUS</Text>
            <View style={styles.wrappedFilters}>
              {[['all', 'All statuses'], ['pending', 'Pending'], ['paid', 'Paid'], ['overdue', 'Overdue'], ['failed', 'Failed'], ['refunded', 'Refunded']].map(([value, label]) => (
                <TouchableOpacity key={value} style={[styles.filterChip, statusFilter === value && styles.filterChipActive]} onPress={() => setStatusFilter(value)}>
                  <Text style={[styles.filterChipText, statusFilter === value && styles.filterChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.filterGroupLabel}>PAYMENT METHOD</Text>
            <View style={styles.wrappedFilters}>
              {[['all', 'All methods'], ['cash', 'Cash'], ['qrph', 'QRPh'], ['gcash', 'GCash'], ['paymaya', 'PayMaya'], ['bank_transfer', 'Bank transfer'], ['check', 'Check']].map(([value, label]) => (
                <TouchableOpacity key={value} style={[styles.filterChip, paymentMethodFilter === value && styles.filterChipActive]} onPress={() => setPaymentMethodFilter(value)}>
                  <Text style={[styles.filterChipText, paymentMethodFilter === value && styles.filterChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
             </View>
             <Text style={styles.filterGroupLabel}>DATE RANGE</Text>
             <View style={styles.filterDateRow}>
               <TouchableOpacity style={styles.filterDateInput} onPress={() => setPaymentDatePicker('start')} disabled={exporting}>
                 <Ionicons name="calendar-outline" size={16} color={themeColors.primaryDeep} />
                 <Text style={[styles.filterDateText, !paymentStartDate && styles.filterDatePlaceholder]}>
                   {paymentStartDate || 'Start date'}
                 </Text>
                 {paymentStartDate ? (
                   <TouchableOpacity onPress={() => setPaymentStartDate('')}>
                     <Ionicons name="close-circle" size={16} color={themeColors.textSecondary} />
                   </TouchableOpacity>
                 ) : null}
               </TouchableOpacity>
               <TouchableOpacity style={styles.filterDateInput} onPress={() => setPaymentDatePicker('end')} disabled={exporting}>
                 <Ionicons name="calendar-outline" size={16} color={themeColors.primaryDeep} />
                 <Text style={[styles.filterDateText, !paymentEndDate && styles.filterDatePlaceholder]}>
                   {paymentEndDate || 'End date'}
                 </Text>
                 {paymentEndDate ? (
                   <TouchableOpacity onPress={() => setPaymentEndDate('')}>
                     <Ionicons name="close-circle" size={16} color={themeColors.textSecondary} />
                   </TouchableOpacity>
                 ) : null}
               </TouchableOpacity>
             </View>
             {paymentDatePicker ? (
               <DateTimePicker
                 value={new Date((paymentDatePicker === 'start' ? paymentStartDate : paymentEndDate) || Date.now())}
                 mode="date"
                 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                 onChange={(event, date) => {
                   if (Platform.OS === 'android') setPaymentDatePicker(null);
                   if (event?.type === 'dismissed') {
                     setPaymentDatePicker(null);
                     return;
                   }
                   selectPaymentDate(paymentDatePicker, date);
                 }}
               />
             ) : null}
             <View style={styles.filterSheetActions}>
              <TouchableOpacity style={styles.clearFilterButton} onPress={clearPaymentFilters}>
                <Text style={styles.clearFilterButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFilterButton} onPress={() => setShowFiltersDialog(false)}>
                <Text style={styles.applyFilterButtonText}>Show payments</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDuesDialog} transparent animationType="fade" onRequestClose={() => setShowDuesDialog(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Set Monthly Dues</Text>
            <Text style={styles.confirmMessage}>This amount is used for newly generated monthly invoices.</Text>
            <TextInput style={styles.duesInput} value={duesAmountDraft} onChangeText={setDuesAmountDraft} keyboardType="decimal-pad" placeholder="0.00" />
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelConfirmButton} onPress={() => setShowDuesDialog(false)}><Text style={styles.cancelConfirmText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmButtonLarge} onPress={handleUpdateDuesAmount} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.confirmButtonText}>Save Amount</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDetailsDialog} transparent animationType="slide" onRequestClose={() => setShowDetailsDialog(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '86%' }]}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>Payment Details</Text><Text style={styles.detailModalInvoice}>{selectedPayment?.invoiceNumber}</Text></View>
              <TouchableOpacity onPress={() => setShowDetailsDialog(false)}><Ionicons name="close" size={24} color={themeColors.textPrimary} /></TouchableOpacity>
            </View>
            {selectedPayment && (
              <ScrollView>
                {[
                  ['Resident', `${selectedPayment.residentId?.firstName || ''} ${selectedPayment.residentId?.lastName || ''}`.trim() || 'N/A'],
                  ['House', selectedPayment.residentId?.houseNumber || 'N/A'],
                  ['Balance', formatCurrency(selectedPayment.amount)],
                  ['Paid so far', formatCurrency(selectedPayment.paidAmount)],
                  ['Penalty', formatCurrency(selectedPayment.penaltyAmount)],
                  ['Type', (selectedPayment.paymentType || 'N/A').replace(/_/g, ' ')],
                  ['Status', getStatusChip(selectedPayment.status, selectedPayment.dueDate).label],
                  ['Method', getPaymentMethodConfig(selectedPayment.paymentMethod).label],
                  ['Due date', formatDate(selectedPayment.dueDate)],
                  ['Payment date', formatDate(selectedPayment.paymentDate)],
                  ['Reference', selectedPayment.referenceNumber || 'N/A'],
                  ['Receipt number', selectedPayment.receiptNumber || 'N/A']
                ].map(([label, value]) => <View key={label} style={styles.detailModalRow}><Text style={styles.detailModalLabel}>{label}</Text><Text style={styles.detailModalValue}>{value}</Text></View>)}
                <Text style={styles.detailSectionTitle}>Description</Text>
                <Text style={styles.detailBody}>{selectedPayment.description || 'No description'}</Text>
                {!!selectedPayment.inclusions?.length && <><Text style={styles.detailSectionTitle}>Inclusions</Text><Text style={styles.detailBody}>{selectedPayment.inclusions.join(' • ')}</Text></>}
                {!!selectedPayment.notes && <><Text style={styles.detailSectionTitle}>Notes</Text><Text style={styles.detailBody}>{selectedPayment.notes}</Text></>}
                {!!selectedPayment.receiptAi && <><Text style={styles.detailSectionTitle}>AI receipt review</Text><Text style={[styles.detailBody, { color: getReceiptAiMeta(selectedPayment.receiptAi).color }]}>{getReceiptAiMeta(selectedPayment.receiptAi).label} · Fraud score {typeof selectedPayment.receiptAi.fraudScore === 'number' ? selectedPayment.receiptAi.fraudScore.toFixed(2) : 'N/A'}</Text><Text style={styles.detailBody}>{selectedPayment.receiptAi.explanation || 'No AI explanation provided.'}</Text></>}
                <TouchableOpacity style={[styles.actionButton, styles.viewButton, { marginTop: 14, alignSelf: 'flex-start' }]} onPress={() => handleViewReceiptImage(selectedPayment)}>
                  <Ionicons name="image-outline" size={18} color={themeColors.info} />
                  <Text style={[styles.actionButtonText, { color: themeColors.info }]}>View / Save Receipt</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
                  <Text style={styles.confirmLabel}>Balance: <Text style={styles.confirmValue}>{formatCurrency(selectedPayment.amount)}</Text></Text>
                  <Text style={styles.confirmLabel}>Paid so far: <Text style={styles.confirmValue}>{formatCurrency(selectedPayment.paidAmount)}</Text></Text>
                </View>
                <Text style={styles.confirmMessage}>Confirm that you have received cash payment for this invoice?</Text>
              </>
            )}
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelConfirmButton} onPress={() => setShowConfirmDialog(false)}>
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButtonLarge} onPress={handleConfirmCashPayment} disabled={processing}>
                {processing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.confirmButtonText}>Apply Payment</Text>}
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
                    <Text style={styles.verifyLabel}>Balance:</Text>
                    <Text style={[styles.verifyValue, { color: themeColors.success, fontWeight: '700' }]}>
                      {formatCurrency(selectedPayment.amount)}
                    </Text>
                  </View>
                  <View style={styles.verifyRow}>
                    <Text style={styles.verifyLabel}>AI scanned:</Text>
                    <Text style={[styles.verifyValue, { color: themeColors.info }]}>
                      {selectedPayment.receiptAi?.extracted?.amount || (selectedPayment.submittedAmount ? formatCurrency(selectedPayment.submittedAmount) : 'Needs admin check')}
                    </Text>
                  </View>
                  {!!selectedPayment.paidAmount && (
                    <View style={styles.verifyRow}>
                      <Text style={styles.verifyLabel}>Paid so far:</Text>
                      <Text style={styles.verifyValue}>{formatCurrency(selectedPayment.paidAmount)}</Text>
                    </View>
                  )}
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
                    {!!selectedPayment.receiptAi.explanation && (
                      <Text style={[styles.verifyValue, { marginTop: 8 }]}>{selectedPayment.receiptAi.explanation}</Text>
                    )}
                  </View>
                )}
                
                <TextInput
                  style={styles.notesInput}
                  placeholder="Verified receipt amount"
                  value={verificationAmount}
                  onChangeText={setVerificationAmount}
                  keyboardType="decimal-pad"
                />
                <Text style={[styles.verifyValue, { marginBottom: 10 }]}>Expected store credit: {formatCurrency(Math.max(0, Number(verificationAmount || 0) - Number(selectedPayment.amount || 0)))}</Text>
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
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.verifySubmitText}>Verify & Apply Payment</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Reject Payment Dialog */}
      <Modal
        visible={showRejectDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Reject Payment</Text>
            {selectedPayment && (
              <>
                <View style={styles.confirmDetails}>
                  <Text style={styles.confirmLabel}>Invoice: <Text style={styles.confirmValue}>{selectedPayment.invoiceNumber}</Text></Text>
                  <Text style={styles.confirmLabel}>Resident: <Text style={styles.confirmValue}>{selectedPayment.residentId?.firstName} {selectedPayment.residentId?.lastName}</Text></Text>
                  <Text style={styles.confirmLabel}>Reference: <Text style={styles.confirmValue}>{selectedPayment.referenceNumber || 'N/A'}</Text></Text>
                  <Text style={styles.confirmLabel}>Balance: <Text style={styles.confirmValue}>{formatCurrency(selectedPayment.amount)}</Text></Text>
                </View>
                <Text style={styles.confirmMessage}>The resident will see this reason and can submit a new payment.</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Rejection reason"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </>
            )}
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelConfirmButton} onPress={() => setShowRejectDialog(false)}>
                <Text style={styles.cancelConfirmText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButtonLarge, styles.rejectButton]} onPress={handleRejectPayment} disabled={processing || !rejectionReason.trim()}>
                {processing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.confirmButtonText}>Reject Payment</Text>}
              </TouchableOpacity>
            </View>
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
            <Text style={styles.reminderTitle}>Send Payment Reminders</Text>
            <Text style={styles.reminderMessage}>
              This will send email reminders for unpaid pending payments. Payments already submitted and awaiting admin review are skipped.
            </Text>
            <View style={styles.reminderActions}>
              <TouchableOpacity style={styles.cancelReminderButton} onPress={() => setShowReminderDialog(false)} disabled={processing}>
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
              <Text style={styles.noPreviewText}>Receipt image could not be loaded. It may be missing or corrupted.</Text>
            </View>
          ) : (
            <View style={[styles.fullImage, styles.noPreviewContainer]}>
              <Ionicons name="alert-circle-outline" size={42} color="white" />
              <Text style={styles.noPreviewText}>No receipt image is attached to this payment.</Text>
            </View>
          )}
          {selectedImagePayment && (
            <View style={styles.imageInfo}>
              <Text style={styles.imageInfoText}>Invoice: {selectedImagePayment.invoiceNumber}</Text>
              <Text style={styles.imageInfoText}>Balance: {formatCurrency(selectedImagePayment.amount)}</Text>
              <TouchableOpacity style={styles.shareReceiptButton} onPress={handleShareReceiptImage} disabled={!selectedImageUri}>
                <Ionicons name="share-outline" size={18} color="white" />
                <Text style={styles.shareReceiptText}>Save or share receipt</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: roleLayouts.admin.screen,
  ledgerHeader: { backgroundColor: themeColors.cardBackground, paddingTop: 46, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  directoryHeader: { backgroundColor: themeColors.cardBackground, paddingTop: 42, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  directoryTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  directoryEyebrow: { color: themeColors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  directoryTitle: { color: themeColors.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: 0, marginTop: 1 },
  directorySubtitle: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 2 },
  directoryActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingRight: 16 },
  directoryPrimaryAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: themeColors.primary, paddingHorizontal: 12, height: 36, borderRadius: 12 },
  directoryPrimaryText: { color: 'white', fontSize: 11, fontWeight: '900' },
  directoryIconAction: { flexDirection: 'row', height: 36, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: themeColors.accent },
  directoryIconActionText: { color: themeColors.primaryDeep, fontSize: 11, fontWeight: '900' },
  ledgerEyebrow: { color: themeColors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  ledgerTitle: { color: themeColors.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.7, marginTop: 1 },
  ledgerSubtitle: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '500', marginTop: 2 },
  ledgerBalance: { backgroundColor: themeColors.primaryDeep, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  ledgerBalanceLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  ledgerBalanceValue: { color: 'white', fontSize: 23, fontWeight: '800', marginTop: 2 },
  ledgerBalanceBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  ledgerBalanceMeta: { color: 'rgba(255,255,255,0.66)', fontSize: 11, fontWeight: '700' },
  ledgerAssistant: { height: 28, paddingHorizontal: 8, borderRadius: 8, backgroundColor: themeColors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  ledgerAssistantText: { color: themeColors.primaryDeep, fontSize: 10, fontWeight: '900' },
  listHeaderControls: { flex: 1, paddingBottom: 8 },
  ledgerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10, paddingBottom: 8 },
  ledgerActionPrimary: { height: 40, paddingHorizontal: 13, borderRadius: 10, backgroundColor: themeColors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  ledgerActionPrimaryText: { color: 'white', fontSize: 13, fontWeight: '900' },
  ledgerActionSecondary: { height: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: themeColors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ledgerActionSecondaryText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
  financeSnapshot: { flexDirection: 'row', marginBottom: 8, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, paddingVertical: 8 },
  snapshotItem: { flex: 1, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: themeColors.border },
  snapshotLabel: { color: themeColors.textSecondary, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  snapshotValue: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '800', marginTop: 2 },
  filterPanel: { paddingBottom: 7 },
  compactFilterButton: { width: 42, height: 42, borderRadius: 10, backgroundColor: themeColors.primarySoft, borderWidth: 1, borderColor: themeColors.border, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  compactFilterButtonActive: { backgroundColor: themeColors.primaryDeep, borderColor: themeColors.primaryDeep },
  filterDot: { position: 'absolute', right: 8, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: themeColors.accent },
  filterGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterGroupLabel: { color: themeColors.textSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 7, marginBottom: 7 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'white', borderWidth: 1, borderColor: themeColors.border, borderRadius: 999, marginRight: 7 },
  filterChipActive: { backgroundColor: themeColors.primaryDeep, borderColor: themeColors.primaryDeep },
  filterChipText: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: 'white' },
  clearFilters: { color: themeColors.primary, fontSize: 11, fontWeight: '800', marginTop: 7 },
  activeFilterSummary: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: themeColors.primarySoft, borderRadius: 10 },
  activeFilterSummaryText: { flex: 1, color: themeColors.primaryDeep, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  filterSheet: { width: '100%', backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  wrappedFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterSheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  filterDateRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterDateInput: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  filterDateText: { flex: 1, color: themeColors.textPrimary, fontSize: 13, fontWeight: '600' },
  filterDatePlaceholder: { color: themeColors.textSecondary, fontWeight: '500' },
  clearFilterButton: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12, backgroundColor: '#f1f5f9' },
  clearFilterButtonText: { color: themeColors.textSecondary, fontWeight: '800' },
  applyFilterButton: { flex: 2, alignItems: 'center', paddingVertical: 13, borderRadius: 12, backgroundColor: themeColors.primaryDeep },
  applyFilterButtonText: { color: 'white', fontWeight: '900' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  pageButton: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: 10, borderRadius: 10, backgroundColor: themeColors.primarySoft },
  pageButtonDisabled: { opacity: 0.35 },
  pageButtonText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '800' },
  pageIndicator: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '700' },
  duesInput: { borderWidth: 1, borderColor: themeColors.border, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 20, fontWeight: '800', color: themeColors.primaryDeep, marginBottom: 18 },
  detailModalInvoice: { color: themeColors.textSecondary, fontSize: 12, marginTop: 2 },
  detailModalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  detailModalLabel: { color: themeColors.textSecondary, fontSize: 13 },
  detailModalValue: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right', textTransform: 'capitalize' },
  detailSectionTitle: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900', marginTop: 18, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 },
  detailBody: { color: themeColors.textSecondary, fontSize: 13, lineHeight: 20 },
  header: {
    ...roleLayouts.admin.header,
    paddingTop: 54,
    paddingBottom: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 34,
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
    backgroundColor: themeColors.background,
  },
  coloredStatCard: {
    flex: 1,
    borderRadius: 18,
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
    borderRadius: 16,
    gap: 8,
  },
  actionBarButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
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
    paddingTop: 10,
  },
  paymentCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
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
  rejectButton: {
    backgroundColor: themeColors.error,
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
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 24,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceTint,
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
  shareReceiptButton: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: 10, backgroundColor: themeColors.primary },
  shareReceiptText: { color: 'white', fontSize: 13, fontWeight: '800' },
});

export default AdminPaymentsScreen;
