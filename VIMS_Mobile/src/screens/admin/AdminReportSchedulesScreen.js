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
        Alert.alert('Success', 'Reservation created');
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

  const updateStatus = async (id, status) => {
    setProcessing(true);
    try {
      const res = await api.put(`/reservations/${id}`, { status });
      if (res.data?.success) {
        Alert.alert('Success', `Reservation ${status}`);
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
        Alert.alert('Success', 'Reservation deleted');
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

  const renderItem = ({ item }) => {
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
        </View>

        <Text style={styles.metaLine}>Start: {item.startDate ? format(new Date(item.startDate), 'MMM dd, yyyy • hh:mm a') : '—'}</Text>
        <Text style={styles.metaLine}>End: {item.endDate ? format(new Date(item.endDate), 'MMM dd, yyyy • hh:mm a') : '—'}</Text>
        <Text style={styles.metaLine}>Quantity: {item.quantity || 1}</Text>
        <Text style={styles.metaLine} numberOfLines={1}>
          Reserved by: {item.reservedBy ? `${item.reservedBy.firstName} ${item.reservedBy.lastName}` : 'Admin'}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, item.status === 'confirmed' ? styles.cancelBtn : styles.confirmBtn]}
            disabled={processing}
            onPress={() => updateStatus(item._id, item.status === 'confirmed' ? 'cancelled' : 'confirmed')}
          >
            <Text style={[styles.actionBtnText, item.status === 'confirmed' && styles.cancelBtnText]}>
              {item.status === 'confirmed' ? 'Cancel' : 'Confirm'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            disabled={processing}
            onPress={() => deleteReservation(item._id)}
          >
            <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete</Text>
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
          <Text style={styles.headerTitle}>Reservations</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Manage venue and equipment bookings
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setCreateOpen(true)} style={styles.headerIconButton}>
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
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
            <Ionicons name="people-circle" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No reservations yet</Text>
            <Text style={styles.emptyText}>Book shared amenities or equipment from here.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setCreateOpen(true)}>
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.primaryBtnText}>New Reservation</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Reservation</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Resource Type</Text>
              <View style={styles.typeRow}>
                {['venue', 'equipment'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeChip, form.resourceType === type && styles.typeChipActive]}
                    onPress={() => setForm({
                      ...form,
                      resourceType: type,
                      resourceName: type === 'venue' ? VENUES[0] : EQUIPMENT[0],
                    })}
                  >
                    <Text style={[styles.typeChipText, form.resourceType === type && styles.typeChipTextActive]}>
                      {type === 'venue' ? 'Venue' : 'Equipment'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Resource Name</Text>
              <View style={styles.typeRow}>
                {resourceOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.typeChip, form.resourceName === item && styles.typeChipActive]}
                    onPress={() => setForm((p) => ({ ...p, resourceName: item }))}
                  >
                    <Text style={[styles.typeChipText, form.resourceName === item && styles.typeChipTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Start Date & Time</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD HH:mm"
                value={form.startDate}
                onChangeText={(v) => setForm((p) => ({ ...p, startDate: v }))}
              />
              <Text style={styles.label}>End Date & Time</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD HH:mm"
                value={form.endDate}
                onChangeText={(v) => setForm((p) => ({ ...p, endDate: v }))}
              />
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(form.quantity)}
                onChangeText={(v) => setForm((p) => ({ ...p, quantity: v }))}
              />
              <Text style={styles.label}>Status</Text>
              <View style={styles.typeRow}>
                {['pending', 'confirmed', 'cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.typeChip, form.status === status && styles.typeChipActive]}
                    onPress={() => setForm((p) => ({ ...p, status }))}
                  >
                    <Text style={[styles.typeChipText, form.status === status && styles.typeChipTextActive]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Optional details or instructions"
                value={form.notes}
                onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCreateOpen(false)} disabled={processing}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, processing && styles.primaryBtnDisabled]}
                  onPress={saveReservation}
                  disabled={processing}
                >
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Save Reservation</Text>}
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

