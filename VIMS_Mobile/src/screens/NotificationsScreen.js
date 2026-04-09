import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../utils/api';
import { themeColors, shadows } from '../utils/theme';
import LogoutButton from '../components/LogoutButton';

const NotificationsScreen = ({ navigation }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load notifications');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load notifications');
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

  const unreadCount = useMemo(
    () => rows.filter((n) => !n?.readAt).length,
    [rows]
  );

  const formatWhen = useCallback((dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      return format(new Date(dateValue), 'MMM dd, yyyy • hh:mm a');
    } catch {
      return 'N/A';
    }
  }, []);

  const markRead = useCallback(
    async (id) => {
      try {
        await api.put(`/notifications/${id}/read`);
        setRows((prev) =>
          prev.map((n) => (n._id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n))
        );
      } catch (e) {
        Alert.alert('Error', e?.response?.data?.error || 'Failed to mark notification as read');
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;

    setProcessingAll(true);
    try {
      const res = await api.put('/notifications/read-all');
      if (res.data?.success) {
        const nowIso = new Date().toISOString();
        setRows((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: nowIso })));
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to mark all as read');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to mark all as read');
    } finally {
      setProcessingAll(false);
    }
  }, [unreadCount]);

  const renderItem = ({ item }) => {
    const isUnread = !item?.readAt;
    return (
      <TouchableOpacity
        style={[
          styles.card,
          shadows.small,
          isUnread ? styles.cardUnread : null,
        ]}
        onPress={() => {
          if (isUnread && item?._id) markRead(item._id);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, isUnread ? styles.iconWrapUnread : null]}>
            <Ionicons name={isUnread ? 'notifications' : 'notifications-outline'} size={18} color={isUnread ? themeColors.primary : themeColors.textSecondary} />
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={[styles.cardTitle, isUnread ? styles.cardTitleUnread : null]} numberOfLines={1}>
              {item?.title || 'Notification'}
            </Text>
            <Text style={styles.cardTime}>{formatWhen(item?.createdAt)}</Text>
          </View>
          {isUnread ? <View style={styles.unreadDot} /> : null}
        </View>

        <Text style={styles.cardBody} numberOfLines={3}>
          {item?.body || ''}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardType} numberOfLines={1}>
            {item?.type ? String(item.type).replace(/_/g, ' ') : 'general'}
          </Text>
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
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {unreadCount} unread • {rows.length} total
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={markAllRead}
            disabled={processingAll || unreadCount === 0}
            style={[styles.headerActionBtn, (processingAll || unreadCount === 0) ? styles.headerActionBtnDisabled : null]}
          >
            {processingAll ? (
              <ActivityIndicator size={16} color="white" />
            ) : (
              <Ionicons name="checkmark-done" size={18} color="white" />
            )}
            <Text style={styles.headerActionText}>Read all</Text>
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
            <Ionicons name="notifications-off-outline" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>When the system sends updates, they’ll appear here.</Text>
          </View>
        }
      />
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
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerActionBtnDisabled: {
    opacity: 0.5,
  },
  headerActionText: { color: 'white', fontWeight: '800', fontSize: 12 },

  listContainer: { padding: 16, paddingBottom: 24 },

  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cardUnread: {
    borderColor: themeColors.primary + '55',
    backgroundColor: themeColors.primary + '06',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: themeColors.primary + '15',
  },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardTitle: { color: themeColors.textPrimary, fontSize: 14, fontWeight: '800' },
  cardTitleUnread: { color: themeColors.primary },
  cardTime: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: themeColors.primary,
  },
  cardBody: { color: themeColors.textPrimary, fontSize: 13, lineHeight: 19, marginTop: 10, opacity: 0.95 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  cardType: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', flex: 1, minWidth: 0 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: themeColors.textPrimary },
  emptyText: { marginTop: 6, fontSize: 13, color: themeColors.textSecondary, textAlign: 'center', paddingHorizontal: 28 },
});

export default NotificationsScreen;

