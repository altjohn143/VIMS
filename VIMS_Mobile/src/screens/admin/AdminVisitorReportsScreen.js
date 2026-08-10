import React, { useCallback, useEffect, useState } from 'react';
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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows, roleLayouts } from '../../utils/theme';
import AdminUtilityHeader from '../../components/AdminUtilityHeader';

const AdminVisitorReportsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [datePickerField, setDatePickerField] = useState(null);

  const load = useCallback(async () => {
    const validDate = (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!validDate(startDate) || !validDate(endDate)) {
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setStats(null);
      setRecentVisitors([]);
      setLoading(false);
      setRefreshing(false);
      Alert.alert('Invalid Date Range', 'The start date must be before or equal to the end date.');
      return;
    }
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

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
  };

  const selectDate = (field, selectedDate) => {
    if (Platform.OS === 'android') setDatePickerField(null);
    if (!selectedDate) return;
    const value = format(selectedDate, 'yyyy-MM-dd');
    if (field === 'start') {
      if (endDate && value > endDate) {
        Alert.alert('Invalid Date Range', 'The start date must be before or equal to the end date.');
        return;
      }
      setStartDate(value);
    } else {
      if (startDate && value < startDate) {
        Alert.alert('Invalid Date Range', 'The end date must be after or equal to the start date.');
        return;
      }
      setEndDate(value);
    }
  };

  const openDatePicker = (field) => setDatePickerField(field);

  const formatWhen = (d) => {
    if (!d) return 'N/A';
    try {
      return format(new Date(d), 'MMM dd, yyyy • hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  const StatCard = ({ label, value, icon, color }) => (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
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
      <AdminUtilityHeader navigation={navigation} eyebrow="ADMIN ANALYTICS" title="Visitor Reports" subtitle={`${recentVisitors.length} recent visitor records`} actions={[{ label: 'Back', icon: 'arrow-back', onPress: () => navigation.goBack() }, { label: 'Refresh', icon: 'refresh', onPress: load, primary: true, loading: refreshing }]} />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Statistics */}
        {stats && stats.totals && (
          <View style={styles.statsSection}>
            <View style={styles.statsGrid}>
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
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('start')}>
              <Ionicons name="calendar-outline" size={16} color={themeColors.primaryDeep} />
              <Text style={[styles.dateInputText, !startDate && styles.datePlaceholder]}>
                {startDate || 'Start date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('end')}>
              <Ionicons name="calendar-outline" size={16} color={themeColors.primaryDeep} />
              <Text style={[styles.dateInputText, !endDate && styles.datePlaceholder]}>
                {endDate || 'End date'}
              </Text>
            </TouchableOpacity>
          </View>
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
          <View style={styles.reportFilterActions}>
            <TouchableOpacity style={styles.applyButton} onPress={load}>
              <Ionicons name="filter-outline" size={16} color="#fff" />
              <Text style={styles.applyButtonText}>Apply filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Ionicons name="close-circle-outline" size={16} color={themeColors.primaryDeep} />
              <Text style={styles.clearButtonText}>Clear filters</Text>
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
{datePickerField ? (
        <View style={Platform.OS === 'ios' ? styles.inlineExportPicker : undefined}>
          {Platform.OS === 'ios' && (
            <View style={styles.inlineExportPickerHeader}>
              <Text style={styles.inlineExportPickerTitle}>
                {datePickerField === 'start' ? 'Select start date' : 'Select end date'}
              </Text>
              <TouchableOpacity style={styles.inlineExportPickerDone} onPress={() => setDatePickerField(null)}>
                <Text style={styles.inlineExportPickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
          <DateTimePicker
            value={new Date((datePickerField === 'start' ? startDate : endDate) || Date.now())}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event, selectedDate) => {
              if (event?.type === 'dismissed') {
                setDatePickerField(null);
                return;
              }
              selectDate(datePickerField, selectedDate);
            }}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: roleLayouts.admin.screen,
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { ...roleLayouts.admin.header, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24, justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: { color: 'white', fontSize: 23, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerIconButtonText: { color: 'white', fontSize: 11, fontWeight: '800' },

  content: { flex: 1, padding: 16 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: themeColors.textPrimary,
    marginBottom: 12,
  },

  statsSection: { marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    width: '31%',
    minWidth: 92,
    minHeight: 68,
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { fontSize: 9, color: themeColors.textSecondary, fontWeight: '800', marginTop: 2 },
  statValue: { fontSize: 18, lineHeight: 21, fontWeight: '900', marginTop: 2 },

  filtersSection: { marginBottom: 24 },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dateInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInputText: { color: themeColors.textPrimary, fontWeight: '800' },
  datePlaceholder: { color: themeColors.textSecondary, fontWeight: '700' },
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
  reportFilterActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 },
  applyButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: themeColors.primary },
  applyButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  clearButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: themeColors.primarySoft },
  clearButtonText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '800' },

  visitorsSection: { marginBottom: 20 },
  visitorCard: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: themeColors.primary,
  },
  visitorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  visitorName: { fontSize: 15, fontWeight: '900', color: themeColors.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '900' },
  visitorMeta: { fontSize: 12, color: themeColors.textSecondary, marginTop: 6, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: themeColors.textPrimary, marginTop: 12 },
  emptyText: { fontSize: 12, color: themeColors.textSecondary, marginTop: 4 },
  inlineExportPicker: { marginBottom: 10, borderWidth: 1, borderColor: themeColors.border, borderRadius: 14, overflow: 'hidden', backgroundColor: themeColors.cardBackground },
  inlineExportPickerHeader: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: themeColors.border },
  inlineExportPickerTitle: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '800' },
  inlineExportPickerDone: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: themeColors.primarySoft },
  inlineExportPickerDoneText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
});

export default AdminVisitorReportsScreen;
