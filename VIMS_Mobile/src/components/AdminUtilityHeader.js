import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserDropdownMenu from './UserDropdownMenu';
import { themeColors } from '../utils/theme';

const AdminUtilityHeader = ({ navigation, eyebrow = 'ADMIN OPERATIONS', title, subtitle, actions = [] }) => (
  <View style={styles.header}>
    <View style={styles.topRow}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <UserDropdownMenu navigation={navigation} />
    </View>
    {!!actions.length && (
      <View style={styles.actions}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.action, action.primary && styles.primaryAction]}
            onPress={action.onPress}
            disabled={action.disabled || action.loading}
          >
            {action.loading ? (
              <ActivityIndicator size="small" color={action.primary ? themeColors.white : themeColors.primaryDeep} />
            ) : (
              <Ionicons name={action.icon} size={18} color={action.primary ? themeColors.white : themeColors.primaryDeep} />
            )}
            <Text style={[styles.actionText, action.primary && styles.primaryActionText]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  header: { backgroundColor: themeColors.cardBackground, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: themeColors.primary, fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: themeColors.textPrimary, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  subtitle: { color: themeColors.textSecondary, fontSize: 12, lineHeight: 17, fontWeight: '500', marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 },
  action: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 13, borderRadius: 13, backgroundColor: themeColors.accent },
  primaryAction: { backgroundColor: themeColors.primary },
  actionText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
  primaryActionText: { color: themeColors.white },
});

export default AdminUtilityHeader;
