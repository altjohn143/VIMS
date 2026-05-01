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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import api from '../../utils/api';

const VENUES = [
  'Covered Court',
  'Swimming Pool',
  'Multi-Purpose Hall',
  'Function Room',
  'Conference Room',
];

const EQUIPMENT = [
  'Tables',
  'Chairs',
  'Speakers',
  'Microphones',
  'Projector',
  'Podium',
];

const AdminReservationsScreen = ({ navigation }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    fetchReservations();
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

  const handleDelete = async (id) => {
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
              await api.delete(`/reservations/${id}`);
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

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/reservations/${id}`, { status });
      Alert.alert('Success', `Reservation ${status === 'confirmed' ? 'approved' : 'denied'} successfully`);
      fetchReservations();
    } catch (error) {
      console.error('Error updating reservation status:', error);
      Alert.alert('Error', 'Failed to update reservation status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#22c55e';
      case 'cancelled': return '#ef4444';
      case 'borrowed': return '#f59e0b';
      case 'returned': return '#0ea5e9';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      case 'borrowed': return 'build';
      case 'returned': return 'return-up-back';
      default: return 'time';
    }
  };

  const getResourceIcon = (type) => {
    return type === 'venue' ? 'business' : 'build';
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#166534" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservation Logs</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {reservations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No reservations</Text>
            <Text style={styles.emptySubtitle}>Create the first reservation</Text>
          </View>
        ) : (
          reservations.map((reservation) => {
            const isOverdue = new Date(reservation.endDate) < new Date() && reservation.status !== 'returned' && reservation.status !== 'cancelled';
            const displayStatus = isOverdue ? 'Overdue' : reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1);
            const statusColor = isOverdue ? '#ef4444' : getStatusColor(reservation.status);
            const statusIcon = isOverdue ? 'alert-circle' : getStatusIcon(reservation.status);

            return (
              <View key={reservation._id} style={styles.reservationCard}>
                <View style={styles.reservationHeader}>
                  <View style={styles.resourceInfo}>
                    <Ionicons
                      name={getResourceIcon(reservation.resourceType)}
                      size={20}
                      color="#166534"
                    />
                    <Text style={styles.resourceName}>{reservation.resourceName}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleOpenModal(reservation)}
                    >
                      <Ionicons name="pencil" size={16} color="#166534" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(reservation._id)}
                    >
                      <Ionicons name="trash" size={16} color="#ef4444" />
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

                  {reservation.quantity > 1 && (
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
                </View>
              </View>
            );
          })
        )}
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
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.resourceType}
                  onValueChange={(value) => setFormData({ ...formData, resourceType: value, resourceName: '' })}
                  style={styles.picker}
                >
                  <Picker.Item label="Venue" value="venue" />
                  <Picker.Item label="Equipment" value="equipment" />
                </Picker>
              </View>

              {/* Resource Name */}
              <Text style={styles.label}>Resource Name</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.resourceName}
                  onValueChange={(value) => setFormData({ ...formData, resourceName: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select resource..." value="" />
                  {(formData.resourceType === 'venue' ? VENUES : EQUIPMENT).map((item) => (
                    <Picker.Item key={item} label={item} value={item} />
                  ))}
                </Picker>
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
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Pending" value="pending" />
                  <Picker.Item label="Confirmed" value="confirmed" />
                  <Picker.Item label="Cancelled" value="cancelled" />
                  <Picker.Item label="Borrowed" value="borrowed" />
                  <Picker.Item label="Returned" value="returned" />
                </Picker>
              </View>

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
          </View>
        </View>
      </Modal>

      {/* Date/Time Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowStartDatePicker(false);
            if (date) {
              setFormData({ ...formData, startDate: date });
            }
          }}
        />
      )}

      {showStartTimePicker && (
        <DateTimePicker
          value={formData.startDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, time) => {
            setShowStartTimePicker(false);
            if (time) {
              const newDate = new Date(formData.startDate);
              newDate.setHours(time.getHours(), time.getMinutes());
              setFormData({ ...formData, startDate: newDate });
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowEndDatePicker(false);
            if (date) {
              setFormData({ ...formData, endDate: date });
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={formData.endDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, time) => {
            setShowEndTimePicker(false);
            if (time) {
              const newDate = new Date(formData.endDate);
              newDate.setHours(time.getHours(), time.getMinutes());
              setFormData({ ...formData, endDate: newDate });
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AdminReservationsScreen;
