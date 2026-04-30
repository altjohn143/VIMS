import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';
import LogoutButton from '../../components/LogoutButton';

const AdminVisitorReportsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (statusFilter !== 'all') params.status = statusFilter;

      const [statsRes, recentRes] = await Promise.all([
        api.get('/visitors/admin/stats', { params }),
        api.get('/visitors/admin/recent', { params })
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
      if (recentRes.data?.success) {
        setRecentVisitors(recentRes.data.data || []);
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate, statusFilter]);

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

  const StatCard = ({ label, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Ionicons name={icon} size={32} color={color + '40'} />
    </View>
  );

  const VisitorItem = ({ item }) => {
    const statusColor =
      item.status === 'approved'
        ? themeColors.success
        : item.status === 'pending'
        ? themeColors.warning
        : item.status === 'rejected'
        ? themeColors.error
        : themeColors.info;

    return (
      <View style={[styles.visitorCard, shadows.small]}>
        <View style={styles.visitorHeader}>
          <Text style={styles.visitorName}>{item.visitorName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.visitorMeta}>
          Resident: {item.residentId?.firstName} {item.residentId?.lastName}
        </Text>
        <Text style={styles.visitorMeta}>Purpose: {item.purpose}</Text>
        <Text style={styles.visitorMeta}>Arrival: {formatWhen(item.expectedArrival)}</Text>
        {item.approvedBy && (
          <Text style={styles.visitorMeta}>
            Approved by: {item.approvedBy.firstName} ({item.approvedBy.role})
          </Text>
        )}
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
          <Text style={styles.headerTitle}>Visitor Reports</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Analytics & Statistics
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={load} style={styles.headerIconButton}>
            <Ionicons name="refresh" size={22} color="white" />
          </TouchableOpacity>
          <LogoutButton navigation={navigation} color="white" size={24} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Statistics */}
        {stats && stats.totals && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Statistics</Text>
            <StatCard
              label="Total Visitors"
              value={stats.totals.totalVisitors || 0}
              icon="people"
              color={themeColors.primary}
            />
            <StatCard
              label="Approved"
              value={stats.totals.approvedVisitors || 0}
              icon="checkmark-circle"
              color={themeColors.success}
            />
            <StatCard
              label="Pending"
              value={stats.totals.pendingVisitors || 0}
              icon="hourglass"
              color={themeColors.warning}
            />
            <StatCard
              label="Rejected"
              value={stats.totals.rejectedVisitors || 0}
              icon="close-circle"
              color={themeColors.error}
            />
            <StatCard
              label="Active Now"
              value={stats.totals.activeVisitors || 0}
              icon="person-circle"
              color={themeColors.info}
            />
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                statusFilter === 'all' && styles.filterChipActive
              ]}
              onPress={() => setStatusFilter('all')}
            >
              <Text style={[styles.filterText, statusFilter === 'all' && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                statusFilter === 'approved' && styles.filterChipActive
              ]}
              onPress={() => setStatusFilter('approved')}
            >
              <Text style={[styles.filterText, statusFilter === 'approved' && styles.filterTextActive]}>Approved</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                statusFilter === 'pending' && styles.filterChipActive
              ]}
              onPress={() => setStatusFilter('pending')}
            >
              <Text style={[styles.filterText, statusFilter === 'pending' && styles.filterTextActive]}>Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                statusFilter === 'rejected' && styles.filterChipActive
              ]}
              onPress={() => setStatusFilter('rejected')}
            >
              <Text style={[styles.filterText, statusFilter === 'rejected' && styles.filterTextActive]}>Rejected</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Visitors */}
        <View style={styles.visitorsSection}>
          <Text style={styles.sectionTitle}>Recent Visitors ({recentVisitors.length})</Text>
          {recentVisitors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={themeColors.textSecondary} />
              <Text style={styles.emptyTitle}>No visitors found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={recentVisitors}
              renderItem={({ item }) => <VisitorItem item={item} />}
              keyExtractor={(item) => item._id}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
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

  content: { flex: 1, padding: 16 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: themeColors.textPrimary,
    marginBottom: 12,
  },

  statsSection: { marginBottom: 24 },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.small,
  },
  statLabel: { fontSize: 11, color: themeColors.textSecondary, fontWeight: '700' },
  statValue: { fontSize: 24, fontWeight: '900', marginTop: 4 },

  filtersSection: { marginBottom: 24 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: '#f8fafc',
  },
  filterChipActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: themeColors.textSecondary },
  filterTextActive: { color: 'white' },

  visitorsSection: { marginBottom: 20 },
  visitorCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  visitorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  visitorName: { fontSize: 15, fontWeight: '900', color: themeColors.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '900' },
  visitorMeta: { fontSize: 12, color: themeColors.textSecondary, marginTop: 6, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: themeColors.textPrimary, marginTop: 12 },
  emptyText: { fontSize: 12, color: themeColors.textSecondary, marginTop: 4 },
});

export default AdminVisitorReportsScreen;
