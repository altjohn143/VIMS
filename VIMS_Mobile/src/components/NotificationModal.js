import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../utils/api';
import { themeColors, shadows } from '../utils/theme';

const NotificationModal = ({ visible, onClose, navigation, onViewAll }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadNotifications();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    const unreadCount = notifications.filter((n) => !n.readAt).length;
    if (unreadCount === 0) return;

    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const navigateAfterClose = (screen) => {
    onClose?.();
    setTimeout(() => {
      try {
        if (navigation?.navigate) {
          navigation.navigate(screen);
          return;
        }
        navigation?.getParent?.()?.navigate?.(screen);
      } catch (error) {
        const parent = navigation?.getParent?.();
        if (parent?.navigate) parent.navigate(screen);
      }
    }, 180);
  };

  const getRelatedDestination = (notification) => {
    const metadata = notification?.metadata || {};
    const type = String(notification?.type || metadata?.type || '').toLowerCase();
    const has = (key) => !!metadata?.[key];

    if (has('visitorId') || type.includes('visitor')) return 'VisitorsTab';
    if (has('paymentId') || type.includes('payment')) return 'PaymentsTab';
    if (has('serviceRequestId') || type.includes('service')) return 'ServicesTab';
    if (has('announcementId') || type.includes('announcement')) return 'Announcements';
    if (has('reservationId') || type.includes('reservation')) return 'ReservationsTab';
    return null;
  };

  const openNotification = async (notification) => {
    if (!notification) return;
    if (!notification.readAt && notification._id) {
      await markAsRead(notification._id);
    }

    const destination = getRelatedDestination(notification);
    if (!destination || !navigation?.navigate) {
      Alert.alert(
        notification?.title || 'Notification',
        notification?.body || 'No additional details were provided.'
      );
      return;
    }

    navigateAfterClose(destination);
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const formatWhen = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      return format(new Date(dateValue), 'MMM dd • hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  const renderNotificationItem = ({ item }) => {
    const isUnread = !item?.readAt;
    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread ? styles.notificationItemUnread : null]}
        onPress={() => openNotification(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationTop}>
            <Text style={[styles.notificationTitle, isUnread ? styles.notificationTitleUnread : null]} numberOfLines={2}>
              {item?.title || 'Notification'}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item?.body || ''}
          </Text>
            <Text style={styles.notificationTime}>{formatWhen(item?.createdAt)}</Text>
            <View style={styles.notificationHintRow}>
              <Text style={styles.notificationHint}>
                {getRelatedDestination(item) ? 'Tap to open related record' : 'Tap to view details'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={themeColors.textSecondary} />
            </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Animated Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>Notifications</Text>
            <Text style={styles.panelSubtitle}>{unreadCount} unread</Text>
          </View>
          <View style={styles.panelHeaderRight}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                <Ionicons name="checkmark-done" size={16} color={themeColors.primary} />
                <Text style={styles.markAllBtnText}>Mark all</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>When updates arrive, they'll show here.</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item, index) => item?._id || `notification-${index}`}
            scrollEnabled
            scrollEventThrottle={16}
            nestedScrollEnabled
          />
        )}

        {/* Footer Link */}
        {notifications.length > 0 && (
          <View style={styles.panelFooter}>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => {
                if (onViewAll) {
                  onViewAll();
                } else {
                  navigateAfterClose('Notifications');
                }
              }}
            >
              <Text style={styles.viewAllBtnText}>View all notifications</Text>
              <Ionicons name="arrow-forward" size={16} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    ...shadows.medium,
  },

  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },

  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },

  panelSubtitle: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },

  panelHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(22, 101, 52, 0.1)',
  },

  markAllBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.primary,
  },

  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },

  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 12,
  },

  emptyText: {
    fontSize: 13,
    color: themeColors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },

  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.04)',
  },

  notificationItemUnread: {
    backgroundColor: 'rgba(22, 163, 74, 0.04)',
  },

  notificationContent: {
    gap: 6,
  },

  notificationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },

  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
    flex: 1,
  },

  notificationTitleUnread: {
    fontWeight: '700',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginTop: 4,
    flexShrink: 0,
  },

  notificationBody: {
    fontSize: 13,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },

  notificationTime: {
    fontSize: 11,
    color: 'rgba(100, 116, 139, 0.6)',
    marginTop: 2,
  },

  notificationHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },

  notificationHint: {
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.primary,
  },

  panelFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },

  viewAllBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },

  viewAllBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.primary,
  },
});

export default NotificationModal;
