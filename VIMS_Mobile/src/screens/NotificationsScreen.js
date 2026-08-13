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
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../utils/api';
import { themeColors, shadows, roleLayouts } from '../utils/theme';
import SecurityUtilityHeader from '../components/SecurityUtilityHeader';
import { useAuth } from '../context/AuthContext';

const NotificationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

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
      return format(new Date(dateValue), 'MMM dd, yyyy â€¢ hh:mm a');
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

  const getNotificationRecordLabel = useCallback((notification) => {
    const metadata = notification?.metadata || {};
    const relatedId =
      metadata.visitorId ||
      metadata.paymentId ||
      metadata.serviceRequestId ||
      metadata.announcementId ||
      metadata.reservationId ||
      metadata.recordId;

    if (!relatedId) return null;
    return String(relatedId);
  }, []);

  const getRelatedDestination = useCallback((notification) => {
    const metadata = notification?.metadata || {};
    const type = String(notification?.type || metadata?.type || '').toLowerCase();
    const has = (key) => !!metadata?.[key];
    const role = user?.role;

    if (has('visitorId') || type.includes('visitor')) {
      return {
        screen: role === 'security' ? 'LogsTab' : 'VisitorsTab',
        label: role === 'security' ? 'View visitor log' : 'View visitor request',
      };
    }
    if (has('paymentId') || type.includes('payment')) {
      if (role === 'security') return null;
      return { screen: 'PaymentsTab', label: 'View payment' };
    }
    if (has('serviceRequestId') || type.includes('service')) {
      return {
        screen: role === 'security' ? 'SecurityServiceRequests' : 'ServicesTab',
        label: 'View service request',
      };
    }
    if (has('announcementId') || type.includes('announcement')) {
      return { screen: 'Announcements', label: 'View announcement' };
    }
    if (has('reservationId') || type.includes('reservation')) {
      if (role === 'security') return null;
      return { screen: 'ReservationsTab', label: 'View reservation' };
    }
    return null;
  }, [user?.role]);

  const openRelatedRecord = useCallback((notification) => {
    const destination = getRelatedDestination(notification);
    if (!destination) {
      Alert.alert('Notification Details', 'No related record is available for this notification.');
      return;
    }

    setSelectedNotification(null);
    navigation.navigate(destination.screen);
  }, [getRelatedDestination, navigation]);

  const openNotification = useCallback((item) => {
    if (!item) return;
    if (!item.readAt && item._id) markRead(item._id);
    setSelectedNotification(item);
  }, [markRead]);

  const renderItem = ({ item }) => {
    const isUnread = !item?.readAt;
    return (
      <TouchableOpacity
        style={[
          styles.card,
          shadows.small,
          isUnread ? styles.cardUnread : null,
        ]}
        onPress={() => openNotification(item)}
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
      <SecurityUtilityHeader
        navigation={navigation}
        eyebrow="SYSTEM ALERTS"
        title="Notifications"
        subtitle={`${unreadCount} unread • ${rows.length} total`}
        actions={[{ label: 'Read all', icon: 'checkmark-done', onPress: markAllRead, primary: true, disabled: processingAll || unreadCount === 0, loading: processingAll }]}
      />

      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={(item, index) => item?._id || `notification-${index}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>When the system sends updates, theyâ€™ll appear here.</Text>
          </View>
        }
      />

      <Modal
        visible={!!selectedNotification}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="notifications-outline" size={20} color={themeColors.primary} />
              </View>
              <View style={styles.detailTitleWrap}>
                <Text style={styles.detailTitle} numberOfLines={2}>
                  {selectedNotification?.title || 'Notification'}
                </Text>
                <Text style={styles.detailTime}>{formatWhen(selectedNotification?.createdAt)}</Text>
              </View>
              <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setSelectedNotification(null)}>
                <Ionicons name="close" size={22} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailBodyWrap} contentContainerStyle={styles.detailBodyContent}>
              <TouchableOpacity
                style={getRelatedDestination(selectedNotification) ? styles.detailBodyAction : null}
                onPress={() => {
                  if (getRelatedDestination(selectedNotification)) openRelatedRecord(selectedNotification);
                }}
                activeOpacity={getRelatedDestination(selectedNotification) ? 0.85 : 1}
              >
                <Text style={styles.detailBodyText}>
                  {selectedNotification?.body || 'No additional details were provided.'}
                </Text>
                {getRelatedDestination(selectedNotification) ? (
                  <Text style={styles.detailBodyActionHint}>Tap message to open related record</Text>
                ) : null}
              </TouchableOpacity>

              <View style={styles.detailMetaRow}>
                <Text style={styles.detailMetaLabel}>Type</Text>
                <Text style={styles.detailMetaValue}>
                  {selectedNotification?.type ? String(selectedNotification.type).replace(/_/g, ' ') : 'general'}
                </Text>
              </View>

              {getNotificationRecordLabel(selectedNotification) ? (
                <TouchableOpacity
                  style={[styles.detailMetaRow, styles.detailMetaActionRow]}
                  onPress={() => openRelatedRecord(selectedNotification)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.detailMetaLabel}>Related record</Text>
                  <View style={styles.detailMetaActionValue}>
                    <Text style={styles.detailMetaValue} numberOfLines={1}>
                      {getNotificationRecordLabel(selectedNotification)}
                    </Text>
                    <Ionicons name="open-outline" size={16} color={themeColors.primary} />
                  </View>
                </TouchableOpacity>
              ) : null}
            </ScrollView>

            {getRelatedDestination(selectedNotification) ? (
              <TouchableOpacity
                style={styles.detailRelatedBtn}
                onPress={() => openRelatedRecord(selectedNotification)}
              >
                <Ionicons name="open-outline" size={17} color="white" />
                <Text style={styles.detailRelatedText}>
                  {getRelatedDestination(selectedNotification).label}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.detailDoneBtn} onPress={() => setSelectedNotification(null)}>
              <Text style={styles.detailDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: roleLayouts.resident.screen,
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  listContainer: { padding: 16, paddingBottom: 24 },

  card: {
    backgroundColor: 'white',
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: themeColors.primary,
    backgroundColor: themeColors.primary + '08',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  detailModal: {
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: '78%',
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  detailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeColors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitleWrap: { flex: 1, minWidth: 0 },
  detailTitle: { color: themeColors.textPrimary, fontSize: 16, fontWeight: '900' },
  detailTime: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 3 },
  detailCloseBtn: { padding: 6 },
  detailBodyWrap: { maxHeight: 320 },
  detailBodyContent: { padding: 16, gap: 12 },
  detailBodyText: { color: themeColors.textPrimary, fontSize: 14, lineHeight: 21 },
  detailBodyAction: { padding: 12, borderRadius: 8, backgroundColor: themeColors.primary + '08', borderWidth: 1, borderColor: themeColors.primary + '35' },
  detailBodyActionHint: { color: themeColors.primary, fontSize: 12, fontWeight: '800', marginTop: 8 },
  detailMetaRow: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  detailMetaLabel: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  detailMetaValue: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 4 },
  detailMetaActionRow: { borderColor: themeColors.primary + '55', backgroundColor: themeColors.primary + '08' },
  detailMetaActionValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  detailRelatedBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: themeColors.primaryDeep,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 12,
  },
  detailRelatedText: { color: 'white', fontSize: 14, fontWeight: '900' },
  detailDoneBtn: {
    margin: 16,
    marginTop: 0,
    backgroundColor: themeColors.primary,
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailDoneText: { color: 'white', fontSize: 14, fontWeight: '900' },
});

export default NotificationsScreen;
