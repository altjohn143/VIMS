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
import { themeColors, shadows, roleLayouts } from '../../utils/theme';
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
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

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
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
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

  useEffect(() => {
    setPage(0);
  }, [query, status, priority, category]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page]
  );

  const canUpdate = useCallback(
    (req) => {
      const assignedId = req?.assignedTo?._id || req?.assignedTo;
      const myId = user?.id || user?._id;
      const isHeadOfficer =
        user?.securityLevel === 'head-officer' ||
        String(user?.email || '').toLowerCase() === 'security@vims.com';
      return Boolean(
        myId &&
        (
          (assignedId && String(assignedId) === String(myId)) ||
          (isHeadOfficer && req?.category === 'security')
        )
      );
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
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>SECURITY MODULE</Text>
          <Text style={styles.headerTitle}>Service Requests</Text>
          <Text style={styles.headerSubtitle}>Monitor and update assigned security requests.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerActionButton}>
            <Ionicons name="arrow-back" size={17} color="white" />
            <Text style={styles.headerButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={load} style={styles.headerActionButton}>
            <Ionicons name="refresh" size={17} color="white" />
            <Text style={styles.headerButtonText}>Refresh</Text>
          </TouchableOpacity>
          <LogoutButton navigation={navigation} color="white" size={18} />
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
        data={paginated}
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
        ListFooterComponent={filtered.length > rowsPerPage ? (
          <View style={styles.paginationRow}>
            <TouchableOpacity style={[styles.pageButton, page === 0 && styles.disabled]} disabled={page === 0} onPress={() => setPage((value) => Math.max(0, value - 1))}>
              <Text style={styles.pageButtonText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfo}>Page {page + 1} of {pageCount}</Text>
            <TouchableOpacity style={[styles.pageButton, page >= pageCount - 1 && styles.disabled]} disabled={page >= pageCount - 1} onPress={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>
              <Text style={styles.pageButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
                  {processing ? <ActivityIndicator color="white" /> : <><Ionicons name="time-outline" size={16} color="white" /><Text style={styles.actionText}>In Progress</Text></>}
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={processing || !selected?._id || !canUpdate(selected)}
                  onPress={() => updateStatus(selected._id, 'completed')}
                  style={[styles.actionBtn, styles.completedBtn, (processing || !canUpdate(selected)) && styles.disabled]}
                >
                  {processing ? <ActivityIndicator color="white" /> : <><Ionicons name="checkmark-circle-outline" size={16} color="white" /><Text style={styles.actionText}>Completed</Text></>}
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
  container: roleLayouts.security.screen,
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { ...roleLayouts.security.header, flexDirection: 'column', alignItems: 'stretch', paddingHorizontal: 16, paddingBottom: 18, gap: 12 },
  headerTextWrap: { width: '100%' },
  headerEyebrow: { color: themeColors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  headerTitle: { color: 'white', fontSize: 26, lineHeight: 32, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '700', marginTop: 3, lineHeight: 17 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  headerActionButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 38, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerButtonText: { color: 'white', fontSize: 11, fontWeight: '800' },
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
    backgroundColor: themeColors.nav,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: 'white', flex: 1, minWidth: 0 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '900' },
  cardSub: { marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.82)' },
  meta: { marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.54)', fontWeight: '600' },
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
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  inProgressBtn: { backgroundColor: themeColors.info },
  completedBtn: { backgroundColor: themeColors.success },
  actionText: { color: 'white', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pageButton: { backgroundColor: themeColors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  pageButtonText: { color: 'white', fontWeight: '900' },
  pageInfo: { color: themeColors.textSecondary, fontWeight: '800' },
});

export default SecurityServiceRequestsScreen;

