import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { themeColors, shadows } from '../utils/theme';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutButton from '../components/LogoutButton';

const DashboardScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isNarrowScreen = width < 380;
  const isVeryNarrowScreen = width < 340;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const { logout } = useAuth();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        await fetchDashboardData(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (userData) => {
    try {
      let endpoint = '';
      if (userData.role === 'resident') {
        endpoint = '/visitors/resident/dashboard';
      } else if (userData.role === 'admin') {
        endpoint = '/service-requests/admin/dashboard';
      } else if (userData.role === 'security') {
        endpoint = '/visitors/pending';
      }

      if (endpoint) {
        const response = await api.get(endpoint);
        if (response.data.success) {
          setStats(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const roleConfig = {
    resident: {
      title: 'Resident Dashboard',
      icon: 'home',
      color: '#1e88e5',
      stats: [
        { label: 'Total Visitors', key: 'totalVisitors', value: stats.totalVisitors || 0 },
        { label: "Today's Visitors", key: 'todayVisitors', value: stats.todayVisitors || 0 },
        { label: 'Active Visitors', key: 'activeVisitors', value: stats.activeVisitors || 0 },
        { label: 'Pending', key: 'pendingVisitors', value: stats.pendingVisitors || 0 },
      ],
      quickActions: [
        { title: 'Visitor Pass', icon: 'qr-code', screen: 'VisitorsTab', color: '#10b981' },
        { title: 'Service Requests', icon: 'build', screen: 'ServicesTab', color: '#f59e0b' },
      ],
    },
    admin: {
      title: 'Admin Dashboard',
      icon: 'shield',
      color: '#1976d2',
      stats: [
        { label: 'Total Users', key: 'totalUsers', value: stats.totalUsers || 0 },
        { label: 'Pending Approvals', key: 'pendingApprovals', value: stats.pendingApprovals || 0 },
        { label: 'Active Requests', key: 'activeRequests', value: stats.activeRequests || 0 },
        { label: 'Total Visitors', key: 'totalVisitors', value: stats.totalVisitors || 0 },
      ],
quickActions: [
  { title: 'User Management', icon: 'people', screen: 'UsersTab', color: '#8b5cf6' },
  { title: 'Approvals', icon: 'checkmark-circle', screen: 'AdminApprovals', color: '#f59e0b' },
  { title: 'Visitor Logs', icon: 'qr-code', screen: 'VisitorsTab', color: '#10b981' },
],
    },
    security: {
      title: 'Security Dashboard',
      icon: 'lock-closed',
      color: '#1565c0',
      stats: [
        { label: 'Visitors Today', key: 'visitorsToday', value: stats.visitorsToday || 0 },
        { label: 'Pending Approval', key: 'pendingApproval', value: stats.pendingApproval || 0 },
        { label: 'Active Now', key: 'activeNow', value: stats.activeNow || 0 },
        { label: 'Completed', key: 'completed', value: stats.completed || 0 },
      ],
      quickActions: [
        { title: 'Approvals', icon: 'checkmark-circle', screen: 'ApprovalsTab', color: '#f59e0b' },
        { title: 'Visitor Logs', icon: 'time', screen: 'LogsTab', color: '#3b82f6' },
      ],
    },
  };

  const config = roleConfig[user?.role] || roleConfig.resident;

  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const statGradients = [
    { bg: '#2349d8', accent: '#dbeafe' },
    { bg: '#18a34a', accent: '#dcfce7' },
    { bg: '#0986c8', accent: '#dbeafe' },
    { bg: '#e02424', accent: '#fee2e2' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.topIcon}>
            <Ionicons name={config.icon} size={20} color={themeColors.primary} />
          </View>
            <View style={styles.topTextWrap}>
              <Text style={styles.topBarTitle} numberOfLines={1}>
                {config.title}
              </Text>
              <Text style={styles.topBarSubtitle} numberOfLines={1}>
                Casimiro Westville Homes
              </Text>
          </View>
        </View>
        <LogoutButton navigation={navigation} color={themeColors.textPrimary} size={22} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroImagePlaceholder} />
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>Casimiro Westville Homes - Cavite</Text>
            <Text style={[styles.heroTitle, isNarrowScreen && styles.heroTitleSmall]}>
              Good day, {user?.firstName || 'User'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {formattedDate} - Your community is running smoothly today.
            </Text>
          </View>

          <View style={styles.heroStatsGrid}>
            {config.stats.slice(0, 4).map((stat, index) => (
              <View
                key={index}
                style={[
                  styles.heroStatCell,
                  isVeryNarrowScreen && styles.heroStatCellFull,
                ]}
              >
                <Text style={styles.heroStatValue}>{stat.value}</Text>
                <Text style={styles.heroStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.colorStatsGrid}>
          {config.stats.slice(0, 4).map((stat, index) => {
            const tone = statGradients[index % statGradients.length];
            return (
              <View
                key={index}
                style={[
                  styles.colorStatCard,
                  { backgroundColor: tone.bg },
                  isNarrowScreen && styles.colorStatCardFull,
                ]}
              >
                <Ionicons
                  name={index % 2 === 0 ? 'stats-chart' : 'flash'}
                  size={22}
                  color="rgba(255,255,255,0.65)"
                  style={styles.colorStatIcon}
                />
                <Text style={styles.colorStatValue}>{stat.value}</Text>
                <Text style={styles.colorStatLabel} numberOfLines={2}>
                  {stat.label}
                </Text>
                <Text style={[styles.colorStatHint, { color: tone.accent }]}>Live update</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickActionsList}>
            {config.quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionRow}
                onPress={() => {
                  if (action.screen === 'AdminApprovals') {
                    navigation.navigate('AdminApprovals');
                  } else {
                    navigation.navigate(action.screen);
                  }
                }}
              >
                <View style={[styles.quickActionIconWrap, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon} size={20} color={action.color} />
                </View>
                <View style={styles.quickActionBody}>
                  <Text style={styles.quickActionTitle} numberOfLines={1}>
                    {action.title}
                  </Text>
                  <Text style={styles.quickActionSub}>Tap to open</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
          </View>
          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="notifications" size={18} color={themeColors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>System ready</Text>
                <Text style={styles.activityTime}>Just now</Text>
              </View>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="checkmark-circle" size={18} color={themeColors.success} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Last login successful</Text>
                <Text style={styles.activityTime}>Today</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footerNote}>
          <Ionicons name="business" size={15} color={themeColors.textSecondary} />
          <Text style={styles.footerNoteText}>
            VIMS - {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)} Access
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  topTextWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
  topIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: themeColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  topBarSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 30,
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: '#0f172a',
  },
  heroImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  heroContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  heroEyebrow: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 6,
  },
  heroTitleSmall: {
    fontSize: 20,
    lineHeight: 24,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  heroStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  heroStatCell: {
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroStatCellFull: {
    width: '100%',
    borderRightWidth: 0,
  },
  heroStatValue: {
    color: 'white',
    fontSize: 21,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600',
  },
  colorStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  colorStatCard: {
    width: '48.5%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    minHeight: 116,
    ...shadows.small,
  },
  colorStatCardFull: {
    width: '100%',
  },
  colorStatIcon: {
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  colorStatValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
  },
  colorStatLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  colorStatHint: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: 14,
    overflow: 'hidden',
    ...shadows.small,
  },
  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  quickActionsList: {
    padding: 10,
    gap: 8,
  },
  quickActionRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBody: {
    flex: 1,
    minWidth: 0,
  },
  quickActionTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  quickActionSub: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  activityList: {
    padding: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityDivider: {
    height: 1,
    backgroundColor: themeColors.border,
    marginVertical: 3,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: themeColors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    marginBottom: 2,
    fontWeight: '700',
  },
  activityTime: {
    fontSize: 12,
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  footerNote: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerNoteText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DashboardScreen;