import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../utils/api';
import { themeColors, shadows } from '../utils/theme';
import LogoutButton from '../components/LogoutButton';

const AnnouncementsScreen = ({ navigation }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/announcements');
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setError(res.data?.error || 'Failed to load announcements');
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const formatWhen = useCallback((dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      return format(new Date(dateValue), 'MMM dd, yyyy • hh:mm a');
    } catch {
      return 'N/A';
    }
  }, []);

  const headerSubtitle = useMemo(() => {
    if (loading) return 'Loading…';
    if (error) return 'Could not load announcements';
    return `${rows.length} announcement${rows.length === 1 ? '' : 's'}`;
  }, [loading, error, rows.length]);

  const openDetails = (item) => {
    setSelected(item);
    setDetailsOpen(true);
  };

  const renderItem = ({ item }) => {
    const author =
      item?.createdBy?.firstName || item?.createdBy?.lastName
        ? `${item.createdBy.firstName || ''} ${item.createdBy.lastName || ''}`.trim()
        : null;

    return (
      <TouchableOpacity style={[styles.card, shadows.small]} onPress={() => openDetails(item)}>
        <View style={styles.cardTopRow}>
          <View style={styles.badge}>
            <Ionicons name="megaphone" size={14} color={themeColors.primary} />
            <Text style={styles.badgeText}>Announcement</Text>
          </View>
          <Text style={styles.timeText}>{formatWhen(item.publishedAt || item.createdAt)}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={styles.bodyPreview} numberOfLines={3}>
          {item.body || ''}
        </Text>

        <View style={styles.cardBottomRow}>
          <View style={styles.authorRow}>
            <Ionicons name="person" size={14} color={themeColors.textSecondary} />
            <Text style={styles.authorText} numberOfLines={1}>
              {author ? author : 'Admin'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={themeColors.textSecondary} />
        </View>
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
          <Text style={styles.headerTitle}>Announcements</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {headerSubtitle}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={load} style={styles.headerIconButton} accessibilityLabel="Refresh announcements">
            <Ionicons name="refresh" size={22} color="white" />
          </TouchableOpacity>
          <LogoutButton navigation={navigation} color="white" size={24} />
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={18} color={themeColors.warning} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
            <Text style={styles.emptyText}>When admins publish announcements, they’ll appear here.</Text>
          </View>
        }
      />

      <Modal
        visible={detailsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Announcement</Text>
              <TouchableOpacity onPress={() => setDetailsOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.detailsTitle}>{selected?.title || 'Untitled'}</Text>
              <Text style={styles.detailsMeta}>
                {formatWhen(selected?.publishedAt || selected?.createdAt)}
              </Text>
              <View style={styles.detailsDivider} />
              <Text style={styles.detailsBody}>{selected?.body || ''}</Text>
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

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  errorText: { flex: 1, color: themeColors.textPrimary, fontSize: 13 },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: themeColors.warning + '20',
    borderWidth: 1,
    borderColor: themeColors.warning + '40',
  },
  retryText: { color: themeColors.warning, fontWeight: '700', fontSize: 12 },

  listContainer: { padding: 16, paddingBottom: 24 },

  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.primary + '12',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { color: themeColors.primary, fontWeight: '800', fontSize: 11 },
  timeText: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '600' },
  title: { color: themeColors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  bodyPreview: { color: themeColors.textPrimary, fontSize: 13, lineHeight: 19, opacity: 0.9 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  authorText: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '600', flexShrink: 1 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: themeColors.textPrimary },
  emptyText: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, textAlign: 'center', paddingHorizontal: 28 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: themeColors.textPrimary },
  detailsTitle: { fontSize: 18, fontWeight: '900', color: themeColors.textPrimary, marginTop: 6 },
  detailsMeta: { fontSize: 12, color: themeColors.textSecondary, marginTop: 4, fontWeight: '600' },
  detailsDivider: { height: 1, backgroundColor: themeColors.border, marginVertical: 12 },
  detailsBody: { fontSize: 14, color: themeColors.textPrimary, lineHeight: 22 },
});

export default AnnouncementsScreen;

