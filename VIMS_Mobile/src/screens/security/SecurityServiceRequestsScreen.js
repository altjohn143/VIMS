import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';
import LogoutButton from '../../components/LogoutButton';

const SecurityServiceRequestsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadUser = useCallback(async () => {
    const raw = await AsyncStorage.getItem('user');
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (status !== 'all') params.status = status;
      if (priority !== 'all') params.priority = priority;
      if (category !== 'all') params.category = category;
      const res = await api.get('/service-requests', { params });
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load service requests');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load service requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, priority, category]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const formatWhen = (d) => {
    if (!d) return 'N/A';
    try {
      return format(new Date(d), 'MMM dd, yyyy • hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  const filtered = useMemo(() => {
    const onlyAssigned = rows.filter((r) => {
      const assignedId = r?.assignedTo?._id || r?.assignedTo;
      const myId = user?.id || user?._id;
      return Boolean(myId && assignedId && String(assignedId) === String(myId));
    });

    if (!query.trim()) return onlyAssigned;
    const q = query.trim().toLowerCase();
    return onlyAssigned.filter((r) => {
      const residentName = `${r?.residentId?.firstName || ''} ${r?.residentId?.lastName || ''}`.toLowerCase();
      return (
        String(r?.title || '').toLowerCase().includes(q) ||
        String(r?.description || '').toLowerCase().includes(q) ||
        String(r?.category || '').toLowerCase().includes(q) ||
        residentName.includes(q) ||
        String(r?.residentId?.houseNumber || '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, user]);

  const canUpdate = useCallback(
    (req) => {
      const assignedId = req?.assignedTo?._id || req?.assignedTo;
      const myId = user?.id || user?._id;
      return Boolean(myId && assignedId && String(assignedId) === String(myId));
    },
    [user]
  );

  const updateStatus = async (id, nextStatus) => {
    setProcessing(true);
    try {
      const res = await api.put(`/service-requests/${id}/status`, { status: nextStatus });
      if (res.data?.success) {
        Alert.alert('Success', `Marked as ${nextStatus}`);
        setDetailsOpen(false);
        setSelected(null);
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to update status');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const getPriorityColor = (p) => {
    const map = {
      low: themeColors.success,
      medium: themeColors.warning,
      high: themeColors.error,
      urgent: themeColors.error,
    };
    return map[p] || themeColors.textSecondary;
  };

  const renderItem = ({ item }) => {
    const pr = getPriorityColor(item?.priority);
    return (
      <TouchableOpacity style={[styles.card, shadows.small]} onPress={() => { setSelected(item); setDetailsOpen(true); }}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item?.title || 'Service request'}</Text>
          <View style={[styles.pill, { backgroundColor: pr + '20' }]}>
            <Text style={[styles.pillText, { color: pr }]}>{String(item?.priority || 'medium').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.cardSub} numberOfLines={2}>{item?.description || ''}</Text>
        <Text style={styles.meta}>
          {item?.category || 'other'} • {item?.status || 'pending'} • {formatWhen(item?.createdAt)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Resident: {item?.residentId?.firstName} {item?.residentId?.lastName} • House {item?.residentId?.houseNumber || 'N/A'}
        </Text>
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Service Requests</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={load} style={styles.headerIconButton}>
            <Ionicons name="refresh" size={22} color="white" />
          </TouchableOpacity>
          <LogoutButton navigation={navigation} color="white" size={24} />
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search title, category, resident..."
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'assigned', label: 'Assigned' },
            { key: 'in-progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
          ].map((c) => (
            <TouchableOpacity key={c.key} style={[styles.chip, status === c.key && styles.chipActive]} onPress={() => setStatus(c.key)}>
              <Text style={[styles.chipText, status === c.key && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item?._id || String(Math.random())}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="build-outline" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No requests</Text>
            <Text style={styles.emptyText}>No service requests match your filters.</Text>
          </View>
        }
      />

      <Modal visible={detailsOpen} transparent animationType="slide" onRequestClose={() => setDetailsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Details</Text>
              <TouchableOpacity onPress={() => setDetailsOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.dTitle}>{selected?.title || 'Service request'}</Text>
              <Text style={styles.dMeta}>{selected?.category || 'other'} • {selected?.status || 'pending'}</Text>
              <Text style={styles.dMeta}>Created: {formatWhen(selected?.createdAt)}</Text>
              <Text style={styles.dMeta}>Resident: {selected?.residentId?.firstName} {selected?.residentId?.lastName} • House {selected?.residentId?.houseNumber || 'N/A'}</Text>
              <View style={styles.divider} />
              <Text style={styles.dBody}>{selected?.description || ''}</Text>

              <View style={styles.divider} />
              <Text style={styles.note}>
                Status updates are only allowed if this request is assigned to you.
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  disabled={processing || !selected?._id || !canUpdate(selected)}
                  onPress={() => updateStatus(selected._id, 'in-progress')}
                  style={[styles.actionBtn, styles.inProgressBtn, (processing || !canUpdate(selected)) && styles.disabled]}
                >
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.actionText}>In Progress</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={processing || !selected?._id || !canUpdate(selected)}
                  onPress={() => updateStatus(selected._id, 'completed')}
                  style={[styles.actionBtn, styles.completedBtn, (processing || !canUpdate(selected)) && styles.disabled]}
                >
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.actionText}>Completed</Text>}
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
  },
  backButton: { padding: 8 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconButton: { padding: 8 },
  filters: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: themeColors.border, padding: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8 },
  chipsRow: { marginTop: 10 },
  chip: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  chipActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  chipText: { fontSize: 12, fontWeight: '800', color: themeColors.textSecondary },
  chipTextActive: { color: 'white' },
  listContainer: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: themeColors.textPrimary, flex: 1, minWidth: 0 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '900' },
  cardSub: { marginTop: 10, fontSize: 13, color: themeColors.textPrimary, opacity: 0.9 },
  meta: { marginTop: 8, fontSize: 11, color: themeColors.textSecondary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: themeColors.textPrimary },
  emptyText: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: themeColors.textPrimary },
  dTitle: { fontSize: 18, fontWeight: '900', color: themeColors.textPrimary, marginTop: 6 },
  dMeta: { marginTop: 4, fontSize: 12, color: themeColors.textSecondary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: themeColors.border, marginVertical: 12 },
  dBody: { fontSize: 14, color: themeColors.textPrimary, lineHeight: 22 },
  note: { fontSize: 12, color: themeColors.textSecondary, marginBottom: 10, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 6, marginBottom: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  inProgressBtn: { backgroundColor: themeColors.info },
  completedBtn: { backgroundColor: themeColors.success },
  actionText: { color: 'white', fontWeight: '900' },
  disabled: { opacity: 0.55 },
});

export default SecurityServiceRequestsScreen;

