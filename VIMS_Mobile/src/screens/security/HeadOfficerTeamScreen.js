import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { themeColors, shadows, roleLayouts } from '../../utils/theme';

const officerName = (officer) =>
  `${officer?.firstName || ''} ${officer?.lastName || ''}`.trim() || 'Unassigned officer';
const listText = (value, fallback) =>
  Array.isArray(value) && value.length ? value.join(', ') : fallback;
const when = (value) => {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No timestamp' : date.toLocaleString();
};

const HeadOfficerTeamScreen = ({ navigation, route }) => {
  const [team, setTeam] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [routeForm, setRouteForm] = useState({ assignedPhases: '', assignedAreas: '', patrolSchedule: '' });
  const [savingRoute, setSavingRoute] = useState(false);

  const load = useCallback(async () => {
    try {
      const [teamRes, logsRes] = await Promise.all([
        api.get('/patrols/head-officer/team'),
        api.get('/patrols'),
      ]);
      setTeam(Array.isArray(teamRes.data?.data) ? teamRes.data.data : []);
      setLogs(Array.isArray(logsRes.data?.data) ? logsRes.data.data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openRouteModal = (member) => {
    setSelectedMember(member);
    setRouteForm({
      assignedPhases: Array.isArray(member.assignedPhases) ? member.assignedPhases.join(', ') : '',
      assignedAreas: Array.isArray(member.assignedAreas) ? member.assignedAreas.join(', ') : '',
      patrolSchedule: member.patrolSchedule || '',
    });
    setRouteModalOpen(true);
  };

  const saveRoute = async () => {
    if (!selectedMember) return;
    setSavingRoute(true);
    try {
      await api.put(`/patrols/assign/${selectedMember._id}`, {
        securityLevel: 'personnel',
        assignedPhases: routeForm.assignedPhases
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5),
        assignedAreas: routeForm.assignedAreas
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        patrolSchedule: routeForm.patrolSchedule.trim(),
        headOfficerId: selectedMember.headOfficerId?._id || selectedMember.headOfficerId || null,
      });
      setRouteModalOpen(false);
      setSelectedMember(null);
      Alert.alert('Saved', 'Patrol route updated.');
      load();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update patrol route');
    } finally {
      setSavingRoute(false);
    }
  };

  const view = route?.name === 'PersonnelTab'
    ? 'team'
    : route?.name === 'AnalyticsTab'
      ? 'analytics'
      : 'performance';

  const title = {
    team: 'Personnel Management',
    performance: 'Team Performance',
    analytics: 'Patrol Analytics',
  }[view];

  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const issueLogs = logs.filter((log) => log.status === 'issue_found');
    const completedLogs = logs.filter((log) => ['completed', 'nothing_found'].includes(log.status));
    const todayLogs = logs.filter(
      (log) => new Date(log.loggedAt || log.createdAt).toDateString() === today
    );
    return {
      issueLogs,
      completedLogs,
      todayLogs,
      activeTeam: team.filter((member) => member.isActive),
      unassignedTeam: team.filter((member) => !member.headOfficerId),
      scheduledTeam: team.filter((member) => member.patrolSchedule),
      completionRate: logs.length ? Math.round((completedLogs.length / logs.length) * 100) : 0,
    };
  }, [logs, team]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    />
  );

  const renderPersonnel = ({ item }) => (
    <View style={[styles.card, shadows.small]}>
      <View style={styles.cardHeading}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{`${item.firstName?.[0] || ''}${item.lastName?.[0] || ''}` || 'SO'}</Text>
        </View>
        <View style={styles.cardHeadingText}>
          <Text style={styles.cardTitle}>{officerName(item)}</Text>
          <Text style={styles.cardMeta}>{item.email || 'No email'}</Text>
        </View>
        <View style={[styles.badge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={styles.badgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>Areas: {listText(item.assignedAreas, 'No assigned area')}</Text>
      <Text style={styles.cardMeta}>Phases: {listText(item.assignedPhases, 'No phases')}</Text>
      <Text style={styles.cardMeta}>Schedule: {item.patrolSchedule || 'No patrol schedule'}</Text>
      {!item.headOfficerId && <Text style={styles.warningText}>Unassigned personnel</Text>}
      <TouchableOpacity style={styles.routeButton} onPress={() => openRouteModal(item)}>
        <Ionicons name="map-outline" size={16} color="white" />
        <Text style={styles.routeButtonText}>Edit Route</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLog = ({ item }) => (
    <View style={[styles.card, shadows.small]}>
      <View style={styles.cardHeading}>
        <View style={styles.cardHeadingText}>
          <Text style={styles.cardTitle}>{item.area || 'Area'} · {item.checkpoint || 'Checkpoint'}</Text>
          <Text style={styles.cardMeta}>{officerName(item.officerId)}</Text>
        </View>
        <View style={[styles.badge, item.status === 'issue_found' ? styles.issueBadge : styles.activeBadge]}>
          <Text style={styles.badgeText}>{String(item.status || 'completed').replaceAll('_', ' ')}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>Phase: {item.phase || 'N/A'}</Text>
      <Text style={styles.cardMeta}>{when(item.loggedAt || item.createdAt)}</Text>
      {!!item.notes && <Text style={styles.notes}>{item.notes}</Text>}
    </View>
  );

  const SummaryCard = ({ value, label, icon, color = themeColors.primary }) => (
    <View style={styles.summaryCard}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );

  const header = (
    <>
      <View style={styles.summaryGrid}>
        {view === 'team' ? (
          <>
            <SummaryCard value={team.length} label="Personnel" icon="people-outline" />
            <SummaryCard value={metrics.activeTeam.length} label="Active" icon="radio-button-on" color={themeColors.success} />
            <SummaryCard value={metrics.unassignedTeam.length} label="Unassigned" icon="person-remove-outline" color={themeColors.warning} />
            <SummaryCard value={metrics.scheduledTeam.length} label="Scheduled" icon="calendar-outline" color={themeColors.info} />
          </>
        ) : view === 'performance' ? (
          <>
            <SummaryCard value={logs.length} label="Patrol Logs" icon="clipboard-outline" />
            <SummaryCard value={metrics.todayLogs.length} label="Today" icon="today-outline" color={themeColors.info} />
            <SummaryCard value={metrics.completedLogs.length} label="Completed/Clear" icon="checkmark-circle-outline" color={themeColors.success} />
            <SummaryCard value={metrics.issueLogs.length} label="Issues" icon="warning-outline" color={themeColors.error} />
          </>
        ) : (
          <>
            <SummaryCard value={`${metrics.completionRate}%`} label="Completion" icon="analytics-outline" color={themeColors.success} />
            <SummaryCard value={metrics.issueLogs.length} label="Issues Found" icon="alert-circle-outline" color={themeColors.error} />
            <SummaryCard value={metrics.scheduledTeam.length} label="Coverage" icon="map-outline" color={themeColors.info} />
            <SummaryCard value={team.length} label="Personnel" icon="people-outline" />
          </>
        )}
      </View>
      <Text style={styles.sectionTitle}>
        {view === 'team' ? 'Assigned personnel' : view === 'performance' ? 'Recent patrol activity' : 'Assignment coverage'}
      </Text>
      {view === 'analytics' && (
        <View style={[styles.coverageCard, shadows.small]}>
          {team.length === 0 ? (
            <Text style={styles.cardMeta}>No assignment data yet.</Text>
          ) : team.map((member) => (
            <View key={member._id} style={styles.coverageRow}>
              <Text style={styles.coverageName}>{officerName(member)}</Text>
              <Text style={styles.cardMeta}>{listText(member.assignedAreas, 'No area')} · {member.patrolSchedule || 'No schedule'}</Text>
            </View>
          ))}
        </View>
      )}
      {view === 'analytics' && <Text style={styles.sectionTitle}>Pending patrol reports</Text>}
    </>
  );

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={themeColors.primary} /></View>;
  }

  const data = view === 'team'
    ? team
    : view === 'analytics'
      ? metrics.issueLogs
      : logs.slice(0, 12);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={16} color="white" />
          <Text style={styles.headerButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>HEAD OFFICER</Text>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.headerButton}>
          <Ionicons name="refresh" size={16} color="white" />
          <Text style={styles.headerButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, index) => item._id || String(index)}
        renderItem={view === 'team' ? renderPersonnel : renderLog}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={view === 'analytics' ? 'shield-checkmark-outline' : 'file-tray-outline'} size={48} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>{view === 'analytics' ? 'No pending patrol reports' : 'No records found'}</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={refreshControl}
      />

      <Modal visible={routeModalOpen} transparent animationType="slide" onRequestClose={() => setRouteModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.routeSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Patrol Route</Text>
                <Text style={styles.modalSubtitle}>{selectedMember ? officerName(selectedMember) : 'Security personnel'}</Text>
              </View>
              <TouchableOpacity onPress={() => setRouteModalOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Phases</Text>
            <TextInput
              style={styles.input}
              value={routeForm.assignedPhases}
              onChangeText={(value) => setRouteForm((prev) => ({ ...prev, assignedPhases: value }))}
              placeholder="1, 2, 3"
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.helperText}>Comma-separated phase numbers from 1 to 5.</Text>
            <Text style={styles.inputLabel}>Assigned Areas</Text>
            <TextInput
              style={styles.input}
              value={routeForm.assignedAreas}
              onChangeText={(value) => setRouteForm((prev) => ({ ...prev, assignedAreas: value }))}
              placeholder="Gate 1, Clubhouse, Phase 2"
            />
            <Text style={styles.inputLabel}>Patrol Schedule</Text>
            <TextInput
              style={styles.input}
              value={routeForm.patrolSchedule}
              onChangeText={(value) => setRouteForm((prev) => ({ ...prev, patrolSchedule: value }))}
              placeholder="Mon-Fri 8:00 PM - 12:00 AM"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setRouteModalOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveRoute} disabled={savingRoute}>
                {savingRoute ? <ActivityIndicator color="white" /> : <><Ionicons name="save-outline" size={16} color="white" /><Text style={styles.saveText}>Save Route</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: roleLayouts.security.screen,
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { ...roleLayouts.security.header, gap: 10 },
  headerButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerButtonText: { color: 'white', fontSize: 11, fontWeight: '800' },
  titleBlock: { flex: 1, marginLeft: 8 },
  eyebrow: { color: themeColors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: 'white', fontSize: 23, fontWeight: '900', marginTop: 2 },
  list: { padding: 16, paddingBottom: 32 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  summaryCard: { width: '48%', backgroundColor: 'white', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: themeColors.border },
  summaryValue: { fontSize: 25, fontWeight: '900', color: themeColors.textPrimary, marginTop: 8 },
  summaryLabel: { fontSize: 12, color: themeColors.textSecondary, fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: themeColors.textPrimary, marginBottom: 12, marginTop: 4 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: themeColors.border },
  cardHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardHeadingText: { flex: 1, minWidth: 0 },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: themeColors.primary + '18', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: themeColors.primary, fontWeight: '900' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: themeColors.textPrimary },
  cardMeta: { color: themeColors.textSecondary, fontSize: 12, marginTop: 3 },
  badge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, marginLeft: 8 },
  activeBadge: { backgroundColor: themeColors.success + '20' },
  inactiveBadge: { backgroundColor: themeColors.textSecondary + '20' },
  issueBadge: { backgroundColor: themeColors.warning + '25' },
  badgeText: { color: themeColors.textPrimary, fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  warningText: { color: themeColors.warning, fontSize: 12, fontWeight: '800', marginTop: 8 },
  routeButton: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: themeColors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeButtonText: { color: 'white', fontSize: 12, fontWeight: '900' },
  notes: { color: themeColors.textPrimary, fontSize: 13, lineHeight: 19, marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: themeColors.border },
  coverageCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: themeColors.border },
  coverageRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  coverageName: { fontWeight: '900', color: themeColors.textPrimary },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: themeColors.textPrimary, fontWeight: '800', fontSize: 16, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  routeSheet: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: themeColors.textPrimary },
  modalSubtitle: { fontSize: 12, fontWeight: '700', color: themeColors.textSecondary, marginTop: 2 },
  closeButton: { padding: 6 },
  inputLabel: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '900', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: themeColors.border, backgroundColor: themeColors.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: themeColors.textPrimary },
  helperText: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 5 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalButton: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  cancelButton: { backgroundColor: themeColors.surfaceMuted, borderWidth: 1, borderColor: themeColors.border },
  saveButton: { backgroundColor: themeColors.primary },
  cancelText: { color: themeColors.textPrimary, fontWeight: '900' },
  saveText: { color: 'white', fontWeight: '900' },
});

export default HeadOfficerTeamScreen;
