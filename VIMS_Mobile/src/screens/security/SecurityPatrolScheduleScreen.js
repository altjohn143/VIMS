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
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows, roleLayouts } from '../../utils/theme';
import SecurityUtilityHeader from '../../components/SecurityUtilityHeader';

const createInitialForm = () => ({ phase: '', area: '', checkpoint: '', notes: '', status: 'completed', loggedAt: new Date() });

const SecurityPatrolScheduleScreen = ({ navigation }) => {
  const [rows, setRows] = useState([]);
  const [lots, setLots] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(createInitialForm());
  const [patrolPickerMode, setPatrolPickerMode] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const rowsPerPage = 5;

  const displayedRows = useMemo(
    () => rows.filter((row) => {
      const statusMatches = statusFilter === 'all' || String(row?.status || 'completed') === statusFilter;
      const phaseMatches = phaseFilter === 'all' || String(row?.phase || '') === String(phaseFilter);
      return statusMatches && phaseMatches;
    }),
    [phaseFilter, rows, statusFilter]
  );
  const paginatedRows = useMemo(
    () => displayedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [displayedRows, page]
  );
  const pageCount = Math.max(1, Math.ceil(displayedRows.length / rowsPerPage));
  const assignedPhases = assignment?.assignedPhases || [];
  const isHeadOfficer = assignment?.securityLevel === 'head-officer';
  const availableLots = useMemo(
    () => {
      if (isHeadOfficer) return lots;
      if (assignedPhases.length === 0) return [];
      return lots.filter((lot) => assignedPhases.map(String).includes(String(lot.phase)));
    },
    [assignedPhases, isHeadOfficer, lots]
  );
  const phases = useMemo(
    () => Array.from(new Set(availableLots.map((lot) => lot.phase))).sort((a, b) => a - b),
    [availableLots]
  );

  const listText = (items, fallback) => {
    if (!Array.isArray(items) || items.length === 0) return fallback;
    return items.join(', ');
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get('/patrols');
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load patrol logs');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load patrol logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadLots = useCallback(async () => {
    try {
      const res = await api.get('/lots');
      if (res.data?.success) {
        setLots(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load village map data');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load village map data');
    }
  }, []);

  const loadAssignment = useCallback(async () => {
    try {
      const res = await api.get('/patrols/my-assignment');
      if (res.data?.success) {
        setAssignment(res.data.data || null);
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load patrol assignment');
    }
  }, []);

  useEffect(() => {
    load();
    loadLots();
    loadAssignment();
  }, [load, loadLots, loadAssignment]);

  useEffect(() => {
    setPage(0);
  }, [phaseFilter, statusFilter]);

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

  const submit = async () => {
    if (!form.phase || !form.area.trim() || !form.checkpoint.trim()) {
      Alert.alert('Error', 'Phase, area and checkpoint are required');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post('/patrols/log', {
        ...form,
        phase: Number(form.phase),
        loggedAt: (form.loggedAt || new Date()).toISOString()
      });
      if (res.data?.success) {
        Alert.alert('Success', 'Patrol log submitted');
        setCreateOpen(false);
        setForm(createInitialForm());
        setPatrolPickerMode(null);
        setPage(0);
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to submit patrol log');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to submit patrol log');
    } finally {
      setProcessing(false);
    }
  };

  const updatePatrolDateTime = (event, value) => {
    if (event?.type === 'dismissed') {
      setPatrolPickerMode(null);
      return;
    }
    if (!value) return;
    const current = form.loggedAt || new Date();
    const next = new Date(current);
    if (patrolPickerMode === 'date') {
      next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
    } else {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    }
    setForm((previous) => ({ ...previous, loggedAt: next }));
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, shadows.small]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item?.area || 'Area'} • {item?.checkpoint || 'Checkpoint'}
        </Text>
        <View style={styles.pill}>
          <Ionicons name="walk" size={12} color={themeColors.primary} />
          <Text style={styles.pillText}>{String(item?.status || 'completed')}</Text>
        </View>
      </View>
      {item?.notes ? <Text style={styles.cardBody}>{item.notes}</Text> : null}
      <Text style={styles.meta}>
        {formatWhen(item?.loggedAt || item?.createdAt)} • Officer: {item?.officerId?.firstName || ''} {item?.officerId?.lastName || ''}
      </Text>
    </View>
  );

  if (loading) {
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
        title="Patrol Logs"
        subtitle="Submit checkpoint rounds and review patrol activity."
        actions={[{ label: 'Refresh', icon: 'refresh', onPress: load, primary: true }]}
      />

      <FlatList
        data={paginatedRows}
        renderItem={renderItem}
        keyExtractor={(item, index) => item?._id || `patrol-${index}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={[styles.formCard, shadows.small]}>
            <View style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <View>
                  <Text style={styles.routeEyebrow}>MY PATROL ROUTE</Text>
                  <Text style={styles.routeTitle}>
                    {isHeadOfficer ? 'Head Officer Coverage' : 'Assigned Patrol Route'}
                  </Text>
                </View>
                <Ionicons name="shield-checkmark" size={24} color={themeColors.primary} />
              </View>
              <View style={styles.routeGrid}>
                <View style={styles.routeItem}>
                  <Text style={styles.routeLabel}>Phases</Text>
                  <Text style={styles.routeValue}>
                    {isHeadOfficer ? 'All phases' : listText(assignedPhases.map((phase) => `Phase ${phase}`), 'No phase assigned')}
                  </Text>
                </View>
                <View style={styles.routeItem}>
                  <Text style={styles.routeLabel}>Areas</Text>
                  <Text style={styles.routeValue}>
                    {isHeadOfficer ? 'All security areas' : listText(assignment?.assignedAreas, 'No area assigned')}
                  </Text>
                </View>
                <View style={styles.routeItem}>
                  <Text style={styles.routeLabel}>Timing / Schedule</Text>
                  <Text style={styles.routeValue}>
                    {isHeadOfficer ? 'Supervision as needed' : assignment?.patrolSchedule || 'No patrol schedule set'}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Patrol Log Form</Text>
            <Text style={styles.label}>Phase</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={form.phase} onValueChange={(value) => setForm((p) => ({ ...p, phase: value, area: value ? `Phase ${value}` : '', checkpoint: '' }))}>
                <Picker.Item label="Select phase" value="" />
                {phases.map((phase) => (
                  <Picker.Item key={phase} label={`Phase ${phase}`} value={String(phase)} />
                ))}
              </Picker>
            </View>
            <Text style={styles.label}>Area</Text>
            <TextInput style={[styles.input, { backgroundColor: '#e2e8f0' }]} value={form.area} editable={false} placeholder="Select phase first" />
            <Text style={styles.label}>Checkpoint</Text>
            <View style={[styles.pickerContainer, !form.phase && styles.pickerDisabled]}>
              <Picker selectedValue={form.checkpoint} enabled={!!form.phase} onValueChange={(value) => setForm((p) => ({ ...p, checkpoint: value }))}>
                <Picker.Item label={form.phase ? 'Select checkpoint' : 'Select phase first'} value="" />
                {availableLots.filter((lot) => String(lot.phase) === String(form.phase)).map((lot) => (
                  <Picker.Item key={lot.lotId} label={`Block ${lot.block} - Lot ${lot.lotNumber}`} value={lot.lotId} />
                ))}
              </Picker>
            </View>
            <Text style={styles.label}>Patrol date and time</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity style={styles.dateTimeButton} onPress={() => setPatrolPickerMode('date')}>
                <Ionicons name="calendar-outline" size={16} color={themeColors.primary} />
                <Text style={styles.dateTimeText}>{format(form.loggedAt || new Date(), 'MMM dd, yyyy')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateTimeButton} onPress={() => setPatrolPickerMode('time')}>
                <Ionicons name="time-outline" size={16} color={themeColors.primary} />
                <Text style={styles.dateTimeText}>{format(form.loggedAt || new Date(), 'hh:mm a')}</Text>
              </TouchableOpacity>
            </View>
            {patrolPickerMode ? (
              <View style={styles.inlinePickerWrap}>
                <DateTimePicker
                  value={form.loggedAt || new Date()}
                  mode={patrolPickerMode}
                  display={patrolPickerMode === 'date' ? (Platform.OS === 'ios' ? 'inline' : 'calendar') : 'spinner'}
                  onChange={updatePatrolDateTime}
                />
              </View>
            ) : null}
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, styles.textArea]} value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Observations" multiline numberOfLines={4} textAlignVertical="top" />
            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={form.status} onValueChange={(value) => setForm((p) => ({ ...p, status: value }))}>
                <Picker.Item label="Completed" value="completed" />
                <Picker.Item label="Issue Found" value="issue_found" />
              </Picker>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, styles.formSubmitBtn, processing && styles.disabled]} onPress={submit} disabled={processing}>
              {processing ? <ActivityIndicator color="white" /> : <><Ionicons name="walk-outline" size={16} color="white" /><Text style={styles.primaryText}>Submit Patrol Log</Text></>}
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Patrol Logs</Text>
            <View style={styles.filterPanel}>
              <Text style={styles.filterTitle}>Display Filters</Text>
              <Text style={styles.label}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={statusFilter} onValueChange={setStatusFilter}>
                  <Picker.Item label="All statuses" value="all" />
                  <Picker.Item label="Completed" value="completed" />
                  <Picker.Item label="Issue Found" value="issue_found" />
                </Picker>
              </View>
              <Text style={styles.label}>Phase</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={phaseFilter} onValueChange={setPhaseFilter}>
                  <Picker.Item label="All phases" value="all" />
                  {phases.map((phase) => (
                    <Picker.Item key={`filter-${phase}`} label={`Phase ${phase}`} value={String(phase)} />
                  ))}
                </Picker>
              </View>
              <Text style={styles.filterSummary}>
                Showing {displayedRows.length} of {rows.length} patrol records
              </Text>
            </View>
          </View>
        }
        ListFooterComponent={
          displayedRows.length > 0 ? (
            <View style={styles.paginationRow}>
              <TouchableOpacity style={[styles.pageBtn, page === 0 && styles.disabled]} disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))}>
                <Text style={styles.pageText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>Page {page + 1} of {pageCount}</Text>
              <TouchableOpacity style={[styles.pageBtn, page >= pageCount - 1 && styles.disabled]} disabled={page >= pageCount - 1} onPress={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>
                <Text style={styles.pageText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="walk-outline" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No patrol logs</Text>
            <Text style={styles.emptyText}>
              {rows.length ? 'No patrol logs match the selected filters.' : 'Create a patrol log to start tracking rounds.'}
            </Text>
          </View>
        }
      />

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Patrol Log</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Phase</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.phase}
                  onValueChange={(value) => setForm((p) => ({
                    ...p,
                    phase: value,
                    area: value ? `Phase ${value}` : '',
                    checkpoint: ''
                  }))}
                >
                  <Picker.Item label="Select phase" value="" />
                  {phases.map((phase) => (
                    <Picker.Item key={phase} label={`Phase ${phase}`} value={String(phase)} />
                  ))}
                </Picker>
              </View>
              <Text style={styles.label}>Area</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#e2e8f0' }]}
                value={form.area}
                editable={false}
                placeholder="Select phase first"
              />
              <Text style={styles.label}>Checkpoint</Text>
              <View style={[styles.pickerContainer, !form.phase && styles.pickerDisabled]}>
                <Picker
                  selectedValue={form.checkpoint}
                  enabled={!!form.phase}
                  onValueChange={(value) => setForm((p) => ({ ...p, checkpoint: value }))}
                >
                  <Picker.Item label={form.phase ? 'Select checkpoint' : 'Select phase first'} value="" />
                  {availableLots
                    .filter((lot) => String(lot.phase) === String(form.phase))
                    .map((lot) => (
                      <Picker.Item
                        key={lot.lotId}
                        label={`Block ${lot.block} - Lot ${lot.lotNumber}`}
                        value={lot.lotId}
                      />
                  ))}
                </Picker>
              </View>
              <Text style={styles.label}>Patrol date and time</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => setPatrolPickerMode('date')}>
                  <Ionicons name="calendar-outline" size={16} color={themeColors.primary} />
                  <Text style={styles.dateTimeText}>{format(form.loggedAt || new Date(), 'MMM dd, yyyy')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => setPatrolPickerMode('time')}>
                  <Ionicons name="time-outline" size={16} color={themeColors.primary} />
                  <Text style={styles.dateTimeText}>{format(form.loggedAt || new Date(), 'hh:mm a')}</Text>
                </TouchableOpacity>
              </View>
              {patrolPickerMode ? (
                <View style={styles.inlinePickerWrap}>
                  <DateTimePicker
                    value={form.loggedAt || new Date()}
                    mode={patrolPickerMode}
                    display={patrolPickerMode === 'date' ? (Platform.OS === 'ios' ? 'inline' : 'calendar') : 'spinner'}
                    onChange={updatePatrolDateTime}
                  />
                </View>
              ) : null}
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.notes}
                onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                placeholder="Observations"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCreateOpen(false)} disabled={processing}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, processing && styles.disabled]} onPress={submit} disabled={processing}>
                  {processing ? <ActivityIndicator color="white" /> : <><Ionicons name="walk-outline" size={16} color="white" /><Text style={styles.primaryText}>Submit</Text></>}
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
  listContainer: { padding: 16, paddingBottom: 24 },
  formCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: themeColors.border },
  routeCard: { backgroundColor: themeColors.primary + '0F', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: themeColors.primary + '22' },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  routeEyebrow: { color: themeColors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  routeTitle: { color: themeColors.textPrimary, fontSize: 16, fontWeight: '900', marginTop: 2 },
  routeGrid: { marginTop: 12, gap: 10 },
  routeItem: { backgroundColor: 'white', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: themeColors.border },
  routeLabel: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '900', marginBottom: 3 },
  routeValue: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: themeColors.textPrimary, marginBottom: 8, marginTop: 4 },
  card: { backgroundColor: themeColors.cardBackground, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: themeColors.border, borderLeftWidth: 4, borderLeftColor: themeColors.primary },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: themeColors.textPrimary, flex: 1, minWidth: 0 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: themeColors.primary + '12' },
  pillText: { fontSize: 11, fontWeight: '900', color: themeColors.primary },
  cardBody: { marginTop: 10, fontSize: 13, color: themeColors.textPrimary, opacity: 0.9 },
  meta: { marginTop: 10, fontSize: 11, color: themeColors.textSecondary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: themeColors.textPrimary },
  emptyText: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, textAlign: 'center', paddingHorizontal: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: themeColors.textPrimary },
  label: { marginTop: 10, fontSize: 12, color: themeColors.textSecondary, fontWeight: '800' },
  pickerContainer: { marginTop: 8, borderWidth: 1, borderColor: themeColors.border, borderRadius: 10, backgroundColor: '#f8fafc' },
  pickerDisabled: { opacity: 0.6 },
  dateTimeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dateTimeButton: { flex: 1, minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: themeColors.border, backgroundColor: '#f8fafc', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dateTimeText: { color: themeColors.textPrimary, fontSize: 12, fontWeight: '800' },
  inlinePickerWrap: { marginTop: 8, borderWidth: 1, borderColor: themeColors.border, borderRadius: 12, backgroundColor: 'white', overflow: 'hidden' },
  filterPanel: { marginTop: 8, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, backgroundColor: '#f8fafc' },
  filterTitle: { color: themeColors.textPrimary, fontSize: 14, fontWeight: '900' },
  filterSummary: { marginTop: 10, color: themeColors.textSecondary, fontSize: 12, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: themeColors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, backgroundColor: '#f8fafc' },
  textArea: { minHeight: 110 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 10 },
  secondaryBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  secondaryText: { fontWeight: '900', color: themeColors.textSecondary },
  primaryBtn: { flex: 1, backgroundColor: themeColors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  formSubmitBtn: { flex: 0, marginTop: 14 },
  primaryText: { fontWeight: '900', color: 'white' },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  pageBtn: { backgroundColor: themeColors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  pageText: { color: 'white', fontWeight: '900' },
  pageInfo: { color: themeColors.textSecondary, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});

export default SecurityPatrolScheduleScreen;

