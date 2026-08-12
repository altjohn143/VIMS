import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows, roleLayouts } from '../../utils/theme';
import api from '../../utils/api';
import { format } from 'date-fns';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import SecurityUtilityHeader from '../../components/SecurityUtilityHeader';
import { getAuthToken } from '../../utils/secureSession';

const SecurityVisitorLogsScreen = ({ navigation }) => {
  const [visitors, setVisitors] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    visitorName: '',
    visitorPhone: '',
    vehicleNumber: '',
    purpose: '',
  });
  const [manualEntryErrors, setManualEntryErrors] = useState({});
  const [securityNotes, setSecurityNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(0);
  const [showAllRecentActivity, setShowAllRecentActivity] = useState(false);
  const rowsPerPage = 10;
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    approved: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchVisitors();
  }, []);

  useEffect(() => {
    filterVisitors();
  }, [visitors, searchQuery, statusFilter, dateFilter]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter, dateFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredVisitors.length / rowsPerPage));
  const paginatedVisitors = useMemo(
    () => filteredVisitors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredVisitors, page]
  );

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/visitors');
      if (response.data.success) {
        const data = response.data.data;
        setVisitors(data);
        
        // Calculate stats
        const now = new Date();
        setStats({
          total: data.length,
          active: data.filter(v => v.status === 'active').length,
          pending: data.filter(v => v.status === 'pending').length,
          approved: data.filter(v => v.status === 'approved').length,
          completed: data.filter(v => v.status === 'completed').length,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch visitors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVisitors();
  };

  const updateManualEntry = (field, value) => {
    setManualEntry((previous) => ({ ...previous, [field]: value }));
    setManualEntryErrors((previous) => ({ ...previous, [field]: '' }));
  };

  const submitManualEntry = () => {
    const nextErrors = {};
    if (!manualEntry.visitorName.trim()) nextErrors.visitorName = 'Visitor name is required';
    if (!manualEntry.visitorPhone.trim()) nextErrors.visitorPhone = 'Visitor phone is required';
    if (!manualEntry.vehicleNumber.trim()) nextErrors.vehicleNumber = 'Vehicle plate number is required';
    if (!manualEntry.purpose.trim()) nextErrors.purpose = 'Purpose of visit is required';

    if (Object.keys(nextErrors).length > 0) {
      setManualEntryErrors(nextErrors);
      return;
    }

    Alert.alert('Use Approved Record', 'Use an approved visitor record to log entry or exit.');
  };

  const filterVisitors = () => {
    let filtered = [...visitors];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.visitorName?.toLowerCase().includes(query) ||
        v.visitorPhone?.includes(query) ||
        v.residentId?.firstName?.toLowerCase().includes(query) ||
        v.residentId?.lastName?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(v => 
        format(new Date(v.createdAt), 'yyyy-MM-dd') === dateFilter
      );
    }

    setFilteredVisitors(filtered);
  };

  const handleEntry = async () => {
    if (!selectedVisitor) return;

    setProcessing(true);
    try {
      const response = await api.put(`/visitors/${selectedVisitor._id}/entry`, {
        securityNotes,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Entry logged successfully');
        setShowEntryModal(false);
        setSecurityNotes('');
        fetchVisitors();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to log entry');
    } finally {
      setProcessing(false);
    }
  };

  const handleExit = async () => {
    if (!selectedVisitor) return;

    setProcessing(true);
    try {
      const response = await api.put(`/visitors/${selectedVisitor._id}/exit`, {
        securityNotes,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Exit logged successfully');
        setShowExitModal(false);
        setSecurityNotes('');
        fetchVisitors();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to log exit');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportFile = async (fileFormat = 'pdf') => {
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams({
        format: fileFormat,
        timezoneOffset: String(new Date().getTimezoneOffset())
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const baseUrl = String(api.defaults.baseURL || '').replace(/\/$/, '');
      const fileUri = `${FileSystem.documentDirectory}VIMS_Visitor_Logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.${fileFormat}`;
      const download = await FileSystem.downloadAsync(
        `${baseUrl}/visitors?${params.toString()}`,
        fileUri,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (download.status < 200 || download.status >= 300) {
        throw new Error(`Export server returned status ${download.status}`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(download.uri, {
          mimeType: fileFormat === 'pdf' ? 'application/pdf' : 'text/csv',
          dialogTitle: `Share Visitor Logs ${fileFormat.toUpperCase()}`
        });
      } else {
        Alert.alert('Export ready', `Saved to ${download.uri}`);
      }
    } catch (error) {
      Alert.alert('Export Failed', error.message || `Failed to export ${fileFormat.toUpperCase()}`);
    }
  };

  const handleDatePicked = (event, value) => {
    if (Platform.OS === 'android') setDatePickerOpen(false);
    if (event?.type === 'dismissed') return;
    if (value) setDateFilter(format(value, 'yyyy-MM-dd'));
  };

  const handleExport = () => {
    Alert.alert('Export Visitor Logs', 'Choose an export format.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'CSV', onPress: () => handleExportFile('csv') },
      { text: 'PDF', onPress: () => handleExportFile('pdf') },
    ]);
  };


  const getStatusChip = (status, visitor = null) => {
    const displayStatus = String(visitor?.qrStatus || status || 'pending').toLowerCase();
    const config = {
      pending: { label: 'Pending', color: themeColors.warning, icon: 'time', bg: themeColors.warning + '20' },
      approved: { label: 'Approved', color: themeColors.success, icon: 'checkmark-circle', bg: themeColors.success + '20' },
      entered: { label: 'Entered', color: themeColors.info, icon: 'log-in', bg: themeColors.info + '20' },
      arrived: { label: 'Arrived', color: themeColors.success, icon: 'home', bg: themeColors.success + '20' },
      departed: { label: 'Departed', color: themeColors.warning, icon: 'arrow-forward-circle', bg: themeColors.warning + '20' },
      active: { label: 'Active', color: themeColors.info, icon: 'radio-button-on', bg: themeColors.info + '20' },
      exited: { label: 'Exited', color: themeColors.textSecondary, icon: 'checkmark-done', bg: themeColors.textSecondary + '20' },
      completed: { label: 'Exited', color: themeColors.textSecondary, icon: 'checkmark-done', bg: themeColors.textSecondary + '20' },
      rejected: { label: 'Rejected', color: themeColors.error, icon: 'close-circle', bg: themeColors.error + '20' },
    };
    return config[displayStatus] || config.pending;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid Date';
    }
  };

  const handleSharePass = async (visitor) => {
    if (['rejected', 'cancelled'].includes(visitor?.status)) {
      Alert.alert('Pass Unavailable', 'Rejected or cancelled visitor passes cannot be shared.');
      return;
    }

    try {
      const pass = [
        'CASIMIRO WESTVILLE HOMES',
        'SECURITY VISITOR PASS',
        '',
        `Visitor: ${visitor.visitorName || 'N/A'}`,
        `Phone: ${visitor.visitorPhone || 'N/A'}`,
        `Resident: ${visitor.residentId?.firstName || ''} ${visitor.residentId?.lastName || ''}`,
        `House: ${visitor.residentId?.houseNumber || 'N/A'}`,
        `Purpose: ${visitor.purpose || 'N/A'}`,
        `Expected arrival: ${formatDate(visitor.expectedArrival)}`,
        `Expected departure: ${formatDate(visitor.expectedDeparture)}`,
        `Status: ${visitor.status || 'pending'}`,
        `Pass ID: ${visitor._id}`,
      ].join('\n');
      const fileUri = `${FileSystem.documentDirectory}visitor_pass_${visitor._id}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, pass, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Print or share visitor pass' });
      } else {
        Alert.alert('Visitor Pass', pass);
      }
    } catch {
      Alert.alert('Error', 'Failed to prepare visitor pass');
    }
  };

  const formatActivityDate = (dateString) => {
    if (!dateString) return 'No timestamp';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid timestamp';
    }
  };

  const recentActivities = useMemo(() => {
    const now = new Date();
    const activities = [];

    visitors.forEach((visitor) => {
      const name = visitor.visitorName || 'Visitor';
      const residentName = `${visitor.residentId?.firstName || ''} ${visitor.residentId?.lastName || ''}`.trim();

      if (visitor.actualEntry) {
        activities.push({
          message: `${name} entered`,
          occurredAt: visitor.actualEntry,
          source: 'Gate Scanner',
          type: 'Entry',
          icon: 'log-in'
        });
      }

      if (visitor.actualExit) {
        activities.push({
          message: `${name} exited`,
          occurredAt: visitor.actualExit,
          source: 'Gate Scanner',
          type: 'Exit',
          icon: 'log-out'
        });
      }

      if (visitor.residentEntryConfirmedAt) {
        activities.push({
          message: `${residentName || 'Resident'} confirmed ${name}'s arrival`,
          occurredAt: visitor.residentEntryConfirmedAt,
          source: 'Resident',
          type: 'Confirmed',
          icon: 'checkmark-circle'
        });
      }

      if (visitor.residentDepartureConfirmedAt) {
        activities.push({
          message: `${residentName || 'Resident'} confirmed ${name}'s departure`,
          occurredAt: visitor.residentDepartureConfirmedAt,
          source: 'Resident',
          type: 'Confirmed',
          icon: 'checkmark-circle'
        });
      }

      if (visitor.approvedAt) {
        activities.push({
          message: `${name} approved for visit`,
          occurredAt: visitor.approvedAt,
          source: visitor.approvedBy ? `${visitor.approvedBy.firstName || ''} ${visitor.approvedBy.lastName || ''}`.trim() || 'Security Officer' : 'Security Officer',
          type: 'Approval',
          icon: 'shield-checkmark'
        });
      }

      if (visitor.expectedDeparture && !visitor.actualExit && new Date(visitor.expectedDeparture) < now) {
        activities.push({
          message: `QR code expired for ${name}`,
          occurredAt: visitor.expectedDeparture,
          source: 'System',
          type: 'Expired',
          icon: 'alert-circle'
        });
      }

      if (visitor.createdAt) {
        activities.push({
          message: `${name} visitor request created`,
          occurredAt: visitor.createdAt,
          source: residentName || 'Resident',
          type: 'Request',
          icon: 'person-add'
        });
      }
    });

    return activities
      .filter((activity) => activity.occurredAt && !Number.isNaN(new Date(activity.occurredAt).getTime()))
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  }, [visitors]);

  const visibleRecentActivities = useMemo(
    () => (showAllRecentActivity ? recentActivities.slice(0, 12) : recentActivities.slice(0, 3)),
    [recentActivities, showAllRecentActivity]
  );

  const renderListHeader = () => (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.info }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.warning }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.success }]}>{stats.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.textSecondary }]}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search visitors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            blurOnSubmit={false}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'all' && styles.activeFilter]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterText, statusFilter === 'all' && styles.activeFilterText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'active' && styles.activeFilter]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.filterText, statusFilter === 'active' && styles.activeFilterText]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'approved' && styles.activeFilter]}
            onPress={() => setStatusFilter('approved')}
          >
            <Text style={[styles.filterText, statusFilter === 'approved' && styles.activeFilterText]}>Approved</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'pending' && styles.activeFilter]}
            onPress={() => setStatusFilter('pending')}
          >
            <Text style={[styles.filterText, statusFilter === 'pending' && styles.activeFilterText]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'completed' && styles.activeFilter]}
            onPress={() => setStatusFilter('completed')}
          >
            <Text style={[styles.filterText, statusFilter === 'completed' && styles.activeFilterText]}>Completed</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.dateFilterRow}>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setDatePickerOpen(true)}>
            <Ionicons name="calendar-outline" size={18} color={themeColors.primary} />
            <Text style={styles.datePickerText}>{dateFilter || 'Select calendar date'}</Text>
          </TouchableOpacity>
          {!!dateFilter && (
            <TouchableOpacity style={styles.clearDateButton} onPress={() => setDateFilter('')}>
              <Ionicons name="close" size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
{datePickerOpen ? (
          <View style={Platform.OS === 'ios' ? styles.inlineDatePickerWrapper : undefined}>
            {Platform.OS === 'ios' && (
              <View style={styles.inlineDatePickerHeader}>
                <Text style={styles.inlineDatePickerTitle}>Select date</Text>
                <TouchableOpacity style={styles.inlineDatePickerDone} onPress={() => setDatePickerOpen(false)}>
                  <Text style={styles.inlineDatePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
            <DateTimePicker
              value={dateFilter ? new Date(`${dateFilter}T12:00:00`) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleDatePicked}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.activityCard, shadows.small]}>
        <View style={styles.activityHeader}>
          <Ionicons name="time-outline" size={20} color={themeColors.primary} />
          <Text style={styles.activityTitle}>Recent Activity</Text>
        </View>
        {visibleRecentActivities.length > 0 ? (
          visibleRecentActivities.map((activity, index) => (
            <View key={`${activity.type}-${activity.occurredAt}-${index}`} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name={activity.icon} size={16} color="white" />
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityMessage}>{activity.message}</Text>
                <Text style={styles.activityMeta}>{formatActivityDate(activity.occurredAt)} | {activity.source}</Text>
              </View>
              <View style={styles.activityBadge}>
                <Text style={styles.activityBadgeText}>{activity.type}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.activityEmpty}>No recent visitor activity</Text>
        )}
        {recentActivities.length > 3 && (
          <TouchableOpacity
            style={styles.activityToggle}
            onPress={() => setShowAllRecentActivity((value) => !value)}
          >
            <Text style={styles.activityToggleText}>
              {showAllRecentActivity ? 'See less' : `See more (${Math.min(recentActivities.length, 12) - 3})`}
            </Text>
            <Ionicons
              name={showAllRecentActivity ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={themeColors.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.recordsHeader}>
        <Text style={styles.recordsTitle}>Visitor Records</Text>
        <Text style={styles.recordsCount}>{filteredVisitors.length} log{filteredVisitors.length === 1 ? '' : 's'}</Text>
      </View>
    </>
  );

  const renderVisitorCard = ({ item }) => {
    const status = getStatusChip(item.status, item);
    const canLogEntry = item.status === 'approved' && !item.actualEntry;
    const canLogExit = item.status === 'active' && !item.actualExit;

    return (
      <TouchableOpacity
        style={[styles.visitorCard, shadows.small]}
        onPress={() => {
          setSelectedVisitor(item);
          setShowDetailsModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.visitorName}>{item.visitorName}</Text>
            <Text style={styles.visitorPhone}>{item.visitorPhone}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.residentInfo}>
          <Ionicons name="home" size={14} color={themeColors.textSecondary} />
          <Text style={styles.residentText}>
            {item.residentId?.firstName} {item.residentId?.lastName} • House {item.residentId?.houseNumber}
          </Text>
        </View>

        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <Ionicons name="calendar" size={14} color={themeColors.textSecondary} />
            <Text style={styles.timelineText}>Expected: {formatDate(item.expectedArrival)}</Text>
          </View>
          {item.actualEntry && (
            <View style={styles.timelineItem}>
              <Ionicons name="log-in" size={14} color={themeColors.success} />
              <Text style={[styles.timelineText, { color: themeColors.success }]}>
                Entry: {formatDate(item.actualEntry)}
              </Text>
            </View>
          )}
          {item.actualExit && (
            <View style={styles.timelineItem}>
              <Ionicons name="log-out" size={14} color={themeColors.info} />
              <Text style={[styles.timelineText, { color: themeColors.info }]}>
                Exit: {formatDate(item.actualExit)}
              </Text>
            </View>
          )}
        </View>

        {(canLogEntry || canLogExit) && (
          <View style={styles.actionButtons}>
            {canLogEntry && (
              <TouchableOpacity
                style={[styles.actionButton, styles.entryButton]}
                onPress={() => {
                  setSelectedVisitor(item);
                  setShowEntryModal(true);
                }}
              >
                <Ionicons name="log-in" size={18} color="white" />
                <Text style={styles.actionButtonText}>Log Entry</Text>
              </TouchableOpacity>
            )}
            {canLogExit && (
              <TouchableOpacity
                style={[styles.actionButton, styles.exitButton]}
                onPress={() => {
                  setSelectedVisitor(item);
                  setShowExitModal(true);
                }}
              >
                <Ionicons name="log-out" size={18} color="white" />
                <Text style={styles.actionButtonText}>Log Exit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SecurityUtilityHeader
        navigation={navigation}
        title="Visitor Logs"
        subtitle="Track visits, scanner activity, and gate records."
        actions={[
          { label: 'Entry Scan', icon: 'log-in-outline', onPress: () => navigation.navigate('ScannerTab', { mode: 'entry' }), primary: true },
          { label: 'Exit Scan', icon: 'log-out-outline', onPress: () => navigation.navigate('ScannerTab', { mode: 'exit' }) },
          { label: 'Export', icon: 'download', onPress: handleExport },
          { label: 'Manual', icon: 'car-outline', onPress: () => { setManualEntryOpen(true); setManualEntryErrors({}); } },
        ]}
      />

      <FlatList
        data={paginatedVisitors}
        renderItem={renderVisitorCard}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderListHeader()}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No visitors found</Text>
            <Text style={styles.emptyText}>Try adjusting your filters</Text>
          </View>
        }
        ListFooterComponent={filteredVisitors.length > rowsPerPage ? (
          <View style={styles.paginationRow}>
            <TouchableOpacity style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]} disabled={page === 0} onPress={() => setPage((value) => Math.max(0, value - 1))}>
              <Text style={styles.pageButtonText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfo}>Page {page + 1} of {pageCount}</Text>
            <TouchableOpacity style={[styles.pageButton, page >= pageCount - 1 && styles.pageButtonDisabled]} disabled={page >= pageCount - 1} onPress={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>
              <Text style={styles.pageButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      />

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Visitor Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedVisitor && (
              <ScrollView>
                <Text style={styles.detailName}>{selectedVisitor.visitorName}</Text>
                <Text style={styles.detailPhone}>{selectedVisitor.visitorPhone}</Text>

                <View style={[styles.statusBadge, { backgroundColor: getStatusChip(selectedVisitor.status, selectedVisitor).bg, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.statusText, { color: getStatusChip(selectedVisitor.status, selectedVisitor).color }]}>
                    {getStatusChip(selectedVisitor.status, selectedVisitor).label.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Resident</Text>
                  <Text style={styles.detailText}>
                    {selectedVisitor.residentId?.firstName} {selectedVisitor.residentId?.lastName}
                  </Text>
                  <Text style={styles.detailSubtext}>House {selectedVisitor.residentId?.houseNumber}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Purpose</Text>
                  <Text style={styles.detailText}>{selectedVisitor.purpose}</Text>
                </View>

                {selectedVisitor.vehicleNumber && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Vehicle</Text>
                    <Text style={styles.detailText}>{selectedVisitor.vehicleNumber}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Schedule</Text>
                  <View style={styles.scheduleItem}>
                    <Ionicons name="calendar" size={16} color={themeColors.textSecondary} />
                    <Text style={styles.scheduleText}>
                      Arrival: {formatDate(selectedVisitor.expectedArrival)}
                    </Text>
                  </View>
                  <View style={styles.scheduleItem}>
                    <Ionicons name="calendar" size={16} color={themeColors.textSecondary} />
                    <Text style={styles.scheduleText}>
                      Departure: {formatDate(selectedVisitor.expectedDeparture)}
                    </Text>
                  </View>
                  {selectedVisitor.actualEntry && (
                    <View style={styles.scheduleItem}>
                      <Ionicons name="log-in" size={16} color={themeColors.success} />
                      <Text style={styles.scheduleText}>
                        Entry: {formatDate(selectedVisitor.actualEntry)}
                      </Text>
                    </View>
                  )}
                  {selectedVisitor.actualExit && (
                    <View style={styles.scheduleItem}>
                      <Ionicons name="log-out" size={16} color={themeColors.info} />
                      <Text style={styles.scheduleText}>
                        Exit: {formatDate(selectedVisitor.actualExit)}
                      </Text>
                    </View>
                  )}
                </View>

                {selectedVisitor.securityNotes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Security Notes</Text>
                    <Text style={styles.detailText}>{selectedVisitor.securityNotes}</Text>
                  </View>
                )}
                {!['rejected', 'cancelled'].includes(selectedVisitor.status) && (
                  <TouchableOpacity style={styles.sharePassButton} onPress={() => handleSharePass(selectedVisitor)}>
                    <Ionicons name="print-outline" size={19} color="white" />
                    <Text style={styles.sharePassText}>Print or Share Pass</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={manualEntryOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setManualEntryOpen(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Visitor / Vehicle Entry</Text>
              <TouchableOpacity onPress={() => setManualEntryOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.manualHelpText}>
              Validate required visitor and vehicle entry details before logging an approved visitor record.
            </Text>
            <TextInput
              style={[styles.modalInput, manualEntryErrors.visitorName && styles.inputError]}
              placeholder="Visitor Name"
              value={manualEntry.visitorName}
              onChangeText={(value) => updateManualEntry('visitorName', value)}
            />
            {!!manualEntryErrors.visitorName && <Text style={styles.errorText}>{manualEntryErrors.visitorName}</Text>}
            <TextInput
              style={[styles.modalInput, manualEntryErrors.visitorPhone && styles.inputError]}
              placeholder="Visitor Phone"
              value={manualEntry.visitorPhone}
              onChangeText={(value) => updateManualEntry('visitorPhone', value)}
              keyboardType="phone-pad"
            />
            {!!manualEntryErrors.visitorPhone && <Text style={styles.errorText}>{manualEntryErrors.visitorPhone}</Text>}
            <TextInput
              style={[styles.modalInput, manualEntryErrors.vehicleNumber && styles.inputError]}
              placeholder="Vehicle Plate Number"
              value={manualEntry.vehicleNumber}
              onChangeText={(value) => updateManualEntry('vehicleNumber', value.toUpperCase())}
              autoCapitalize="characters"
            />
            {!!manualEntryErrors.vehicleNumber && <Text style={styles.errorText}>{manualEntryErrors.vehicleNumber}</Text>}
            <TextInput
              style={[styles.modalInput, styles.textAreaInput, manualEntryErrors.purpose && styles.inputError]}
              placeholder="Purpose of Visit"
              value={manualEntry.purpose}
              onChangeText={(value) => updateManualEntry('purpose', value)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {!!manualEntryErrors.purpose && <Text style={styles.errorText}>{manualEntryErrors.purpose}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setManualEntryOpen(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.entryButton]} onPress={submitManualEntry}>
                <Ionicons name="car-outline" size={16} color="white" />
                <Text style={styles.modalButtonText}>Validate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Entry Modal */}
      <Modal
        visible={showEntryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEntryModal(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Visitor Entry</Text>
              <TouchableOpacity onPress={() => setShowEntryModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedVisitor && (
              <View>
                <View style={styles.modalVisitorInfo}>
                  <Text style={styles.modalVisitorName}>{selectedVisitor.visitorName}</Text>
                  <Text style={styles.modalVisitorDetails}>
                    Visiting: {selectedVisitor.residentId?.firstName} {selectedVisitor.residentId?.lastName}
                  </Text>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Security Notes (Optional)"
                  value={securityNotes}
                  onChangeText={setSecurityNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowEntryModal(false)}
                    disabled={processing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.entryButton]}
                    onPress={handleEntry}
                    disabled={processing}
                  >
                    {processing ? <ActivityIndicator color="white" /> : <Text style={styles.modalButtonText}>Log Entry</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Exit Modal */}
      <Modal
        visible={showExitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExitModal(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Visitor Exit</Text>
              <TouchableOpacity onPress={() => setShowExitModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedVisitor && (
              <View>
                <View style={styles.modalVisitorInfo}>
                  <Text style={styles.modalVisitorName}>{selectedVisitor.visitorName}</Text>
                  <Text style={styles.modalVisitorDetails}>
                    Visiting: {selectedVisitor.residentId?.firstName} {selectedVisitor.residentId?.lastName}
                  </Text>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Security Notes (Optional)"
                  value={securityNotes}
                  onChangeText={setSecurityNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowExitModal(false)}
                    disabled={processing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.exitButton]}
                    onPress={handleExit}
                    disabled={processing}
                  >
                    {processing ? <ActivityIndicator color="white" /> : <Text style={styles.modalButtonText}>Log Exit</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: roleLayouts.security.screen,
  header: { ...roleLayouts.security.header, flexDirection: 'column', alignItems: 'stretch', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 18, gap: 12 },
  headerTextWrap: { width: '100%' },
  headerEyebrow: { color: themeColors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  headerTitle: { color: 'white', fontSize: 26, lineHeight: 32, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '700', marginTop: 3, lineHeight: 17 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  headerActionButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 38, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerButtonText: { color: 'white', fontSize: 11, fontWeight: '800' },
  statsScroll: {
    backgroundColor: themeColors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  statCard: {
    alignItems: 'flex-start',
    marginRight: 10,
    minWidth: 108,
    padding: 12,
    borderRadius: 14,
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: themeColors.textSecondary,
    fontWeight: '800',
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: themeColors.textPrimary,
    marginLeft: 8,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  activeFilter: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  filterText: {
    fontSize: 12,
    color: themeColors.textPrimary,
  },
  activeFilterText: {
    color: 'white',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerText: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  clearDateButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
doneDateButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  doneDateText: {
    color: themeColors.primary,
    fontWeight: '900',
  },
  inlineDatePickerWrapper: { marginBottom: 10, borderWidth: 1, borderColor: themeColors.border, borderRadius: 14, overflow: 'hidden', backgroundColor: themeColors.cardBackground },
  inlineDatePickerHeader: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: themeColors.border },
  inlineDatePickerTitle: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '800' },
  inlineDatePickerDone: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: themeColors.primarySoft },
  inlineDatePickerDoneText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
  listContainer: {
    paddingBottom: 24,
  },
  visitorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderLeftWidth: 4,
    borderLeftColor: themeColors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  visitorPhone: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  residentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  residentText: {
    fontSize: 13,
    color: themeColors.textPrimary,
    marginLeft: 6,
  },
  timeline: {
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  entryButton: {
    backgroundColor: themeColors.success,
  },
  exitButton: {
    backgroundColor: themeColors.info,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  activityCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginLeft: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityBody: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  activityMeta: {
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  activityBadge: {
    backgroundColor: themeColors.primary + '18',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.accent,
  },
  activityEmpty: {
    color: themeColors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  activityToggle: {
    marginTop: 12,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: themeColors.primary + '12',
    borderWidth: 1,
    borderColor: themeColors.primary + '24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activityToggleText: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  recordsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: themeColors.textPrimary,
  },
  recordsCount: {
    fontSize: 12,
    fontWeight: '800',
    color: themeColors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 24,
    margin: 16,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceTint,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  modalVisitorInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalVisitorName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  modalVisitorDetails: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  detailName: {
    fontSize: 22,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  detailPhone: {
    fontSize: 16,
    color: themeColors.textSecondary,
    marginBottom: 12,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 16,
    color: themeColors.textPrimary,
    lineHeight: 24,
  },
  detailSubtext: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    marginLeft: 8,
  },
  textAreaInput: { minHeight: 88 },
  inputError: { borderColor: themeColors.error },
  errorText: { color: themeColors.error, fontSize: 12, fontWeight: '700', marginTop: 4 },
  manualHelpText: { color: themeColors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginHorizontal: 16 },
  pageButton: { backgroundColor: themeColors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  pageButtonDisabled: { opacity: 0.45 },
  pageButtonText: { color: 'white', fontWeight: '900' },
  pageInfo: { color: themeColors.textSecondary, fontWeight: '800' },
  sharePassButton: { marginTop: 18, marginBottom: 8, borderRadius: 12, backgroundColor: themeColors.primary, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sharePassText: { color: 'white', fontWeight: '900' },
});

export default SecurityVisitorLogsScreen;
