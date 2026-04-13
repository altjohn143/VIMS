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
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';
import LogoutButton from '../../components/LogoutButton';

const initialForm = { area: '', checkpoint: '', notes: '' };

const SecurityPatrolScheduleScreen = ({ navigation }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/patrols');
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load patrol logs');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load patrol logs');
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

  const submit = async () => {
    if (!form.area.trim() || !form.checkpoint.trim()) {
      Alert.alert('Error', 'Area and checkpoint are required');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post('/patrols/log', form);
      if (res.data?.success) {
        Alert.alert('Success', 'Patrol log submitted');
        setCreateOpen(false);
        setForm(initialForm);
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to submit patrol log');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to submit patrol log');
    } finally {
      setProcessing(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, shadows.small]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item?.area || 'Area'} • {item?.checkpoint || 'Checkpoint'}
        </Text>
        <View style={styles.pill}>
          <Ionicons name="walk" size={12} color={themeColors.primary} />
          <Text style={styles.pillText}>{String(item?.status || 'completed')}</Text>
        </View>
      </View>
      {item?.notes ? <Text style={styles.cardBody}>{item.notes}</Text> : null}
      <Text style={styles.meta}>
        {formatWhen(item?.loggedAt || item?.createdAt)} • Officer: {item?.officerId?.firstName || ''} {item?.officerId?.lastName || ''}
      </Text>
    </View>
  );

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
        <Text style={styles.headerTitle}>Patrol Logs</Text>
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
            <Ionicons name="walk-outline" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No patrol logs</Text>
            <Text style={styles.emptyText}>Create a patrol log to start tracking rounds.</Text>
          </View>
        }
      />

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Patrol Log</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Area</Text>
              <TextInput style={styles.input} value={form.area} onChangeText={(v) => setForm((p) => ({ ...p, area: v }))} placeholder="e.g., Block A" />
              <Text style={styles.label}>Checkpoint</Text>
              <TextInput style={styles.input} value={form.checkpoint} onChangeText={(v) => setForm((p) => ({ ...p, checkpoint: v }))} placeholder="e.g., Gate 1" />
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.notes}
                onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                placeholder="Observations"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.actionsRow}>
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
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: themeColors.primary + '12' },
  pillText: { fontSize: 11, fontWeight: '900', color: themeColors.primary },
  cardBody: { marginTop: 10, fontSize: 13, color: themeColors.textPrimary, opacity: 0.9 },
  meta: { marginTop: 10, fontSize: 11, color: themeColors.textSecondary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: themeColors.textPrimary },
  emptyText: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, textAlign: 'center', paddingHorizontal: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: themeColors.textPrimary },
  label: { marginTop: 10, fontSize: 12, color: themeColors.textSecondary, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: themeColors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, backgroundColor: '#f8fafc' },
  textArea: { minHeight: 110 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 10 },
  secondaryBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  secondaryText: { fontWeight: '900', color: themeColors.textSecondary },
  primaryBtn: { flex: 1, backgroundColor: themeColors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryText: { fontWeight: '900', color: 'white' },
  disabled: { opacity: 0.6 },
});

export default SecurityPatrolScheduleScreen;

