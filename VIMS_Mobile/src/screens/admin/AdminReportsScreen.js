import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../../utils/theme';
import LogoutButton from '../../components/LogoutButton';

const AdminReportsScreen = ({ navigation }) => {
  const links = [
    {
      title: 'Service Requests Reports',
      subtitle: 'View and manage service requests',
      icon: 'build',
      color: '#f59e0b',
      onPress: () => navigation.navigate('ServicesTab'),
    },
    {
      title: 'Visitor Reports',
      subtitle: 'View visitor activity and logs',
      icon: 'qr-code',
      color: '#10b981',
      onPress: () => navigation.navigate('VisitorsTab'),
    },
    {
      title: 'Payments Reports',
      subtitle: 'Review payment activity',
      icon: 'card',
      color: '#3b82f6',
      onPress: () => navigation.navigate('PaymentsTab'),
    },
    {
      title: 'Reservations',
      subtitle: 'Manage venue and equipment bookings',
      icon: 'calendar',
      color: '#64748b',
      onPress: () => navigation.navigate('AdminReservations'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports Center</Text>
        <LogoutButton navigation={navigation} color="white" size={24} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Admin Reports Center</Text>
        <Text style={styles.subtitle}>Quick links to reporting pages available in the admin portal.</Text>

        <View style={styles.grid}>
          {links.map((item) => (
            <TouchableOpacity key={item.title} style={[styles.card, shadows.small]} onPress={item.onPress}>
              <View style={[styles.iconWrap, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardSub} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle" size={18} color={themeColors.textSecondary} />
          <Text style={styles.noteText}>
            This mirrors the web app’s reports hub: it routes you to the existing admin screens that hold the report data.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  header: {
    backgroundColor: themeColors.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backButton: { padding: 8 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 20, fontWeight: '900', color: themeColors.textPrimary },
  subtitle: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, fontWeight: '600', lineHeight: 18 },
  grid: { marginTop: 14, gap: 10 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: themeColors.textPrimary },
  cardSub: { marginTop: 4, fontSize: 12, color: themeColors.textSecondary, fontWeight: '600' },
  noteBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteText: { flex: 1, fontSize: 12, color: themeColors.textSecondary, lineHeight: 18, fontWeight: '600' },
});

export default AdminReportsScreen;

