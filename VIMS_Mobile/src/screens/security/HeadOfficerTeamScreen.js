import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';

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
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>HEAD OFFICER</Text>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.headerButton}>
          <Ionicons name="refresh" size={22} color="white" />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { backgroundColor: themeColors.primaryDeep, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerButton: { padding: 8 },
  titleBlock: { flex: 1, marginLeft: 8 },
  eyebrow: { color: themeColors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: 'white', fontSize: 23, fontWeight: '900', marginTop: 2 },
  list: { padding: 16, paddingBottom: 32 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  summaryCard: { width: '48%', backgroundColor: 'white', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: themeColors.border },
  summaryValue: { fontSize: 25, fontWeight: '900', color: themeColors.textPrimary, marginTop: 8 },
  summaryLabel: { fontSize: 12, color: themeColors.textSecondary, fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: themeColors.textPrimary, marginBottom: 12, marginTop: 4 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: themeColors.border },
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
  notes: { color: themeColors.textPrimary, fontSize: 13, lineHeight: 19, marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: themeColors.border },
  coverageCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 18 },
  coverageRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  coverageName: { fontWeight: '900', color: themeColors.textPrimary },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: themeColors.textPrimary, fontWeight: '800', fontSize: 16, marginTop: 12 },
});

export default HeadOfficerTeamScreen;
