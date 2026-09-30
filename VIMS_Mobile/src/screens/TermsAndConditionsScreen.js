import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors } from '../utils/theme';

const SECTIONS = [
  ['Use of VIMS', 'VIMS is for Westville Casimiro Homes residents and authorized community personnel to access community services and administration.'],
  ['Account responsibility', 'Keep your account secure and provide accurate, current registration information. Do not share your account or impersonate another person.'],
  ['Community rules', 'Using VIMS does not replace HOA rules, notices, payment obligations, reservation requirements, or decisions of authorized community administrators.'],
  ['Acceptable use', 'Do not interfere with VIMS, attempt unauthorized access, upload harmful or misleading content, or use the service to violate another person’s rights.'],
  ['Verification and privacy', 'The community may review registration details and documents to verify residency and administer services. Personal information is handled under the VIMS Privacy Policy and applicable Philippine data privacy law.'],
  ['Changes and questions', 'The community may update these Terms for operational, legal, or security reasons. Continued use after an update means you accept the updated Terms. Contact the HOA administration with questions.'],
];

export default function TermsAndConditionsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back" style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>VIMS · EFFECTIVE SEPTEMBER 30, 2026</Text>
        <Text style={styles.title}>Terms and Conditions</Text>
        <Text style={styles.intro}>These Terms govern your use of the Village Information Management System (VIMS) for Westville Casimiro Homes.</Text>
        {SECTIONS.map(([title, content]) => (
          <View key={title} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionText}>{content}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f8f2' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: themeColors.border },
  backButton: { padding: 6, marginRight: 8 },
  headerTitle: { color: themeColors.textPrimary, fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  eyebrow: { color: themeColors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.7, marginBottom: 8 },
  title: { color: themeColors.textPrimary, fontSize: 30, fontWeight: '800', marginBottom: 14 },
  intro: { color: themeColors.textSecondary, fontSize: 15, lineHeight: 23, marginBottom: 24 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: themeColors.border },
  sectionTitle: { color: themeColors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  sectionText: { color: themeColors.textSecondary, fontSize: 14, lineHeight: 21 },
});
