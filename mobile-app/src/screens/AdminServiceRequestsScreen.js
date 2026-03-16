import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const { width, height } = Dimensions.get('window');

const AdminServiceRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [completeDetailsModalVisible, setCompleteDetailsModalVisible] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [user, setUser] = useState(null);

  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    urgentRequests: 0,
    averageRating: 0
  });

  const [reviewForm, setReviewForm] = useState({
    status: 'under-review',
    adminNotes: '',
    estimatedCost: '',
    estimatedCompletion: ''
  });
  
  const [assignForm, setAssignForm] = useState({
    assignedTo: '',
    adminNotes: ''
  });

  const categories = useMemo(() => [
    { id: 'all', label: 'All Categories' },
    { id: 'plumbing', label: 'Plumbing' },
    { id: 'electrical', label: 'Electrical' },
    { id: 'carpentry', label: 'Carpentry' },
    { id: 'cleaning', label: 'Cleaning' },
    { id: 'gardening', label: 'Gardening' },
    { id: 'security', label: 'Security' },
    { id: 'other', label: 'Other' }
  ], []);
  
  const priorities = useMemo(() => [
    { id: 'all', label: 'All Priorities' },
    { id: 'low', label: 'Low' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'High' },
    { id: 'urgent', label: 'Urgent' }
  ], []);
  
  const statusOptions = useMemo(() => [
    { id: 'all', label: 'All', count: 0 },
    { id: 'pending', label: 'Pending', count: 0 },
    { id: 'under-review', label: 'Under Review', count: 0 },
    { id: 'assigned', label: 'Assigned', count: 0 },
    { id: 'in-progress', label: 'In Progress', count: 0 },
    { id: 'completed', label: 'Completed', count: 0 }
  ], []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          const userData = await AsyncStorage.getItem('vims_user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            
            if (isActive) {
              if (parsedUser.role !== 'admin') {
                Alert.alert('Access Denied', 'Only administrators can access this screen');
                navigation.goBack();
                return;
              }
              
              setUser(parsedUser);
              await fetchAllData(parsedUser);
            }
          } else {
            navigation.replace('Login');
          }
        } catch (error) {
          console.error('Error loading data:', error);
          if (isActive) {
            Alert.alert('Error', 'Failed to load data');
          }
        }
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const fetchAllData = async (currentUser = null) => {
    try {
      const userToUse = currentUser || user;
      
      if (!userToUse) return;
      
      setRefreshing(true);
      
      const token = await AsyncStorage.getItem('vims_token');
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        navigation.replace('Login');
        return;
      }

      const requestsResponse = await axios.get(`${API_BASE_URL}/service-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (requestsResponse.data.success) {
        const allRequests = requestsResponse.data.data || [];
        setRequests(allRequests);

        const pendingCount = allRequests.filter(req => 
          req.status === 'pending' || req.status === 'under-review'
        ).length;
        const urgentCount = allRequests.filter(req => req.priority === 'urgent').length;
        
        const ratedRequests = allRequests.filter(req => req.rating);
        const averageRating = ratedRequests.length > 0 
          ? ratedRequests.reduce((sum, req) => sum + req.rating, 0) / ratedRequests.length 
          : 0;
        
        setStats({
          totalRequests: allRequests.length,
          pendingRequests: pendingCount,
          urgentRequests: urgentCount,
          averageRating: parseFloat(averageRating.toFixed(1))
        });
 
        statusOptions.forEach(status => {
          if (status.id !== 'all') {
            status.count = allRequests.filter(req => req.status === status.id).length;
          }
        });
      }

      try {
        const staffResponse = await axios.get(`${API_BASE_URL}/service-requests/admin/staff`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (staffResponse.data.success) {
          setStaffMembers(staffResponse.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        navigation.replace('Login');
        return;
      }
      Alert.alert('Error', 'Failed to fetch data. Please try again.');
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (requests.length > 0) {
      let filtered = [...requests];

      if (activeTab && activeTab !== 'all') {
        filtered = filtered.filter(request => request.status === activeTab);
      }

      if (categoryFilter && categoryFilter !== 'all') {
        filtered = filtered.filter(request => request.category === categoryFilter);
      }

      if (priorityFilter && priorityFilter !== 'all') {
        filtered = filtered.filter(request => request.priority === priorityFilter);
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(request => {
          const residentName = request.residentId 
            ? `${request.residentId.firstName || ''} ${request.residentId.lastName || ''}`.toLowerCase()
            : '';
          
          const title = request.title ? request.title.toLowerCase() : '';
          const description = request.description ? request.description.toLowerCase() : '';
          const houseNumber = request.residentId?.houseNumber ? request.residentId.houseNumber.toLowerCase() : '';
          
          return title.includes(query) ||
                 description.includes(query) ||
                 residentName.includes(query) ||
                 houseNumber.includes(query);
        });
      }
      
      setFilteredRequests(filtered);
    } else {
      setFilteredRequests([]);
    }
  }, [requests, activeTab, categoryFilter, priorityFilter, searchQuery]);
 
  const handleManualRefresh = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      navigation.replace('Login');
      return;
    }
    
    await fetchAllData(user);
  }, [user, navigation]);

  const handleReviewSubmit = async () => {
    if (!selectedRequest?._id) return;
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('vims_token');
      
      const response = await axios.put(
        `${API_BASE_URL}/service-requests/${selectedRequest._id}/review`, 
        reviewForm,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        Alert.alert('Success', 'Request reviewed successfully');
        setReviewModalVisible(false);
        await handleManualRefresh();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to review request');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAssignSubmit = async () => {
    if (!selectedRequest?._id) return;
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('vims_token');
      
      const response = await axios.put(
        `${API_BASE_URL}/service-requests/${selectedRequest._id}/assign-staff`,
        assignForm,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        Alert.alert('Success', 'Request assigned successfully');
        setAssignModalVisible(false);
        await handleManualRefresh();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to assign request');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateStatus = async (status) => {
    if (!selectedRequest?._id) return;
    
    Alert.alert(
      'Confirm Status Change',
      `Are you sure you want to change the status to "${status}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const token = await AsyncStorage.getItem('vims_token');
              
              const response = await axios.put(`${API_BASE_URL}/service-requests/${selectedRequest._id}/status`, { 
                status
              }, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.data.success) {
                Alert.alert('Success', `Request status updated to ${status}`);
                await handleManualRefresh();
                setActionMenuVisible(false);
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to update status');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const handleOpenReview = (request) => {
    setSelectedRequest(request);
    setReviewForm({
      status: request.status === 'pending' ? 'under-review' : request.status,
      adminNotes: request.adminNotes || '',
      estimatedCost: request.estimatedCost || '',
      estimatedCompletion: request.estimatedCompletion 
        ? new Date(request.estimatedCompletion).toISOString().split('T')[0]
        : ''
    });
    setReviewModalVisible(true);
    setActionMenuVisible(false);
  };
  
  const handleOpenAssign = (request) => {
    setSelectedRequest(request);
    setAssignForm({
      assignedTo: request.assignedTo?._id || '',
      adminNotes: request.adminNotes || ''
    });
    setAssignModalVisible(true);
    setActionMenuVisible(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };
  
  const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };
  
  const getPriorityColor = (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    };
    return colors[priority] || '#6b7280';
  };
  
  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      'under-review': '#3b82f6',
      assigned: '#3b82f6',
      'in-progress': '#8b5cf6',
      completed: '#10b981',
      cancelled: '#ef4444',
      rejected: '#dc2626'
    };
    return colors[status] || '#6b7280';
  };
  
  const getStatusIcon = (status) => {
    const icons = {
      pending: 'clock',
      'under-review': 'clipboard-text',
      assigned: 'account-check',
      'in-progress': 'progress-wrench',
      completed: 'check-circle',
      cancelled: 'cancel',
      rejected: 'close-circle'
    };
    return icons[status] || 'help-circle';
  };

  const renderStats = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.totalRequests}</Text>
        <Text style={styles.statLabel}>Total Requests</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.pendingRequests}</Text>
        <Text style={styles.statLabel}>Pending Review</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.urgentRequests}</Text>
        <Text style={styles.statLabel}>Urgent Priority</Text>
      </View>
      <View style={styles.statCard}>
        <View style={styles.ratingStatContainer}>
          <Text style={styles.statValue}>{stats.averageRating.toFixed(1)}</Text>
          <Icon name="star" size={20} color="#f59e0b" style={styles.ratingIcon} />
        </View>
        <Text style={styles.statLabel}>Avg. Rating</Text>
      </View>
    </ScrollView>
  );

  const renderStatusTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
      {statusOptions.map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tabButton,
            activeTab === tab.id && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Text style={[
            styles.tabText,
            activeTab === tab.id && styles.tabTextActive
          ]}>
            {tab.label}
          </Text>
          <View style={styles.tabCount}>
            <Text style={[
              styles.tabCountText,
              activeTab === tab.id && styles.tabCountTextActive
            ]}>
              {tab.id === 'all' ? requests.length : tab.count}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by resident name, title, description, or house number..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      <View style={styles.filterRow}>
        <View style={styles.filterSelect}>
          <TouchableOpacity
            style={styles.filterSelectButton}
            onPress={() => {
              Alert.alert(
                'Select Category',
                '',
                categories.map(category => ({
                  text: category.label,
                  onPress: () => setCategoryFilter(category.id)
                }))
              );
            }}
          >
            <Text style={styles.filterSelectText}>
              {categoryFilter === 'all' ? 'Category' : categories.find(c => c.id === categoryFilter)?.label || categoryFilter}
            </Text>
            <Icon name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterSelect}>
          <TouchableOpacity
            style={styles.filterSelectButton}
            onPress={() => {
              Alert.alert(
                'Select Priority',
                '',
                priorities.map(priority => ({
                  text: priority.label,
                  onPress: () => setPriorityFilter(priority.id)
                }))
              );
            }}
          >
            <Text style={styles.filterSelectText}>
              {priorityFilter === 'all' ? 'Priority' : priorities.find(p => p.id === priorityFilter)?.label || priorityFilter}
            </Text>
            <Icon name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
        
        {(searchQuery || categoryFilter !== 'all' || priorityFilter !== 'all' || activeTab !== 'all') && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setPriorityFilter('all');
              setActiveTab('all');
            }}
          >
            <Icon name="close" size={16} color="#ef4444" />
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
 
  const renderRequestItem = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestIdContainer}>
          <Text style={styles.requestId}>
            #{item._id ? item._id.toString().slice(-6) : 'N/A'}
          </Text>
        </View>
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>
            {item.category?.charAt(0).toUpperCase() + item.category?.slice(1) || 'Unknown'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.requestTitle}>{item.title || 'No title'}</Text>
      
      {item.description && (
        <Text style={styles.requestDescription}>
          {item.description.length > 100 ? `${item.description.substring(0, 100)}...` : item.description}
        </Text>
      )}
      
      <View style={styles.residentInfo}>
        <Icon name="account" size={14} color="#6b7280" />
        <Text style={styles.residentText}>
          {item.residentId?.firstName || ''} {item.residentId?.lastName || ''}
        </Text>
        {item.residentId?.houseNumber && (
          <>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.residentText}>House {item.residentId.houseNumber}</Text>
          </>
        )}
      </View>
      
      {item.location && (
        <View style={styles.locationContainer}>
          <Icon name="map-marker" size={14} color="#6b7280" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
      )}
      
      <View style={styles.requestFooter}>
        <View style={styles.footerRow}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>
              {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : 'Unknown'}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Icon name={getStatusIcon(item.status)} size={14} color="white" />
            <Text style={styles.statusText}>
              {statusOptions.find(s => s.id === item.status)?.label || item.status}
            </Text>
          </View>
        </View>
        
        <View style={styles.footerRow}>
          <Text style={styles.dateText}>{formatShortDate(item.createdAt)}</Text>
          
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={12} color="#f59e0b" />
              <Text style={styles.ratingText}>{item.rating}/5</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedRequest(item);
              setActionMenuVisible(true);
            }}
          >
            <Icon name="dots-vertical" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  
  const renderActionMenu = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={actionMenuVisible}
      onRequestClose={() => setActionMenuVisible(false)}
    >
      <TouchableOpacity
        style={styles.actionMenuOverlay}
        activeOpacity={1}
        onPress={() => setActionMenuVisible(false)}
      >
        <View style={styles.actionMenuContainer}>
          <View style={styles.actionMenuHeader}>
            <Text style={styles.actionMenuTitle}>Request Actions</Text>
            <TouchableOpacity onPress={() => setActionMenuVisible(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.actionMenuContent}>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setActionMenuVisible(false);
                setSelectedRequest(selectedRequest);
                setDetailsModalVisible(true);
              }}
            >
              <Icon name="eye" size={20} color="#3b82f6" />
              <Text style={styles.actionMenuItemText}>Quick View</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setActionMenuVisible(false);
                setSelectedRequest(selectedRequest);
                setCompleteDetailsModalVisible(true);
              }}
            >
              <Icon name="information" size={20} color="#3b82f6" />
              <Text style={styles.actionMenuItemText}>Complete Details</Text>
            </TouchableOpacity>
            
            {selectedRequest?.status === 'pending' && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleOpenReview(selectedRequest)}
              >
                <Icon name="clipboard-text" size={20} color="#f59e0b" />
                <Text style={styles.actionMenuItemText}>Review Request</Text>
              </TouchableOpacity>
            )}
            
            {selectedRequest && ['pending', 'under-review'].includes(selectedRequest.status) && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleOpenAssign(selectedRequest)}
              >
                <Icon name="account-plus" size={20} color="#10b981" />
                <Text style={styles.actionMenuItemText}>Assign to Staff</Text>
              </TouchableOpacity>
            )}
            
            {selectedRequest?.status === 'assigned' && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleUpdateStatus('in-progress')}
              >
                <Icon name="progress-wrench" size={20} color="#8b5cf6" />
                <Text style={styles.actionMenuItemText}>Mark as In Progress</Text>
              </TouchableOpacity>
            )}
            
            {selectedRequest?.status === 'in-progress' && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleUpdateStatus('completed')}
              >
                <Icon name="check-circle" size={20} color="#10b981" />
                <Text style={styles.actionMenuItemText}>Mark as Completed</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderReviewModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={reviewModalVisible}
      onRequestClose={() => setReviewModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Review Service Request</Text>
            <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.formLabel}>Status</Text>
            <View style={styles.statusOptions}>
              {['under-review', 'assigned', 'rejected', 'cancelled'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    reviewForm.status === status && styles.statusOptionSelected
                  ]}
                  onPress={() => setReviewForm(prev => ({...prev, status}))}
                >
                  <Text style={[
                    styles.statusOptionText,
                    reviewForm.status === status && styles.statusOptionTextSelected
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.formLabel}>Admin Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add notes about this request..."
              value={reviewForm.adminNotes}
              onChangeText={(text) => setReviewForm(prev => ({...prev, adminNotes: text}))}
              multiline
              numberOfLines={4}
              placeholderTextColor="#9ca3af"
            />
            
            <Text style={styles.formLabel}>Estimated Cost (₱)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={reviewForm.estimatedCost}
              onChangeText={(text) => setReviewForm(prev => ({...prev, estimatedCost: text}))}
              keyboardType="decimal-pad"
              placeholderTextColor="#9ca3af"
            />
            
            <Text style={styles.formLabel}>Estimated Completion Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={reviewForm.estimatedCompletion}
              onChangeText={(text) => setReviewForm(prev => ({...prev, estimatedCompletion: text}))}
              placeholderTextColor="#9ca3af"
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setReviewModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.actionButton]}
              onPress={handleReviewSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Save Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAssignModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={assignModalVisible}
      onRequestClose={() => setAssignModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign to Staff</Text>
            <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.formLabel}>Staff Member *</Text>
            <View style={styles.staffList}>
              {staffMembers.map(staff => (
                <TouchableOpacity
                  key={staff._id}
                  style={[
                    styles.staffOption,
                    assignForm.assignedTo === staff._id && styles.staffOptionSelected
                  ]}
                  onPress={() => setAssignForm(prev => ({...prev, assignedTo: staff._id}))}
                >
                  <View style={styles.staffInfo}>
                    <Icon name="account" size={20} color="#3b82f6" />
                    <View style={styles.staffDetails}>
                      <Text style={styles.staffName}>
                        {staff.firstName} {staff.lastName}
                      </Text>
                      <Text style={styles.staffRole}>
                        {staff.role}
                      </Text>
                    </View>
                  </View>
                  {assignForm.assignedTo === staff._id && (
                    <Icon name="check-circle" size={20} color="#10b981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.formLabel}>Assignment Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add assignment instructions or notes..."
              value={assignForm.adminNotes}
              onChangeText={(text) => setAssignForm(prev => ({...prev, adminNotes: text}))}
              multiline
              numberOfLines={4}
              placeholderTextColor="#9ca3af"
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setAssignModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.actionButton]}
              onPress={handleAssignSubmit}
              disabled={loading || !assignForm.assignedTo}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Assign Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDetailsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={detailsModalVisible}
      onRequestClose={() => setDetailsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Service Request Details</Text>
            <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {selectedRequest && (
              <>
                <Text style={styles.detailTitle}>{selectedRequest.title || 'No Title'}</Text>
                
                <View style={styles.detailBadges}>
                  <View style={[styles.detailBadge, { backgroundColor: getPriorityColor(selectedRequest.priority) }]}>
                    <Text style={styles.detailBadgeText}>
                      {selectedRequest.priority ? selectedRequest.priority.charAt(0).toUpperCase() + selectedRequest.priority.slice(1) : 'Unknown'}
                    </Text>
                  </View>
                  <View style={[styles.detailBadge, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                    <Icon name={getStatusIcon(selectedRequest.status)} size={14} color="white" />
                    <Text style={styles.detailBadgeText}>
                      {statusOptions.find(s => s.id === selectedRequest.status)?.label || selectedRequest.status}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{selectedRequest.description || 'No description'}</Text>
                
                <Text style={styles.detailLabel}>Resident Information</Text>
                <View style={styles.detailSection}>
                  <Text style={styles.detailText}>
                    {selectedRequest.residentId?.firstName || ''} {selectedRequest.residentId?.lastName || ''}
                  </Text>
                  <Text style={styles.detailSubtext}>
                    House: {selectedRequest.residentId?.houseNumber || 'N/A'}
                  </Text>
                  <Text style={styles.detailSubtext}>
                    Phone: {selectedRequest.residentId?.phone || 'N/A'}
                  </Text>
                  <Text style={styles.detailSubtext}>
                    Email: {selectedRequest.residentId?.email || 'N/A'}
                  </Text>
                </View>
                
                <Text style={styles.detailLabel}>Request Details</Text>
                <View style={styles.detailSection}>
                  {selectedRequest.location && (
                    <Text style={styles.detailText}>📍 {selectedRequest.location}</Text>
                  )}
                  {selectedRequest.estimatedCost > 0 && (
                    <Text style={styles.detailText}>💰 ₱{selectedRequest.estimatedCost}</Text>
                  )}
                  {selectedRequest.estimatedCompletion && (
                    <Text style={styles.detailText}>📅 {formatDate(selectedRequest.estimatedCompletion)}</Text>
                  )}
                </View>
                
                <Text style={styles.detailLabel}>Timeline</Text>
                <View style={styles.detailSection}>
                  <Text style={styles.detailText}>Submitted: {formatDate(selectedRequest.createdAt)}</Text>
                  {selectedRequest.updatedAt && (
                    <Text style={styles.detailSubtext}>Last Updated: {formatDate(selectedRequest.updatedAt)}</Text>
                  )}
                  {selectedRequest.completedAt && (
                    <Text style={[styles.detailSubtext, { color: '#10b981' }]}>
                      Completed: {formatDate(selectedRequest.completedAt)}
                    </Text>
                  )}
                </View>
                
                {selectedRequest.adminNotes && (
                  <>
                    <Text style={styles.detailLabel}>Admin Notes</Text>
                    <View style={styles.adminNotesContainer}>
                      <Text style={styles.adminNotesText}>{selectedRequest.adminNotes}</Text>
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCompleteDetailsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={completeDetailsModalVisible}
      onRequestClose={() => setCompleteDetailsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Complete Request Details - #{selectedRequest?._id ? selectedRequest._id.toString().slice(-6) : 'N/A'}
            </Text>
            <TouchableOpacity onPress={() => setCompleteDetailsModalVisible(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {selectedRequest && (
              <>
                <Text style={styles.completeTitle}>{selectedRequest.title || 'No Title'}</Text>
                
                <View style={styles.completeBadges}>
                  <View style={[styles.completeBadge, { backgroundColor: getPriorityColor(selectedRequest.priority) }]}>
                    <Text style={styles.completeBadgeText}>
                      {selectedRequest.priority ? selectedRequest.priority.charAt(0).toUpperCase() + selectedRequest.priority.slice(1) : 'Unknown'}
                    </Text>
                  </View>
                  <View style={[styles.completeBadge, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                    <Icon name={getStatusIcon(selectedRequest.status)} size={14} color="white" />
                    <Text style={styles.completeBadgeText}>
                      {statusOptions.find(s => s.id === selectedRequest.status)?.label || selectedRequest.status}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.completeSectionTitle}>Description</Text>
                <View style={styles.completeSection}>
                  <Text style={styles.completeText}>{selectedRequest.description || 'No description'}</Text>
                </View>
                
                <Text style={styles.completeSectionTitle}>Resident Information</Text>
                <View style={styles.completeSection}>
                  <View style={styles.completeRow}>
                    <Text style={styles.completeLabel}>Name:</Text>
                    <Text style={styles.completeValue}>
                      {selectedRequest.residentId?.firstName || ''} {selectedRequest.residentId?.lastName || ''}
                    </Text>
                  </View>
                  <View style={styles.completeRow}>
                    <Text style={styles.completeLabel}>House:</Text>
                    <Text style={styles.completeValue}>{selectedRequest.residentId?.houseNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.completeRow}>
                    <Text style={styles.completeLabel}>Phone:</Text>
                    <Text style={styles.completeValue}>{selectedRequest.residentId?.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.completeRow}>
                    <Text style={styles.completeLabel}>Email:</Text>
                    <Text style={styles.completeValue}>{selectedRequest.residentId?.email || 'N/A'}</Text>
                  </View>
                </View>
                
                <Text style={styles.completeSectionTitle}>Request Details</Text>
                <View style={styles.completeSection}>
                  {selectedRequest.location && (
                    <View style={styles.completeRow}>
                      <Text style={styles.completeLabel}>Location:</Text>
                      <Text style={styles.completeValue}>{selectedRequest.location}</Text>
                    </View>
                  )}
                  {selectedRequest.estimatedCost > 0 && (
                    <View style={styles.completeRow}>
                      <Text style={styles.completeLabel}>Est. Cost:</Text>
                      <Text style={styles.completeValue}>₱{selectedRequest.estimatedCost}</Text>
                    </View>
                  )}
                  {selectedRequest.estimatedCompletion && (
                    <View style={styles.completeRow}>
                      <Text style={styles.completeLabel}>Est. Completion:</Text>
                      <Text style={styles.completeValue}>{formatDate(selectedRequest.estimatedCompletion)}</Text>
                    </View>
                  )}
                </View>
                
                {selectedRequest.assignedTo && (
                  <>
                    <Text style={styles.completeSectionTitle}>Assignment Details</Text>
                    <View style={styles.completeSection}>
                      <View style={styles.completeRow}>
                        <Text style={styles.completeLabel}>Assigned To:</Text>
                        <Text style={styles.completeValue}>
                          {selectedRequest.assignedTo.firstName} {selectedRequest.assignedTo.lastName}
                        </Text>
                      </View>
                      <View style={styles.completeRow}>
                        <Text style={styles.completeLabel}>Role:</Text>
                        <Text style={styles.completeValue}>{selectedRequest.assignedTo.role}</Text>
                      </View>
                      {selectedRequest.assignedAt && (
                        <View style={styles.completeRow}>
                          <Text style={styles.completeLabel}>Assigned On:</Text>
                          <Text style={styles.completeValue}>{formatDate(selectedRequest.assignedAt)}</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
                
                {selectedRequest.completedAt && (
                  <>
                    <Text style={styles.completeSectionTitle}>Completion Details</Text>
                    <View style={styles.completeSection}>
                      <View style={styles.completeRow}>
                        <Text style={styles.completeLabel}>Completed On:</Text>
                        <Text style={styles.completeValue}>{formatDate(selectedRequest.completedAt)}</Text>
                      </View>
                      {selectedRequest.completedBy && (
                        <View style={styles.completeRow}>
                          <Text style={styles.completeLabel}>Completed By:</Text>
                          <Text style={styles.completeValue}>
                            {selectedRequest.completedBy.firstName} {selectedRequest.completedBy.lastName}
                          </Text>
                        </View>
                      )}
                      {selectedRequest.rating && (
                        <View style={styles.completeRow}>
                          <Text style={styles.completeLabel}>Rating:</Text>
                          <View style={styles.ratingStars}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Icon
                                key={star}
                                name={star <= selectedRequest.rating ? 'star' : 'star-outline'}
                                size={16}
                                color="#f59e0b"
                              />
                            ))}
                            <Text style={styles.ratingText}> ({selectedRequest.rating}/5)</Text>
                          </View>
                        </View>
                      )}
                      {selectedRequest.feedback && (
                        <View style={styles.completeRow}>
                          <Text style={styles.completeLabel}>Feedback:</Text>
                          <Text style={styles.completeValue}>{selectedRequest.feedback}</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
                
                {selectedRequest.adminNotes && (
                  <>
                    <Text style={styles.completeSectionTitle}>Admin Notes</Text>
                    <View style={[styles.completeSection, styles.adminNotesSection]}>
                      <Text style={styles.adminNotesText}>{selectedRequest.adminNotes}</Text>
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setCompleteDetailsModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Admin - Service Requests Management</Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={handleManualRefresh}
        disabled={refreshing}
      >
        <Icon 
          name="refresh" 
          size={24} 
          color={refreshing ? '#9ca3af' : 'white'} 
        />
      </TouchableOpacity>
    </View>
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#10b981" barStyle="light-content" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading admin dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#10b981" barStyle="light-content" />
  
      {renderHeader()}

      {renderStats()}

      <View style={styles.filterSection}>
        <Text style={styles.filterSectionTitle}>Service Requests Management</Text>
        {renderFilters()}
      </View>

      {renderStatusTabs()}
 
      {filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="toolbox" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>
            {requests.length === 0 
              ? "No service requests have been submitted yet."
              : "No requests match your current filters."}
          </Text>
          {(searchQuery || categoryFilter !== 'all' || priorityFilter !== 'all' || activeTab !== 'all') && (
            <TouchableOpacity
              style={[styles.emptyButton, styles.clearEmptyButton]}
              onPress={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setPriorityFilter('all');
                setActiveTab('all');
              }}
            >
              <Text style={styles.emptyButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={renderRequestItem}
          keyExtractor={item => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleManualRefresh}
              colors={['#10b981']}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>
                Service Requests ({filteredRequests.length})
                {filteredRequests.length !== requests.length && (
                  <Text style={styles.listHeaderSubtitle}>
                    {' '}(filtered from {requests.length} total)
                  </Text>
                )}
              </Text>
            </View>
          }
        />
      )}

      {renderActionMenu()}
      {renderReviewModal()}
      {renderAssignModal()}
      {renderDetailsModal()}
      {renderCompleteDetailsModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  ratingStatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    marginLeft: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  filterSection: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterSelect: {
    flex: 1,
  },
  filterSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  filterSelectText: {
    fontSize: 14,
    color: '#6b7280',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#dc2626',
    marginLeft: 6,
    fontWeight: '600',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  tabButtonActive: {
    backgroundColor: '#10b981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: 'white',
  },
  tabCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabCountText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  tabCountTextActive: {
    color: 'white',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  listContainer: {
    paddingBottom: 16,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestIdContainer: {
    flex: 1,
  },
  requestId: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  categoryContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  categoryText: {
    fontSize: 12,
    color: '#6b7280',
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  residentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  residentText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    marginRight: 8,
  },
  separator: {
    fontSize: 12,
    color: '#9ca3af',
    marginHorizontal: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  requestFooter: {
    marginTop: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#f59e0b',
    marginLeft: 4,
    fontWeight: '600',
  },
  actionButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  clearEmptyButton: {
    backgroundColor: '#ef4444',
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#10b981',
    marginLeft: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  statusOptionSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusOptionTextSelected: {
    color: 'white',
  },
  staffList: {
    marginBottom: 16,
  },
  staffOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  staffOptionSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffDetails: {
    marginLeft: 12,
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  staffRole: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  detailBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  detailSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  detailSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  adminNotesContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  adminNotesText: {
    fontSize: 14,
    color: '#0369a1',
    fontStyle: 'italic',
  },
  completeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  completeBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  completeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  completeSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
  },
  completeSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  completeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  completeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    width: 120,
  },
  completeValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  completeText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  adminNotesSection: {
    backgroundColor: '#f0f9ff',
  },
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: '80%',
  },
  actionMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  actionMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  actionMenuContent: {
    maxHeight: 400,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionMenuItemText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
});

export default AdminServiceRequestsScreen;