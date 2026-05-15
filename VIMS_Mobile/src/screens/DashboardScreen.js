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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api, { getProtectedImageDataUrl } from '../utils/api';
import testDirectFetch from '../utils/testFetch';
import { startUnreadCountPolling } from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationModal from '../components/NotificationModal';

const DashboardScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({
    quickActions: false,
    recentActivity: false,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { logout, user: authUser } = useAuth();

  const userToShow = authUser || user;

  const formatPeso = (n) => Math.round(Number(n) || 0).toLocaleString('en-PH');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Test direct fetch on app load
        console.log('🧪 Running initial fetch test...');
        const fetchTestResult = await testDirectFetch();
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
        await fetchDashboardData(userData);
        await fetchRecentNotifications();
        await fetchSelfiePreview();
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

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
        const response = await api.get('/visitors/resident/dashboard');
        if (response.data.success) {
          const payload = response.data.data || {};
          setStats(payload.stats || {});
        }
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
        await fetchDashboardData(userData);
        await fetchRecentNotifications();
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
        <ActivityIndicator size="large" color="#1a6b3c" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const roleConfig = {
    resident: {
      title: 'Dashboard',
      icon: 'home-outline',
      stats: [
        { label: 'Total Visitors',   value: stats.totalVisitors   || 0, icon: 'people-outline',          bg: '#2563eb' },
        { label: "Today's Visitors", value: stats.todayVisitors   || 0, icon: 'today-outline',           bg: '#16a34a' },
        { label: 'Active Visitors',  value: stats.activeVisitors  || 0, icon: 'radio-button-on-outline', bg: '#0284c7' },
        { label: 'Pending',          value: stats.pendingVisitors || 0, icon: 'time-outline',            bg: '#dc2626' },
      ],
      hints: ['live from users', "today's count", 'active now', 'awaiting approval'],
      quickActions: [
        { title: 'Make Reservation', subtitle: 'Book venues and equipment',   icon: 'calendar-outline',         screen: 'ReservationsTab', color: '#7c3aed', bg: '#f5f3ff' },
        { title: 'Visitor Pass',     subtitle: 'Manage visitor QR codes',     icon: 'qr-code-outline', screen: 'VisitorsTab', color: '#16a34a', bg: '#f0fdf4' },
        { title: 'Service Requests', subtitle: 'Submit maintenance requests', icon: 'build-outline',   screen: 'ServicesTab', color: '#d97706', bg: '#fffbeb' },
        { title: 'AI Assistant',     subtitle: 'Ask VIMS questions',          icon: 'sparkles-outline', screen: 'Chatbot', color: '#2563eb', bg: '#eff6ff' },
      ],
    },
    admin: {
      title: 'Dashboard',
      icon: 'shield-checkmark-outline',
      stats: [
        { label: 'Total Residents',    value: stats.totalUsers        ?? 0, icon: 'people-outline',       bg: '#2563eb' },
        { label: 'Pending Approvals',  value: stats.pendingApprovals  ?? 0, icon: 'alert-circle-outline', bg: '#16a34a' },
        { label: 'Monthly Collection', value: formatPeso(stats.monthlyCollection ?? 0), icon: 'cash-outline',         bg: '#0284c7', prefix: '₱' },
        { label: 'Active Issues',      value: stats.activeRequests    ?? 0, icon: 'warning-outline',      bg: '#dc2626' },
      ],
      hints: ['all resident accounts', 'awaiting admin review', 'paid this month', 'open service requests'],
      quickActions: [
        { title: 'Reservation Logs', subtitle: 'View reservation history', icon: 'calendar-outline',         screen: 'LogsTab',         color: '#7c3aed', bg: '#f5f3ff' },
        { title: 'User Management', subtitle: 'View and manage users',     icon: 'people-outline',           screen: 'UsersTab',       color: '#7c3aed', bg: '#f5f3ff' },
        { title: 'Approvals',       subtitle: 'Review pending requests',   icon: 'checkmark-circle-outline', screen: 'AdminApprovals', color: '#d97706', bg: '#fffbeb' },
        { title: 'Visitor Logs',    subtitle: 'Full visitor history',      icon: 'qr-code-outline',          screen: 'VisitorsTab',    color: '#16a34a', bg: '#f0fdf4' },
        { title: 'AI Assistant',    subtitle: 'Ask VIMS questions',        icon: 'sparkles-outline',         screen: 'Chatbot',        color: '#2563eb', bg: '#eff6ff' },
      ],
    },
    security: {
      title: 'Dashboard',
      icon: 'lock-closed-outline',
      stats: [
        { label: 'Visitors Today',   value: stats.visitorsToday   || 0, icon: 'today-outline',            bg: '#2563eb' },
        { label: 'Pending Approval', value: stats.pendingApproval || 0, icon: 'alert-circle-outline',     bg: '#16a34a' },
        { label: 'Active Now',       value: stats.activeNow       || 0, icon: 'radio-button-on-outline',  bg: '#0284c7' },
        { label: 'Completed',        value: stats.completed       || 0, icon: 'checkmark-circle-outline', bg: '#dc2626' },
      ],
      hints: ['live today', 'awaiting review', 'inside now', 'today total'],
      quickActions: [
        { title: 'Approvals',    subtitle: 'Review pending entries',     icon: 'checkmark-circle-outline', screen: 'ApprovalsTab', color: '#d97706', bg: '#fffbeb' },
        { title: 'Visitor Logs', subtitle: 'Browse all visitor records', icon: 'time-outline',             screen: 'LogsTab',      color: '#2563eb', bg: '#eff6ff' },
        { title: 'AI Assistant', subtitle: 'Ask VIMS questions',         icon: 'sparkles-outline',         screen: 'Chatbot',      color: '#16a34a', bg: '#f0fdf4' },
      ],
    },
    headOfficer: {
      title: 'Team Dashboard',
      icon: 'people-outline',
      stats: [
        { label: 'Personnel Count',  value: stats.personnelCount  || 0, icon: 'people-outline',          bg: '#8b5cf6' },
        { label: 'Active Patrols',   value: stats.activePatrols   || 0, icon: 'checkmark-circle-outline', bg: '#06b6d4' },
        { label: 'Pending Reports',  value: stats.pendingReports  || 0, icon: 'alert-circle-outline',     bg: '#f97316' },
        { label: 'Completed Today',  value: stats.completedToday  || 0, icon: 'checkmark-done-outline',  bg: '#10b981' },
      ],
      hints: ['assigned team members', 'in progress', 'awaiting review', 'today\'s total'],
      quickActions: [
        { title: 'Team Performance', subtitle: 'View team metrics',       icon: 'stats-chart-outline',      screen: 'TeamPerformanceTab', color: '#8b5cf6', bg: '#faf5ff' },
        { title: 'Personnel Mgmt',   subtitle: 'Manage team members',     icon: 'people-outline',           screen: 'PersonnelTab',      color: '#06b6d4', bg: '#f0f9fa' },
        { title: 'Patrol Analytics', subtitle: 'Review patrol data',      icon: 'document-text-outline',    screen: 'AnalyticsTab',      color: '#f97316', bg: '#fff7ed' },
        { title: 'AI Assistant',     subtitle: 'Ask VIMS questions',      icon: 'sparkles-outline',         screen: 'Chatbot',           color: '#2563eb', bg: '#eff6ff' },
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

  return (
    <View style={styles.container}>

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.topLogoCircle}>
            <Text style={styles.topLogoText}>CW</Text>
          </View>
          <View style={styles.topTextWrap}>
            <Text style={styles.topBarTitle} numberOfLines={1}>Dashboard</Text>
            <Text style={styles.topBarSubtitle} numberOfLines={1}>Casimiro Westville Homes</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          {/* Bell */}
          <TouchableOpacity 
            style={styles.bellBtn}
            onPress={() => setNotificationModalVisible(true)}
          >
            <Ionicons name="notifications-outline" size={18} color="#fff" />
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
                    navigation.navigate('Dashboard');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dropdownItemIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="grid-outline" size={17} color="#16a34a" />
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
                  <View style={[styles.dropdownItemIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="settings-outline" size={17} color="#16a34a" />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b3c" />}
      >

        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <Image source={require('../../assets/roof.png')} style={styles.heroBg} resizeMode="cover" />
          <View style={styles.heroOverlay} />
          <View style={[styles.heroInner, isNarrow && styles.heroInnerNarrow]}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroEyebrow}>Casimiro Westville Homes · Cavite</Text>
              <Text style={[styles.heroTitle, isNarrow && { fontSize: 19, lineHeight: 24 }]}>
                {greeting()}{'\n'}{userToShow?.firstName || 'User'}
              </Text>
              <Text style={styles.heroDate}>{formattedDate}</Text>
              <View style={styles.heroPill}>
                <View style={styles.heroPillDot} />
                <Text style={styles.heroPillText}>Community running smoothly</Text>
              </View>
            </View>
            <View style={[styles.heroRight, isNarrow && styles.heroRightNarrow]}>
              {config.stats.map((stat, i) => (
                <View key={i} style={[styles.heroStatCell, i === config.stats.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.heroStatValue}>{stat.prefix || ''}{stat.value}</Text>
                  <Text style={styles.heroStatLabel} numberOfLines={2}>{stat.label}</Text>
                  <Text style={[styles.heroStatHint, i === 1 && { color: '#fca5a5' }]}>
                    ↗ {config.hints[i]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Colored Stat Cards ── */}
        <View style={[styles.statGrid, isNarrow && styles.statGridNarrow]}>
          {config.stats.map((stat, i) => (
            <View key={i} style={[styles.statCard, isNarrow && styles.statCardNarrow, { backgroundColor: stat.bg }]}>
              <View style={styles.statCardBgIcon}>
                <Ionicons name={stat.icon} size={56} color="rgba(255,255,255,0.15)" />
              </View>
              <View style={styles.statCardTop}>
                <Ionicons name={stat.icon} size={18} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.statCardValue}>{stat.prefix || ''}{stat.value}</Text>
              <Text style={styles.statCardLabel} numberOfLines={2}>{stat.label}</Text>
              <Text style={styles.statCardHint}>↗ {config.hints[i]}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('quickActions')} activeOpacity={0.8}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.sectionToggleWrap}>
              <Text style={styles.sectionToggleText}>{collapsedSections.quickActions ? 'Show' : 'Hide'}</Text>
              <Ionicons name={collapsedSections.quickActions ? 'chevron-down' : 'chevron-up'} size={16} color="#6b7280" />
            </View>
          </TouchableOpacity>
          {!collapsedSections.quickActions && config.quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionRow, i < config.quickActions.length - 1 && styles.actionRowDivider]}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={18} color={action.color} />
              </View>
              <View style={styles.actionBody}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSub}>{action.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Activity (notifications from API) ── */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('recentActivity')} activeOpacity={0.8}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.sectionToggleWrap}>
              <Text style={styles.sectionToggleText}>{collapsedSections.recentActivity ? 'Show' : 'Hide'}</Text>
              <Ionicons name={collapsedSections.recentActivity ? 'chevron-down' : 'chevron-up'} size={16} color="#6b7280" />
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
                  <View style={[styles.actionIconWrap, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="notifications-off-outline" size={16} color="#94a3b8" />
                  </View>
                  <View style={styles.actionBody}>
                    <Text style={styles.actionTitle}>No recent notifications</Text>
                    <Text style={styles.actionSub}>Pull to refresh</Text>
                  </View>
                </View>
              ) : (
                recentActivity.map((n, i) => (
                  <View
                    key={n._id || String(i)}
                    style={[styles.actionRow, i < recentActivity.length - 1 && styles.actionRowDivider]}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: '#eff6ff' }]}> 
                      <Ionicons name="notifications-outline" size={16} color="#2563eb" />
                    </View>
                    <View style={styles.actionBody}>
                      <Text style={styles.actionTitle} numberOfLines={1}>{n.title || 'Notification'}</Text>
                      <Text style={styles.actionSub} numberOfLines={2}>{n.body || ''}</Text>
                    </View>
                  </View>
                ))
              )}
            </>

      {/* Notification Modal */}
      <NotificationModal 
        visible={notificationModalVisible} 
        onClose={() => setNotificationModalVisible(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', gap: 10 },
  loadingText: { fontSize: 14, color: '#64748b', fontWeight: '500' },

  /* Top Bar */
  topBar: {
    paddingTop: 52, paddingHorizontal: 14, paddingBottom: 12,
    backgroundColor: '#1a6b3c',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  topLogoCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  topLogoText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  topTextWrap: { flexShrink: 1, minWidth: 0 },
  topBarTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  topBarSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bellBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
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
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingVertical: 4, paddingLeft: 4, paddingRight: 8,
  },
  userPillAvatar: {
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
  userPillInitials: { fontSize: 8, fontWeight: '900', color: '#1a6b3c' },
  userPillText: { maxWidth: 70 },
  userPillName: { fontSize: 9, fontWeight: '700', color: '#fff' },
  userPillRole: { fontSize: 8, fontWeight: '600', color: '#86efac', marginTop: 1 },

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
    backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  dropdownAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  dropdownAvatarText: { fontSize: 14, fontWeight: '800', color: '#475569' },
  dropdownUserInfo: { flex: 1 },
  dropdownName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  dropdownMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '500' },
  dropdownDivider: { height: 0.5, backgroundColor: '#e2e8f0', marginHorizontal: 14 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dropdownItemIcon: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  dropdownItemText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

  /* Scroll */
  content: { flex: 1 },
  contentContainer: { padding: 12, paddingBottom: 32, gap: 10 },

  /* Hero */
  heroCard: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#0f172a' },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#111827' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  heroInner: { flexDirection: 'row' },
  heroInnerNarrow: { flexDirection: 'column' },
  heroLeft: { flex: 1, padding: 16 },
  heroEyebrow: {
    color: '#4ade80', fontSize: 9, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 28, marginBottom: 6 },
  heroDate: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', lineHeight: 16, marginBottom: 10 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  heroPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  heroPillText: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  heroRight: { width: 120, borderLeftWidth: 0.5, borderLeftColor: 'rgba(255,255,255,0.1)' },
  heroRightNarrow: { width: '100%', borderLeftWidth: 0, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 16 },
  heroStatCell: {
    paddingVertical: 11, paddingHorizontal: 10,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  heroStatValue: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  heroStatLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '600', marginTop: 2, lineHeight: 13 },
  heroStatHint: { color: '#4ade80', fontSize: 9, fontWeight: '700', marginTop: 3 },

  /* Stat Cards */
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statGridNarrow: { flexDirection: 'column', gap: 10 },
  statCard: {
    width: '47.5%', borderRadius: 16, padding: 12, minHeight: 115,
    overflow: 'hidden', justifyContent: 'flex-end',
  },
  statCardNarrow: { width: '100%' },
  statCardBgIcon: { position: 'absolute', right: -8, bottom: -8 },
  statCardTop: { marginBottom: 6 },
  statCardValue: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 30 },
  statCardLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', marginTop: 4 },
  statCardHint: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', marginTop: 5 },

  /* Section Cards */
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionHeaderSecondary: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sectionToggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionToggleText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 14,
    minHeight: 72,
  },
  actionRowDivider: { borderBottomWidth: 0.5, borderBottomColor: '#f8fafc' },
  actionIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  liveBadgeText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
  actionBody: { flex: 1, minWidth: 0 },
  actionTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  actionSub: { color: '#94a3b8', fontSize: 11, marginTop: 1 },
  actionBody: { flex: 1, minWidth: 0 },
  actionTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  actionSub: { color: '#94a3b8', fontSize: 11, marginTop: 1 },

  /* Footer */
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  footerText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
});

export default DashboardScreen;