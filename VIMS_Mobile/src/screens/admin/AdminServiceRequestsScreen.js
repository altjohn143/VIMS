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
import UserDropdownMenu from '../../components/UserDropdownMenu';

const AdminServiceRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0,
  });

  const [processForm, setProcessForm] = useState({
    status: 'under-review',
    adminNotes: '',
    assignedTo: '',
    estimatedCompletion: '',
  });

  const categories = [
    { value: 'plumbing', label: 'Plumbing', icon: 'water' },
    { value: 'electrical', label: 'Electrical', icon: 'flash' },
    { value: 'carpentry', label: 'Carpentry', icon: 'hammer' },
    { value: 'cleaning', label: 'Cleaning', icon: 'brush' },
    { value: 'gardening', label: 'Gardening', icon: 'leaf' },
    { value: 'security', label: 'Security', icon: 'shield' },
    { value: 'other', label: 'Other', icon: 'apps' },
  ];

  const priorityColors = {
    low: themeColors.success,
    medium: themeColors.warning,
    high: themeColors.error,
    urgent: themeColors.error,
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, statusFilter, categoryFilter, priorityFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestsRes, staffRes, statsRes] = await Promise.all([
        api.get('/service-requests'),
        api.get('/service-requests/admin/staff'),
        api.get('/service-requests/admin/dashboard'),
      ]);

      if (requestsRes.data.success) {
        setRequests(requestsRes.data.data);
      }
      if (staffRes.data.success) {
        setStaffMembers(staffRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
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

  const filterRequests = () => {
    let filtered = [...requests];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req => 
        req.title?.toLowerCase().includes(query) ||
        req.description?.toLowerCase().includes(query) ||
        req.residentId?.firstName?.toLowerCase().includes(query) ||
        req.residentId?.lastName?.toLowerCase().includes(query) ||
        req.residentId?.houseNumber?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(req => req.category === categoryFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(req => req.priority === priorityFilter);
    }

    setFilteredRequests(filtered);
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      let response;
      
      if (processForm.assignedTo && processForm.status === 'assigned') {
        response = await api.put(`/service-requests/${selectedRequest._id}/assign-staff`, {
          assignedTo: processForm.assignedTo,
          adminNotes: processForm.adminNotes,
        });
      } else {
        response = await api.put(`/service-requests/${selectedRequest._id}/review`, {
          status: processForm.status,
          adminNotes: processForm.adminNotes,
          estimatedCompletion: processForm.estimatedCompletion,
        });
      }

      if (response.data.success) {
        Alert.alert('Success', 'Request processed successfully');
        setShowProcessModal(false);
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId, status) => {
    Alert.alert(
      'Update Status',
      `Are you sure you want to mark as ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const response = await api.put(`/service-requests/${requestId}/status`, { status });
              if (response.data.success) {
                Alert.alert('Success', 'Status updated');
                fetchData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  const getStatusChip = (status) => {
    const config = {
      pending: { label: 'Pending', color: themeColors.warning, icon: 'time', bg: themeColors.warning + '20' },
      'under-review': { label: 'Under Review', color: themeColors.info, icon: 'eye', bg: themeColors.info + '20' },
      assigned: { label: 'Assigned', color: themeColors.primary, icon: 'person', bg: themeColors.primary + '20' },
      'in-progress': { label: 'In Progress', color: themeColors.info, icon: 'construct', bg: themeColors.info + '20' },
      completed: { label: 'Completed', color: themeColors.success, icon: 'checkmark-circle', bg: themeColors.success + '20' },
      cancelled: { label: 'Cancelled', color: themeColors.error, icon: 'close-circle', bg: themeColors.error + '20' },
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

  const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const renderRequestCard = ({ item }) => {
    const status = getStatusChip(item.status);
    const resident = item.residentId;

    return (
      <TouchableOpacity
        style={[styles.requestCard, shadows.small]}
        onPress={() => {
          setSelectedRequest(item);
          setShowDetailsModal(true);
        }}
      >
        <View style={styles.requestHeader}>
          <View style={styles.residentInfo}>
            <View style={styles.residentAvatar}>
              <Text style={styles.avatarText}>
                {resident?.firstName?.charAt(0)}{resident?.lastName?.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={styles.residentName}>
                {resident?.firstName} {resident?.lastName}
              </Text>
              <Text style={styles.residentHouse}>House {resident?.houseNumber}</Text>
            </View>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColors[item.priority] + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColors[item.priority] }]}>
              {item.priority?.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.requestTitle}>{item.title}</Text>
        <Text style={styles.requestDescription} numberOfLines={2}>{item.description}</Text>

        <View style={styles.requestMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="pricetag" size={14} color={themeColors.textSecondary} />
            <Text style={styles.metaText}>{item.category}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={14} color={themeColors.textSecondary} />
            <Text style={styles.metaText}>{formatShortDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.requestFooter}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          
          {item.assignedTo && (
            <View style={styles.assignedInfo}>
              <Ionicons name="person" size={12} color={themeColors.textSecondary} />
              <Text style={styles.assignedText}>
                {item.assignedTo.firstName} {item.assignedTo.lastName}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          {['pending', 'under-review'].includes(item.status) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.processButton]}
              onPress={() => {
                setSelectedRequest(item);
                setProcessForm({
                  status: 'under-review',
                  adminNotes: item.adminNotes || '',
                  assignedTo: item.assignedTo?._id || '',
                  estimatedCompletion: item.estimatedCompletion ? 
                    format(new Date(item.estimatedCompletion), 'yyyy-MM-dd') : '',
                });
                setShowProcessModal(true);
              }}
            >
              <Ionicons name="create" size={16} color="white" />
              <Text style={styles.actionButtonText}>Process</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'assigned' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.inProgressButton]}
              onPress={() => handleUpdateStatus(item._id, 'in-progress')}
            >
              <Ionicons name="construct" size={16} color="white" />
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'in-progress' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleUpdateStatus(item._id, 'completed')}
            >
              <Ionicons name="checkmark-circle" size={16} color="white" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
<View style={styles.header}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={24} color="white" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Service Requests</Text>
  <View style={styles.headerRight}>
    <TouchableOpacity onPress={fetchData} style={styles.refreshButton}>
      <Ionicons name="refresh" size={24} color="white" />
    </TouchableOpacity>
    <UserDropdownMenu navigation={navigation} />
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
            <Text style={[styles.statValue, { color: themeColors.info }]}>{stats.inProgress || 0}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.success }]}>{stats.completed || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.error }]}>{stats.urgent || 0}</Text>
            <Text style={styles.statLabel}>Urgent</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests..."
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
            style={[styles.filterChip, statusFilter === 'in-progress' && styles.activeFilter]}
            onPress={() => setStatusFilter('in-progress')}
          >
            <Text style={[styles.filterText, statusFilter === 'in-progress' && styles.activeFilterText]}>In Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'completed' && styles.activeFilter]}
            onPress={() => setStatusFilter('completed')}
          >
            <Text style={[styles.filterText, statusFilter === 'completed' && styles.activeFilterText]}>Completed</Text>
          </TouchableOpacity>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, categoryFilter === 'all' && styles.activeFilter]}
            onPress={() => setCategoryFilter('all')}
          >
            <Text style={[styles.filterText, categoryFilter === 'all' && styles.activeFilterText]}>All Categories</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.filterChip, categoryFilter === cat.value && styles.activeFilter]}
              onPress={() => setCategoryFilter(cat.value)}
            >
              <Ionicons name={cat.icon} size={14} color={categoryFilter === cat.value ? 'white' : themeColors.textSecondary} />
              <Text style={[styles.filterText, categoryFilter === cat.value && styles.activeFilterText]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredRequests}
        renderItem={renderRequestCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="build" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No service requests</Text>
            <Text style={styles.emptyText}>Try adjusting your filters</Text>
          </View>
        }
      />

      {/* Process Modal */}
      <Modal
        visible={showProcessModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProcessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Process Request</Text>
              <TouchableOpacity onPress={() => setShowProcessModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {selectedRequest && (
                <View>
                  <Text style={styles.modalSubtitle}>{selectedRequest.title}</Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Action</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={processForm.status}
                        onValueChange={(value) => setProcessForm(prev => ({ ...prev, status: value }))}
                        style={styles.picker}
                      >
                        <Picker.Item label="Under Review" value="under-review" />
                        <Picker.Item label="Assign to Staff" value="assigned" />
                        <Picker.Item label="Reject" value="rejected" />
                        <Picker.Item label="Cancel" value="cancelled" />
                      </Picker>
                    </View>
                  </View>

                  {processForm.status === 'assigned' && (
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Assign To *</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={processForm.assignedTo}
                          onValueChange={(value) => setProcessForm(prev => ({ ...prev, assignedTo: value }))}
                          style={styles.picker}
                        >
                          <Picker.Item label="Select staff member" value="" />
                          {staffMembers.map(staff => (
                            <Picker.Item
                              key={staff._id}
                              label={`${staff.firstName} ${staff.lastName} (${staff.role})`}
                              value={staff._id}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Admin Notes</Text>
                    <TextInput
                      style={styles.textArea}
                      value={processForm.adminNotes}
                      onChangeText={(text) => setProcessForm(prev => ({ ...prev, adminNotes: text }))}
                      placeholder="Add notes or instructions..."
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Estimated Completion Date</Text>
                    <TextInput
                      style={styles.input}
                      value={processForm.estimatedCompletion}
                      onChangeText={(text) => setProcessForm(prev => ({ ...prev, estimatedCompletion: text }))}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setShowProcessModal(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={handleProcessRequest}
                      disabled={loading || (processForm.status === 'assigned' && !processForm.assignedTo)}
                    >
                      {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Process</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
              <Text style={styles.modalTitle}>Request Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView>
                <Text style={styles.detailTitle}>{selectedRequest.title}</Text>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Resident</Text>
                  <Text style={styles.detailText}>
                    {selectedRequest.residentId?.firstName} {selectedRequest.residentId?.lastName}
                  </Text>
                  <Text style={styles.detailSubtext}>
                    House {selectedRequest.residentId?.houseNumber} • {selectedRequest.residentId?.phone}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailText}>{selectedRequest.description}</Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>{selectedRequest.category}</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailLabel}>Priority</Text>
                    <Text style={[styles.detailValue, { color: priorityColors[selectedRequest.priority] }]}>
                      {selectedRequest.priority?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusChip(selectedRequest.status).bg }]}>
                      <Text style={[styles.statusText, { color: getStatusChip(selectedRequest.status).color }]}>
                        {getStatusChip(selectedRequest.status).label}
                      </Text>
                    </View>
                  </View>
                  {selectedRequest.location && (
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{selectedRequest.location}</Text>
                    </View>
                  )}
                </View>

                {selectedRequest.assignedTo && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Assigned To</Text>
                    <Text style={styles.detailText}>
                      {selectedRequest.assignedTo.firstName} {selectedRequest.assignedTo.lastName}
                    </Text>
                    <Text style={styles.detailSubtext}>{selectedRequest.assignedTo.role}</Text>
                  </View>
                )}

                {selectedRequest.adminNotes && (
                  <View style={[styles.detailSection, styles.adminNotes]}>
                    <Text style={styles.detailLabel}>Admin Notes</Text>
                    <Text style={styles.detailText}>{selectedRequest.adminNotes}</Text>
                  </View>
                )}

                <View style={styles.detailTimeline}>
                  <Text style={styles.detailLabel}>Timeline</Text>
                  <View style={styles.timelineItem}>
                    <Ionicons name="time" size={16} color={themeColors.textSecondary} />
                    <Text style={styles.timelineText}>Created: {formatDate(selectedRequest.createdAt)}</Text>
                  </View>
                  {selectedRequest.assignedAt && (
                    <View style={styles.timelineItem}>
                      <Ionicons name="person" size={16} color={themeColors.textSecondary} />
                      <Text style={styles.timelineText}>Assigned: {formatDate(selectedRequest.assignedAt)}</Text>
                    </View>
                  )}
                  {selectedRequest.completedAt && (
                    <View style={styles.timelineItem}>
                      <Ionicons name="checkmark-circle" size={16} color={themeColors.success} />
                      <Text style={styles.timelineText}>Completed: {formatDate(selectedRequest.completedAt)}</Text>
                    </View>
                  )}
                </View>

                {selectedRequest.rating && (
                  <View style={styles.ratingSection}>
                    <Ionicons name="star" size={20} color={themeColors.warning} />
                    <Text style={styles.ratingText}>Rating: {selectedRequest.rating}/5</Text>
                    {selectedRequest.feedback && (
                      <Text style={styles.feedbackText}>"{selectedRequest.feedback}"</Text>
                    )}
                  </View>
                )}
              </ScrollView>
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
  refreshButton: {
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
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 4,
  },
  activeFilterText: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  residentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  residentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  residentName: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  residentHouse: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  requestMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginLeft: 4,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  assignedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignedText: {
    fontSize: 11,
    color: themeColors.textSecondary,
    marginLeft: 4,
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
  processButton: {
    backgroundColor: themeColors.info,
  },
  inProgressButton: {
    backgroundColor: themeColors.warning,
  },
  completeButton: {
    backgroundColor: themeColors.success,
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
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: themeColors.textPrimary,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  textArea: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
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
  submitButton: {
    backgroundColor: themeColors.primary,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 20,
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
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailGridItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: themeColors.textPrimary,
    marginTop: 2,
  },
  adminNotes: {
    backgroundColor: themeColors.info + '10',
    padding: 12,
    borderRadius: 8,
  },
  detailTimeline: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    marginLeft: 8,
  },
  ratingSection: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: themeColors.warning + '10',
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.warning,
    marginTop: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default AdminServiceRequestsScreen;