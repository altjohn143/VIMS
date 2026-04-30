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
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';
import LogoutButton from '../../components/LogoutButton';

const emptyForm = { title: '', body: '', status: 'published', scheduledAt: null };

const AdminAnnouncementsScreen = ({ navigation }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [processing, setProcessing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/announcements/admin');
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load announcements');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load announcements');
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

  const publishCounts = useMemo(() => {
    const published = rows.filter((r) => r?.status === 'published').length;
    const scheduled = rows.filter((r) => r?.status === 'scheduled').length;
    const drafts = rows.filter((r) => r?.status === 'draft').length;
    return { published, scheduled, drafts };
  }, [rows]);

  const create = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      Alert.alert('Error', 'Title and message are required');
      return;
    }
    if (form.status === 'scheduled' && !form.scheduledAt) {
      Alert.alert('Error', 'Please select a date and time for scheduling');
      return;
    }
    setProcessing(true);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        status: form.status,
      };
      if (form.status === 'scheduled') {
        payload.scheduledAt = form.scheduledAt.toISOString();
      }
      const res = await api.post('/announcements', payload);
      if (res.data?.success) {
        Alert.alert('Success', form.status === 'scheduled' ? 'Announcement scheduled' : 'Announcement posted');
        setForm(emptyForm);
        setCreateOpen(false);
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to create announcement');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to create announcement');
    } finally {
      setProcessing(false);
    }
  };

  const toggleStatus = async (id, currentStatus, action) => {
    let newStatus;
    if (currentStatus === 'scheduled') {
      newStatus = action === 'publish' ? 'published' : 'draft';
    } else {
      newStatus = currentStatus === 'published' ? 'draft' : 'published';
    }
    setProcessing(true);
    try {
      const res = await api.put(`/announcements/${id}`, { status: newStatus });
      if (res.data?.success) {
        const actionText = newStatus === 'published' ? 'published' : newStatus === 'draft' ? 'moved to draft' : 'updated';
        Alert.alert('Success', `Announcement ${actionText}`);
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

  const remove = async (id) => {
    Alert.alert('Archive announcement?', 'This announcement can be restored later if needed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          setProcessing(true);
          try {
            const res = await api.delete(`/announcements/${id}`);
            if (res.data?.success) {
              Alert.alert('Success', 'Announcement archived');
              load();
            } else {
              Alert.alert('Error', res.data?.error || 'Failed to archive announcement');
            }
          } catch (e) {
            Alert.alert('Error', e?.response?.data?.error || 'Failed to archive announcement');
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const badgeBg = item?.status === 'published' ? themeColors.success + '20' : 
                   item?.status === 'scheduled' ? themeColors.warning + '20' : 
                   themeColors.textSecondary + '20';
    const badgeColor = item?.status === 'published' ? themeColors.success : 
                      item?.status === 'scheduled' ? themeColors.warning : 
                      themeColors.textSecondary;
    const badgeText = item?.status === 'published' ? 'PUBLISHED' : 
                     item?.status === 'scheduled' ? 'SCHEDULED' : 
                     'DRAFT';
    const author = item?.createdBy
      ? `${item.createdBy.firstName || 'System'} ${item.createdBy.lastName || ''}`.trim()
      : 'System';

    return (
      <View style={[styles.card, shadows.small]}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item?.title || 'Announcement'}
          </Text>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
        </View>

        <Text style={styles.meta} numberOfLines={2}>
          Author: {author} {item?.createdBy?.role ? `(${item.createdBy.role})` : ''}
        </Text>
        <Text style={styles.meta}>
          {item?.status === 'published' && item?.publishedAt ? `Published: ${formatWhen(item?.publishedAt)}` :
           item?.status === 'scheduled' && item?.scheduledAt ? `Scheduled: ${formatWhen(item?.scheduledAt)}` :
           `Created: ${formatWhen(item?.createdAt)}`}
        </Text>

        <Text style={styles.body} numberOfLines={5}>
          {item?.body || ''}
        </Text>

        <View style={styles.actionsRow}>
          {item?.status === 'scheduled' ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn, processing && styles.disabled]}
                disabled={processing}
                onPress={() => toggleStatus(item._id, item.status, 'publish')}
              >
                <Text style={styles.secondaryText}>Publish Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn, processing && styles.disabled]}
                disabled={processing}
                onPress={() => toggleStatus(item._id, item.status, 'draft')}
              >
                <Text style={styles.secondaryText}>To Draft</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn, processing && styles.disabled]}
              disabled={processing}
              onPress={() => toggleStatus(item._id, item.status)}
            >
              <Text style={styles.secondaryText}>{item?.status === 'published' ? 'To Draft' : 'Publish'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.dangerBtn, processing && styles.disabled]}
            disabled={processing}
            onPress={() => remove(item._id)}
          >
            <Text style={styles.dangerText}>Archive</Text>
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
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Admin Announcements</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {publishCounts.published} published • {publishCounts.scheduled} scheduled • {publishCounts.drafts} drafts
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setCreateOpen(true)} style={styles.headerIconButton}>
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={load} style={styles.headerIconButton}>
            <Ionicons name="refresh" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('ArchivedAnnouncements')}
            style={styles.headerIconButton}
          >
            <Ionicons name="archive" size={22} color="white" />
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
            <Ionicons name="megaphone-outline" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No announcements</Text>
            <Text style={styles.emptyText}>Create an announcement to notify residents.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setCreateOpen(true)}>
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.primaryText}>New Announcement</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Announcement</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
                placeholder="Announcement title"
              />
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.body}
                onChangeText={(v) => setForm((p) => ({ ...p, body: v }))}
                placeholder="Write the announcement..."
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[styles.statusOption, form.status === 'published' && styles.statusOptionSelected]}
                  onPress={() => setForm((p) => ({ ...p, status: 'published' }))}
                >
                  <Ionicons name="eye" size={18} color={form.status === 'published' ? 'white' : themeColors.textSecondary} />
                  <Text style={[styles.statusText, form.status === 'published' && styles.statusTextSelected]}>
                    Publish immediately
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusOption, form.status === 'scheduled' && styles.statusOptionSelected]}
                  onPress={() => setForm((p) => ({ ...p, status: 'scheduled' }))}
                >
                  <Ionicons name="time" size={18} color={form.status === 'scheduled' ? 'white' : themeColors.textSecondary} />
                  <Text style={[styles.statusText, form.status === 'scheduled' && styles.statusTextSelected]}>
                    Schedule for later
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusOption, form.status === 'draft' && styles.statusOptionSelected]}
                  onPress={() => setForm((p) => ({ ...p, status: 'draft' }))}
                >
                  <Ionicons name="document" size={18} color={form.status === 'draft' ? 'white' : themeColors.textSecondary} />
                  <Text style={[styles.statusText, form.status === 'draft' && styles.statusTextSelected]}>
                    Save as draft
                  </Text>
                </TouchableOpacity>
              </View>

              {form.status === 'scheduled' && (
                <>
                  <Text style={styles.label}>Schedule Date & Time</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={18} color={themeColors.primary} />
                    <Text style={styles.datePickerText}>
                      {form.scheduledAt ? format(new Date(form.scheduledAt), 'MMM dd, yyyy • hh:mm a') : 'Select date and time'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={form.scheduledAt || new Date()}
                  mode="datetime"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setForm((p) => ({ ...p, scheduledAt: selectedDate }));
                    }
                  }}
                />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => setCreateOpen(false)} disabled={processing}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn, processing && styles.disabled]} onPress={create} disabled={processing}>
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>
                    {form.status === 'scheduled' ? 'Schedule' : form.status === 'draft' ? 'Save Draft' : 'Post'}
                  </Text>}
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
  card: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: themeColors.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '900', color: themeColors.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '900' },
  meta: { marginTop: 8, fontSize: 11, color: themeColors.textSecondary, fontWeight: '600' },
  body: { marginTop: 10, fontSize: 13, color: themeColors.textPrimary, opacity: 0.92, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { backgroundColor: '#f1f5f9' },
  secondaryText: { fontWeight: '900', color: themeColors.textSecondary },
  dangerBtn: { backgroundColor: themeColors.error + '18' },
  dangerText: { fontWeight: '900', color: themeColors.error },
  primaryBtn: { backgroundColor: themeColors.primary },
  primaryText: { fontWeight: '900', color: 'white' },
  disabled: { opacity: 0.6 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: themeColors.textPrimary },
  emptyText: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: themeColors.textPrimary },
  label: { marginTop: 10, fontSize: 12, color: themeColors.textSecondary, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: themeColors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, backgroundColor: '#f8fafc' },
  textArea: { minHeight: 150 },
  publishRow: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: themeColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  publishLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  publishText: { fontSize: 12, color: themeColors.textSecondary, fontWeight: '800' },
  toggle: { width: 46, height: 28, borderRadius: 999, backgroundColor: '#e2e8f0', padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: themeColors.primary + '55' },
  toggleKnob: { width: 22, height: 22, borderRadius: 999, backgroundColor: 'white' },
  toggleKnobOn: { alignSelf: 'flex-end' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 10 },

  statusRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statusOption: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: themeColors.border, backgroundColor: '#f8fafc' },
  statusOptionSelected: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  statusText: { fontSize: 12, fontWeight: '700', color: themeColors.textSecondary },
  statusTextSelected: { color: 'white' },

  datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: themeColors.border, backgroundColor: '#f8fafc' },
  datePickerText: { fontSize: 14, color: themeColors.textPrimary, fontWeight: '600' },
});

export default AdminAnnouncementsScreen;

