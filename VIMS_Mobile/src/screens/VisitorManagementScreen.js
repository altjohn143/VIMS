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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../utils/theme';
import api from '../utils/api';
import QRCode from 'react-native-qrcode-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import UserDropdownMenu from '../components/UserDropdownMenu';
import { Camera, CameraView } from 'expo-camera';

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

  const handleDateChange = (event, selectedDate) => {
    if (!selectedDate || event?.type === 'dismissed') {
      setShowDatePicker(false);
      setPickerMode('date');
      setPendingDateValue(null);
      return;
    }

    if (Platform.OS === 'android') {
      if (pickerMode === 'date') {
        const currentValue = formData[datePickerField] || new Date();
        const mergedDate = new Date(selectedDate);
        mergedDate.setHours(currentValue.getHours(), currentValue.getMinutes(), 0, 0);
        setPendingDateValue(mergedDate);
        setPickerMode('time');
        setShowDatePicker(true);
        return;
      }

      const baseDate = pendingDateValue || formData[datePickerField] || new Date();
      const mergedDateTime = new Date(baseDate);
      mergedDateTime.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setFormData(prev => ({ ...prev, [datePickerField]: mergedDateTime }));
      setPendingDateValue(null);
      setPickerMode('date');
      setShowDatePicker(false);
      return;
    }

    setFormData(prev => ({ ...prev, [datePickerField]: selectedDate }));
  };

  const handleCreateVisitor = async () => {
    const nameError = validateName(formData.visitorName);
    const phoneError = validatePhone(formData.visitorPhone);

    if (nameError || phoneError) {
      setFormErrors({ visitorName: nameError, visitorPhone: phoneError });
      Alert.alert('Error', 'Please fix the form errors');
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
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this visitor request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.put(`/visitors/${visitorId}/status`, { status: 'cancelled' });
              if (response.data.success) {
                Alert.alert('Success', 'Visitor request cancelled');
                fetchVisitors();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel request');
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

  const openResidentScanner = async () => {
    if (!hasCameraPermission) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera Required', 'Please allow camera access to confirm visitor arrival.');
        return;
      }
      setHasCameraPermission(true);
    }
    setShowConfirmScanner(true);
  };

  const handleResidentConfirmScan = async ({ data }) => {
    if (isConfirmingScan || !data) return;
    setIsConfirmingScan(true);
    try {
      const response = await api.post('/visitors/confirm-arrival', { scanValue: data });
      if (response.data?.success) {
        Alert.alert('Confirmed', 'Visitor arrival confirmed successfully.');
        setShowConfirmScanner(false);
        fetchVisitors();
      }
    } catch (error) {
      Alert.alert('Unable to Confirm', error?.response?.data?.error || 'Failed to confirm visitor');
    } finally {
      setTimeout(() => setIsConfirmingScan(false), 800);
    }
  };

  const getStatusChip = (status, visitor = null) => {
    const config = {
      pending: { label: 'Pending', color: themeColors.warning, icon: 'time', bg: themeColors.warning + '20' },
      approved: { label: 'Approved', color: themeColors.success, icon: 'checkmark-circle', bg: themeColors.success + '20' },
      rejected: { label: 'Rejected', color: themeColors.error, icon: 'close-circle', bg: themeColors.error + '20' },
      confirmed: { label: 'Confirmed', color: themeColors.success, icon: 'shield-checkmark', bg: themeColors.success + '20' },
      active: { label: 'Active', color: themeColors.info, icon: 'radio-button-on', bg: themeColors.info + '20' },
      completed: { label: 'Completed', color: themeColors.textSecondary, icon: 'checkmark-done', bg: themeColors.textSecondary + '20' },
      cancelled: { label: 'Cancelled', color: themeColors.error, icon: 'ban', bg: themeColors.error + '20' },
    };
    if (status === 'active' && visitor?.residentEntryConfirmedAt) {
      return config.confirmed;
    }
    return config[status] || config.pending;
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

  const renderVisitorCard = ({ item }) => {
    const status = getStatusChip(item.status, item);
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
                <TouchableOpacity style={styles.iconButton} onPress={() => handleCancelRequest(item._id)}>
                  <Ionicons name="close-circle" size={20} color={themeColors.error} />
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
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
<View style={styles.header}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={24} color="white" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>{historyMode ? 'Visitor History' : 'Visitor Management'}</Text>
  <View style={styles.headerRight}>
    <TouchableOpacity onPress={() => setHistoryMode(!historyMode)} style={styles.historyButton}>
      <Ionicons name={historyMode ? 'people' : 'time'} size={24} color="white" />
    </TouchableOpacity>
    <UserDropdownMenu navigation={navigation} />
  </View>
</View>

      {!historyMode && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.today}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
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
          <TouchableOpacity style={styles.confirmScanButton} onPress={openResidentScanner}>
            <Ionicons name="scan" size={18} color="white" />
            <Text style={styles.confirmScanText}>Confirm Visitor via QR Scan</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={getFilteredVisitors()}
        renderItem={renderVisitorCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
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
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add" size={30} color="white" />
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
        <View style={styles.modalContainer}>
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
        </View>
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
                  <QRCode
                    value={selectedVisitor.qrCode}
                    size={200}
                    color="black"
                    backgroundColor="white"
                  />
                </View>

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
                      <Text style={styles.qrDetailLabel}>Entry Time:</Text>
                      <Text style={styles.qrDetailValue}>
                        {formatDate(selectedVisitor.actualEntry)}
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
                    backgroundColor: getStatusChip(selectedVisitor.status, selectedVisitor).bg,
                    alignSelf: 'center',
                    marginTop: 16,
                  }]}>
                    <Ionicons 
                      name={getStatusChip(selectedVisitor.status, selectedVisitor).icon} 
                      size={16} 
                      color={getStatusChip(selectedVisitor.status, selectedVisitor).color} 
                    />
                    <Text style={[styles.statusText, { color: getStatusChip(selectedVisitor.status, selectedVisitor).color }]}>
                      {getStatusChip(selectedVisitor.status, selectedVisitor).label.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={pendingDateValue || formData[datePickerField] || new Date()}
          mode={Platform.OS === 'android' ? pickerMode : 'datetime'}
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
            <Text style={styles.scannerTitle}>Confirm Visitor Arrival</Text>
            <TouchableOpacity onPress={() => setShowConfirmScanner(false)}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
          <CameraView
            style={styles.cameraView}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isConfirmingScan ? undefined : handleResidentConfirmScan}
          />
          <View style={styles.scannerHintWrap}>
            <Text style={styles.scannerHint}>Scan the visitor pass when they arrive at your home.</Text>
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
  headerRight: {
  flexDirection: 'row',
  alignItems: 'center',
},
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  historyButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  confirmBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  confirmScanButton: {
    backgroundColor: themeColors.success,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmScanText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 20,
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    backgroundColor: 'black',
  },
  scannerHeader: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  scannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  cameraView: {
    flex: 1,
  },
  scannerHintWrap: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  scannerHint: {
    color: 'white',
    textAlign: 'center',
    fontSize: 13,
  },
});

export default VisitorManagementScreen;