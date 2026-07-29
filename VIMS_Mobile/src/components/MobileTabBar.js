import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radii, shadows, themeColors } from '../utils/theme';

const iconMap = {
  DashboardTab: ['home', 'home-outline'],
  ReservationsTab: ['calendar', 'calendar-outline'],
  VisitorsTab: ['people', 'people-outline'],
  ServicesTab: ['construct', 'construct-outline'],
  PaymentsTab: ['wallet', 'wallet-outline'],
  ProfileTab: ['person', 'person-outline'],
  UsersTab: ['people', 'people-outline'],
  LogsTab: ['time', 'time-outline'],
  ApprovalsTab: ['checkmark-circle', 'checkmark-circle-outline'],
  ScannerTab: ['scan', 'scan-outline'],
};

const DockItem = ({ route, descriptor, focused, navigation }) => {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const options = descriptor.options;
  const label = options.tabBarLabel ?? options.title ?? route.name;
  const icons = iconMap[route.name] || ['ellipse', 'ellipse-outline'];

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  return (
    <View style={styles.itemWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={`${label} tab`}
        onPress={onPress}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={({ pressed }) => [
          styles.item,
          focused && styles.itemActive,
          pressed && styles.itemPressed,
        ]}
      >
        <Animated.View
          style={[
            styles.iconBubble,
            focused && styles.iconBubbleActive,
            {
              transform: [{
                scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }),
              }],
            },
          ]}
        >
          <Ionicons
            name={focused ? icons[0] : icons[1]}
            size={21}
            color={focused ? themeColors.primaryDeep : themeColors.navMuted}
          />
        </Animated.View>
        <Text numberOfLines={1} style={[styles.label, focused && styles.labelActive]}>{label}</Text>
      </Pressable>
    </View>
  );
};

const MobileTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 8) }]}>
      <View style={styles.dock}>
        {state.routes.map((route, index) => (
          <DockItem
            key={route.key}
            route={route}
            descriptor={descriptors[route.key]}
            focused={state.index === index}
            navigation={navigation}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: themeColors.background,
    paddingHorizontal: 12,
    paddingTop: 7,
  },
  dock: {
    minHeight: 68,
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderRadius: radii.xl,
    backgroundColor: themeColors.nav,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...shadows.floating,
  },
  itemWrap: { flex: 1, height: 52 },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  itemActive: { backgroundColor: themeColors.navActive },
  itemPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  iconBubble: {
    width: 31,
    height: 30,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleActive: { backgroundColor: themeColors.accent },
  label: {
    color: themeColors.navMuted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
    maxWidth: '100%',
  },
  labelActive: {
    color: themeColors.white,
    fontWeight: '900',
  },
});

export default MobileTabBar;
