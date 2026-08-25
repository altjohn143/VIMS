import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themeColors } from '../utils/theme';

const iconMap = {
  DashboardTab: ['grid', 'grid-outline'],
  ReservationsTab: ['calendar', 'calendar-outline'],
  VisitorsTab: ['people', 'people-outline'],
  ServicesTab: ['construct', 'construct-outline'],
  PaymentsTab: ['card', 'card-outline'],
  ProfileTab: ['person', 'person-outline'],
  UsersTab: ['person-add', 'person-add-outline'],
  LogsTab: ['list', 'list-outline'],
  ApprovalsTab: ['checkmark-done-circle', 'checkmark-done-circle-outline'],
  ScannerTab: ['scan', 'scan-outline'],
  Complaints: ['chatbox-ellipses', 'chatbox-ellipses-outline'],
  Announcements: ['megaphone', 'megaphone-outline'],
  Notifications: ['notifications', 'notifications-outline'],
  Chatbot: ['sparkles', 'sparkles-outline'],
  AdminApprovals: ['checkmark-circle', 'checkmark-circle-outline'],
  AdminVisitorReports: ['analytics', 'analytics-outline'],
  AdminVerificationQueue: ['id-card', 'id-card-outline'],
  AdminAnnouncements: ['megaphone', 'megaphone-outline'],
  AdminLotManagement: ['map', 'map-outline'],
  ArchivedUsers: ['archive', 'archive-outline'],
  ArchivedAnnouncements: ['newspaper', 'newspaper-outline'],
  ArchivedServiceRequests: ['file-tray-full', 'file-tray-full-outline'],
  SecurityServiceRequests: ['construct', 'construct-outline'],
  SecurityPatrolSchedule: ['shield-checkmark', 'shield-checkmark-outline'],
  SecurityIncidents: ['warning', 'warning-outline'],
  TeamPerformanceTab: ['stats-chart', 'stats-chart-outline'],
  PersonnelTab: ['people', 'people-outline'],
  AnalyticsTab: ['document-text', 'document-text-outline'],
};

const parentTabMap = {
  Complaints: 'ServicesTab',
  Announcements: 'DashboardTab',
  Notifications: 'DashboardTab',
  Chatbot: 'DashboardTab',
  PaymentRedirect: 'PaymentsTab',
  PaymentSuccess: 'PaymentsTab',
  PaymentCancelled: 'PaymentsTab',
  AdminApprovals: 'UsersTab',
  AdminVerificationQueue: 'UsersTab',
  ArchivedUsers: 'UsersTab',
  AdminVisitorReports: 'VisitorsTab',
  ArchivedAnnouncements: 'AdminAnnouncements',
  ArchivedServiceRequests: 'ServicesTab',
  PersonnelTab: 'TeamPerformanceTab',
  AnalyticsTab: 'TeamPerformanceTab',
};

const TabItem = ({ route, descriptor, focused, navigation }) => {
  const label = descriptor.options.tabBarLabel ?? descriptor.options.title ?? route.name;
  const icons = iconMap[route.name] || ['ellipse', 'ellipse-outline'];
  const onPress = () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={`${label} tab`}
      onPress={onPress}
      onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Ionicons name={focused ? icons[0] : icons[1]} size={20} color={focused ? '#075E2C' : '#8A948E'} />
      </View>
      <Text numberOfLines={1} style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
};

const MobileTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name;
  const highlightedRouteName = parentTabMap[activeRouteName] || activeRouteName;
  const visibleRoutes = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => !descriptors[route.key]?.options?.tabBarButton);
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 6) }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleRoutes.map(({ route, index }) => (
          <TabItem key={route.key} route={route} descriptor={descriptors[route.key]} focused={route.name === highlightedRouteName} navigation={navigation} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    minHeight: 72,
    paddingHorizontal: 8,
    paddingTop: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4EAE5',
    shadowColor: '#102219',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 10,
  },
  scrollContent: { flexGrow: 1, alignItems: 'stretch', justifyContent: 'space-between', paddingHorizontal: 0 },
  item: { flex: 1, minWidth: 61, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingTop: 2 },
  pressed: { opacity: 0.6 },
  indicator: { display: 'none' },
  indicatorActive: { backgroundColor: '#0B8F3D' },
  iconWrap: { width: 34, height: 28, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: '#EAF8EF' },
  label: { color: '#8A948E', fontSize: 8, lineHeight: 11, fontWeight: '700', marginTop: 2, maxWidth: '100%' },
  labelActive: { color: '#075E2C', fontWeight: '900' },
});

export default MobileTabBar;
