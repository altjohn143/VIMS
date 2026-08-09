import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserDropdownMenu from './UserDropdownMenu';
import { themeColors } from '../utils/theme';

const SecurityUtilityHeader = ({ navigation, eyebrow = 'SECURITY MODULE', title, subtitle, actions = [], showBack = true }) => (
  <View style={styles.header}>
    <View style={styles.topRow}>
      {showBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={themeColors.primaryDeep} />
        </TouchableOpacity>
      ) : null}
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <UserDropdownMenu navigation={navigation} />
    </View>
    {!!actions.length && (
      <View style={styles.actions}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.action, action.primary && styles.primaryAction, action.disabled && styles.disabledAction]}
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
  header: { backgroundColor: themeColors.cardBackground, paddingTop: 42, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.accent },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: themeColors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: themeColors.textPrimary, fontSize: 23, fontWeight: '900', marginTop: 1 },
  subtitle: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10 },
  action: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 12, backgroundColor: themeColors.accent },
  primaryAction: { backgroundColor: themeColors.primary },
  disabledAction: { opacity: 0.5 },
  actionText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
  primaryActionText: { color: themeColors.white },
});

export default SecurityUtilityHeader;
