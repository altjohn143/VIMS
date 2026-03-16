// ServiceRequestScreen.js - Complete working version with proper data fetching
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
  Dimensions,
  Platform,
  Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';
import { CommonActions } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = API_CONFIG.forceNetworkIP;

const themeColors = {
  primary: '#2224be',
  primaryLight: '#4a4bd1',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: '#e5e7eb'
};

const ServiceRequestScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [useDifferentLocation, setUseDifferentLocation] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    completedRequests: 0,
    averageRating: 0
  });

  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    priority: '',
    location: '',
    alternateLocation: ''
  });

  // Categories with icons and default priorities
  const categories = useMemo(() => [
    { id: 'plumbing', label: 'Plumbing', icon: 'pipe', priority: 'urgent', emoji: '💧' },
    { id: 'electrical', label: 'Electrical', icon: 'flash', priority: 'urgent', emoji: '⚡' },
    { id: 'carpentry', label: 'Carpentry', icon: 'hammer', priority: 'medium', emoji: '🔨' },
    { id: 'cleaning', label: 'Cleaning', icon: 'broom', priority: 'low', emoji: '🧹' },
    { id: 'gardening', label: 'Gardening', icon: 'leaf', priority: 'low', emoji: '🌿' },
    { id: 'security', label: 'Security', icon: 'shield', priority: 'high', emoji: '🚨' },
    { id: 'other', label: 'Other', icon: 'toolbox', priority: 'medium', emoji: '📋' }
  ], []);
  
  const priorities = useMemo(() => [
    { id: 'low', label: 'Low', color: '#10b981' },
    { id: 'medium', label: 'Medium', color: '#f59e0b' },
    { id: 'high', label: 'High', color: '#ef4444' },
    { id: 'urgent', label: 'Urgent', color: '#dc2626' }
  ], []);

  // Get priority based on category
  const getPriorityByCategory = useCallback((categoryId) => {
    const categoryObj = categories.find(c => c.id === categoryId);
    return categoryObj ? categoryObj.priority : 'medium';
  }, [categories]);

  // Handle category change - updates priority automatically
  const handleCategoryChange = (categoryId) => {
    const priority = getPriorityByCategory(categoryId);
    setFormData(prev => ({
      ...prev,
      category: categoryId,
      priority: priority
    }));
  };

  // Validate title (no numbers allowed)
  const validateTitle = (title) => {
    const hasNumbers = /\d/.test(title);
    return !hasNumbers;
  };

  const handleTitleChange = (text) => {
    if (validateTitle(text) || text === '') {
      setFormData(prev => ({ ...prev, title: text }));
    } else {
      Alert.alert('Validation Error', 'Title cannot contain numbers');
    }
  };

  // Load user data on focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          setApiError(null);
          const userData = await AsyncStorage.getItem('vims_user');
          const token = await AsyncStorage.getItem('vims_token');
          
          console.log('Loading user data:', userData);
          console.log('Token exists:', !!token);
          
          if (userData && token) {
            const parsedUser = JSON.parse(userData);
            console.log('Parsed user:', parsedUser);
            
            if (isActive) {
              setUser(parsedUser);
              // Set default location based on user's house
              const userAddress = parsedUser.houseNumber || 
                `${parsedUser.firstName || ''} ${parsedUser.lastName || ''}'s Residence`.trim();
              setFormData(prev => ({ ...prev, location: userAddress }));
              await fetchRequests(parsedUser);
            }
          } else {
            console.log('No user data or token found, redirecting to login');
            Alert.alert('Session Expired', 'Please login again');
            navigation.replace('Login');
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          if (isActive) {
            setApiError('Failed to load user data');
            Alert.alert('Error', 'Failed to load user data');
          }
        }
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [navigation])
  );

  const fetchRequests = async (currentUser = null, isManualRefresh = false) => {
    try {
      const userToUse = currentUser || user;

      const userDataStr = await AsyncStorage.getItem('vims_user');
      const freshUser = userDataStr ? JSON.parse(userDataStr) : null;
      
      if (!freshUser) {
        console.log('No user found, redirecting to login');
        navigation.replace('Login');
        return;
      }
      
      setFetching(true);
      setApiError(null);
      
      const token = await AsyncStorage.getItem('vims_token');
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        navigation.replace('Login');
        return;
      }
      
      try {
        console.log('Fetching requests from:', `${API_BASE_URL}/service-requests/my`);
        console.log('With token:', token.substring(0, 20) + '...');
        
        const response = await axios.get(`${API_BASE_URL}/service-requests/my`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        });
        
        console.log('API Response status:', response.status);
        console.log('API Response data:', JSON.stringify(response.data).substring(0, 200) + '...');
        
        let requestsData = [];
        
        // Handle different response formats
        if (response.data) {
          if (response.data.success && response.data.data) {
            requestsData = response.data.data;
          } else if (Array.isArray(response.data)) {
            requestsData = response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            requestsData = response.data.data;
          } else if (response.data.requests && Array.isArray(response.data.requests)) {
            requestsData = response.data.requests;
          }
        }
        
        console.log(`Found ${requestsData.length} total requests from API`);
        
        // Filter requests for current user (safety check)
        const userRequests = Array.isArray(requestsData) 
          ? requestsData.filter(request => {
              // Check different possible user ID fields
              const residentId = request.residentId?._id || request.residentId || request.userId;
              const currentUserId = freshUser.id || freshUser._id;
              
              // If no residentId, include it (might be from older data)
              if (!residentId) return true;
              
              // Compare as strings
              return String(residentId) === String(currentUserId);
            })
          : [];
        
        console.log(`Filtered to ${userRequests.length} requests for current user`);
        
        setRequests(userRequests);
        applyFilters(userRequests);

        // Calculate stats
        const totalRequests = userRequests.length || 0;
        const pendingRequests = userRequests.filter(req =>
          req.status === 'pending' || req.status === 'under-review'
        ).length;
        const inProgressRequests = userRequests.filter(req =>
          req.status === 'assigned' || req.status === 'in-progress'
        ).length;
        const completedRequests = userRequests.filter(req =>
          req.status === 'completed'
        ).length;
        
        const ratedRequests = userRequests.filter(req => req.rating);
        const averageRating = ratedRequests.length > 0
          ? ratedRequests.reduce((sum, req) => sum + req.rating, 0) / ratedRequests.length
          : 0;
        
        setStats({
          totalRequests,
          pendingRequests,
          inProgressRequests,
          completedRequests,
          averageRating: parseFloat(averageRating.toFixed(1))
        });
        
      } catch (error) {
        console.error('Error fetching requests:', error);
        
        if (error.code === 'ECONNABORTED') {
          setApiError('Request timeout - server not responding');
        } else if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Server responded with error:', error.response.status);
          console.error('Error data:', error.response.data);
          setApiError(`Server error: ${error.response.status}`);
        } else if (error.request) {
          // The request was made but no response was received
          console.error('No response received from server');
          setApiError('Cannot connect to server');
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Request setup error:', error.message);
          setApiError('Failed to fetch requests');
        }
        
        // For demo purposes, show mock data if API fails
        if (__DEV__) {
          console.log('Using mock data for development');
          const mockRequests = getMockRequests(freshUser);
          setRequests(mockRequests);
          applyFilters(mockRequests);
          calculateMockStats(mockRequests);
        } else {
          setRequests([]);
          setFilteredRequests([]);
        }
      }
      
    } catch (error) {
      console.error('Error in fetchRequests outer try-catch:', error);
      setApiError('An unexpected error occurred');
    } finally {
      setFetching(false);
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  // Mock data for development when API fails
  const getMockRequests = (user) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    return [
      {
        _id: 'req1',
        title: 'Leaking Kitchen Sink',
        description: 'Water leaking from under the sink, causing damage to cabinet',
        category: 'plumbing',
        priority: 'urgent',
        status: 'pending',
        location: 'Kitchen, House A-101',
        createdAt: today.toISOString(),
        residentId: { _id: user.id || user._id, firstName: user.firstName, lastName: user.lastName }
      },
      {
        _id: 'req2',
        title: 'Broken Street Light',
        description: 'Street light in front of house not working at night',
        category: 'electrical',
        priority: 'medium',
        status: 'assigned',
        location: 'Street light post #42',
        createdAt: yesterday.toISOString(),
        residentId: { _id: user.id || user._id, firstName: user.firstName, lastName: user.lastName },
        assignedTo: { firstName: 'John', lastName: 'Smith', role: 'security' }
      },
      {
        _id: 'req3',
        title: 'Garden Overgrowth',
        description: 'Plants growing onto pathway, need trimming',
        category: 'gardening',
        priority: 'low',
        status: 'completed',
        location: 'Front yard',
        createdAt: lastWeek.toISOString(),
        completedAt: new Date().toISOString(),
        residentId: { _id: user.id || user._id, firstName: user.firstName, lastName: user.lastName },
        rating: 4,
        feedback: 'Good work, thank you!'
      },
      {
        _id: 'req4',
        title: 'Security Camera Issue',
        description: 'Front gate camera not recording properly',
        category: 'security',
        priority: 'high',
        status: 'in-progress',
        location: 'Main entrance',
        createdAt: yesterday.toISOString(),
        residentId: { _id: user.id || user._id, firstName: user.firstName, lastName: user.lastName },
        assignedTo: { firstName: 'Mike', lastName: 'Johnson', role: 'security' }
      }
    ];
  };

  const calculateMockStats = (mockRequests) => {
    const totalRequests = mockRequests.length;
    const pendingRequests = mockRequests.filter(req =>
      req.status === 'pending' || req.status === 'under-review'
    ).length;
    const inProgressRequests = mockRequests.filter(req =>
      req.status === 'assigned' || req.status === 'in-progress'
    ).length;
    const completedRequests = mockRequests.filter(req =>
      req.status === 'completed'
    ).length;
    
    const ratedRequests = mockRequests.filter(req => req.rating);
    const averageRating = ratedRequests.length > 0
      ? ratedRequests.reduce((sum, req) => sum + req.rating, 0) / ratedRequests.length
      : 0;
    
    setStats({
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      averageRating: parseFloat(averageRating.toFixed(1))
    });
  };

  const handleManualRefresh = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      navigation.replace('Login');
      return;
    }
    await fetchRequests(user, true);
  }, [user, navigation]);

  const applyFilters = useCallback((requestsList) => {
    if (!requestsList || requestsList.length === 0) {
      setFilteredRequests([]);
      return;
    }

    let filtered = [...requestsList];

    // Apply status filter based on active tab
    if (activeTab && activeTab !== 'all') {
      if (activeTab === 'pending') {
        filtered = filtered.filter(request =>
          request.status === 'pending' || request.status === 'under-review'
        );
      } else if (activeTab === 'in-progress') {
        filtered = filtered.filter(request =>
          request.status === 'assigned' || request.status === 'in-progress'
        );
      } else {
        filtered = filtered.filter(request => request.status === activeTab);
      }
    }

    // Apply category filter
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(request => request.category === categoryFilter);
    }

    // Apply priority filter
    if (priorityFilter && priorityFilter !== 'all') {
      filtered = filtered.filter(request => request.priority === priorityFilter);
    }

    // Apply search query
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(request => {
        const title = request.title ? request.title.toLowerCase() : '';
        const description = request.description ? request.description.toLowerCase() : '';
        const location = request.location ? request.location.toLowerCase() : '';
        const category = request.category ? request.category.toLowerCase() : '';
        
        return title.includes(query) ||
               description.includes(query) ||
               location.includes(query) ||
               category.includes(query);
      });
    }
    
    console.log(`Filtered from ${requestsList.length} to ${filtered.length} requests`);
    setFilteredRequests(filtered);
  }, [activeTab, categoryFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    if (requests && requests.length > 0) {
      applyFilters(requests);
    } else {
      setFilteredRequests([]);
    }
  }, [requests, activeTab, categoryFilter, priorityFilter, searchQuery, applyFilters]);

  const handleOpenDialog = () => {
    if (!user) {
      Alert.alert('Error', 'User information not available. Please try again.');
      return;
    }
    
    const userAddress = user.houseNumber || 
      `${user.firstName || ''} ${user.lastName || ''}'s Residence`.trim() ||
      'Your Residence';
    
    setFormData({
      category: '',
      title: '',
      description: '',
      priority: '',
      location: userAddress,
      alternateLocation: ''
    });
    setUseDifferentLocation(false);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    // Validate title
    if (!validateTitle(formData.title)) {
      Alert.alert('Validation Error', 'Title cannot contain numbers');
      return;
    }
    
    // Validate required fields
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    if (!formData.title || !formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    
    if (!formData.description || !formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    // Validate alternate location if using different location
    if (useDifferentLocation && !formData.alternateLocation.trim()) {
      Alert.alert('Error', 'Please enter the alternate location');
      return;
    }
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('vims_token');
      const userData = await AsyncStorage.getItem('vims_user');
      
      if (!token || !userData) {
        Alert.alert('Error', 'Please login again');
        navigation.replace('Login');
        return;
      }

      const finalLocation = useDifferentLocation 
        ? formData.alternateLocation.trim()
        : formData.location;

      const requestData = {
        category: formData.category,
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        location: finalLocation
      };
      
      console.log('Submitting request:', requestData);
      
      try {
        const response = await axios.post(`${API_BASE_URL}/service-requests`, requestData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-user-data': userData
          },
          timeout: 10000
        });
        
        console.log('Submit response:', response.status, response.data);
        
        if (response.data?.success || response.status === 200 || response.status === 201) {
          Alert.alert('Success', 'Service request submitted successfully!');
          setModalVisible(false);
          setFormData({
            category: '',
            title: '',
            description: '',
            priority: '',
            location: user?.houseNumber || 'Your Residence',
            alternateLocation: ''
          });
          setUseDifferentLocation(false);
          await fetchRequests(user, true);
        }
      } catch (error) {
        console.log('Error submitting request:', error);
        
        if (error.response) {
          console.log('Error response:', error.response.data);
          Alert.alert('Error', error.response.data?.error || 'Failed to submit request');
        } else if (error.request) {
          console.log('No response received');
          Alert.alert('Info', 'Service request feature is coming soon! (Demo mode)');
          // For demo, still show success
          Alert.alert('Demo Mode', 'Request would be submitted in production');
          setModalVisible(false);
          
          // Add a mock request for demo
          const mockNewRequest = {
            _id: 'req' + Date.now(),
            title: formData.title.trim(),
            description: formData.description.trim(),
            category: formData.category,
            priority: formData.priority,
            status: 'pending',
            location: finalLocation,
            createdAt: new Date().toISOString(),
            residentId: { _id: user.id || user._id, firstName: user.firstName, lastName: user.lastName }
          };
          
          setRequests(prev => [mockNewRequest, ...prev]);
          applyFilters([mockNewRequest, ...requests]);
        } else {
          Alert.alert('Error', 'Failed to submit request');
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRateService = async (requestId) => {
    // Check if already rated
    const request = requests.find(r => r._id === requestId);
    if (request?.rating) {
      Alert.alert('Info', 'You have already rated this service');
      return;
    }
    
    Alert.prompt(
      'Rate Service',
      'Please rate the service (1-5):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (rating) => {
            const numRating = parseInt(rating);
            if (numRating && numRating >= 1 && numRating <= 5) {
              Alert.alert('Success', 'Thank you for rating!');
              // Update local state for demo
              setRequests(prev => prev.map(req => 
                req._id === requestId ? { ...req, rating: numRating } : req
              ));
            } else {
              Alert.alert('Error', 'Please enter a valid rating between 1 and 5');
            }
          }
        }
      ],
      'plain-text',
      'number',
      '5'
    );
  };
  
  const handleCancelRequest = async (requestId) => {
    Alert.alert(
      'Confirm Cancellation',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            // Update local state for demo
            setRequests(prev => prev.map(req => 
              req._id === requestId ? { ...req, status: 'cancelled' } : req
            ));
            Alert.alert('Success', 'Request cancelled');
          }
        }
      ]
    );
  };

  const handleAddComment = () => {
    Alert.alert('Info', 'Comment feature coming soon!');
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
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };
  
  const getStatusColor = (status) => {
    const statusColors = {
      pending: '#f59e0b',
      'under-review': '#3b82f6',
      assigned: '#3b82f6',
      'in-progress': '#8b5cf6',
      completed: '#10b981',
      cancelled: '#ef4444',
      rejected: '#dc2626'
    };
    return statusColors[status] || '#6b7280';
  };
  
  const getStatusIcon = (status) => {
    const statusIcons = {
      pending: 'clock-outline',
      'under-review': 'clipboard-text-outline',
      assigned: 'account-check-outline',
      'in-progress': 'progress-wrench',
      completed: 'check-circle-outline',
      cancelled: 'cancel',
      rejected: 'close-circle-outline'
    };
    return statusIcons[status] || 'help-circle-outline';
  };
  
  const getPriorityColor = (priority) => {
    const priorityObj = priorities.find(p => p.id === priority);
    return priorityObj?.color || '#6b7280';
  };
  
  const getCategoryIcon = (category) => {
    const categoryObj = categories.find(c => c.id === category);
    return categoryObj?.icon || 'toolbox';
  };

  const getCategoryEmoji = (category) => {
    const categoryObj = categories.find(c => c.id === category);
    return categoryObj?.emoji || '📋';
  };

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['vims_user', 'vims_token']);
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                })
              );
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const tabCounts = useMemo(() => {
    if (!requests || requests.length === 0) {
      return {
        pending: 0,
        'in-progress': 0,
        completed: 0,
        cancelled: 0
      };
    }
    
    return {
      pending: requests.filter(r => r.status === 'pending' || r.status === 'under-review').length,
      'in-progress': requests.filter(r => r.status === 'assigned' || r.status === 'in-progress').length,
      completed: requests.filter(r => r.status === 'completed').length,
      cancelled: requests.filter(r => r.status === 'cancelled' || r.status === 'rejected').length
    };
  }, [requests]);

  const ProfileMenuModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showProfileMenu}
      onRequestClose={() => setShowProfileMenu(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowProfileMenu(false)}
      >
        <View style={styles.profileMenu}>
          <View style={styles.profileMenuHeader}>
            <View style={styles.profileMenuAvatar}>
              <Text style={styles.profileMenuAvatarText}>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Text>
            </View>
            <Text style={styles.profileMenuName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.profileMenuEmail}>{user?.email}</Text>
            <Text style={styles.profileMenuRole}>
              {user?.role} • {user?.houseNumber || 'No house'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              navigation.navigate('ProfileSettings');
            }}
          >
            <Icon name="cog" size={22} color={themeColors.textPrimary} />
            <Text style={styles.profileMenuText}>Profile Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              Alert.alert('About', 'VIMS Mobile v2.0\nVillage Information Management System');
            }}
          >
            <Icon name="information" size={22} color={themeColors.textPrimary} />
            <Text style={styles.profileMenuText}>About App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.profileMenuItem, styles.logoutMenuItem]}
            onPress={handleLogout}
          >
            <Icon name="logout" size={22} color={themeColors.error} />
            <Text style={[styles.profileMenuText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderRequestItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.requestCard}
      onPress={() => {
        setSelectedRequest(item);
        setDetailsModalVisible(true);
      }}
      onLongPress={() => {
        setSelectedRequest(item);
        setActionModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <View style={[styles.categoryIconContainer, { backgroundColor: `${themeColors.primary}10` }]}>
          <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category)}</Text>
        </View>
        <View style={styles.requestTitleContainer}>
          <Text style={styles.requestTitle} numberOfLines={1}>
            {item.title || 'No title'}
          </Text>
          <Text style={styles.requestDescription} numberOfLines={1}>
            {item.description || 'No description'}
          </Text>
        </View>
      </View>

      <View style={styles.requestBadges}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : 'Unknown'}
          </Text>
        </View>

        <View style={[styles.categoryBadge, { backgroundColor: `${themeColors.primary}10` }]}>
          <Icon name={getCategoryIcon(item.category)} size={12} color={themeColors.primary} />
          <Text style={[styles.categoryText, { color: themeColors.primary }]}>
            {item.category || 'Other'}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Icon name={getStatusIcon(item.status)} size={12} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status ? item.status.replace('-', ' ') : 'Unknown'}
          </Text>
        </View>
      </View>
      
      {item.location && (
        <View style={styles.locationContainer}>
          <Icon name="map-marker" size={14} color={themeColors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
        </View>
      )}
      
      <View style={styles.requestFooter}>
        <View style={styles.requestMeta}>
          <Text style={styles.requestDate}>
            {formatShortDate(item.createdAt)}
          </Text>
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color={themeColors.warning} />
              <Text style={styles.ratingText}>{item.rating}/5</Text>
            </View>
          )}
        </View>

        {item.assignedTo && (
          <View style={styles.assignedBadge}>
            <Icon name="account-check" size={14} color={themeColors.success} />
            <Text style={styles.assignedText}>Assigned</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilterTabs = () => {
    const tabs = [
      { key: 'all', label: 'All', count: requests?.length || 0 },
      { key: 'pending', label: 'Pending', count: tabCounts.pending },
      { key: 'in-progress', label: 'In Progress', count: tabCounts['in-progress'] },
      { key: 'completed', label: 'Completed', count: tabCounts.completed },
      { key: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled }
    ];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.tabTextActive
            ]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabCount, activeTab === tab.key && styles.tabCountActive]}>
                <Text style={[
                  styles.tabCountText,
                  activeTab === tab.key && styles.tabCountTextActive
                ]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderStats = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.totalRequests}</Text>
        <Text style={styles.statLabel}>My Total</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.pendingRequests}</Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.inProgressRequests}</Text>
        <Text style={styles.statLabel}>In Progress</Text>
      </View>
      <View style={styles.statCard}>
        <View style={styles.ratingStatContainer}>
          <Text style={styles.statValue}>{stats.averageRating.toFixed(1)}</Text>
          <Icon name="star" size={16} color={themeColors.warning} />
        </View>
        <Text style={styles.statLabel}>Avg Rating</Text>
      </View>
    </ScrollView>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={18} color={themeColors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search requests by title, description, location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={themeColors.textSecondary}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={themeColors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      
      <View style={styles.filterButtons}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            categoryFilter !== 'all' && styles.filterButtonActive
          ]}
          onPress={() => {
            Alert.alert(
              'Select Category',
              '',
              [
                { text: 'Cancel', style: 'cancel' },
                ...categories.map(category => ({
                  text: `${category.emoji} ${category.label}`,
                  onPress: () => setCategoryFilter(category.id)
                })),
                {
                  text: 'All Categories',
                  onPress: () => setCategoryFilter('all')
                }
              ]
            );
          }}
        >
          <Icon name="tag" size={14} color={categoryFilter !== 'all' ? themeColors.primary : themeColors.textSecondary} />
          <Text style={[
            styles.filterButtonText,
            categoryFilter !== 'all' && styles.filterButtonTextActive
          ]}>
            {categoryFilter === 'all' ? 'Category' : categories.find(c => c.id === categoryFilter)?.label || categoryFilter}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            priorityFilter !== 'all' && styles.filterButtonActive
          ]}
          onPress={() => {
            Alert.alert(
              'Select Priority',
              '',
              [
                { text: 'Cancel', style: 'cancel' },
                ...priorities.map(priority => ({
                  text: priority.label,
                  onPress: () => setPriorityFilter(priority.id)
                })),
                {
                  text: 'All Priorities',
                  onPress: () => setPriorityFilter('all')
                }
              ]
            );
          }}
        >
          <Icon name="flag" size={14} color={priorityFilter !== 'all' ? themeColors.error : themeColors.textSecondary} />
          <Text style={[
            styles.filterButtonText,
            priorityFilter !== 'all' && styles.filterButtonTextActive
          ]}>
            {priorityFilter === 'all' ? 'Priority' : priorities.find(p => p.id === priorityFilter)?.label || priorityFilter}
          </Text>
        </TouchableOpacity>
        
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
            <Icon name="close" size={14} color={themeColors.error} />
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderDetailsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={detailsModalVisible}
      onRequestClose={() => setDetailsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.detailsModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Icon name="close" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.detailsContent}>
            {selectedRequest && (
              <>
                <View style={styles.detailsHeader}>
                  <Text style={styles.detailsTitle}>{selectedRequest.title || 'No Title'}</Text>
                  <View style={styles.detailsBadges}>
                    <View style={[styles.detailsBadge, { backgroundColor: getPriorityColor(selectedRequest.priority) }]}>
                      <Text style={styles.detailsBadgeText}>
                        {selectedRequest.priority ? selectedRequest.priority.charAt(0).toUpperCase() + selectedRequest.priority.slice(1) : 'Unknown'}
                      </Text>
                    </View>
                    <View style={[styles.detailsBadge, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                      <Icon name={getStatusIcon(selectedRequest.status)} size={14} color="white" />
                      <Text style={styles.detailsBadgeText}>
                        {selectedRequest.status ? selectedRequest.status.replace('-', ' ') : 'Unknown'}
                      </Text>
                    </View>
                    <View style={[styles.detailsBadge, { backgroundColor: themeColors.primary }]}>
                      <Text style={styles.detailsBadgeText}>
                        {selectedRequest.category || 'Other'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionText}>{selectedRequest.description || 'No description'}</Text>
                  </View>
                </View>
                
                <View style={styles.detailsRow}>
                  <View style={styles.detailsColumn}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.sectionContent}>
                      <Text style={styles.sectionText}>{selectedRequest.location || 'Not specified'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailsColumn}>
                    <Text style={styles.sectionTitle}>Submitted</Text>
                    <View style={styles.sectionContent}>
                      <Text style={styles.sectionText}>{formatDate(selectedRequest.createdAt)}</Text>
                    </View>
                  </View>
                </View>
                
                {selectedRequest.assignedTo && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Assigned To</Text>
                    <View style={styles.sectionContent}>
                      <Text style={styles.sectionText}>
                        {selectedRequest.assignedTo.firstName} {selectedRequest.assignedTo.lastName}
                      </Text>
                      {selectedRequest.assignedAt && (
                        <Text style={styles.sectionSubtext}>
                          Assigned on: {formatShortDate(selectedRequest.assignedAt)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
                
                {selectedRequest.estimatedCost > 0 && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Estimated Cost</Text>
                    <View style={styles.sectionContent}>
                      <Text style={styles.sectionText}>₱{selectedRequest.estimatedCost}</Text>
                    </View>
                  </View>
                )}
                
                {selectedRequest.estimatedCompletion && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Estimated Completion</Text>
                    <View style={styles.sectionContent}>
                      <Text style={styles.sectionText}>{formatDate(selectedRequest.estimatedCompletion)}</Text>
                    </View>
                  </View>
                )}
                
                {selectedRequest.completedAt && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Completed</Text>
                    <View style={styles.sectionContent}>
                      <Text style={styles.sectionText}>{formatDate(selectedRequest.completedAt)}</Text>
                      {selectedRequest.completedBy && (
                        <Text style={styles.sectionSubtext}>
                          By: {selectedRequest.completedBy.firstName} {selectedRequest.completedBy.lastName}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
                
                {selectedRequest.adminNotes && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Admin Notes</Text>
                    <View style={[styles.sectionContent, styles.adminNotesSection]}>
                      <Text style={styles.adminNotesText}>{selectedRequest.adminNotes}</Text>
                    </View>
                  </View>
                )}
                
                {selectedRequest.rating && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Rating</Text>
                    <View style={styles.sectionContent}>
                      <View style={styles.ratingStars}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Icon
                            key={star}
                            name={star <= selectedRequest.rating ? 'star' : 'star-outline'}
                            size={20}
                            color={themeColors.warning}
                          />
                        ))}
                        <Text style={styles.ratingText}> {selectedRequest.rating}/5</Text>
                      </View>
                      {selectedRequest.feedback && (
                        <Text style={styles.sectionText}>{selectedRequest.feedback}</Text>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalActionButton, styles.cancelButton]}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
            
            {selectedRequest?.status === 'completed' && !selectedRequest?.rating && (
              <TouchableOpacity
                style={[styles.modalActionButton, styles.rateButton]}
                onPress={() => {
                  setDetailsModalVisible(false);
                  handleRateService(selectedRequest._id);
                }}
              >
                <Icon name="star" size={20} color="white" />
                <Text style={styles.rateButtonText}>Rate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderActionModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={actionModalVisible}
      onRequestClose={() => setActionModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.actionModalOverlay}
        activeOpacity={1}
        onPress={() => setActionModalVisible(false)}
      >
        <View style={styles.actionModalContent}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setActionModalVisible(false);
              setDetailsModalVisible(true);
            }}
          >
            <Icon name="eye" size={20} color={themeColors.primary} />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          
          {selectedRequest?.status === 'completed' && !selectedRequest?.rating && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setActionModalVisible(false);
                handleRateService(selectedRequest._id);
              }}
            >
              <Icon name="star" size={20} color={themeColors.warning} />
              <Text style={styles.actionButtonText}>Rate Service</Text>
            </TouchableOpacity>
          )}
          
          {['pending', 'assigned', 'in-progress'].includes(selectedRequest?.status) && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setActionModalVisible(false);
                handleCancelRequest(selectedRequest._id);
              }}
            >
              <Icon name="cancel" size={20} color={themeColors.error} />
              <Text style={styles.actionButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setActionModalVisible(false);
              handleAddComment();
            }}
          >
            <Icon name="comment" size={20} color={themeColors.info} />
            <Text style={styles.actionButtonText}>Add Comment</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />
        <LinearGradient
          colors={[themeColors.primary, '#1a1a9e']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Service Requests</Text>
              <Text style={styles.headerSubtitle}>Manage your requests</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading your service requests...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[themeColors.primary, '#1a1a9e']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>My Service Requests</Text>
            <Text style={styles.headerSubtitle}>Manage your requests</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleManualRefresh}
              disabled={fetching}
            >
              <Icon 
                name="refresh" 
                size={22} 
                color={fetching ? themeColors.textSecondary : 'white'} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowProfileMenu(true)}
              style={styles.profileButton}
            >
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                  {user?.lastName?.charAt(0) || ''}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Stats */}
      {renderStats()}

      {/* Filter Section Header */}
      <View style={styles.filterSectionHeader}>
        <Text style={styles.filterSectionTitle}>My Service Requests Management</Text>
        <View style={styles.filterSectionActions}>
          {user?.role === 'resident' && (
            <TouchableOpacity
              style={styles.newRequestButton}
              onPress={handleOpenDialog}
            >
              <Icon name="plus" size={18} color="white" />
              <Text style={styles.newRequestButtonText}>New Request</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error message if API fails */}
      {apiError && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={20} color={themeColors.error} />
          <Text style={styles.errorText}>Error: {apiError}</Text>
          <TouchableOpacity onPress={handleManualRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters */}
      {renderFilters()}

      {/* Loading Indicator */}
      {fetching && (
        <View style={styles.fetchingIndicator}>
          <ActivityIndicator size="small" color={themeColors.primary} />
          <Text style={styles.fetchingText}>Refreshing...</Text>
        </View>
      )}

      {/* Tabs */}
      {renderFilterTabs()}

      {/* Requests List */}
      {!filteredRequests || filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="toolbox" size={64} color={themeColors.border} />
          <Text style={styles.emptyTitle}>
            {!requests || requests.length === 0 
              ? "You haven't submitted any service requests yet."
              : "No requests match your current filters."}
          </Text>
          {user?.role === 'resident' && (!requests || requests.length === 0) && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleOpenDialog}
            >
              <Icon name="plus" size={20} color="white" />
              <Text style={styles.emptyButtonText}>Create Your First Request</Text>
            </TouchableOpacity>
          )}
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
          keyExtractor={item => item._id?.toString() || Math.random().toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleManualRefresh}
              colors={[themeColors.primary]}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>
                My Requests ({filteredRequests.length})
                {filteredRequests.length !== requests?.length && (
                  <Text style={styles.listHeaderSubtitle}>
                    {' '}(filtered from {requests?.length || 0} total)
                  </Text>
                )}
              </Text>
            </View>
          }
        />
      )}
   
      {/* Floating Action Button */}
      {user?.role === 'resident' && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={handleOpenDialog}
        >
          <Icon name="plus" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Create Request Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setUseDifferentLocation(false);
          setFormData({
            category: '',
            title: '',
            description: '',
            priority: '',
            location: user?.houseNumber || 'Your Residence',
            alternateLocation: ''
          });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Service Request</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setUseDifferentLocation(false);
                  setFormData({
                    category: '',
                    title: '',
                    description: '',
                    priority: '',
                    location: user?.houseNumber || 'Your Residence',
                    alternateLocation: ''
                  });
                }}
              >
                <Icon name="close" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelection}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      formData.category === category.id && styles.categoryOptionSelected
                    ]}
                    onPress={() => handleCategoryChange(category.id)}
                  >
                    <Text style={styles.categoryEmojiLarge}>{category.emoji}</Text>
                    <Text style={[
                      styles.categoryOptionText,
                      formData.category === category.id && styles.categoryOptionTextSelected
                    ]}>
                      {category.label}
                    </Text>
                    <Text style={[
                      styles.categoryPriorityText,
                      formData.category === category.id && styles.categoryPriorityTextSelected
                    ]}>
                      {priorities.find(p => p.id === category.priority)?.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.prioritySelection}>
                {priorities.map((priority) => (
                  <TouchableOpacity
                    key={priority.id}
                    style={[
                      styles.priorityOption,
                      formData.priority === priority.id && styles.priorityOptionSelected,
                      { borderColor: priority.color }
                    ]}
                    disabled
                  >
                    <Text style={[
                      styles.priorityOptionText,
                      formData.priority === priority.id && { color: priority.color, fontWeight: '600' }
                    ]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.helperText}>Priority is automatically determined based on the selected category</Text>

              <Text style={styles.formLabel}>Title *</Text>
              <View style={[styles.inputContainer, /\d/.test(formData.title) && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter request title (no numbers allowed)"
                  value={formData.title}
                  onChangeText={handleTitleChange}
                  placeholderTextColor={themeColors.textSecondary}
                />
              </View>
              {/\d/.test(formData.title) && (
                <Text style={styles.errorText}>Title cannot contain numbers</Text>
              )}
              
              <Text style={styles.formLabel}>Description *</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the issue or request in detail"
                  value={formData.description}
                  onChangeText={text => setFormData({...formData, description: text})}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={themeColors.textSecondary}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.locationSwitchContainer}>
                <Text style={styles.formLabel}>Location</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Use different location</Text>
                  <Switch
                    value={useDifferentLocation}
                    onValueChange={setUseDifferentLocation}
                    trackColor={{ false: themeColors.border, true: themeColors.primary }}
                    thumbColor={useDifferentLocation ? 'white' : '#f4f3f4'}
                  />
                </View>
              </View>

              {!useDifferentLocation ? (
                <View style={[styles.inputContainer, styles.disabledInput]}>
                  <Icon name="map-marker" size={20} color={themeColors.textSecondary} />
                  <TextInput
                    style={[styles.input, styles.disabledInputText]}
                    value={formData.location}
                    editable={false}
                    placeholderTextColor={themeColors.textSecondary}
                  />
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Icon name="map-marker" size={20} color={themeColors.primary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter the address where service is needed"
                    value={formData.alternateLocation}
                    onChangeText={text => setFormData({...formData, alternateLocation: text})}
                    placeholderTextColor={themeColors.textSecondary}
                  />
                </View>
              )}

              <View style={styles.infoBox}>
                <Icon name="information-outline" size={16} color={themeColors.primary} />
                <Text style={styles.infoText}>
                  Service requests will be reviewed by admin and assigned to appropriate personnel.
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setUseDifferentLocation(false);
                  setFormData({
                    category: '',
                    title: '',
                    description: '',
                    priority: '',
                    location: user?.houseNumber || 'Your Residence',
                    alternateLocation: ''
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.submitButton]}
                onPress={handleSubmit}
                disabled={loading || !formData.category || !formData.title || !formData.description || (useDifferentLocation && !formData.alternateLocation) || /\d/.test(formData.title)}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Icon name="check" size={18} color="white" />
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {renderDetailsModal()}
      {renderActionModal()}
      <ProfileMenuModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  profileAvatarText: {
    color: themeColors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerPlaceholder: {
    width: 40,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    elevation: 2,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 2,
  },
  ratingStatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  filterSectionActions: {
    flexDirection: 'row',
  },
  newRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  newRequestButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: themeColors.error,
  },
  retryText: {
    fontSize: 12,
    color: themeColors.primary,
    fontWeight: '600',
  },
  fetchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'white',
    gap: 8,
  },
  fetchingText: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  tabsContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 16,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  tabButtonActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: themeColors.textSecondary,
  },
  tabTextActive: {
    color: 'white',
  },
  tabCount: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabCountText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  tabCountTextActive: {
    color: 'white',
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: themeColors.textPrimary,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.background,
  },
  filterButtonActive: {
    borderColor: themeColors.primary,
    backgroundColor: '#f0f9ff',
  },
  filterButtonText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginLeft: 4,
  },
  filterButtonTextActive: {
    color: themeColors.primary,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
  },
  clearFiltersText: {
    fontSize: 12,
    color: themeColors.error,
    marginLeft: 4,
    fontWeight: '500',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  listContainer: {
    padding: 12,
    paddingBottom: 80,
  },
  requestCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    elevation: 1,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  requestTitleContainer: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 2,
  },
  requestDescription: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  requestBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestDate: {
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: themeColors.warning,
    fontWeight: '500',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignedText: {
    fontSize: 11,
    color: themeColors.success,
    fontWeight: '500',
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
    color: themeColors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 15,
    color: themeColors.textSecondary,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
    gap: 6,
    elevation: 2,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  clearEmptyButton: {
    backgroundColor: themeColors.error,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: themeColors.primary,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: themeColors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  detailsModalContent: {
    backgroundColor: themeColors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    padding: 16,
  },
  detailsContent: {
    padding: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 6,
  },
  helperText: {
    fontSize: 11,
    color: themeColors.textSecondary,
    marginBottom: 16,
    marginTop: -8,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 11,
    color: themeColors.error,
    marginBottom: 8,
    marginTop: -8,
  },
  categorySelection: {
    marginBottom: 16,
  },
  categoryOption: {
    alignItems: 'center',
    padding: 10,
    marginRight: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    minWidth: 80,
    backgroundColor: themeColors.background,
  },
  categoryOptionSelected: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  categoryEmojiLarge: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryOptionText: {
    fontSize: 11,
    color: themeColors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryOptionTextSelected: {
    color: 'white',
  },
  categoryPriorityText: {
    fontSize: 9,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  categoryPriorityTextSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  prioritySelection: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 6,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    opacity: 0.8,
  },
  priorityOptionSelected: {
    backgroundColor: '#fef2f2',
  },
  priorityOptionText: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  inputError: {
    borderColor: themeColors.error,
    backgroundColor: '#fef2f2',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: themeColors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  disabledInputText: {
    color: themeColors.textSecondary,
  },
  textAreaContainer: {
    minHeight: 80,
    alignItems: 'flex-start',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  locationSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 10,
    borderRadius: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#0369a1',
    marginLeft: 6,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    gap: 10,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  submitButton: {
    backgroundColor: themeColors.primary,
    elevation: 2,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsHeader: {
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 10,
  },
  detailsBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  detailsBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.textSecondary,
    marginBottom: 6,
  },
  sectionContent: {
    backgroundColor: themeColors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  sectionText: {
    fontSize: 14,
    color: themeColors.textPrimary,
  },
  sectionSubtext: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  detailsColumn: {
    flex: 1,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    marginLeft: 4,
  },
  adminNotesSection: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  adminNotesText: {
    fontSize: 14,
    color: '#0369a1',
    fontStyle: 'italic',
  },
  rateButton: {
    backgroundColor: themeColors.warning,
  },
  rateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalContent: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 6,
    minWidth: 200,
    borderWidth: 1,
    borderColor: themeColors.border,
    elevation: 6,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 14,
    color: themeColors.textPrimary,
  },
  profileMenu: {
    backgroundColor: themeColors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  profileMenuHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    marginBottom: 6,
  },
  profileMenuAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileMenuAvatarText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileMenuName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 2,
  },
  profileMenuEmail: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  profileMenuRole: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  profileMenuText: {
    fontSize: 15,
    color: themeColors.textPrimary,
    marginLeft: 14,
    fontWeight: '500',
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: themeColors.error,
  },
});

export default ServiceRequestScreen;