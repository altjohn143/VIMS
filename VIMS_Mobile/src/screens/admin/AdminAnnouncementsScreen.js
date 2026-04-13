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

const emptyForm = { title: '', body: '', isPublished: true };

const AdminAnnouncementsScreen = ({ navigation }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [processing, setProcessing] = useState(false);

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
    const published = rows.filter((r) => r?.isPublished).length;
    return { published, drafts: rows.length - published };
  }, [rows]);

  const create = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      Alert.alert('Error', 'Title and message are required');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post('/announcements', {
        title: form.title,
        body: form.body,
        isPublished: form.isPublished,
      });
      if (res.data?.success) {
        Alert.alert('Success', 'Announcement posted');
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

  const togglePublish = async (id, isPublished) => {
    setProcessing(true);
    try {
      const res = await api.put(`/announcements/${id}`, { isPublished: !isPublished });
      if (res.data?.success) {
        Alert.alert('Success', !isPublished ? 'Announcement published' : 'Announcement unpublished');
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to update publish status');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to update publish status');
    } finally {
      setProcessing(false);
    }
  };

  const remove = async (id) => {
    Alert.alert('Delete announcement?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setProcessing(true);
          try {
            const res = await api.delete(`/announcements/${id}`);
            if (res.data?.success) {
              Alert.alert('Success', 'Announcement deleted');
              load();
            } else {
              Alert.alert('Error', res.data?.error || 'Failed to delete announcement');
            }
          } catch (e) {
            Alert.alert('Error', e?.response?.data?.error || 'Failed to delete announcement');
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const badgeBg = item?.isPublished ? themeColors.success + '20' : themeColors.textSecondary + '20';
    const badgeColor = item?.isPublished ? themeColors.success : themeColors.textSecondary;
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
            <Text style={[styles.badgeText, { color: badgeColor }]}>{item?.isPublished ? 'PUBLISHED' : 'DRAFT'}</Text>
          </View>
        </View>

        <Text style={styles.meta} numberOfLines={2}>
          Author: {author} {item?.createdBy?.role ? `(${item.createdBy.role})` : ''}
        </Text>
        <Text style={styles.meta}>
          {item?.isPublished ? `Published: ${formatWhen(item?.publishedAt)}` : `Created: ${formatWhen(item?.createdAt)}`}
        </Text>

        <Text style={styles.body} numberOfLines={5}>
          {item?.body || ''}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn, processing && styles.disabled]}
            disabled={processing}
            onPress={() => togglePublish(item._id, item.isPublished)}
          >
            <Text style={styles.secondaryText}>{item?.isPublished ? 'Unpublish' : 'Publish'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.dangerBtn, processing && styles.disabled]}
            disabled={processing}
            onPress={() => remove(item._id)}
          >
            <Text style={styles.dangerText}>Delete</Text>
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
            {publishCounts.published} published • {publishCounts.drafts} drafts
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

              <View style={styles.publishRow}>
                <View style={styles.publishLeft}>
                  <Ionicons name={form.isPublished ? 'eye' : 'eye-off'} size={18} color={themeColors.textSecondary} />
                  <Text style={styles.publishText}>
                    {form.isPublished ? 'Publish immediately' : 'Save as draft'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, form.isPublished && styles.toggleOn]}
                  onPress={() => setForm((p) => ({ ...p, isPublished: !p.isPublished }))}
                >
                  <View style={[styles.toggleKnob, form.isPublished && styles.toggleKnobOn]} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => setCreateOpen(false)} disabled={processing}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn, processing && styles.disabled]} onPress={create} disabled={processing}>
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Post</Text>}
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
});

export default AdminAnnouncementsScreen;

