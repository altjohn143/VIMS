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
      <Ionicons name={focused ? icons[0] : icons[1]} size={22} color={focused ? themeColors.primary : themeColors.textMuted} />
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
    minHeight: 68,
    paddingHorizontal: 5,
    paddingTop: 0,
    backgroundColor: themeColors.white,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  scrollContent: { alignItems: 'stretch', paddingHorizontal: 2 },
  item: { width: 76, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingTop: 8 },
  pressed: { opacity: 0.6 },
  indicator: { position: 'absolute', top: 0, width: 24, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: themeColors.primary },
  label: { color: themeColors.textMuted, fontSize: 9, lineHeight: 12, fontWeight: '600', marginTop: 3, maxWidth: '100%' },
  labelActive: { color: themeColors.primaryDeep, fontWeight: '800' },
});

export default MobileTabBar;
