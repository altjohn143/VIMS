import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../utils/api';
import { themeColors, roleLayouts } from '../../utils/theme';

const AdminReservationsScreen = ({ navigation }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resources, setResources] = useState({ venue: [], equipment: [] });
  const [resourceModalVisible, setResourceModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [denyReservation, setDenyReservation] = useState(null);
  const [denyReason, setDenyReason] = useState('');

  const [formData, setFormData] = useState({
    resourceType: 'venue',
    resourceName: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    quantity: 1,
    status: 'pending',
    notes: '',
  });

  const [resourceFormData, setResourceFormData] = useState({
    type: 'venue',
    name: '',
    description: '',
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectSheet, setSelectSheet] = useState({
    visible: false,
    title: '',
    options: [],
    value: '',
    onSelect: null,
  });

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: reservations.length,
      pending: reservations.filter(item => item.status === 'pending').length,
      confirmed: reservations.filter(item => item.status === 'confirmed').length,
      cancelled: reservations.filter(item => item.status === 'cancelled').length,
      borrowed: reservations.filter(item => item.status === 'borrowed').length,
      returned: reservations.filter(item => item.status === 'returned').length,
      checked_out: reservations.filter(item => item.status === 'checked_out').length,
      overdue: reservations.filter(item => new Date(item.endDate) < now && !['returned', 'checked_out', 'cancelled'].includes(item.status)).length,
    };
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const now = new Date();
    const query = searchQuery.trim().toLowerCase();
    return reservations.filter(reservation => {
      const overdue = new Date(reservation.endDate) < now && !['returned', 'checked_out', 'cancelled'].includes(reservation.status);
      const itemTypes = [...new Set((reservation.items || []).map(item => item.resourceType).filter(Boolean))];
      const reservationType = itemTypes.length ? (itemTypes.length === 1 ? itemTypes[0] : 'mixed') : (reservation.resourceType || 'unknown');
      const reservationTitle = reservation.items?.length
        ? `${reservation.items.length} item${reservation.items.length > 1 ? 's' : ''}`
        : (reservation.resourceName || 'Reservation');
      if (activeTab === 'overdue' && !overdue) return false;
      if (!['all', 'overdue'].includes(activeTab) && reservation.status !== activeTab) return false;
      if (resourceTypeFilter !== 'all' && reservationType !== resourceTypeFilter) return false;
      if (!query) return true;
      const searchable = [
        reservation.reservedBy?.firstName,
        reservation.reservedBy?.lastName,
        reservationTitle,
        reservation.description,
        reservation.status,
        ...(reservation.items || []).flatMap(item => [item.resourceName, item.resourceType])
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [activeTab, reservations, resourceTypeFilter, searchQuery]);

  const paginatedReservations = useMemo(
    () => filteredReservations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredReservations, page, rowsPerPage]
  );

  useEffect(() => {
    setPage(0);
  }, [activeTab, resourceTypeFilter, searchQuery, rowsPerPage]);

  useEffect(() => {
    fetchReservations();
    fetchResources();
  }, []);

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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const handleOpenModal = (reservation = null) => {
    if (reservation) {
      setEditingReservation(reservation);
      setFormData({
        resourceType: reservation.resourceType,
        resourceName: reservation.resourceName,
        description: reservation.description || '',
        startDate: new Date(reservation.startDate),
        endDate: new Date(reservation.endDate),
        quantity: reservation.quantity || 1,
        status: reservation.status,
        notes: reservation.notes || '',
      });
    } else {
      setEditingReservation(null);
      setFormData({
        resourceType: 'venue',
        resourceName: '',
        description: '',
        startDate: new Date(),
        endDate: new Date(),
        quantity: 1,
        status: 'pending',
        notes: '',
      });
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.resourceName) {
      Alert.alert('Error', 'Please select a resource');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
      };

      if (editingReservation) {
        await api.put(`/reservations/${editingReservation._id}`, data);
        Alert.alert('Success', 'Reservation updated successfully');
      } else {
        await api.post('/reservations', data);
        Alert.alert('Success', 'Reservation created successfully');
      }

      setModalVisible(false);
      fetchReservations();
    } catch (error) {
      console.error('Error saving reservation:', error);
      Alert.alert('Error', 'Failed to save reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reservation) => {
    if (['borrowed', 'confirmed'].includes(reservation.status)) {
      Alert.alert('Cannot Delete', 'This reservation is approved or the item is currently borrowed. Complete the return workflow before deleting it.');
      return;
    }
    Alert.alert(
      'Delete Reservation',
      'Are you sure you want to delete this reservation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/reservations/${reservation._id}`);
              Alert.alert('Success', 'Reservation deleted successfully');
              fetchReservations();
            } catch (error) {
              console.error('Error deleting reservation:', error);
              Alert.alert('Error', 'Failed to delete reservation');
            }
          },
        },
      ]
    );
  };

  const handleResourceModalOpen = () => {
    setResourceFormData({
      type: 'venue',
      name: '',
      description: '',
    });
    setResourceModalVisible(true);
  };

  const handleResourceModalClose = () => {
    setResourceModalVisible(false);
  };

  const handleResourceSubmit = async () => {
    if (!resourceFormData.name.trim()) {
      Alert.alert('Error', 'Please enter a resource name');
      return;
    }

    try {
      await api.post('/resources', resourceFormData);
      Alert.alert('Success', 'Resource added successfully');
      fetchResources();
      handleResourceModalClose();
    } catch (error) {
      console.error('Error adding resource:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add resource';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleUpdateStatus = async (id, status, cancelledReason = '') => {
    if (status === 'cancelled' && !cancelledReason.trim()) {
      Alert.alert('Reason Required', 'Enter a reason before denying this reservation.');
      return;
    }
    try {
      await api.put(`/reservations/${id}`, { status, ...(status === 'cancelled' ? { cancelledReason: cancelledReason.trim() } : {}) });
      Alert.alert('Success', `Reservation ${status === 'confirmed' ? 'approved' : 'denied'} successfully`);
      setDenyReservation(null);
      setDenyReason('');
      fetchReservations();
    } catch (error) {
      console.error('Error updating reservation status:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update reservation status');
    }
  };

  const handleConfirmReceipt = async (id) => {
    Alert.alert(
      'Confirm Item Receipt',
      'Mark this item as received from the resident?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            try {
              await api.put(`/reservations/${id}/confirm-receipt`);
              Alert.alert('Success', 'Item receipt confirmed successfully. Admin has been notified.');
              fetchReservations();
            } catch (error) {
              console.error('Error confirming receipt:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to confirm item receipt');
            }
          },
        },
      ]
    );
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

  const getResourceIcon = (type) => {
    if (type === 'venue') return 'business';
    if (type === 'equipment') return 'build';
    return 'layers';
  };

  const getReservationTitle = (reservation) => {
    if (!reservation.items || reservation.items.length === 0) {
      return reservation.resourceName || 'Reservation';
    }
    return `${reservation.items.length} item${reservation.items.length > 1 ? 's' : ''}`;
  };

  const getReservationType = (reservation) => {
    const items = reservation.items || [];
    if (items.length === 0) {
      return reservation.resourceType || 'unknown';
    }
    const uniqueTypes = [...new Set(items.map((item) => item.resourceType))];
    return uniqueTypes.length === 1 ? uniqueTypes[0] : 'mixed';
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

  const renderPlatformDateTimePicker = ({ visible, title, value, mode, onDismiss, onChange }) => {
    if (!visible) return null;

    const picker = (
      <DateTimePicker
        value={value}
        mode={mode}
        display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
        themeVariant="light"
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

  const openSelectSheet = ({ title, options, value, onSelect }) => {
    setSelectSheet({ visible: true, title, options, value, onSelect });
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
      <Text style={[styles.selectFieldText, !valueText && styles.selectFieldPlaceholder]}>
        {valueText || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color={disabled ? '#cbd5e1' : '#64748b'} />
    </TouchableOpacity>
  );

  const reservationStatusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Borrowed', value: 'borrowed' },
    { label: 'Returned', value: 'returned' },
    { label: 'Checked Out', value: 'checked_out' },
  ];

  const resourceTypeOptions = [
    { label: 'Venue', value: 'venue' },
    { label: 'Equipment', value: 'equipment' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#166534" />
        <Text style={styles.loadingText}>Loading reservations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleEyebrow}>COMMUNITY BOOKINGS</Text>
        <Text style={styles.scheduleTitle}>Reservation Requests</Text>
        <Text style={styles.scheduleSubtitle}>Review requests, approvals, cancellations and returns</Text>
        <View style={styles.headerUtilityRow}>
          <View style={styles.scheduleMeta}>
            <View style={styles.scheduleMetaIcon}>
              <Ionicons name="calendar-outline" size={18} color={themeColors.primaryDeep} />
            </View>
            <View>
              <Text style={styles.scheduleMetaValue}>{reservations.length}</Text>
              <Text style={styles.scheduleMetaLabel}>Total records</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerPrimaryButton} onPress={handleResourceModalOpen}>
              <Ionicons name="add" size={18} color={themeColors.primaryDeep} />
              <Text style={styles.headerPrimaryText}>Add Resource</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={handleRefresh}>
              <Ionicons name="refresh" size={19} color={themeColors.primaryDeep} />
              <Text style={styles.headerIconButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsStrip}>
          {[
            ['Total', stats.total, '#2563eb'],
            ['Pending', stats.pending, '#f59e0b'],
            ['Confirmed', stats.confirmed, '#16a34a'],
            ['Borrowed', stats.borrowed, '#0ea5e9'],
            ['Returned', stats.returned, '#64748b'],
            ['Checked out', stats.checked_out, '#7c3aed'],
            ['Overdue', stats.overdue, '#dc2626'],
          ].map(([label, value, color]) => (
            <View key={label} style={styles.statCard}>
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={19} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search resident or resource..."
              placeholderTextColor="#94a3b8"
              blurOnSubmit={false}
            />
          </View>
          <TouchableOpacity style={[styles.filterButton, resourceTypeFilter !== 'all' && styles.filterButtonActive]} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="options-outline" size={20} color={resourceTypeFilter !== 'all' ? 'white' : themeColors.primaryDeep} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabs}>
          {[
            ['all', 'All', stats.total],
            ['pending', 'Pending', stats.pending],
            ['confirmed', 'Confirmed', stats.confirmed],
            ['borrowed', 'Borrowed', stats.borrowed],
            ['returned', 'Returned', stats.returned],
            ['checked_out', 'Checked Out', stats.checked_out],
            ['cancelled', 'Cancelled', stats.cancelled],
            ['overdue', 'Overdue', stats.overdue],
          ].map(([value, label, count]) => (
            <TouchableOpacity key={value} style={[styles.statusTab, activeTab === value && styles.statusTabActive]} onPress={() => setActiveTab(value)}>
              <Text style={[styles.statusTabText, activeTab === value && styles.statusTabTextActive]}>{label} ({count})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.resultsSummary}>
          <Text style={styles.resultsText}>Showing {filteredReservations.length} of {reservations.length} requests</Text>
          {resourceTypeFilter !== 'all' && (
            <TouchableOpacity onPress={() => setResourceTypeFilter('all')} style={styles.activeTypeChip}>
              <Text style={styles.activeTypeText}>{resourceTypeFilter}</Text>
              <Ionicons name="close" size={14} color={themeColors.primaryDeep} />
            </TouchableOpacity>
          )}
        </View>

        {filteredReservations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No matching reservation requests</Text>
            <Text style={styles.emptySubtitle}>Try another status, resource type, or search term.</Text>
          </View>
        ) : (
          paginatedReservations.map((reservation) => {
            const isOverdue = new Date(reservation.endDate) < new Date() && !['returned', 'checked_out', 'cancelled'].includes(reservation.status);
            const displayStatus = isOverdue ? 'Overdue' : formatStatusLabel(reservation.status);
            const statusColor = isOverdue ? '#ef4444' : getStatusColor(reservation.status);
            const statusIcon = isOverdue ? 'alert-circle' : getStatusIcon(reservation.status);

            return (
              <View key={reservation._id} style={styles.reservationCard}>
                <View style={styles.reservationHeader}>
                  <View style={styles.resourceInfo}>
                    <Ionicons
                      name={getResourceIcon(reservation.resourceType || reservation.items?.[0]?.resourceType)}
                      size={20}
                      color="#166534"
                    />
                    <Text style={styles.resourceName}>{getReservationTitle(reservation)}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(reservation)}
                      disabled={['borrowed', 'confirmed'].includes(reservation.status)}
                      accessibilityLabel={['borrowed', 'confirmed'].includes(reservation.status) ? 'Cannot delete an active reservation' : 'Delete reservation'}
                    >
                      <Ionicons name={['borrowed', 'confirmed'].includes(reservation.status) ? 'lock-closed' : 'trash'} size={16} color={['borrowed', 'confirmed'].includes(reservation.status) ? themeColors.textMuted : '#ef4444'} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.reservationDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={16} color="#64748b" />
                    <Text style={styles.detailText}>
                      {reservation.reservedBy?.firstName} {reservation.reservedBy?.lastName}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#64748b" />
                    <Text style={styles.detailText}>
                      {formatDate(reservation.startDate)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color="#64748b" />
                    <Text style={styles.detailText}>
                      to {formatDate(reservation.endDate)}
                    </Text>
                  </View>

                  {reservation.items && reservation.items.length > 0 && reservation.items.map((item, idx) => (
                    <View style={styles.detailRow} key={idx}>
                      <Ionicons name="layers-outline" size={16} color="#64748b" />
                      <Text style={styles.detailText}>{item.resourceName} (Qty: {item.quantity})</Text>
                    </View>
                  ))}

                  {(!reservation.items || reservation.items.length === 0) && reservation.quantity > 1 && (
                    <View style={styles.detailRow}>
                      <Ionicons name="layers-outline" size={16} color="#64748b" />
                      <Text style={styles.detailText}>Quantity: {reservation.quantity}</Text>
                    </View>
                  )}

                  {reservation.description && (
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text-outline" size={16} color="#64748b" />
                      <Text style={styles.detailText}>{reservation.description}</Text>
                    </View>
                  )}

                  {reservation.notes && (
                    <View style={styles.detailRow}>
                      <Ionicons name="chatbox-outline" size={16} color="#64748b" />
                      <Text style={styles.detailText}>{reservation.notes}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statusSection}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Ionicons name={statusIcon} size={12} color="#fff" />
                    <Text style={styles.statusText}>
                      {displayStatus}
                    </Text>
                  </View>
                  {reservation.status === 'cancelled' && (
                    <View style={styles.cancelledInfo}>
                      <Text style={styles.cancelledBy}>
                        Cancelled by {reservation.cancelledBy?.firstName ? `${reservation.cancelledBy.firstName} ${reservation.cancelledBy.lastName}` : 'Admin'}
                      </Text>
                      {reservation.cancelledReason && (
                        <Text style={styles.cancelledReason}>Reason: {reservation.cancelledReason}</Text>
                      )}
                    </View>
                  )}
                </View>

                {reservation.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleUpdateStatus(reservation._id, 'confirmed')}
                    >
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.denyButton]}
                      onPress={() => {
                        setDenyReservation(reservation);
                        setDenyReason('');
                      }}
                    >
                      <Text style={styles.actionButtonText}>Deny</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {reservation.status === 'borrowed' && getReservationType(reservation) === 'equipment' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleConfirmReceipt(reservation._id)}
                    >
                      <Text style={styles.actionButtonText}>
                        Confirm Receipt
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
        {filteredReservations.length > rowsPerPage && (
          <View style={styles.pagination}>
            <TouchableOpacity disabled={page === 0} style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]} onPress={() => setPage(current => Math.max(0, current - 1))}>
              <Ionicons name="chevron-back" size={18} color={themeColors.primaryDeep} />
              <Text style={styles.pageButtonText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.pageText}>{page + 1} / {Math.ceil(filteredReservations.length / rowsPerPage)}</Text>
            <TouchableOpacity disabled={(page + 1) * rowsPerPage >= filteredReservations.length} style={[styles.pageButton, (page + 1) * rowsPerPage >= filteredReservations.length && styles.pageButtonDisabled]} onPress={() => setPage(current => current + 1)}>
              <Text style={styles.pageButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={18} color={themeColors.primaryDeep} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Resource type</Text>
                <Text style={styles.filterSubtitle}>Choose which reservations to display</Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {[
              ['all', 'All Types', 'layers-outline'],
              ['venue', 'Venues', 'business-outline'],
              ['equipment', 'Equipment', 'build-outline'],
              ['mixed', 'Mixed Resources', 'apps-outline'],
            ].map(([value, label, icon]) => (
              <TouchableOpacity key={value} style={[styles.typeOption, resourceTypeFilter === value && styles.typeOptionActive]} onPress={() => { setResourceTypeFilter(value); setFilterModalVisible(false); }}>
                <Ionicons name={icon} size={20} color={resourceTypeFilter === value ? 'white' : themeColors.primaryDeep} />
                <Text style={[styles.typeOptionText, resourceTypeFilter === value && styles.typeOptionTextActive]}>{label}</Text>
                {resourceTypeFilter === value && <Ionicons name="checkmark-circle" size={20} color="white" />}
              </TouchableOpacity>
            ))}
            <Text style={styles.sheetSectionLabel}>REQUESTS PER PAGE</Text>
            <View style={styles.rowsOptions}>
              {[5, 10, 25].map(value => (
                <TouchableOpacity key={value} style={[styles.rowsOption, rowsPerPage === value && styles.rowsOptionActive]} onPress={() => setRowsPerPage(value)}>
                  <Text style={[styles.rowsOptionText, rowsPerPage === value && styles.rowsOptionTextActive]}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Reservation Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReservation ? 'Edit Reservation' : 'New Reservation'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Resource Type */}
              <Text style={styles.label}>Resource Type</Text>
              {renderSelectField({
                valueText: resourceTypeOptions.find(option => option.value === formData.resourceType)?.label,
                placeholder: 'Select resource type',
                onPress: () => openSelectSheet({
                  title: 'Resource Type',
                  value: formData.resourceType,
                  options: resourceTypeOptions,
                  onSelect: (value) => setFormData({ ...formData, resourceType: value, resourceName: '' }),
                }),
              })}

              {/* Resource Name */}
              <Text style={styles.label}>Resource Name</Text>
              <View style={styles.resourceNameRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  {renderSelectField({
                    valueText: formData.resourceName,
                    placeholder: 'Select resource...',
                    disabled: !(resources[formData.resourceType] || []).length,
                    onPress: () => openSelectSheet({
                      title: 'Resource Name',
                      value: formData.resourceName,
                      options: (resources[formData.resourceType] || []).map((item) => ({ label: item, value: item })),
                      onSelect: (value) => setFormData({ ...formData, resourceName: value }),
                    }),
                  })}
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleResourceModalOpen}
                >
                  <Ionicons name="add" size={24} color="#166534" />
                </TouchableOpacity>
              </View>

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Brief description"
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

              {/* Quantity */}
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="1"
                value={formData.quantity.toString()}
                onChangeText={(text) => setFormData({ ...formData, quantity: parseInt(text) || 1 })}
                keyboardType="numeric"
              />

              {/* Status */}
              <Text style={styles.label}>Status</Text>
              {renderSelectField({
                valueText: reservationStatusOptions.find(option => option.value === formData.status)?.label,
                placeholder: 'Select status',
                onPress: () => openSelectSheet({
                  title: 'Reservation Status',
                  value: formData.status,
                  options: reservationStatusOptions,
                  onSelect: (value) => setFormData({ ...formData, status: value }),
                }),
              })}

              {/* Notes */}
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Additional notes"
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
                  <Text style={styles.submitButtonText}>
                    {editingReservation ? 'Update' : 'Create'}
                  </Text>
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

      <Modal visible={!!denyReservation} animationType="slide" transparent onRequestClose={() => setDenyReservation(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.denyModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Deny Reservation</Text>
                <Text style={styles.denyHelper}>Tell the resident why this request cannot be approved.</Text>
              </View>
              <TouchableOpacity onPress={() => setDenyReservation(null)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Denial reason *</Text>
            <TextInput
              style={[styles.textInput, styles.denyReasonInput]}
              value={denyReason}
              onChangeText={setDenyReason}
              placeholder="Enter a clear reason for denial"
              placeholderTextColor={themeColors.textMuted}
              selectionColor={themeColors.primary}
              multiline
              autoFocus
              textAlignVertical="top"
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setDenyReservation(null)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, styles.denySubmitButton, !denyReason.trim() && styles.submitButtonDisabled]}
                disabled={!denyReason.trim()}
                onPress={() => handleUpdateStatus(denyReservation._id, 'cancelled', denyReason)}
              >
                <Text style={styles.submitButtonText}>Deny Reservation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Resource Modal */}
      <Modal
        visible={resourceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleResourceModalClose}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Resource</Text>
              <TouchableOpacity onPress={handleResourceModalClose}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Resource Type */}
              <Text style={styles.label}>Resource Type</Text>
              {renderSelectField({
                valueText: resourceTypeOptions.find(option => option.value === resourceFormData.type)?.label,
                placeholder: 'Select resource type',
                onPress: () => openSelectSheet({
                  title: 'Resource Type',
                  value: resourceFormData.type,
                  options: resourceTypeOptions,
                  onSelect: (value) => setResourceFormData({ ...resourceFormData, type: value }),
                }),
              })}

              {/* Resource Name */}
              <Text style={styles.label}>Resource Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter resource name"
                value={resourceFormData.name}
                onChangeText={(text) => setResourceFormData({ ...resourceFormData, name: text })}
              />

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Brief description (optional)"
                value={resourceFormData.description}
                onChangeText={(text) => setResourceFormData({ ...resourceFormData, description: text })}
                multiline
                numberOfLines={2}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleResourceModalClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !resourceFormData.name.trim() && styles.submitButtonDisabled]}
                onPress={handleResourceSubmit}
                disabled={!resourceFormData.name.trim()}
              >
                <Text style={styles.submitButtonText}>Add Resource</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent animationType="fade" visible={selectSheet.visible} onRequestClose={closeSelectSheet}>
        <View style={styles.iosPickerOverlay}>
          <View style={styles.optionSheetCard}>
            <View style={styles.iosPickerHeader}>
              <TouchableOpacity onPress={closeSelectSheet} style={styles.iosPickerAction}>
                <Text style={styles.iosPickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.iosPickerTitle}>{selectSheet.title}</Text>
              <View style={styles.iosPickerAction} />
            </View>
            <ScrollView style={styles.optionSheetList} showsVerticalScrollIndicator={false}>
              {selectSheet.options.map((option) => (
                <TouchableOpacity
                  key={String(option.value)}
                  style={styles.optionSheetItem}
                  onPress={() => handleSelectSheetValue(option.value)}
                >
                  <Text style={styles.optionSheetText}>{option.label}</Text>
                  {selectSheet.value === option.value && (
                    <Ionicons name="checkmark-circle" size={20} color={themeColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date/Time Pickers */}
      {Platform.OS === 'android' && renderPlatformDateTimePicker({
        visible: showStartDatePicker,
        title: 'Select Start Date',
        value: formData.startDate,
        mode: 'date',
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
  container: roleLayouts.admin.screen,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  scheduleHeader: { backgroundColor: themeColors.cardBackground, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  scheduleEyebrow: { color: themeColors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  scheduleTitle: { color: themeColors.textPrimary, fontSize: 31, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  scheduleSubtitle: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 3 },
  headerUtilityRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  scheduleMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  scheduleMetaIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: themeColors.accent, alignItems: 'center', justifyContent: 'center' },
  scheduleMetaValue: { color: themeColors.textPrimary, fontSize: 17, fontWeight: '800', lineHeight: 18 },
  scheduleMetaLabel: { color: themeColors.textSecondary, fontSize: 10, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  headerPrimaryButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: themeColors.accent, paddingHorizontal: 11, height: 36, borderRadius: 10 },
  headerPrimaryText: { color: themeColors.primaryDeep, fontWeight: '900', fontSize: 12 },
  headerIconButton: { flexDirection: 'row', height: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: themeColors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: themeColors.border },
  headerIconButtonText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '800' },
  header: {
    ...roleLayouts.admin.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#edf7f1',
    borderBottomRightRadius: 34,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#166534',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsStrip: { gap: 9, paddingBottom: 16 },
  statCard: { width: 104, padding: 13, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: themeColors.border },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 10, fontWeight: '800', marginTop: 3 },
  searchRow: { flexDirection: 'row', gap: 9, marginBottom: 12 },
  searchBox: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#dbe4df', borderRadius: 14, paddingHorizontal: 13 },
  searchInput: { flex: 1, color: '#0f172a', fontSize: 14 },
  filterButton: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.primarySoft, borderWidth: 1, borderColor: '#dbe4df' },
  filterButtonActive: { backgroundColor: themeColors.primaryDeep, borderColor: themeColors.primaryDeep },
  statusTabs: { gap: 7, paddingBottom: 10 },
  statusTab: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'white', borderRadius: 999, borderWidth: 1, borderColor: '#dbe4df' },
  statusTabActive: { backgroundColor: themeColors.primaryDeep, borderColor: themeColors.primaryDeep },
  statusTabText: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  statusTabTextActive: { color: 'white' },
  resultsSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resultsText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  activeTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: themeColors.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  activeTypeText: { color: themeColors.primaryDeep, textTransform: 'capitalize', fontSize: 10, fontWeight: '900' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingBottom: 30 },
  pageButton: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: themeColors.primarySoft, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 },
  pageButtonDisabled: { opacity: 0.35 },
  pageButtonText: { color: themeColors.primaryDeep, fontSize: 11, fontWeight: '900' },
  pageText: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 72,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 24,
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
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 5,
    borderLeftColor: '#166534',
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0fdf4',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  reservationDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#22c55e',
  },
  denyButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  denyModalCard: {
    backgroundColor: themeColors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '92%',
  },
  denyHelper: { color: themeColors.textSecondary, fontSize: 12, marginTop: 4 },
  denyReasonInput: { minHeight: 110, color: themeColors.textPrimary },
  denySubmitButton: { backgroundColor: themeColors.error },
  filterSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 26 },
  filterSubtitle: { color: '#64748b', fontSize: 12, marginTop: 3 },
  typeOption: { marginHorizontal: 20, marginTop: 10, minHeight: 50, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  typeOptionActive: { backgroundColor: themeColors.primaryDeep, borderColor: themeColors.primaryDeep },
  typeOptionText: { flex: 1, color: '#334155', fontSize: 14, fontWeight: '800' },
  typeOptionTextActive: { color: 'white' },
  sheetSectionLabel: { marginHorizontal: 20, marginTop: 22, color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  rowsOptions: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 9 },
  rowsOption: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 11, backgroundColor: '#f1f5f9' },
  rowsOptionActive: { backgroundColor: themeColors.primaryDeep },
  rowsOptionText: { color: '#64748b', fontWeight: '900' },
  rowsOptionTextActive: { color: 'white' },
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
  selectField: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectFieldDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.75,
  },
  selectFieldText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  selectFieldPlaceholder: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  resourceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dcfce7',
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
  iosPickerOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  iosPickerCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 24 },
  inlineIosPickerCard: { marginTop: 10, marginHorizontal: 16, marginBottom: 10, backgroundColor: themeColors.cardBackground, borderWidth: 1, borderColor: themeColors.border, borderRadius: 16, overflow: 'hidden' },
  optionSheetCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '72%', paddingBottom: 18 },
  optionSheetList: { maxHeight: 360 },
  optionSheetItem: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eef2f7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optionSheetText: { flex: 1, color: '#1e293b', fontSize: 16, fontWeight: '700' },
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

export default AdminReservationsScreen;
