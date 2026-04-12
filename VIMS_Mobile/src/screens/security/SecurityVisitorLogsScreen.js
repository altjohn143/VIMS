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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../../utils/theme';
import api from '../../utils/api';
import { format } from 'date-fns';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import UserDropdownMenu from '../../components/UserDropdownMenu';

const SecurityVisitorLogsScreen = ({ navigation }) => {
  const [visitors, setVisitors] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [securityNotes, setSecurityNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [processing, setProcessing] = useState(false);
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

  const handleExport = async () => {
    try {
      const data = filteredVisitors.map(v => ({
        'Visitor Name': v.visitorName,
        'Phone': v.visitorPhone,
        'Resident': `${v.residentId?.firstName} ${v.residentId?.lastName}`,
        'House': v.residentId?.houseNumber,
        'Purpose': v.purpose,
        'Status': v.status,
        'Arrival': formatDate(v.expectedArrival),
        'Entry': v.actualEntry ? formatDate(v.actualEntry) : 'Not entered',
        'Exit': v.actualExit ? formatDate(v.actualExit) : 'Not exited',
      }));

      const csvString = JSON.stringify(data, null, 2);
      const fileUri = FileSystem.documentDirectory + `visitor_logs_${format(new Date(), 'yyyy-MM-dd')}.json`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const getStatusChip = (status) => {
    const config = {
      pending: { label: 'Pending', color: themeColors.warning, icon: 'time', bg: themeColors.warning + '20' },
      approved: { label: 'Approved', color: themeColors.success, icon: 'checkmark-circle', bg: themeColors.success + '20' },
      active: { label: 'Active', color: themeColors.info, icon: 'radio-button-on', bg: themeColors.info + '20' },
      completed: { label: 'Completed', color: themeColors.textSecondary, icon: 'checkmark-done', bg: themeColors.textSecondary + '20' },
      rejected: { label: 'Rejected', color: themeColors.error, icon: 'close-circle', bg: themeColors.error + '20' },
    };
    return config[status] || config.pending;
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
    const status = getStatusChip(item.status);
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
<View style={styles.header}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={24} color="white" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Visitor Logs</Text>
  <View style={styles.headerRight}>
    <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
      <Ionicons name="download" size={24} color="white" />
    </TouchableOpacity>
    <UserDropdownMenu navigation={navigation} />
  </View>
</View>

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

        <TextInput
          style={styles.dateInput}
          placeholder="Filter by date (YYYY-MM-DD)"
          value={dateFilter}
          onChangeText={setDateFilter}
        />
      </View>

      <FlatList
        data={filteredVisitors}
        renderItem={renderVisitorCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text" size={64} color={themeColors.textSecondary} />
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
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Entry Modal */}
      <Modal
        visible={showEntryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEntryModal(false)}
      >
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>

      {/* Exit Modal */}
      <Modal
        visible={showExitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    backgroundColor: themeColors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  statsScroll: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  statCard: {
    alignItems: 'center',
    marginRight: 20,
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
  listContainer: {
    padding: 16,
  },
  visitorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
});

export default SecurityVisitorLogsScreen;