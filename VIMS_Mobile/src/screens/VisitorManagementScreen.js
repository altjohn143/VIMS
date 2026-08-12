import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, radii, shadows, roleLayouts } from '../utils/theme';
import api from '../utils/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Camera, CameraView } from 'expo-camera';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import ResidentUtilityHeader from '../components/ResidentUtilityHeader';

const MAX_VISITOR_STAY_MS = 3 * 24 * 60 * 60 * 1000;

const VisitorManagementScreen = ({ navigation }) => {
  const [visitors, setVisitors] = useState([]);
  const [allVisitors, setAllVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [historyMode, setHistoryMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState('');
  const [pickerMode, setPickerMode] = useState('date');
  const [pendingDateValue, setPendingDateValue] = useState(null);
  const [showConfirmScanner, setShowConfirmScanner] = useState(false);
  const [isConfirmingScan, setIsConfirmingScan] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [residentScanMode, setResidentScanMode] = useState('arrival');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [cancellingVisitorId, setCancellingVisitorId] = useState(null);

  const [formData, setFormData] = useState({
    visitorName: '',
    visitorPhone: '',
    vehicleNumber: '',
    purpose: '',
    expectedArrival: new Date(),
    expectedDeparture: new Date(Date.now() + 2 * 60 * 60 * 1000),
    numberOfCompanions: '0',
    specialNotes: '',
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/visitors/my');
      if (response.data.success) {
        setVisitors(response.data.data);
      }
      
      const historyResponse = await api.get('/visitors/history');
      if (historyResponse.data.success) {
        setAllVisitors(historyResponse.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch visitors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVisitors();
  };

  const validateName = (name) => {
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!name.trim()) return 'Name is required';
    if (!nameRegex.test(name)) return 'Name can only contain letters and spaces';
    if (name.length < 2) return 'Name must be at least 2 characters';
    return '';
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\d{10}$/;
    if (!phone.trim()) return 'Phone number is required';
    if (!phoneRegex.test(phone)) return 'Phone number must be exactly 10 digits';
    return '';
  };

  const validateVisitWindow = () => {
    const arrival = new Date(formData.expectedArrival);
    const departure = new Date(formData.expectedDeparture);

    if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime())) {
      return 'Please select valid arrival and departure dates';
    }

    if (departure <= arrival) {
      return 'Expected departure must be after expected arrival';
    }

    if (departure.getTime() - arrival.getTime() > MAX_VISITOR_STAY_MS) {
      return 'Visitors cannot stay more than 3 days in the village';
    }

    return '';
  };

  const handleInputChange = (field, value) => {
    if (field === 'visitorName') {
      const filtered = value.replace(/[^A-Za-z\s]/g, '');
      setFormData(prev => ({ ...prev, [field]: filtered }));
      setFormErrors(prev => ({ ...prev, [field]: validateName(filtered) }));
    } else if (field === 'visitorPhone') {
      const filtered = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [field]: filtered }));
      setFormErrors(prev => ({ ...prev, [field]: validatePhone(filtered) }));
    } else if (field === 'numberOfCompanions') {
      const filtered = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [field]: filtered }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const openDateTimePicker = (field) => {
    setDatePickerField(field);
    setPendingDateValue(formData[field] || new Date());
    setPickerMode('date');
    setShowDatePicker(true);
  };

  const closeDateTimePicker = () => {
    setShowDatePicker(false);
    setPickerMode('date');
    setPendingDateValue(null);
  };

  const applySelectedDatePart = (selectedDate) => {
    const currentValue = formData[datePickerField] || new Date();
    const mergedDate = new Date(selectedDate);
    mergedDate.setHours(currentValue.getHours(), currentValue.getMinutes(), 0, 0);
    setPendingDateValue(mergedDate);
    setPickerMode('time');
  };

  const applySelectedTimePart = (selectedTime) => {
    const baseDate = pendingDateValue || formData[datePickerField] || new Date();
    const mergedDateTime = new Date(baseDate);
    mergedDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    setFormData(prev => ({ ...prev, [datePickerField]: mergedDateTime }));
    closeDateTimePicker();
  };

  const handleDateChange = (event, selectedDate) => {
    if (!selectedDate || event?.type === 'dismissed') {
      closeDateTimePicker();
      return;
    }

    if (Platform.OS === 'android') {
      if (pickerMode === 'date') {
        applySelectedDatePart(selectedDate);
        setShowDatePicker(true);
        return;
      }

      applySelectedTimePart(selectedDate);
      return;
    }

    setPendingDateValue(selectedDate);
  };

  const handleIosPickerDone = () => {
    if (pickerMode === 'date') {
      applySelectedDatePart(pendingDateValue || formData[datePickerField] || new Date());
      return;
    }

    applySelectedTimePart(pendingDateValue || formData[datePickerField] || new Date());
  };

  const handleCreateVisitor = async () => {
    const nameError = validateName(formData.visitorName);
    const phoneError = validatePhone(formData.visitorPhone);

    if (nameError || phoneError) {
      setFormErrors({ visitorName: nameError, visitorPhone: phoneError });
      Alert.alert('Error', 'Please fix the form errors');
      return;
    }

    const visitWindowError = validateVisitWindow();
    if (visitWindowError) {
      Alert.alert('Invalid Visit Schedule', visitWindowError);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/visitors', {
        ...formData,
        numberOfCompanions: parseInt(formData.numberOfCompanions) || 0,
      });
      
      if (response.data.success) {
        Alert.alert('Success', 'Visitor pass created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchVisitors();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create visitor pass');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      visitorName: '',
      visitorPhone: '',
      vehicleNumber: '',
      purpose: '',
      expectedArrival: new Date(),
      expectedDeparture: new Date(Date.now() + 2 * 60 * 60 * 1000),
      numberOfCompanions: '0',
      specialNotes: '',
    });
    setFormErrors({});
  };

  const handleViewQR = (visitor) => {
    setSelectedVisitor(visitor);
    setShowQRModal(true);
  };

  const handleCancelRequest = async (visitorId) => {
    if (cancellingVisitorId) return;

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this visitor request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            setCancellingVisitorId(visitorId);
            try {
              let response;
              try {
                response = await api.put(`/visitors/${visitorId}/cancel`, { status: 'cancelled' });
              } catch (primaryError) {
                if (primaryError?.response?.status !== 404) throw primaryError;
                response = await api.put(`/visitors/${visitorId}/status`, { status: 'cancelled' });
              }
              if (response.data.success) {
                Alert.alert('Success', 'Visitor request cancelled');
                await fetchVisitors();
              } else {
                Alert.alert('Error', response.data?.error || 'Failed to cancel request');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to cancel request');
            } finally {
              setCancellingVisitorId(null);
            }
          },
        },
      ]
    );
  };

  const requestCameraPermission = async () => {
    if (typeof Camera?.requestCameraPermissionsAsync === 'function') {
      return Camera.requestCameraPermissionsAsync();
    }
    if (typeof Camera?.requestPermissionsAsync === 'function') {
      return Camera.requestPermissionsAsync();
    }
    return { granted: false };
  };

  const openResidentScanner = async (mode) => {
    if (!hasCameraPermission) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera Required', 'Please allow camera access to confirm visitor passes.');
        return;
      }
      setHasCameraPermission(true);
    }
    setResidentScanMode(mode);
    setShowConfirmScanner(true);
  };

  const handleResidentConfirmScan = async ({ data }) => {
    if (isConfirmingScan || !data) return;
    setIsConfirmingScan(true);
    try {
      const response = await api.post('/visitors/confirm-arrival', { scanValue: data, action: residentScanMode });
      if (response.data?.success) {
        const confirmedType = response.data?.data?.confirmedType;
        const title = confirmedType === 'departure' ? 'Visitor Departure Confirmed' : 'Visitor Confirmed';
        const fallbackMessage = confirmedType === 'departure'
          ? 'Your visitor departure is confirmed.'
          : 'Your visitor is confirmed.';
        Alert.alert(title, response.data.message || fallbackMessage);
        setShowConfirmScanner(false);
        fetchVisitors();
      }
    } catch (error) {
      Alert.alert('Unable to Confirm', error?.response?.data?.error || 'Failed to confirm visitor');
    } finally {
      setTimeout(() => setIsConfirmingScan(false), 800);
    }
  };

  const confirmScannerTitle = residentScanMode === 'departure' ? 'Confirm Visitor Departure' : 'Confirm Visitor Arrival';
  const confirmScannerHint = residentScanMode === 'departure'
    ? 'Scan the visitor pass when the visitor is leaving, before security logs the exit.'
    : 'Scan the visitor pass when the visitor arrives at your home.';

  const getVisitorQrStatus = (visitor) => {
    if (!visitor) return 'Unknown';
    if (visitor.qrStatus) return visitor.qrStatus;
    if (visitor.status === 'pending') return 'Pending';
    if (visitor.status === 'approved') return 'Approved';
    if (visitor.status === 'active') {
      if (visitor.actualExit) return 'Exited';
      if (visitor.residentDepartureConfirmedAt) return 'Departed';
      if (visitor.residentEntryConfirmedAt) return 'Arrived';
      if (visitor.actualEntry) return 'Entered';
      return 'Active';
    }
    if (visitor.status === 'completed') return 'Exited';
    if (visitor.status === 'rejected') return 'Rejected';
    if (visitor.status === 'cancelled') return 'Cancelled';
    return visitor.status ? visitor.status.charAt(0).toUpperCase() + visitor.status.slice(1) : 'Unknown';
  };

  const getVisitorProgressLabel = (visitor, baseLabel) => {
    const progress = visitor?.scanProgress || {};
    const total = Math.max(1, Number(progress.groupSize || visitor?.numberOfCompanions || 0));
    const status = String(baseLabel || '').toLowerCase();
    const countByStatus = {
      entered: progress.entryScanCount,
      arrived: progress.residentArrivalConfirmCount,
      departed: progress.residentDepartureConfirmCount,
      exited: progress.exitScanCount,
    };
    const count = Number(countByStatus[status] || 0);
    return count > 0 || ['entered', 'arrived', 'departed', 'exited'].includes(status)
      ? `${baseLabel} ${count}/${total}`
      : baseLabel;
  };

  const getStatusChip = (visitor) => {
    const status = getVisitorQrStatus(visitor);
    const config = {
      Pending: { label: 'Pending', color: themeColors.warning, icon: 'time', bg: themeColors.warning + '20' },
      Approved: { label: 'Approved', color: themeColors.success, icon: 'checkmark-circle', bg: themeColors.success + '20' },
      Entered: { label: 'Entered', color: themeColors.info, icon: 'log-in', bg: themeColors.info + '20' },
      Arrived: { label: 'Arrived', color: themeColors.success, icon: 'home', bg: themeColors.success + '20' },
      Departed: { label: 'Departed', color: themeColors.warning, icon: 'arrow-forward-circle', bg: themeColors.warning + '20' },
      Exited: { label: 'Exited', color: themeColors.textSecondary, icon: 'walk', bg: themeColors.textSecondary + '20' },
      Active: { label: 'Active', color: themeColors.info, icon: 'radio-button-on', bg: themeColors.info + '20' },
      Completed: { label: 'Exited', color: themeColors.textSecondary, icon: 'checkmark-done', bg: themeColors.textSecondary + '20' },
      Rejected: { label: 'Rejected', color: themeColors.error, icon: 'close-circle', bg: themeColors.error + '20' },
      Cancelled: { label: 'Cancelled', color: themeColors.error, icon: 'ban', bg: themeColors.error + '20' },
      Unknown: { label: 'Unknown', color: themeColors.textSecondary, icon: 'help-circle', bg: themeColors.textSecondary + '20' }
    };

    const chip = config[status] || config.Unknown;
    return { ...chip, label: getVisitorProgressLabel(visitor, chip.label) };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid Date';
    }
  };

  const getFilteredVisitors = () => {
    if (historyMode) return allVisitors;
    switch (activeTab) {
      case 0: return visitors.filter(v => ['pending', 'approved', 'active'].includes(v.status));
      case 1: return visitors.filter(v => v.status === 'completed');
      case 2: return visitors.filter(v => v.status === 'rejected' || v.status === 'cancelled');
      default: return visitors;
    }
  };
  const filteredVisitors = getFilteredVisitors();
  const paginatedVisitors = filteredVisitors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  useEffect(() => {
    setPage(0);
  }, [historyMode, activeTab, rowsPerPage]);

  const shareVisitorQr = () => {
    if (['rejected', 'cancelled'].includes(selectedVisitor?.status)) {
      Alert.alert('Pass Unavailable', 'Rejected or cancelled visitor passes cannot be shared.');
      return;
    }
    const qrCodeDataUrl = selectedVisitor?.qrCode;
    const base64Qr = typeof qrCodeDataUrl === 'string' ? qrCodeDataUrl.replace(/^data:image\/png;base64,/, '') : '';
    if (!base64Qr) {
      Alert.alert('QR Unavailable', 'The visitor QR code is not available yet.');
      return;
    }

    (async () => {
      try {
        const target = `${FileSystem.cacheDirectory}visitor-qr-${selectedVisitor?._id || Date.now()}.png`;
        await FileSystem.writeAsStringAsync(target, base64Qr, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(target, { mimeType: 'image/png', dialogTitle: 'Save or share visitor QR code' });
      } catch (error) {
        Alert.alert('Unable to share', 'The visitor QR code could not be saved or shared.');
      }
    })();
  };

  const stats = {
    total: visitors.length,
    today: visitors.filter(v => {
      try {
        return format(new Date(v.createdAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      } catch {
        return false;
      }
    }).length,
    active: visitors.filter(v => ['approved', 'active'].includes(v.status)).length,
    pending: visitors.filter(v => v.status === 'pending').length,
  };

  const renderListHeader = () => (
    <>
      {!historyMode && (
        <View style={styles.statsGrid}>
          <View style={styles.coloredStatCard}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="people-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.total}</Text>
            <Text style={styles.coloredStatLabel}>Total Visitors</Text>
          </View>
          <View style={styles.coloredStatCard}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="today-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.today}</Text>
            <Text style={styles.coloredStatLabel}>Today's Visitors</Text>
          </View>
          <View style={styles.coloredStatCard}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="radio-button-on-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.active}</Text>
            <Text style={styles.coloredStatLabel}>Active Visitors</Text>
          </View>
          <View style={styles.coloredStatCard}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="time-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.pending}</Text>
            <Text style={styles.coloredStatLabel}>Pending</Text>
          </View>
        </View>
      )}

      {!historyMode && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 0 && styles.activeTab]}
            onPress={() => setActiveTab(0)}
          >
            <Ionicons name="radio-button-on" size={16} color={activeTab === 0 ? themeColors.primary : themeColors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 1 && styles.activeTab]}
            onPress={() => setActiveTab(1)}
          >
            <Ionicons name="checkmark-done" size={16} color={activeTab === 1 ? themeColors.primary : themeColors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 2 && styles.activeTab]}
            onPress={() => setActiveTab(2)}
          >
            <Ionicons name="close-circle" size={16} color={activeTab === 2 ? themeColors.primary : themeColors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 2 && styles.activeTabText]}>Rejected</Text>
          </TouchableOpacity>
        </View>
      )}

      {!historyMode && (
        <View style={styles.confirmBar}>
          <TouchableOpacity style={styles.confirmScanButton} onPress={() => openResidentScanner('arrival')}>
            <Ionicons name="scan" size={18} color="white" />
            <Text style={styles.confirmScanText}>Confirm Visitor QR Scanner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.confirmScanButton, styles.departureScanButton]} onPress={() => openResidentScanner('departure')}>
            <Ionicons name="log-out-outline" size={18} color="white" />
            <Text style={styles.confirmScanText}>Confirm Departure QR Scanner</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderVisitorCard = ({ item }) => {
    const status = getStatusChip(item);
    const isQRValid = ['approved', 'active', 'completed'].includes(item.status);
    const isPending = item.status === 'pending';

    return (
      <View style={[styles.visitorCard, shadows.small]}>
        <View style={styles.visitorHeader}>
          <View style={styles.visitorInfo}>
            <Text style={styles.visitorName}>{item.visitorName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={12} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.visitorPhone}>{item.visitorPhone}</Text>
        </View>

        <View style={styles.visitorDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="people" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>Companions: {item.numberOfCompanions || 0}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="document-text" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText} numberOfLines={2}>{item.purpose}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>Arrival: {formatDate(item.expectedArrival)}</Text>
          </View>
          {item.vehicleNumber ? (
            <View style={styles.detailRow}>
              <Ionicons name="car" size={16} color={themeColors.textSecondary} />
              <Text style={styles.detailText}>{item.vehicleNumber}</Text>
            </View>
          ) : null}
          {item.specialNotes ? (
            <View style={[styles.detailRow, styles.specialNotes]}>
              <Ionicons name="alert-circle" size={16} color={themeColors.warning} />
              <Text style={[styles.detailText, styles.specialNotesText]}>{item.specialNotes}</Text>
            </View>
          ) : null}
          
          <View style={styles.visitorFooter}>
            <Text style={styles.createdText}>Created: {formatDate(item.createdAt)}</Text>
            <View style={styles.actionButtons}>
              {isQRValid && (
                <TouchableOpacity style={styles.iconButton} onPress={() => handleViewQR(item)}>
                  <Ionicons name="qr-code" size={20} color={themeColors.primary} />
                </TouchableOpacity>
              )}
              {isPending && (
                <TouchableOpacity
                  style={[styles.iconButton, cancellingVisitorId === item._id && styles.iconButtonDisabled]}
                  onPress={() => handleCancelRequest(item._id)}
                  disabled={cancellingVisitorId === item._id}
                >
                  {cancellingVisitorId === item._id ? (
                    <ActivityIndicator size="small" color={themeColors.error} />
                  ) : (
                    <Ionicons name="close-circle" size={20} color={themeColors.error} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
          {item.residentEntryConfirmedAt ? (
            <View style={styles.confirmedRow}>
              <Ionicons name="shield-checkmark" size={16} color={themeColors.success} />
              <Text style={styles.confirmedText}>
                Confirmed at residence: {formatDate(item.residentEntryConfirmedAt)}
              </Text>
            </View>
          ) : null}
          {item.residentDepartureConfirmedAt ? (
            <View style={styles.confirmedRow}>
              <Ionicons name="arrow-forward-circle" size={16} color={themeColors.warning} />
              <Text style={styles.confirmedText}>
                Departure confirmed: {formatDate(item.residentDepartureConfirmedAt)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ResidentUtilityHeader
        navigation={navigation}
        eyebrow="GUEST ACCESS"
        title={historyMode ? 'Visitor History' : 'Visitor Management'}
        subtitle={historyMode ? 'Review previous community entries' : 'Invite, approve and track visitors'}
        actions={[{ label: historyMode ? 'Active' : 'History', icon: historyMode ? 'people' : 'time', onPress: () => setHistoryMode(!historyMode), primary: true }]}
      />

      <FlatList
        data={paginatedVisitors}
        renderItem={renderVisitorCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderListHeader()}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No visitors found</Text>
            <Text style={styles.emptyText}>
              {historyMode 
                ? "You haven't created any visitor passes yet"
                : activeTab === 0
                ? "You don't have any active visitor passes"
                : activeTab === 1
                ? "You don't have any completed visitor passes"
                : "You don't have any rejected visitor passes"
              }
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Create New Pass</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={filteredVisitors.length > rowsPerPage ? (
          <View style={styles.pagination}>
            <TouchableOpacity disabled={page === 0} style={[styles.pageButton, page === 0 && styles.pageDisabled]} onPress={() => setPage(value => Math.max(0, value - 1))}><Text style={styles.pageButtonText}>Previous</Text></TouchableOpacity>
            <TouchableOpacity style={styles.rowsButton} onPress={() => setRowsPerPage(rowsPerPage === 5 ? 10 : rowsPerPage === 10 ? 25 : 5)}><Text style={styles.pageText}>{rowsPerPage}/page · {page + 1}/{Math.ceil(filteredVisitors.length / rowsPerPage)}</Text></TouchableOpacity>
            <TouchableOpacity disabled={(page + 1) * rowsPerPage >= filteredVisitors.length} style={[styles.pageButton, (page + 1) * rowsPerPage >= filteredVisitors.length && styles.pageDisabled]} onPress={() => setPage(value => value + 1)}><Text style={styles.pageButtonText}>Next</Text></TouchableOpacity>
          </View>
        ) : null}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="person-add" size={20} color="white" />
        <Text style={styles.fabText}>New Pass</Text>
      </TouchableOpacity>

      {/* Create Visitor Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Visitor Pass</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Visitor Name *</Text>
              <View style={[styles.inputContainer, formErrors.visitorName && styles.inputError]}>
                <Ionicons name="person" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={formData.visitorName}
                  onChangeText={(text) => handleInputChange('visitorName', text)}
                  placeholder="Enter visitor's full name"
                />
              </View>
              {formErrors.visitorName ? <Text style={styles.errorText}>{formErrors.visitorName}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Visitor Phone *</Text>
              <View style={[styles.inputContainer, formErrors.visitorPhone && styles.inputError]}>
                <Ionicons name="call" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={formData.visitorPhone}
                  onChangeText={(text) => handleInputChange('visitorPhone', text)}
                  placeholder="10-digit phone number"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {formErrors.visitorPhone ? <Text style={styles.errorText}>{formErrors.visitorPhone}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Number (Optional)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="car" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={formData.vehicleNumber}
                  onChangeText={(text) => handleInputChange('vehicleNumber', text)}
                  placeholder="Enter vehicle plate number"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purpose of Visit *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="document-text" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.purpose}
                  onChangeText={(text) => handleInputChange('purpose', text)}
                  placeholder="Enter purpose of visit"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expected Arrival *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => openDateTimePicker('expectedArrival')}
              >
                <Ionicons name="calendar" size={20} color={themeColors.textSecondary} />
                <Text style={styles.dateText}>
                  {format(formData.expectedArrival, 'MMM dd, yyyy hh:mm a')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expected Departure *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => openDateTimePicker('expectedDeparture')}
              >
                <Ionicons name="calendar" size={20} color={themeColors.textSecondary} />
                <Text style={styles.dateText}>
                  {format(formData.expectedDeparture, 'MMM dd, yyyy hh:mm a')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>Visitor stay is limited to 3 days maximum.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Companions</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={formData.numberOfCompanions}
                  onChangeText={(text) => handleInputChange('numberOfCompanions', text)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Special Notes (Optional)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.specialNotes}
                  onChangeText={(text) => handleInputChange('specialNotes', text)}
                  placeholder="e.g., Senior citizen, PWD, special needs..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleCreateVisitor}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Pass</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {showDatePicker && Platform.OS === 'ios' && (
            <View style={styles.inlineIosPickerCard}>
                <View style={styles.iosPickerHeader}>
                  <TouchableOpacity onPress={closeDateTimePicker} style={styles.iosPickerAction}>
                    <Text style={styles.iosPickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.iosPickerTitle}>
                    {pickerMode === 'date' ? 'Select Date' : 'Select Time'}
                  </Text>
                  <TouchableOpacity onPress={handleIosPickerDone} style={styles.iosPickerAction}>
                    <Text style={styles.iosPickerDoneText}>
                      {pickerMode === 'date' ? 'Next' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pendingDateValue || formData[datePickerField] || new Date()}
                  mode={pickerMode}
                  display={pickerMode === 'date' ? 'inline' : 'spinner'}
                  themeVariant="light"
                  onChange={handleDateChange}
                  style={styles.iosPicker}
                />
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Visitor QR Code</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedVisitor && (
              <ScrollView>
                <View style={styles.qrContainer}>
                  <Image
                    source={{ uri: selectedVisitor.qrCode }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
                <TouchableOpacity style={styles.shareQrButton} onPress={shareVisitorQr}>
                  <Ionicons name="share-outline" size={19} color="white" />
                  <Text style={styles.shareQrText}>Save or share QR code</Text>
                </TouchableOpacity>

                <View style={styles.qrInfo}>
                  <Text style={styles.qrVisitorName}>{selectedVisitor.visitorName}</Text>
                  <Text style={styles.qrVisitorPhone}>{selectedVisitor.visitorPhone}</Text>

                  <View style={styles.qrDetailRow}>
                    <Text style={styles.qrDetailLabel}>Resident:</Text>
                    <Text style={styles.qrDetailValue}>
                      {selectedVisitor.residentId?.firstName} {selectedVisitor.residentId?.lastName}
                    </Text>
                  </View>

                  <View style={styles.qrDetailRow}>
                    <Text style={styles.qrDetailLabel}>House:</Text>
                    <Text style={styles.qrDetailValue}>
                      {selectedVisitor.residentId?.houseNumber}
                    </Text>
                  </View>

                  <View style={styles.qrDetailRow}>
                    <Text style={styles.qrDetailLabel}>Valid Until:</Text>
                    <Text style={styles.qrDetailValue}>
                      {formatDate(selectedVisitor.expectedDeparture)}
                    </Text>
                  </View>

                  {selectedVisitor.actualEntry && (
                    <View style={styles.qrDetailRow}>
                      <Text style={styles.qrDetailLabel}>Gate Entry Time:</Text>
                      <Text style={styles.qrDetailValue}>
                        {formatDate(selectedVisitor.actualEntry)}
                      </Text>
                    </View>
                  )}

                  {selectedVisitor.residentEntryConfirmedAt && (
                    <View style={styles.qrDetailRow}>
                      <Text style={styles.qrDetailLabel}>Resident Confirmed:</Text>
                      <Text style={styles.qrDetailValue}>
                        {formatDate(selectedVisitor.residentEntryConfirmedAt)}
                      </Text>
                    </View>
                  )}

                  {selectedVisitor.residentDepartureConfirmedAt && (
                    <View style={styles.qrDetailRow}>
                      <Text style={styles.qrDetailLabel}>Departure Confirmed:</Text>
                      <Text style={styles.qrDetailValue}>
                        {formatDate(selectedVisitor.residentDepartureConfirmedAt)}
                      </Text>
                    </View>
                  )}

                  {selectedVisitor.actualExit && (
                    <View style={styles.qrDetailRow}>
                      <Text style={styles.qrDetailLabel}>Exit Time:</Text>
                      <Text style={styles.qrDetailValue}>
                        {formatDate(selectedVisitor.actualExit)}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.statusBadge, { 
                    backgroundColor: getStatusChip(selectedVisitor).bg,
                    alignSelf: 'center',
                    marginTop: 16,
                  }]}>
                    <Ionicons 
                      name={getStatusChip(selectedVisitor).icon} 
                      size={16} 
                      color={getStatusChip(selectedVisitor).color} 
                    />
                    <Text style={[styles.statusText, { color: getStatusChip(selectedVisitor).color }]}>
                      {getStatusChip(selectedVisitor).label.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDateValue || formData[datePickerField] || new Date()}
          mode={pickerMode}
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Modal
        visible={showConfirmScanner}
        animationType="slide"
        onRequestClose={() => setShowConfirmScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>{confirmScannerTitle}</Text>
            <TouchableOpacity onPress={() => setShowConfirmScanner(false)}>
              <Ionicons name="close" size={28} color={themeColors.primaryDeep} />
            </TouchableOpacity>
          </View>
          <CameraView
            style={styles.cameraView}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isConfirmingScan ? undefined : handleResidentConfirmScan}
          />
          <View style={styles.scannerHintWrap}>
            <Text style={styles.scannerHint}>{confirmScannerHint}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  pageButton: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, backgroundColor: themeColors.primarySoft },
  pageDisabled: { opacity: 0.35 },
  pageButtonText: { color: themeColors.primaryDeep, fontWeight: '800', fontSize: 12 },
  rowsButton: { padding: 7 },
  pageText: { color: themeColors.textSecondary, fontWeight: '700', fontSize: 11 },
  shareQrButton: { marginHorizontal: 24, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12, backgroundColor: themeColors.primaryDeep },
  shareQrText: { color: 'white', fontWeight: '900' },
  container: roleLayouts.resident.screen,
  header: {
    ...roleLayouts.resident.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
  flexDirection: 'row',
  alignItems: 'center',
},
  backButton: {
    padding: 8,
  },
  headerTitleWrap: { flex: 1, marginHorizontal: 6 },
  headerEyebrow: { color: themeColors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  headerTitle: {
    color: 'white',
    fontSize: 21,
    fontWeight: '900',
  },
  headerSubtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  headerActionText: { color: 'white', fontSize: 12, fontWeight: '800' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: themeColors.background,
  },
  coloredStatCard: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: themeColors.surfaceTint,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  statCardHighlight: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(20,113,61,0.08)',
  },
  coloredStatBgIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    fontSize: 16,
    color: 'rgba(20,113,61,0.28)',
  },
  coloredStatValue: {
    color: themeColors.primaryDeep,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
  },
  coloredStatLabel: {
    color: themeColors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.cardBackground,
    marginHorizontal: 16,
    marginTop: 4,
    padding: 5,
    borderRadius: radii.lg,
    ...shadows.small,
  },
  confirmBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  confirmScanButton: {
    flex: 1,
    minHeight: 48,
    backgroundColor: themeColors.success,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  departureScanButton: {
    backgroundColor: themeColors.warning,
  },
  confirmScanText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    flexShrink: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: radii.md,
  },
  activeTab: {
    backgroundColor: themeColors.primary + '15',
  },
  tabText: {
    marginLeft: 4,
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  activeTabText: {
    color: themeColors.primary,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  visitorCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderLeftWidth: 4,
    borderLeftColor: themeColors.primary,
    ...shadows.small,
  },
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitorInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  visitorPhone: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  visitorDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: themeColors.textPrimary,
    flex: 1,
  },
  specialNotes: {
    backgroundColor: themeColors.warning + '10',
    padding: 8,
    borderRadius: 8,
  },
  specialNotesText: {
    color: themeColors.warning,
  },
  visitorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: themeColors.success + '15',
    borderRadius: 8,
    padding: 8,
  },
  confirmedText: {
    marginLeft: 8,
    color: themeColors.success,
    fontWeight: '600',
    fontSize: 12,
  },
  createdText: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: themeColors.primary + '10',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    minWidth: 124,
    height: 56,
    borderRadius: 28,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { color: 'white', fontSize: 13, fontWeight: '900' },
  emptyContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 24,
    margin: 16,
    borderRadius: 20,
    backgroundColor: themeColors.surfaceTint,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: themeColors.textPrimary,
    marginLeft: 8,
  },
  inputError: {
    borderColor: themeColors.error,
  },
  errorText: {
    color: themeColors.error,
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    color: themeColors.textPrimary,
  },
  iosPickerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iosPickerCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 24,
  },
  inlineIosPickerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  iosPickerAction: {
    minWidth: 68,
    paddingVertical: 12,
    alignItems: 'center',
  },
  iosPickerTitle: {
    flex: 1,
    textAlign: 'center',
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  iosPickerCancelText: {
    color: themeColors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  iosPickerDoneText: {
    color: themeColors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  iosPicker: {
    backgroundColor: 'white',
  },
  helperText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 40,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: themeColors.primary,
    marginLeft: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 20,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrInfo: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  qrVisitorName: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  qrVisitorPhone: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  qrDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  qrDetailLabel: {
    width: 100,
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  qrDetailValue: {
    flex: 1,
    fontSize: 14,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  scannerHeader: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  scannerTitle: {
    color: themeColors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
    marginRight: 12,
  },
  cameraView: {
    flex: 1,
  },
  scannerHintWrap: {
    padding: 16,
    backgroundColor: themeColors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  scannerHint: {
    color: themeColors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default VisitorManagementScreen;
