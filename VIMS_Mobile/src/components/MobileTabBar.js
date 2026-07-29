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
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      damping: 18,
      stiffness: 210,
      mass: 0.8,
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
    <Animated.View
      style={[
        styles.itemWrap,
        {
          width: progress.interpolate({ inputRange: [0, 1], outputRange: [46, 102] }),
        },
      ]}
    >
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
        <View style={[styles.iconBubble, focused && styles.iconBubbleActive]}>
          <Ionicons
            name={focused ? icons[0] : icons[1]}
            size={focused ? 20 : 22}
            color={focused ? themeColors.primaryDeep : themeColors.navMuted}
          />
        </View>
        <Animated.View
          style={[
            styles.labelClip,
            {
              width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 58] }),
              opacity: progress,
            },
          ]}
        >
          <Text numberOfLines={1} style={styles.label}>{label}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
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
    minHeight: 64,
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
  itemWrap: { height: 48, overflow: 'hidden' },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    paddingHorizontal: 5,
  },
  itemActive: { backgroundColor: themeColors.navActive, justifyContent: 'flex-start' },
  itemPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleActive: { backgroundColor: themeColors.accent },
  labelClip: { overflow: 'hidden', marginLeft: 3 },
  label: {
    color: themeColors.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
});

export default MobileTabBar;
