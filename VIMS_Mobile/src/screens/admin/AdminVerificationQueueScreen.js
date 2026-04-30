import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';
import LogoutButton from '../../components/LogoutButton';

const AdminVerificationQueueScreen = ({ navigation }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('all'); // all | queued_ai | ai_processing | manual_review | approved | rejected
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [approveNotes, setApproveNotes] = useState('Approved by admin');
  const [rejectReason, setRejectReason] = useState('Verification mismatch');
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [idImages, setIdImages] = useState({ front: null, back: null, selfie: null });
  const [idLoading, setIdLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/verifications/admin/queue', { params: { status } });
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load verification queue');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load verification queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

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

  const stats = useMemo(() => {
    const by = (s) => rows.filter((r) => r?.status === s).length;
    return {
      total: rows.length,
      manual: by('manual_review'),
      docVerified: by('documents_verified'),
      approved: by('approved'),
      rejected: by('rejected'),
    };
  }, [rows]);

  const statusChips = [
    { key: 'all', label: `All (${stats.total})` },
    { key: 'manual_review', label: `Manual (${stats.manual})` },
    { key: 'documents_verified', label: `Doc OK (${stats.docVerified})` },
    { key: 'approved', label: `Admin (${stats.approved})` },
    { key: 'rejected', label: `Rejected (${stats.rejected})` },
  ];

  const openDetails = (item) => {
    setSelected(item);
    setDetailsOpen(true);
  };

  const approve = async (id) => {
    setProcessing(true);
    try {
      const res = await api.put(`/verifications/admin/${id}/approve`, { reviewNotes: approveNotes });
      if (res.data?.success) {
        Alert.alert('Success', 'Verification approved');
        setDetailsOpen(false);
        setSelected(null);
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to approve verification');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to approve verification');
    } finally {
      setProcessing(false);
    }
  };

  const reject = async (id) => {
    setProcessing(true);
    try {
      const res = await api.put(`/verifications/admin/${id}/reject`, { rejectReason });
      if (res.data?.success) {
        Alert.alert('Success', 'Verification rejected');
        setDetailsOpen(false);
        setSelected(null);
        load();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to reject verification');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to reject verification');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewVerificationImages = async (verificationId) => {
    if (!verificationId) {
      Alert.alert('No ID found', 'This verification has not uploaded documents yet.');
      return;
    }

    setIdModalOpen(true);
    setIdLoading(true);
    setIdImages({ front: null, back: null, selfie: null });

    try {
      const res = await api.get(`/verifications/admin/${verificationId}/images`);
      if (res.data?.success) {
        setIdImages(res.data.data || { front: null, back: null, selfie: null });
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load documents');
        setIdModalOpen(false);
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load documents');
      setIdModalOpen(false);
    } finally {
      setIdLoading(false);
    }
  };

  const getStatusStyle = (s) => {
    const map = {
      approved: { color: themeColors.success, bg: themeColors.success + '20', icon: 'checkmark-circle' },
      documents_verified: { color: themeColors.success, bg: themeColors.success + '20', icon: 'checkmark-circle' },
      rejected: { color: themeColors.error, bg: themeColors.error + '20', icon: 'close-circle' },
      manual_review: { color: themeColors.warning, bg: themeColors.warning + '20', icon: 'hand-left' },
      queued_ai: { color: themeColors.info, bg: themeColors.info + '20', icon: 'time' },
      ai_processing: { color: themeColors.info, bg: themeColors.info + '20', icon: 'sparkles' },
    };
    return map[s] || { color: themeColors.textSecondary, bg: themeColors.textSecondary + '20', icon: 'help-circle' };
  };

  const renderItem = ({ item }) => {
    const user = item?.userId;
    const st = getStatusStyle(item?.status);
    const displayName = (item.displayResidentName || `${user?.firstName || ''} ${user?.lastName || ''}`).trim();
    const displayEmail = item.displayEmail || user?.email;
    return (
      <TouchableOpacity style={[styles.card, shadows.small]} onPress={() => openDetails(item)}>
        <View style={styles.cardTop}>
          <View style={styles.userBlock}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName || '—'}
            </Text>
            <Text style={styles.userMeta} numberOfLines={1}>
              {displayEmail || 'N/A'} • House {user?.houseNumber || 'N/A'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Ionicons name={st.icon} size={12} color={st.color} />
            <Text style={[styles.statusText, { color: st.color }]}>{String(item?.status || 'unknown')}</Text>
          </View>
        </View>
        <Text style={styles.cardTime}>Updated: {formatWhen(item?.updatedAt || item?.createdAt)}</Text>
        {item?.aiResult?.ocrName || item?.aiResult?.ocrDob ? (
          <Text style={styles.cardSub} numberOfLines={2}>
            OCR: {item.aiResult.ocrName || '—'}{item.aiResult.ocrDob ? ` • DOB ${item.aiResult.ocrDob}` : ''}
          </Text>
        ) : null}
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Verification Queue</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Status: {status}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={load} style={styles.headerIconButton}>
            <Ionicons name="refresh" size={22} color="white" />
          </TouchableOpacity>
          <LogoutButton navigation={navigation} color="white" size={24} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBar}>
        {statusChips.map((c) => (
          <TouchableOpacity
            key={c.key}
            onPress={() => setStatus(c.key)}
            style={[styles.chip, status === c.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, status === c.key && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={(item) => item?._id || String(Math.random())}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="id-card-outline" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No verifications</Text>
            <Text style={styles.emptyText}>No records for this filter.</Text>
          </View>
        }
      />

      <Modal visible={detailsOpen} transparent animationType="slide" onRequestClose={() => setDetailsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verification Details</Text>
              <TouchableOpacity onPress={() => setDetailsOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.detailHeadline}>
                {selected?.displayResidentName ||
                  `${selected?.userId?.firstName || ''} ${selected?.userId?.lastName || ''}`.trim() ||
                  '—'}
              </Text>
              <Text style={styles.detailMeta}>
                {selected?.displayEmail || selected?.userId?.email || 'N/A'} • House{' '}
                {selected?.userId?.houseNumber || 'N/A'}
              </Text>

              <View style={styles.detailDivider} />

              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{selected?.status || 'unknown'}</Text>

              {selected?.aiResult ? (
                <>
                  <Text style={[styles.detailLabel, { marginTop: 12 }]}>AI / OCR</Text>
                  <Text style={styles.detailValue}>Score: {selected.aiResult.score ?? 'N/A'}</Text>
                  <Text style={styles.detailValue}>OCR Name: {selected.aiResult.ocrName || '—'}</Text>
                  <Text style={styles.detailValue}>OCR DOB: {selected.aiResult.ocrDob || '—'}</Text>
                  <Text style={styles.detailValue}>Flags: {(selected.aiResult.flags || []).join(', ') || '—'}</Text>
                </>
              ) : null}

              {selected?.reviewNotes ? (
                <>
                  <Text style={[styles.detailLabel, { marginTop: 12 }]}>Review Notes</Text>
                  <Text style={styles.detailValue}>{selected.reviewNotes}</Text>
                </>
              ) : null}

              {selected?.rejectReason ? (
                <>
                  <Text style={[styles.detailLabel, { marginTop: 12 }]}>Reject Reason</Text>
                  <Text style={styles.detailValue}>{selected.rejectReason}</Text>
                </>
              ) : null}

              <View style={styles.detailDivider} />

              <Text style={styles.detailLabel}>Approve Notes (optional)</Text>
              <TextInput
                value={approveNotes}
                onChangeText={setApproveNotes}
                style={styles.input}
                placeholder="Approved by admin"
              />

              <Text style={styles.detailLabel}>Reject Reason</Text>
              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                style={styles.input}
                placeholder="Verification mismatch"
              />

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  disabled={processing || !selected?._id}
                  onPress={() => reject(selected._id)}
                  style={[styles.actionBtn, styles.rejectBtn, (processing || !selected?._id) && styles.actionBtnDisabled]}
                >
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.actionText}>Reject</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={processing || !selected?._id}
                  onPress={() => approve(selected._id)}
                  style={[styles.actionBtn, styles.approveBtn, (processing || !selected?._id) && styles.actionBtnDisabled]}
                >
                  {processing ? <ActivityIndicator color="white" /> : <Text style={styles.actionText}>Approve</Text>}
                </TouchableOpacity>
              </View>

              <Text style={styles.smallHint}>
                Note: This screen reviews verification records. Account approval is still handled in Admin Approvals.
              </Text>
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

  chipsBar: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: themeColors.border },
  chip: {
    marginLeft: 12,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  chipActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  chipText: { color: themeColors.textSecondary, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: 'white' },

  listContainer: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  userBlock: { flex: 1, minWidth: 0 },
  userName: { fontSize: 15, fontWeight: '800', color: themeColors.textPrimary },
  userMeta: { fontSize: 12, color: themeColors.textSecondary, marginTop: 2, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800' },
  cardTime: { marginTop: 10, fontSize: 11, color: themeColors.textSecondary, fontWeight: '600' },
  cardSub: { marginTop: 6, fontSize: 12, color: themeColors.textPrimary, opacity: 0.85 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: themeColors.textPrimary },
  emptyText: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: themeColors.textPrimary },
  detailHeadline: { fontSize: 18, fontWeight: '900', color: themeColors.textPrimary, marginTop: 6 },
  detailMeta: { fontSize: 12, color: themeColors.textSecondary, marginTop: 3, fontWeight: '600' },
  detailDivider: { height: 1, backgroundColor: themeColors.border, marginVertical: 12 },
  detailLabel: { fontSize: 12, color: themeColors.textSecondary, fontWeight: '800', marginTop: 6 },
  detailValue: { fontSize: 13, color: themeColors.textPrimary, marginTop: 4, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#f8fafc',
  },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 14, marginBottom: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: themeColors.success },
  rejectBtn: { backgroundColor: themeColors.error },
  actionBtnDisabled: { opacity: 0.6 },
  actionText: { color: 'white', fontWeight: '900' },
  smallHint: { marginTop: 8, fontSize: 11, color: themeColors.textSecondary, lineHeight: 16, textAlign: 'center' },
});

export default AdminVerificationQueueScreen;

