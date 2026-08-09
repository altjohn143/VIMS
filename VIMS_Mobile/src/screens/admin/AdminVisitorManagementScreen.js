import React, { useState, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows, roleLayouts } from '../../utils/theme';
import api from '../../utils/api';
import { format } from 'date-fns';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import UserDropdownMenu from '../../components/UserDropdownMenu';
import { getAuthToken } from '../../utils/secureSession';

const AdminVisitorManagementScreen = ({ navigation }) => {
  const [visitors, setVisitors] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [overrideAction, setOverrideAction] = useState('approve');
  const [overrideReason, setOverrideReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exporting, setExporting] = useState(false);
  const [exportDatePicker, setExportDatePicker] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    active: 0,
    completed: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterVisitors();
  }, [visitors, searchQuery, statusFilter, dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitorsRes, statsRes] = await Promise.all([
        api.get('/visitors/admin/all'),
        api.get('/visitors/admin/stats'),
      ]);

      if (visitorsRes.data.success) {
        setVisitors(visitorsRes.data.data);
      }
      if (statsRes.data.success) {
        const totals = statsRes.data.data.totals || {};
        setStats({
          total: totals.totalVisitors || 0,
          pending: totals.pendingVisitors || 0,
          approved: totals.approvedVisitors || 0,
          active: totals.activeVisitors || 0,
          rejected: totals.rejectedVisitors || 0,
          completed: visitorsRes.data?.data?.filter((visitor) => visitor.status === 'completed').length || 0,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filterVisitors = () => {
    let filtered = [...visitors];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.visitorName?.toLowerCase().includes(query) ||
        v.visitorPhone?.includes(query) ||
        v.residentId?.firstName?.toLowerCase().includes(query) ||
        v.residentId?.lastName?.toLowerCase().includes(query) ||
        v.residentId?.houseNumber?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter((visitor) => {
        try {
          return format(new Date(visitor.expectedArrival), 'yyyy-MM-dd') === dateFilter;
        } catch {
          return false;
        }
      });
    }

    setFilteredVisitors(filtered);
  };

  const handleOverride = async () => {
    if (!selectedVisitor) return;

    if (overrideAction === 'reject' && !overrideReason.trim()) {
      Alert.alert('Error', 'Rejection reason is required');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.put(`/visitors/admin/${selectedVisitor._id}/override`, {
        action: overrideAction,
        reason: overrideReason || `Admin override ${overrideAction}`,
        notes: `Overriding previous status: ${selectedVisitor.status}`,
      });

      if (response.data.success) {
        Alert.alert('Success', `Visitor ${overrideAction}d successfully`);
        setShowOverrideModal(false);
        setShowDetailsModal(false);
        setOverrideReason('');
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to process override');
    } finally {
      setProcessing(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('');
  };

  const selectExportDate = (field, selectedDate) => {
    if (Platform.OS === 'android') setExportDatePicker(null);
    if (!selectedDate) return;
    const value = format(selectedDate, 'yyyy-MM-dd');
    if (field === 'start') setExportStartDate(value);
    else setExportEndDate(value);
  };

  const handleExport = async () => {
    if (!!exportStartDate !== !!exportEndDate) {
      Alert.alert('Incomplete Range', 'Enter both a start date and an end date, or leave both empty.');
      return;
    }
    if ((exportStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(exportStartDate)) ||
        (exportEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(exportEndDate))) {
      Alert.alert('Invalid Date', 'Use YYYY-MM-DD for the export dates.');
      return;
    }
    if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
      Alert.alert('Invalid Range', 'The start date must be before or equal to the end date.');
      return;
    }
    setExporting(true);
    try {
      if (!exportStartDate && !exportEndDate) {
        if (!filteredVisitors.length) {
          Alert.alert('No Visitors', 'There are no visitors matching the active filters to export.');
          return;
        }
        const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows = filteredVisitors.map((visitor) => [
          visitor.visitorName,
          visitor.visitorPhone,
          visitor.residentId ? `${visitor.residentId.firstName || ''} ${visitor.residentId.lastName || ''}`.trim() : '',
          visitor.residentId?.houseNumber || '',
          visitor.purpose || '',
          visitor.status || '',
          visitor.expectedArrival ? format(new Date(visitor.expectedArrival), 'yyyy-MM-dd HH:mm') : '',
          visitor.expectedDeparture ? format(new Date(visitor.expectedDeparture), 'yyyy-MM-dd HH:mm') : '',
        ]);
        const csv = [
          ['Visitor', 'Phone', 'Resident', 'House', 'Purpose', 'Status', 'Expected Arrival', 'Expected Departure'].map(escapeCsv).join(','),
          ...rows.map((row) => row.map(escapeCsv).join(','))
        ].join('\n');
        const fileUri = `${FileSystem.documentDirectory}visitors_filtered_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csv);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Share Filtered Visitor Export',
          });
        } else {
          Alert.alert('Export Complete', `File saved to ${fileUri}`);
        }
        setShowExportModal(false);
        return;
      }

      const params = new URLSearchParams();
      if (exportStartDate) params.append('startDate', exportStartDate);
      if (exportEndDate) params.append('endDate', exportEndDate);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('format', exportFormat);
      params.append('timezoneOffset', String(new Date().getTimezoneOffset()));

      let fileUri;
      if (exportFormat === 'pdf' || exportFormat === 'csv') {
        const token = await getAuthToken();
        const baseUrl = String(api.defaults.baseURL || '').replace(/\/$/, '');
        fileUri = `${FileSystem.documentDirectory}visitors_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.${exportFormat}`;
        const download = await FileSystem.downloadAsync(
          `${baseUrl}/visitors/admin/export?${params.toString()}`,
          fileUri,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (download.status < 200 || download.status >= 300) {
          throw new Error(`Export server returned status ${download.status}`);
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: exportFormat === 'pdf' ? 'application/pdf' : 'text/csv',
          dialogTitle: `Share Visitor ${exportFormat.toUpperCase()} Export`,
        });
      } else {
        Alert.alert('Export Complete', `File saved to ${fileUri}`);
      }
      setShowExportModal(false);
    } catch (error) {
      Alert.alert('Export Failed', error.response?.data?.error || error.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const getStatusChip = (status, visitor = null) => {
    const displayStatus = String(visitor?.qrStatus || status || 'pending').toLowerCase();
    const config = {
      pending: { label: 'Pending', color: themeColors.warning, icon: 'time', bg: themeColors.warning + '20' },
      approved: { label: 'Approved', color: themeColors.success, icon: 'checkmark-circle', bg: themeColors.success + '20' },
      rejected: { label: 'Rejected', color: themeColors.error, icon: 'close-circle', bg: themeColors.error + '20' },
      entered: { label: 'Entered', color: themeColors.info, icon: 'log-in', bg: themeColors.info + '20' },
      arrived: { label: 'Arrived', color: themeColors.success, icon: 'home', bg: themeColors.success + '20' },
      departed: { label: 'Departed', color: themeColors.warning, icon: 'arrow-forward-circle', bg: themeColors.warning + '20' },
      active: { label: 'Active', color: themeColors.info, icon: 'radio-button-on', bg: themeColors.info + '20' },
      exited: { label: 'Exited', color: themeColors.textSecondary, icon: 'checkmark-done', bg: themeColors.textSecondary + '20' },
      completed: { label: 'Exited', color: themeColors.textSecondary, icon: 'checkmark-done', bg: themeColors.textSecondary + '20' },
      cancelled: { label: 'Cancelled', color: themeColors.error, icon: 'ban', bg: themeColors.error + '20' },
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

  const renderVisitorCard = ({ item }) => {
    const status = getStatusChip(item.status, item);
    const resident = item.residentId;

    return (
      <TouchableOpacity
        style={[styles.visitorCard, shadows.small]}
        onPress={() => {
          setSelectedVisitor(item);
          setShowDetailsModal(true);
        }}
      >
        <View style={styles.visitorHeader}>
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
            {resident?.firstName} {resident?.lastName} • House {resident?.houseNumber}
          </Text>
        </View>

        <Text style={styles.purpose} numberOfLines={2}>{item.purpose}</Text>

        <View style={styles.visitorFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="time" size={14} color={themeColors.textSecondary} />
            <Text style={styles.footerText}>{formatDate(item.expectedArrival)}</Text>
          </View>
          {item.vehicleNumber && (
            <View style={styles.footerItem}>
              <Ionicons name="car" size={14} color={themeColors.textSecondary} />
              <Text style={styles.footerText}>{item.vehicleNumber}</Text>
            </View>
          )}
        </View>

        {item.approvedBy && (
          <View style={styles.approvedBy}>
            <Ionicons name="checkmark-circle" size={14} color={themeColors.success} />
            <Text style={styles.approvedByText}>
              Approved by: {item.approvedBy.firstName} {item.approvedBy.lastName}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderVisitorListHeader = () => (
    <View style={styles.listHeaderControls}>
      <View style={styles.flowSummary}>
        <View style={styles.flowSummaryItem}><Text style={styles.flowSummaryValue}>{stats.total}</Text><Text style={styles.flowSummaryLabel}>Total</Text></View>
        <View style={styles.flowSummaryDivider} />
        <View style={styles.flowSummaryItem}><Text style={[styles.flowSummaryValue, { color: themeColors.warning }]}>{stats.pending}</Text><Text style={styles.flowSummaryLabel}>Pending</Text></View>
        <View style={styles.flowSummaryDivider} />
        <View style={styles.flowSummaryItem}><Text style={[styles.flowSummaryValue, { color: themeColors.success }]}>{stats.approved}</Text><Text style={styles.flowSummaryLabel}>Approved</Text></View>
        <View style={styles.flowSummaryDivider} />
        <View style={styles.flowSummaryItem}><Text style={[styles.flowSummaryValue, { color: themeColors.info }]}>{stats.active}</Text><Text style={styles.flowSummaryLabel}>Active</Text></View>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search visitors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            blurOnSubmit={false}
          />
          {(searchQuery || statusFilter !== 'all' || dateFilter) ? (
            <TouchableOpacity onPress={clearFilters}>
              <Ionicons name="close-circle" size={19} color={themeColors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'pending', 'approved', 'active', 'completed', 'rejected'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, statusFilter === status && styles.activeFilter]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterText, statusFilter === status && styles.activeFilterText]}>
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.filterMetaRow}>
          <Text style={styles.resultCount}>{filteredVisitors.length} shown</Text>
          <TouchableOpacity style={styles.advancedFilterToggle} onPress={() => setShowAdvancedFilters((value) => !value)}>
            <Ionicons name="calendar-outline" size={16} color={themeColors.primary} />
            <Text style={styles.advancedFilterToggleText}>{showAdvancedFilters ? 'Hide date' : 'Filter date'}</Text>
            {!!dateFilter && <View style={styles.activeFilterDot} />}
          </TouchableOpacity>
        </View>

        {showAdvancedFilters && <View style={styles.dateFilterRow}>
          <TextInput
            style={[styles.dateInput, { flex: 1 }]}
            placeholder="Arrival date (YYYY-MM-DD)"
            value={dateFilter}
            onChangeText={setDateFilter}
          />
          <TouchableOpacity style={styles.clearFilterButton} onPress={clearFilters}>
            <Ionicons name="filter-outline" size={16} color={themeColors.primaryDeep} />
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.flowHeader}>
        <View style={styles.flowHeaderTop}>
          <View>
            <Text style={styles.flowEyebrow}>GATE OPERATIONS</Text>
            <Text style={styles.flowTitle}>Visitor Management</Text>
            <Text style={styles.flowSubtitle}>Track arrivals from request to exit</Text>
          </View>
          <UserDropdownMenu navigation={navigation} />
        </View>
        <View style={styles.flowActions}>
          <TouchableOpacity onPress={() => navigation.navigate('AdminVisitorReports')} style={styles.flowAction}>
            <Ionicons name="analytics-outline" size={18} color={themeColors.primaryDeep} />
            <Text style={styles.flowActionText}>Insights</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.flowAction}>
            <Ionicons name="download-outline" size={18} color={themeColors.primaryDeep} />
            <Text style={styles.flowActionText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={filteredVisitors}
        renderItem={renderVisitorCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderVisitorListHeader()}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No visitors found</Text>
            <Text style={styles.emptyText}>Try adjusting your filters</Text>
          </View>
        }
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

                <View style={[styles.statusBadge, { backgroundColor: getStatusChip(selectedVisitor.status).bg, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.statusText, { color: getStatusChip(selectedVisitor.status).color }]}>
                    {getStatusChip(selectedVisitor.status).label.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Purpose</Text>
                  <Text style={styles.detailText}>{selectedVisitor.purpose}</Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailLabel}>Resident</Text>
                    <Text style={styles.detailValue}>
                      {selectedVisitor.residentId?.firstName} {selectedVisitor.residentId?.lastName}
                    </Text>
                    <Text style={styles.detailSubtext}>House {selectedVisitor.residentId?.houseNumber}</Text>
                  </View>
                  {selectedVisitor.vehicleNumber && (
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Vehicle</Text>
                      <Text style={styles.detailValue}>{selectedVisitor.vehicleNumber}</Text>
                    </View>
                  )}
                </View>

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

                {selectedVisitor.approvedBy && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Approved By</Text>
                    <Text style={styles.detailText}>
                      {selectedVisitor.approvedBy.firstName} {selectedVisitor.approvedBy.lastName}
                    </Text>
                    <Text style={styles.detailSubtext}>
                      {formatDate(selectedVisitor.approvedAt)}
                    </Text>
                  </View>
                )}

                {selectedVisitor.rejectionReason && (
                  <View style={[styles.detailSection, styles.rejectionBox]}>
                    <Text style={styles.detailLabel}>Rejection Reason</Text>
                    <Text style={styles.detailText}>{selectedVisitor.rejectionReason}</Text>
                  </View>
                )}

                {selectedVisitor.securityNotes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Security Notes</Text>
                    <Text style={styles.detailText}>{selectedVisitor.securityNotes}</Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.approveButton]}
                    onPress={() => {
                      setOverrideAction('approve');
                      setShowOverrideModal(true);
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.modalButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.rejectButton]}
                    onPress={() => {
                      setOverrideAction('reject');
                      setShowOverrideModal(true);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="white" />
                    <Text style={styles.modalButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Override Modal */}
      <Modal
        visible={showOverrideModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOverrideModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {overrideAction === 'approve' ? 'Approve Visitor' : 'Reject Visitor'}
              </Text>
              <TouchableOpacity onPress={() => setShowOverrideModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.overrideContent}>
              {selectedVisitor && (
                <View style={styles.visitorPreview}>
                  <Text style={styles.previewName}>{selectedVisitor.visitorName}</Text>
                  <Text style={styles.previewDetails}>
                    {selectedVisitor.visitorPhone} • {selectedVisitor.purpose}
                  </Text>
                </View>
              )}

              <TextInput
                style={styles.overrideInput}
                placeholder={overrideAction === 'reject' ? 'Rejection reason *' : 'Reason for override (optional)'}
                value={overrideReason}
                onChangeText={setOverrideReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowOverrideModal(false);
                    setOverrideReason('');
                  }}
                  disabled={processing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, overrideAction === 'approve' ? styles.approveButton : styles.rejectButton]}
                  onPress={handleOverride}
                  disabled={processing || (overrideAction === 'reject' && !overrideReason.trim())}
                >
                  {processing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonText}>
                      {overrideAction === 'approve' ? 'Approve' : 'Reject'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showExportModal} animationType="slide" transparent onRequestClose={() => !exporting && setShowExportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Export Visitor Data</Text>
                <Text style={styles.exportHelper}>Leave dates empty to export the current visitor list using active search, status, and date filters.</Text>
              </View>
              <TouchableOpacity onPress={() => !exporting && setShowExportModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.exportModalBody}>
            <Text style={styles.exportLabel}>File format</Text>
            <View style={styles.exportFormatRow}>
              {[
                ['pdf', 'PDF report', 'document-text-outline'],
                ['csv', 'CSV data', 'grid-outline'],
              ].map(([value, label, icon]) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.exportFormatCard, exportFormat === value && styles.exportFormatCardActive]}
                  onPress={() => setExportFormat(value)}
                  disabled={exporting}
                >
                  <Ionicons name={icon} size={22} color={exportFormat === value ? 'white' : themeColors.primary} />
                  <Text style={[styles.exportFormatText, exportFormat === value && styles.exportFormatTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.exportLabel}>Created-date range</Text>
            <TouchableOpacity style={styles.exportDateInput} onPress={() => setExportDatePicker('start')} disabled={exporting}>
              <Ionicons name="calendar-outline" size={19} color={themeColors.primary} />
              <Text style={[styles.exportDateText, !exportStartDate && styles.exportDatePlaceholder]}>{exportStartDate || 'Select start date'}</Text>
              {exportStartDate ? <TouchableOpacity onPress={() => setExportStartDate('')}><Ionicons name="close-circle" size={19} color={themeColors.textSecondary} /></TouchableOpacity> : null}
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportDateInput} onPress={() => setExportDatePicker('end')} disabled={exporting}>
              <Ionicons name="calendar-outline" size={19} color={themeColors.primary} />
              <Text style={[styles.exportDateText, !exportEndDate && styles.exportDatePlaceholder]}>{exportEndDate || 'Select end date'}</Text>
              {exportEndDate ? <TouchableOpacity onPress={() => setExportEndDate('')}><Ionicons name="close-circle" size={19} color={themeColors.textSecondary} /></TouchableOpacity> : null}
            </TouchableOpacity>

            {exportDatePicker && (
              <View style={Platform.OS === 'ios' ? styles.inlineExportPicker : undefined}>
                {Platform.OS === 'ios' && (
                  <View style={styles.inlineExportPickerHeader}>
                    <Text style={styles.inlineExportPickerTitle}>
                      {exportDatePicker === 'start' ? 'Select start date' : 'Select end date'}
                    </Text>
                    <TouchableOpacity style={styles.inlineExportPickerDone} onPress={() => setExportDatePicker(null)}>
                      <Text style={styles.inlineExportPickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <DateTimePicker
                  value={new Date((exportDatePicker === 'start' ? exportStartDate : exportEndDate) || Date.now())}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  themeVariant="light"
                  onChange={(event, date) => {
                    if (event.type === 'dismissed') {
                      setExportDatePicker(null);
                      return;
                    }
                    selectExportDate(exportDatePicker, date);
                  }}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowExportModal(false)} disabled={exporting}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.approveButton]} onPress={handleExport} disabled={exporting}>
                {exporting ? <ActivityIndicator color="white" /> : (
                  <>
                    <Ionicons name="download-outline" size={19} color="white" />
                    <Text style={styles.modalButtonText}>Export {exportFormat.toUpperCase()}</Text>
                  </>
                )}
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
  container: roleLayouts.admin.screen,
  flowHeader: { backgroundColor: themeColors.cardBackground, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  flowHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flowEyebrow: { color: themeColors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  flowTitle: { color: themeColors.textPrimary, fontSize: 30, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  flowSubtitle: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 2 },
  flowActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  flowAction: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: themeColors.accent, height: 42, paddingHorizontal: 15, borderRadius: 14 },
  flowActionText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
  listHeaderControls: { paddingBottom: 8 },
  flowSummary: { marginBottom: 10, paddingHorizontal: 10, paddingVertical: 12, borderRadius: 12, backgroundColor: themeColors.surfaceTint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: themeColors.border },
  flowSummaryItem: { flex: 1, alignItems: 'center' },
  flowSummaryDivider: { width: 1, height: 32, backgroundColor: themeColors.border },
  flowSummaryValue: { textAlign: 'center', color: themeColors.primaryDeep, fontSize: 21, fontWeight: '900' },
  flowSummaryLabel: { color: themeColors.textSecondary, fontSize: 10, fontWeight: '800', marginTop: 2 },
  header: {
    ...roleLayouts.admin.header,
    paddingTop: 54,
    paddingBottom: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 34,
  },
  headerRight: {
  flexDirection: 'row',
  alignItems: 'center',
},
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  exportButton: {
    padding: 8,
  },
  reportsButton: {
    padding: 8,
  },
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
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: 0,
  },
  filterMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  resultCount: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '800' },
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
  dateFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  clearFilterButton: { height: 43, paddingHorizontal: 13, borderRadius: 10, backgroundColor: themeColors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 5 },
  clearFilterText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '800' },
  advancedFilterToggle: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: themeColors.primaryWash, borderWidth: 1, borderColor: themeColors.border },
  advancedFilterToggleText: { color: themeColors.primary, fontSize: 12, fontWeight: '800' },
  activeFilterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: themeColors.warning },
  exportModalCard: { width: '92%', maxWidth: 520, maxHeight: '92%', backgroundColor: themeColors.cardBackground, borderRadius: 12, padding: 20, paddingBottom: 28 },
  exportModalBody: { paddingBottom: 2 },
  exportHelper: { color: themeColors.textSecondary, fontSize: 12, marginTop: 3 },
  exportLabel: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  exportFormatRow: { flexDirection: 'row', gap: 10 },
  exportFormatCard: { flex: 1, minHeight: 72, borderRadius: 14, borderWidth: 1, borderColor: themeColors.border, backgroundColor: themeColors.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: 5 },
  exportFormatCardActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  exportFormatText: { color: themeColors.textPrimary, fontSize: 12, fontWeight: '800' },
  exportFormatTextActive: { color: 'white' },
  exportDateInput: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: themeColors.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, backgroundColor: themeColors.surfaceMuted, marginBottom: 9 },
  exportDateText: { flex: 1, color: themeColors.textPrimary, fontSize: 14, fontWeight: '600' },
  exportDatePlaceholder: { color: themeColors.textMuted, fontWeight: '500' },
  inlineExportPicker: { marginBottom: 10, borderWidth: 1, borderColor: themeColors.border, borderRadius: 14, overflow: 'hidden', backgroundColor: themeColors.cardBackground },
  inlineExportPickerHeader: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: themeColors.border },
  inlineExportPickerTitle: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '800' },
  inlineExportPickerDone: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: themeColors.primarySoft },
  inlineExportPickerDoneText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
  listContainer: {
    padding: 16,
    paddingTop: 10,
  },
  visitorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primary,
  },
  visitorHeader: {
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
  purpose: {
    fontSize: 14,
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  visitorFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginLeft: 4,
  },
  approvedBy: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  approvedByText: {
    fontSize: 11,
    color: themeColors.success,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 24,
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
    maxHeight: '92%',
    paddingBottom: 28,
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
  detailGrid: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  detailGridItem: {
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: themeColors.textPrimary,
    marginTop: 2,
  },
  detailSubtext: {
    fontSize: 13,
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
  rejectionBox: {
    backgroundColor: themeColors.error + '10',
    padding: 12,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: themeColors.success,
  },
  rejectButton: {
    backgroundColor: themeColors.error,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  overrideContent: {
    paddingVertical: 10,
  },
  visitorPreview: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  previewDetails: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  overrideInput: {
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
});

export default AdminVisitorManagementScreen;
