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
  Linking,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { themeColors, shadows, roleLayouts } from '../../utils/theme';
import api from '../../utils/api';
import { format } from 'date-fns';
import UserDropdownMenu from '../../components/UserDropdownMenu';
import { getAuthToken } from '../../utils/secureSession';

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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0,
    averageRating: 0,
  });

  const [processForm, setProcessForm] = useState({
    status: '',
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
    { value: 'complaint', label: 'Complaint', icon: 'chatbox-ellipses' },
    { value: 'other', label: 'Other', icon: 'apps' },
  ];

  const getStaffForCategory = (category) => {
    if (category === 'security') {
      return staffMembers.filter(staff => staff.role === 'security');
    }
    return staffMembers.filter(staff => staff.role !== 'security');
  };

  const priorityColors = {
    low: themeColors.success,
    medium: themeColors.warning,
    high: themeColors.error,
    urgent: themeColors.error,
  };

  const isEmergency = (request) => {
    if (!request) return false;
    const content = `${request.title || ''} ${request.description || ''}`.toLowerCase();
    return request.category === 'security' || ['fire', 'emergency', 'alert', 'danger', 'urgent'].some((keyword) => content.includes(keyword));
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
        const dashboard = statsRes.data.data || {};
        const allRequests = requestsRes.data?.data || [];
        const rated = allRequests.filter((request) => Number(request.rating) > 0);
        setStats({
          total: dashboard.totalRequests || allRequests.length,
          pending: dashboard.pendingRequests || 0,
          inProgress: dashboard.inProgressRequests || 0,
          completed: dashboard.completedRequests || 0,
          urgent: dashboard.urgentRequests || 0,
          averageRating: rated.length ? rated.reduce((sum, request) => sum + Number(request.rating), 0) / rated.length : 0,
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

    if (!processForm.status) {
      Alert.alert('Action Required', 'Select an action before processing this request.');
      return;
    }

    if (!processForm.adminNotes.trim()) {
      Alert.alert('Process Details Required', 'Enter admin notes or instructions before processing this request.');
      return;
    }

    if (processForm.status === 'assigned' && !isEmergency(selectedRequest) && !processForm.assignedTo) {
      Alert.alert('Staff Required', 'Select a staff member before processing this request.');
      return;
    }

    setLoading(true);
    try {
      let response;
      const emergency = isEmergency(selectedRequest);
      let assignedStaffId = processForm.assignedTo;
      if (emergency && processForm.status === 'assigned') {
        assignedStaffId = staffMembers.find((staff) => staff.role === 'security')?._id || '';
        if (!assignedStaffId) {
          Alert.alert('No Security Staff', 'No active security personnel are available for automatic emergency assignment.');
          return;
        }
      }
      
      if (assignedStaffId && processForm.status === 'assigned') {
        response = await api.put(`/service-requests/${selectedRequest._id}/assign-staff`, {
          assignedTo: assignedStaffId,
          adminNotes: emergency ? `[EMERGENCY] ${processForm.adminNotes}` : processForm.adminNotes,
        });
      } else {
        response = await api.put(`/service-requests/${selectedRequest._id}/review`, {
          status: processForm.status,
          adminNotes: emergency ? `[EMERGENCY] ${processForm.adminNotes}` : processForm.adminNotes,
          estimatedCompletion: processForm.estimatedCompletion,
        });
      }

      if (response.data.success) {
        if (emergency && processForm.status === 'assigned') {
          Alert.alert(
            'Emergency Request Assigned',
            'Security personnel were assigned. Do you want to open the phone dialer for the national emergency hotline (911)?',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
            ]
          );
        } else {
          Alert.alert('Success', 'Request processed successfully');
        }
        setShowProcessModal(false);
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
  };

  const handleExportFile = async (fileFormat = 'pdf') => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('format', fileFormat);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      params.append('timezoneOffset', String(new Date().getTimezoneOffset()));
      const token = await getAuthToken();
      const baseUrl = String(api.defaults.baseURL || '').replace(/\/$/, '');
      const fileUri = `${FileSystem.documentDirectory}service_requests_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.${fileFormat}`;
      const download = await FileSystem.downloadAsync(
        `${baseUrl}/service-requests/export?${params.toString()}`,
        fileUri,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (download.status < 200 || download.status >= 300) throw new Error(`Export server returned status ${download.status}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: fileFormat === 'pdf' ? 'application/pdf' : 'text/csv',
          dialogTitle: `Share Service Requests ${fileFormat.toUpperCase()}`
        });
      } else {
        Alert.alert('Export Complete', `${fileFormat.toUpperCase()} saved to ${fileUri}`);
      }
    } catch (error) {
      Alert.alert('Export Failed', error.response?.data?.error || error.message || `Failed to export ${fileFormat.toUpperCase()}`);
    } finally {
      setExporting(false);
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

  const handleArchiveRequest = (request) => {
    if (!request?._id) return;

    Alert.alert(
      'Archive Service Request',
      `Archive "${request.title}"? It will be removed from the active queue and kept in archived service requests.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/service-requests/${request._id}`, {
                data: { reason: 'Archived by admin' },
              });
              if (response.data.success) {
                Alert.alert('Success', 'Service request archived successfully');
                setShowDetailsModal(false);
                setSelectedRequest(null);
                fetchData();
              } else {
                Alert.alert('Error', response.data?.error || 'Failed to archive service request');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to archive service request');
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
          
          {item.status === 'cancelled' && (
            <View style={styles.cancelledMetadata}>
              <Text style={styles.cancelledMetaText}>
                Cancelled by {item.cancelledBy?.firstName ? `${item.cancelledBy.firstName} ${item.cancelledBy.lastName}` : 'Admin'}
              </Text>
            </View>
          )}
          
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
                  status: '',
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

          <TouchableOpacity
            style={[styles.actionButton, styles.archiveButton]}
            onPress={() => handleArchiveRequest(item)}
          >
            <Ionicons name="archive-outline" size={16} color="white" />
            <Text style={styles.actionButtonText}>Archive</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestListHeader = () => (
    <View style={styles.listHeaderControls}>
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
                  {isEmergency(selectedRequest) && (
                    <View style={styles.emergencyBanner}>
                      <Ionicons name="warning" size={22} color={themeColors.error} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.emergencyTitle}>EMERGENCY DETECTED</Text>
                        <Text style={styles.emergencyText}>Assigning this request will automatically select active security personnel. You will be asked before opening the 911 dialer.</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Action</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={processForm.status}
                        onValueChange={(value) => setProcessForm(prev => ({ ...prev, status: value }))}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select action" value="" />
                        <Picker.Item label="Under Review" value="under-review" />
                        <Picker.Item label="Assign to Staff" value="assigned" />
                        <Picker.Item label="Reject" value="rejected" />
                        <Picker.Item label="Cancel" value="cancelled" />
                      </Picker>
                    </View>
                  </View>

                  {processForm.status === 'assigned' && !isEmergency(selectedRequest) && (
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Assign To *</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={processForm.assignedTo}
                          onValueChange={(value) => setProcessForm(prev => ({ ...prev, assignedTo: value }))}
                          style={styles.picker}
                        >
                          <Picker.Item label="Select staff member" value="" />
                          {getStaffForCategory(selectedRequest.category).map(staff => (
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
                      style={[styles.modalButton, styles.submitButton, (!processForm.status || !processForm.adminNotes.trim() || (processForm.status === 'assigned' && !isEmergency(selectedRequest) && !processForm.assignedTo)) && styles.disabledButton]}
                      onPress={handleProcessRequest}
                      disabled={loading || !processForm.status || !processForm.adminNotes.trim() || (processForm.status === 'assigned' && !isEmergency(selectedRequest) && !processForm.assignedTo)}
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
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  style={styles.modalIconButton}
                  onPress={() => handleArchiveRequest(selectedRequest)}
                >
                  <Ionicons name="archive-outline" size={21} color={themeColors.error} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalIconButton} onPress={() => setShowDetailsModal(false)}>
                  <Ionicons name="close" size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {selectedRequest && (
              <ScrollView>
                <Text style={styles.detailTitle}>{selectedRequest.title}</Text>
                <Text style={styles.detailSubtext}>Request #{String(selectedRequest._id || '').slice(-6)} · Created {formatDate(selectedRequest.createdAt)}</Text>
                {selectedRequest.updatedAt && <Text style={styles.detailSubtext}>Last updated {formatDate(selectedRequest.updatedAt)}</Text>}
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Resident</Text>
                  <Text style={styles.detailText}>
                    {selectedRequest.residentId?.firstName} {selectedRequest.residentId?.lastName}
                  </Text>
                  <Text style={styles.detailSubtext}>
                    House {selectedRequest.residentId?.houseNumber} • {selectedRequest.residentId?.phone}
                  </Text>
                  <Text style={styles.detailSubtext}>{selectedRequest.residentId?.email || 'No email available'}</Text>
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
                  {Number(selectedRequest.estimatedCost) > 0 && (
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Estimated Cost</Text>
                      <Text style={styles.detailValue}>₱{Number(selectedRequest.estimatedCost).toLocaleString()}</Text>
                    </View>
                  )}
                  {selectedRequest.estimatedCompletion && (
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Est. Completion</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedRequest.estimatedCompletion)}</Text>
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
                    {selectedRequest.assignedAt && <Text style={styles.detailSubtext}>Assigned {formatDate(selectedRequest.assignedAt)}</Text>}
                  </View>
                )}

                {selectedRequest.adminNotes && (
                  <View style={[styles.detailSection, styles.adminNotes]}>
                    <Text style={styles.detailLabel}>Admin Notes</Text>
                    <Text style={styles.detailText}>{selectedRequest.adminNotes}</Text>
                  </View>
                )}

                {selectedRequest.status === 'cancelled' && (
                  <View style={[styles.detailSection, { borderLeftColor: themeColors.error }]}>
                    <Text style={styles.detailLabel}>Cancellation Details</Text>
                    <Text style={styles.detailText}>
                      Cancelled by {selectedRequest.cancelledBy?.firstName ? `${selectedRequest.cancelledBy.firstName} ${selectedRequest.cancelledBy.lastName}` : 'Admin'}
                    </Text>
                    {selectedRequest.cancelledReason && (
                      <Text style={styles.detailSubtext}>Reason: {selectedRequest.cancelledReason}</Text>
                    )}
                    {selectedRequest.cancelledAt && (
                      <Text style={styles.detailSubtext}>Date: {formatDate(selectedRequest.cancelledAt)}</Text>
                    )}
                  </View>
                )}

                <View style={styles.detailTimeline}>
                  <Text style={styles.detailLabel}>Timeline</Text>
                  <View style={styles.timelineItem}>
                    <Ionicons name="time" size={16} color={themeColors.textSecondary} />
                    <Text style={styles.timelineText}>Created: {formatDate(selectedRequest.createdAt)}</Text>
                  </View>
                  {(selectedRequest.reviewedAt || ['under-review', 'assigned', 'in-progress', 'completed'].includes(selectedRequest.status)) && (
                    <View style={styles.timelineItem}>
                      <Ionicons name="eye" size={16} color={themeColors.primary} />
                      <Text style={styles.timelineText}>Reviewed: {selectedRequest.reviewedAt ? formatDate(selectedRequest.reviewedAt) : 'Updated recently'}</Text>
                    </View>
                  )}
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

                {selectedRequest.completedAt && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Completion Details</Text>
                    <Text style={styles.detailText}>Completed {formatDate(selectedRequest.completedAt)}</Text>
                    {selectedRequest.completedBy && (
                      <Text style={styles.detailSubtext}>By {selectedRequest.completedBy.firstName} {selectedRequest.completedBy.lastName}</Text>
                    )}
                  </View>
                )}

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
  container: roleLayouts.admin.screen,
  queueHeader: { backgroundColor: themeColors.cardBackground, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  queueHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueEyebrow: { color: themeColors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  queueTitle: { color: themeColors.textPrimary, fontSize: 30, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  queueSubtitle: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 3 },
  queueToolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  queueToolPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 43, paddingHorizontal: 16, borderRadius: 14, backgroundColor: themeColors.primary },
  queueToolPrimaryText: { color: 'white', fontSize: 12, fontWeight: '900' },
  queueTool: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 43, paddingHorizontal: 13, borderRadius: 14, backgroundColor: themeColors.accent },
  queueToolText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
  queueProgress: { marginBottom: 10, padding: 12, backgroundColor: themeColors.surfaceTint, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border },
  advancedFilterToggle: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: themeColors.primaryWash, borderWidth: 1, borderColor: themeColors.border },
  advancedFilterToggleText: { color: themeColors.primary, fontSize: 12, fontWeight: '800' },
  activeFilterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: themeColors.warning },
  queueProgressTrack: { height: 9, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', backgroundColor: themeColors.border },
  queueProgressFill: { backgroundColor: themeColors.primary },
  queueProgressPending: { backgroundColor: '#f5d48d' },
  queueProgressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  queueProgressText: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '800' },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  filterGroupLabel: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  clearFiltersText: { color: themeColors.primary, fontSize: 12, fontWeight: '800' },
  emergencyBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, borderRadius: 14, backgroundColor: themeColors.error + '12', borderWidth: 1, borderColor: themeColors.error + '55', marginTop: 12, marginBottom: 4 },
  emergencyTitle: { color: themeColors.error, fontSize: 12, fontWeight: '900' },
  emergencyText: { color: themeColors.error, fontSize: 11, lineHeight: 16, marginTop: 2 },
  cancelledMetadata: { marginTop: 8, padding: 9, borderRadius: 10, backgroundColor: themeColors.error + '10' },
  cancelledMetaText: { color: themeColors.error, fontSize: 11, fontWeight: '700' },
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
  refreshButton: {
    padding: 8,
  },
  archivedButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: themeColors.nav,
    margin: 14,
    borderRadius: 20,
    padding: 10,
  },
  coloredStatCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  coloredStatBgIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  coloredStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  coloredStatLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 8,
    fontWeight: '600',
  },
  listHeaderControls: { paddingBottom: 8 },
  filterContainer: {
    backgroundColor: 'white',
    padding: 0,
  },
  filterMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 8 },
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
    paddingTop: 10,
  },
  requestCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderTopWidth: 4,
    borderTopColor: themeColors.primary,
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
  archiveButton: {
    backgroundColor: themeColors.error,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
  disabledButton: { opacity: 0.5 },
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
