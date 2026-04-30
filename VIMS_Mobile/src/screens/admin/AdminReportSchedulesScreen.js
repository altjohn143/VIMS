import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';
import LogoutButton from '../../components/LogoutButton';

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

const EMPTY = {
  resourceType: 'venue',
  resourceName: VENUES[0],
  startDate: '',
  endDate: '',
  quantity: '1',
  status: 'pending',
  notes: '',
};

const AdminReportSchedulesScreen = ({ navigation }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [processing, setProcessing] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/reservations');
      if (res.data?.success) {
        setReservations(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load reservations');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load reservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const resourceOptions = form.resourceType === 'venue' ? VENUES : EQUIPMENT;

  const saveReservation = async () => {
    if (!form.resourceName || !form.startDate || !form.endDate) {
      Alert.alert('Validation', 'Please select resource, start date, and end date.');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity) || 1,
      };
      const res = await api.post('/reservations', payload);
      if (res.data?.success) {
        Alert.alert('Success', 'Reservation created.');
        setForm(EMPTY);
        setCreateOpen(false);
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to create reservation');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to create reservation');
    } finally {
      setProcessing(false);
    }
  };

  const updateReservation = async (id, updates) => {
    setProcessing(true);
    try {
      const res = await api.put(`/reservations/${id}`, updates);
      if (res.data?.success) {
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to update reservation');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to update reservation');
    } finally {
      setProcessing(false);
    }
  };

  const deleteReservation = async (id) => {
    setProcessing(true);
    try {
      const res = await api.delete(`/reservations/${id}`);
      if (res.data?.success) {
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to delete reservation');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to delete reservation');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = (item) => {
    Alert.alert('Confirm Checkout', 'Mark this reservation as borrowed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: () => updateReservation(item._id, { status: 'borrowed', actualCheckout: new Date().toISOString() }),
      },
    ]);
  };

  const handleCheckIn = (item) => {
    Alert.alert('Confirm Return', 'Mark this reservation as returned?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: () => updateReservation(item._id, { status: 'returned', actualReturn: new Date().toISOString() }),
      },
    ]);
  };

  const openIssueModal = (item) => {
    setSelectedReservation(item);
    setIssueModalOpen(true);
  };

  const saveIssue = async () => {
    if (!selectedReservation) return;
    if (!selectedReservation.issueNotes?.trim()) {
      Alert.alert('Validation', 'Please enter issue notes.');
      return;
    }

    await updateReservation(selectedReservation._id, {
      returnCondition: selectedReservation.returnCondition,
      issueNotes: selectedReservation.issueNotes,
    });
    setIssueModalOpen(false);
    setSelectedReservation(null);
  };

  const renderItem = ({ item }) => {
    const isBorrowed = item.status === 'borrowed';
    const isReturned = item.status === 'returned';

    return (
      <View style={[styles.card, shadows.small]}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.resourceName}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {item.resourceType === 'venue' ? 'Venue' : 'Equipment'} • {item.status}
            </Text>
          </View>
          <TouchableOpacity onPress={() => deleteReservation(item._id)} style={styles.deleteIconButton} disabled={processing}>
            <Ionicons name="trash" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <Text style={styles.metaLine}>Requested by: {item.reservedBy ? `${item.reservedBy.firstName} ${item.reservedBy.lastName}` : 'Admin'}</Text>
        <Text style={styles.metaLine}>Start: {item.startDate ? format(new Date(item.startDate), 'MMM dd, yyyy • hh:mm a') : '—'}</Text>
        <Text style={styles.metaLine}>End: {item.endDate ? format(new Date(item.endDate), 'MMM dd, yyyy • hh:mm a') : '—'}</Text>
        <Text style={styles.metaLine}>Quantity: {item.quantity || 1}</Text>
        <Text style={styles.metaLine}>Actual checkout: {item.actualCheckout ? format(new Date(item.actualCheckout), 'MMM dd, yyyy • hh:mm a') : 'Pending'}</Text>
        <Text style={styles.metaLine}>Actual return: {item.actualReturn ? format(new Date(item.actualReturn), 'MMM dd, yyyy • hh:mm a') : 'Pending'}</Text>
        <Text style={styles.metaLine}>Return condition: {item.returnCondition || 'Pending'}</Text>
        {item.issueNotes ? <Text style={styles.metaLine}>Issue: {item.issueNotes}</Text> : null}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, isBorrowed ? styles.confirmBtn : styles.cancelBtn]}
            disabled={processing || isReturned}
            onPress={() => (isBorrowed ? handleCheckIn(item) : handleCheckOut(item))}
          >
            <Text style={styles.actionBtnText}>{isBorrowed ? 'Check In' : 'Check Out'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            disabled={processing}
            onPress={() => openIssueModal(item)}
          >
            <Text style={[styles.actionBtnText, { color: themeColors.textPrimary }]}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Reservation Logs</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Manage borrow, return, and return issues
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={load} style={styles.headerIconButton}>
            <Ionicons name="refresh" size={22} color="white" />
          </TouchableOpacity>
          <LogoutButton navigation={navigation} color="white" size={24} />
        </View>
      </View>

      <FlatList
        data={reservations}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No reservation logs</Text>
            <Text style={styles.emptyText}>Reservations will appear here after they are created.</Text>
          </View>
        }
      />

      <Modal visible={issueModalOpen} transparent animationType="slide" onRequestClose={() => setIssueModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Return Issue</Text>
              <TouchableOpacity onPress={() => setIssueModalOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Return Condition</Text>
              <View style={styles.typeRow}>
                {['Good', 'Damaged', 'Missing'].map((condition) => (
                  <TouchableOpacity
                    key={condition}
                    style={[
                      styles.typeChip,
                      selectedReservation?.returnCondition === condition && styles.typeChipActive,
                    ]}
                    onPress={() => setSelectedReservation((prev) => ({ ...prev, returnCondition: condition }))}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        selectedReservation?.returnCondition === condition && styles.typeChipTextActive,
                      ]}
                    >
                      {condition}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Issue Notes</Text>
              <TextInput
                style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
                placeholder="Describe the problem with the returned item"
                value={selectedReservation?.issueNotes || ''}
                onChangeText={(v) => setSelectedReservation((prev) => ({ ...prev, issueNotes: v }))}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIssueModalOpen(false)} disabled={processing}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, processing && styles.primaryBtnDisabled]}
                  onPress={saveIssue}
                  disabled={processing}
                >
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Save Issue</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: themeColors.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: { padding: 8 },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconButton: { padding: 8 },

  listContainer: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: themeColors.textPrimary },
  cardSub: { fontSize: 12, color: themeColors.textSecondary, marginTop: 2, fontWeight: '600' },
  metaLine: { marginTop: 10, fontSize: 12, color: themeColors.textPrimary, opacity: 0.85 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtn: { backgroundColor: themeColors.primary },
  cancelBtn: { backgroundColor: '#f97316' },
  deleteBtn: { backgroundColor: '#ef4444' },
  actionBtnText: { color: 'white', fontWeight: '800' },
  cancelBtnText: { color: 'white' },
  deleteBtnText: { color: 'white' },
  deleteIconButton: { padding: 8 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: themeColors.textPrimary },
  emptyText: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: themeColors.textPrimary },
  label: { marginTop: 10, fontSize: 12, color: themeColors.textSecondary, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#f8fafc',
  },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 2, flexWrap: 'wrap' },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  typeChipActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  typeChipText: { fontSize: 12, fontWeight: '800', color: themeColors.textSecondary },
  typeChipTextActive: { color: 'white' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 10 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: 'white', fontWeight: '900' },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: themeColors.textSecondary, fontWeight: '900' },
});

export default AdminReportSchedulesScreen;

