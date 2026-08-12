import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import api, { getProtectedImageDataUrl } from '../utils/api';
import { startUnreadCountPolling } from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationModal from '../components/NotificationModal';
import { radii, shadows, themeColors } from '../utils/theme';
import ChatbotScreen from './ChatbotScreen';

const DashboardScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [securityAnalytics, setSecurityAnalytics] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState(null);
  const [residentOverview, setResidentOverview] = useState({ announcements: [], upcomingSchedules: [], pendingDues: 0, openServices: 0 });
  const [collapsedSections, setCollapsedSections] = useState({
    quickActions: false,
    recentActivity: false,
  });
  
  // Animation States (Senior Developer Micro-Interactions)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const modulePalette = {
    primary: themeColors.primary,
    deep: themeColors.primaryDeep,
    light: themeColors.primaryLight,
    soft: themeColors.primaryWash,
    softer: themeColors.primarySoft,
    archived: themeColors.textSecondary,
  };
  
  const statScaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const actionScaleAnims = useRef(
    Array(16).fill(null).map(() => new Animated.Value(1))
  ).current;

  const { logout, user: authUser } = useAuth();

  const userToShow = authUser || user;

  const formatPeso = (n) => Math.round(Number(n) || 0).toLocaleString('en-PH');

  const openAllNotifications = () => {
    setNotificationModalVisible(false);
    setTimeout(() => {
      navigation.navigate('Notifications');
    }, 0);
  };

  const getDateKey = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDateLabel = (dateKey) => {
    if (!dateKey) return 'N/A';
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const buildMiniSeries = (rows, dateField, valueFilter = () => true) => {
    const counts = rows.reduce((acc, row) => {
      const key = getDateKey(row?.[dateField] || row?.createdAt);
      if (!key || !valueFilter(row)) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-5)
      .map(([date, value]) => ({ date, label: getDateLabel(date), value }));
  };

  // Looping Pulse Animation for AI Assistant FAB
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Spring scale animations for Stats
  const animateStatPressIn = (index) => {
    Animated.spring(statScaleAnims[index], {
      toValue: 0.94,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const animateStatPressOut = (index) => {
    Animated.spring(statScaleAnims[index], {
      toValue: 1.0,
      friction: 5,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  // Spring scale animations for Actions
  const animateActionPressIn = (index) => {
    if (actionScaleAnims[index]) {
      Animated.spring(actionScaleAnims[index], {
        toValue: 0.96,
        friction: 6,
        tension: 180,
        useNativeDriver: true,
      }).start();
    }
  };

  const animateActionPressOut = (index) => {
    if (actionScaleAnims[index]) {
      Animated.spring(actionScaleAnims[index], {
        toValue: 1.0,
        friction: 5,
        tension: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Test direct fetch on app load
        console.log('🧪 Running initial fetch test...');
        // Avoid a redundant health-check request here. The real dashboard requests
        // below already verify connectivity and can start in parallel.
        const fetchTestResult = { success: true };
        if (!fetchTestResult.success) {
          console.warn('⚠️ Direct fetch test failed - backend may be unreachable');
        }
        
        const userStr = await AsyncStorage.getItem('user');
        const userData = authUser || (userStr ? JSON.parse(userStr) : null);
        if (!userData) {
          if (!cancelled) setLoading(false);
          return;
        }
        if (!cancelled) setUser(userData);
        await Promise.allSettled([
          fetchDashboardData(userData),
          fetchRecentNotifications(),
          fetchSelfiePreview(),
        ]);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, authUser?.securityLevel]);

  useEffect(() => {
    if (!user?.role) return;
    const stop = startUnreadCountPolling({
      intervalMs: 45000,
      onCount: (count) => setUnreadCount(count),
    });
    return stop;
  }, [user?.role]);

  const fetchDashboardData = async (userData) => {
    const role = userData?.role;
    const securityLevel = userData?.securityLevel;
    try {
      if (role === 'resident') {
        const [visitorResult, paymentsResult, servicesResult, announcementsResult, schedulesResult] = await Promise.allSettled([
          api.get('/visitors/resident/dashboard'),
          api.get('/payments/my'),
          api.get('/service-requests/my'),
          api.get('/announcements'),
          api.get('/reservations/public/schedules'),
        ]);
        const response = visitorResult.status === 'fulfilled' ? visitorResult.value : null;
        if (response?.data?.success) {
          const payload = response.data.data || {};
          setStats(payload.stats || {});
        }
        const paymentPayload = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data : {};
        const serviceRows = servicesResult.status === 'fulfilled' ? servicesResult.value.data?.data || [] : [];
        const announcementRows = announcementsResult.status === 'fulfilled' ? announcementsResult.value.data?.data || [] : [];
        const schedulePayload = schedulesResult.status === 'fulfilled' ? schedulesResult.value.data?.data : null;
        const scheduleRows = Array.isArray(schedulePayload) ? schedulePayload : (schedulePayload?.schedules || []);
        setResidentOverview({
          pendingDues: paymentPayload?.summary?.totalPending || paymentPayload?.summary?.pendingAmount || 0,
          openServices: serviceRows.filter(item => !['completed', 'cancelled', 'rejected'].includes(item.status)).length,
          announcements: announcementRows.slice(0, 3),
          upcomingSchedules: scheduleRows.filter(item => new Date(item.endDate || item.startDate) >= new Date()).slice(0, 3),
        });
        return;
      }

      if (role === 'admin') {
        const [usersRes, payRes, svcRes] = await Promise.all([
          api.get('/users/stats/summary'),
          api.get('/payments/admin/stats'),
          api.get('/service-requests/admin/dashboard'),
        ]);
        const u = usersRes.data?.success ? usersRes.data.data : {};
        const p = payRes.data?.success ? payRes.data.data : {};
        const s = svcRes.data?.success ? svcRes.data.data : {};
        const activeIssues =
          (s.pendingRequests || 0) +
          (s.underReviewRequests || 0) +
          (s.assignedRequests || 0) +
          (s.inProgressRequests || 0);
        setStats({
          totalUsers: u.residents ?? 0,
          pendingApprovals: u.pendingApproval ?? 0,
          monthlyCollection: p.monthlyCollected ?? 0,
          activeRequests: activeIssues,
        });
        return;
      }

      if (role === 'security') {
        fetchSecurityAnalytics();
        // Check if head officer (supervisor)
        if (securityLevel === 'head-officer') {
          try {
            const response = await api.get('/patrols/head-officer/stats');
            if (response.data.success) {
              setStats({
                personnelCount: response.data.data?.personnelCount || 0,
                activePatrols: response.data.data?.activePatrols || 0,
                pendingReports: response.data.data?.pendingReports || 0,
                completedToday: response.data.data?.completedToday || 0,
              });
              return;
            }
          } catch (error) {
            console.error('Error fetching head officer stats:', error);
            // Fallback to default security dashboard
          }
        }
        
        // Regular security officer
        const response = await api.get('/visitors/security/dashboard');
        if (response.data.success) setStats(response.data.data || {});
        return;
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchSecurityAnalytics = async () => {
    try {
      const [visitorsResult, servicesResult, incidentsResult] = await Promise.allSettled([
        api.get('/visitors'),
        api.get('/service-requests'),
        api.get('/incidents'),
      ]);

      const visitors = visitorsResult.status === 'fulfilled' && Array.isArray(visitorsResult.value.data?.data)
        ? visitorsResult.value.data.data
        : [];
      const services = servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value.data?.data)
        ? servicesResult.value.data.data
        : [];
      const incidents = incidentsResult.status === 'fulfilled' && Array.isArray(incidentsResult.value.data?.data)
        ? incidentsResult.value.data.data
        : [];

      setSecurityAnalytics({
        visitors: buildMiniSeries(visitors, 'createdAt'),
        services: buildMiniSeries(services, 'createdAt'),
        incidents: buildMiniSeries(incidents, 'createdAt'),
        visitorStatus: {
          pending: visitors.filter((item) => item.status === 'pending').length,
          approved: visitors.filter((item) => item.status === 'approved').length,
          active: visitors.filter((item) => item.status === 'active').length,
          completed: visitors.filter((item) => item.status === 'completed').length,
        },
      });
    } catch (error) {
      console.warn('Unable to load security analytics:', error?.message);
    }
  };

  useEffect(() => {
    if (!userToShow?.role) return undefined;

    const refreshStats = () => fetchDashboardData(userToShow);
    const unsubscribe = navigation.addListener('focus', refreshStats);
    const intervalId = setInterval(refreshStats, 120000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [navigation, userToShow?.id, userToShow?.role, userToShow?.securityLevel]);

  const fetchRecentNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        const rows = Array.isArray(res.data.data) ? res.data.data : [];
        setRecentActivity(rows.slice(0, 3));
      }
    } catch (_) {
      // best-effort; dashboard still works without
    }
  };

  const fetchSelfiePreview = async () => {
    try {
      const res = await api.get('/verifications/me');
      if (res.data?.success && res.data.data?.selfieImage) {
        const previewUrl = await getProtectedImageDataUrl(`/verifications/my-files/${res.data.data.selfieImage}`);
        if (previewUrl) {
          setSelfiePreviewUrl(previewUrl);
        }
      }
    } catch (error) {
      console.warn('Could not load selfie preview:', error?.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const userStr = await AsyncStorage.getItem('user');
      const userData = authUser || (userStr ? JSON.parse(userStr) : null);
      if (userData) {
        setUser(userData);
        await Promise.allSettled([
          fetchDashboardData(userData),
          fetchRecentNotifications(),
        ]);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const openDropdown = () => {
    setDropdownVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const closeDropdown = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => setDropdownVisible(false));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const roleConfig = {
    resident: {
      title: 'Dashboard',
      icon: 'home-outline',
      stats: [
        { label: 'Total Visitors',   value: stats.totalVisitors   || 0, icon: 'people-outline',          bg: modulePalette.primary },
        { label: "Today's Visitors", value: stats.todayVisitors   || 0, icon: 'today-outline',           bg: modulePalette.deep },
        { label: 'Active Visitors',  value: stats.activeVisitors  || 0, icon: 'radio-button-on-outline', bg: modulePalette.light },
        { label: 'Pending',          value: stats.pendingVisitors || 0, icon: 'time-outline',            bg: modulePalette.primary },
      ],
      hints: ['live from users', "today's count", 'active now', 'awaiting approval'],
      quickActions: [
        { title: 'Make Reservation', subtitle: 'Book venues and equipment',   icon: 'calendar-outline',         screen: 'ReservationsTab', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Visitor Pass',     subtitle: 'Manage visitor QR codes',     icon: 'qr-code-outline', screen: 'VisitorsTab', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Service Requests', subtitle: 'Submit maintenance requests', icon: 'build-outline',   screen: 'ServicesTab', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Payments',         subtitle: 'View and pay dues',           icon: 'card-outline',    screen: 'PaymentsTab', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Complaints Form',  subtitle: 'Report community concerns',  icon: 'chatbox-ellipses-outline', screen: 'Complaints', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Announcements',    subtitle: 'Read community updates',      icon: 'megaphone-outline', screen: 'Announcements', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Notifications',    subtitle: 'Check alerts and messages',   icon: 'notifications-outline', screen: 'Notifications', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'AI Assistant',     subtitle: 'Ask VIMS questions',          icon: 'sparkles-outline', screen: 'Chatbot', color: modulePalette.primary, bg: modulePalette.soft },
      ],
    },
    admin: {
      title: 'Dashboard',
      icon: 'shield-checkmark-outline',
      stats: [
        { label: 'Total Residents',    value: stats.totalUsers        ?? 0, icon: 'people-outline',       bg: modulePalette.primary },
        { label: 'Pending Approvals',  value: stats.pendingApprovals  ?? 0, icon: 'alert-circle-outline', bg: modulePalette.deep },
        { label: 'Monthly Collection', value: formatPeso(stats.monthlyCollection ?? 0), icon: 'cash-outline',         bg: modulePalette.light, prefix: '₱' },
        { label: 'Active Issues',      value: stats.activeRequests    ?? 0, icon: 'warning-outline',      bg: modulePalette.primary },
      ],
      hints: ['all resident accounts', 'awaiting admin review', 'paid this month', 'open service requests'],
      quickActions: [
        { title: 'Service Requests', subtitle: 'View and assign requests', icon: 'construct-outline', screen: 'ServicesTab', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Reservation Logs', subtitle: 'View reservation history', icon: 'calendar-outline',         screen: 'ReservationsTab', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'User Management', subtitle: 'View and manage users',     icon: 'people-outline',           screen: 'UsersTab',       color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Approvals',       subtitle: 'Review pending requests',   icon: 'checkmark-circle-outline', screen: 'AdminApprovals', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Visitor Logs',    subtitle: 'Full visitor history',      icon: 'qr-code-outline',          screen: 'VisitorsTab',    color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Visitor Reports', subtitle: 'Review visitor analytics',  icon: 'analytics-outline',        screen: 'AdminVisitorReports', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Verification Queue', subtitle: 'Review identity uploads', icon: 'id-card-outline',         screen: 'AdminVerificationQueue', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Payments',        subtitle: 'Manage resident payments',  icon: 'card-outline',             screen: 'PaymentsTab', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Announcements',   subtitle: 'Post community updates',    icon: 'megaphone-outline',        screen: 'AdminAnnouncements', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Lot Management',  subtitle: 'View lot inventory',        icon: 'map-outline',              screen: 'AdminLotManagement', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Archived Users',  subtitle: 'Restore archived accounts', icon: 'archive-outline',          screen: 'ArchivedUsers', color: modulePalette.archived, bg: themeColors.surfaceMuted },
        { title: 'Archived Services', subtitle: 'Restore service records', icon: 'file-tray-full-outline',   screen: 'ArchivedServiceRequests', color: modulePalette.archived, bg: themeColors.surfaceMuted },
        { title: 'Archived Posts',  subtitle: 'Restore announcements',     icon: 'newspaper-outline',        screen: 'ArchivedAnnouncements', color: modulePalette.archived, bg: themeColors.surfaceMuted },
        { title: 'Notifications',   subtitle: 'Check system alerts',       icon: 'notifications-outline',    screen: 'Notifications', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'AI Assistant',    subtitle: 'Ask VIMS questions',        icon: 'sparkles-outline',         screen: 'Chatbot',        color: modulePalette.primary, bg: modulePalette.soft },
      ],
    },
    security: {
      title: 'Dashboard',
      icon: 'lock-closed-outline',
      stats: [
        { label: 'Visitors Today',   value: stats.visitorsToday   || 0, icon: 'today-outline',            bg: modulePalette.primary },
        { label: 'Pending Approval', value: stats.pendingApproval || 0, icon: 'alert-circle-outline',     bg: modulePalette.deep },
        { label: 'Active Now',       value: stats.activeNow       || 0, icon: 'radio-button-on-outline',  bg: modulePalette.light },
        { label: 'Completed',        value: stats.completed       || 0, icon: 'checkmark-circle-outline', bg: modulePalette.primary },
      ],
      hints: ['live today', 'awaiting review', 'inside now', 'today total'],
      quickActions: [
        { title: 'Approvals',    subtitle: 'Review pending entries',     icon: 'checkmark-circle-outline', screen: 'ApprovalsTab', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Visitor Logs', subtitle: 'Browse all visitor records', icon: 'time-outline',             screen: 'LogsTab',      color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Service Requests', subtitle: 'Handle assigned requests', icon: 'construct-outline',       screen: 'SecurityServiceRequests', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Patrol Schedule', subtitle: 'Submit patrol logs',        icon: 'shield-checkmark-outline', screen: 'SecurityPatrolSchedule', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Incident Reports', subtitle: 'Track security incidents', icon: 'warning-outline',         screen: 'SecurityIncidents', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Announcements', subtitle: 'Read community updates',      icon: 'megaphone-outline',       screen: 'Announcements', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Notifications', subtitle: 'Check alerts and messages',   icon: 'notifications-outline',   screen: 'Notifications', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'AI Assistant', subtitle: 'Ask VIMS questions',         icon: 'sparkles-outline',         screen: 'Chatbot',      color: modulePalette.deep, bg: modulePalette.softer },
      ],
    },
    headOfficer: {
      title: 'Team Dashboard',
      icon: 'people-outline',
      stats: [
        { label: 'Personnel Count',  value: stats.personnelCount  || 0, icon: 'people-outline',          bg: modulePalette.primary },
        { label: 'Active Patrols',   value: stats.activePatrols   || 0, icon: 'checkmark-circle-outline', bg: modulePalette.deep },
        { label: 'Pending Reports',  value: stats.pendingReports  || 0, icon: 'alert-circle-outline',     bg: modulePalette.light },
        { label: 'Completed Today',  value: stats.completedToday  || 0, icon: 'checkmark-done-outline',  bg: modulePalette.primary },
      ],
      hints: ['assigned team members', 'in progress', 'awaiting review', 'today\'s total'],
      quickActions: [
        { title: 'Team Performance', subtitle: 'View team metrics',       icon: 'stats-chart-outline',      screen: 'TeamPerformanceTab', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Personnel Management', subtitle: 'Manage team members', icon: 'people-outline',           screen: 'PersonnelTab',      color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Service Requests', subtitle: 'Handle assigned requests', icon: 'construct-outline',        screen: 'SecurityServiceRequests', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Patrol Schedule',  subtitle: 'Submit patrol logs',       icon: 'shield-checkmark-outline', screen: 'SecurityPatrolSchedule', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Patrol Analytics', subtitle: 'Review patrol data',      icon: 'document-text-outline',    screen: 'AnalyticsTab',      color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Visitor Approvals', subtitle: 'Review pending entries',  icon: 'checkmark-circle-outline', screen: 'ApprovalsTab', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Visitor Logs',     subtitle: 'Browse visitor records',   icon: 'time-outline',             screen: 'LogsTab', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Incident Reports', subtitle: 'Track security incidents', icon: 'warning-outline',          screen: 'SecurityIncidents', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'Announcements',    subtitle: 'Read community updates',   icon: 'megaphone-outline',        screen: 'Announcements', color: modulePalette.primary, bg: modulePalette.soft },
        { title: 'Notifications',    subtitle: 'Check alerts and messages', icon: 'notifications-outline',   screen: 'Notifications', color: modulePalette.deep, bg: modulePalette.softer },
        { title: 'AI Assistant',     subtitle: 'Ask VIMS questions',      icon: 'sparkles-outline',         screen: 'Chatbot',           color: modulePalette.primary, bg: modulePalette.soft },
      ],
    },
  };

  // Determine config based on role and securityLevel
  let configKey = userToShow?.role;
  if (userToShow?.role === 'security' && userToShow?.securityLevel === 'head-officer') {
    configKey = 'headOfficer';
  }
  const config = roleConfig[configKey] || roleConfig.resident;

  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

  const roleDisplay = userToShow?.role
    ? userToShow.role === 'admin' ? 'Administrator' 
    : userToShow.role === 'security' 
      ? (userToShow?.securityLevel === 'head-officer' ? 'Head Officer' : 'Security Officer')
    : 'Approved'
    : 'Approved';

  const initials = [userToShow?.firstName?.[0], userToShow?.lastName?.[0]]
    .filter(Boolean).join('') || 'U';

  const avatarUri = userToShow?.profilePhotoUrl
    ? userToShow.profilePhotoUrl
    : userToShow?.profilePhoto
      ? userToShow.profilePhoto.startsWith('http')
        ? userToShow.profilePhoto
        : `${api.defaults.baseURL?.replace(/\/api$/, '')}/uploads/profile-photos/${userToShow.profilePhoto}`
      : selfiePreviewUrl;

  const fullName = `${userToShow?.firstName || ''} ${userToShow?.lastName || ''}`.trim() || 'User';
  const roleName = userToShow?.role
    ? userToShow.role.charAt(0).toUpperCase() + userToShow.role.slice(1)
    : 'User';

  const activeMetricValue = (() => {
    if (configKey === 'security') return stats.activeNow ?? 0;
    if (configKey === 'headOfficer') return stats.activePatrols ?? 0;
    return stats.activeVisitors ?? 0;
  })();

  const activeMetricLabel = configKey === 'headOfficer' ? 'Active Patrols' : 'Active Visitors';
  const activeMetricSub = configKey === 'headOfficer' ? 'Live Patrols' : 'Secured Entries';

  return (
    <View style={styles.container}>

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.commandAvatar} onPress={openDropdown} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.commandAvatarImage} />
            ) : (
              <Text style={styles.commandAvatarText}>{initials}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.topTextWrap}>
            <Text style={styles.topBarEyebrow}>{roleDisplay.toUpperCase()}</Text>
            <Text style={styles.topBarTitle} numberOfLines={1}>Hello, {userToShow?.firstName || 'User'}</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          {/* Bell */}
          <TouchableOpacity 
            style={styles.bellBtn}
            onPress={() => setNotificationModalVisible(true)}
          >
            <Ionicons name="notifications-outline" size={21} color={themeColors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Pill — tapping opens dropdown */}
          <TouchableOpacity style={styles.userPill} onPress={openDropdown} activeOpacity={0.8}>
            <View style={styles.userPillAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.userPillAvatarImage} />
              ) : (
                <Text style={styles.userPillInitials}>{initials}</Text>
              )}
            </View>
            <View style={styles.userPillText}>
              <Text style={styles.userPillName} numberOfLines={1}>{fullName}</Text>
              <Text style={styles.userPillRole}>● {roleDisplay}</Text>
            </View>
            <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.8)" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Dropdown Modal ── */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="none"
        onRequestClose={closeDropdown}
      >
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.dropdown, { opacity: fadeAnim }]}>

                {/* User Header */}
                <View style={styles.dropdownHeader}>
                  <View style={styles.dropdownAvatar}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.dropdownAvatarImage} />
                    ) : (
                      <Text style={styles.dropdownAvatarText}>{initials}</Text>
                    )}
                  </View>
                  <View style={styles.dropdownUserInfo}>
                    <Text style={styles.dropdownName}>{fullName}</Text>
                    <Text style={styles.dropdownMeta}>
                      {roleName} · {userToShow?.houseNumber || 'No house'}
                    </Text>
                  </View>
                </View>

                <View style={styles.dropdownDivider} />

                {/* Dashboard */}
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    closeDropdown();
                    navigation.navigate('DashboardTab');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dropdownItemIcon, { backgroundColor: themeColors.primarySoft }]}>
                    <Ionicons name="grid-outline" size={17} color={themeColors.primary} />
                  </View>
                  <Text style={styles.dropdownItemText}>Dashboard</Text>
                </TouchableOpacity>

                {/* Profile Settings */}
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    closeDropdown();
                    navigation.navigate('ProfileTab');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dropdownItemIcon, { backgroundColor: themeColors.primarySoft }]}>
                    <Ionicons name="settings-outline" size={17} color={themeColors.primary} />
                  </View>
                  <Text style={styles.dropdownItemText}>Profile Settings</Text>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                {/* Logout */}
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    closeDropdown();
                    logout();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dropdownItemIcon, { backgroundColor: '#fef2f2' }]}>
                    <Ionicons name="log-out-outline" size={17} color="#ef4444" />
                  </View>
                  <Text style={[styles.dropdownItemText, { color: '#ef4444' }]}>Logout</Text>
                </TouchableOpacity>

              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      >

        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <Image source={require('../../assets/roof.png')} style={styles.heroBg} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(20, 83, 45, 0.85)', 'rgba(15, 23, 42, 0.92)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.heroInner, isNarrow && styles.heroInnerNarrow]}>
            <View style={styles.heroLeft}>
              <View style={styles.heroEyebrowPill}>
                <Ionicons name="location-sharp" size={10} color={themeColors.primaryLight} />
                <Text style={styles.heroEyebrow}>WESTVILLE CASIMIRO HOMES</Text>
              </View>
              <Text style={[styles.heroTitle, isNarrow && { fontSize: 20, lineHeight: 26 }]}>
                {greeting()},{'\n'}
                <Text style={styles.heroTitleBold}>{userToShow?.firstName || 'User'}</Text>
              </Text>
              <Text style={styles.heroDate}>{formattedDate}</Text>
              <View style={styles.heroPill}>
                <View style={styles.heroPillDot} />
                <Text style={styles.heroPillText}>Secure Community Active</Text>
              </View>
            </View>
            
            {/* Elegant Glassmorphic Access Widget (Replacing cluttered duplicate lists) */}
            <View style={[styles.heroRightWidget, isNarrow && styles.heroRightWidgetNarrow]}>
              <View style={styles.accessIndicatorCircle}>
                <Text style={styles.accessIndicatorValue}>
                  {activeMetricValue}
                </Text>
                <View style={styles.accessPulseDot} />
              </View>
              <Text style={styles.accessIndicatorLabel}>{activeMetricLabel}</Text>
              <Text style={styles.accessIndicatorSub}>{activeMetricSub}</Text>
            </View>
          </View>
        </View>

        {/* ── Colored Stat Cards ── */}
        <View style={[styles.statGrid, isNarrow && styles.statGridNarrow]}>
          {config.stats.map((stat, i) => {
            // Curated, beautiful gradients matching the original colors
            const gradientColors = 
              i === 0 ? [themeColors.primaryWash, themeColors.primarySoft] :
              i === 1 ? [themeColors.cardBackground, themeColors.primaryWash] :
              i === 2 ? [themeColors.cardBackground, themeColors.primaryWash] :
              [themeColors.primaryWash, themeColors.surfaceTint];

            return (
              <Animated.View
                key={i}
                style={[
                  isNarrow ? styles.statCardNarrow : styles.statCardWrapper,
                  {
                    transform: [{ scale: statScaleAnims[i] || 1 }],
                  }
                ]}
              >
                <Pressable
                  onPressIn={() => animateStatPressIn(i)}
                  onPressOut={() => animateStatPressOut(i)}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statCard}
                  >
                    <View style={styles.statCardBgIcon}>
                      <Ionicons name={stat.icon} size={62} color="rgba(255,255,255,0.12)" />
                    </View>
                    <View style={styles.statCardTop}>
                      <Ionicons name={stat.icon} size={18} color="rgba(255,255,255,0.7)" />
                    </View>
                    <Text style={styles.statCardValue}>{stat.prefix || ''}{stat.value}</Text>
                    <Text style={styles.statCardLabel} numberOfLines={2}>{stat.label}</Text>
                    <Text style={styles.statCardHint}>↗ {config.hints[i]}</Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Quick Actions ── */}
        <View style={[styles.sectionCard, styles.quickActionsCard]}>
          <TouchableOpacity style={[styles.sectionHeader, styles.quickActionsHeader]} onPress={() => toggleSection('quickActions')} activeOpacity={0.8}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.sectionToggleWrap}>
              <Text style={styles.sectionToggleText}>{collapsedSections.quickActions ? 'Show' : 'Hide'}</Text>
              <Ionicons name={collapsedSections.quickActions ? 'chevron-down' : 'chevron-up'} size={16} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>
          {!collapsedSections.quickActions && config.quickActions.map((action, i) => (
            <Animated.View
              key={i}
              style={{
                width: '50%',
                transform: [{ scale: actionScaleAnims[i] || 1 }]
              }}
            >
              <Pressable
                onPressIn={() => animateActionPressIn(i)}
                onPressOut={() => animateActionPressOut(i)}
                onPress={() => action.screen === 'Chatbot' ? setAssistantVisible(true) : navigation.navigate(action.screen)}
                style={({ pressed }) => [
                  styles.actionRow,
                  styles.quickActionTile,
                  pressed && styles.actionRowPressed,
                  i < config.quickActions.length - 1 && styles.actionRowDivider
                ]}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon} size={18} color={action.color} />
                </View>
                <View style={styles.actionBody}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionSub}>{action.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={themeColors.borderStrong} />
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {userToShow?.role === 'resident' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Community Overview</Text>
              <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveBadgeText}>Live</Text></View>
            </View>
            <View style={styles.residentOverviewGrid}>
              <TouchableOpacity style={styles.residentOverviewCard} onPress={() => navigation.navigate('PaymentsTab')}>
                <Ionicons name="wallet-outline" size={20} color={themeColors.primary} />
                <Text style={styles.residentOverviewValue}>₱{formatPeso(residentOverview.pendingDues)}</Text>
                <Text style={styles.residentOverviewLabel}>Pending dues</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.residentOverviewCard} onPress={() => navigation.navigate('ServicesTab')}>
                <Ionicons name="build-outline" size={20} color={themeColors.primaryDeep} />
                <Text style={styles.residentOverviewValue}>{residentOverview.openServices}</Text>
                <Text style={styles.residentOverviewLabel}>Open services</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.feedHeader} onPress={() => navigation.navigate('Announcements')}>
              <Text style={styles.feedTitle}>Latest announcements</Text><Ionicons name="chevron-forward" size={17} color={themeColors.primaryDeep} />
            </TouchableOpacity>
            {residentOverview.announcements.length ? residentOverview.announcements.map(item => (
              <View key={item._id} style={styles.feedRow}><Ionicons name="megaphone-outline" size={17} color={themeColors.primary} /><View style={{ flex: 1 }}><Text style={styles.feedRowTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.feedRowMeta} numberOfLines={1}>{item.body}</Text></View></View>
            )) : <Text style={styles.analyticsEmpty}>No announcements yet</Text>}
            <Text style={[styles.feedTitle, { marginTop: 14 }]}>Upcoming community schedules</Text>
            {residentOverview.upcomingSchedules.length ? residentOverview.upcomingSchedules.map((item, index) => (
              <View key={item.reservationId || item._id || index} style={styles.feedRow}><Ionicons name="calendar-outline" size={17} color={themeColors.primary} /><View style={{ flex: 1 }}><Text style={styles.feedRowTitle} numberOfLines={1}>{item.resourceName || 'Community reservation'}</Text><Text style={styles.feedRowMeta}>{item.startDate ? new Date(item.startDate).toLocaleString() : 'Schedule pending'}</Text></View></View>
            )) : <Text style={styles.analyticsEmpty}>No upcoming schedules</Text>}
          </View>
        )}

        {userToShow?.role === 'security' && securityAnalytics && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Security Analytics</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>Live</Text>
              </View>
            </View>
            {[
              { title: 'Daily Visitor Activity', rows: securityAnalytics.visitors, color: themeColors.primary },
              { title: 'Service Request Trends', rows: securityAnalytics.services, color: themeColors.primaryDeep },
              { title: 'Incident Reports', rows: securityAnalytics.incidents, color: themeColors.primaryLight },
            ].map((chart) => {
              const maxValue = Math.max(1, ...chart.rows.map((row) => row.value));
              return (
                <View key={chart.title} style={styles.analyticsBlock}>
                  <Text style={styles.analyticsTitle}>{chart.title}</Text>
                  {chart.rows.length === 0 ? (
                    <Text style={styles.analyticsEmpty}>No records yet</Text>
                  ) : chart.rows.map((row) => (
                    <View key={`${chart.title}-${row.date}`} style={styles.analyticsRow}>
                      <Text style={styles.analyticsDate}>{row.label}</Text>
                      <View style={styles.analyticsBarTrack}>
                        <View style={[styles.analyticsBarFill, { width: `${Math.max(8, (row.value / maxValue) * 100)}%`, backgroundColor: chart.color }]} />
                      </View>
                      <Text style={styles.analyticsValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
            <View style={styles.analyticsBlock}>
              <Text style={styles.analyticsTitle}>Current Visitor Status</Text>
              <View style={styles.statusGrid}>
                {Object.entries(securityAnalytics.visitorStatus).map(([label, value]) => (
                  <View key={label} style={styles.statusCell}>
                    <Text style={styles.statusValue}>{value}</Text>
                    <Text style={styles.statusLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Recent Activity (notifications from API) ── */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('recentActivity')} activeOpacity={0.8}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.sectionToggleWrap}>
              <Text style={styles.sectionToggleText}>{collapsedSections.recentActivity ? 'Show' : 'Hide'}</Text>
              <Ionicons name={collapsedSections.recentActivity ? 'chevron-down' : 'chevron-up'} size={16} color={themeColors.textSecondary} />
            </View>
          </TouchableOpacity>
          {!collapsedSections.recentActivity && (
            <>
              <View style={styles.sectionHeaderSecondary}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              </View>
              {recentActivity.length === 0 ? (
                <View style={[styles.actionRow, { borderBottomWidth: 0 }]}>
                  <View style={[styles.actionIconWrap, { backgroundColor: themeColors.surfaceMuted }]}>
                    <Ionicons name="notifications-off-outline" size={16} color={themeColors.textMuted} />
                  </View>
                  <View style={styles.actionBody}>
                    <Text style={styles.actionTitle}>No recent notifications</Text>
                    <Text style={styles.actionSub}>Pull to refresh</Text>
                  </View>
                </View>
              ) : (
                recentActivity.map((n, i) => (
                  <TouchableOpacity
                    key={n._id || String(i)}
                    style={[styles.actionRow, i < recentActivity.length - 1 && styles.actionRowDivider]}
                    onPress={() => setNotificationModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: themeColors.primaryWash }]}> 
                      <Ionicons name="notifications-outline" size={16} color={themeColors.primary} />
                    </View>
                    <View style={styles.actionBody}>
                      <Text style={styles.actionTitle} numberOfLines={1}>{n.title || 'Notification'}</Text>
                      <Text style={styles.actionSub} numberOfLines={2}>{n.body || ''}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

        {/* Notification Modal */}
        <NotificationModal 
          visible={notificationModalVisible} 
          onClose={() => setNotificationModalVisible(false)} 
          navigation={navigation}
          onViewAll={openAllNotifications}
        />
      </View>
    </ScrollView>

      <Modal
        visible={assistantVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setAssistantVisible(false)}
      >
        <View style={styles.assistantBackdrop}>
          <View style={styles.assistantBubble}>
            <ChatbotScreen navigation={navigation} embedded onClose={() => setAssistantVisible(false)} />
          </View>
        </View>
      </Modal>

      <Animated.View
        style={[
          styles.floatingAssistantPulseContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.floatingAssistant}
          onPress={() => setAssistantVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
  </View>
  );
};

const styles = StyleSheet.create({
  residentOverviewGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  residentOverviewCard: { flex: 1, padding: 14, borderRadius: 15, backgroundColor: themeColors.primaryWash, borderWidth: 1, borderColor: themeColors.border },
  residentOverviewValue: { color: themeColors.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 7 },
  residentOverviewLabel: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, marginBottom: 7 },
  feedTitle: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '900' },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  feedRowTitle: { color: themeColors.textPrimary, fontSize: 12, fontWeight: '800' },
  feedRowMeta: { color: themeColors.textSecondary, fontSize: 10, marginTop: 2 },
  container: { flex: 1, backgroundColor: themeColors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background, gap: 10 },
  loadingText: { fontSize: 14, color: themeColors.textSecondary, fontWeight: '500' },

  /* Top Bar */
  topBar: {
    paddingTop: 50, paddingHorizontal: 18, paddingBottom: 14,
    backgroundColor: themeColors.background,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1, minWidth: 0 },
  commandAvatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: themeColors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  commandAvatarImage: { width: 44, height: 44 },
  commandAvatarText: { color: themeColors.primaryDeep, fontSize: 13, fontWeight: '900' },
  topBarEyebrow: { color: themeColors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  topLogoCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  topLogoText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  topTextWrap: { flexShrink: 1, minWidth: 0 },
  topBarTitle: { color: themeColors.textPrimary, fontSize: 19, fontWeight: '900', letterSpacing: -0.4, marginTop: 1 },
  topBarSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: themeColors.cardBackground,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: themeColors.border,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  userPill: {
    width: 40, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: themeColors.primaryDeep,
    borderRadius: 14,
  },
  userPillAvatar: {
    display: 'none',
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  userPillAvatarImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  userPillInitials: { fontSize: 8, fontWeight: '900', color: themeColors.primaryDeep },
  userPillText: { display: 'none' },
  userPillName: { fontSize: 9, fontWeight: '700', color: '#fff' },
  userPillRole: { fontSize: 8, fontWeight: '600', color: themeColors.primarySoft, marginTop: 1 },

  /* Dropdown Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 105,
    paddingRight: 12,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 230,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14,
  },
  dropdownAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: themeColors.border,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  dropdownAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  dropdownAvatarText: { fontSize: 14, fontWeight: '800', color: themeColors.primaryDeep },
  dropdownUserInfo: { flex: 1 },
  dropdownName: { fontSize: 13, fontWeight: '800', color: themeColors.textPrimary },
  dropdownMeta: { fontSize: 11, color: themeColors.textMuted, marginTop: 2, fontWeight: '500' },
  dropdownDivider: { height: 0.5, backgroundColor: themeColors.border, marginHorizontal: 14 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dropdownItemIcon: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  dropdownItemText: { fontSize: 13, fontWeight: '700', color: themeColors.textPrimary },

  /* Scroll */
  content: { flex: 1 },
  contentContainer: { padding: 18, paddingBottom: 36, gap: 18 },

  /* Hero */
  heroCard: { display: 'none' },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: themeColors.primaryDeep, opacity: 0 },
  heroInner: { flexDirection: 'row', alignItems: 'center' },
  heroInnerNarrow: { flexDirection: 'row', alignItems: 'center' },
  heroLeft: { flex: 1, padding: 20 },
  heroEyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  heroEyebrow: {
    color: themeColors.accent, fontSize: 9, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  heroTitle: { color: themeColors.primarySoft, fontSize: 17, fontWeight: '500', lineHeight: 22, marginBottom: 5 },
  heroTitleBold: { color: '#fff', fontSize: 22, fontWeight: '900' },
  heroDate: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', lineHeight: 16, marginBottom: 12 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  heroPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: themeColors.accent },
  heroPillText: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  
  /* Modern Access Widget */
  heroRightWidget: {
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    height: '100%',
  },
  heroRightWidgetNarrow: {
    width: 108,
    borderLeftWidth: 1,
    borderTopWidth: 0,
    paddingVertical: 16,
    height: '100%',
  },
  accessIndicatorCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(74, 222, 128, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    marginBottom: 6,
    position: 'relative',
  },
  accessIndicatorValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  accessPulseDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.primaryLight,
    shadowColor: themeColors.primaryLight,
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
  accessIndicatorLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  accessIndicatorSub: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },

  /* Stat Cards */
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statGridNarrow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '100%', borderRadius: 18, padding: 14, minHeight: 102,
    overflow: 'hidden', justifyContent: 'flex-end',
  },
  statCardWrapper: { width: '48%' },
  statCardNarrow: { width: '48%' },
  statCardBgIcon: { position: 'absolute', right: -8, bottom: -8, opacity: 0.35 },
  statCardTop: { marginBottom: 6 },
  statCardValue: { color: themeColors.textPrimary, fontSize: 25, fontWeight: '900', lineHeight: 28 },
  statCardLabel: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '800', marginTop: 4 },
  statCardHint: { color: themeColors.textMuted, fontSize: 9, fontWeight: '700', marginTop: 5 },

  /* Section Cards */
  sectionCard: {
    backgroundColor: themeColors.cardBackground, borderRadius: 12,
    borderWidth: 1, borderColor: themeColors.border, overflow: 'hidden', ...shadows.small,
  },
  quickActionsCard: { flexDirection: 'row', flexWrap: 'wrap' },
  quickActionsHeader: { width: '100%' },
  sectionHeader: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: themeColors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionHeaderSecondary: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: themeColors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: themeColors.textPrimary },
  sectionToggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionToggleText: { fontSize: 12, fontWeight: '700', color: themeColors.textSecondary },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 14,
    minHeight: 72,
  },
  actionRowDivider: { borderBottomWidth: 0.5, borderBottomColor: themeColors.border },
  quickActionTile: {
    minHeight: 142,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderRightWidth: 0.5,
    borderRightColor: themeColors.border,
  },
  actionIconWrap: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: themeColors.primaryWash, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: themeColors.primary },
  liveBadgeText: { fontSize: 10, fontWeight: '700', color: themeColors.primaryDeep },
  analyticsBlock: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: themeColors.border,
  },
  analyticsTitle: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '900', marginBottom: 8 },
  analyticsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  analyticsDate: { width: 48, color: themeColors.textSecondary, fontSize: 11, fontWeight: '700' },
  analyticsBarTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: themeColors.border, overflow: 'hidden' },
  analyticsBarFill: { height: '100%', borderRadius: 999 },
  analyticsValue: { width: 24, textAlign: 'right', color: themeColors.textPrimary, fontSize: 12, fontWeight: '900' },
  analyticsEmpty: { color: themeColors.textMuted, fontSize: 12, fontWeight: '600' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCell: { flexGrow: 1, minWidth: '45%', backgroundColor: themeColors.primaryWash, borderRadius: 12, padding: 10 },
  statusValue: { color: themeColors.primary, fontSize: 18, fontWeight: '900' },
  statusLabel: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  actionBody: { flex: 1, minWidth: 0 },
  actionTitle: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '800' },
  actionSub: { color: themeColors.textMuted, fontSize: 11, marginTop: 1 },
  actionBody: { flex: 1, minWidth: 0 },
  actionTitle: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '800' },
  actionSub: { color: themeColors.textMuted, fontSize: 11, marginTop: 1 },

  /* Footer */
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  footerText: { color: themeColors.textMuted, fontSize: 11, fontWeight: '600' },
  assistantBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.22)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  assistantBubble: {
    height: '72%',
    minHeight: 470,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  floatingAssistant: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingAssistantPulseContainer: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardWrapper: {
    width: '48.5%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionRowPressed: {
    backgroundColor: themeColors.primaryWash,
  },
});

export default DashboardScreen;


