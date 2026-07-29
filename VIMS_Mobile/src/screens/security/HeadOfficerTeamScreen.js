import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';

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

  const title = useMemo(() => {
    if (route?.name === 'PersonnelTab') return 'Personnel Management';
    if (route?.name === 'AnalyticsTab') return 'Patrol Analytics';
    return 'Team Performance';
  }, [route?.name]);

  const data = route?.name === 'PersonnelTab' ? team : logs;

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderItem = ({ item }) => {
    if (route?.name === 'PersonnelTab') {
      return (
        <View style={[styles.card, shadows.small]}>
          <Text style={styles.cardTitle}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.cardMeta}>{item.email}</Text>
          <Text style={styles.cardMeta}>Schedule: {item.patrolSchedule || 'Not set'}</Text>
          <Text style={styles.cardMeta}>Phases: {item.assignedPhases?.join(', ') || 'None'}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.card, shadows.small]}>
        <Text style={styles.cardTitle}>{item.area || 'Area'} - {item.checkpoint || 'Checkpoint'}</Text>
        <Text style={styles.cardMeta}>Officer: {item.officerId?.firstName || ''} {item.officerId?.lastName || ''}</Text>
        <Text style={styles.cardMeta}>Status: {item.status || 'completed'}</Text>
        <Text style={styles.cardMeta}>{new Date(item.loggedAt || item.createdAt).toLocaleString()}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity onPress={load} style={styles.headerButton}>
          <Ionicons name="refresh" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{team.length}</Text>
          <Text style={styles.statLabel}>Personnel</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{logs.length}</Text>
          <Text style={styles.statLabel}>Patrol Logs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{logs.filter((log) => log.status === 'issue_found').length}</Text>
          <Text style={styles.statLabel}>Issues</Text>
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No records found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.nav },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: themeColors.nav,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: { padding: 8 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: themeColors.nav },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statValue: { fontSize: 24, fontWeight: '900', color: themeColors.accent },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.62)', fontWeight: '700' },
  list: { padding: 16, paddingTop: 0 },
  card: { backgroundColor: '#f8fbf9', borderRadius: 20, padding: 18, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: themeColors.textPrimary, marginBottom: 6 },
  cardMeta: { color: themeColors.textSecondary, marginTop: 2 },
  emptyText: { textAlign: 'center', color: themeColors.textSecondary, marginTop: 40 },
});

export default HeadOfficerTeamScreen;
