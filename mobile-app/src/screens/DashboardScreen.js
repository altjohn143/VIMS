// DashboardScreen.js - Professional Modern Design with Enhanced Header
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../config/apiConfig';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions - EXACTLY as you had them
const responsiveFont = (size) => {
  const scale = Math.min(width, height) / 375;
  return Math.max(14, Math.round(size * scale));
};

const responsiveWidth = (percentage) => {
  return (width * percentage) / 100;
};

const responsiveHeight = (percentage) => {
  return (height * percentage) / 100;
};

// Professional Dashboard Theme Colors - refined palette
const themeColors = {
  primary: '#2224be',
  primaryLight: '#4f52e0',
  primaryDark: '#1a1c8c',
  primarySoft: '#eef0ff',
  success: '#10b981',
  successSoft: '#e6f7f0',
  warning: '#f59e0b',
  warningSoft: '#fff4e5',
  error: '#ef4444',
  errorSoft: '#fee9e9',
  info: '#3b82f6',
  infoSoft: '#e6f0ff',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e5e7eb',
  borderLight: '#f1f4f8',
  sidebarBg: '#0f172a',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

const DashboardScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [activeTab, setActiveTab] = useState('overview');
  
  const sidebarAnimation = useRef(new Animated.Value(-width)).current;
  const scrollViewRef = useRef(null);

  // Role configurations
  const roleConfig = {
    resident: {
      title: 'Resident Dashboard',
      icon: 'home',
      color: themeColors.primary,
      features: {
        visitors: [
          { title: 'Generate Visitor Pass', icon: 'qrcode', screen: 'Visitors' }
        ],
        services: [
          { title: 'Service Requests', icon: 'tools', screen: 'ServiceRequests' }
        ],
        payments: [
          { title: 'Pay Dues', icon: 'currency-usd', screen: 'Payments' }
        ],
        community: [
          { title: 'Announcements', icon: 'bullhorn', screen: 'Announcements' }
        ],
        settings: [
          { title: 'Profile Settings', icon: 'cog', screen: 'ProfileSettings' }
        ]
      },
      stats: [
        { label: 'Pending Visitors', value: '3' },
        { label: 'Due Amount', value: '₱2,500' },
        { label: 'Active Requests', value: '1' },
        { label: 'Unread Alerts', value: '5' }
      ]
    },
    admin: {
      title: 'Admin Dashboard',
      icon: 'shield-account',
      color: themeColors.primary,
      features: {
        visitors: [
          { title: 'Visitor Management', icon: 'account-group', screen: 'AdminVisitorManagement' }
        ],
        users: [
          { title: 'User Management', icon: 'account-multiple', screen: 'AdminUsers' },
          { title: 'Approval Requests', icon: 'shield-check', screen: 'AdminApprovals' }
        ],
        services: [
          { title: 'Service Requests', icon: 'tools', screen: 'AdminServiceRequests' }
        ],
        finance: [
          { title: 'Financial Overview', icon: 'chart-bar', screen: 'AdminFinance' }
        ],
        announcements: [
          { title: 'Create Announcements', icon: 'bullhorn', screen: 'AdminAnnouncements' }
        ],
        settings: [
          { title: 'System Settings', icon: 'cog', screen: 'ProfileSettings' }
        ]
      },
      stats: [
        { label: 'Total Residents', value: '247' },
        { label: 'Pending Approvals', value: '12' },
        { label: 'Monthly Collection', value: '₱158K' },
        { label: 'Active Issues', value: '8' }
      ]
    },
    security: {
      title: 'Security Dashboard',
      icon: 'security',
      color: themeColors.primary,
      features: {
        scanner: [
          { title: 'QR Code Scanner', icon: 'qrcode-scan', screen: 'SecurityScanner' }
        ],
        visitors: [
          { title: 'Visitor Approvals', icon: 'check-circle', screen: 'SecurityVisitorApproval' },
          { title: 'Visitor Logs', icon: 'history', screen: 'SecurityVisitorLogs' }
        ],
        patrol: [
          { title: 'Patrol Schedule', icon: 'calendar', screen: 'SecuritySchedule' }
        ],
        services: [
          { title: 'Service Requests', icon: 'tools', screen: 'SecurityServiceRequests' }
        ],
        incidents: [
          { title: 'Incident Reports', icon: 'alert', screen: 'SecurityIncidents' }
        ],
        settings: [
          { title: 'Profile Settings', icon: 'cog', screen: 'ProfileSettings' }
        ]
      },
      stats: [
        { label: 'Visitors Today', value: '42' },
        { label: 'Active on Premises', value: '18' },
        { label: 'Pending Checkouts', value: '7' },
        { label: 'Alerts Today', value: '2' }
      ]
    }
  };

  // API Helper (keeping your existing functionality)
  const apiRequest = async (endpoint, options = {}) => {
    try {
      const token = await AsyncStorage.getItem('vims_token');
      const userStr = await AsyncStorage.getItem('vims_user');
      
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(userStr && { 'x-user-data': userStr }),
        ...options.headers
      };

      console.log(`API Request: ${API_CONFIG.forceNetworkIP}${endpoint}`);
      
      const response = await fetch(`${API_CONFIG.forceNetworkIP}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 403 || response.status === 404) {
        return { count: 0, data: [] };
      }

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 404) {
          return { count: 0, data: [] };
        }
        throw new Error(data.error || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      return { count: 0, data: [] };
    }
  };

  // Load user data (keeping your existing functionality)
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        if (route.params?.user) {
          setUser(route.params.user);
          await fetchAllData(route.params.user);
        } else {
          await loadUserData();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  useEffect(() => {
    Animated.spring(sidebarAnimation, {
      toValue: sidebarOpen ? 0 : -width,
      useNativeDriver: false,
      tension: 70,
      friction: 15
    }).start();
  }, [sidebarOpen]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('vims_user');
      const token = await AsyncStorage.getItem('vims_token');
      
      if (!userData || !token) {
        navigation.replace('Login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      await fetchAllData(parsedUser);
      
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Session expired. Please login again.');
      navigation.replace('Login');
    }
  };

  const fetchAllData = async (userData) => {
    try {
      setLoading(false);
      fetchUserProfile().catch(err => console.log('Profile fetch error:', err));
      initializeEmptyStats(userData.role);
      fetchStats(userData.role).catch(err => console.log('Stats fetch error:', err));
      fetchRecentActivities().catch(err => console.log('Activities fetch error:', err));
      fetchNotificationsCount().catch(err => console.log('Notifications fetch error:', err));
    } catch (error) {
      console.error('Error in fetchAllData:', error);
      setLoading(false);
      if (userData) {
        initializeEmptyStats(userData.role);
      }
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await apiRequest('/users/profile');
      if (response.success && response.data) {
        const updatedUser = response.data;
        setUser(updatedUser);
        await AsyncStorage.setItem('vims_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchStats = async (role) => {
    try {
      initializeEmptyStats(role);
    } catch (error) {
      console.error('Error fetching stats:', error);
      initializeEmptyStats(role);
    }
  };

  const initializeEmptyStats = (role) => {
    const emptyStats = {
      resident: [
        { label: 'Pending Visitors', value: '0' },
        { label: 'Due Amount', value: '₱0' },
        { label: 'Active Requests', value: '0' },
        { label: 'Unread Alerts', value: '0' }
      ],
      admin: [
        { label: 'Total Residents', value: '0' },
        { label: 'Pending Approvals', value: '0' },
        { label: 'Monthly Collection', value: '₱0' },
        { label: 'Active Issues', value: '0' }
      ],
      security: [
        { label: 'Visitors Today', value: '0' },
        { label: 'Active on Premises', value: '0' },
        { label: 'Pending Checkouts', value: '0' },
        { label: 'Alerts Today', value: '0' }
      ]
    };
    setStats(emptyStats[role] || emptyStats.resident);
  };

  const fetchRecentActivities = async () => {
    try {
      setRecentActivities([
        { icon: 'account-check', text: 'Welcome to VIMS!', time: 'Just now' },
        { icon: 'home', text: 'Account created successfully', time: '1 min ago' },
        { icon: 'bell', text: 'System ready', time: '5 min ago' },
        { icon: 'shield', text: 'Security check completed', time: '10 min ago' }
      ]);
    } catch (error) {
      console.error('Error setting activities:', error);
    }
  };

  const fetchNotificationsCount = async () => {
    try {
      setNotifications(3);
    } catch (error) {
      console.error('Error setting notifications:', error);
      setNotifications(0);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await fetchAllData(user);
    }
    setRefreshing(false);
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
              setShowProfileMenu(false);
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                })
              );
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleSectionToggle = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleNavigation = (screen) => {
    setSidebarOpen(false);
    if (screen) {
      navigation.navigate(screen);
    }
  };

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>No user data found</Text>
        <TouchableOpacity
          style={styles.loginRedirectButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.loginRedirectText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const config = roleConfig[user.role] || roleConfig.resident;

  const accountInfo = [
    { label: 'Name', value: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not provided' },
    { label: 'Email', value: user.email || '' },
    { label: 'Phone', value: user.phone || 'Not provided' },
    { label: 'Role', value: user.role || 'resident' },
    { label: 'Status', value: user.isApproved ? 'Approved' : 'Pending' }
  ];

  // Professional Stats Cards with enhanced design - text sizes unchanged
  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
          <Icon name="arrow-right" size={16} color={themeColors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <LinearGradient
              colors={[themeColors.primarySoft, '#ffffff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </LinearGradient>
          </View>
        ))}
      </View>
    </View>
  );

  // Professional Activities section - text sizes unchanged
  const renderActivities = () => (
    <View style={styles.columnCard}>
      <View style={styles.columnHeader}>
        <View style={styles.columnHeaderLeft}>
          <View style={styles.columnIconContainer}>
            <Icon name="bell" size={22} color={themeColors.primary} />
          </View>
          <Text style={styles.columnTitle}>Recent Activities</Text>
        </View>
        <TouchableOpacity>
          <Icon name="dots-horizontal" size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>
      <ScrollView 
        style={styles.activitiesScrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <View style={styles.activityList}>
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityIconContainer}>
                  <Icon name={activity.icon} size={20} color={themeColors.primary} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{activity.text}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="history" size={40} color={themeColors.textMuted} />
              <Text style={styles.emptyStateText}>No recent activities</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  // Professional Account Info section - text sizes unchanged
  const renderAccountInfo = () => (
    <View style={styles.columnCard}>
      <View style={styles.columnHeader}>
        <View style={styles.columnHeaderLeft}>
          <View style={styles.columnIconContainer}>
            <Icon name="account-circle" size={22} color={themeColors.primary} />
          </View>
          <Text style={styles.columnTitle}>Account Information</Text>
        </View>
      </View>
      <ScrollView 
        style={styles.accountScrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <View style={styles.infoList}>
          {accountInfo.map((info, index) => (
            <View key={index} style={styles.infoItem}>
              <Text style={styles.infoLabel}>{info.label}</Text>
              {info.label === 'Role' ? (
                <View style={[styles.roleBadge, { backgroundColor: themeColors.primarySoft }]}>
                  <Text style={[styles.roleText, { color: themeColors.primary }]}>{info.value.toUpperCase()}</Text>
                </View>
              ) : info.label === 'Status' ? (
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: info.value === 'Approved' ? themeColors.successSoft : themeColors.warningSoft }
                ]}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: info.value === 'Approved' ? themeColors.success : themeColors.warning }
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: info.value === 'Approved' ? themeColors.success : themeColors.warning }
                  ]}>
                    {info.value}
                  </Text>
                </View>
              ) : (
                <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
                  {info.value}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.updateProfileButton}
        onPress={() => navigation.navigate('ProfileSettings')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[themeColors.primary, themeColors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.updateProfileGradient}
        >
          <Icon name="cog" size={18} color="white" />
          <Text style={styles.updateProfileButtonText}>Update Profile</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Mobile Tab Navigation - text sizes unchanged
  const renderMobileTabs = () => (
    <View style={styles.mobileTabs}>
      <TouchableOpacity
        style={[styles.mobileTab, activeTab === 'overview' && styles.mobileTabActive]}
        onPress={() => setActiveTab('overview')}
      >
        <Icon 
          name="view-dashboard" 
          size={20} 
          color={activeTab === 'overview' ? themeColors.primary : themeColors.textSecondary} 
        />
        <Text style={[
          styles.mobileTabText,
          activeTab === 'overview' && styles.mobileTabTextActive
        ]}>Overview</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.mobileTab, activeTab === 'activities' && styles.mobileTabActive]}
        onPress={() => setActiveTab('activities')}
      >
        <Icon 
          name="bell" 
          size={20} 
          color={activeTab === 'activities' ? themeColors.primary : themeColors.textSecondary} 
        />
        <Text style={[
          styles.mobileTabText,
          activeTab === 'activities' && styles.mobileTabTextActive
        ]}>Activities</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.mobileTab, activeTab === 'account' && styles.mobileTabActive]}
        onPress={() => setActiveTab('account')}
      >
        <Icon 
          name="account" 
          size={20} 
          color={activeTab === 'account' ? themeColors.primary : themeColors.textSecondary} 
        />
        <Text style={[
          styles.mobileTabText,
          activeTab === 'account' && styles.mobileTabTextActive
        ]}>Account</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />

      {/* ===== ENHANCED HEADER WITH BIGGER DESIGN ===== */}
      <LinearGradient
        colors={[themeColors.primary, themeColors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        {/* Decorative elements */}
        <View style={styles.headerDecoration1} />
        <View style={styles.headerDecoration2} />
        
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => setSidebarOpen(true)} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, {user.firstName || 'User'}</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationButton}>
              {notifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notifications > 9 ? '9+' : notifications}
                  </Text>
                </View>
              )}
              <Ionicons name="notifications-outline" size={26} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowProfileMenu(true)}
              style={styles.profileButton}
            >
              <LinearGradient
                colors={['#ffffff', '#f0f0f0']}
                style={styles.profileAvatar}
              >
                <Text style={styles.profileAvatarText}>
                  {user.firstName?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Additional header info */}
        <View style={styles.headerStats}>
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatValue}>{stats[0]?.value || '0'}</Text>
            <Text style={styles.headerStatLabel}>{stats[0]?.label || 'Visitors'}</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatValue}>{stats[1]?.value || '₱0'}</Text>
            <Text style={styles.headerStatLabel}>{stats[1]?.label || 'Due'}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {width < 768 && renderMobileTabs()}
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Welcome Card with modern design */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeGreeting}>
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
              </Text>
              <Text style={styles.welcomeName}>{user.firstName || user.email?.split('@')[0] || 'User'}!</Text>
              <Text style={styles.welcomeMessage}>
                {user.role === 'resident' && "Here's what's happening in your community today."}
                {user.role === 'admin' && 'Monitor and manage all community activities.'}
                {user.role === 'security' && 'Stay alert and manage visitor access.'}
              </Text>
            </View>
            <View style={styles.welcomeIllustration}>
              <Icon name={config.icon} size={70} color={themeColors.primarySoft} />
            </View>
          </View>

          {width < 768 ? (
            <>
              {activeTab === 'overview' && renderStats()}
              {activeTab === 'activities' && renderActivities()}
              {activeTab === 'account' && renderAccountInfo()}
            </>
          ) : (
            <>
              {renderStats()}
              <View style={styles.twoColumnContainer}>
                {renderActivities()}
                {renderAccountInfo()}
              </View>
            </>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              VIMS • {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} Access • Version 2.0
            </Text>
          </View>
        </ScrollView>
      </View>

      {renderSidebar()}

      {/* Profile Menu Modal with modern design */}
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
          <View style={styles.profileMenuContainer}>
            <View style={styles.profileMenuHeader}>
              <LinearGradient
                colors={[themeColors.primary, themeColors.primaryDark]}
                style={styles.profileMenuAvatar}
              >
                <Text style={styles.profileMenuAvatarText}>
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </Text>
              </LinearGradient>
              <Text style={styles.profileMenuName}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={styles.profileMenuEmail}>{user.email}</Text>
            </View>

            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={() => {
                setShowProfileMenu(false);
                navigation.navigate('ProfileSettings');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: themeColors.primarySoft }]}>
                <Icon name="cog" size={22} color={themeColors.primary} />
              </View>
              <Text style={styles.profileMenuText}>Profile Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.profileMenuItem, styles.logoutMenuItem]}
              onPress={() => {
                setShowProfileMenu(false);
                handleLogout();
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: themeColors.errorSoft }]}>
                <Icon name="logout" size={22} color={themeColors.error} />
              </View>
              <Text style={[styles.profileMenuText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );

  function renderSidebar() {
    return (
      <Animated.View
        pointerEvents={sidebarOpen ? "auto" : "none"}
        style={[
          styles.sidebarContainer,
          {
            transform: [{ translateX: sidebarAnimation }],
          }
        ]}
      >
        <LinearGradient
          colors={[themeColors.sidebarBg, '#1a2639']}
          style={styles.sidebarGradient}
        >
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarUserInfo}>
              <LinearGradient
                colors={[themeColors.primary, themeColors.primaryDark]}
                style={styles.sidebarAvatar}
              >
                <Text style={styles.sidebarAvatarText}>
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </Text>
              </LinearGradient>
              <View style={styles.sidebarUserDetails}>
                <Text style={styles.sidebarUserName}>
                  {user.firstName} {user.lastName}
                </Text>
                <View style={styles.sidebarRoleBadge}>
                  <Text style={styles.sidebarRoleText}>{user.role}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSidebarOpen(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            {Object.entries(config.features).map(([section, items]) => (
              <View key={section} style={styles.sidebarSection}>
                {items.length > 1 ? (
                  <>
                    <TouchableOpacity
                      onPress={() => handleSectionToggle(section)}
                      style={styles.sidebarSectionHeader}
                    >
                      <View style={styles.sidebarSectionHeaderContent}>
                        <Icon
                          name={items[0]?.icon}
                          size={20}
                          color="#94a3b8"
                          style={styles.sidebarIcon}
                        />
                        <Text style={styles.sidebarSectionTitle}>
                          {section.charAt(0).toUpperCase() + section.slice(1)}
                        </Text>
                      </View>
                      <Icon
                        name={expandedSections[section] ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#94a3b8"
                      />
                    </TouchableOpacity>
                    {expandedSections[section] && (
                      <View style={styles.sidebarSubmenu}>
                        {items.map((item, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => handleNavigation(item.screen)}
                            style={styles.sidebarSubmenuItem}
                          >
                            <Icon name={item.icon} size={18} color="#64748b" style={styles.submenuIcon} />
                            <Text style={styles.sidebarSubmenuText}>{item.title}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleNavigation(items[0]?.screen)}
                    style={styles.sidebarSectionHeader}
                  >
                    <View style={styles.sidebarSectionHeaderContent}>
                      <Icon
                        name={items[0]?.icon}
                        size={20}
                        color="#94a3b8"
                        style={styles.sidebarIcon}
                      />
                      <Text style={styles.sidebarSectionTitle}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.sidebarFooter}>
            <View style={styles.systemStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.systemStatusText}>Connected</Text>
            </View>
            <Text style={styles.versionText}>VIMS v2.0</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }
};

// ALL TEXT SIZES ARE UNCHANGED - Only visual enhancements added to header
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: responsiveFont(18),
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  loginRedirectButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: themeColors.primary,
    borderRadius: 12,
    elevation: 2,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginRedirectText: {
    color: 'white',
    fontSize: responsiveFont(18),
    fontWeight: '600',
  },
  // ===== ENHANCED HEADER STYLES =====
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 12,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  headerDecoration1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerDecoration2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: responsiveFont(32),
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: responsiveFont(18),
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: themeColors.error,
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: themeColors.primary,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: responsiveFont(13),
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 0,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  profileAvatarText: {
    color: themeColors.primary,
    fontSize: responsiveFont(22),
    fontWeight: 'bold',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: responsiveFont(22),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  headerStatLabel: {
    fontSize: responsiveFont(14),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Mobile Tabs - Enhanced
  mobileTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: themeColors.borderLight,
    elevation: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  mobileTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 26,
  },
  mobileTabActive: {
    backgroundColor: themeColors.primarySoft,
  },
  mobileTabText: {
    fontSize: responsiveFont(16),
    color: themeColors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  mobileTabTextActive: {
    color: themeColors.primary,
    fontWeight: '600',
  },
  // Welcome Card - New modern design
  welcomeCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColors.borderLight,
    elevation: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: responsiveFont(16),
    color: themeColors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  welcomeName: {
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  welcomeMessage: {
    fontSize: responsiveFont(16),
    color: themeColors.textSecondary,
    lineHeight: 22,
  },
  welcomeIllustration: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  // Stats Section - Enhanced
  statsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: responsiveFont(22),
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: responsiveFont(16),
    color: themeColors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.borderLight,
    borderRadius: 16,
  },
  statValue: {
    fontSize: responsiveFont(28),
    fontWeight: 'bold',
    color: themeColors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: responsiveFont(16),
    color: themeColors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Two Column Layout
  twoColumnContainer: {
    flexDirection: Platform.OS === 'web' && width > 768 ? 'row' : 'column',
    paddingHorizontal: 16,
    gap: 16,
  },
  // Column Cards - Enhanced
  columnCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: Platform.OS !== 'web' && width < 768 ? 16 : 0,
    borderWidth: 1,
    borderColor: themeColors.borderLight,
    elevation: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    maxHeight: width < 768 ? 350 : 400,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderLight,
  },
  columnHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  columnIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  columnTitle: {
    fontSize: responsiveFont(20),
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  activitiesScrollView: {
    flex: 1,
  },
  accountScrollView: {
    flex: 1,
  },
  // Activity Items - Enhanced
  activityList: {
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderLight,
  },
  activityIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: themeColors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: responsiveFont(18),
    color: themeColors.textPrimary,
    marginBottom: 2,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: responsiveFont(16),
    color: themeColors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: responsiveFont(18),
    color: themeColors.textSecondary,
  },
  // Info List - Enhanced
  infoList: {
    flex: 1,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderLight,
  },
  infoLabel: {
    fontSize: responsiveFont(18),
    color: themeColors.textSecondary,
    fontWeight: '500',
    flex: 0.4,
  },
  infoValue: {
    fontSize: responsiveFont(18),
    color: themeColors.textPrimary,
    fontWeight: '500',
    flex: 0.6,
    textAlign: 'right',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
  },
  // Update Profile Button - Enhanced
  updateProfileButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  updateProfileGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  updateProfileButtonText: {
    color: 'white',
    fontSize: responsiveFont(18),
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  footerText: {
    fontSize: responsiveFont(16),
    color: themeColors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Sidebar - Enhanced
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.85,
    height: '100%',
    zIndex: 1000,
    elevation: 20,
  },
  sidebarGradient: {
    flex: 1,
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sidebarUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sidebarAvatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 4,
  },
  sidebarAvatarText: {
    color: 'white',
    fontSize: responsiveFont(22),
    fontWeight: 'bold',
  },
  sidebarUserDetails: {
    flex: 1,
  },
  sidebarUserName: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  sidebarRoleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  sidebarRoleText: {
    color: '#94a3b8',
    fontSize: responsiveFont(14),
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
  },
  sidebarContent: {
    flex: 1,
    padding: 16,
  },
  sidebarSection: {
    marginBottom: 4,
  },
  sidebarSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sidebarSectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sidebarIcon: {
    marginRight: 12,
  },
  sidebarSectionTitle: {
    fontSize: responsiveFont(18),
    fontWeight: '500',
    color: '#e2e8f0',
  },
  sidebarSubmenu: {
    paddingLeft: 44,
    marginTop: 4,
  },
  sidebarSubmenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  submenuIcon: {
    marginRight: 10,
  },
  sidebarSubmenuText: {
    fontSize: responsiveFont(16),
    color: '#94a3b8',
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    alignItems: 'center',
  },
  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  systemStatusText: {
    color: '#94a3b8',
    fontSize: responsiveFont(16),
    fontWeight: '500',
    marginLeft: 6,
  },
  versionText: {
    fontSize: responsiveFont(14),
    color: '#4b5563',
  },
  // Modal - Enhanced
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  profileMenuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    elevation: 20,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  profileMenuHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderLight,
  },
  profileMenuAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
  },
  profileMenuAvatarText: {
    color: 'white',
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
  },
  profileMenuName: {
    fontSize: responsiveFont(22),
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  profileMenuEmail: {
    fontSize: responsiveFont(18),
    color: themeColors.textSecondary,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileMenuText: {
    fontSize: responsiveFont(20),
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  logoutMenuItem: {
    marginTop: 4,
  },
  logoutText: {
    color: themeColors.error,
  },
});

export default DashboardScreen;