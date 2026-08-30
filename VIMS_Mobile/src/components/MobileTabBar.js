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

const compactLabelMap = {
  DashboardTab: 'Dash',
  ReservationsTab: 'Reserve',
  PaymentsTab: 'Pay',
  AdminAnnouncements: 'Posts',
  AdminLotManagement: 'Lots',
};

const getTabLabel = (route, descriptor, compact = false) => {
  const label = descriptor.options.tabBarLabel ?? descriptor.options.title ?? route.name;
  return compact ? compactLabelMap[route.name] || label : label;
};

const TabItem = ({ route, descriptor, focused, navigation, compact = false }) => {
  const label = getTabLabel(route, descriptor, compact);
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
      style={({ pressed }) => [styles.item, compact && styles.compactItem, pressed && styles.pressed]}
    >
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
      <View style={[styles.iconWrap, compact && styles.compactIconWrap, focused && styles.iconWrapActive]}>
        <Ionicons
          name={focused ? icons[0] : icons[1]}
          size={compact ? 18 : 20}
          color={focused ? '#075E2C' : '#8A948E'}
        />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.label, compact && styles.compactLabel, focused && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
};

const CenterQrTab = ({ route, descriptor, focused, navigation, compact = false }) => {
  const label = getTabLabel(route, descriptor, compact);
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
      style={({ pressed }) => [styles.centerQrItem, pressed && styles.pressed]}
    >
      <View style={[styles.qrIconWrap, focused && styles.qrIconWrapActive]}>
        <Ionicons name={focused ? 'qr-code' : 'qr-code-outline'} size={31} color="#075E2C" />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.label, styles.qrLabel, compact && styles.compactQrLabel, focused && styles.labelActive]}>{label}</Text>
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
  const qrRouteIndex = visibleRoutes.findIndex(({ route }) => (
    route.name === 'VisitorsTab' || route.name === 'ScannerTab'
  ));
  const qrRoute = qrRouteIndex >= 0 ? visibleRoutes[qrRouteIndex] : null;
  const leftRoutes = qrRoute ? visibleRoutes.slice(0, qrRouteIndex) : [];
  const rightRoutes = qrRoute ? visibleRoutes.slice(qrRouteIndex + 1) : [];
  const useCenterQr = Boolean(qrRoute) && visibleRoutes.length <= 8;
  const compact = visibleRoutes.length > 6;
  const centerGapStyle = compact ? styles.compactCenterSpacer : styles.centerSpacer;

  if (!useCenterQr) {
    return (
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 6) }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {visibleRoutes.map(({ route }) => (
            <TabItem key={route.key} route={route} descriptor={descriptors[route.key]} focused={route.name === highlightedRouteName} navigation={navigation} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 6) }]}>
      <View style={styles.row}>
        <View style={[styles.tabGroup, styles.leftGroup]}>
          {leftRoutes.map(({ route }) => (
            <TabItem key={route.key} route={route} descriptor={descriptors[route.key]} focused={route.name === highlightedRouteName} navigation={navigation} compact={compact} />
          ))}
        </View>
        <View style={centerGapStyle} />
        <View style={[styles.tabGroup, styles.rightGroup]}>
          {rightRoutes.map(({ route }) => (
            <TabItem key={route.key} route={route} descriptor={descriptors[route.key]} focused={route.name === highlightedRouteName} navigation={navigation} compact={compact} />
          ))}
        </View>
      </View>
      <CenterQrTab route={qrRoute.route} descriptor={descriptors[qrRoute.route.key]} focused={qrRoute.route.name === highlightedRouteName} navigation={navigation} compact={compact} />
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    minHeight: 88,
    paddingHorizontal: 6,
    paddingTop: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4EAE5',
    shadowColor: '#102219',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 10,
    overflow: 'visible',
  },
  scrollContent: { flexGrow: 1, alignItems: 'stretch', justifyContent: 'space-between', paddingHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', overflow: 'visible' },
  tabGroup: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', minWidth: 0 },
  leftGroup: { paddingRight: 7 },
  rightGroup: { paddingLeft: 7 },
  centerSpacer: { width: 68 },
  compactCenterSpacer: { width: 82 },
  item: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 0, paddingTop: 2 },
  compactItem: { paddingHorizontal: 0 },
  pressed: { opacity: 0.6 },
  indicator: { display: 'none' },
  indicatorActive: { backgroundColor: '#0B8F3D' },
  iconWrap: { width: 34, height: 28, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  compactIconWrap: { width: 28, height: 26, borderRadius: 10 },
  iconWrapActive: { backgroundColor: '#EAF8EF' },
  qrIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#075E2C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#102219',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 7,
    marginBottom: 2,
  },
  qrIconWrapActive: {
    backgroundColor: '#F8FFFA',
    borderColor: '#075E2C',
  },
  centerQrItem: {
    position: 'absolute',
    left: '50%',
    top: -18,
    width: 72,
    marginLeft: -36,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 5,
  },
  label: { color: '#8A948E', fontSize: 7.5, lineHeight: 10, fontWeight: '700', marginTop: 4, maxWidth: '100%', textAlign: 'center' },
  compactLabel: { fontSize: 7, lineHeight: 9, marginTop: 3 },
  qrLabel: { marginTop: 1, maxWidth: 60 },
  compactQrLabel: { fontSize: 7, lineHeight: 9, maxWidth: 54 },
  labelActive: { color: '#075E2C', fontWeight: '900' },
});

export default MobileTabBar;
