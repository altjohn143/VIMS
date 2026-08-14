import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, radii, shadows, roleLayouts } from '../utils/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../utils/api';
import ResidentUtilityHeader from '../components/ResidentUtilityHeader';

const parseReservationQuantity = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const ReservationsScreen = ({ navigation }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resources, setResources] = useState({ venue: [], equipment: [] });
  const [availability, setAvailability] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [cancellingReservationId, setCancellingReservationId] = useState(null);

  const [formData, setFormData] = useState({
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    notes: '',
    items: [], // Array of { resourceType, resourceName, quantity }
  });

  const [currentItem, setCurrentItem] = useState({
    resourceType: 'venue',
    resourceName: '',
    quantity: 1,
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectSheet, setSelectSheet] = useState({
    visible: false,
    field: '',
    title: '',
    options: [],
    value: '',
    onSelect: null,
  });

  useEffect(() => {
    fetchReservations();
    fetchResources();
  }, []);

  useEffect(() => {
    if (modalVisible) {
      fetchAvailability();
    }
  }, [modalVisible, currentItem.resourceType, currentItem.resourceName, formData.items]);

  const fetchReservations = async () => {
    try {
      const response = await api.get('/reservations');
      if (response.data.success) {
        setReservations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      Alert.alert('Error', 'Failed to fetch reservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
    fetchResources();
  };

  const fetchResources = async () => {
    try {
      const response = await api.get('/reservations/resources');
      if (response.data.success) {
        setResources(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const getAvailabilityResources = () => {
    const items = [...formData.items];
    if (currentItem.resourceName) items.push(currentItem);
    const unique = new Map();
    items
      .filter((item) => item.resourceType && item.resourceName)
      .forEach((item) => unique.set(`${item.resourceType}:${item.resourceName}`, {
        resourceType: item.resourceType,
        resourceName: item.resourceName,
      }));
    return [...unique.values()];
  };

  const resourceKey = (item) =>
    `${String(item?.resourceType || '').trim().toLowerCase()}:${String(item?.resourceName || '').trim().toLowerCase()}`;

  const mergeAvailabilitySlots = (slots) => {
    const unique = new Map();
    slots
      .filter((slot) => slot?.resourceType && slot?.resourceName && slot?.startDate && slot?.endDate)
      .forEach((slot) => {
        const key = `${slot.reservationId || 'schedule'}:${resourceKey(slot)}:${slot.startDate}:${slot.endDate}`;
        unique.set(key, slot);
      });
    return [...unique.values()].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  };

  const fetchAvailability = async () => {
    const trackedResources = getAvailabilityResources();
    if (trackedResources.length === 0) {
      setAvailability([]);
      return;
    }

    setAvailabilityLoading(true);
    try {
      const now = new Date();
      const endWindow = new Date();
      endWindow.setMonth(endWindow.getMonth() + 6);
      const selectedKeys = new Set(trackedResources.map(resourceKey));
      const responses = await Promise.all(trackedResources.map((item) => (
        api.get('/reservations/availability', {
          params: {
            resourceType: item.resourceType,
            resourceName: item.resourceName,
            startDate: now.toISOString(),
            endDate: endWindow.toISOString(),
          },
        })
      )));
      let slots = responses.flatMap((response) => response.data?.data || []);

      try {
        const publicResponse = await api.get('/reservations/public/schedules');
        const publicSlots = publicResponse.data?.data?.schedules || [];
        slots = slots.concat(publicSlots.filter((slot) => selectedKeys.has(resourceKey(slot))));
      } catch (publicError) {
        console.warn('Public reservation schedules fallback failed:', publicError?.message || publicError);
      }

      setAvailability(mergeAvailabilitySlots(slots));
    } catch (error) {
      console.error('Error fetching availability:', error);
      setAvailability([]);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const rangesOverlap = (startA, endA, startB, endB) => (
    new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB)
  );

  const sameReservationDay = (selectedStart, slotStart, slotEnd) => {
    const dayStart = new Date(selectedStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedStart);
    dayEnd.setHours(23, 59, 59, 999);
    return new Date(slotStart) <= dayEnd && new Date(slotEnd) >= dayStart;
  };

  const getSelectedScheduleConflicts = () => {
    const selectedKeys = new Set(formData.items.map(resourceKey));
    return availability.filter((slot) =>
      selectedKeys.has(resourceKey(slot)) &&
      rangesOverlap(formData.startDate, formData.endDate, slot.startDate, slot.endDate)
    );
  };

  const validateReservationSchedule = () => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Please select a valid start and end schedule.';
    }

    if (end <= start) {
      return 'End date and time must be after the start date and time.';
    }

    return '';
  };

  const fetchScheduleConflictsForSubmit = async () => {
    const selectedResources = formData.items.filter((item) => item.resourceType && item.resourceName);
    const responses = await Promise.all(selectedResources.map((item) => (
      api.get('/reservations/availability', {
        params: {
          resourceType: item.resourceType,
          resourceName: item.resourceName,
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate.toISOString(),
        },
      })
    )));

    return responses.flatMap((response) => response.data?.data || []).filter((slot) =>
      rangesOverlap(formData.startDate, formData.endDate, slot.startDate, slot.endDate)
    );
  };

  const handleAddItem = () => {
    if (!currentItem.resourceName) {
      Alert.alert('Error', 'Please select a resource');
      return;
    }

    // Prevent multiple venues
    if (currentItem.resourceType === 'venue') {
      const venueExists = formData.items.some((item) => item.resourceType === 'venue');
      if (venueExists) {
        Alert.alert('Error', 'You can only reserve one venue at a time.');
        return;
      }
    }

    // Check if item already exists
    const exists = formData.items.find(
      (item) => item.resourceName === currentItem.resourceName && item.resourceType === currentItem.resourceType
    );

    if (exists) {
      Alert.alert('Error', 'This item is already in your reservation. Adjust the quantity instead.');
      return;
    }

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          ...currentItem,
          quantity: currentItem.resourceType === 'equipment'
            ? parseReservationQuantity(currentItem.quantity)
            : 1
        }
      ],
    });

    setCurrentItem({
      resourceType: 'venue',
      resourceName: '',
      quantity: 1,
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleUpdateItemQuantity = (index, newQuantity) => {
    const nextQuantity = String(newQuantity).replace(/\D/g, '');
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = nextQuantity === '' ? '' : parseReservationQuantity(nextQuantity);
    setFormData({
      ...formData,
      items: updatedItems,
    });
  };

  const handleSubmit = async () => {
    if (formData.items.length === 0) {
      Alert.alert('Error', 'Please add at least one item to your reservation');
      return;
    }

    if (!formData.description) {
      Alert.alert('Error', 'Please provide a description/purpose for the reservation');
      return;
    }

    const scheduleError = validateReservationSchedule();
    if (scheduleError) {
      Alert.alert('Invalid Schedule', scheduleError);
      return;
    }

    if (getSelectedScheduleConflicts().length > 0) {
      Alert.alert('Schedule Unavailable', 'One or more selected items are already reserved for this date and time.');
      return;
    }

    setSubmitting(true);
    try {
      const latestConflicts = await fetchScheduleConflictsForSubmit();
      if (latestConflicts.length > 0) {
        Alert.alert('Schedule Unavailable', 'One or more selected items are already reserved for this date and time.');
        return;
      }

      const data = {
        ...formData,
        items: formData.items.map((item) => ({
          ...item,
          quantity: item.resourceType === 'equipment' ? parseReservationQuantity(item.quantity) : 1
        })),
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
      };

      const response = await api.post('/reservations', data);
      if (!response.data?.success) {
        Alert.alert(
          response.status === 409 ? 'Schedule Unavailable' : 'Error',
          response.data?.error || 'Failed to submit reservation request'
        );
        return;
      }
      Alert.alert('Success', 'Reservation request submitted successfully');
      setModalVisible(false);
      fetchReservations();
      resetForm();
    } catch (error) {
      console.error('Error creating reservation:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit reservation request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (cancellingReservationId) return;

    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this reservation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            setCancellingReservationId(reservationId);
            try {
              const response = await api.put(`/reservations/${reservationId}/status`, { status: 'cancelled' });
              if (response.data?.success) {
                Alert.alert('Success', 'Reservation cancelled successfully');
                fetchReservations();
              } else {
                Alert.alert('Error', response.data?.error || 'Failed to cancel reservation');
              }
            } catch (error) {
              console.error('Error cancelling reservation:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to cancel reservation');
            } finally {
              setCancellingReservationId(null);
            }
          },
        },
      ]
    );
  };

  const getReservationResourceTypes = (reservation) => {
    if (reservation.items && reservation.items.length > 0) {
      return [...new Set(reservation.items.map((item) => item.resourceType).filter(Boolean))];
    }
    return reservation.resourceType ? [reservation.resourceType] : [];
  };

  const isSingleResourceType = (reservation, type) => {
    const resourceTypes = getReservationResourceTypes(reservation);
    return resourceTypes.length === 1 && resourceTypes[0] === type;
  };

  const handleCompleteUse = (reservation, action) => {
    Alert.alert(
      action === 'return-equipment' ? 'Return Equipment' : 'Check Out Venue',
      action === 'return-equipment'
        ? 'Mark this equipment reservation as returned?'
        : 'Check out from this venue reservation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const response = await api.put(`/reservations/${reservation._id}/complete-use`, { action });
              if (response.data?.success) {
                Alert.alert('Success', response.data.message || 'Reservation status updated');
                fetchReservations();
              } else {
                Alert.alert('Error', response.data?.error || 'Failed to update reservation status');
              }
            } catch (error) {
              console.error('Error updating reservation use:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to update reservation status');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      description: '',
      startDate: new Date(),
      endDate: new Date(),
      notes: '',
      items: [],
    });
    setAvailability([]);
    setCurrentItem({
      resourceType: 'venue',
      resourceName: '',
      quantity: 1,
    });
    closeSelectSheet();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#22c55e';
      case 'cancelled': return '#ef4444';
      case 'borrowed': return '#f59e0b';
      case 'returned': return '#0ea5e9';
      case 'checked_out': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      case 'borrowed': return 'build';
      case 'returned': return 'return-up-back';
      case 'checked_out': return 'exit-outline';
      default: return 'time';
    }
  };

  const formatStatusLabel = (status) => {
    if (status === 'checked_out') return 'Checked Out';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openSelectSheet = ({ field, title, options, value, onSelect }) => {
    setSelectSheet((previous) => {
      if (previous.visible && previous.field === field) {
        return { ...previous, visible: false };
      }
      return { visible: true, field, title, options, value, onSelect };
    });
  };

  const closeSelectSheet = () => {
    setSelectSheet(prev => ({ ...prev, visible: false }));
  };

  const handleSelectSheetValue = (value) => {
    if (selectSheet.onSelect) {
      selectSheet.onSelect(value);
    }
    closeSelectSheet();
  };

  const renderSelectField = ({ valueText, placeholder, onPress, disabled }) => (
    <TouchableOpacity
      style={[styles.selectField, disabled && styles.selectFieldDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={styles.selectFieldLeft}>
        <Ionicons name="list-outline" size={17} color={disabled ? '#cbd5e1' : '#166534'} />
        <Text style={[styles.selectFieldText, !valueText && styles.selectFieldPlaceholder]}>
          {valueText || placeholder}
        </Text>
      </View>
      <View style={styles.selectFieldAction}>
        <Text style={styles.selectFieldActionText}>Choose</Text>
        <Ionicons name="chevron-down" size={17} color={disabled ? '#cbd5e1' : '#166534'} />
      </View>
    </TouchableOpacity>
  );

  const renderInlineSelectSheet = (field) => {
    if (!selectSheet.visible || selectSheet.field !== field) return null;

    return (
      <View style={styles.inlineOptionSheet}>
        <ScrollView
          style={styles.inlineOptionList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={selectSheet.options.length > 4}
          keyboardShouldPersistTaps="handled"
        >
          {selectSheet.options.map((option) => (
            <TouchableOpacity
              key={String(option.value)}
              style={styles.optionSheetItem}
              onPress={() => handleSelectSheetValue(option.value)}
              activeOpacity={0.85}
            >
              <Text style={styles.optionSheetText}>{option.label}</Text>
              {selectSheet.value === option.value && (
                <Ionicons name="checkmark-circle" size={20} color="#166534" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderPlatformDateTimePicker = ({ visible, title, value, mode, minimumDate, onDismiss, onChange }) => {
    if (!visible) return null;

    const picker = (
      <DateTimePicker
        value={value}
        mode={mode}
        display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
        themeVariant="light"
        minimumDate={minimumDate}
        onChange={(event, selectedValue) => {
          if (event?.type === 'dismissed') {
            onDismiss();
            return;
          }
          if (selectedValue) {
            onChange(selectedValue);
          }
          if (Platform.OS !== 'ios') {
            onDismiss();
          }
        }}
        style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
      />
    );

    if (Platform.OS !== 'ios') return picker;

    return (
      <View style={styles.inlineIosPickerCard}>
          <View style={styles.iosPickerHeader}>
            <TouchableOpacity onPress={onDismiss} style={styles.iosPickerAction}>
              <Text style={styles.iosPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.iosPickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.iosPickerAction}>
              <Text style={styles.iosPickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          {picker}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#166534" />
        <Text style={styles.loadingText}>Loading reservations...</Text>
      </View>
    );
  }

  const stats = {
    total: reservations.length,
    today: reservations.filter(r => new Date(r.startDate || r.createdAt).toDateString() === new Date().toDateString()).length,
    active: reservations.filter(r => ['confirmed', 'borrowed'].includes(r.status)).length,
    pending: reservations.filter(r => r.status === 'pending').length,
  };

  return (
    <View style={styles.container}>
      <ResidentUtilityHeader
        navigation={navigation}
        eyebrow="PLAN YOUR TIME"
        title="My Reservations"
        subtitle="Venues and community equipment"
        actions={[{ label: 'New', icon: 'add', onPress: () => setModalVisible(true), primary: true }]}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Section */}
        <View style={styles.statsGrid}>
          <View style={styles.coloredStatCard}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="calendar-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.total}</Text>
            <Text style={styles.coloredStatLabel}>Total</Text>
          </View>
          <View style={styles.coloredStatCard}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="today-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.today}</Text>
            <Text style={styles.coloredStatLabel}>Today</Text>
          </View>
          <View style={styles.coloredStatCard}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="radio-button-on-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.active}</Text>
            <Text style={styles.coloredStatLabel}>Active</Text>
          </View>
          <View style={styles.coloredStatCard}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="time-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.pending}</Text>
            <Text style={styles.coloredStatLabel}>Pending</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: '#166534' }]}
            onPress={() => {
              setFormData({
                description: '',
                startDate: new Date(),
                endDate: new Date(),
                notes: '',
                items: [],
              });
              setCurrentItem({ resourceType: 'venue', resourceName: '', quantity: 1 });
              setModalVisible(true);
            }}
          >
            <Ionicons name="business" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Reserve Venue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: '#d97706' }]}
            onPress={() => {
              setFormData({
                description: '',
                startDate: new Date(),
                endDate: new Date(),
                notes: '',
                items: [],
              });
              setCurrentItem({ resourceType: 'equipment', resourceName: '', quantity: 1 });
              setModalVisible(true);
            }}
          >
            <Ionicons name="build" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Reserve Equipment</Text>
          </TouchableOpacity>
        </View>

        {/* Reservation History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reservation History</Text>

          {reservations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No reservations yet</Text>
              <Text style={styles.emptySubtitle}>Create your first reservation request</Text>
            </View>
          ) : (
            reservations.map((reservation) => (
              <View key={reservation._id} style={styles.reservationCard}>
                <View style={styles.reservationHeader}>
                  <View style={styles.resourceInfo}>
                    <Ionicons
                      name={reservation.items?.length > 0 ? 'layers' : (reservation.resourceType === 'venue' ? 'business' : 'build')}
                      size={20}
                      color="#166534"
                    />
                    <Text style={styles.resourceName}>
                      {reservation.items && reservation.items.length > 0 
                        ? `${reservation.items.length} item${reservation.items.length > 1 ? 's' : ''}`
                        : reservation.resourceName}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(reservation.status) }]}>
                    <Ionicons name={getStatusIcon(reservation.status)} size={12} color="#fff" />
                    <Text style={styles.statusText}>
                      {formatStatusLabel(reservation.status)}
                    </Text>
                  </View>
                </View>

                {reservation.items && reservation.items.length > 0 && (
                  <View style={styles.itemsList}>
                    {reservation.items.map((item, idx) => (
                      <View key={idx} style={styles.itemListItem}>
                        <Text style={styles.itemListText}>
                          • {item.resourceName} (Qty: {item.quantity})
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.reservationDescription}>{reservation.description}</Text>

                <View style={styles.reservationDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#64748b" />
                    <Text style={styles.detailText}>
                      {formatDate(reservation.startDate)} - {formatDate(reservation.endDate)}
                    </Text>
                  </View>

                  {!reservation.items && reservation.quantity > 1 && (
                    <View style={styles.detailRow}>
                      <Ionicons name="layers-outline" size={16} color="#64748b" />
                      <Text style={styles.detailText}>Quantity: {reservation.quantity}</Text>
                    </View>
                  )}

                  {reservation.notes && (
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text-outline" size={16} color="#64748b" />
                      <Text style={styles.detailText}>{reservation.notes}</Text>
                    </View>
                  )}

                  <View style={styles.buttonContainer}>
                    {reservation.status === 'pending' && (
                      <TouchableOpacity
                        style={[styles.cardCancelButton, cancellingReservationId === reservation._id && styles.submitButtonDisabled]}
                        onPress={() => handleCancelReservation(reservation._id)}
                        disabled={cancellingReservationId === reservation._id}
                      >
                        <Ionicons name="close-circle" size={16} color="#b91c1c" />
                        <Text style={styles.cardCancelButtonText}>
                          {cancellingReservationId === reservation._id ? 'Cancelling...' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {['confirmed', 'borrowed'].includes(reservation.status) && isSingleResourceType(reservation, 'equipment') && (
                      <TouchableOpacity
                        style={styles.cardReturnButton}
                        onPress={() => handleCompleteUse(reservation, 'return-equipment')}
                      >
                        <Ionicons name="return-up-back" size={16} color="#fff" />
                        <Text style={styles.cardActionButtonText}>Return Equipment</Text>
                      </TouchableOpacity>
                    )}

                    {['confirmed', 'borrowed'].includes(reservation.status) && isSingleResourceType(reservation, 'venue') && (
                      <TouchableOpacity
                        style={styles.cardCheckoutButton}
                        onPress={() => handleCompleteUse(reservation, 'checkout-venue')}
                      >
                        <Ionicons name="exit-outline" size={16} color="#fff" />
                        <Text style={styles.cardActionButtonText}>Check Out</Text>
                      </TouchableOpacity>
                    )}

                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Reservation Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          closeSelectSheet();
          setModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Reservation</Text>
              <TouchableOpacity onPress={() => {
                closeSelectSheet();
                setModalVisible(false);
              }}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Item Selection */}
              <Text style={styles.sectionTitle}>Select Items</Text>
              
              <Text style={styles.label}>Resource Type</Text>
              {renderSelectField({
                valueText: currentItem.resourceType === 'equipment' ? 'Equipment' : 'Venue',
                placeholder: 'Select resource type',
                onPress: () => openSelectSheet({
                  field: 'resourceType',
                  title: 'Resource Type',
                  value: currentItem.resourceType,
                  options: [
                    { label: 'Venue', value: 'venue' },
                    { label: 'Equipment', value: 'equipment' },
                  ],
                  onSelect: (value) => setCurrentItem({ ...currentItem, resourceType: value, resourceName: '' }),
                }),
              })}
              {renderInlineSelectSheet('resourceType')}

              <Text style={styles.label}>Resource Name</Text>
              {renderSelectField({
                valueText: currentItem.resourceName,
                placeholder: 'Select resource...',
                disabled: !(resources[currentItem.resourceType] || []).length,
                onPress: () => openSelectSheet({
                  field: 'resourceName',
                  title: 'Resource Name',
                  value: currentItem.resourceName,
                  options: (resources[currentItem.resourceType] || []).map((item) => ({ label: item, value: item })),
                  onSelect: (value) => setCurrentItem({ ...currentItem, resourceName: value }),
                }),
              })}
              {renderInlineSelectSheet('resourceName')}

              {/* Show quantity field only for equipment */}
              {currentItem.resourceType === 'equipment' && (
                <>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="1"
                    value={String(currentItem.quantity)}
                    onChangeText={(text) => {
                      const quantity = text.replace(/\D/g, '');
                      setCurrentItem({ ...currentItem, quantity });
                    }}
                    onBlur={() => setCurrentItem({
                      ...currentItem,
                      quantity: parseReservationQuantity(currentItem.quantity)
                    })}
                    keyboardType="number-pad"
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.addItemButton, !currentItem.resourceName && styles.addItemButtonDisabled]}
                onPress={handleAddItem}
                disabled={!currentItem.resourceName}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addItemButtonText}>Add Item to Reservation</Text>
              </TouchableOpacity>

              {/* Selected Items */}
              {formData.items.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Items in Reservation ({formData.items.length})</Text>
                  {formData.items.map((item, index) => (
                    <View key={index} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.resourceName}</Text>
                          <Text style={styles.itemType}>{item.resourceType}</Text>
                        </View>
                        {/* Show quantity only for equipment */}
                        {item.resourceType === 'equipment' && (
                          <View style={styles.itemQuantitySection}>
                            <Text style={styles.label}>Qty:</Text>
                            <TextInput
                              style={styles.quantityInput}
                              value={String(item.quantity)}
                              onChangeText={(text) => handleUpdateItemQuantity(index, text)}
                              onBlur={() => {
                                const updatedItems = [...formData.items];
                                updatedItems[index].quantity = parseReservationQuantity(item.quantity);
                                setFormData({ ...formData, items: updatedItems });
                              }}
                              keyboardType="number-pad"
                            />
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.removeItemButton}
                        onPress={() => handleRemoveItem(index)}
                      >
                        <Ionicons name="trash" size={18} color="#ef4444" />
                        <Text style={styles.removeItemButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              <Text style={styles.sectionTitle}>Availability Calendar</Text>
              <View style={styles.availabilityFilters}>
                {[['all', 'All'], ['venue', 'Venues'], ['equipment', 'Equipment']].map(([value, label]) => (
                  <TouchableOpacity key={value} style={[styles.availabilityFilterChip, availabilityFilter === value && styles.availabilityFilterChipActive]} onPress={() => setAvailabilityFilter(value)}>
                    <Text style={[styles.availabilityFilterText, availabilityFilter === value && styles.availabilityFilterTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.availabilityPanel}>
                {getAvailabilityResources().length === 0 ? (
                  <Text style={styles.availabilityText}>Select a venue or equipment item to see reserved schedules.</Text>
                ) : availabilityLoading ? (
                  <View style={styles.availabilityLoading}>
                    <ActivityIndicator size="small" color="#166534" />
                    <Text style={styles.availabilityText}>Checking availability...</Text>
                  </View>
                ) : availability.length === 0 ? (
                  <Text style={styles.availabilitySuccess}>No reserved schedules found in the next 6 months.</Text>
                ) : (
                  <>
                    {getSelectedScheduleConflicts().length > 0 && (
                      <Text style={styles.availabilityError}>Selected schedule overlaps with an existing reservation.</Text>
                    )}
                    {availability.filter(slot => availabilityFilter === 'all' || slot.resourceType === availabilityFilter).slice(0, 6).map((slot) => (
                      <View
                        key={`${slot.reservationId}-${slot.resourceName}-${slot.startDate}`}
                        style={[
                          styles.availabilitySlot,
                          rangesOverlap(formData.startDate, formData.endDate, slot.startDate, slot.endDate) && styles.availabilitySlotConflict
                        ]}
                      >
                        <Text style={styles.availabilitySlotName}>{slot.resourceName}</Text>
                        <Text style={styles.availabilitySlotTime}>
                          {formatDate(slot.startDate)} - {formatDate(slot.endDate)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>

              {/* Description */}
              <Text style={styles.label}>Purpose/Description *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Brief description of your reservation purpose"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={2}
              />

              {/* Start Date & Time */}
              <Text style={styles.label}>Start Date & Time</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={16} color="#64748b" />
                  <Text style={styles.dateButtonText}>
                    {formData.startDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={16} color="#64748b" />
                  <Text style={styles.timeButtonText}>
                    {formData.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* End Date & Time */}
              <Text style={styles.label}>End Date & Time</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={16} color="#64748b" />
                  <Text style={styles.dateButtonText}>
                    {formData.endDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={16} color="#64748b" />
                  <Text style={styles.timeButtonText}>
                    {formData.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Notes */}
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder="Any special requirements or notes"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalFooterSpacer} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  closeSelectSheet();
                  setModalVisible(false);
                }}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>

            {Platform.OS === 'ios' && (
              <>
                {renderPlatformDateTimePicker({
                  visible: showStartDatePicker,
                  title: 'Select Start Date',
                  value: formData.startDate,
                  mode: 'date',
                  minimumDate: new Date(),
                  onDismiss: () => setShowStartDatePicker(false),
                  onChange: (date) => setFormData({ ...formData, startDate: date }),
                })}

                {renderPlatformDateTimePicker({
                  visible: showStartTimePicker,
                  title: 'Select Start Time',
                  value: formData.startDate,
                  mode: 'time',
                  onDismiss: () => setShowStartTimePicker(false),
                  onChange: (time) => {
                    const newDate = new Date(formData.startDate);
                    newDate.setHours(time.getHours(), time.getMinutes());
                    setFormData({ ...formData, startDate: newDate });
                  },
                })}

                {renderPlatformDateTimePicker({
                  visible: showEndDatePicker,
                  title: 'Select End Date',
                  value: formData.endDate,
                  mode: 'date',
                  minimumDate: formData.startDate,
                  onDismiss: () => setShowEndDatePicker(false),
                  onChange: (date) => setFormData({ ...formData, endDate: date }),
                })}

                {renderPlatformDateTimePicker({
                  visible: showEndTimePicker,
                  title: 'Select End Time',
                  value: formData.endDate,
                  mode: 'time',
                  onDismiss: () => setShowEndTimePicker(false),
                  onChange: (time) => {
                    const newDate = new Date(formData.endDate);
                    newDate.setHours(time.getHours(), time.getMinutes());
                    setFormData({ ...formData, endDate: newDate });
                  },
                })}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date/Time Pickers */}
      {Platform.OS === 'android' && renderPlatformDateTimePicker({
        visible: showStartDatePicker,
        title: 'Select Start Date',
        value: formData.startDate,
        mode: 'date',
        minimumDate: new Date(),
        onDismiss: () => setShowStartDatePicker(false),
        onChange: (date) => setFormData({ ...formData, startDate: date }),
      })}

      {Platform.OS === 'android' && renderPlatformDateTimePicker({
        visible: showStartTimePicker,
        title: 'Select Start Time',
        value: formData.startDate,
        mode: 'time',
        onDismiss: () => setShowStartTimePicker(false),
        onChange: (time) => {
          const newDate = new Date(formData.startDate);
          newDate.setHours(time.getHours(), time.getMinutes());
          setFormData({ ...formData, startDate: newDate });
        },
      })}

      {Platform.OS === 'android' && renderPlatformDateTimePicker({
        visible: showEndDatePicker,
        title: 'Select End Date',
        value: formData.endDate,
        mode: 'date',
        minimumDate: formData.startDate,
        onDismiss: () => setShowEndDatePicker(false),
        onChange: (date) => setFormData({ ...formData, endDate: date }),
      })}

      {Platform.OS === 'android' && renderPlatformDateTimePicker({
        visible: showEndTimePicker,
        title: 'Select End Time',
        value: formData.endDate,
        mode: 'time',
        onDismiss: () => setShowEndTimePicker(false),
        onChange: (time) => {
          const newDate = new Date(formData.endDate);
          newDate.setHours(time.getHours(), time.getMinutes());
          setFormData({ ...formData, endDate: newDate });
        },
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  availabilityFilters: { flexDirection: 'row', gap: 7, marginBottom: 9 },
  availabilityFilterChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999, backgroundColor: '#f1f5f9' },
  availabilityFilterChipActive: { backgroundColor: '#166534' },
  availabilityFilterText: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  availabilityFilterTextActive: { color: 'white' },
  container: roleLayouts.resident.screen,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    ...roleLayouts.resident.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitleWrap: { flex: 1, marginHorizontal: 8 },
  headerEyebrow: { color: themeColors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  headerTitle: {
    fontSize: 22,
    color: themeColors.white,
    fontWeight: '900',
  },
  headerSubtitle: { color: 'rgba(255,255,255,0.68)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  addButton: {
    backgroundColor: themeColors.accent,
    borderRadius: radii.round,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerActionText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  coloredStatCard: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
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
    backgroundColor: 'rgba(23,107,69,0.08)',
  },
  coloredStatBgIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    fontSize: 16,
    color: 'rgba(23,107,69,0.20)',
  },
  coloredStatValue: {
    color: themeColors.primaryDeep,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  coloredStatLabel: {
    color: themeColors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: radii.lg,
    gap: 8,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'flex-start',
    paddingVertical: 28,
    backgroundColor: themeColors.surfaceTint,
    borderRadius: 20,
    paddingHorizontal: 22,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  reservationCard: {
    backgroundColor: roleLayouts.resident.card.backgroundColor,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: themeColors.border,
    ...shadows.small,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
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
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reservationDescription: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  reservationDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  modalBodyContent: {
    paddingTop: 20,
    paddingBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  picker: {
    height: 50,
  },
  selectField: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  selectFieldDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.75,
  },
  selectFieldText: {
    flexShrink: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  selectFieldLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  selectFieldAction: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingLeft: 8 },
  selectFieldActionText: { color: '#166534', fontSize: 12, fontWeight: '900' },
  selectFieldPlaceholder: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    textAlignVertical: 'top',
  },
  notesInput: {
    minHeight: 104,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  modalFooterSpacer: {
    height: 24,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#166534',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    justifyContent: 'space-between',
  },
  cardCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  cardCancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
  },
  cardReturnButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0ea5e9',
  },
  cardCheckoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#166534',
  },
  cardActionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#166534',
    borderRadius: 10,
    paddingVertical: 12,
    marginVertical: 12,
    minHeight: 50,
  },
  addItemButtonDisabled: { backgroundColor: '#94a3b8' },
  addItemButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  itemsList: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#166534',
    padding: 10,
    marginBottom: 10,
  },
  itemListItem: {
    paddingVertical: 4,
  },
  itemListText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
  itemCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
    padding: 12,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    color: '#64748b',
  },
  itemQuantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  quantityInput: {
    width: 58,
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 6,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  removeItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
    paddingTop: 10,
  },
  removeItemButtonText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  availabilityPanel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  availabilityLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  availabilitySuccess: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '700',
  },
  availabilityError: {
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '800',
    marginBottom: 8,
  },
  availabilitySlot: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    marginBottom: 8,
  },
  availabilitySlotConflict: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  availabilitySlotName: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  availabilitySlotTime: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  iosPickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 9999, elevation: 9999 },
  iosPickerCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 24 },
  inlineIosPickerCard: { marginTop: 10, marginHorizontal: 16, marginBottom: 10, backgroundColor: themeColors.cardBackground, borderWidth: 1, borderColor: themeColors.border, borderRadius: 16, overflow: 'hidden' },
  optionSheetCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '72%', paddingBottom: 18 },
  optionSheetList: { maxHeight: 360 },
  optionSheetItem: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#eef2f7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optionSheetText: { flex: 1, color: '#1e293b', fontSize: 14, fontWeight: '700' },
  inlineOptionSheet: {
    marginTop: -4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 0,
    backgroundColor: '#fff',
    overflow: 'hidden',
    maxHeight: 188,
  },
  inlineOptionHeader: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineOptionTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  inlineOptionClose: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineOptionList: {
    maxHeight: 188,
  },
  iosPickerHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  iosPickerAction: { minWidth: 68, paddingVertical: 12, alignItems: 'center' },
  iosPickerTitle: { flex: 1, textAlign: 'center', color: '#1e293b', fontSize: 15, fontWeight: '800' },
  iosPickerCancelText: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  iosPickerDoneText: { color: '#166534', fontSize: 15, fontWeight: '800' },
  iosPicker: { backgroundColor: 'white' },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ReservationsScreen;
