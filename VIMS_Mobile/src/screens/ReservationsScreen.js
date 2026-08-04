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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, radii, shadows, roleLayouts } from '../utils/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import api from '../utils/api';

const ReservationsScreen = ({ navigation }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
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
    }
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
      setAvailability(responses.flatMap((response) => response.data?.data || []));
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

  const getSelectedScheduleConflicts = () => {
    const selectedKeys = new Set(formData.items.map((item) => `${item.resourceType}:${item.resourceName}`));
    return availability.filter((slot) =>
      selectedKeys.has(`${slot.resourceType}:${slot.resourceName}`) &&
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
      items: [...formData.items, { ...currentItem }],
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
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = parseInt(newQuantity) || 1;
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

  const renderPlatformDateTimePicker = ({ visible, title, value, mode, minimumDate, onDismiss, onChange }) => {
    if (!visible) return null;

    const picker = (
      <DateTimePicker
        value={value}
        mode={mode}
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
      <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
        <View style={styles.iosPickerOverlay}>
          <View style={styles.iosPickerCard}>
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
        </View>
      </Modal>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>PLAN YOUR TIME</Text>
          <Text style={styles.headerTitle}>My Reservations</Text>
          <Text style={styles.headerSubtitle}>Venues and community equipment</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.headerActionText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.statsGrid}>
          <View style={[styles.coloredStatCard, { backgroundColor: '#2563eb' }]}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="calendar-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.total}</Text>
            <Text style={styles.coloredStatLabel}>Total</Text>
          </View>
          <View style={[styles.coloredStatCard, { backgroundColor: '#16a34a' }]}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="today-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.today}</Text>
            <Text style={styles.coloredStatLabel}>Today</Text>
          </View>
          <View style={[styles.coloredStatCard, { backgroundColor: '#0284c7' }]}>
            <View style={styles.statCardHighlight} />
            <Ionicons name="radio-button-on-outline" style={styles.coloredStatBgIcon} />
            <Text style={styles.coloredStatValue}>{stats.active}</Text>
            <Text style={styles.coloredStatLabel}>Active</Text>
          </View>
          <View style={[styles.coloredStatCard, { backgroundColor: '#dc2626' }]}>
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
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Reservation</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Item Selection */}
              <Text style={styles.sectionTitle}>Select Items</Text>
              
              <Text style={styles.label}>Resource Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={currentItem.resourceType}
                  onValueChange={(value) => setCurrentItem({ ...currentItem, resourceType: value, resourceName: '' })}
                  style={styles.picker}
                >
                  <Picker.Item label="Venue" value="venue" />
                  <Picker.Item label="Equipment" value="equipment" />
                </Picker>
              </View>

              <Text style={styles.label}>Resource Name</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={currentItem.resourceName}
                  onValueChange={(value) => setCurrentItem({ ...currentItem, resourceName: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select resource..." value="" />
                  {(resources[currentItem.resourceType] || []).map((item) => (
                    <Picker.Item key={item} label={item} value={item} />
                  ))}
                </Picker>
              </View>

              {/* Show quantity field only for equipment */}
              {currentItem.resourceType === 'equipment' && (
                <>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="1"
                    value={currentItem.quantity.toString()}
                    onChangeText={(text) => setCurrentItem({ ...currentItem, quantity: parseInt(text) || 1 })}
                    keyboardType="number-pad"
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.addItemButton}
                onPress={handleAddItem}
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
                              value={item.quantity.toString()}
                              onChangeText={(text) => handleUpdateItemQuantity(index, text)}
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
                style={styles.textInput}
                placeholder="Any special requirements or notes"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
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
          </View>
        </View>
      </Modal>

      {/* Date/Time Pickers */}
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
    padding: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  coloredStatCard: {
    flex: 1,
    borderRadius: radii.lg,
    padding: 13,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.small,
  },
  statCardHighlight: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  coloredStatBgIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
  },
  coloredStatValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  coloredStatLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    fontWeight: '600',
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
    padding: 20,
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
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    textAlignVertical: 'top',
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
  },
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
  },
  itemInfo: {
    flex: 1,
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
  },
  quantityInput: {
    width: 50,
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
  iosPickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  iosPickerCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 24 },
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
