import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import MobileTabBar from '../components/MobileTabBar';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import PublicLotMapScreen from '../screens/PublicLotMapScreen';

// Resident Screens
import DashboardScreen from '../screens/DashboardScreen';
import VisitorManagementScreen from '../screens/VisitorManagementScreen';
import ServiceRequestsScreen from '../screens/ServiceRequestsScreen';
import ComplaintsScreen from '../screens/ComplaintsScreen';
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
import AdminAnnouncementsScreen from '../screens/admin/AdminAnnouncementsScreen';
import AdminLotManagementScreen from '../screens/admin/AdminLotManagementScreen';
import AdminLotMapEditorScreen from '../screens/admin/AdminLotMapEditorScreen';
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
import HeadOfficerTeamScreen from '../screens/security/HeadOfficerTeamScreen';

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
      tabBar={(props) => <MobileTabBar {...props} />}
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShown: false,
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="ReservationsTab" component={ReservationsScreen} options={{ title: 'Reservations' }} />
      <Tab.Screen name="VisitorsTab" component={VisitorManagementScreen} options={{ title: 'Visitors' }} />
      <Tab.Screen name="ServicesTab" component={ServiceRequestsScreen} options={{ title: 'Services' }} />
      <Tab.Screen name="PaymentsTab" component={PaymentsScreen} options={{ title: 'Payments' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

// Admin Tab Navigator
const AdminTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      tabBar={(props) => <MobileTabBar {...props} />}
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShown: false,
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="UsersTab" component={AdminUserManagementScreen} options={{ title: 'Users' }} />
      <Tab.Screen name="VisitorsTab" component={AdminVisitorManagementScreen} options={{ title: 'Visitors' }} />
      <Tab.Screen name="ServicesTab" component={AdminServiceRequestsScreen} options={{ title: 'Services' }} />
      <Tab.Screen name="PaymentsTab" component={AdminPaymentsScreen} options={{ title: 'Payments' }} />
      <Tab.Screen name="ReservationsTab" component={AdminReservationsScreen} options={{ title: 'Reservations' }} />
      <Tab.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} options={{ title: 'Posts' }} />
      <Tab.Screen name="AdminLotManagement" component={AdminLotManagementScreen} options={{ title: 'Lots' }} />
    </Tab.Navigator>
  );
};

// Security Tab Navigator
const SecurityTabs = () => {
  const { user } = useAuth();
  const isHeadOfficer =
    user?.securityLevel === 'head-officer' ||
    String(user?.email || '').toLowerCase() === 'security@vims.com';

  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      tabBar={(props) => <MobileTabBar {...props} />}
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShown: false,
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="ApprovalsTab" component={SecurityVisitorApprovalScreen} options={{ title: 'Approvals' }} />
      <Tab.Screen name="ScannerTab" component={SecurityQrScannerScreen} options={{ title: 'Scanner' }} />
      <Tab.Screen name="LogsTab" component={SecurityVisitorLogsScreen} options={{ title: 'Logs' }} />
      <Tab.Screen name="SecurityServiceRequests" component={SecurityServiceRequestsScreen} options={{ title: 'Services' }} />
      <Tab.Screen name="SecurityPatrolSchedule" component={SecurityPatrolScheduleScreen} options={{ title: 'Patrol' }} />
      <Tab.Screen name="SecurityIncidents" component={SecurityIncidentsScreen} options={{ title: 'Incidents' }} />
      {isHeadOfficer && (
        <Tab.Screen name="TeamPerformanceTab" component={HeadOfficerTeamScreen} options={{ title: 'Team' }} />
      )}
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
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
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
              <Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} />
              <Stack.Screen name="AdminLotManagement" component={AdminLotManagementScreen} />
              <Stack.Screen name="AdminLotMapEditor" component={AdminLotMapEditorScreen} />
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
      <Stack.Screen name="Complaints" component={ComplaintsScreen} />
      <Stack.Screen name="PublicLots" component={PublicLotMapScreen} />
      <Stack.Screen name="SecurityServiceRequests" component={SecurityServiceRequestsScreen} />
      <Stack.Screen name="SecurityPatrolSchedule" component={SecurityPatrolScheduleScreen} />
      <Stack.Screen name="SecurityIncidents" component={SecurityIncidentsScreen} />
      <Stack.Screen name="TeamPerformanceTab" component={HeadOfficerTeamScreen} />
      <Stack.Screen name="PersonnelTab" component={HeadOfficerTeamScreen} />
      <Stack.Screen name="AnalyticsTab" component={HeadOfficerTeamScreen} />
      <Stack.Screen name="PaymentRedirect" component={PaymentRedirectScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
      <Stack.Screen name="PaymentCancelled" component={PaymentCancelledScreen} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} />

    </Stack.Navigator>
  );
};

export default AppNavigator;
