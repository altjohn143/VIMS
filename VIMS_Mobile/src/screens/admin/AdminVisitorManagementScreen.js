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
import LogoutButton from '../../components/LogoutButton';

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
  const [overrideAction, setOverrideAction] = useState('approve');
  const [overrideReason, setOverrideReason] = useState('');
  const [processing, setProcessing] = useState(false);
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
        setStats(statsRes.data.data.totals);
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
      filtered = filtered.filter(v => 
        format(new Date(v.createdAt), 'yyyy-MM-dd') === dateFilter
      );
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

  const handleExport = async () => {
    try {
      const response = await api.get('/visitors/admin/export');
      
      if (response.data.success) {
        const csvData = response.data.data;
        const jsonString = JSON.stringify(csvData, null, 2);
        const fileUri = FileSystem.documentDirectory + `visitors_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
        
        await FileSystem.writeAsStringAsync(fileUri, jsonString, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Success', `Exported ${csvData.length} visitors`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const getStatusChip = (status) => {
    const config = {
      pending: { label: 'Pending', color: themeColors.warning, icon: 'time', bg: themeColors.warning + '20' },
      approved: { label: 'Approved', color: themeColors.success, icon: 'checkmark-circle', bg: themeColors.success + '20' },
      rejected: { label: 'Rejected', color: themeColors.error, icon: 'close-circle', bg: themeColors.error + '20' },
      active: { label: 'Active', color: themeColors.info, icon: 'radio-button-on', bg: themeColors.info + '20' },
      completed: { label: 'Completed', color: themeColors.textSecondary, icon: 'checkmark-done', bg: themeColors.textSecondary + '20' },
      cancelled: { label: 'Cancelled', color: themeColors.error, icon: 'ban', bg: themeColors.error + '20' },
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

  return (
    <View style={styles.container}>
   <View style={styles.header}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={24} color="white" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Visitor Management</Text>
  <View style={styles.headerRight}>
    <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
      <Ionicons name="download" size={24} color="white" />
    </TouchableOpacity>
    <LogoutButton navigation={navigation} color="white" size={24} />
  </View>
</View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.warning }]}>{stats.pending || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.success }]}>{stats.approved || 0}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.info }]}>{stats.active || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.textSecondary }]}>{stats.completed || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.error }]}>{stats.rejected || 0}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
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
            style={[styles.filterChip, statusFilter === 'pending' && styles.activeFilter]}
            onPress={() => setStatusFilter('pending')}
          >
            <Text style={[styles.filterText, statusFilter === 'pending' && styles.activeFilterText]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'approved' && styles.activeFilter]}
            onPress={() => setStatusFilter('approved')}
          >
            <Text style={[styles.filterText, statusFilter === 'approved' && styles.activeFilterText]}>Approved</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'active' && styles.activeFilter]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.filterText, statusFilter === 'active' && styles.activeFilterText]}>Active</Text>
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