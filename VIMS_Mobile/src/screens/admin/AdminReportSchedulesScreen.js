import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';
import LogoutButton from '../../components/LogoutButton';

const EMPTY = { name: '', reportType: 'service_requests', recipients: '', enabled: true };

const AdminReportSchedulesScreen = ({ navigation }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/report-schedules');
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load report schedules');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load report schedules');
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
    if (!d) return 'Never';
    try {
      return format(new Date(d), 'MMM dd, yyyy • hh:mm a');
    } catch {
      return 'Never';
    }
  };

  const counts = useMemo(() => {
    return {
      total: rows.length,
      enabled: rows.filter((r) => r?.enabled !== false).length,
    };
  }, [rows]);

  const create = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!form.recipients.trim()) {
      Alert.alert('Error', 'Recipients are required (comma separated emails)');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        ...form,
        recipients: form.recipients
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await api.post('/report-schedules', payload);
      if (res.data?.success) {
        Alert.alert('Success', 'Schedule created');
        setCreateOpen(false);
        setForm(EMPTY);
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to create schedule');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to create schedule');
    } finally {
      setProcessing(false);
    }
  };

  const runNow = async (id) => {
    setProcessing(true);
    try {
      const res = await api.post(`/report-schedules/${id}/run-now`);
      if (res.data?.success) {
        Alert.alert('Success', 'Report sent');
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to send report');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to send report');
    } finally {
      setProcessing(false);
    }
  };

  const renderItem = ({ item }) => {
    const recipients = Array.isArray(item?.recipients) ? item.recipients.join(', ') : '';
    const isEnabled = item?.enabled !== false;

    return (
      <View style={[styles.card, shadows.small]}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item?.name || 'Unnamed schedule'}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              Type: {item?.reportType || 'service_requests'} • {isEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.runButton, processing && styles.runButtonDisabled]}
            disabled={processing}
            onPress={() => runNow(item._id)}
          >
            {processing ? (
              <ActivityIndicator color="white" size={16} />
            ) : (
              <Ionicons name="send" size={16} color="white" />
            )}
            <Text style={styles.runButtonText}>Run</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.metaLine} numberOfLines={2}>
          Recipients: {recipients || '—'}
        </Text>
        <Text style={styles.metaLine}>Last run: {formatWhen(item?.lastRunAt)}</Text>
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
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Report Schedules</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {counts.enabled} enabled • {counts.total} total
          </Text>
        </View>
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
            <Ionicons name="calendar-outline" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No schedules</Text>
            <Text style={styles.emptyText}>Create a schedule to send reports to a list of emails.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setCreateOpen(true)}>
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.primaryBtnText}>New Schedule</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Schedule</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                placeholder="e.g., Monthly service report"
              />

              <Text style={styles.label}>Report Type</Text>
              <View style={styles.typeRow}>
                {[
                  { key: 'service_requests', label: 'Service' },
                  { key: 'visitors', label: 'Visitors' },
                  { key: 'payments', label: 'Payments' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.typeChip, form.reportType === t.key && styles.typeChipActive]}
                    onPress={() => setForm((p) => ({ ...p, reportType: t.key }))}
                  >
                    <Text style={[styles.typeChipText, form.reportType === t.key && styles.typeChipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Recipients (comma separated emails)</Text>
              <TextInput
                style={styles.input}
                value={form.recipients}
                onChangeText={(v) => setForm((p) => ({ ...p, recipients: v }))}
                placeholder="a@b.com, c@d.com"
                autoCapitalize="none"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCreateOpen(false)} disabled={processing}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, processing && styles.primaryBtnDisabled]}
                  onPress={create}
                  disabled={processing}
                >
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Create</Text>}
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
    gap: 12,
  },
  backButton: { padding: 8 },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconButton: { padding: 8 },

  listContainer: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: themeColors.textPrimary },
  cardSub: { fontSize: 12, color: themeColors.textSecondary, marginTop: 2, fontWeight: '600' },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: themeColors.primary,
  },
  runButtonDisabled: { opacity: 0.6 },
  runButtonText: { color: 'white', fontWeight: '900', fontSize: 12 },
  metaLine: { marginTop: 10, fontSize: 12, color: themeColors.textPrimary, opacity: 0.85 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: themeColors.textPrimary },
  emptyText: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: themeColors.textPrimary },
  label: { marginTop: 10, fontSize: 12, color: themeColors.textSecondary, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#f8fafc',
  },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 2, flexWrap: 'wrap' },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  typeChipActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  typeChipText: { fontSize: 12, fontWeight: '800', color: themeColors.textSecondary },
  typeChipTextActive: { color: 'white' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 10 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: 'white', fontWeight: '900' },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: themeColors.textSecondary, fontWeight: '900' },
});

export default AdminReportSchedulesScreen;

