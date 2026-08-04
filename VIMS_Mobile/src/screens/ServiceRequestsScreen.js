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
import { Picker } from '@react-native-picker/picker';
import { themeColors, radii, shadows, roleLayouts } from '../utils/theme';
import api from '../utils/api';
import { format } from 'date-fns';
import UserDropdownMenu from '../components/UserDropdownMenu';

const ServiceRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingRequestId, setRatingRequestId] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    priority: 'medium',
    location: '',
  });

  const [formErrors, setFormErrors] = useState({});

  const categories = [
    { value: 'plumbing', label: 'Plumbing', icon: 'water', priority: 'urgent' },
    { value: 'electrical', label: 'Electrical', icon: 'flash', priority: 'urgent' },
    { value: 'carpentry', label: 'Carpentry', icon: 'hammer', priority: 'medium' },
    { value: 'cleaning', label: 'Cleaning', icon: 'brush', priority: 'low' },
    { value: 'gardening', label: 'Gardening', icon: 'leaf', priority: 'low' },
    { value: 'security', label: 'Security', icon: 'shield', priority: 'urgent' },
    { value: 'complaint', label: 'Complaint', icon: 'chatbox-ellipses', priority: 'medium' },
    { value: 'other', label: 'Other', icon: 'apps', priority: 'medium' },
  ];

  const priorityColors = {
    low: themeColors.success,
    medium: themeColors.warning,
    high: themeColors.error,
    urgent: themeColors.error,
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/service-requests/my');
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch service requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleInputChange = (field, value) => {
    if (field === 'category') {
      const category = categories.find(c => c.value === value);
      setFormData(prev => ({
        ...prev,
        category: value,
        priority: category?.priority || 'medium',
      }));
    } else if (field === 'title') {
      // Prevent numbers in title
      const filtered = value.replace(/[0-9]/g, '');
      setFormData(prev => ({ ...prev, [field]: filtered }));
      if (filtered !== value) {
        Alert.alert('Info', 'Title cannot contain numbers');
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRequest = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/service-requests', formData);
      if (response.data.success) {
        Alert.alert('Success', 'Service request created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchRequests();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      title: '',
      description: '',
      priority: 'medium',
      location: '',
    });
    setFormErrors({});
  };

  const handleCancelRequest = async (requestId) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.put(`/service-requests/${requestId}/status`, { status: 'cancelled' });
              if (response.data.success) {
                Alert.alert('Success', 'Request cancelled');
                fetchRequests();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  const handleRateService = async (requestId) => {
    setRatingRequestId(requestId);
    setRatingValue(0);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async () => {
    if (ratingValue < 1 || ratingValue > 5) {
      Alert.alert('Error', 'Please select a rating between 1 and 5');
      return;
    }
    
    try {
      const response = await api.put(`/service-requests/${ratingRequestId}/rate`, { rating: ratingValue });
      if (response.data.success) {
        Alert.alert('Success', 'Thank you for your feedback');
        setShowRatingModal(false);
        setRatingRequestId(null);
        setRatingValue(0);
        fetchRequests();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    }
  };

  const getStatusChip = (status) => {
    const config = {
      pending: { label: 'Pending', color: themeColors.warning, icon: 'time' },
      'under-review': { label: 'Under Review', color: themeColors.info, icon: 'eye' },
      assigned: { label: 'Assigned', color: themeColors.primary, icon: 'person' },
      'in-progress': { label: 'In Progress', color: themeColors.info, icon: 'construct' },
      completed: { label: 'Completed', color: themeColors.success, icon: 'checkmark-circle' },
      cancelled: { label: 'Cancelled', color: themeColors.error, icon: 'close-circle' },
      rejected: { label: 'Rejected', color: themeColors.error, icon: 'close-circle' },
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

  const getFilteredRequests = () => {
    return requests.filter(request => {
      const tabMatches = activeTab === 'all'
        || (activeTab === 'pending' && ['pending', 'under-review'].includes(request.status))
        || (activeTab === 'in-progress' && ['assigned', 'in-progress'].includes(request.status))
        || request.status === activeTab;
      const query = searchQuery.trim().toLowerCase();
      const searchMatches = !query || [request.title, request.description, request.location, request.category].filter(Boolean).join(' ').toLowerCase().includes(query);
      return tabMatches
        && searchMatches
        && (categoryFilter === 'all' || request.category === categoryFilter)
        && (priorityFilter === 'all' || request.priority === priorityFilter);
    });
  };
  const filteredRequests = getFilteredRequests();
  const paginatedRequests = filteredRequests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  useEffect(() => {
    setPage(0);
  }, [activeTab, searchQuery, categoryFilter, priorityFilter, rowsPerPage]);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => ['pending', 'under-review'].includes(r.status)).length,
    inProgress: requests.filter(r => ['assigned', 'in-progress'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  const renderRequestCard = ({ item }) => {
    const status = getStatusChip(item.status);
    const category = categories.find(c => c.value === item.category);

    return (
      <TouchableOpacity
        style={[styles.requestCard, shadows.small]}
        onPress={() => {
          setSelectedRequest(item);
          setShowDetailsModal(true);
        }}
      >
        <View style={styles.requestHeader}>
          <View style={styles.categoryIcon}>
            <Ionicons name={category?.icon || 'apps'} size={24} color={themeColors.primary} />
          </View>
          <View style={styles.requestInfo}>
            <Text style={styles.requestTitle}>{item.title}</Text>
            <Text style={styles.requestCategory}>{category?.label || item.category}</Text>
          </View>
        </View>

        <Text style={styles.requestDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.requestMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={14} color={themeColors.textSecondary} />
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
          </View>
          {item.location ? (
            <View style={styles.metaItem}>
              <Ionicons name="location" size={14} color={themeColors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.requestFooter}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColors[item.priority] + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColors[item.priority] }]}>
              {item.priority?.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          {item.rating ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={themeColors.warning} />
              <Text style={styles.ratingText}>{item.rating}/5</Text>
            </View>
          ) : null}
        </View>

        {item.status === 'completed' && !item.rating && (
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => handleRateService(item._id)}
          >
            <Ionicons name="star" size={16} color={themeColors.warning} />
            <Text style={styles.rateButtonText}>Rate Service</Text>
          </TouchableOpacity>
        )}

        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelRequest(item._id)}
          >
            <Ionicons name="close-circle" size={16} color={themeColors.error} />
            <Text style={styles.cancelButtonText}>Cancel Request</Text>
          </TouchableOpacity>
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
  <View style={styles.headerTitleWrap}>
    <Text style={styles.headerEyebrow}>COMMUNITY SUPPORT</Text>
    <Text style={styles.headerTitle}>Service Requests</Text>
    <Text style={styles.headerSubtitle}>Report, follow up and rate completed work</Text>
  </View>
  <View style={styles.headerRight}>
    <TouchableOpacity onPress={fetchRequests} style={styles.refreshButton}>
      <Ionicons name="refresh" size={16} color="white" />
      <Text style={styles.headerActionText}>Refresh</Text>
    </TouchableOpacity>
    <UserDropdownMenu navigation={navigation} />
  </View>
</View>

      <View style={styles.statsGrid}>
        <View style={[styles.coloredStatCard, { backgroundColor: themeColors.nav }]}>
          <View style={styles.statCardHighlight} />
          <Ionicons name="build-outline" style={styles.coloredStatBgIcon} />
          <Text style={styles.coloredStatValue}>{stats.total}</Text>
          <Text style={styles.coloredStatLabel}>Total</Text>
        </View>
        <View style={[styles.coloredStatCard, { backgroundColor: themeColors.nav }]}>
          <View style={styles.statCardHighlight} />
          <Ionicons name="time-outline" style={styles.coloredStatBgIcon} />
          <Text style={styles.coloredStatValue}>{stats.pending}</Text>
          <Text style={styles.coloredStatLabel}>Pending</Text>
        </View>
        <View style={[styles.coloredStatCard, { backgroundColor: themeColors.nav }]}>
          <View style={styles.statCardHighlight} />
          <Ionicons name="cog-outline" style={styles.coloredStatBgIcon} />
          <Text style={styles.coloredStatValue}>{stats.inProgress}</Text>
          <Text style={styles.coloredStatLabel}>In Progress</Text>
        </View>
        <View style={[styles.coloredStatCard, { backgroundColor: themeColors.nav }]}>
          <View style={styles.statCardHighlight} />
          <Ionicons name="checkmark-circle-outline" style={styles.coloredStatBgIcon} />
          <Text style={styles.coloredStatValue}>{stats.completed}</Text>
          <Text style={styles.coloredStatLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <ScrollableTab
          tabs={[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'pending', label: 'Pending', count: stats.pending },
            { key: 'in-progress', label: 'In Progress', count: stats.inProgress },
            { key: 'completed', label: 'Completed', count: stats.completed },
          ]}
          activeTab={activeTab}
          onTabPress={setActiveTab}
        />
      </View>

      <View style={styles.directorySearchRow}>
        <View style={styles.directorySearch}>
          <Ionicons name="search" size={19} color={themeColors.textSecondary} />
          <TextInput style={styles.directorySearchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search requests..." />
        </View>
        <TouchableOpacity style={[styles.directoryFilterButton, (categoryFilter !== 'all' || priorityFilter !== 'all') && styles.directoryFilterActive]} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="options-outline" size={20} color={(categoryFilter !== 'all' || priorityFilter !== 'all') ? 'white' : themeColors.primaryDeep} />
          <Text style={[styles.directoryFilterText, (categoryFilter !== 'all' || priorityFilter !== 'all') && styles.directoryFilterTextActive]}>Filter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={paginatedRequests}
        renderItem={renderRequestCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="build" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No service requests</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'all'
                ? "You haven't submitted any service requests yet"
                : `No ${activeTab} service requests found`}
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Create Request</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={filteredRequests.length > rowsPerPage ? (
          <View style={styles.pagination}>
            <TouchableOpacity disabled={page === 0} style={[styles.pageButton, page === 0 && styles.pageDisabled]} onPress={() => setPage(value => Math.max(0, value - 1))}><Text style={styles.pageButtonText}>Previous</Text></TouchableOpacity>
            <Text style={styles.pageText}>{page + 1} / {Math.ceil(filteredRequests.length / rowsPerPage)}</Text>
            <TouchableOpacity disabled={(page + 1) * rowsPerPage >= filteredRequests.length} style={[styles.pageButton, (page + 1) * rowsPerPage >= filteredRequests.length && styles.pageDisabled]} onPress={() => setPage(value => value + 1)}><Text style={styles.pageButtonText}>Next</Text></TouchableOpacity>
          </View>
        ) : null}
      />

      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Filter Requests</Text><TouchableOpacity onPress={() => setShowFilterModal(false)}><Ionicons name="close" size={24} color={themeColors.textPrimary} /></TouchableOpacity></View>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}><Picker selectedValue={categoryFilter} onValueChange={setCategoryFilter} style={styles.picker}><Picker.Item label="All categories" value="all" />{categories.map(item => <Picker.Item key={item.value} label={item.label} value={item.value} />)}</Picker></View>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.pickerContainer}><Picker selectedValue={priorityFilter} onValueChange={setPriorityFilter} style={styles.picker}><Picker.Item label="All priorities" value="all" />{['low', 'medium', 'high', 'urgent'].map(value => <Picker.Item key={value} label={value[0].toUpperCase() + value.slice(1)} value={value} />)}</Picker></View>
            <Text style={styles.label}>Requests per page</Text>
            <View style={styles.rowsSelector}>{[5, 10, 25].map(value => <TouchableOpacity key={value} style={[styles.rowChoice, rowsPerPage === value && styles.rowChoiceActive]} onPress={() => setRowsPerPage(value)}><Text style={[styles.rowChoiceText, rowsPerPage === value && styles.rowChoiceTextActive]}>{value}</Text></TouchableOpacity>)}</View>
            <View style={styles.modalActions}><TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setCategoryFilter('all'); setPriorityFilter('all'); }}><Text style={styles.cancelButtonText}>Reset</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={() => setShowFilterModal(false)}><Text style={styles.submitButtonText}>Show Results</Text></TouchableOpacity></View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.fabText}>New Request</Text>
      </TouchableOpacity>

      {/* Create Request Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Service Request</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <View style={[styles.inputContainer, formErrors.category && styles.inputError]}>
                <Ionicons name="apps" size={20} color={themeColors.textSecondary} />
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a category" value="" />
                  {categories.map(cat => (
                    <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                  ))}
                </Picker>
              </View>
              {formErrors.category ? <Text style={styles.errorText}>{formErrors.category}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <View style={[styles.inputContainer, formErrors.title && styles.inputError]}>
                <Ionicons name="document-text" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) => handleInputChange('title', text)}
                  placeholder="Brief title (no numbers)"
                />
              </View>
              {formErrors.title ? <Text style={styles.errorText}>{formErrors.title}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <View style={[styles.inputContainer, formErrors.description && styles.inputError]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => handleInputChange('description', text)}
                  placeholder="Detailed description of the issue"
                  multiline
                  numberOfLines={4}
                />
              </View>
              {formErrors.description ? <Text style={styles.errorText}>{formErrors.description}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location (Optional)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={formData.location}
                  onChangeText={(text) => handleInputChange('location', text)}
                  placeholder="Specific location if different from your address"
                />
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={themeColors.info} />
              <Text style={styles.infoText}>
                Priority is automatically set based on category: 
                Plumbing, Electrical, Security = Urgent | Carpentry = Medium | Cleaning, Gardening = Low
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleCreateRequest}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Details</Text>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedRequest && (
              <View>
                <Text style={styles.detailTitle}>{selectedRequest.title}</Text>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: getStatusChip(selectedRequest.status).color + '20',
                    alignSelf: 'flex-start',
                  }]}>
                    <Ionicons name={getStatusChip(selectedRequest.status).icon} size={16} color={getStatusChip(selectedRequest.status).color} />
                    <Text style={[styles.statusText, { color: getStatusChip(selectedRequest.status).color }]}>
                      {getStatusChip(selectedRequest.status).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailText}>{selectedRequest.description}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>{selectedRequest.category}</Text>
                  </View>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Priority</Text>
                    <Text style={[styles.detailValue, { color: priorityColors[selectedRequest.priority] }]}>
                      {selectedRequest.priority?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {selectedRequest.location ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailText}>{selectedRequest.location}</Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <View style={styles.detailHalf}>
                    <Text style={styles.detailLabel}>Created</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedRequest.createdAt)}</Text>
                  </View>
                  {selectedRequest.completedAt ? (
                    <View style={styles.detailHalf}>
                      <Text style={styles.detailLabel}>Completed</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedRequest.completedAt)}</Text>
                    </View>
                  ) : null}
                </View>

                {selectedRequest.assignedTo && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Assigned To</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequest.assignedTo.firstName} {selectedRequest.assignedTo.lastName}
                    </Text>
                  </View>
                )}

                {selectedRequest.adminNotes && (
                  <View style={[styles.detailSection, styles.adminNotes]}>
                    <Text style={styles.detailLabel}>Admin Notes</Text>
                    <Text style={styles.detailText}>{selectedRequest.adminNotes}</Text>
                  </View>
                )}

                {selectedRequest.rating && (
                  <View style={styles.ratingSection}>
                    <Ionicons name="star" size={20} color={themeColors.warning} />
                    <Text style={styles.ratingText}>Your rating: {selectedRequest.rating}/5</Text>
                    {selectedRequest.feedback && (
                      <Text style={styles.feedbackText}>"{selectedRequest.feedback}"</Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.ratingModalOverlay}>
          <View style={styles.ratingModalContainer}>
            <View style={styles.ratingModalHeader}>
              <Text style={styles.ratingModalTitle}>Rate Service</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingModalContent}>
              <Text style={styles.ratingModalText}>
                How would you rate the quality of service provided?
              </Text>
              
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRatingValue(star)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= ratingValue ? "star" : "star-outline"}
                      size={40}
                      color={star <= ratingValue ? themeColors.warning : themeColors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {ratingValue > 0 && (
                <Text style={styles.ratingValueText}>
                  {ratingValue} star{ratingValue > 1 ? 's' : ''}
                </Text>
              )}
            </View>

            <View style={styles.ratingModalActions}>
              <TouchableOpacity
                style={styles.ratingCancelButton}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.ratingCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.ratingSubmitButton, ratingValue === 0 && styles.ratingSubmitDisabled]}
                onPress={handleSubmitRating}
                disabled={ratingValue === 0}
              >
                <Text style={styles.ratingSubmitText}>Submit Rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Simple Scrollable Tab Component
const ScrollableTab = ({ tabs, activeTab, onTabPress }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollableTabs}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => onTabPress(tab.key)}
        >
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
            {tab.label}
          </Text>
          <View style={[styles.tabBadge, activeTab === tab.key && styles.activeTabBadge]}>
            <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.activeTabBadgeText]}>
              {tab.count}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  directorySearchRow: { flexDirection: 'row', gap: 9, paddingHorizontal: 20, paddingBottom: 12 },
  directorySearch: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: themeColors.border, backgroundColor: 'white' },
  directorySearchInput: { flex: 1, color: themeColors.textPrimary },
  directoryFilterButton: { height: 46, minWidth: 82, paddingHorizontal: 12, borderRadius: 13, backgroundColor: themeColors.primarySoft, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  directoryFilterActive: { backgroundColor: themeColors.primaryDeep },
  directoryFilterText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
  directoryFilterTextActive: { color: 'white' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  pageButton: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: themeColors.primarySoft, borderRadius: 10 },
  pageDisabled: { opacity: 0.35 },
  pageButtonText: { color: themeColors.primaryDeep, fontWeight: '800', fontSize: 12 },
  pageText: { color: themeColors.textSecondary, fontWeight: '700', fontSize: 12 },
  filterSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  rowsSelector: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  rowChoice: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10, backgroundColor: '#f1f5f9' },
  rowChoiceActive: { backgroundColor: themeColors.primaryDeep },
  rowChoiceText: { color: themeColors.textSecondary, fontWeight: '800' },
  rowChoiceTextActive: { color: 'white' },
  container: roleLayouts.resident.screen,
  header: {
    ...roleLayouts.resident.header,
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
  headerTitleWrap: { flex: 1, marginHorizontal: 6 },
  headerEyebrow: { color: '#fbbf24', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  headerTitle: {
    color: 'white',
    fontSize: 21,
    fontWeight: '900',
  },
  headerSubtitle: { color: 'rgba(255,255,255,0.66)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  headerActionText: { color: 'white', fontSize: 12, fontWeight: '800' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: themeColors.nav,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  coloredStatCard: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: radii.lg,
    padding: 13,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statCardHighlight: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  coloredStatBgIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
  },
  coloredStatValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  coloredStatLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    fontWeight: '600',
  },
  tabContainer: {
    backgroundColor: 'transparent',
  },
  scrollableTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: radii.md,
    backgroundColor: themeColors.cardBackground,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  activeTab: {
    backgroundColor: themeColors.primary + '15',
  },
  tabLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginRight: 6,
  },
  activeTabLabel: {
    color: themeColors.primary,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: themeColors.textSecondary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeTabBadge: {
    backgroundColor: themeColors.primary + '30',
  },
  tabBadgeText: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  activeTabBadgeText: {
    color: themeColors.primary,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  requestCard: {
    backgroundColor: roleLayouts.resident.card.backgroundColor,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    ...shadows.small,
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeColors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  requestCategory: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  requestDescription: {
    fontSize: 14,
    color: themeColors.textPrimary,
    marginBottom: 12,
    lineHeight: 20,
  },
  requestMeta: {
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginLeft: 4,
  },
  requestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '600',
    color: themeColors.warning,
    marginLeft: 4,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.warning + '15',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.warning,
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.error + '15',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.error,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    minWidth: 146,
    height: 56,
    borderRadius: 28,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { color: 'white', fontSize: 13, fontWeight: '900' },
  emptyContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 24,
    margin: 16,
    borderRadius: 20,
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
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: themeColors.textPrimary,
    marginLeft: 8,
  },
  inputError: {
    borderColor: themeColors.error,
  },
  errorText: {
    color: themeColors.error,
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  picker: {
    flex: 1,
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: themeColors.info + '15',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: themeColors.info + '30',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: themeColors.info,
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 40,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: themeColors.primary,
    marginLeft: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 16,
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
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailHalf: {
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  adminNotes: {
    backgroundColor: themeColors.info + '10',
    padding: 12,
    borderRadius: 8,
  },
  ratingSection: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: themeColors.warning + '10',
    borderRadius: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingModalContainer: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    ...shadows.medium,
  },
  ratingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  ratingModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  ratingModalContent: {
    padding: 24,
    alignItems: 'center',
  },
  ratingModalText: {
    fontSize: 16,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  ratingValueText: {
    fontSize: 16,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  ratingModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  ratingCancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
  },
  ratingCancelText: {
    fontSize: 16,
    color: themeColors.textSecondary,
    fontWeight: '600',
  },
  ratingSubmitButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
  },
  ratingSubmitDisabled: {
    backgroundColor: themeColors.textSecondary,
  },
  ratingSubmitText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default ServiceRequestsScreen;
