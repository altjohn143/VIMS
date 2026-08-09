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
import SecurityUtilityHeader from '../../components/SecurityUtilityHeader';

const SecurityServiceRequestsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoaded, setUserLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(0);
  const [staffMembers, setStaffMembers] = useState([]);
  const [assigningTo, setAssigningTo] = useState('');
  const rowsPerPage = 10;
  const isHeadOfficer =
    user?.securityLevel === 'head-officer' ||
    String(user?.email || '').toLowerCase() === 'security@vims.com';

  const loadUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch (error) {
      console.warn('Unable to restore security session:', error?.message);
    } finally {
      setUserLoaded(true);
    }
  }, []);

  const load = useCallback(async () => {
    if (!userLoaded) return;
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
  }, [status, priority, category, userLoaded]);

  const loadStaff = useCallback(async () => {
    if (!isHeadOfficer) {
      setStaffMembers([]);
      return;
    }
    try {
      const res = await api.get('/service-requests/admin/staff');
      if (res.data?.success) {
        setStaffMembers((res.data.data || []).filter((staff) => staff.role === 'security'));
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load security staff');
    }
  }, [isHeadOfficer]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

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
  }, [rows, query]);

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
        assignedId &&
        (
          String(assignedId) === String(myId) ||
          (isHeadOfficer && ['security', 'complaint'].includes(req?.category))
        )
      );
    },
    [user]
  );

  const requiresAssignmentBeforeUpdate = useCallback(
    (req) => {
      const assignedId = req?.assignedTo?._id || req?.assignedTo;
      return Boolean(
        isHeadOfficer &&
        ['security', 'complaint'].includes(req?.category) &&
        !assignedId
      );
    },
    [isHeadOfficer]
  );

  const updateStatus = async (id, nextStatus) => {
    if (requiresAssignmentBeforeUpdate(selected)) {
      Alert.alert('Assign Staff First', 'Please assign this request to a security officer before changing its status.');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.put(`/service-requests/${id}/status`, { status: nextStatus });
      if (res.data?.success) {
        Alert.alert('Success', `Marked as ${nextStatus}`);
        if (res.data?.data) {
          setSelected(res.data.data);
        }
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

  const extractLocationSignals = (req) => {
    const text = [
      req?.location,
      req?.title,
      req?.description,
      req?.residentId?.houseNumber,
    ].filter(Boolean).join(' ').toLowerCase();
    const phaseMatches = [...text.matchAll(/(?:phase|p)\s*[-:]?\s*(\d+)/gi)].map((match) => Number(match[1]));
    const blockMatches = [...text.matchAll(/(?:block|b)\s*[-:]?\s*([a-z0-9]+)/gi)].map((match) => String(match[1]).toLowerCase());
    const lotMatches = [...text.matchAll(/(?:lot|l)\s*[-:]?\s*([a-z0-9]+)/gi)].map((match) => String(match[1]).toLowerCase());
    return {
      text,
      phases: [...new Set(phaseMatches.filter(Number.isFinite))],
      blocks: [...new Set(blockMatches)],
      lots: [...new Set(lotMatches)],
    };
  };

  const getStaffRecommendation = (staff, req) => {
    const signals = extractLocationSignals(req);
    const assignedPhases = Array.isArray(staff?.assignedPhases) ? staff.assignedPhases.map(Number) : [];
    const assignedAreas = Array.isArray(staff?.assignedAreas) ? staff.assignedAreas.map((area) => String(area || '').toLowerCase()) : [];
    const schedule = String(staff?.patrolSchedule || '').trim();
    let score = 0;
    const reasons = [];

    if (signals.phases.some((phase) => assignedPhases.includes(phase))) {
      score += 4;
      reasons.push(`Phase ${signals.phases.filter((phase) => assignedPhases.includes(phase)).join(', ')}`);
    }

    const areaHits = assignedAreas.filter((area) =>
      area &&
      (
        signals.text.includes(area) ||
        signals.blocks.some((block) => area.includes(`block ${block}`) || area.includes(`b${block}`) || area === block) ||
        signals.lots.some((lot) => area.includes(`lot ${lot}`) || area.includes(`l${lot}`) || area === lot)
      )
    );
    if (areaHits.length) {
      score += 3;
      reasons.push(areaHits.slice(0, 2).join(', '));
    }
    if (schedule) {
      score += 1;
      reasons.push(schedule);
    }

    return {
      ...staff,
      recommendationScore: score,
      recommendationReason: reasons.length ? reasons.join(' • ') : 'Available security staff',
    };
  };

  const recommendedStaff = useMemo(() => {
    if (!selected || !staffMembers.length) return [];
    const assignedStaff = selected?.assignedTo && typeof selected.assignedTo === 'object' ? selected.assignedTo : null;
    const availableStaff = assignedStaff && !staffMembers.some((staff) => String(staff._id) === String(assignedStaff._id))
      ? [...staffMembers, assignedStaff]
      : staffMembers;
    return availableStaff
      .map((staff) => getStaffRecommendation(staff, selected))
      .sort((a, b) => b.recommendationScore - a.recommendationScore || String(a.firstName || '').localeCompare(String(b.firstName || '')));
  }, [selected, staffMembers]);

  const assignRequest = async () => {
    if (!selected?._id || !assigningTo) {
      Alert.alert('Select Staff', 'Please select a security staff member to assign this request.');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.put(`/service-requests/${selected._id}/assign-staff`, { assignedTo: assigningTo });
      if (res.data?.success) {
        Alert.alert('Success', 'Security request assigned to staff.');
        setDetailsOpen(false);
        setSelected(null);
        setAssigningTo('');
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to assign request');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to assign request');
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
      <TouchableOpacity style={[styles.card, shadows.small]} onPress={() => { setSelected(item); setAssigningTo(item?.assignedTo?._id || item?.assignedTo || ''); setDetailsOpen(true); }}>
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
        <Text style={styles.meta} numberOfLines={1}>
          Assigned to: {item?.assignedTo ? `${item.assignedTo.firstName || ''} ${item.assignedTo.lastName || ''}`.trim() || 'Security staff' : 'Unassigned'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <View style={styles.filters}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={themeColors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search title, category, resident..."
          blurOnSubmit={false}
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {[
          { key: 'all', label: 'All Types' },
          { key: 'security', label: 'Security' },
          { key: 'complaint', label: 'Complaints' },
        ].map((c) => (
          <TouchableOpacity key={c.key} style={[styles.chip, category === c.key && styles.chipActive]} onPress={() => setCategory(c.key)}>
            <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {[
          { key: 'all', label: 'All Priority' },
          { key: 'low', label: 'Low' },
          { key: 'medium', label: 'Medium' },
          { key: 'high', label: 'High' },
          { key: 'urgent', label: 'Urgent' },
        ].map((c) => (
          <TouchableOpacity key={c.key} style={[styles.chip, priority === c.key && styles.chipActive]} onPress={() => setPriority(c.key)}>
            <Text style={[styles.chipText, priority === c.key && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading || !userLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SecurityUtilityHeader
        navigation={navigation}
        title="Services & Complaints"
        subtitle={isHeadOfficer ? 'Review, assign, and track security requests and complaints.' : 'Track requests and complaints assigned to you.'}
        actions={[{ label: 'Refresh', icon: 'refresh', onPress: load, primary: true }]}
      />

      <FlatList
        data={paginated}
        renderItem={renderItem}
        keyExtractor={(item, index) => item?._id || `service-${index}`}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderListHeader()}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="build-outline" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No requests</Text>
            <Text style={styles.emptyText}>
              {isHeadOfficer
                ? (status === 'all' && priority === 'all' && category === 'all'
                  ? 'No security requests or complaints are waiting for review.'
                  : 'No security requests or complaints match your filters.')
                : (status === 'all' && priority === 'all' && category === 'all'
                  ? 'No security requests or complaints are assigned to this staff account yet.'
                  : 'No assigned security requests match your filters.')}
            </Text>
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
                {isHeadOfficer
                  ? (requiresAssignmentBeforeUpdate(selected)
                    ? 'Assign this request to a security officer before marking it in progress or completed.'
                    : 'Head officers can reassign security requests and complaints to supervised staff.')
                  : 'Status updates are only allowed if this request is assigned to you.'}
              </Text>

              {isHeadOfficer && (
                <View style={styles.assignmentBox}>
                  <Text style={styles.assignmentTitle}>Recommended Security Staff</Text>
                  {recommendedStaff.length ? (
                    recommendedStaff.map((staff) => {
                      const selectedStaff = String(assigningTo) === String(staff._id);
                      return (
                        <TouchableOpacity
                          key={staff._id}
                          style={[styles.staffOption, selectedStaff && styles.staffOptionActive]}
                          onPress={() => setAssigningTo(staff._id)}
                        >
                          <View style={styles.staffTextWrap}>
                            <Text style={[styles.staffName, selectedStaff && styles.staffNameActive]}>
                              {staff.firstName} {staff.lastName}
                            </Text>
                            <Text style={[styles.staffMeta, selectedStaff && styles.staffMetaActive]}>
                              {staff.recommendationScore > 0 ? 'Recommended: ' : ''}{staff.recommendationReason}
                            </Text>
                          </View>
                          {selectedStaff && <Ionicons name="checkmark-circle" size={20} color="white" />}
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>No supervised security staff found.</Text>
                  )}
                  <TouchableOpacity
                    disabled={processing || !assigningTo}
                    onPress={assignRequest}
                    style={[styles.assignBtn, (processing || !assigningTo) && styles.disabled]}
                  >
                    {processing ? <ActivityIndicator color="white" /> : <><Ionicons name="person-add-outline" size={16} color="white" /><Text style={styles.actionText}>Assign Staff</Text></>}
                  </TouchableOpacity>
                </View>
              )}

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
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderLeftWidth: 4,
    borderLeftColor: themeColors.primary,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: themeColors.textPrimary, flex: 1, minWidth: 0 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '900' },
  cardSub: { marginTop: 10, fontSize: 13, color: themeColors.textSecondary },
  meta: { marginTop: 8, fontSize: 11, color: themeColors.textSecondary, fontWeight: '700' },
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
  assignmentBox: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 14,
  },
  assignmentTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },
  staffOption: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  staffOptionActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  staffTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  staffName: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  staffNameActive: {
    color: 'white',
  },
  staffMeta: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  staffMetaActive: {
    color: 'rgba(255,255,255,0.82)',
  },
  assignBtn: {
    marginTop: 4,
    backgroundColor: themeColors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
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

