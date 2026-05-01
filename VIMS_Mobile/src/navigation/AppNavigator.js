import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { themeColors } from '../utils/theme';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import PublicLotMapScreen from '../screens/PublicLotMapScreen';

// Resident Screens
import DashboardScreen from '../screens/DashboardScreen';
import VisitorManagementScreen from '../screens/VisitorManagementScreen';
import ServiceRequestsScreen from '../screens/ServiceRequestsScreen';
import ReservationsScreen from '../screens/ReservationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Shared (all roles) Screens
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

// Admin Screens
import AdminApprovalsScreen from '../screens/admin/AdminApprovalsScreen';
import AdminUserManagementScreen from '../screens/admin/AdminUserManagementScreen';
import AdminServiceRequestsScreen from '../screens/admin/AdminServiceRequestsScreen';
import AdminReservationsScreen from '../screens/admin/AdminReservationsScreen';
import AdminVisitorManagementScreen from '../screens/admin/AdminVisitorManagementScreen';
import AdminVisitorReportsScreen from '../screens/admin/AdminVisitorReportsScreen';
import AdminVerificationQueueScreen from '../screens/admin/AdminVerificationQueueScreen';
import AdminReportSchedulesScreen from '../screens/admin/AdminReportSchedulesScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminAnnouncementsScreen from '../screens/admin/AdminAnnouncementsScreen';
import ArchivedUsersScreen from '../screens/admin/ArchivedUsersScreen';
import ArchivedAnnouncementsScreen from '../screens/admin/ArchivedAnnouncementsScreen';
import ArchivedServiceRequestsScreen from '../screens/admin/ArchivedServiceRequestsScreen';

// Security Screens
import SecurityVisitorApprovalScreen from '../screens/security/SecurityVisitorApprovalScreen';
import SecurityVisitorLogsScreen from '../screens/security/SecurityVisitorLogsScreen';
import SecurityQrScannerScreen from '../screens/security/SecurityQrScannerScreen';
import SecurityServiceRequestsScreen from '../screens/security/SecurityServiceRequestsScreen';
import SecurityPatrolScheduleScreen from '../screens/security/SecurityPatrolScheduleScreen';
import SecurityIncidentsScreen from '../screens/security/SecurityIncidentsScreen';

import PaymentsScreen from '../screens/PaymentsScreen';
import AdminPaymentsScreen from '../screens/admin/AdminPaymentsScreen';
import PaymentRedirectScreen from '../screens/PaymentRedirectScreen';
import PaymentSuccessScreen from '../screens/PaymentSuccessScreen';
import PaymentCancelledScreen from '../screens/PaymentCancelledScreen';
import ChatbotScreen from '../screens/ChatbotScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Resident Tab Navigator
const ResidentTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'DashboardTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ReservationsTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'VisitorsTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'ServicesTab') {
            iconName = focused ? 'build' : 'build-outline';
          } else if (route.name === 'PaymentsTab') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          backgroundColor: themeColors.cardBackground,
          borderTopWidth: 1,
          borderTopColor: themeColors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="ReservationsTab" component={ReservationsScreen} options={{ title: 'Reservations' }} />
      <Tab.Screen name="VisitorsTab" component={VisitorManagementScreen} options={{ title: 'Visitors' }} />
      <Tab.Screen name="ServicesTab" component={ServiceRequestsScreen} options={{ title: 'Services' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Tab.Screen name="PaymentsTab" component={PaymentsScreen} options={{ title: 'Payments' }} />
    </Tab.Navigator>
  );
};

// Admin Tab Navigator
const AdminTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'DashboardTab') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'UsersTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'VisitorsTab') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'ServicesTab') {
            iconName = focused ? 'build' : 'build-outline';
          } else if (route.name === 'PaymentsTab') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'LogsTab') {
            iconName = focused ? 'time' : 'time-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          backgroundColor: themeColors.cardBackground,
          borderTopWidth: 1,
          borderTopColor: themeColors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="UsersTab" component={AdminUserManagementScreen} options={{ title: 'Users' }} />
      <Tab.Screen name="VisitorsTab" component={AdminVisitorManagementScreen} options={{ title: 'Visitors' }} />
      <Tab.Screen name="ServicesTab" component={AdminServiceRequestsScreen} options={{ title: 'Services' }} />
      <Tab.Screen name="PaymentsTab" component={AdminPaymentsScreen} options={{ title: 'Payments' }} />
      <Tab.Screen name="LogsTab" component={AdminReservationsScreen} options={{ title: 'Reservation Logs' }} />
    </Tab.Navigator>
  );
};

// Security Tab Navigator
const SecurityTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'DashboardTab') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'ApprovalsTab') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'LogsTab') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'ScannerTab') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          backgroundColor: themeColors.cardBackground,
          borderTopWidth: 1,
          borderTopColor: themeColors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="ApprovalsTab" component={SecurityVisitorApprovalScreen} options={{ title: 'Approvals' }} />
      <Tab.Screen name="ScannerTab" component={SecurityQrScannerScreen} options={{ title: 'Scanner' }} />
      <Tab.Screen name="LogsTab" component={SecurityVisitorLogsScreen} options={{ title: 'Logs' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
          <Stack.Screen name="PublicLots" component={PublicLotMapScreen} />
        </>
      ) : !user.isApproved ? (
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      ) : (
        <>
          {user.role === 'resident' && (
            <Stack.Screen name="ResidentDashboard" component={ResidentTabs} />
          )}
          {user.role === 'admin' && (
            <>
              <Stack.Screen name="AdminDashboard" component={AdminTabs} />
              <Stack.Screen name="AdminApprovals" component={AdminApprovalsScreen} />
              <Stack.Screen name="AdminVisitorReports" component={AdminVisitorReportsScreen} />
              <Stack.Screen name="AdminVerificationQueue" component={AdminVerificationQueueScreen} />
              <Stack.Screen name="AdminReservations" component={AdminReservationsScreen} />
              <Stack.Screen name="AdminReportSchedules" component={AdminReportSchedulesScreen} />
              <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
              <Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} />
              <Stack.Screen name="ArchivedUsers" component={ArchivedUsersScreen} />
              <Stack.Screen name="ArchivedAnnouncements" component={ArchivedAnnouncementsScreen} />
              <Stack.Screen name="ArchivedServiceRequests" component={ArchivedServiceRequestsScreen} />
            </>
          )}
          {user.role === 'security' && (
            <Stack.Screen name="SecurityDashboard" component={SecurityTabs} />
          )}
        </>
      )}

      {/* ✅ ALWAYS OUTSIDE CONDITION */}
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SecurityServiceRequests" component={SecurityServiceRequestsScreen} />
      <Stack.Screen name="SecurityPatrolSchedule" component={SecurityPatrolScheduleScreen} />
      <Stack.Screen name="SecurityIncidents" component={SecurityIncidentsScreen} />
      <Stack.Screen name="PaymentRedirect" component={PaymentRedirectScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
      <Stack.Screen name="PaymentCancelled" component={PaymentCancelledScreen} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} />

    </Stack.Navigator>
  );
};

export default AppNavigator;