import React, { useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';

const ArchivedAnnouncementsScreen = ({ navigation }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadArchivedAnnouncements();
  }, []);

  const loadArchivedAnnouncements = async () => {
    try {
      const response = await api.get('/announcements/archived');
      if (response.data?.success) {
        setAnnouncements(response.data.data);
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to load archived announcements');
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to load archived announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadArchivedAnnouncements();
  };

  const handleRestore = async () => {
    if (!selectedAnnouncement) return;

    setRestoring(true);
    try {
      const response = await api.put(`/announcements/${selectedAnnouncement._id}/restore`);
      if (response.data?.success) {
        Alert.alert('Success', 'Announcement restored successfully');
        setAnnouncements(announcements.filter(a => a._id !== selectedAnnouncement._id));
        setShowRestoreModal(false);
        setSelectedAnnouncement(null);
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to restore announcement');
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to restore announcement');
    } finally {
      setRestoring(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return themeColors.success;
      case 'scheduled': return themeColors.warning;
      case 'draft': return themeColors.textSecondary;
      default: return themeColors.textSecondary;
    }
  };

  const renderAnnouncementCard = ({ item }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <View style={[styles.card, shadows.small]}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.announcementTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>

        <Text style={styles.announcementBody} numberOfLines={3}>
          {item.body}
        </Text>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>
              {item.createdBy ? `${item.createdBy.firstName} ${item.createdBy.lastName}` : 'System'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>
              Archived: {item.archivedAt ? format(new Date(item.archivedAt), 'MMM dd, yyyy') : 'N/A'}
            </Text>
          </View>
          {item.archivedReason && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color={themeColors.textSecondary} />
              <Text style={styles.detailText} numberOfLines={2}>
                {item.archivedReason}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton]}
            onPress={() => {
              setSelectedAnnouncement(item);
              setShowRestoreModal(true);
            }}
            disabled={restoring}
          >
            <Ionicons name="refresh" size={16} color={themeColors.primary} />
            <Text style={styles.restoreButtonText}>Restore</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading archived announcements...</Text>
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
          <Text style={styles.headerTitle}>Archived Announcements</Text>
          <Text style={styles.headerSubtitle}>Manage archived announcements</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{announcements.length}</Text>
          <Text style={styles.statLabel}>Archived Announcements</Text>
        </View>
      </View>

      <FlatList
        data={announcements}
        renderItem={renderAnnouncementCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No archived announcements</Text>
            <Text style={styles.emptyText}>Archived announcements will appear here</Text>
          </View>
        }
      />

      {/* Restore Modal */}
      <Modal
        visible={showRestoreModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRestoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Restore Announcement</Text>
              <TouchableOpacity onPress={() => setShowRestoreModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedAnnouncement && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.warningBox}>
                  <Ionicons name="information-circle" size={24} color={themeColors.warning} />
                  <Text style={styles.warningText}>
                    This will restore the announcement and make it visible again.
                  </Text>
                </View>

                <View style={styles.announcementPreview}>
                  <Text style={styles.previewTitle}>{selectedAnnouncement.title}</Text>
                  <Text style={styles.previewBody} numberOfLines={4}>
                    {selectedAnnouncement.body}
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelButton]}
                onPress={() => setShowRestoreModal(false)}
                disabled={restoring}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.restoreButton]}
                onPress={handleRestore}
                disabled={restoring}
              >
                {restoring ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={16} color="white" />
                    <Text style={styles.restoreActionText}>Restore</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    backgroundColor: themeColors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  statCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    ...shadows.small,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    flex: 1,
  },
  announcementBody: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  restoreButton: {
    backgroundColor: themeColors.primary + '10',
  },
  restoreButtonText: {
    color: themeColors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  loadingText: {
    marginTop: 10,
    color: themeColors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    ...shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: themeColors.warning + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: themeColors.warning,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  announcementPreview: {
    backgroundColor: themeColors.background,
    borderRadius: 8,
    padding: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  previewBody: {
    fontSize: 14,
    color: themeColors.textSecondary,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  restoreButton: {
    backgroundColor: themeColors.primary,
  },
  restoreActionText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default ArchivedAnnouncementsScreen;