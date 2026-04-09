import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';
import LogoutButton from '../../components/LogoutButton';

const initialForm = { title: '', description: '', location: '', severity: 'medium' };

const SecurityIncidentsScreen = ({ navigation }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/incidents');
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load incidents');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load incidents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const formatWhen = (d) => {
    if (!d) return 'N/A';
    try {
      return format(new Date(d), 'MMM dd, yyyy • hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  const severityColor = (s) => {
    const map = {
      low: themeColors.success,
      medium: themeColors.warning,
      high: themeColors.error,
      critical: themeColors.error,
    };
    return map[s] || themeColors.textSecondary;
  };

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Error', 'Title and description are required');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post('/incidents', form);
      if (res.data?.success) {
        Alert.alert('Success', 'Incident reported');
        setCreateOpen(false);
        setForm(initialForm);
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to report incident');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to report incident');
    } finally {
      setProcessing(false);
    }
  };

  const setStatus = async (id, nextStatus) => {
    setProcessing(true);
    try {
      const res = await api.put(`/incidents/${id}/status`, { status: nextStatus });
      if (res.data?.success) {
        Alert.alert('Success', `Incident marked as ${nextStatus}`);
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to update status');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const renderItem = ({ item }) => {
    const sev = severityColor(item?.severity);
    return (
      <View style={[styles.card, shadows.small]}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item?.title || 'Incident'}</Text>
          <View style={[styles.pill, { backgroundColor: sev + '20' }]}>
            <Text style={[styles.pillText, { color: sev }]}>{String(item?.severity || 'medium').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.cardBody} numberOfLines={3}>{item?.description || ''}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item?.location ? `Location: ${item.location} • ` : ''}{formatWhen(item?.createdAt)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Status: {item?.status || 'open'} • Reported by {item?.reportedBy?.firstName || ''} {item?.reportedBy?.lastName || ''}
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.investigateBtn, processing && styles.disabled]}
            disabled={processing}
            onPress={() => setStatus(item._id, 'investigating')}
          >
            <Text style={styles.actionText}>Investigate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.resolveBtn, processing && styles.disabled]}
            disabled={processing}
            onPress={() => setStatus(item._id, 'resolved')}
          >
            <Text style={styles.actionText}>Resolve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incidents</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setCreateOpen(true)} style={styles.headerIconButton}>
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={load} style={styles.headerIconButton}>
            <Ionicons name="refresh" size={22} color="white" />
          </TouchableOpacity>
          <LogoutButton navigation={navigation} color="white" size={24} />
        </View>
      </View>

      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={(item) => item?._id || String(Math.random())}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No incidents</Text>
            <Text style={styles.emptyText}>Report an incident to start tracking security events.</Text>
          </View>
        }
      />

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Incident</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="Short title" />
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder="Describe what happened"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              <Text style={styles.label}>Location (optional)</Text>
              <TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm((p) => ({ ...p, location: v }))} placeholder="e.g., Gate 2" />

              <Text style={styles.label}>Severity</Text>
              <View style={styles.severityRow}>
                {['low', 'medium', 'high', 'critical'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sevChip, form.severity === s && styles.sevChipActive]}
                    onPress={() => setForm((p) => ({ ...p, severity: s }))}
                  >
                    <Text style={[styles.sevChipText, form.severity === s && styles.sevChipTextActive]}>
                      {s.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCreateOpen(false)} disabled={processing}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, processing && styles.disabled]} onPress={submit} disabled={processing}>
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Submit</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconButton: { padding: 8 },
  listContainer: { padding: 16, paddingBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: themeColors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: themeColors.textPrimary, flex: 1, minWidth: 0 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '900' },
  cardBody: { marginTop: 10, fontSize: 13, color: themeColors.textPrimary, opacity: 0.9, lineHeight: 19 },
  meta: { marginTop: 8, fontSize: 11, color: themeColors.textSecondary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  investigateBtn: { backgroundColor: themeColors.info },
  resolveBtn: { backgroundColor: themeColors.success },
  actionText: { color: 'white', fontWeight: '900' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: themeColors.textPrimary },
  emptyText: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, textAlign: 'center', paddingHorizontal: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: themeColors.textPrimary },
  label: { marginTop: 10, fontSize: 12, color: themeColors.textSecondary, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: themeColors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, backgroundColor: '#f8fafc' },
  textArea: { minHeight: 140 },
  severityRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  sevChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: themeColors.background, borderWidth: 1, borderColor: themeColors.border },
  sevChipActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  sevChipText: { fontSize: 12, fontWeight: '900', color: themeColors.textSecondary },
  sevChipTextActive: { color: 'white' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 10 },
  secondaryBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  secondaryText: { fontWeight: '900', color: themeColors.textSecondary },
  primaryBtn: { flex: 1, backgroundColor: themeColors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryText: { fontWeight: '900', color: 'white' },
  disabled: { opacity: 0.6 },
});

export default SecurityIncidentsScreen;

