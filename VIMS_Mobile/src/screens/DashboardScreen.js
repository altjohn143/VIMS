import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { themeColors, shadows } from '../utils/theme';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutButton from '../components/LogoutButton';

const DashboardScreen = ({ navigation }) => {
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name={config.icon} size={28} color="white" />
            </View>
            <View>
              <Text style={styles.headerTitle}>{config.title}</Text>
              <Text style={styles.headerSubtitle}>
                Welcome, {user?.firstName} {user?.lastName}
              </Text>
            </View>
          </View>
          <LogoutButton navigation={navigation} color="white" size={24} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsGrid}>
          {config.stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, shadows.small]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {config.quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickAction, { backgroundColor: action.color + '15' }]}
                onPress={() => {
                  if (action.screen === 'AdminApprovals') {
                    navigation.navigate('AdminApprovals');
                  } else {
                    navigation.navigate(action.screen);
                  }
                }}
              >
                <Ionicons name={action.icon} size={28} color={action.color} />
                <Text style={[styles.quickActionText, { color: action.color }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={[styles.activityCard, shadows.small]}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="time" size={20} color={themeColors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>System ready</Text>
                <Text style={styles.activityTime}>Just now</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Last login successful</Text>
                <Text style={styles.activityTime}>Today</Text>
              </View>
            </View>
          </View>
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
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
});

export default DashboardScreen;