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

const NotificationModal = ({ visible, onClose }) => {
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
        onPress={() => isUnread && item._id && markAsRead(item._id)}
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
            keyExtractor={(item) => item?._id || String(Math.random())}
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
                onClose();
                // Navigate to full notifications page
                // navigation.navigate('Notifications');
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
